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
    exec('open -a Ollama', (error) => {
      if (error) { resolve(false); return }
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
    })
  })
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

function streamChat(model, messages, win, conversationId) {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/chat', OLLAMA_HOST)
    const body = JSON.stringify({ model, messages, stream: true })
    const options = {
      hostname: url.hostname, port: url.port, path: url.pathname, method: 'POST',
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
