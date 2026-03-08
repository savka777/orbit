import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('orbit', {
  platform: process.platform,
})
