import { app, BrowserWindow, shell, ipcMain } from 'electron'
import path from 'path'
import { checkOllamaStatus, listOllamaModels, startOllama, pullModel, streamChat } from './ollama'

const isDev = !app.isPackaged

const devOverrides = {
  skipOllama: process.env.ORBIT_SKIP_OLLAMA === 'true',
  skipModels: process.env.ORBIT_SKIP_MODELS === 'true',
  fresh: process.env.ORBIT_FRESH === 'true',
}

let mainWindow: BrowserWindow | null = null

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
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Show window when content is ready to avoid visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

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

  ipcMain.handle('ollama:pull-model', (_event, modelName: string) => {
    if (mainWindow) return pullModel(modelName, mainWindow)
  })

  ipcMain.handle('ollama:chat', (_event, { model, messages, conversationId }) => {
    if (mainWindow) return streamChat(model, messages, mainWindow, conversationId)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
