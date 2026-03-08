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
