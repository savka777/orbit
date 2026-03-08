# LLMFit Integration Design

**Date:** 2026-03-07
**Status:** Approved

## Overview

Integrate LLMFit into Orbit to give non-technical consumers a seamless path from first launch to chatting with a local AI model. LLMFit handles hardware detection and model scoring; Ollama handles model downloading and inference.

## Decisions

- **Integration method:** Bundle LLMFit binary inside Electron app, run on-demand via `llmfit serve` REST API
- **LLM runtime:** Ollama (bundled/installed separately)
- **Onboarding:** Multi-step wizard flow
- **Existing screens:** Replace HardwareAudit and ModelLibrary with LLMFit-powered versions

## System Architecture

### Bundled Components

- **LLMFit binary** — shipped in Electron's `resources/bin/` directory
- **Ollama** — detected on first run; user prompted to install if missing

### On-Demand LLMFit Lifecycle

1. User triggers a scan (onboarding or hardware tab)
2. Electron main process spawns `llmfit serve` on a random available port
3. React frontend calls LLMFit's REST API via Electron IPC bridge
4. When results are received, the process is killed

### Data Flow

```
React Screen → IPC invoke → Electron Main Process → HTTP to llmfit serve → JSON → IPC response → React state
```

### Persistence

Scan results and config saved to `app.getPath('userData') + '/orbit-config.json'`. Contains: `onboardingComplete`, `systemProfile`, `selectedModelId`, `lastScanTimestamp`.

## User Segments

On first launch, a silent pre-scan determines the user's segment:

| Segment | Has Ollama? | Has Models? | Onboarding Path |
|---------|-------------|-------------|-----------------|
| **Power user** | Yes | Yes | Show detected models with fit scores. "Continue with [model]" or "Explore other models" |
| **Partial setup** | Yes | No | Skip Ollama install, go to hardware scan + model recommendations |
| **Brand new** | No | No | Full wizard: install Ollama, scan hardware, recommend + download model |

## Onboarding Wizard Flow

### Step 0: Silent Pre-scan (no UI)

- Detect Ollama installation + daemon status
- Query installed models if Ollama exists
- Determine user segment
- ~1-2 seconds, show app loading state

### Step 1: Welcome + Hardware Scan

- Welcome message: "Let's find the perfect AI model for your Mac"
- "Scan My Hardware" button
- Spawns `llmfit serve`, calls system endpoint
- Animated scan with real data populating as detected
- Results in plain English: "Apple M2 Pro — 16 GB memory — great for running mid-size models"

**Brand new users only:** Interstitial before scan explaining Ollama ("A lightweight tool that runs AI models on your Mac") with download link. Orbit polls for Ollama availability and auto-advances once detected.

### Step 2: Model Recommendations

- LLMFit's recommend endpoint returns scored models
- Top 3 shown as cards with consumer-friendly info:
  - Model name + maker ("Llama 3.1 8B by Meta")
  - What it's good at ("Great all-rounder for chat and writing")
  - Fit indicator ("Perfect fit for your Mac")
  - Download size ("4.1 GB download")
  - Estimated speed ("~45 words per second on your hardware")
- "Show more models" expandable section below top 3

### Step 3: Download + Setup

- Progress bar via Ollama's pull API streamed through IPC
- Plain-English status ("Downloading Mistral 7B... 2.1 GB of 4.1 GB")
- Completion: "You're all set!" with "Start chatting" button
- Transitions to Welcome/Chat with downloaded model pre-selected

### Power User Path

- Show detected models with LLMFit fit scores
- "Continue with [model name]" — go straight to chat
- "Explore other models" — run full LLMFit scan and show recommendations

## Screen Architecture

### Screen Changes

| Screen | Change |
|--------|--------|
| `'welcome'` | Unchanged — chat landing page |
| `'hardware'` | Rewritten with real LLMFit data |
| `'models'` | Rewritten with LLMFit-scored models + real Ollama downloads |
| `'chat'` | Connected to Ollama API for real inference |
| `'onboarding'` | **New** — wizard flow (Steps 1-3) |
| `'setup-ollama'` | **New** — shown only if Ollama isn't installed |

### State Additions to useAppState

- `onboardingComplete: boolean` — persisted, controls wizard vs main app
- `systemProfile: SystemProfile | null` — hardware data from LLMFit
- `scoredModels: ScoredModel[]` — ranked models with fit scores, speed, memory
- `ollamaStatus: 'not-installed' | 'installed-not-running' | 'running'`
- `installedModels: InstalledModel[]` — models already in Ollama
- `userSegment: 'power-user' | 'partial' | 'brand-new'`

### Electron IPC Channels

- `llmfit:scan-hardware` — spawn llmfit serve, call system endpoint
- `llmfit:recommend-models` — call fit/recommend endpoint
- `ollama:check-status` — check installation and daemon status
- `ollama:list-models` — get installed models
- `ollama:pull-model` — download model with progress streaming
- `ollama:chat` — send messages for real inference

### Removed

- Mock hardware specs from `mock.ts`
- Mock model compatibility data
- Simulated download progress logic
- Mock AI response templates (replaced by real Ollama responses)

## Electron Main Process

### LLMFit Process Management

- Binary location: `process.resourcesPath + '/bin/llmfit'`
- Port: random available port per invocation
- Timeout: kill if no response within 10 seconds
- Lifecycle: spawn on scan trigger, kill when done

### Ollama Integration

- Detection: check PATH for `ollama` + HTTP ping to `localhost:11434`
- Downloads: `POST /api/pull` with streaming JSON progress piped through IPC
- Chat: `POST /api/chat` with streaming, replaces mock responses

### Dev Mode Overrides

- `ORBIT_SKIP_OLLAMA` — pretend Ollama doesn't exist
- `ORBIT_SKIP_MODELS` — pretend no models installed
- `ORBIT_FRESH` — full brand-new experience

## Error Handling (MVP)

### Model Cold Start Latency

First message takes 10+ seconds while the model loads into memory. Show "Loading model into memory..." indicator on first message, distinct from response streaming. Prevents user thinking the app is broken.

### App Closed During Download

Detect incomplete download state on next launch. Auto-resume: "Looks like your download was interrupted. Resuming..." Ollama supports resume natively.

### Other Errors

- **Ollama not installed:** Friendly explanation + download link + polling for detection
- **Ollama not running:** Attempt `open -a Ollama`, prompt if that fails, poll until responsive
- **LLMFit fails to launch:** Retry once, then show error with retry button. Fall back to manual model browsing
- **No GPU detected:** LLMFit handles gracefully, recommend smaller CPU-optimized models with a note
- **Download fails:** "Download failed — Retry" button. Ollama handles resume on retry
- **Insufficient disk space:** Check before download, show clear message with required vs available space
