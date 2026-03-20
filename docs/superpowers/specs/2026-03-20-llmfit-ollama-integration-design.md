# LLMFit & Ollama Frontend Integration Design

**Date:** 2026-03-20
**Status:** Reviewed
**Branch:** feat/llmfit-integration

## Overview

Wire the existing Electron IPC backend (Ollama chat/models/pull, LLMFit hardware scan/recommendations) to the React frontend. Replace all mock data with real API calls using a hook-per-service architecture.

## Current State

- **Electron main process:** All IPC handlers are built and functional — Ollama (status, list, start, pull with streaming, chat with streaming) and LLMFit (scan hardware, recommend models).
- **Preload script:** Full `window.orbit` API exposed via `contextBridge` — promises for all IPC calls, event listeners for streaming (onChatChunk, onChatDone, onPullProgress).
- **React frontend:** All screens are built (Chat, HardwareAudit, ModelLibrary) but consume mock data from `src/data/mock.ts`. No screen calls `window.orbit`.
- **State:** Single `useAppState` hook manages everything — conversations, models, navigation, sidebar. Contains mock `sendMessage()` and `startModelDownload()` logic.
- **Tests:** No test framework configured.

## Architecture

### Approach: Hook-per-service

Three new React hooks encapsulate all API interaction. Screens consume these hooks instead of mock data. `useAppState` retains ownership of navigation, conversations CRUD, sidebar state, and selectedModelId.

```
Screens                    New Hooks                  Electron IPC (existing)
─────────                  ─────────                  ──────────────────────
Chat.tsx          →   useChat()              →   window.orbit.chat()
                                                  onChatChunk / onChatDone

HardwareAudit.tsx →   useLLMFit()            →   window.orbit.scanHardware()
                                                  window.orbit.recommendModels()

ModelLibrary.tsx  →   useOllama()             →   window.orbit.checkOllamaStatus()
                                                  window.orbit.listOllamaModels()
                                                  window.orbit.pullModel()
                                                  onPullProgress

                      useAppState() (unchanged role)
                      navigation, conversations, sidebar, selectedModelId
```

## Workstreams

### Execution Order

```
W7 (test infra)  ──┐
                    ├──→  W3 + W4 + W5 + W6 (parallel)  ──→  integration test
W1 + W2 (prereqs) ─┘
```

W7 and W1+W2 are independent and run in parallel. Both must complete before W3-W6 begin. W3, W4, W5, and W6 are independent of each other and can be parallelized across agent teams.

---

### W1: Fix preload.ts Listener Cleanup

**Problem:** `preload.ts` uses `ipcRenderer.removeAllListeners(channel)` for cleanup. This removes ALL listeners on a channel, not just the one registered by the calling component. Breaks on React strict mode double-mount, breaks concurrent pull progress tracking.

**Fix:**
- Store the wrapped callback reference in `onChatChunk`, `onChatDone`, `onPullProgress`
- Return cleanup function that calls `ipcRenderer.removeListener(channel, specificCallback)` instead of `removeAllListeners(channel)`
- No changes to `electron.d.ts` needed — return type is already `() => void`

**Files:** `orbit/electron/preload.ts`

---

### W2: Fix llmfit.ts Race Condition

**Problem:** Both `scanHardware()` and `recommendModels()` in the main process call `startLLMFit()` then `stopLLMFit()` in their `finally` blocks. If called in quick succession, the second call's server gets killed by the first call's cleanup.

**Fix:**
- Remove `stopLLMFit()` from individual handler `finally` blocks
- Let the LLMFit server stay running once started — it is already wired to `app.on('before-quit')` for cleanup
- Add a mutex/promise-based lock to `startLLMFit()` to prevent concurrent callers from spawning duplicate processes:
  ```typescript
  let startupPromise: Promise<number> | null = null;
  export async function startLLMFit(): Promise<number> {
    if (llmfitProcess && currentPort) return currentPort;
    if (startupPromise) return startupPromise;
    startupPromise = doStart().finally(() => { startupPromise = null; });
    return startupPromise;
  }
  ```
- Simpler and eliminates both the stop race and the TOCTOU startup race

**Files:** `orbit/electron/llmfit.ts`

---

### W3: useChat Hook + Chat Screen Wiring

**Hook: `src/hooks/useChat.ts`**

```typescript
interface UseChatOptions {
  model: string
  conversationId: string  // always a real ID — useAppState creates conversation before useChat is called
  onStreamComplete: (content: string) => void
}

interface UseChatReturn {
  sendMessage: (text: string, history: OllamaChatMessage[]) => void
  isStreaming: boolean
  streamedContent: string
  error: Error | null
}
```

**Conversation lifecycle contract:** `useAppState` creates the conversation and assigns an ID *before* the first `sendMessage` call. The Chat screen creates a new conversation on first user input, gets back a `conversationId`, then passes it to `useChat`. The hook never receives `null`.

**Behavior:**
1. `sendMessage(text, history)` calls `window.orbit.chat(model, [...history, {role: 'user', content: text}], conversationId)` — the full message history is required because Ollama's chat API is stateless
2. `onChatChunk` listener filters by `conversationId` — ignores chunks for other conversations
3. Appends each chunk's `message.content` to `streamedContent`
4. `onChatDone` listener calls `onStreamComplete(finalContent)`, resets `isStreaming` and `streamedContent`
5. Uses a generation counter (ref) to ignore stale chunks on component remount (React strict mode safety)
6. If `sendMessage` is called while `isStreaming` is true, the call is ignored
7. Cleanup on unmount: unsubscribes specific listeners (depends on W1 fix)

**Chat.tsx changes:**
- Import and use `useChat` instead of mock `sendMessage` from `useAppState`
- Remove the fake streaming animation (character-count timer on `streamingMessageId`)
- Render `streamedContent` as a live-updating assistant message while `isStreaming` is true
- On stream complete, the `onStreamComplete` callback appends the final message to the conversation via `useAppState.addMessageToConversation()`

**useAppState changes for Chat:**
- Remove mock AI response generation from `sendMessage()`
- Add `addMessageToConversation(conversationId: string, message: Message)` setter
- Keep conversation creation logic (first message creates a new conversation and sets it active)

**Ollama status pre-check:** The Chat screen should check Ollama status (from `useOllama` or a shared status check) before allowing message sends. If Ollama is not running, show an inline error rather than letting `chat()` fail with a connection-refused error. This is a UI concern in Chat.tsx, not in the hook itself.

**Tests: `src/hooks/__tests__/useChat.test.ts`**
- Happy path: send message with history → receive chunks → receive done → message finalized
- Error: `window.orbit.chat()` rejects → error state set, clears on next send attempt
- Unmount mid-stream: no state-update-after-unmount warnings
- Stale chunks: remount during stream → old chunks ignored via generation counter
- Rapid send: second sendMessage while streaming → ignored

---

### W4: useOllama Hook + ModelLibrary Screen Wiring

**Hook: `src/hooks/useOllama.ts`**

```typescript
interface UseOllamaReturn {
  status: OllamaStatus
  models: Model[]  // mapped via adapter
  downloadProgress: Record<string, number>  // modelName → percentage
  isLoading: boolean
  error: Error | null
  pullModel: (name: string) => void
  refreshModels: () => Promise<void>
}
```

**Behavior:**
1. On mount: calls `checkOllamaStatus()` — if running, calls `listOllamaModels()`
2. Models are mapped through `mapOllamaModel()` adapter (W6) before being stored
3. `pullModel(name)` calls `window.orbit.pullModel(name)`
4. `onPullProgress` listener updates `downloadProgress[modelName]`:
   - When `total` and `completed` are both present: percentage = `Math.round(completed / total * 100)`
   - When absent (e.g., "pulling manifest", "verifying sha256 digest"): keep current percentage or show indeterminate (0)
   - Pull completion detected by `status === "success"` — sets progress to 100
5. When pull completes (`status === "success"`), calls `refreshModels()` to update list
6. `refreshModels()` re-calls `listOllamaModels()` and re-maps

**ModelLibrary.tsx changes:**
- Import and use `useOllama()` instead of mock models from `useAppState`
- Replace fake download progress (200ms interval with random increment) with real `pullModel()` + `downloadProgress` from hook
- Filter tabs still work — they filter on the mapped `Model` type which retains `categories`
- Show `isLoading` state while initial model list loads

**useAppState changes for Models:**
- Remove `startModelDownload()` and its fake progress logic
- Remove `downloadProgress` state (now in `useOllama`)
- Keep `selectedModelId`

**Tests: `src/hooks/__tests__/useOllama.test.ts`**
- Mount: fetches status + models on mount
- Pull: progress updates arrive, downloadProgress updates correctly
- Pull complete: model list refreshes
- Error: status check fails → error state
- Multiple pulls: progress events for model A don't affect model B

---

### W5: useLLMFit Hook + HardwareAudit Screen Wiring

**Hook: `src/hooks/useLLMFit.ts`**

```typescript
interface UseLLMFitReturn {
  systemProfile: SystemProfile | null
  scoredModels: ScoredModel[]
  isScanning: boolean
  error: Error | null
  scan: () => Promise<void>
  recommend: () => Promise<void>
  scanAndRecommend: () => Promise<void>
}
```

**Behavior:**
1. `scan()` calls `window.orbit.scanHardware()`, stores `SystemProfile`
2. `recommend()` calls `window.orbit.recommendModels()`, stores `ScoredModel[]` (also updates `systemProfile` since the response includes it)
3. `scanAndRecommend()` convenience method — calls `recommend()` which returns both system info and scored models in one call
4. All methods set `isScanning` during execution, catch errors into `error`. Calling any method clears the previous `error` state before executing, allowing retry.

**HardwareAudit.tsx changes:**
- Remove both `hardwareSpecs` and `models` imports from `../data/mock` — both are replaced by real data
- Import and use `useLLMFit()` for all data
- Map `SystemProfile` to `HardwareSpec[]` display format via a mapping function:
  | SystemProfile field | HardwareSpec | Status logic |
  |---|---|---|
  | `cpu_name`, `cpu_cores` | CPU spec | always `'good'` |
  | `total_ram_gb` | Memory spec | `>= 16` → `'good'`, `>= 8` → `'warning'`, else `'low'` |
  | `gpu_name`, `gpu_vram_gb`, `has_gpu` | GPU spec | `has_gpu` → `'good'`, else `'warning'` |
  | — | Storage | Dropped — LLMFit `SystemProfile` has no storage field |
- Replace the mock compatibility list with `ScoredModel[]` from `recommend()` — render directly using `ScoredModel` fields (`name`, `fit_level`, `parameter_count`, `memory_required_gb`, `estimated_tps`)
- `fit_level` mapping for any UI that uses the old `compatibility` type: `perfect` → `full`, `good` → `full`, `marginal` → `partial`, `too_tight` → `incompatible`
- "Start Scan" button calls `scanAndRecommend()`
- Show `isScanning` during the real scan (replace the fake 3s animation timer)

**Tests: `src/hooks/__tests__/useLLMFit.test.ts`**
- Scan: returns system profile, sets isScanning during call
- Recommend: returns scored models
- scanAndRecommend: calls recommend, populates both profile and models
- Error: scanHardware rejects → error state set
- Loading: isScanning is true during async call, false after

---

### W6: Model Adapter

**File: `src/utils/modelAdapter.ts`**

```typescript
function mapOllamaModel(raw: OllamaModel, scoredModels?: ScoredModel[]): Model
```

**Field mapping:**
| OllamaModel field | Model field | Transformation |
|---|---|---|
| `name` | `id` | use as-is |
| `name` | `name` | extract display name (before `:` tag) |
| `size` (bytes) | `size` | format to human string ("4.1 GB") |
| `details.parameter_size` | `parameterCount` | use as-is ("7B") |
| `details.family` | `categories` | map family to category array |
| — | `description` | derive from family + parameter size |
| — | `downloaded` | always `true` (it's in Ollama's local list) |
| — | `featured` | `false` |
| — | `compatibility` | match against `ScoredModel.fit_level`: `perfect`/`good` → `'full'`, `marginal` → `'partial'`, `too_tight` → `'incompatible'`, unmatched → `'unknown'` |

**Tests: `src/utils/__tests__/modelAdapter.test.ts`**
- Maps all fields correctly
- Handles missing optional fields (no details, no scored model match)
- Formats byte sizes correctly (KB, MB, GB)
- Derives category from family name

---

### W7: Test Infrastructure Setup

**Install:**
- `vitest` — test runner (native Vite integration)
- `@testing-library/react` — component rendering
- `@testing-library/jest-dom` — DOM matchers
- `jsdom` — browser environment for Vitest

**Configuration:**
- `orbit/vitest.config.ts` — jsdom environment, setup file path, coverage config
- `orbit/src/test/setup.ts` — import `@testing-library/jest-dom`, create `window.orbit` mock factory with all methods as `vi.fn()` and event listeners that capture callbacks

**Mock factory pattern:**
```typescript
// src/test/setup.ts
export function createMockOrbit(): typeof window.orbit {
  return {
    platform: 'darwin',
    checkOllamaStatus: vi.fn().mockResolvedValue('running'),
    listOllamaModels: vi.fn().mockResolvedValue({ models: [] }),
    startOllama: vi.fn().mockResolvedValue(undefined),
    pullModel: vi.fn().mockResolvedValue(undefined),
    chat: vi.fn().mockResolvedValue(undefined),
    scanHardware: vi.fn().mockResolvedValue({ system: {} }),
    recommendModels: vi.fn().mockResolvedValue({ system: {}, models: [] }),
    onPullProgress: vi.fn().mockReturnValue(() => {}),
    onChatChunk: vi.fn().mockReturnValue(() => {}),
    onChatDone: vi.fn().mockReturnValue(() => {}),
  }
}

// Each test file calls this in beforeEach to prevent cross-test pollution:
// beforeEach(() => { window.orbit = createMockOrbit(); });
```

**package.json scripts:**
- `"test": "vitest"` (watch mode)
- `"test:run": "vitest run"` (single run for CI)

**Files:**
- `orbit/vitest.config.ts`
- `orbit/src/test/setup.ts`
- `orbit/package.json` (add scripts + devDependencies)

---

## Prerequisite: Extract Types from mock.ts

Before W3-W6, extract `Model`, `Message`, `Conversation`, `HardwareSpec`, `MCPTool` type definitions from `src/data/mock.ts` into `src/types/models.ts`. The mock data file will still exist (for reference/fallback) but types should be importable independently. This is a small task that can be done as part of W7 or W1/W2 phase.

## Agent Team Parallelization Plan

| Phase | Agents | Workstreams |
|-------|--------|-------------|
| 1 | 3 agents (parallel) | W7: test infrastructure + type extraction, W1: fix preload.ts, W2: fix llmfit.ts |
| 2 | 4 agents (parallel) | W3: useChat + Chat.tsx, W4: useOllama + ModelLibrary.tsx, W5: useLLMFit + HardwareAudit.tsx, W6: model adapter |
| 3 | 1 agent | Integration verification: run all tests, verify app builds |

## Out of Scope

- Ollama process bundling/packaging (already handled)
- LLMFit process bundling/packaging (already handled)
- MCP tools screen integration (separate effort)
- Welcome screen changes (no API calls needed)
- New IPC channels or main process changes (beyond W1/W2 fixes)
