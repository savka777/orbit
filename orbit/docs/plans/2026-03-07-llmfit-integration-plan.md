# LLMFit Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Orbit's mock hardware scanning, model library, and chat with real LLMFit hardware detection, model recommendations, Ollama model downloads, and Ollama-powered chat inference.

**Architecture:** Bundle the LLMFit binary inside the Electron app. On-demand, spawn `llmfit serve` as a child process and call its REST API for hardware scanning and model scoring. Use Ollama's HTTP API for model downloads and chat inference. A pre-scan on app launch detects existing Ollama installation and models to route users to the right onboarding path.

**Tech Stack:** Electron IPC (main ↔ renderer), LLMFit REST API, Ollama HTTP API, React + TypeScript + Tailwind + Framer Motion

---

### Task 1: Add TypeScript Types for LLMFit and Ollama Data

**Files:**
- Create: `src/types/llmfit.ts`
- Create: `src/types/ollama.ts`
- Modify: `src/data/mock.ts:1-11` (keep existing types but export from new location later)

**Step 1: Create LLMFit types**

```typescript
// src/types/llmfit.ts

export type SystemProfile = {
  total_ram_gb: number
  available_ram_gb: number
  cpu_cores: number
  cpu_name: string
  has_gpu: boolean
  gpu_vram_gb: number | null
  gpu_name: string | null
  gpu_count: number
  unified_memory: boolean
  backend: string
}

export type ScoredModel = {
  name: string
  provider: string
  parameter_count: number
  fit_level: 'perfect' | 'good' | 'marginal' | 'too_tight'
  run_mode: string
  score: number
  score_components: {
    quality: number
    speed: number
    fit: number
    context: number
  }
  estimated_tps: number
  best_quant: string
  memory_required_gb: number
  memory_available_gb: number
  utilization_pct: number
  context_length: number
  gguf_sources: string[]
}

export type LLMFitResponse = {
  system: SystemProfile
  models: ScoredModel[]
}
```

**Step 2: Create Ollama types**

```typescript
// src/types/ollama.ts

export type OllamaModel = {
  name: string
  model: string
  size: number
  digest: string
  modified_at: string
  details: {
    parent_model: string
    format: string
    family: string
    parameter_size: string
    quantization_level: string
  }
}

export type OllamaListResponse = {
  models: OllamaModel[]
}

export type OllamaPullProgress = {
  status: string
  digest?: string
  total?: number
  completed?: number
}

export type OllamaChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type OllamaChatRequest = {
  model: string
  messages: OllamaChatMessage[]
  stream: boolean
}

export type OllamaChatChunk = {
  model: string
  message: OllamaChatMessage
  done: boolean
}

export type OllamaStatus = 'not-installed' | 'installed-not-running' | 'running'

export type UserSegment = 'power-user' | 'partial' | 'brand-new'
```

**Step 3: Commit**

```bash
git add src/types/llmfit.ts src/types/ollama.ts
git commit -m "feat: add TypeScript types for LLMFit and Ollama APIs"
```

---

### Task 2: Build Electron IPC Handlers for Ollama

**Files:**
- Create: `electron/ollama.ts`
- Modify: `electron/main.ts` (register IPC handlers)
- Modify: `electron/preload.ts` (expose IPC to renderer)

**Step 1: Create Ollama service module**

```typescript
// electron/ollama.ts
import { exec } from 'child_process'
import http from 'http'

const OLLAMA_HOST = 'http://127.0.0.1:11434'

function httpRequest(method: string, path: string, body?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, OLLAMA_HOST)
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
    }
    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

export async function checkOllamaStatus(): Promise<'not-installed' | 'installed-not-running' | 'running'> {
  // First check if daemon is running
  try {
    await httpRequest('GET', '/api/tags')
    return 'running'
  } catch {
    // Daemon not running, check if binary exists
  }

  return new Promise((resolve) => {
    exec('which ollama', (error) => {
      resolve(error ? 'not-installed' : 'installed-not-running')
    })
  })
}

export async function listOllamaModels(): Promise<unknown> {
  const response = await httpRequest('GET', '/api/tags')
  return JSON.parse(response)
}

export async function startOllama(): Promise<boolean> {
  return new Promise((resolve) => {
    exec('open -a Ollama', (error) => {
      if (error) {
        resolve(false)
        return
      }
      // Poll until running
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        try {
          await httpRequest('GET', '/api/tags')
          clearInterval(poll)
          resolve(true)
        } catch {
          if (attempts > 15) { // 15 seconds
            clearInterval(poll)
            resolve(false)
          }
        }
      }, 1000)
    })
  })
}
```

**Step 2: Add pull and chat functions to ollama.ts**

Add to the bottom of `electron/ollama.ts`:

```typescript
import { BrowserWindow } from 'electron'

export function pullModel(modelName: string, win: BrowserWindow): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/pull', OLLAMA_HOST)
    const body = JSON.stringify({ name: modelName, stream: true })
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }

    const req = http.request(options, (res) => {
      res.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean)
        for (const line of lines) {
          try {
            const progress = JSON.parse(line)
            win.webContents.send('ollama:pull-progress', { modelName, progress })
          } catch { /* skip malformed lines */ }
        }
      })
      res.on('end', () => resolve())
      res.on('error', reject)
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

export function streamChat(
  model: string,
  messages: Array<{ role: string; content: string }>,
  win: BrowserWindow,
  conversationId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/chat', OLLAMA_HOST)
    const body = JSON.stringify({ model, messages, stream: true })
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }

    const req = http.request(options, (res) => {
      res.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean)
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line)
            win.webContents.send('ollama:chat-chunk', { conversationId, chunk: parsed })
          } catch { /* skip */ }
        }
      })
      res.on('end', () => {
        win.webContents.send('ollama:chat-done', { conversationId })
        resolve()
      })
      res.on('error', reject)
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}
```

**Step 3: Register IPC handlers in main.ts**

Add to `electron/main.ts` after imports:

```typescript
import { ipcMain } from 'electron'
import { checkOllamaStatus, listOllamaModels, startOllama, pullModel, streamChat } from './ollama'

// After createWindow(), register handlers:
ipcMain.handle('ollama:check-status', () => checkOllamaStatus())
ipcMain.handle('ollama:list-models', () => listOllamaModels())
ipcMain.handle('ollama:start', () => startOllama())
ipcMain.handle('ollama:pull-model', (_event, modelName: string) => {
  if (mainWindow) return pullModel(modelName, mainWindow)
})
ipcMain.handle('ollama:chat', (_event, { model, messages, conversationId }) => {
  if (mainWindow) return streamChat(model, messages, mainWindow, conversationId)
})
```

**Step 4: Expose IPC in preload.ts**

Replace `electron/preload.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('orbit', {
  platform: process.platform,

  // Ollama
  checkOllamaStatus: () => ipcRenderer.invoke('ollama:check-status'),
  listOllamaModels: () => ipcRenderer.invoke('ollama:list-models'),
  startOllama: () => ipcRenderer.invoke('ollama:start'),
  pullModel: (modelName: string) => ipcRenderer.invoke('ollama:pull-model', modelName),
  chat: (model: string, messages: Array<{ role: string; content: string }>, conversationId: string) =>
    ipcRenderer.invoke('ollama:chat', { model, messages, conversationId }),

  // Event listeners for streaming
  onPullProgress: (callback: (data: unknown) => void) => {
    ipcRenderer.on('ollama:pull-progress', (_event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('ollama:pull-progress')
  },
  onChatChunk: (callback: (data: unknown) => void) => {
    ipcRenderer.on('ollama:chat-chunk', (_event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('ollama:chat-chunk')
  },
  onChatDone: (callback: (data: unknown) => void) => {
    ipcRenderer.on('ollama:chat-done', (_event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('ollama:chat-done')
  },

  // LLMFit
  scanHardware: () => ipcRenderer.invoke('llmfit:scan-hardware'),
  recommendModels: () => ipcRenderer.invoke('llmfit:recommend-models'),
})
```

**Step 5: Create a type declaration for the window.orbit API**

```typescript
// src/types/electron.d.ts

export {}

declare global {
  interface Window {
    orbit: {
      platform: string
      checkOllamaStatus: () => Promise<'not-installed' | 'installed-not-running' | 'running'>
      listOllamaModels: () => Promise<{ models: Array<{ name: string; size: number; details: { parameter_size: string; family: string } }> }>
      startOllama: () => Promise<boolean>
      pullModel: (modelName: string) => Promise<void>
      chat: (model: string, messages: Array<{ role: string; content: string }>, conversationId: string) => Promise<void>
      onPullProgress: (callback: (data: { modelName: string; progress: { status: string; total?: number; completed?: number } }) => void) => () => void
      onChatChunk: (callback: (data: { conversationId: string; chunk: { message: { content: string }; done: boolean } }) => void) => () => void
      onChatDone: (callback: (data: { conversationId: string }) => void) => () => void
      scanHardware: () => Promise<import('./llmfit').LLMFitResponse>
      recommendModels: () => Promise<import('./llmfit').LLMFitResponse>
    }
  }
}
```

**Step 6: Commit**

```bash
git add electron/ollama.ts electron/main.ts electron/preload.ts src/types/electron.d.ts
git commit -m "feat: add Electron IPC handlers for Ollama status, pull, and chat"
```

---

### Task 3: Build Electron IPC Handlers for LLMFit

**Files:**
- Create: `electron/llmfit.ts`
- Modify: `electron/main.ts` (register LLMFit IPC handlers)

**Step 1: Create LLMFit service module**

```typescript
// electron/llmfit.ts
import { spawn, ChildProcess } from 'child_process'
import { app } from 'electron'
import path from 'path'
import http from 'http'
import net from 'net'

let llmfitProcess: ChildProcess | null = null
let currentPort: number | null = null

function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, () => {
      const addr = server.address()
      if (addr && typeof addr !== 'string') {
        const port = addr.port
        server.close(() => resolve(port))
      } else {
        reject(new Error('Could not find available port'))
      }
    })
    server.on('error', reject)
  })
}

function getLLMFitPath(): string {
  const isDev = !app.isPackaged
  if (isDev) {
    // In dev, expect llmfit on PATH or in project root
    return process.env.LLMFIT_PATH || 'llmfit'
  }
  return path.join(process.resourcesPath, 'bin', 'llmfit')
}

function httpGet(port: number, path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path, method: 'GET' },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => resolve(data))
      }
    )
    req.on('error', reject)
    req.setTimeout(10000, () => {
      req.destroy()
      reject(new Error('LLMFit request timed out'))
    })
    req.end()
  })
}

async function waitForServer(port: number, maxAttempts = 20): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await httpGet(port, '/health')
      return
    } catch {
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  throw new Error('LLMFit server did not start in time')
}

export async function startLLMFit(): Promise<number> {
  if (llmfitProcess && currentPort) return currentPort

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
}

export function stopLLMFit(): void {
  if (llmfitProcess) {
    llmfitProcess.kill()
    llmfitProcess = null
    currentPort = null
  }
}

export async function scanHardware(): Promise<unknown> {
  const port = await startLLMFit()
  try {
    const response = await httpGet(port, '/api/system')
    return JSON.parse(response)
  } finally {
    stopLLMFit()
  }
}

export async function recommendModels(): Promise<unknown> {
  const port = await startLLMFit()
  try {
    const response = await httpGet(port, '/api/fit')
    return JSON.parse(response)
  } finally {
    stopLLMFit()
  }
}
```

**Step 2: Register LLMFit IPC handlers in main.ts**

Add to the IPC handler block in `electron/main.ts`:

```typescript
import { scanHardware, recommendModels, stopLLMFit } from './llmfit'

ipcMain.handle('llmfit:scan-hardware', () => scanHardware())
ipcMain.handle('llmfit:recommend-models', () => recommendModels())

// Clean up on app quit
app.on('before-quit', () => {
  stopLLMFit()
})
```

**Step 3: Commit**

```bash
git add electron/llmfit.ts electron/main.ts
git commit -m "feat: add Electron IPC handlers for LLMFit hardware scan and model recommendations"
```

---

### Task 4: Add Dev Mode Overrides

**Files:**
- Modify: `electron/main.ts` (read env vars, pass to renderer)
- Modify: `electron/ollama.ts` (check overrides before real detection)

**Step 1: Add dev override logic**

In `electron/main.ts`, add after `const isDev`:

```typescript
const devOverrides = {
  skipOllama: process.env.ORBIT_SKIP_OLLAMA === 'true',
  skipModels: process.env.ORBIT_SKIP_MODELS === 'true',
  fresh: process.env.ORBIT_FRESH === 'true',
}
```

Wrap the ollama check-status handler:

```typescript
ipcMain.handle('ollama:check-status', () => {
  if (devOverrides.fresh || devOverrides.skipOllama) return 'not-installed'
  return checkOllamaStatus()
})

ipcMain.handle('ollama:list-models', async () => {
  if (devOverrides.fresh || devOverrides.skipModels) return { models: [] }
  return listOllamaModels()
})
```

**Step 2: Commit**

```bash
git add electron/main.ts
git commit -m "feat: add dev mode overrides (ORBIT_SKIP_OLLAMA, ORBIT_SKIP_MODELS, ORBIT_FRESH)"
```

---

### Task 5: Update useAppState with New State Fields

**Files:**
- Modify: `src/hooks/useAppState.ts`

**Step 1: Add new state fields and types**

Add imports at top of `useAppState.ts`:

```typescript
import type { SystemProfile, ScoredModel } from '../types/llmfit'
import type { OllamaModel, OllamaStatus, UserSegment } from '../types/ollama'
```

Update the `Screen` type:

```typescript
export type Screen = 'welcome' | 'chat' | 'hardware' | 'models' | 'tools' | 'onboarding' | 'setup-ollama'
```

Add new state inside `useAppState()`:

```typescript
const [onboardingComplete, setOnboardingComplete] = useState(false)
const [systemProfile, setSystemProfile] = useState<SystemProfile | null>(null)
const [scoredModels, setScoredModels] = useState<ScoredModel[]>([])
const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>('not-installed')
const [installedModels, setInstalledModels] = useState<OllamaModel[]>([])
const [userSegment, setUserSegment] = useState<UserSegment>('brand-new')
const [isPreScanning, setIsPreScanning] = useState(true)
const [streamingMessage, setStreamingMessage] = useState<string>('')
const [isModelLoading, setIsModelLoading] = useState(false)
```

**Step 2: Add pre-scan function**

```typescript
const runPreScan = useCallback(async () => {
  setIsPreScanning(true)
  try {
    const status = await window.orbit.checkOllamaStatus()
    setOllamaStatus(status)

    if (status === 'running') {
      const response = await window.orbit.listOllamaModels()
      setInstalledModels(response.models ?? [])

      if (response.models && response.models.length > 0) {
        setUserSegment('power-user')
      } else {
        setUserSegment('partial')
      }
    } else if (status === 'installed-not-running') {
      setUserSegment('partial')
    } else {
      setUserSegment('brand-new')
    }
  } catch {
    setUserSegment('brand-new')
  } finally {
    setIsPreScanning(false)
  }
}, [])
```

**Step 3: Replace sendMessage with Ollama-powered version**

Replace the existing `sendMessage` callback with one that calls Ollama for real inference, but falls back to mock responses when Ollama isn't available:

```typescript
const sendMessage = useCallback(async (content: string) => {
  const now = new Date()
  const timestamp = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const userMessage: Message = {
    id: `msg-${Date.now()}`,
    role: 'user',
    content,
    timestamp,
  }

  let convId = activeConversationId

  if (convId) {
    setConversations(prev => prev.map(c =>
      c.id === convId
        ? { ...c, messages: [...c.messages, userMessage] }
        : c
    ))
  } else {
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: content.slice(0, 40) + (content.length > 40 ? '...' : ''),
      lastMessage: '',
      timestamp: 'Just now',
      model: selectedModel.name,
      messages: [userMessage],
    }
    convId = newConv.id
    setConversations(prev => [newConv, ...prev])
    setActiveConversationId(convId)
    setCurrentScreen('chat')
  }

  // Create placeholder assistant message
  const assistantMsgId = `msg-${Date.now() + 1}`
  const assistantMessage: Message = {
    id: assistantMsgId,
    role: 'assistant',
    content: '',
    model: selectedModel.name,
    timestamp,
  }

  setConversations(prev => prev.map(c =>
    c.id === convId
      ? { ...c, messages: [...c.messages, assistantMessage] }
      : c
  ))

  if (ollamaStatus === 'running') {
    setIsModelLoading(true)

    // Get all messages for context
    const conv = conversations.find(c => c.id === convId)
    const allMessages = [...(conv?.messages ?? []), userMessage].map(m => ({
      role: m.role,
      content: m.content,
    }))

    // Set up streaming listener
    const removeChatChunk = window.orbit.onChatChunk((data) => {
      if (data.conversationId === convId) {
        setIsModelLoading(false)
        const token = data.chunk.message.content
        setConversations(prev => prev.map(c =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, content: m.content + token }
                    : m
                ),
              }
            : c
        ))
      }
    })

    const removeChatDone = window.orbit.onChatDone((data) => {
      if (data.conversationId === convId) {
        setIsModelLoading(false)
        removeChatChunk()
        removeChatDone()
        // Update lastMessage
        setConversations(prev => prev.map(c =>
          c.id === convId
            ? { ...c, lastMessage: c.messages[c.messages.length - 1]?.content.slice(0, 60) + '...' }
            : c
        ))
      }
    })

    // The model name in Ollama format (e.g., "llama3.1:8b")
    // For now use the first installed model or selectedModel name
    const ollamaModelName = installedModels[0]?.name ?? selectedModel.name.toLowerCase().replace(/\s+/g, '')
    await window.orbit.chat(ollamaModelName, allMessages, convId)
  } else {
    // Fallback to mock responses when Ollama not available
    const aiContent = aiResponses[Math.floor(Math.random() * aiResponses.length)]
    setConversations(prev => prev.map(c =>
      c.id === convId
        ? {
            ...c,
            messages: c.messages.map(m =>
              m.id === assistantMsgId ? { ...m, content: aiContent } : m
            ),
            lastMessage: aiContent.slice(0, 60) + '...',
          }
        : c
    ))
  }
}, [activeConversationId, selectedModel, ollamaStatus, installedModels, conversations])
```

**Step 4: Replace startModelDownload with real Ollama pull**

```typescript
const startModelDownload = useCallback((modelName: string) => {
  setDownloadProgress(prev => ({ ...prev, [modelName]: 0 }))

  const removeListener = window.orbit.onPullProgress((data) => {
    if (data.modelName === modelName && data.progress.total && data.progress.completed) {
      const pct = (data.progress.completed / data.progress.total) * 100
      setDownloadProgress(prev => ({ ...prev, [modelName]: pct }))
    }
  })

  window.orbit.pullModel(modelName).then(async () => {
    removeListener()
    setDownloadProgress(prev => {
      const next = { ...prev }
      delete next[modelName]
      return next
    })
    // Refresh installed models
    const response = await window.orbit.listOllamaModels()
    setInstalledModels(response.models ?? [])
  }).catch(() => {
    removeListener()
    setDownloadProgress(prev => {
      const next = { ...prev }
      delete next[modelName]
      return next
    })
  })
}, [])
```

**Step 5: Add new state to the return object**

Add to the return statement:

```typescript
return {
  // ...existing fields...
  onboardingComplete,
  setOnboardingComplete,
  systemProfile,
  setSystemProfile,
  scoredModels,
  setScoredModels,
  ollamaStatus,
  setOllamaStatus,
  installedModels,
  setInstalledModels,
  userSegment,
  isPreScanning,
  isModelLoading,
  runPreScan,
}
```

**Step 6: Commit**

```bash
git add src/hooks/useAppState.ts
git commit -m "feat: add LLMFit/Ollama state, pre-scan, real chat streaming, and real model downloads"
```

---

### Task 6: Build the Onboarding Screen

**Files:**
- Create: `src/screens/Onboarding.tsx`

**Step 1: Create the onboarding wizard component**

This is a multi-step wizard: hardware scan → model recommendations → download. It handles all three user segments.

```typescript
// src/screens/Onboarding.tsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cpu, Download, Check, ChevronRight, ExternalLink, Loader2 } from 'lucide-react'
import type { SystemProfile, ScoredModel } from '../types/llmfit'
import type { OllamaModel, OllamaStatus, UserSegment } from '../types/ollama'

type OnboardingProps = {
  userSegment: UserSegment
  ollamaStatus: OllamaStatus
  installedModels: OllamaModel[]
  onComplete: () => void
  onSetSystemProfile: (profile: SystemProfile) => void
  onSetScoredModels: (models: ScoredModel[]) => void
  onStartDownload: (modelName: string) => void
  downloadProgress: Record<string, number>
  onSetOllamaStatus: (status: OllamaStatus) => void
}

type WizardStep = 'welcome' | 'setup-ollama' | 'scanning' | 'results' | 'recommendations' | 'downloading' | 'complete' | 'power-user'

export default function Onboarding({
  userSegment,
  ollamaStatus,
  installedModels,
  onComplete,
  onSetSystemProfile,
  onSetScoredModels,
  onStartDownload,
  downloadProgress,
  onSetOllamaStatus,
}: OnboardingProps) {
  // Determine initial step based on user segment
  const getInitialStep = (): WizardStep => {
    if (userSegment === 'power-user') return 'power-user'
    if (userSegment === 'brand-new') return 'welcome'
    return 'welcome' // partial
  }

  const [step, setStep] = useState<WizardStep>(getInitialStep)
  const [scanProgress, setScanProgress] = useState(0)
  const [systemProfile, setLocalSystemProfile] = useState<SystemProfile | null>(null)
  const [recommendations, setRecommendations] = useState<ScoredModel[]>([])
  const [selectedModelName, setSelectedModelName] = useState<string | null>(null)
  const [showAllModels, setShowAllModels] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Poll for Ollama when on setup step
  useEffect(() => {
    if (step !== 'setup-ollama') return
    const poll = setInterval(async () => {
      const status = await window.orbit.checkOllamaStatus()
      if (status === 'running') {
        onSetOllamaStatus(status)
        clearInterval(poll)
        setStep('welcome')
      }
    }, 2000)
    return () => clearInterval(poll)
  }, [step, onSetOllamaStatus])

  // Run hardware scan
  const runScan = async () => {
    setStep('scanning')
    setScanProgress(0)
    setError(null)

    // Animate progress while waiting for real scan
    const progressInterval = setInterval(() => {
      setScanProgress(prev => Math.min(prev + 2, 90))
    }, 100)

    try {
      const result = await window.orbit.scanHardware()
      clearInterval(progressInterval)
      setScanProgress(100)
      setLocalSystemProfile(result.system)
      onSetSystemProfile(result.system)

      // Small delay to show 100%
      setTimeout(() => setStep('results'), 500)
    } catch {
      clearInterval(progressInterval)
      setError('Hardware scan failed. Please try again.')
      setStep('welcome')
    }
  }

  // Fetch recommendations
  const fetchRecommendations = async () => {
    try {
      const result = await window.orbit.recommendModels()
      setRecommendations(result.models)
      onSetScoredModels(result.models)
      setStep('recommendations')
    } catch {
      setError('Could not fetch model recommendations. Please try again.')
    }
  }

  // Handle model download
  const handleDownload = (modelName: string) => {
    setSelectedModelName(modelName)
    onStartDownload(modelName)
    setStep('downloading')
  }

  // Check if download is complete
  useEffect(() => {
    if (step === 'downloading' && selectedModelName) {
      if (downloadProgress[selectedModelName] === undefined) {
        // Download finished (progress cleared)
        setStep('complete')
      }
    }
  }, [step, selectedModelName, downloadProgress])

  const topModels = recommendations.slice(0, 3)
  const remainingModels = recommendations.slice(3)

  return (
    <div className="h-full flex items-center justify-center bg-white p-8">
      <AnimatePresence mode="wait">
        {/* Power User: show existing models */}
        {step === 'power-user' && (
          <motion.div
            key="power-user"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-lg w-full text-center"
          >
            <div className="mb-6">
              <Check className="h-16 w-16 text-green-500 mx-auto" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-500 mb-8">
              We found {installedModels.length} model{installedModels.length !== 1 ? 's' : ''} on your system
            </p>
            <div className="space-y-3 mb-8 text-left">
              {installedModels.map(m => (
                <div key={m.name} className="flex items-center justify-between rounded-xl border border-gray-200 px-5 py-3">
                  <span className="font-medium text-gray-900">{m.name}</span>
                  <span className="text-sm text-gray-400">{m.details.parameter_size}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={onComplete}
                className="cursor-pointer w-full rounded-xl bg-gray-900 px-8 py-3 font-medium text-white hover:bg-gray-800 transition-colors"
              >
                Continue with {installedModels[0]?.name ?? 'current model'}
              </button>
              <button
                onClick={runScan}
                className="cursor-pointer w-full rounded-xl border border-gray-200 px-8 py-3 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Explore other models
              </button>
            </div>
          </motion.div>
        )}

        {/* Setup Ollama */}
        {step === 'setup-ollama' && (
          <motion.div
            key="setup-ollama"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-lg w-full text-center"
          >
            <div className="mb-6">
              <Download className="h-16 w-16 text-gray-400 mx-auto" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">One Quick Setup</h1>
            <p className="text-gray-500 mb-2">
              To run AI models on your Mac, we need Ollama — a lightweight tool that runs entirely on your device.
            </p>
            <p className="text-sm text-gray-400 mb-8">Your data stays on your Mac. Nothing is sent to the cloud.</p>
            <a
              href="https://ollama.com/download"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-3 font-medium text-white hover:bg-gray-800 transition-colors"
            >
              Download Ollama
              <ExternalLink className="h-4 w-4" />
            </a>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Waiting for Ollama to be installed...
            </div>
          </motion.div>
        )}

        {/* Welcome / Start Scan */}
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-lg w-full text-center"
          >
            <div className="mb-6">
              <Cpu className="h-16 w-16 text-gray-400 mx-auto" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Let's find the perfect AI model for your Mac
            </h1>
            <p className="text-gray-500 mb-8">
              We'll check your CPU, memory, and GPU to find models that run best on your device
            </p>
            {error && (
              <p className="mb-4 text-sm text-red-500">{error}</p>
            )}
            <button
              onClick={() => {
                if (ollamaStatus === 'not-installed') {
                  setStep('setup-ollama')
                } else if (ollamaStatus === 'installed-not-running') {
                  window.orbit.startOllama().then((started) => {
                    if (started) {
                      onSetOllamaStatus('running')
                      runScan()
                    } else {
                      setStep('setup-ollama')
                    }
                  })
                } else {
                  runScan()
                }
              }}
              className="cursor-pointer rounded-xl bg-gray-900 px-8 py-3 font-medium text-white hover:bg-gray-800 transition-colors"
            >
              Scan My Hardware
            </button>
          </motion.div>
        )}

        {/* Scanning */}
        {step === 'scanning' && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            <div className="relative mb-6 flex items-center justify-center">
              <Cpu className="relative z-10 h-16 w-16 text-indigo-600" />
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border-2 border-indigo-300/40"
                  style={{ width: 80, height: 80 }}
                  animate={{ scale: [0.8, 2], opacity: [1, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.5, ease: 'easeOut' }}
                />
              ))}
            </div>
            <p className="text-lg text-gray-600">Scanning your hardware...</p>
            <p className="mt-3 text-lg font-mono font-semibold text-indigo-600">{Math.round(scanProgress)}%</p>
          </motion.div>
        )}

        {/* Results */}
        {step === 'results' && systemProfile && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-lg w-full"
          >
            <div className="mb-6 flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">Your System</h1>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                <Check className="h-4 w-4 text-green-600" />
              </span>
            </div>
            <div className="space-y-3 mb-8">
              <HardwareRow label="CPU" value={systemProfile.cpu_name} cores={systemProfile.cpu_cores} />
              <HardwareRow label="Memory" value={`${systemProfile.total_ram_gb} GB${systemProfile.unified_memory ? ' Unified' : ''}`} />
              {systemProfile.has_gpu && systemProfile.gpu_name && (
                <HardwareRow label="GPU" value={systemProfile.gpu_name} />
              )}
            </div>
            <p className="text-gray-500 mb-6">
              {systemProfile.total_ram_gb >= 32
                ? "Great setup — you can run large models with ease"
                : systemProfile.total_ram_gb >= 16
                  ? "Solid setup — great for running mid-size models"
                  : "You can run smaller, efficient models comfortably"}
            </p>
            <button
              onClick={fetchRecommendations}
              className="cursor-pointer w-full rounded-xl bg-gray-900 px-8 py-3 font-medium text-white hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              Show Recommended Models
              <ChevronRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {/* Recommendations */}
        {step === 'recommendations' && (
          <motion.div
            key="recommendations"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl w-full"
          >
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Recommended for You</h1>
            <p className="text-gray-500 mb-6">Based on your hardware, these models will run best</p>
            <div className="space-y-4 mb-6">
              {topModels.map((model, i) => (
                <ModelRecommendationCard
                  key={model.name}
                  model={model}
                  rank={i + 1}
                  onDownload={() => handleDownload(model.name)}
                />
              ))}
            </div>
            {remainingModels.length > 0 && (
              <div>
                <button
                  onClick={() => setShowAllModels(!showAllModels)}
                  className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-4"
                >
                  {showAllModels ? 'Show less' : `Show ${remainingModels.length} more models`}
                </button>
                {showAllModels && (
                  <div className="space-y-4">
                    {remainingModels.map((model, i) => (
                      <ModelRecommendationCard
                        key={model.name}
                        model={model}
                        rank={i + 4}
                        onDownload={() => handleDownload(model.name)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Downloading */}
        {step === 'downloading' && selectedModelName && (
          <motion.div
            key="downloading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-lg w-full text-center"
          >
            <Download className="h-16 w-16 text-indigo-600 mx-auto mb-6" />
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Downloading {selectedModelName}</h1>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
              <motion.div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${downloadProgress[selectedModelName] ?? 0}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-sm text-gray-500">
              {Math.round(downloadProgress[selectedModelName] ?? 0)}% complete
            </p>
          </motion.div>
        )}

        {/* Complete */}
        {step === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-lg w-full text-center"
          >
            <div className="mb-6">
              <Check className="h-16 w-16 text-green-500 mx-auto" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">You're All Set!</h1>
            <p className="text-gray-500 mb-8">
              {selectedModelName} is ready to use. Start chatting with your local AI.
            </p>
            <button
              onClick={onComplete}
              className="cursor-pointer rounded-xl bg-gray-900 px-8 py-3 font-medium text-white hover:bg-gray-800 transition-colors"
            >
              Start Chatting
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function HardwareRow({ label, value, cores }: { label: string; value: string; cores?: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 px-5 py-3.5">
      <span className="text-sm uppercase tracking-wider text-gray-400">{label}</span>
      <span className="font-mono font-medium text-gray-900">
        {value}{cores ? ` (${cores}-core)` : ''}
      </span>
    </div>
  )
}

function ModelRecommendationCard({
  model,
  rank,
  onDownload,
}: {
  model: ScoredModel
  rank: number
  onDownload: () => void
}) {
  const fitColors = {
    perfect: 'bg-green-50 text-green-700',
    good: 'bg-blue-50 text-blue-700',
    marginal: 'bg-yellow-50 text-yellow-700',
    too_tight: 'bg-red-50 text-red-700',
  }

  const fitLabels = {
    perfect: 'Perfect fit',
    good: 'Good fit',
    marginal: 'Tight fit',
    too_tight: 'Won\'t fit',
  }

  const paramLabel = model.parameter_count >= 1e9
    ? `${(model.parameter_count / 1e9).toFixed(0)}B`
    : `${(model.parameter_count / 1e6).toFixed(0)}M`

  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
              {rank}
            </span>
            <h3 className="text-lg font-semibold text-gray-900">{model.name.split('/').pop()}</h3>
            <span className="text-sm text-gray-400">{paramLabel}</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${fitColors[model.fit_level]}`}>
              {fitLabels[model.fit_level]}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
              ~{Math.round(model.estimated_tps)} words/sec
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
              {model.memory_required_gb.toFixed(1)} GB
            </span>
          </div>
          <p className="text-sm text-gray-500">by {model.provider}</p>
        </div>
        {model.fit_level !== 'too_tight' && (
          <button
            onClick={onDownload}
            className="cursor-pointer shrink-0 flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:border-gray-400 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/screens/Onboarding.tsx
git commit -m "feat: add onboarding wizard screen with hardware scan, model recommendations, and download"
```

---

### Task 7: Rewrite HardwareAudit Screen with Real LLMFit Data

**Files:**
- Modify: `src/screens/HardwareAudit.tsx` (full rewrite)

**Step 1: Rewrite HardwareAudit to use real data**

Replace the entire file to use `SystemProfile` and `ScoredModel` from state instead of mock data. Keep the scan animation but wire it to `window.orbit.scanHardware()`. Show real hardware specs and LLMFit fit scores for models. Add a "Re-scan" button. See design doc for details.

The new props interface:

```typescript
type HardwareAuditProps = {
  systemProfile: SystemProfile | null
  scoredModels: ScoredModel[]
  onNavigateToModels: () => void
  onSetSystemProfile: (profile: SystemProfile) => void
  onSetScoredModels: (models: ScoredModel[]) => void
}
```

It should:
- If `systemProfile` is null, show the scan button (calls `window.orbit.scanHardware()`)
- If `systemProfile` exists, show real hardware specs and scored model compatibility
- Add "Re-scan Hardware" button in the results view
- Use the same visual style as the current screen (icons, animations, layout)

**Step 2: Commit**

```bash
git add src/screens/HardwareAudit.tsx
git commit -m "feat: rewrite HardwareAudit screen to use real LLMFit hardware data"
```

---

### Task 8: Rewrite ModelLibrary Screen with Real Data

**Files:**
- Modify: `src/screens/ModelLibrary.tsx` (rewrite to use scored models)
- Modify: `src/components/ModelCard.tsx` (update props for ScoredModel)

**Step 1: Update ModelLibrary to use ScoredModel**

Change props to accept `ScoredModel[]` and `OllamaModel[]` instead of the mock `Model[]`. Show LLMFit fit scores, estimated speed, and memory requirements. Download button calls real `onDownload(modelName)` which triggers Ollama pull.

New props:

```typescript
type ModelLibraryProps = {
  scoredModels: ScoredModel[]
  installedModels: OllamaModel[]
  downloadProgress: Record<string, number>
  onDownload: (modelName: string) => void
}
```

**Step 2: Update ModelCard to display ScoredModel data**

Show fit level badge, estimated tokens/sec, memory requirement, provider name instead of the mock compatibility badge.

**Step 3: Commit**

```bash
git add src/screens/ModelLibrary.tsx src/components/ModelCard.tsx
git commit -m "feat: rewrite ModelLibrary and ModelCard to use real LLMFit scored models"
```

---

### Task 9: Wire Everything Together in App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add onboarding flow to App.tsx**

Import the new `Onboarding` screen. Add logic:
- On mount, call `runPreScan()` from `useAppState`
- If `isPreScanning`, show a loading splash
- If `!onboardingComplete`, render `<Onboarding />` instead of the main app
- When onboarding completes, set `onboardingComplete = true` and navigate to `'welcome'`

**Step 2: Update HardwareAudit and ModelLibrary props**

Pass the new real-data props to `HardwareAudit` and `ModelLibrary` in `renderScreen()`:

```typescript
case 'hardware':
  return (
    <HardwareAudit
      systemProfile={systemProfile}
      scoredModels={scoredModels}
      onNavigateToModels={() => navigateTo('models')}
      onSetSystemProfile={setSystemProfile}
      onSetScoredModels={setScoredModels}
    />
  )
case 'models':
  return (
    <ModelLibrary
      scoredModels={scoredModels}
      installedModels={installedModels}
      downloadProgress={downloadProgress}
      onDownload={startModelDownload}
    />
  )
```

**Step 3: Add model loading indicator to Chat screen**

Pass `isModelLoading` to the Chat component. When true, show "Loading model into memory..." before the streaming response begins.

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire onboarding, real hardware audit, and model library into App.tsx"
```

---

### Task 10: Update Electron Build Config for LLMFit Binary

**Files:**
- Modify: `package.json` (add extraResources for LLMFit binary)

**Step 1: Add extraResources to electron-builder config**

In the `"build"` section of `package.json`, add:

```json
"extraResources": [
  {
    "from": "resources/bin/",
    "to": "bin/",
    "filter": ["**/*"]
  }
]
```

**Step 2: Create resources directory structure**

```bash
mkdir -p resources/bin
```

Add a README to `resources/bin/README.md` explaining that the `llmfit` binary should be placed here for production builds.

**Step 3: Commit**

```bash
git add package.json resources/bin/README.md
git commit -m "feat: configure electron-builder to bundle LLMFit binary in resources"
```

---

### Task 11: Compile Electron Files and Smoke Test

**Files:**
- Modify: `electron/main.ts` → compile to `electron/main.cjs`
- Modify: `electron/preload.ts` → compile to `electron/preload.cjs`

**Step 1: Compile the Electron TypeScript files**

The project compiles Electron TS files to CJS manually. After all changes, recompile:

```bash
cd orbit
npx tsc electron/main.ts --outDir electron --module commonjs --target ES2022 --esModuleInterop --skipLibCheck
npx tsc electron/preload.ts --outDir electron --module commonjs --target ES2022 --esModuleInterop --skipLibCheck
```

(Or use whatever compilation method the project currently uses — check if there's a build script.)

**Step 2: Run the dev server and verify no TypeScript errors**

```bash
cd orbit
npm run build
```

Fix any type errors.

**Step 3: Run the app**

```bash
cd orbit
npm run dev:electron
```

Verify:
- App launches without errors
- Pre-scan runs (check console for Ollama detection)
- If Ollama is installed, the power-user path shows
- With `ORBIT_FRESH=true`, the brand-new wizard path shows

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve compilation and runtime issues from integration"
```

---

### Task 12: Clean Up Mock Data

**Files:**
- Modify: `src/data/mock.ts` (remove hardware and model mock data that's been replaced)

**Step 1: Remove replaced mock data**

Remove from `mock.ts`:
- `hardwareSpecs` array (line 273-278) — replaced by real LLMFit data
- `models` array (lines 46-108) — replaced by real LLMFit scored models
- `aiResponses` array (lines 286-290) — keep this as fallback when Ollama isn't running
- Keep `conversations`, `mcpTools`, `suggestions` — these are still used

Keep the type exports (`Model`, `Message`, `Conversation`, `MCPTool`) as they're still referenced.

**Step 2: Commit**

```bash
git add src/data/mock.ts
git commit -m "chore: remove mock hardware and model data replaced by real LLMFit integration"
```
