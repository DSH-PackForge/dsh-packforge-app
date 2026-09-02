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
  exportRepo: (opts) => ipcRenderer.invoke('profiles:exportRepo', opts),
  listHomes: () => ipcRenderer.invoke('home:list'),
  inspectHome: (opts) => ipcRenderer.invoke('home:inspect', opts),
  exportHome: (opts) => ipcRenderer.invoke('home:export', opts),
  defaultDirs: () => ipcRenderer.invoke('host:defaultDirs'),
  installPack: (opts) => ipcRenderer.invoke('pack:install', opts),
  onInstallProgress: (cb) => ipcRenderer.on('pack:install-progress', (_e, p) => cb(p)),
  marketList: (source) => ipcRenderer.invoke('market:list', source),
  onProtocolUrl: (cb) => ipcRenderer.on('protocol-url', (_e, url) => cb(url)),
});