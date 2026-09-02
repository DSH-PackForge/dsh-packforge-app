// Electron 主进程（ESM，Electron >= 28）。
// 职责：注册 IPC；注册 dspack:// URL 协议实现「链接一键导入」；把渲染进程调用转发给 core + NodeHost。
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { NodeHost } = await import('@dsh-packforge/host-node');
const core = await import('@dsh-packforge/core');
const host = new NodeHost();

/** 市场索引源：环境变量优先，默认从官方 GitHub Pages 站点（core.DEFAULT_MARKET_INDEX）拉取。 */
const MARKET_INDEX = process.env.DSHPACK_MARKET_INDEX || core.DEFAULT_MARKET_INDEX;

const PROTOCOL = 'dspack';
let win = null;
let pendingDspack = null;

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

  ipcMain.handle('pack:view', async (_e, p) => {
    if (/^https?:\/\//i.test(p)) {
      const { path, tempDir } = await core.resolvePackSource(host, p);
      try {
        return await core.inspectPack(host, path);
      } finally {
        if (tempDir) await host.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    }
    return core.inspectPack(host, p);
  });
  ipcMain.handle('profiles:list', () => core.discoverProfiles(host));
  ipcMain.handle('profiles:export', (_e, opts) => core.packProfile(host, opts.profile, opts));
  ipcMain.handle('profiles:exportRepo', (_e, opts) => core.exportRepo(host, opts.profile, opts));
  ipcMain.handle('profiles:inspect', (_e, opts) => core.inspectProfile(host, opts.profile, opts));
  ipcMain.handle('home:list', () => core.discoverHomes(host));
  ipcMain.handle('home:inspect', (_e, opts) => core.inspectHome(host, opts.home, opts));
  ipcMain.handle('host:defaultDirs', () => {
    const home = host.homedir();
    return {
      home,
      desktop: host.joinPath(home, 'Desktop'),
      downloads: host.joinPath(home, 'Downloads'),
    };
  });
  ipcMain.handle('cfg:load', async (_e, dir) => {
    const raw = await host.readTextFile(host.joinPath(dir, '.dshpkcfg'));
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  });
  ipcMain.handle('cfg:save', (_e, dir, config) => host.writeTextFile(host.joinPath(dir, '.dshpkcfg'), JSON.stringify(config, null, 2) + '\n'));
  ipcMain.handle('home:export', (_e, opts) => {
    // opts.home = { name, dir }；否则 opts.root = profiles 目录，向上推导 home。
    const dir = opts.home?.dir || (opts.root ? path.dirname(opts.root) : null);
    if (!dir) throw new Error('缺少 DSH_HOME 目录');
    const home = opts.home?.dir ? opts.home : { name: path.basename(dir), dir };
    return core.packHome(host, home, opts);
  });
  ipcMain.handle('dsh:versions', () => core.listInstalledDshVersions(host));
  ipcMain.handle('pack:install', (e, opts) =>
    core.installPack(host, {
      ...opts,
      onProgress: (stage, detail) => {
        if (!e.sender.isDestroyed()) e.sender.send('pack:install-progress', { stage, detail });
      },
    }),
  );

  ipcMain.handle('market:list', async (_e, source) => {
    const indexPath = source || MARKET_INDEX;
    try {
      const r = await core.readMarketIndex(host, indexPath);
      return { ...r, source: indexPath };
    } catch (e) {
      return { schemaVersion: 1, generatedAt: null, packs: [], error: e.message, source: indexPath };
    }
  });
}

/** 从 argv 里提取协议 URL，解析出要导入的目标 .dspack 地址。 */
function extractDspackUrl(argv) {
  for (const a of argv ?? []) {
    if (typeof a === 'string' && a.startsWith(`${PROTOCOL}://`)) {
      const t = parseDspackUrl(a);
      if (t) return t;
    }
  }
  return null;
}

/** 解析 dspack://install?url=<http(s)://…>（source 作为别名）。 */
function parseDspackUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== `${PROTOCOL}:`) return null;
    return u.searchParams.get('url') || u.searchParams.get('source') || null;
  } catch {
    return null;
  }
}

function sendProtocolUrl(target) {
  if (win && !win.isDestroyed()) {
    win.webContents.send('protocol-url', target);
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  } else {
    pendingDspack = target;
  }
}

/** Windows 材质：Win11 build ≥ 22621 才支持 Mica（系统背景染色模糊）。 */
function resolveWindowsMaterial() {
  if (process.platform !== 'win32') return 'off';
  const m = /^(\d+\.){2}(\d+)/.exec(os.release());
  const build = m ? Number(m[1]) : 0;
  return Number.isSafeInteger(build) && build >= 22621 ? 'mica' : 'off';
}

/**
 * 自定义标题栏 chrome（对齐 DSH Desktop）：
 * - Windows：titleBarStyle hidden + titleBarOverlay 保留原生窗口按钮，Mica 时透明底色透出材质。
 * - macOS：hiddenInset + 交通灯定位；transparent 时走系统 vibrancy 玻璃。
 * - 其它平台：返回默认原生边框。
 */
function windowChrome(platform, material) {
  if (platform === 'darwin') {
    return {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 16, y: 12 },
      ...(material === 'transparent'
        ? { transparent: true, backgroundColor: '#00000000', vibrancy: 'sidebar', visualEffectState: 'followWindow' }
        : {}),
    };
  }
  if (platform === 'win32') {
    return {
      autoHideMenuBar: true,
      titleBarStyle: 'hidden',
      titleBarOverlay: { color: '#00000000', symbolColor: '#7f858f', height: 36 },
      ...(material === 'mica' ? { backgroundColor: '#00000000', backgroundMaterial: 'mica' } : {}),
      hasShadow: true,
      roundedCorners: true,
      thickFrame: true,
    };
  }
  return {};
}

function createWindow() {
  const platform = process.platform;
  const material = platform === 'darwin' ? 'transparent' : resolveWindowsMaterial();
  win = new BrowserWindow({
    width: 1120,
    height: 760,
    title: 'DSH PackForge',
    ...windowChrome(platform, material),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'), {
    query: { material, version: app.getVersion() },
  });
  win.on('closed', () => { win = null; });
  win.webContents.on('did-finish-load', () => {
    if (pendingDspack) {
      win.webContents.send('protocol-url', pendingDspack);
      pendingDspack = null;
    }
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    const url = extractDspackUrl(argv);
    if (url) sendProtocolUrl(url);
  });

  // macOS：进程未运行时由系统唤起
  app.on('open-url', (_e, url) => {
    const target = parseDspackUrl(url);
    if (target) { if (win) sendProtocolUrl(target); else pendingDspack = target; }
  });

  app.whenReady().then(() => {
    registerIpc();
    app.setAsDefaultProtocolClient(PROTOCOL);
    pendingDspack = extractDspackUrl(process.argv);
    createWindow();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});