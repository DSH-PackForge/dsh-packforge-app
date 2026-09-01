// Electron 主进程（ESM，Electron >= 28）。
// 职责：注册 IPC，把渲染进程的调用转发给 `@dsh-packforge/core` + NodeHost。
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { NodeHost } = await import('@dsh-packforge/host-node');
const core = await import('@dsh-packforge/core');
const host = new NodeHost();

/** 解析市场索引：环境变量优先，其次随包内置 / 同级 dsh-pack-market 仓库。 */
function resolveMarketIndex() {
  if (process.env.DSHPACK_MARKET_INDEX) return process.env.DSHPACK_MARKET_INDEX;
  const candidates = [
    path.join(__dirname, '..', 'market', 'index.json'),                                   // packages/gui/market/index.json
    path.join(__dirname, '..', '..', 'market', 'index.json'),                             // dsh-packforge-app/market/index.json
    path.join(__dirname, '..', '..', '..', '..', 'dsh-pack-market', 'index', 'index.json'), // 同级仓库 dsh-pack-market
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return '';
}

const MARKET_INDEX = resolveMarketIndex();

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
    if (!MARKET_INDEX) return { schemaVersion: 1, generatedAt: null, packs: [], error: '未找到市场索引（未设置 DSHPACK_MARKET_INDEX，且未发现 market/index.json）' };
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