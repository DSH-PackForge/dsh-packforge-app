// Electron 主进程（ESM，Electron >= 28）。
// 职责：注册 IPC，把渲染进程的调用转发给 `@dsh-packforge/core` + NodeHost。
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { NodeHost } = await import('@dsh-packforge/host-node');
const core = await import('@dsh-packforge/core');
const host = new NodeHost();

/** 市场索引源：环境变量优先，默认从官方 GitHub Pages 站点（core.DEFAULT_MARKET_INDEX）拉取。 */
const MARKET_INDEX = process.env.DSHPACK_MARKET_INDEX || core.DEFAULT_MARKET_INDEX;

function registerIpc() {
  ipcMain.handle('dialog:selectFile', async (_e, filters) => {
    const opts = { properties: ['openFile'] };
    if (Array.isArray(filters) && filters.length) opts.filters = filters;
    const r = await dialog.showOpenDialog(opts);
    return r.canceled ? null : r.filePaths[0] ?? null;
  });

  ipcMain.handle('dialog:selectDir', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
    return r.canceled ? null : r.filePaths[0] ?? null;
  });

  ipcMain.handle('pack:view', (_e, p) => core.inspectPack(host, p));
  ipcMain.handle('profiles:list', () => core.discoverProfiles(host));
  ipcMain.handle('profiles:export', (_e, opts) => core.packProfile(host, opts.profile, opts));
  ipcMain.handle('profiles:exportRepo', (_e, opts) => core.exportRepo(host, opts.profile, opts));
  ipcMain.handle('profiles:inspect', (_e, opts) => core.inspectProfile(host, opts.profile, opts));
  ipcMain.handle('dsh:versions', () => core.listInstalledDshVersions(host));
  ipcMain.handle('pack:install', (_e, opts) => core.installPack(host, opts));

  ipcMain.handle('market:list', async () => {
    try {
      return await core.readMarketIndex(host, MARKET_INDEX);
    } catch (e) {
      return { schemaVersion: 1, generatedAt: null, packs: [], error: e.message };
    }
  });
}

app.whenReady().then(() => {
  registerIpc();
  const win = new BrowserWindow({
    width: 1120,
    height: 760,
    title: 'DSH PackForge',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});