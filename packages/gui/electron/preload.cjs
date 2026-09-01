// Preload（CommonJS，contextIsolation 下经 contextBridge 暴露 dsh 桥）。
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('packforge', {
  selectFile: (filters) => ipcRenderer.invoke('dialog:selectFile', filters),
  selectDir: () => ipcRenderer.invoke('dialog:selectDir'),
  viewPack: (p) => ipcRenderer.invoke('pack:view', p),
  listProfiles: () => ipcRenderer.invoke('profiles:list'),
  inspectProfile: (opts) => ipcRenderer.invoke('profiles:inspect', opts),
  listDshVersions: () => ipcRenderer.invoke('dsh:versions'),
  exportPack: (opts) => ipcRenderer.invoke('profiles:export', opts),
  installPack: (opts) => ipcRenderer.invoke('pack:install', opts),
  marketList: () => ipcRenderer.invoke('market:list'),
});