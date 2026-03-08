const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('orbit', {
  platform: process.platform,
})
