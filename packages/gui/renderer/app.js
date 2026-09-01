// 渲染进程逻辑（浏览器 ESM，仅依赖纯展示模块 format.js + Electron 桥 window.packforge）。
import { packViewHTML, marketCardHTML, exportPreviewHTML, exportResultHTML, exportRepoResultHTML } from '../src/format.js';

const bridge = window.packforge ?? null;
const $ = (id) => document.getElementById(id);

function setStatus(msg, kind = '') {
  const el = $('status');
  el.textContent = msg;
  el.className = `status ${kind}`;
}

function bindTabs() {
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.pane').forEach((p) => {
        p.hidden = p.id !== `pane-${btn.dataset.tab}`;
      });
    });
  });
}

/* ---- 市场浏览 ---- */
async function refreshMarket() {
  const out = $('market-out');
  out.innerHTML = '<p class="muted">加载中…</p>';
  const r = await bridge.marketList();
  if (!r.packs.length) {
    out.innerHTML = `<p class="muted">${r.error ? '索引读取失败：' + r.error : '无市场条目（可设置 DSHPACK_MARKET_INDEX 指向 index.json）'}</p>`;
    return;
  }
  out.innerHTML = r.packs.map((p) => marketCardHTML(p)).join('');
  setStatus(`市场共 ${r.packs.length} 个整合包`);
}

async function installFromMarket(btn) {
  const source = btn.dataset.url;
  if (!source) return setStatus('该条目无下载地址', 'err');
  setStatus('安装中：' + source, '');
  try {
    const r = await bridge.installPack({
      source,
      expectedSha256: btn.dataset.sha || undefined,
      expectedSize: btn.dataset.size ? Number(btn.dataset.size) : undefined,
    });
    setStatus(`已安装：${r.profileName} → ${r.dir}`, 'ok');
  } catch (e) {
    setStatus('安装失败：' + e.message, 'err');
  }
}

/* ---- 查看整合包 ---- */
async function openPackView() {
  const path = await bridge.selectFile([{ name: 'DSH 整合包', extensions: ['dspack'] }]);
  if (!path) return;
  $('view-path').textContent = path;
  try {
    $('view-out').innerHTML = packViewHTML(await bridge.viewPack(path));
    setStatus('已查看：' + path, 'ok');
  } catch (e) {
    $('view-out').innerHTML = `<p class="err">${escape(e.message)}</p>`;
    setStatus(e.message, 'err');
  }
}

/* ---- 导出 ---- */
let exportProfiles = [];

const profileLabel = (p) => `${p.name} · ${p.source === 'classic' ? '经典 ~/.dsh' : (p.home || '启动器')}`;

async function initExport() {
  try {
    const r = await bridge.listProfiles();
    exportProfiles = Array.isArray(r) ? r : (r?.profiles ?? []);
  } catch {
    exportProfiles = [];
  }

  const sel = $('export-profile');
  sel.innerHTML = exportProfiles.length
    ? exportProfiles.map((p) => `<option value="${escape(p.dir)}">${escape(profileLabel(p))}</option>`).join('')
    : '<option value="">（未发现 Profile）</option>';

  const vsel = $('export-dsh');
  let versions = [];
  try { versions = await bridge.listDshVersions(); } catch { /* 忽略 */ }
  vsel.innerHTML = '<option value="">自动（最新已装）</option>'
    + versions.map((v) => `<option value="${escape(v)}">${escape(v)}</option>`).join('');

  onModeChange();
}

function currentProfile() {
  const dir = $('export-profile').value;
  return exportProfiles.find((p) => p.dir === dir) ?? null;
}

function exportOpts() {
  return {
    displayName: $('export-display').value.trim() || undefined,
    dshVersion: $('export-dsh').value || undefined,
  };
}

function onModeChange() {
  const repo = $('export-mode').value === 'repo';
  $('export-content-field').hidden = !repo;
  $('export-go').textContent = repo ? '导出仓库' : '打包导出';
  updatePreview();
}

async function updatePreview() {
  const p = currentProfile();
  const box = $('export-preview');
  if (!p) {
    box.innerHTML = '<p class="muted">选择 Profile 后显示打包预览</p>';
    return;
  }
  box.innerHTML = '<p class="muted">扫描中…</p>';
  try {
    const ins = await bridge.inspectProfile({ profile: { name: p.name, dir: p.dir }, ...exportOpts() });
    box.innerHTML = exportPreviewHTML(ins);
  } catch (e) {
    box.innerHTML = `<p class="err">预览失败：${escape(e.message)}</p>`;
  }
}

async function doExport() {
  const p = currentProfile();
  if (!p) return setStatus('未选择 Profile', 'err');
  const btn = $('export-go');
  const busy = $('export-busy');
  const result = $('export-result');
  const repo = $('export-mode').value === 'repo';
  const out = $('export-out').value.trim() || undefined;
  btn.disabled = true;
  busy.hidden = false;
  busy.textContent = repo ? '正在导出仓库…' : '正在打包…';
  result.hidden = true;
  try {
    if (repo) {
      const r = await bridge.exportRepo({
        profile: { name: p.name, dir: p.dir },
        ...exportOpts(),
        content: $('export-content').value,
        out,
      });
      result.innerHTML = exportRepoResultHTML(r);
      result.className = 'result ok';
      setStatus(`仓库已导出：${r.dir}`, 'ok');
    } else {
      const r = await bridge.exportPack({
        profile: { name: p.name, dir: p.dir },
        ...exportOpts(),
        out,
      });
      result.innerHTML = exportResultHTML(r);
      result.className = 'result ok';
      setStatus(`导出完成：${r.output}`, 'ok');
    }
  } catch (e) {
    result.innerHTML = `<p class="err">✗ ${escape(e.message)}</p>`;
    result.className = 'result err';
    setStatus(e.message, 'err');
  } finally {
    result.hidden = false;
    btn.disabled = false;
    busy.hidden = true;
  }
}

/* ---- 导入 ---- */
async function doImport() {
  const source = $('import-source').value.trim();
  if (!source) return setStatus('请填写整合包路径或 URL', 'err');
  const opts = {
    source,
    name: $('import-name').value || undefined,
    profilesRoot: $('import-root').value || undefined,
    dryRun: $('import-dry').checked,
  };
  $('import-out').textContent = '';
  try {
    const r = await bridge.installPack(opts);
    $('import-out').textContent = r.dryRun
      ? `（预览）会安装为 Profile「${r.profileName}」到 ${r.dir}`
      : `✓ 已安装：${r.profileName}\n${r.dir}\nfiles 下载 ${r.filesDownloaded} 个`;
    setStatus(r.dryRun ? '预览完成' : '安装完成', 'ok');
  } catch (e) {
    $('import-out').textContent = '✗ ' + e.message;
    setStatus(e.message, 'err');
  }
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* ---- boot ---- */
function init() {
  bindTabs();
  $('market-reload').addEventListener('click', refreshMarket);
  $('market-out').addEventListener('click', (e) => {
    const btn = e.target.closest('.card-install');
    if (btn) installFromMarket(btn);
  });
  $('view-open').addEventListener('click', openPackView);
  $('export-go').addEventListener('click', doExport);
  $('export-profile').addEventListener('change', updatePreview);
  $('export-display').addEventListener('change', updatePreview);
  $('export-dsh').addEventListener('change', updatePreview);
  $('export-mode').addEventListener('change', onModeChange);
  $('export-content').addEventListener('change', updatePreview);
  $('export-refresh').addEventListener('click', initExport);
  $('export-browse').addEventListener('click', async () => {
    const d = await bridge.selectDir();
    if (d) $('export-out').value = d;
  });
  $('import-browse').addEventListener('click', async () => {
    const p = await bridge.selectFile([{ name: 'DSH 整合包', extensions: ['dspack'] }]);
    if (p) $('import-source').value = p;
  });
  $('import-go').addEventListener('click', doImport);

  if (!bridge) {
    setStatus('未检测到 Electron 桥（window.packforge）。请用桌面端运行：pnpm --filter gui start', 'err');
    return;
  }
  refreshMarket();
  initExport();
}

init();