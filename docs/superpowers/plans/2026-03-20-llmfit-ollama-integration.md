# LLMFit & Ollama Frontend Integration — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing Electron IPC backend (Ollama + LLMFit) to the React frontend, replacing all mock data with real API calls.

**Architecture:** Three new React hooks (`useChat`, `useOllama`, `useLLMFit`) encapsulate API interaction. A model adapter maps Ollama's data shape to the UI's `Model` type. `useAppState` retains ownership of navigation, conversations, and sidebar.

**Tech Stack:** React 19, TypeScript, Vitest, React Testing Library, Electron IPC via `window.orbit`

**Spec:** `docs/superpowers/specs/2026-03-20-llmfit-ollama-integration-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `orbit/src/types/models.ts` | Create | UI type definitions extracted from mock.ts |
| `orbit/src/data/mock.ts` | Modify | Remove type exports, import from types/models.ts |
| `orbit/src/utils/modelAdapter.ts` | Create | OllamaModel → Model mapping |
| `orbit/src/utils/__tests__/modelAdapter.test.ts` | Create | Adapter unit tests |
| `orbit/src/hooks/useChat.ts` | Create | Streaming chat via window.orbit.chat() |
| `orbit/src/hooks/__tests__/useChat.test.ts` | Create | Chat hook tests |
| `orbit/src/hooks/useOllama.ts` | Create | Ollama status, models, pull |
| `orbit/src/hooks/__tests__/useOllama.test.ts` | Create | Ollama hook tests |
| `orbit/src/hooks/useLLMFit.ts` | Create | Hardware scan, model recommendations |
| `orbit/src/hooks/__tests__/useLLMFit.test.ts` | Create | LLMFit hook tests |
| `orbit/src/hooks/useAppState.ts` | Modify | Remove mock logic, add addMessageToConversation |
| `orbit/src/screens/Chat.tsx` | Modify | Wire useChat, real streaming |
| `orbit/src/screens/ModelLibrary.tsx` | Modify | Wire useOllama, real downloads |
| `orbit/src/screens/HardwareAudit.tsx` | Modify | Wire useLLMFit, real scan |
| `orbit/src/App.tsx` | Modify | Pass useOllama data to screens |
| `orbit/electron/preload.ts` | Modify | Fix removeAllListeners → removeListener |
| `orbit/electron/llmfit.ts` | Modify | Fix race condition, add startup mutex |
| `orbit/vitest.config.ts` | Create | Vitest configuration |
| `orbit/src/test/setup.ts` | Create | Test setup + window.orbit mock factory |
| `orbit/package.json` | Modify | Add test deps + scripts |

---

## Chunk 1: Phase 1 — Prerequisites (W7, W1, W2)

These three tasks are independent and can run in parallel. All must complete before Phase 2.

### Task 1: Test Infrastructure Setup (W7)

**Files:**
- Create: `orbit/vitest.config.ts`
- Create: `orbit/src/test/setup.ts`
- Create: `orbit/src/types/models.ts`
- Modify: `orbit/src/data/mock.ts`
- Modify: `orbit/src/hooks/useAppState.ts:2`
- Modify: `orbit/package.json`

- [ ] **Step 1: Install test dependencies**

Run from `orbit/`:
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Add test scripts to package.json**

In `orbit/package.json`, add to `"scripts"`:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 3: Create vitest.config.ts**

Create `orbit/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 4: Create test setup with window.orbit mock factory**

Create `orbit/src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

export function createMockOrbit(): typeof window.orbit {
  return {
    platform: 'darwin',
    checkOllamaStatus: vi.fn().mockResolvedValue('running' as const),
    listOllamaModels: vi.fn().mockResolvedValue({ models: [] }),
    startOllama: vi.fn().mockResolvedValue(true),
    pullModel: vi.fn().mockResolvedValue(undefined),
    chat: vi.fn().mockResolvedValue(undefined),
    scanHardware: vi.fn().mockResolvedValue({ system: {} }),
    recommendModels: vi.fn().mockResolvedValue({ system: {}, models: [] }),
    onPullProgress: vi.fn().mockReturnValue(() => {}),
    onChatChunk: vi.fn().mockReturnValue(() => {}),
    onChatDone: vi.fn().mockReturnValue(() => {}),
  }
}

beforeEach(() => {
  (window as Record<string, unknown>).orbit = createMockOrbit()
})
```

- [ ] **Step 5: Extract types from mock.ts into types/models.ts**

Create `orbit/src/types/models.ts`:
```typescript
export type Model = {
  id: string
  name: string
  parameterCount: string
  size: string
  categories: string[]
  description: string
  downloaded: boolean
  featured?: boolean
  compatibility: 'full' | 'partial' | 'incompatible' | 'unknown'
}

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  timestamp: string
}

export type Conversation = {
  id: string
  title: string
  lastMessage: string
  timestamp: string
  model: string
  messages: Message[]
}

export type MCPTool = {
  id: string
  name: string
  description: string
  icon: string
  connected: boolean
  configSnippet: string
}

export type HardwareSpec = {
  label: string
  value: string
  icon: string
  status: 'good' | 'warning' | 'low'
}
```

- [ ] **Step 6: Update mock.ts to import types instead of defining them**

Replace the type definitions at the top of `orbit/src/data/mock.ts` (lines 1-44) with:
```typescript
import type { Model, Message, Conversation, MCPTool, HardwareSpec } from '../types/models'
export type { Model, Message, Conversation, MCPTool, HardwareSpec }
```

Keep all the data arrays (`models`, `conversations`, `mcpTools`, `hardwareSpecs`, `suggestions`, `aiResponses`) unchanged.

- [ ] **Step 7: Update useAppState.ts import**

Change line 2 of `orbit/src/hooks/useAppState.ts` from:
```typescript
import type { Conversation, Message, Model, MCPTool } from '../data/mock'
```
to:
```typescript
import type { Conversation, Message, Model, MCPTool } from '../types/models'
```

- [ ] **Step 8: Verify tests run**

Run: `cd orbit && npx vitest run`
Expected: No test files found (that's OK — confirms setup works without errors)

- [ ] **Step 9: Verify app still builds**

Run: `cd orbit && npm run build`
Expected: Build succeeds with no type errors

- [ ] **Step 10: Commit**

```bash
git add orbit/vitest.config.ts orbit/src/test/setup.ts orbit/src/types/models.ts orbit/src/data/mock.ts orbit/src/hooks/useAppState.ts orbit/package.json orbit/package-lock.json
git commit -m "feat: add test infrastructure and extract types from mock.ts"
```

---

### Task 2: Fix preload.ts Listener Cleanup (W1)

**Files:**
- Modify: `orbit/electron/preload.ts`

- [ ] **Step 1: Fix onPullProgress to use removeListener**

In `orbit/electron/preload.ts`, replace lines 15-18:
```typescript
  onPullProgress: (callback: (data: unknown) => void) => {
    ipcRenderer.on('ollama:pull-progress', (_event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('ollama:pull-progress')
  },
```
with:
```typescript
  onPullProgress: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('ollama:pull-progress', handler)
    return () => { ipcRenderer.removeListener('ollama:pull-progress', handler) }
  },
```

- [ ] **Step 2: Fix onChatChunk to use removeListener**

Replace lines 19-22:
```typescript
  onChatChunk: (callback: (data: unknown) => void) => {
    ipcRenderer.on('ollama:chat-chunk', (_event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('ollama:chat-chunk')
  },
```
with:
```typescript
  onChatChunk: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('ollama:chat-chunk', handler)
    return () => { ipcRenderer.removeListener('ollama:chat-chunk', handler) }
  },
```

- [ ] **Step 3: Fix onChatDone to use removeListener**

Replace lines 23-26:
```typescript
  onChatDone: (callback: (data: unknown) => void) => {
    ipcRenderer.on('ollama:chat-done', (_event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('ollama:chat-done')
  },
```
with:
```typescript
  onChatDone: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('ollama:chat-done', handler)
    return () => { ipcRenderer.removeListener('ollama:chat-done', handler) }
  },
```

- [ ] **Step 4: Verify app builds**

Run: `cd orbit && npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add orbit/electron/preload.ts
git commit -m "fix: use removeListener instead of removeAllListeners in preload"
```

---

### Task 3: Fix llmfit.ts Race Condition (W2)

**Files:**
- Modify: `orbit/electron/llmfit.ts`

- [ ] **Step 1: Add startup mutex to startLLMFit**

In `orbit/electron/llmfit.ts`, replace the `startLLMFit` function (lines 65-83) with:
```typescript
let startupPromise: Promise<number> | null = null

export async function startLLMFit(): Promise<number> {
  if (llmfitProcess && currentPort) return currentPort
  if (startupPromise) return startupPromise

  startupPromise = (async () => {
    const port = await findAvailablePort()
    const llmfitPath = getLLMFitPath()

    llmfitProcess = spawn(llmfitPath, ['serve', '--port', String(port)], {
      stdio: 'ignore',
    })

    llmfitProcess.on('exit', () => {
      llmfitProcess = null
      currentPort = null
    })

    await waitForServer(port)
    currentPort = port
    return port
  })().finally(() => {
    startupPromise = null
  })

  return startupPromise
}
```

- [ ] **Step 2: Remove stopLLMFit from scanHardware finally block**

Replace `scanHardware` function (lines 93-101) with:
```typescript
export async function scanHardware(): Promise<unknown> {
  const port = await startLLMFit()
  const response = await httpGet(port, '/api/system')
  return JSON.parse(response)
}
```

- [ ] **Step 3: Remove stopLLMFit from recommendModels finally block**

Replace `recommendModels` function (lines 103-111) with:
```typescript
export async function recommendModels(): Promise<unknown> {
  const port = await startLLMFit()
  const response = await httpGet(port, '/api/fit')
  return JSON.parse(response)
}
```

- [ ] **Step 4: Verify app builds**

Run: `cd orbit && npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add orbit/electron/llmfit.ts
git commit -m "fix: add startup mutex and remove stop race condition in llmfit"
```

---

## Chunk 2: Phase 2 — Hooks + Screens (W6 → W3, W4, W5)

**Dependency note:** W4 (useOllama) imports from `modelAdapter.ts` created in W6. W3 and W5 both modify `useAppState.ts` and `App.tsx`. Execution order:
1. **W6 (model adapter)** runs first — no shared file conflicts, other tasks import from it
2. **W3, W4, W5** run in parallel after W6 completes. W3 owns `useAppState.ts` and `App.tsx` changes; W4 and W5 only create new files + modify their own screens. After all three complete, a merge step integrates W4 and W5's screen/App.tsx changes.

### Task 4: Model Adapter (W6)

**Files:**
- Create: `orbit/src/utils/modelAdapter.ts`
- Create: `orbit/src/utils/__tests__/modelAdapter.test.ts`

- [ ] **Step 1: Write failing tests for modelAdapter**

Create `orbit/src/utils/__tests__/modelAdapter.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { mapOllamaModel, formatBytes } from '../modelAdapter'
import type { OllamaModel } from '../../types/ollama'
import type { ScoredModel } from '../../types/llmfit'

const makeOllamaModel = (overrides?: Partial<OllamaModel>): OllamaModel => ({
  name: 'llama3.2:latest',
  model: 'llama3.2:latest',
  size: 4_100_000_000,
  digest: 'abc123',
  modified_at: '2026-03-20T00:00:00Z',
  details: {
    parent_model: '',
    format: 'gguf',
    family: 'llama',
    parameter_size: '7B',
    quantization_level: 'Q4_0',
  },
  ...overrides,
})

const makeScoredModel = (overrides?: Partial<ScoredModel>): ScoredModel => ({
  name: 'llama3.2',
  provider: 'meta',
  parameter_count: 7_000_000_000,
  fit_level: 'perfect',
  run_mode: 'gpu',
  score: 0.95,
  score_components: { quality: 0.9, speed: 0.9, fit: 1.0, context: 0.9 },
  estimated_tps: 45,
  best_quant: 'Q4_0',
  memory_required_gb: 4.1,
  memory_available_gb: 16,
  utilization_pct: 25,
  context_length: 8192,
  gguf_sources: [],
  ...overrides,
})

describe('formatBytes', () => {
  it('formats bytes to GB', () => {
    expect(formatBytes(4_100_000_000)).toBe('4.1 GB')
  })

  it('formats bytes to MB', () => {
    expect(formatBytes(500_000_000)).toBe('500 MB')
  })

  it('formats zero bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('formats bytes to TB', () => {
    expect(formatBytes(1_500_000_000_000)).toBe('1.5 TB')
  })
})

describe('mapOllamaModel', () => {
  it('maps basic fields correctly', () => {
    const raw = makeOllamaModel()
    const result = mapOllamaModel(raw)

    expect(result.id).toBe('llama3.2:latest')
    expect(result.name).toBe('llama3.2')
    expect(result.size).toBe('4.1 GB')
    expect(result.parameterCount).toBe('7B')
    expect(result.downloaded).toBe(true)
    expect(result.featured).toBe(false)
  })

  it('extracts display name before colon tag', () => {
    const raw = makeOllamaModel({ name: 'mistral:7b-instruct-v0.3' })
    const result = mapOllamaModel(raw)
    expect(result.name).toBe('mistral')
  })

  it('handles name without tag', () => {
    const raw = makeOllamaModel({ name: 'phi3' })
    const result = mapOllamaModel(raw)
    expect(result.name).toBe('phi3')
  })

  it('derives category from family', () => {
    const raw = makeOllamaModel()
    raw.details.family = 'llama'
    const result = mapOllamaModel(raw)
    expect(result.categories).toContain('chat')
  })

  it('maps codestral family to code category', () => {
    const raw = makeOllamaModel()
    raw.details.family = 'codestral'
    const result = mapOllamaModel(raw)
    expect(result.categories).toContain('code')
  })

  it('defaults to unknown compatibility without scored models', () => {
    const raw = makeOllamaModel()
    const result = mapOllamaModel(raw)
    expect(result.compatibility).toBe('unknown')
  })

  it('maps perfect fit_level to full compatibility', () => {
    const raw = makeOllamaModel({ name: 'llama3.2:latest' })
    const scored = [makeScoredModel({ name: 'llama3.2', fit_level: 'perfect' })]
    const result = mapOllamaModel(raw, scored)
    expect(result.compatibility).toBe('full')
  })

  it('maps good fit_level to full compatibility', () => {
    const raw = makeOllamaModel({ name: 'llama3.2:latest' })
    const scored = [makeScoredModel({ name: 'llama3.2', fit_level: 'good' })]
    const result = mapOllamaModel(raw, scored)
    expect(result.compatibility).toBe('full')
  })

  it('maps marginal fit_level to partial compatibility', () => {
    const raw = makeOllamaModel({ name: 'llama3.2:latest' })
    const scored = [makeScoredModel({ name: 'llama3.2', fit_level: 'marginal' })]
    const result = mapOllamaModel(raw, scored)
    expect(result.compatibility).toBe('partial')
  })

  it('maps too_tight fit_level to incompatible', () => {
    const raw = makeOllamaModel({ name: 'llama3.2:latest' })
    const scored = [makeScoredModel({ name: 'llama3.2', fit_level: 'too_tight' })]
    const result = mapOllamaModel(raw, scored)
    expect(result.compatibility).toBe('incompatible')
  })

  it('derives description from family and parameter size', () => {
    const raw = makeOllamaModel()
    const result = mapOllamaModel(raw)
    expect(result.description).toContain('llama')
    expect(result.description).toContain('7B')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd orbit && npx vitest run src/utils/__tests__/modelAdapter.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement modelAdapter**

Create `orbit/src/utils/modelAdapter.ts`:
```typescript
import type { OllamaModel } from '../types/ollama'
import type { ScoredModel } from '../types/llmfit'
import type { Model } from '../types/models'

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1000))
  const value = bytes / Math.pow(1000, i)
  // Use whole numbers for MB, one decimal for GB/TB
  const formatted = i <= 2 ? Math.round(value) : parseFloat(value.toFixed(1))
  return `${formatted} ${units[i]}`
}

const CODE_FAMILIES = new Set(['codestral', 'starcoder', 'deepseek-coder', 'codegemma', 'codellama'])

function deriveCategories(family: string): string[] {
  const lower = family.toLowerCase()
  if (CODE_FAMILIES.has(lower)) return ['code']
  // Most general-purpose families support chat
  return ['chat']
}

function mapFitLevel(fitLevel: ScoredModel['fit_level']): Model['compatibility'] {
  switch (fitLevel) {
    case 'perfect':
    case 'good':
      return 'full'
    case 'marginal':
      return 'partial'
    case 'too_tight':
      return 'incompatible'
  }
}

export function mapOllamaModel(raw: OllamaModel, scoredModels?: ScoredModel[]): Model {
  const displayName = raw.name.includes(':') ? raw.name.split(':')[0] : raw.name
  const family = raw.details?.family ?? 'unknown'
  const parameterSize = raw.details?.parameter_size ?? ''

  // Match scored model by comparing display name (before tag) against scored model name
  const scored = scoredModels?.find(
    (s) => displayName.toLowerCase().includes(s.name.toLowerCase()) ||
           s.name.toLowerCase().includes(displayName.toLowerCase())
  )

  return {
    id: raw.name,
    name: displayName,
    size: formatBytes(raw.size),
    parameterCount: parameterSize,
    categories: deriveCategories(family),
    description: `${family} model, ${parameterSize} parameters`,
    downloaded: true,
    featured: false,
    compatibility: scored ? mapFitLevel(scored.fit_level) : 'unknown',
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd orbit && npx vitest run src/utils/__tests__/modelAdapter.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Verify build succeeds**

Run: `cd orbit && npm run build`
Expected: Build succeeds (confirms type-checking passes across the whole project)

- [ ] **Step 6: Commit**

```bash
git add orbit/src/utils/modelAdapter.ts orbit/src/utils/__tests__/modelAdapter.test.ts
git commit -m "feat: add model adapter to map OllamaModel to UI Model type"
```

---

### Task 5: useChat Hook + Chat Screen Wiring (W3)

**Files:**
- Create: `orbit/src/hooks/useChat.ts`
- Create: `orbit/src/hooks/__tests__/useChat.test.ts`
- Modify: `orbit/src/hooks/useAppState.ts`
- Modify: `orbit/src/screens/Chat.tsx`
- Modify: `orbit/src/App.tsx`

- [ ] **Step 1: Write failing tests for useChat**

Create `orbit/src/hooks/__tests__/useChat.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChat } from '../useChat'
import type { OllamaChatMessage } from '../../types/ollama'

describe('useChat', () => {
  let capturedChunkCb: ((data: unknown) => void) | null = null
  let capturedDoneCb: ((data: unknown) => void) | null = null
  const mockCleanupChunk = vi.fn()
  const mockCleanupDone = vi.fn()

  beforeEach(() => {
    capturedChunkCb = null
    capturedDoneCb = null

    window.orbit.onChatChunk = vi.fn((cb) => {
      capturedChunkCb = cb
      return mockCleanupChunk
    })
    window.orbit.onChatDone = vi.fn((cb) => {
      capturedDoneCb = cb
      return mockCleanupDone
    })
    window.orbit.chat = vi.fn().mockResolvedValue(undefined)
  })

  const defaultOptions = {
    model: 'llama3.2',
    conversationId: 'conv-1',
    onStreamComplete: vi.fn(),
  }

  it('starts with initial state', () => {
    const { result } = renderHook(() => useChat(defaultOptions))
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.streamedContent).toBe('')
    expect(result.current.error).toBeNull()
  })

  it('calls window.orbit.chat with model, history + new message, and conversationId', async () => {
    const { result } = renderHook(() => useChat(defaultOptions))
    const history: OllamaChatMessage[] = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi there' },
    ]

    await act(async () => {
      result.current.sendMessage('how are you?', history)
    })

    expect(window.orbit.chat).toHaveBeenCalledWith(
      'llama3.2',
      [...history, { role: 'user', content: 'how are you?' }],
      'conv-1'
    )
    expect(result.current.isStreaming).toBe(true)
  })

  it('accumulates streamed content from chat chunks', async () => {
    const { result } = renderHook(() => useChat(defaultOptions))

    await act(async () => {
      result.current.sendMessage('test', [])
    })

    act(() => {
      capturedChunkCb?.({
        conversationId: 'conv-1',
        chunk: { message: { content: 'Hello' }, done: false },
      })
    })
    expect(result.current.streamedContent).toBe('Hello')

    act(() => {
      capturedChunkCb?.({
        conversationId: 'conv-1',
        chunk: { message: { content: ' world' }, done: false },
      })
    })
    expect(result.current.streamedContent).toBe('Hello world')
  })

  it('calls onStreamComplete and resets on done', async () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useChat({ ...defaultOptions, onStreamComplete: onComplete })
    )

    await act(async () => {
      result.current.sendMessage('test', [])
    })

    act(() => {
      capturedChunkCb?.({
        conversationId: 'conv-1',
        chunk: { message: { content: 'Hello world' }, done: false },
      })
    })

    act(() => {
      capturedDoneCb?.({ conversationId: 'conv-1' })
    })

    expect(onComplete).toHaveBeenCalledWith('Hello world')
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.streamedContent).toBe('')
  })

  it('ignores chunks for other conversations', async () => {
    const { result } = renderHook(() => useChat(defaultOptions))

    await act(async () => {
      result.current.sendMessage('test', [])
    })

    act(() => {
      capturedChunkCb?.({
        conversationId: 'conv-OTHER',
        chunk: { message: { content: 'wrong convo' }, done: false },
      })
    })

    expect(result.current.streamedContent).toBe('')
  })

  it('ignores sendMessage while already streaming', async () => {
    const { result } = renderHook(() => useChat(defaultOptions))

    await act(async () => {
      result.current.sendMessage('first', [])
    })
    expect(result.current.isStreaming).toBe(true)

    await act(async () => {
      result.current.sendMessage('second', [])
    })

    // chat should only have been called once
    expect(window.orbit.chat).toHaveBeenCalledTimes(1)
  })

  it('sets error when chat rejects', async () => {
    window.orbit.chat = vi.fn().mockRejectedValue(new Error('connection refused'))

    const { result } = renderHook(() => useChat(defaultOptions))

    await act(async () => {
      result.current.sendMessage('test', [])
    })

    expect(result.current.error?.message).toBe('connection refused')
    expect(result.current.isStreaming).toBe(false)
  })

  it('clears error on next send attempt', async () => {
    window.orbit.chat = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useChat(defaultOptions))

    await act(async () => {
      result.current.sendMessage('test', [])
    })
    expect(result.current.error).not.toBeNull()

    await act(async () => {
      result.current.sendMessage('retry', [])
    })
    expect(result.current.error).toBeNull()
  })

  it('ignores stale chunks after remount (generation counter)', async () => {
    const onComplete = vi.fn()
    const { result, rerender } = renderHook(
      ({ convId }) => useChat({ model: 'llama3.2', conversationId: convId, onStreamComplete: onComplete }),
      { initialProps: { convId: 'conv-1' } }
    )

    await act(async () => {
      result.current.sendMessage('test', [])
    })

    // Simulate remount by changing conversationId (triggers useEffect cleanup + re-register)
    rerender({ convId: 'conv-2' })

    // Old chunk for conv-1 should be ignored due to generation counter
    act(() => {
      capturedChunkCb?.({
        conversationId: 'conv-1',
        chunk: { message: { content: 'stale' }, done: false },
      })
    })

    expect(result.current.streamedContent).toBe('')
  })

  it('cleans up listeners on unmount', () => {
    const { unmount } = renderHook(() => useChat(defaultOptions))
    unmount()
    expect(mockCleanupChunk).toHaveBeenCalled()
    expect(mockCleanupDone).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd orbit && npx vitest run src/hooks/__tests__/useChat.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement useChat hook**

Create `orbit/src/hooks/useChat.ts`:
```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import type { OllamaChatMessage } from '../types/ollama'

export type UseChatOptions = {
  model: string
  conversationId: string
  onStreamComplete: (content: string) => void
}

export function useChat({ model, conversationId, onStreamComplete }: UseChatOptions) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedContent, setStreamedContent] = useState('')
  const [error, setError] = useState<Error | null>(null)

  const streamedRef = useRef('')
  const generationRef = useRef(0)
  const isStreamingRef = useRef(false)
  const onStreamCompleteRef = useRef(onStreamComplete)
  onStreamCompleteRef.current = onStreamComplete

  useEffect(() => {
    const gen = ++generationRef.current

    const cleanupChunk = window.orbit.onChatChunk((data) => {
      if (gen !== generationRef.current) return
      const typed = data as { conversationId: string; chunk: { message: { content: string }; done: boolean } }
      if (typed.conversationId !== conversationId) return

      streamedRef.current += typed.chunk.message.content
      setStreamedContent(streamedRef.current)
    })

    const cleanupDone = window.orbit.onChatDone((data) => {
      if (gen !== generationRef.current) return
      const typed = data as { conversationId: string }
      if (typed.conversationId !== conversationId) return

      onStreamCompleteRef.current(streamedRef.current)
      streamedRef.current = ''
      setStreamedContent('')
      setIsStreaming(false)
      isStreamingRef.current = false
    })

    return () => {
      cleanupChunk()
      cleanupDone()
    }
  }, [conversationId])

  const sendMessage = useCallback(
    async (text: string, history: OllamaChatMessage[]) => {
      if (isStreamingRef.current) return

      setError(null)
      setIsStreaming(true)
      isStreamingRef.current = true
      streamedRef.current = ''
      setStreamedContent('')

      try {
        await window.orbit.chat(
          model,
          [...history, { role: 'user', content: text }],
          conversationId
        )
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
        setIsStreaming(false)
        isStreamingRef.current = false
      }
    },
    [model, conversationId]
  )

  return { sendMessage, isStreaming, streamedContent, error }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd orbit && npx vitest run src/hooks/__tests__/useChat.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit hook**

```bash
git add orbit/src/hooks/useChat.ts orbit/src/hooks/__tests__/useChat.test.ts
git commit -m "feat: add useChat hook with streaming and tests"
```

- [ ] **Step 6: Refactor useAppState — remove mock AI logic, remove mock models ownership, add message helpers**

In `orbit/src/hooks/useAppState.ts`, make these changes:

1. Remove `aiResponses` and `initialModels` from the mock import (line 3). Change:
```typescript
import { conversations as initialConversations, models as initialModels, mcpTools as initialTools, aiResponses } from '../data/mock'
```
to:
```typescript
import { conversations as initialConversations, mcpTools as initialTools } from '../data/mock'
```

2. Remove mock model state. Delete these lines:
```typescript
const [models, setModels] = useState<Model[]>(initialModels)
```
and delete the derived values:
```typescript
const selectedModel = models.find(m => m.id === selectedModelId) ?? models[0]
const downloadedModels = models.filter(m => m.downloaded)
```
Also remove the `downloadProgress` state and `startModelDownload` callback entirely.

3. Replace the entire `sendMessage` callback (lines 38-76) with:
```typescript
  const createConversation = useCallback((content: string, modelName: string): string => {
    const now = new Date()
    const timestamp = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp,
    }
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: content.slice(0, 40) + (content.length > 40 ? '...' : ''),
      lastMessage: content.slice(0, 60) + '...',
      timestamp: 'Just now',
      model: modelName,
      messages: [userMessage],
    }
    setConversations(prev => [newConv, ...prev])
    setActiveConversationId(newConv.id)
    setCurrentScreen('chat')
    return newConv.id
  }, [])

  const addMessageToConversation = useCallback((conversationId: string, message: Message) => {
    setConversations(prev => prev.map(c =>
      c.id === conversationId
        ? { ...c, messages: [...c.messages, message], lastMessage: message.content.slice(0, 60) + '...' }
        : c
    ))
  }, [])

  const sendMessage = useCallback((content: string, modelName: string) => {
    const now = new Date()
    const timestamp = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp,
    }

    if (activeConversationId) {
      setConversations(prev => prev.map(c =>
        c.id === activeConversationId
          ? { ...c, messages: [...c.messages, userMessage], lastMessage: content.slice(0, 60) + '...' }
          : c
      ))
    } else {
      createConversation(content, modelName)
    }
  }, [activeConversationId, createConversation])
```

4. Update the return object — remove `models`, `selectedModel`, `downloadedModels`, `downloadProgress`, `startModelDownload`. Add `createConversation`, `addMessageToConversation`. Keep `selectedModelId`, `setSelectedModelId`:
```typescript
  return {
    currentScreen,
    conversations,
    activeConversation,
    activeConversationId,
    selectedModelId,
    mcpTools,
    sidebarCollapsed,
    navigateTo,
    openConversation,
    startNewChat,
    sendMessage,
    createConversation,
    addMessageToConversation,
    setSelectedModelId,
    toggleToolConnection,
    setSidebarCollapsed,
  }
```

The `Model` type import can also be removed from the import statement since `useAppState` no longer manages models.

- [ ] **Step 7: Wire useChat into Chat.tsx**

Replace the entire content of `orbit/src/screens/Chat.tsx`:
```typescript
import { useRef, useEffect, useCallback } from 'react'
import ChatMessage from '../components/ChatMessage'
import ChatInput from '../components/ChatInput'
import { useChat } from '../hooks/useChat'
import type { Message } from '../types/models'
import type { OllamaChatMessage } from '../types/ollama'

type ChatProps = {
  conversation: {
    id: string
    title: string
    model: string
    messages: Message[]
  }
  onSendMessage: (content: string) => void
  onAddMessage: (conversationId: string, message: Message) => void
  selectedModel: { id: string; name: string; parameterCount: string }
  downloadedModels: Array<{ id: string; name: string; parameterCount: string }>
  onSelectModel: (modelId: string) => void
}

export default function Chat({
  conversation,
  onSendMessage,
  onAddMessage,
  selectedModel,
  downloadedModels,
  onSelectModel,
}: ChatProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { sendMessage, isStreaming, streamedContent, error } = useChat({
    model: selectedModel.name,
    conversationId: conversation.id,
    onStreamComplete: (content) => {
      const now = new Date()
      const timestamp = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      const aiMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content,
        model: selectedModel.name,
        timestamp,
      }
      onAddMessage(conversation.id, aiMessage)
    },
  })

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }

  useEffect(() => {
    scrollToBottom('smooth')
  }, [conversation.messages.length])

  // Pin scroll while streaming
  useEffect(() => {
    if (!isStreaming) return
    let frameId: number
    const pin = () => {
      const el = scrollContainerRef.current
      if (el) el.scrollTop = el.scrollHeight
      frameId = requestAnimationFrame(pin)
    }
    frameId = requestAnimationFrame(pin)
    return () => cancelAnimationFrame(frameId)
  }, [isStreaming])

  // Handle Welcome-to-Chat transition: if Chat mounts with an unanswered
  // user message (sent from Welcome screen), auto-trigger the AI response.
  const hasAutoSentRef = useRef(false)
  useEffect(() => {
    if (hasAutoSentRef.current) return
    const msgs = conversation.messages
    if (msgs.length > 0 && msgs[msgs.length - 1].role === 'user' && !isStreaming) {
      hasAutoSentRef.current = true
      const history: OllamaChatMessage[] = msgs.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }))
      sendMessage(msgs[msgs.length - 1].content, history)
    }
  }, [conversation.messages, isStreaming, sendMessage])

  const handleSend = (content: string) => {
    // Add user message to conversation state
    onSendMessage(content)
    // Build history from current messages for Ollama
    const history: OllamaChatMessage[] = conversation.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))
    sendMessage(content, history)
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
        <div className="mx-auto mb-6 flex max-w-[640px] items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/26">Conversation</div>
            <div className="mt-1 text-[14px] font-semibold text-stone-50">{conversation.title}</div>
          </div>
          <div className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[11px] font-mono text-white/48">
            {conversation.model}
          </div>
        </div>

        <div className="mx-auto flex max-w-[640px] flex-col gap-5">
          {conversation.messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              model={msg.model}
              timestamp={msg.timestamp}
              isStreaming={false}
            />
          ))}

          {isStreaming && streamedContent && (
            <ChatMessage
              role="assistant"
              content={streamedContent}
              model={selectedModel.name}
              timestamp=""
              isStreaming={true}
            />
          )}

          {error && (
            <div className="mx-auto max-w-[640px] rounded-xl bg-red-500/10 px-4 py-3 text-[13px] text-red-400">
              Failed to get response: {error.message}
            </div>
          )}
        </div>
      </div>

      <ChatInput
        onSend={handleSend}
        selectedModel={selectedModel}
        downloadedModels={downloadedModels}
        onSelectModel={onSelectModel}
      />
    </div>
  )
}
```

- [ ] **Step 8: Update App.tsx — derive selectedModel from ollama, pass new props**

Rewrite `orbit/src/App.tsx` with these changes:

1. Add imports:
```typescript
import { useOllama } from './hooks/useOllama'
```

2. After `useAppState()`, add the ollama hook and derive model data:
```typescript
  const ollama = useOllama()
  const selectedModel = ollama.models.find(m => m.id === selectedModelId) ?? ollama.models[0] ?? { id: '', name: 'No model', parameterCount: '' }
  const downloadedModels = ollama.models.filter(m => m.downloaded)
```

3. Update `sendMessage` calls to pass `selectedModel.name`:
```typescript
  // Wrap sendMessage to include model name
  const handleSendMessage = useCallback((content: string) => {
    sendMessage(content, selectedModel.name)
  }, [sendMessage, selectedModel.name])
```

4. Update `renderScreen()` to use the new data sources:
```typescript
      case 'welcome':
        return (
          <Welcome
            onSend={handleSendMessage}
            selectedModel={selectedModel}
            downloadedModels={downloadedModels}
            onSelectModel={setSelectedModelId}
            onSuggestionClick={handleSendMessage}
          />
        )
      case 'chat':
        if (!activeConversation) return null
        return (
          <Chat
            conversation={activeConversation}
            onSendMessage={handleSendMessage}
            onAddMessage={addMessageToConversation}
            selectedModel={selectedModel}
            downloadedModels={downloadedModels}
            onSelectModel={setSelectedModelId}
          />
        )
      case 'models':
        return (
          <ModelLibrary
            models={ollama.models}
            downloadProgress={ollama.downloadProgress}
            onDownload={ollama.pullModel}
            isLoading={ollama.isLoading}
          />
        )
```

5. Remove `models`, `selectedModel`, `downloadedModels`, `downloadProgress`, `startModelDownload` from the `useAppState()` destructuring (they no longer exist). Add `createConversation`, `addMessageToConversation`.

- [ ] **Step 9: Verify build succeeds**

Run: `cd orbit && npm run build`
Expected: Build succeeds

- [ ] **Step 10: Run all tests**

Run: `cd orbit && npx vitest run`
Expected: All tests pass

- [ ] **Step 11: Commit**

```bash
git add orbit/src/hooks/useAppState.ts orbit/src/screens/Chat.tsx orbit/src/App.tsx
git commit -m "feat: wire useChat to Chat screen with real streaming"
```

---

### Task 6: useOllama Hook + ModelLibrary Screen Wiring (W4)

**Note:** `useAppState.ts` and `App.tsx` changes for useOllama are handled in Task 5 Steps 6 and 8 (which owns shared file modifications). This task only creates the hook, tests, and modifies ModelLibrary.tsx.

**Files:**
- Create: `orbit/src/hooks/useOllama.ts`
- Create: `orbit/src/hooks/__tests__/useOllama.test.ts`
- Modify: `orbit/src/screens/ModelLibrary.tsx`

- [ ] **Step 1: Write failing tests for useOllama**

Create `orbit/src/hooks/__tests__/useOllama.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useOllama } from '../useOllama'
import type { OllamaModel } from '../../types/ollama'

const makeOllamaModel = (name: string): OllamaModel => ({
  name,
  model: name,
  size: 4_100_000_000,
  digest: 'abc',
  modified_at: '2026-01-01T00:00:00Z',
  details: {
    parent_model: '',
    format: 'gguf',
    family: 'llama',
    parameter_size: '7B',
    quantization_level: 'Q4_0',
  },
})

describe('useOllama', () => {
  let capturedProgressCb: ((data: unknown) => void) | null = null

  beforeEach(() => {
    capturedProgressCb = null
    window.orbit.checkOllamaStatus = vi.fn().mockResolvedValue('running')
    window.orbit.listOllamaModels = vi.fn().mockResolvedValue({
      models: [makeOllamaModel('llama3.2:latest')],
    })
    window.orbit.pullModel = vi.fn().mockResolvedValue(undefined)
    window.orbit.onPullProgress = vi.fn((cb) => {
      capturedProgressCb = cb
      return vi.fn()
    })
  })

  it('fetches status and models on mount', async () => {
    const { result } = renderHook(() => useOllama())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(window.orbit.checkOllamaStatus).toHaveBeenCalled()
    expect(window.orbit.listOllamaModels).toHaveBeenCalled()
    expect(result.current.status).toBe('running')
    expect(result.current.models).toHaveLength(1)
    expect(result.current.models[0].name).toBe('llama3.2')
  })

  it('does not fetch models if status is not running', async () => {
    window.orbit.checkOllamaStatus = vi.fn().mockResolvedValue('installed-not-running')

    const { result } = renderHook(() => useOllama())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(window.orbit.listOllamaModels).not.toHaveBeenCalled()
    expect(result.current.models).toHaveLength(0)
  })

  it('tracks pull progress', async () => {
    const { result } = renderHook(() => useOllama())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.pullModel('mistral:latest')
    })

    expect(window.orbit.pullModel).toHaveBeenCalledWith('mistral:latest')

    act(() => {
      capturedProgressCb?.({
        modelName: 'mistral:latest',
        progress: { status: 'downloading', total: 1000, completed: 500 },
      })
    })

    expect(result.current.downloadProgress['mistral:latest']).toBe(50)
  })

  it('sets progress to 100 on success status', async () => {
    const { result } = renderHook(() => useOllama())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.pullModel('mistral:latest')
    })

    act(() => {
      capturedProgressCb?.({
        modelName: 'mistral:latest',
        progress: { status: 'success' },
      })
    })

    expect(result.current.downloadProgress['mistral:latest']).toBe(100)
  })

  it('sets error on status check failure', async () => {
    window.orbit.checkOllamaStatus = vi.fn().mockRejectedValue(new Error('ipc failed'))

    const { result } = renderHook(() => useOllama())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error?.message).toBe('ipc failed')
  })

  it('progress events for model A do not affect model B', async () => {
    const { result } = renderHook(() => useOllama())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.pullModel('modelA')
      result.current.pullModel('modelB')
    })

    act(() => {
      capturedProgressCb?.({
        modelName: 'modelA',
        progress: { status: 'downloading', total: 100, completed: 75 },
      })
    })

    expect(result.current.downloadProgress['modelA']).toBe(75)
    expect(result.current.downloadProgress['modelB']).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd orbit && npx vitest run src/hooks/__tests__/useOllama.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement useOllama hook**

Create `orbit/src/hooks/useOllama.ts`:
```typescript
import { useState, useEffect, useCallback, useRef } from 'react'
import type { OllamaStatus } from '../types/ollama'
import type { ScoredModel } from '../types/llmfit'
import type { Model } from '../types/models'
import { mapOllamaModel } from '../utils/modelAdapter'

export function useOllama(scoredModels?: ScoredModel[]) {
  const [status, setStatus] = useState<OllamaStatus>('installed-not-running')
  const [models, setModels] = useState<Model[]>([])
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const scoredModelsRef = useRef(scoredModels)
  scoredModelsRef.current = scoredModels

  const refreshModels = useCallback(async () => {
    try {
      const response = await window.orbit.listOllamaModels()
      const mapped = response.models.map((m) => mapOllamaModel(m, scoredModelsRef.current))
      setModels(mapped)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function init() {
      setIsLoading(true)
      try {
        const s = await window.orbit.checkOllamaStatus()
        if (cancelled) return
        setStatus(s)
        if (s === 'running') {
          await refreshModels()
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [refreshModels])

  // Listen for pull progress events
  useEffect(() => {
    const cleanup = window.orbit.onPullProgress((data) => {
      const typed = data as {
        modelName: string
        progress: { status: string; total?: number; completed?: number }
      }

      if (typed.progress.status === 'success') {
        setDownloadProgress((prev) => ({ ...prev, [typed.modelName]: 100 }))
        refreshModels()
        return
      }

      if (typed.progress.total && typed.progress.completed) {
        const pct = Math.round((typed.progress.completed / typed.progress.total) * 100)
        setDownloadProgress((prev) => ({ ...prev, [typed.modelName]: pct }))
      }
    })

    return cleanup
  }, [refreshModels])

  const pullModel = useCallback((name: string) => {
    setDownloadProgress((prev) => ({ ...prev, [name]: 0 }))
    window.orbit.pullModel(name)
  }, [])

  return { status, models, downloadProgress, isLoading, error, pullModel, refreshModels }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd orbit && npx vitest run src/hooks/__tests__/useOllama.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit hook**

```bash
git add orbit/src/hooks/useOllama.ts orbit/src/hooks/__tests__/useOllama.test.ts
git commit -m "feat: add useOllama hook with status, models, and pull progress"
```

- [ ] **Step 6: Update ModelLibrary.tsx to accept isLoading prop**

In `orbit/src/screens/ModelLibrary.tsx`:

1. Change the import from `import type { Model } from '../data/mock'` to `import type { Model } from '../types/models'`
2. Add `isLoading?: boolean` to `ModelLibraryProps`
3. Add a loading state at the top of the render function, before the existing return:
```typescript
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] text-white/38">Loading models...</p>
      </div>
    )
  }
```

- [ ] **Step 7: Verify build succeeds**

Run: `cd orbit && npm run build`
Expected: Build succeeds

- [ ] **Step 8: Run all tests**

Run: `cd orbit && npx vitest run`
Expected: All tests pass

- [ ] **Step 9: Commit**

```bash
git add orbit/src/hooks/useOllama.ts orbit/src/hooks/__tests__/useOllama.test.ts orbit/src/screens/ModelLibrary.tsx
git commit -m "feat: add useOllama hook and wire to ModelLibrary"
```

---

### Task 7: useLLMFit Hook + HardwareAudit Screen Wiring (W5)

**Files:**
- Create: `orbit/src/hooks/useLLMFit.ts`
- Create: `orbit/src/hooks/__tests__/useLLMFit.test.ts`
- Modify: `orbit/src/screens/HardwareAudit.tsx`

- [ ] **Step 1: Write failing tests for useLLMFit**

Create `orbit/src/hooks/__tests__/useLLMFit.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLLMFit } from '../useLLMFit'
import type { SystemProfile, ScoredModel } from '../../types/llmfit'

const mockSystemProfile: SystemProfile = {
  total_ram_gb: 16,
  available_ram_gb: 10,
  cpu_cores: 12,
  cpu_name: 'Apple M2 Pro',
  has_gpu: true,
  gpu_vram_gb: null,
  gpu_name: 'M2 Pro GPU',
  gpu_count: 1,
  unified_memory: true,
  backend: 'metal',
}

const mockScoredModel: ScoredModel = {
  name: 'llama3.2',
  provider: 'meta',
  parameter_count: 7_000_000_000,
  fit_level: 'perfect',
  run_mode: 'gpu',
  score: 0.95,
  score_components: { quality: 0.9, speed: 0.9, fit: 1.0, context: 0.9 },
  estimated_tps: 45,
  best_quant: 'Q4_0',
  memory_required_gb: 4.1,
  memory_available_gb: 16,
  utilization_pct: 25,
  context_length: 8192,
  gguf_sources: [],
}

describe('useLLMFit', () => {
  beforeEach(() => {
    window.orbit.scanHardware = vi.fn().mockResolvedValue({ system: mockSystemProfile })
    window.orbit.recommendModels = vi.fn().mockResolvedValue({
      system: mockSystemProfile,
      models: [mockScoredModel],
    })
  })

  it('starts with null systemProfile and empty scoredModels', () => {
    const { result } = renderHook(() => useLLMFit())
    expect(result.current.systemProfile).toBeNull()
    expect(result.current.scoredModels).toEqual([])
    expect(result.current.isScanning).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('scan() fetches system profile', async () => {
    const { result } = renderHook(() => useLLMFit())

    await act(async () => {
      await result.current.scan()
    })

    expect(window.orbit.scanHardware).toHaveBeenCalled()
    expect(result.current.systemProfile).toEqual(mockSystemProfile)
  })

  it('recommend() fetches scored models and system profile', async () => {
    const { result } = renderHook(() => useLLMFit())

    await act(async () => {
      await result.current.recommend()
    })

    expect(window.orbit.recommendModels).toHaveBeenCalled()
    expect(result.current.scoredModels).toHaveLength(1)
    expect(result.current.systemProfile).toEqual(mockSystemProfile)
  })

  it('scanAndRecommend() calls recommend()', async () => {
    const { result } = renderHook(() => useLLMFit())

    await act(async () => {
      await result.current.scanAndRecommend()
    })

    expect(window.orbit.recommendModels).toHaveBeenCalled()
    expect(result.current.systemProfile).not.toBeNull()
    expect(result.current.scoredModels).toHaveLength(1)
  })

  it('sets isScanning during async calls', async () => {
    let resolvePromise: (v: unknown) => void
    window.orbit.scanHardware = vi.fn().mockReturnValue(
      new Promise((r) => { resolvePromise = r })
    )

    const { result } = renderHook(() => useLLMFit())

    let scanPromise: Promise<void>
    act(() => {
      scanPromise = result.current.scan()
    })

    expect(result.current.isScanning).toBe(true)

    await act(async () => {
      resolvePromise!({ system: mockSystemProfile })
      await scanPromise!
    })

    expect(result.current.isScanning).toBe(false)
  })

  it('sets error on scan failure', async () => {
    window.orbit.scanHardware = vi.fn().mockRejectedValue(new Error('llmfit not found'))

    const { result } = renderHook(() => useLLMFit())

    await act(async () => {
      await result.current.scan()
    })

    expect(result.current.error?.message).toBe('llmfit not found')
    expect(result.current.isScanning).toBe(false)
  })

  it('clears error on retry', async () => {
    window.orbit.scanHardware = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ system: mockSystemProfile })

    const { result } = renderHook(() => useLLMFit())

    await act(async () => {
      await result.current.scan()
    })
    expect(result.current.error).not.toBeNull()

    await act(async () => {
      await result.current.scan()
    })
    expect(result.current.error).toBeNull()
    expect(result.current.systemProfile).toEqual(mockSystemProfile)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd orbit && npx vitest run src/hooks/__tests__/useLLMFit.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement useLLMFit hook**

Create `orbit/src/hooks/useLLMFit.ts`:
```typescript
import { useState, useCallback } from 'react'
import type { SystemProfile, ScoredModel } from '../types/llmfit'

export function useLLMFit() {
  const [systemProfile, setSystemProfile] = useState<SystemProfile | null>(null)
  const [scoredModels, setScoredModels] = useState<ScoredModel[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const scan = useCallback(async () => {
    setError(null)
    setIsScanning(true)
    try {
      const response = await window.orbit.scanHardware()
      setSystemProfile(response.system)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsScanning(false)
    }
  }, [])

  const recommend = useCallback(async () => {
    setError(null)
    setIsScanning(true)
    try {
      const response = await window.orbit.recommendModels()
      setSystemProfile(response.system)
      setScoredModels(response.models)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsScanning(false)
    }
  }, [])

  const scanAndRecommend = useCallback(async () => {
    await recommend()
  }, [recommend])

  return { systemProfile, scoredModels, isScanning, error, scan, recommend, scanAndRecommend }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd orbit && npx vitest run src/hooks/__tests__/useLLMFit.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit hook**

```bash
git add orbit/src/hooks/useLLMFit.ts orbit/src/hooks/__tests__/useLLMFit.test.ts
git commit -m "feat: add useLLMFit hook with scan and recommend"
```

- [ ] **Step 6: Wire useLLMFit into HardwareAudit screen**

Replace the entire content of `orbit/src/screens/HardwareAudit.tsx`:
```typescript
import { AnimatePresence, motion } from 'framer-motion'
import { Cpu, MemoryStick, Monitor, Check, AlertTriangle } from 'lucide-react'
import OrbitPulse from '../components/OrbitPulse'
import { useLLMFit } from '../hooks/useLLMFit'
import type { SystemProfile, ScoredModel } from '../types/llmfit'
import type { HardwareSpec } from '../types/models'

type HardwareAuditProps = {
  onNavigateToModels?: () => void
}

const iconMap: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Cpu,
  MemoryStick,
  Monitor,
}

const iconColorMap: Record<string, string> = {
  Cpu: 'border border-white/8 bg-white/4 text-white/78',
  MemoryStick: 'border border-white/8 bg-white/4 text-white/78',
  Monitor: 'border border-white/8 bg-white/4 text-white/78',
}

const statusDotColor: Record<string, string> = {
  good: 'bg-[#7d92ff]',
  warning: 'bg-[#f3ae59]',
  low: 'bg-[#ff7b7b]',
}

const fitLevelConfig = {
  perfect: { label: 'Full Speed', classes: 'bg-white text-stone-900' },
  good: { label: 'Full Speed', classes: 'bg-white text-stone-900' },
  marginal: { label: 'Reduced Speed', classes: 'bg-white/7 text-white/68' },
  too_tight: { label: 'Incompatible', classes: 'bg-white/5 text-white/34' },
}

function mapSystemToSpecs(system: SystemProfile): HardwareSpec[] {
  const specs: HardwareSpec[] = [
    {
      label: 'CPU',
      value: `${system.cpu_name} (${system.cpu_cores}-core)`,
      icon: 'Cpu',
      status: 'good',
    },
    {
      label: 'Memory',
      value: `${system.total_ram_gb} GB${system.unified_memory ? ' Unified' : ''}`,
      icon: 'MemoryStick',
      status: system.total_ram_gb >= 16 ? 'good' : system.total_ram_gb >= 8 ? 'warning' : 'low',
    },
  ]

  if (system.has_gpu && system.gpu_name) {
    specs.push({
      label: 'GPU',
      value: system.gpu_vram_gb
        ? `${system.gpu_name} (${system.gpu_vram_gb} GB)`
        : system.gpu_name,
      icon: 'Monitor',
      status: 'good',
    })
  } else {
    specs.push({
      label: 'GPU',
      value: 'No dedicated GPU',
      icon: 'Monitor',
      status: 'warning',
    })
  }

  return specs
}

export default function HardwareAudit({ onNavigateToModels }: HardwareAuditProps) {
  const { systemProfile, scoredModels, isScanning, error, scanAndRecommend } = useLLMFit()

  const scanState = isScanning ? 'scanning' : systemProfile ? 'results' : 'idle'
  const specs = systemProfile ? mapSystemToSpecs(systemProfile) : []
  const fullSpeedCount = scoredModels.filter(
    (m) => m.fit_level === 'perfect' || m.fit_level === 'good'
  ).length

  return (
    <div className="h-full min-h-0 overflow-y-auto px-6 pb-6">
      <AnimatePresence mode="wait">
        {scanState === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-full flex-col items-center justify-center"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/8 bg-white/4">
              <Cpu className="h-7 w-7 text-white/82" strokeWidth={1.5} />
            </div>
            <h1 className="mb-1 text-[14px] font-semibold text-stone-50">Scan Your Hardware</h1>
            <p className="mb-6 text-[12px] text-white/38">
              Detect your system specs and find compatible models
            </p>
            {error && (
              <p className="mb-4 text-[12px] text-red-400">{error.message}</p>
            )}
            <button
              onClick={scanAndRecommend}
              className="cursor-pointer rounded-full bg-white px-5 py-2 text-[13px] font-medium text-stone-900 transition-colors hover:bg-stone-100 active:scale-[0.98]"
            >
              Start Scan
            </button>
          </motion.div>
        )}

        {scanState === 'scanning' && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-full flex-col items-center justify-center"
          >
            <div className="mb-4">
              <OrbitPulse size={40} label="" />
            </div>
            <p className="mb-1 text-[13px] text-white/38">Scanning hardware...</p>
          </motion.div>
        )}

        {scanState === 'results' && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="mx-auto max-w-[960px]"
          >
            <div className="mb-4 flex items-center gap-2">
              <h1 className="text-[14px] font-semibold text-stone-50">System Profile</h1>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/8">
                <Check className="h-3 w-3 text-white" />
              </span>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
              {specs.map((spec) => {
                const Icon = iconMap[spec.icon]
                return (
                  <div key={spec.label} className="app-card rounded-[22px] p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${iconColorMap[spec.icon]}`}>
                          {Icon && <Icon className="h-4 w-4" strokeWidth={1.5} />}
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-white/28">{spec.label}</p>
                          <p className="mt-0.5 font-mono text-[13px] font-medium text-stone-50">{spec.value}</p>
                        </div>
                      </div>
                      <span className={`mt-1.5 h-2 w-2 rounded-full ${statusDotColor[spec.status]}`} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div>
              <h2 className="mb-3 text-[14px] font-semibold text-stone-50">Model Compatibility</h2>
              <div className="space-y-1">
                {scoredModels.map((model) => {
                  const config = fitLevelConfig[model.fit_level]
                  return (
                    <div
                      key={model.name}
                      className="app-card app-card-hover flex items-center justify-between rounded-[18px] px-3.5 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[13px] font-medium text-stone-50">{model.name}</span>
                        <span className="text-[12px] text-white/32">{model.best_quant}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-white/40">{model.memory_required_gb.toFixed(1)} GB</span>
                        <span className="text-[11px] font-mono text-white/32">{model.estimated_tps} tok/s</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${config.classes}`}>
                          {config.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[12px] text-white/42">
                <AlertTriangle className="h-3.5 w-3.5 text-[#7d92ff]" strokeWidth={1.5} />
                <span>
                  Your system can run{' '}
                  <span className="font-medium text-stone-50">{fullSpeedCount} models</span>{' '}
                  at full speed
                </span>
              </div>
              <button
                onClick={onNavigateToModels}
                className="cursor-pointer rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-stone-900 transition-colors hover:bg-stone-100 active:scale-[0.98]"
              >
                Browse Model Library
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 7: Verify build succeeds**

Run: `cd orbit && npm run build`
Expected: Build succeeds

- [ ] **Step 8: Run all tests**

Run: `cd orbit && npx vitest run`
Expected: All tests pass

- [ ] **Step 9: Commit**

```bash
git add orbit/src/hooks/useLLMFit.ts orbit/src/hooks/__tests__/useLLMFit.test.ts orbit/src/screens/HardwareAudit.tsx
git commit -m "feat: wire useLLMFit to HardwareAudit with real hardware scan"
```

---

## Chunk 3: Phase 3 — Integration Verification

### Task 8: Final Integration Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `cd orbit && npx vitest run`
Expected: All tests pass (modelAdapter, useChat, useOllama, useLLMFit)

- [ ] **Step 2: Type-check the entire project**

Run: `cd orbit && npx tsc -b`
Expected: No type errors

- [ ] **Step 3: Build the app**

Run: `cd orbit && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Lint**

Run: `cd orbit && npm run lint`
Expected: No lint errors (or only pre-existing ones)

- [ ] **Step 5: Manual smoke test**

Run: `cd orbit && npm run dev:electron`

Verify:
- App launches with no console errors
- Hardware Audit: "Start Scan" button triggers real LLMFit scan, shows real system specs
- Model Library: Shows models from Ollama (or loading/empty state if Ollama has no models)
- Chat: Sending a message streams a real response from Ollama (requires a model to be downloaded)

- [ ] **Step 6: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: integration fixes from smoke test"
```
