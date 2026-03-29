const { app, BrowserWindow, shell, ipcMain } = require('electron')
const path = require('path')
const { exec, execFile } = require('child_process')
const http = require('http')

const isDev = !app.isPackaged

const devOverrides = {
  skipOllama: process.env.ORBIT_SKIP_OLLAMA === 'true',
  skipModels: process.env.ORBIT_SKIP_MODELS === 'true',
  fresh: process.env.ORBIT_FRESH === 'true',
}

let mainWindow = null

// ─── Ollama ────────────────────────────────────────────────

const OLLAMA_HOST = 'http://127.0.0.1:11434'

function httpRequest(method, reqPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, OLLAMA_HOST)
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

async function checkOllamaStatus() {
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

async function listOllamaModels() {
  const response = await httpRequest('GET', '/api/tags')
  return JSON.parse(response)
}

function startOllama() {
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
          if (attempts > 15) { clearInterval(poll); resolve(false) }
        }
      }, 1000)
    }

    exec('open -a Ollama', (error) => {
      if (!error) { pollUntilReady(); return }
      const child = exec('ollama serve', () => {})
      if (child.unref) child.unref()
      setTimeout(pollUntilReady, 500)
    })
  })
}

async function deleteModel(modelName) {
  await httpRequest('DELETE', '/api/delete', JSON.stringify({ name: modelName }))
}

function pullModel(modelName, win) {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/pull', OLLAMA_HOST)
    const body = JSON.stringify({ name: modelName, stream: true })
    const options = {
      hostname: url.hostname, port: url.port, path: url.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
    const req = http.request(options, (res) => {
      res.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean)
        for (const line of lines) {
          try {
            const progress = JSON.parse(line)
            win.webContents.send('ollama:pull-progress', { modelName, progress })
          } catch { /* skip */ }
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

const TOOL_SYSTEM_PROMPT = `You have access to a web search tool for finding current information.

When you need to look up current events, weather, prices, news, or any real-time information, use:
<search>your search query</search>

Wait for the search results before continuing your response. You can use multiple searches if needed.

If you don't need to search, just respond normally.`

function fetchUrl(url) {
  const https = require('https')
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 8000,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchUrl(res.headers.location).then(resolve).catch(reject)
        return
      }
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve(data))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
  })
}

async function webSearch(query, maxResults = 5) {
  const encoded = encodeURIComponent(query)
  const html = await fetchUrl(`https://html.duckduckgo.com/html/?q=${encoded}`)
  const results = []
  const blocks = html.split('class="result__body"')
  for (let i = 1; i < blocks.length && results.length < maxResults; i++) {
    const block = blocks[i]
    const titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/)
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\//)
    if (titleMatch) {
      const title = titleMatch[1].replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').trim()
      const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').trim() : ''
      results.push({ title, snippet })
    }
  }
  return results
}

function formatSearchResults(results) {
  if (results.length === 0) return 'No search results found.'
  return results.map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}`).join('\n\n')
}

function extractSearchQueries(text) {
  const matches = [...text.matchAll(/<search>([\s\S]*?)<\/search>/g)]
  return matches.map(m => m[1].trim())
}

function streamOnce(model, messages, win, conversationId) {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/chat', OLLAMA_HOST)
    const body = JSON.stringify({ model, messages, stream: true })
    const options = {
      hostname: url.hostname, port: url.port, path: url.pathname, method: 'POST',
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

async function streamChat(model, messages, win, conversationId) {
  const messagesWithSystem = [
    { role: 'system', content: TOOL_SYSTEM_PROMPT },
    ...messages,
  ]

  let currentMessages = messagesWithSystem
  for (let round = 0; round < 3; round++) {
    const response = await streamOnce(model, currentMessages, win, conversationId)
    const queries = extractSearchQueries(response)
    if (queries.length === 0) break

    const searchResults = []
    for (const query of queries) {
      try {
        const results = await webSearch(query)
        searchResults.push(`Search results for "${query}":\n${formatSearchResults(results)}`)
      } catch {
        searchResults.push(`Search for "${query}" failed. Please try answering without search results.`)
      }
    }

    win.webContents.send('ollama:chat-chunk', {
      conversationId,
      chunk: { message: { content: '\n\n*Searching the web...*\n\n' }, done: false },
    })

    currentMessages = [
      ...currentMessages,
      { role: 'assistant', content: response },
      { role: 'user', content: searchResults.join('\n\n') + '\n\nNow answer the original question using the search results above.' },
    ]
  }

  win.webContents.send('ollama:chat-done', { conversationId })
}

// ─── LLMFit (CLI-based) ────────────────────────────────────

function getLLMFitPath() {
  if (isDev) return process.env.LLMFIT_PATH || 'llmfit'
  return path.join(process.resourcesPath, 'bin', 'llmfit')
}

function runLLMFit(args) {
  return new Promise((resolve, reject) => {
    execFile(getLLMFitPath(), args, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) { reject(new Error(stderr || error.message)); return }
      resolve(stdout)
    })
  })
}

function parseSystemOutput(output) {
  const lines = output.split('\n')
  const system = {
    cpu_name: '', cpu_cores: 0, total_ram_gb: 0, available_ram_gb: 0,
    has_gpu: false, gpu_name: null, gpu_vram_gb: null, gpu_count: 0,
    unified_memory: false, backend: '',
  }
  for (const line of lines) {
    const t = line.trim()
    if (t.startsWith('CPU:')) {
      system.cpu_name = t.slice(4).trim()
      const m = t.match(/\((\d+)\s*cores?\)/)
      if (m) system.cpu_cores = parseInt(m[1], 10)
    } else if (t.startsWith('Total RAM:')) {
      const m = t.match(/([\d.]+)\s*GB/)
      if (m) system.total_ram_gb = parseFloat(m[1])
    } else if (t.startsWith('Available RAM:')) {
      const m = t.match(/([\d.]+)\s*GB/)
      if (m) system.available_ram_gb = parseFloat(m[1])
    } else if (t.startsWith('Backend:')) {
      system.backend = t.slice(8).trim()
    } else if (t.startsWith('GPU:')) {
      system.has_gpu = true; system.gpu_count = 1
      const gpuStr = t.slice(4).trim()
      system.gpu_name = gpuStr.split('(')[0].trim()
      if (gpuStr.includes('unified memory')) system.unified_memory = true
      const vm = gpuStr.match(/([\d.]+)\s*GB\s*shared/)
      if (vm) system.gpu_vram_gb = parseFloat(vm[1])
    }
  }
  return system
}

function parseFitOutput(output) {
  const system = parseSystemOutput(output)
  const models = []
  const lines = output.split('\n')
  for (const line of lines) {
    if (!line.includes('│') || line.includes('──') || line.includes('Status')) continue
    const cells = line.split('│').map(c => c.trim()).filter(Boolean)
    if (cells.length < 10) continue
    const statusRaw = cells[0]
    let fit_level = 'marginal'
    if (statusRaw.includes('Perfect')) fit_level = 'perfect'
    else if (statusRaw.includes('Good')) fit_level = 'good'
    else if (statusRaw.includes('Marginal')) fit_level = 'marginal'
    else if (statusRaw.includes('Too Tight') || statusRaw.includes('tight')) fit_level = 'too_tight'
    const score = parseInt(cells[4], 10) || 0
    const tps = parseFloat(cells[5]) || 0
    const memPct = parseFloat(cells[9]) || 0
    const paramMatch = cells[3].match(/([\d.]+)B/)
    const ctxMatch = (cells[10] || '4k').match(/([\d.]+)k/)
    models.push({
      name: cells[1], provider: cells[2],
      parameter_count: paramMatch ? parseFloat(paramMatch[1]) * 1e9 : 0,
      fit_level, run_mode: cells[8].toLowerCase(), score,
      score_components: { quality: score/100, speed: tps/100, fit: (100-memPct)/100, context: 0.5 },
      estimated_tps: tps, best_quant: cells[6],
      memory_required_gb: parseFloat((system.total_ram_gb * memPct / 100).toFixed(1)),
      memory_available_gb: system.available_ram_gb, utilization_pct: memPct,
      context_length: ctxMatch ? parseFloat(ctxMatch[1]) * 1024 : 4096,
      gguf_sources: [],
    })
  }
  return { system, models }
}

async function scanHardware() {
  const output = await runLLMFit(['system'])
  return { system: parseSystemOutput(output) }
}

async function recommendModels() {
  const output = await runLLMFit(['fit'])
  return parseFitOutput(output)
}

// ─── Window ────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'Orbit',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#FFFFFF',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.once('ready-to-show', () => { mainWindow?.show() })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  mainWindow.on('closed', () => { mainWindow = null })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// ─── App lifecycle ─────────────────────────────────────────

app.whenReady().then(() => {
  createWindow()

  // Ollama IPC handlers
  ipcMain.handle('ollama:check-status', () => {
    if (devOverrides.fresh || devOverrides.skipOllama) return 'not-installed'
    return checkOllamaStatus()
  })
  ipcMain.handle('ollama:list-models', async () => {
    if (devOverrides.fresh || devOverrides.skipModels) return { models: [] }
    return listOllamaModels()
  })
  ipcMain.handle('ollama:start', () => startOllama())
  ipcMain.handle('ollama:pull-model', (_event, modelName) => {
    if (mainWindow) return pullModel(modelName, mainWindow)
  })
  ipcMain.handle('ollama:delete-model', (_event, modelName) => deleteModel(modelName))
  ipcMain.handle('ollama:chat', (_event, { model, messages, conversationId }) => {
    if (mainWindow) return streamChat(model, messages, mainWindow, conversationId)
  })

  // LLMFit IPC handlers
  ipcMain.handle('llmfit:scan-hardware', () => scanHardware())
  ipcMain.handle('llmfit:recommend-models', () => recommendModels())
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
