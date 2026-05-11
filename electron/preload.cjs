const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("krilixDesktop", {
  isDesktop: true,
  platform: process.platform,
  getState: () => ipcRenderer.invoke("krilix:getDesktopState"),
  setState: (patch) => ipcRenderer.invoke("krilix:setDesktopState", patch),
  notify: (payload) => ipcRenderer.invoke("krilix:showNotification", payload),
  checkForUpdates: () => ipcRenderer.invoke("krilix:checkForUpdates"),
  downloadUpdate: () => ipcRenderer.invoke("krilix:downloadUpdate"),
  quitAndInstall: () => ipcRenderer.invoke("krilix:quitAndInstall"),
  onUpdateState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("krilix:updateState", listener);
    return () => ipcRenderer.removeListener("krilix:updateState", listener);
  },
  restart: () => ipcRenderer.invoke("krilix:restart"),
  quit: () => ipcRenderer.invoke("krilix:quit"),
});
