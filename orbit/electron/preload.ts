import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('orbit', {
  platform: process.platform,

  // Ollama
  checkOllamaStatus: () => ipcRenderer.invoke('ollama:check-status'),
  listOllamaModels: () => ipcRenderer.invoke('ollama:list-models'),
  startOllama: () => ipcRenderer.invoke('ollama:start'),
  pullModel: (modelName: string) => ipcRenderer.invoke('ollama:pull-model', modelName),
  deleteModel: (modelName: string) => ipcRenderer.invoke('ollama:delete-model', modelName),
  chat: (model: string, messages: Array<{ role: string; content: string }>, conversationId: string) =>
    ipcRenderer.invoke('ollama:chat', { model, messages, conversationId }),

  // Event listeners for streaming
  onPullProgress: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('ollama:pull-progress', handler)
    return () => { ipcRenderer.removeListener('ollama:pull-progress', handler) }
  },
  onChatChunk: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('ollama:chat-chunk', handler)
    return () => { ipcRenderer.removeListener('ollama:chat-chunk', handler) }
  },
  onChatDone: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('ollama:chat-done', handler)
    return () => { ipcRenderer.removeListener('ollama:chat-done', handler) }
  },

  // LLMFit
  scanHardware: () => ipcRenderer.invoke('llmfit:scan-hardware'),
  recommendModels: () => ipcRenderer.invoke('llmfit:recommend-models'),
})
