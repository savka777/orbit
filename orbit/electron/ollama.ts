import { exec } from 'child_process'
import http from 'http'
import { BrowserWindow } from 'electron'

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
  // Try the macOS app first, then fall back to `ollama serve` (Homebrew install)
  return new Promise((resolve) => {
    function pollUntilReady() {
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        try {
          await httpRequest('GET', '/api/tags')
          clearInterval(poll)
          resolve(true)
        } catch {
          if (attempts > 15) {
            clearInterval(poll)
            resolve(false)
          }
        }
      }, 1000)
    }

    exec('open -a Ollama', (error) => {
      if (!error) {
        pollUntilReady()
        return
      }
      // macOS app not found — try ollama serve (Homebrew / CLI install)
      const child = exec('ollama serve', () => {})
      child.unref?.()
      // Give the server a moment to start, then poll
      setTimeout(pollUntilReady, 500)
    })
  })
}

export async function deleteModel(modelName: string): Promise<void> {
  await httpRequest('DELETE', '/api/delete', JSON.stringify({ name: modelName }))
}

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
