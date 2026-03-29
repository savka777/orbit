import { exec } from 'child_process'
import http from 'http'
import { BrowserWindow } from 'electron'
import { webSearch, formatSearchResults } from './search'

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

const TOOL_SYSTEM_PROMPT = `You have access to a web search tool. Rules:

1. For questions about current events, weather, news, prices, or real-time data: search first by outputting <search>query</search> as the FIRST thing in your response, with no text before it.
2. After receiving search results, answer using ONLY the information from the results. Be concise.
3. For follow-up questions or clarifications about something you already answered, use the conversation history. Do NOT search again unless the user asks about something new.
4. For general knowledge questions, answer normally without searching.
5. Never say "I don't have access to real-time data" — you DO, via the search tool.
6. Never recommend the user visit websites — just answer their question directly.`

function streamOnce(
  model: string,
  messages: Array<{ role: string; content: string }>,
  win: BrowserWindow,
  conversationId: string
): Promise<string> {
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

    let fullContent = ''
    const req = http.request(options, (res) => {
      res.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean)
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line)
            fullContent += parsed.message?.content || ''
            win.webContents.send('ollama:chat-chunk', { conversationId, chunk: parsed })
          } catch { /* skip */ }
        }
      })
      res.on('end', () => resolve(fullContent))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function extractSearchQueries(text: string): string[] {
  const matches = text.matchAll(/<search>([\s\S]*?)<\/search>/g)
  return [...matches].map(m => m[1].trim())
}

export async function streamChat(
  model: string,
  messages: Array<{ role: string; content: string }>,
  win: BrowserWindow,
  conversationId: string
): Promise<void> {
  // Inject tool system prompt
  const messagesWithSystem: Array<{ role: string; content: string }> = [
    { role: 'system', content: TOOL_SYSTEM_PROMPT },
    ...messages,
  ]

  // Tool-calling loop (max 3 rounds to prevent infinite loops)
  let currentMessages = messagesWithSystem
  for (let round = 0; round < 3; round++) {
    const response = await streamOnce(model, currentMessages, win, conversationId)

    const queries = extractSearchQueries(response)
    if (queries.length === 0) break // No tool calls — done

    // Execute searches
    const searchResults: string[] = []
    for (const query of queries) {
      try {
        const results = await webSearch(query)
        searchResults.push(`Search results for "${query}":\n${formatSearchResults(results)}`)
      } catch {
        searchResults.push(`Search for "${query}" failed. Please try answering without search results.`)
      }
    }

    // Send a "searching..." indicator to the renderer
    win.webContents.send('ollama:chat-chunk', {
      conversationId,
      chunk: { message: { content: '\n\n*Searching the web...*\n\n' }, done: false },
    })

    // Add the assistant response + search results to context, ask model to continue
    currentMessages = [
      ...currentMessages,
      { role: 'assistant', content: response },
      { role: 'user', content: searchResults.join('\n\n') + '\n\nNow answer the original question using the search results above.' },
    ]
  }

  win.webContents.send('ollama:chat-done', { conversationId })
}
