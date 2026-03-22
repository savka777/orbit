const { app, BrowserWindow, shell, ipcMain } = require('electron')
const path = require('path')
const { exec, spawn } = require('child_process')
const http = require('http')
const net = require('net')

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

// ─── LLMFit ────────────────────────────────────────────────

let llmfitProcess = null
let currentPort = null
let startupPromise = null

function findAvailablePort() {
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

function getLLMFitPath() {
  if (isDev) return process.env.LLMFIT_PATH || 'llmfit'
  return path.join(process.resourcesPath, 'bin', 'llmfit')
}

function httpGet(port, requestPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path: requestPath, method: 'GET' },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => resolve(data))
      }
    )
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('LLMFit request timed out')) })
    req.end()
  })
}

async function waitForServer(port, maxAttempts = 20) {
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

async function startLLMFit() {
  if (llmfitProcess && currentPort) return currentPort
  if (startupPromise) return startupPromise

  startupPromise = (async () => {
    const port = await findAvailablePort()
    const llmfitPath = getLLMFitPath()
    llmfitProcess = spawn(llmfitPath, ['serve', '--port', String(port)], { stdio: 'ignore' })
    llmfitProcess.on('exit', () => { llmfitProcess = null; currentPort = null })
    await waitForServer(port)
    currentPort = port
    return port
  })().finally(() => { startupPromise = null })

  return startupPromise
}

function stopLLMFit() {
  if (llmfitProcess) {
    llmfitProcess.kill()
    llmfitProcess = null
    currentPort = null
  }
}

async function scanHardware() {
  const port = await startLLMFit()
  const response = await httpGet(port, '/api/system')
  return JSON.parse(response)
}

async function recommendModels() {
  const port = await startLLMFit()
  const response = await httpGet(port, '/api/fit')
  return JSON.parse(response)
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

app.on('before-quit', () => { stopLLMFit() })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
