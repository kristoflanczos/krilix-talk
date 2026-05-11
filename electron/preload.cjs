const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("krilixDesktop", {
  isDesktop: true,
  platform: process.platform,
  getState: () => ipcRenderer.invoke("krilix:getDesktopState"),
  setState: (patch) => ipcRenderer.invoke("krilix:setDesktopState", patch),
  notify: (payload) => ipcRenderer.invoke("krilix:showNotification", payload),
  restart: () => ipcRenderer.invoke("krilix:restart"),
  quit: () => ipcRenderer.invoke("krilix:quit"),
});
