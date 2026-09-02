// 渲染进程逻辑（浏览器 ESM，仅依赖纯展示模块 format.js + Electron 桥 window.packforge）。
import { packViewHTML, marketCardHTML, exportPreviewHTML, exportResultHTML, exportRepoResultHTML, specialFieldHTML } from '../src/format.js';

const bridge = window.packforge ?? null;
const $ = (id) => document.getElementById(id);

const INSTALL_STAGES = {
  download: '下载整合包',
  extract: '解析并解压整合包',
  install: '运行 pnpm install（依赖重建，可能较慢）…',
  files: '下载重内容文件',
  done: '安装完成',
};

function setStatus(msg, kind = '') {
  const el = $('status');
  el.textContent = msg;
  el.className = `status ${kind}`;
}

function switchTab(tab) {
  document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.pane').forEach((p) => {
    p.hidden = p.id !== `pane-${tab}`;
  });
}

function bindTabs() {
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

/* ---- 市场浏览 ---- */
async function refreshMarket(source) {
  const out = $('market-out');
  out.innerHTML = '<p class="muted">加载中…</p>';
  let r;
  try {
    r = await bridge.marketList(source);
  } catch (e) {
    r = { packs: [], error: String(e?.message ?? e) };
  }
  if (!Array.isArray(r?.packs) || !r.packs.length) {
    const reason = r?.error ? `加载失败：${r.error}` : '官方市场暂无已收录的整合包';
    const src = r?.source || source || '官方站点';
    out.innerHTML = `
      <div class="market-empty panel">
        <p class="${r?.error ? 'err' : 'muted'}">${escape(reason)}</p>
        <p class="muted">来源：${escape(src)} · 可点右上角「从本地加载」选 index.json 预览</p>
      </div>`;
    return;
  }
  out.innerHTML = r.packs.map((p) => marketCardHTML(p)).join('');
  setStatus(`市场共 ${r.packs.length} 个整合包`);
}

async function installFromMarket(btn) {
  const source = btn.dataset.url;
  if (!source) return setStatus('该条目无下载地址', 'err');
  switchTab('pack');
  $('pack-source').value = source;
  loadPackPreview();
}

/* ---- 整合包：预览 + 安装 ---- */
async function loadPackPreview() {
  const source = $('pack-source').value.trim();
  const preview = $('pack-preview');
  const install = $('pack-install');
  if (!source) {
    preview.hidden = true;
    $('pack-preview-out').innerHTML = '';
    install.hidden = true;
    return;
  }
  preview.hidden = false;
  $('pack-preview-out').innerHTML = '<p class="muted">解析中…</p>';
  try {
    const r = await bridge.viewPack(source);
    $('pack-preview-out').innerHTML = packViewHTML(r);
    install.hidden = false;
    setStatus('已解析整合包', 'ok');
  } catch (e) {
    $('pack-preview-out').innerHTML = `<p class="err">${escape(e.message)}</p>`;
    install.hidden = true;
    setStatus(e.message, 'err');
  }
}

/* ---- 导出 ---- */
let exportProfiles = [];
let exportRoots = [];

const homeLabel = (r) => {
  const tag = r.source === 'classic' ? '经典' : `启动器 · ${r.home || ''}`;
  return `${tag} · ${r.root}`;
};

function profilesForRoot(root) {
  if (!root) return exportProfiles;
  return exportProfiles.filter((p) => p.source === root.source && p.home === root.home);
}

function renderHomes() {
  const sel = $('export-home');
  sel.innerHTML = exportRoots.length
    ? exportRoots.map((r, i) => `<option value="${i}">${escape(homeLabel(r))}</option>`).join('')
    : '<option value="">（未发现 DSH-HOME）</option>';
}

function renderProfiles() {
  const idx = $('export-home').value;
  const root = idx === '' ? null : exportRoots[Number(idx)];
  const list = profilesForRoot(root);
  const sel = $('export-profile');
  sel.innerHTML = list.length
    ? list.map((p) => `<option value="${escape(p.dir)}">${escape(p.name)}</option>`).join('')
    : '<option value="">（此 HOME 下无 Profile）</option>';
}

async function initExport() {
  try {
    const r = await bridge.listProfiles();
    exportProfiles = Array.isArray(r) ? r : (r?.profiles ?? []);
    exportRoots = Array.isArray(r) ? [] : (r?.roots ?? []);
  } catch {
    exportProfiles = [];
    exportRoots = [];
  }

  renderHomes();
  renderProfiles();

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
    name: $('export-name').value.trim() || undefined,
    version: $('export-version').value.trim() || undefined,
    displayName: $('export-display').value.trim() || undefined,
    description: $('export-desc').value.trim() || undefined,
    author: $('export-author').value.trim() || undefined,
    icon: $('export-icon').value.trim() || undefined,
    profileName: $('export-profilename').value.trim() || undefined,
    dshVersion: $('export-dsh').value || undefined,
    include: includedArray(),
    homeInclude: homeIncludedArray(),
  };
}

/* 文件(夹)选择（勾选要打进包的内容） */
let exportAllFiles = [];
let exportIncluded = null; // null = 全选；否则 Set<rel>
let exportHomeFiles = [];      // 上一级目录（DSH_HOME）候选，勾选后进 home/
let exportHomeIncluded = null; // null = 不带 home 级；否则 Set<rel>

function homeIncludedArray() {
  return exportHomeIncluded == null ? undefined : [...exportHomeIncluded];
}

function includeSet() {
  return exportIncluded ?? new Set(exportAllFiles.map((f) => f.rel));
}

function includedArray() {
  return exportIncluded == null ? undefined : [...exportIncluded];
}

function dirLeafFiles(dir) {
  return exportAllFiles
    .filter((f) => f.rel === dir || f.rel.startsWith(dir + '/'))
    .map((f) => f.rel);
}

function setIncluded(rels, on) {
  const set = new Set(includeSet());
  for (const r of rels) { if (on) set.add(r); else set.delete(r); }
  exportIncluded = set.size === exportAllFiles.length ? null : set;
}

function buildExportTree(files) {
  const root = new Map();
  for (const f of files) {
    const parts = String(f.rel).split('/');
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isLeaf = i === parts.length - 1;
      if (!node.has(name)) {
        node.set(name, { name, path: parts.slice(0, i + 1).join('/'), isDir: !isLeaf, children: isLeaf ? null : new Map() });
      }
      if (isLeaf) break;
      node = node.get(name).children;
    }
  }
  return [...root.values()];
}

function treeNodesHTML(nodes, set) {
  return nodes.map((n) => {
    if (n.isDir) {
      const kids = [...n.children.values()];
      return `<li><div class="fp-row"><input type="checkbox" data-dir="${escape(n.path)}"> <span class="fp-dir">${escape(n.name)}/</span></div>${kids.length ? `<ul>${treeNodesHTML(kids, set)}</ul>` : ''}</li>`;
    }
    return `<li><div class="fp-row"><input type="checkbox" data-file="${escape(n.path)}" ${set.has(n.path) ? 'checked' : ''}> <span>${escape(n.name)}</span></div></li>`;
  }).join('');
}

function renderFilePicker() {
  const field = $('export-files-field');
  const box = $('export-files');
  if (!exportAllFiles.length && !exportHomeFiles.length) {
    field.hidden = true;
    box.innerHTML = '';
    return;
  }
  field.hidden = false;
  const set = includeSet();
  let html = '';
  if (exportAllFiles.length) {
    html += `<div class="fp-group">Profile 文件</div><ul class="fp-tree">${treeNodesHTML(buildExportTree(exportAllFiles), set)}</ul>`;
  }
  if (exportHomeFiles.length) {
    html += `<div class="fp-group">上一级目录（DSH_HOME，可选）</div>${homeFilesHTML(exportHomeIncluded ?? new Set())}`;
  }
  box.innerHTML = html;
  box.querySelectorAll('input[data-dir]').forEach((cb) => {
    const files = dirLeafFiles(cb.dataset.dir);
    const sel = files.filter((r) => set.has(r)).length;
    cb.checked = files.length > 0 && sel === files.length;
    cb.indeterminate = sel > 0 && sel < files.length;
  });
  $('export-select-all').checked = exportIncluded == null;
  $('export-files-count').textContent = `${set.size} / ${exportAllFiles.length} 个文件`;
}

/** 上一级目录（DSH_HOME）候选：平铺 checkbox 列表，勾选后进 home/。 */
function homeFilesHTML(set) {
  return exportHomeFiles.map((f) => {
    const checked = set.has(f.rel) ? 'checked' : '';
    return `<label class="check fp-row"><input type="checkbox" data-home-file="${escape(f.rel)}" ${checked}> <span class="mono">${escape(f.rel)}</span></label>`;
  }).join('');
}

function onSelectAll(e) {
  exportIncluded = e.target.checked ? null : new Set();
  updatePreview();
}

function onPickerChange(e) {
  const t = e.target;
  if (t.dataset.dir) setIncluded(dirLeafFiles(t.dataset.dir), t.checked);
  else if (t.dataset.file) setIncluded([t.dataset.file], t.checked);
  else if (t.dataset.homeFile) {
    const set = new Set(exportHomeIncluded ?? []);
    if (t.checked) set.add(t.dataset.homeFile); else set.delete(t.dataset.homeFile);
    exportHomeIncluded = set.size ? set : null;
  } else return;
  updatePreview();
}

function onModeChange() {
  const repo = $('export-mode').value === 'repo';
  $('export-content-field').hidden = !repo;
  $('export-go').textContent = repo ? '导出仓库' : '打包导出';
  updatePreview();
}

async function updatePreview() {
  const box = $('export-preview');
  const p = currentProfile();
  if (!p) {
    box.innerHTML = '<p class="muted">选择 Profile 后显示打包预览</p>';
    $('export-files-field').hidden = true;
    $('export-files').innerHTML = '';
    $('export-special').innerHTML = '<span class="muted">选择 Profile 后显示</span>';
    return;
  }
  box.innerHTML = '<p class="muted">扫描中…</p>';
  try {
    const ins = await bridge.inspectProfile({ profile: { name: p.name, dir: p.dir }, ...exportOpts() });
    exportAllFiles = ins.allFiles ?? ins.files ?? [];
    exportHomeFiles = ins.homeFiles ?? [];
    renderFilePicker();
    $('export-special').innerHTML = specialFieldHTML(ins.special);
    box.innerHTML = exportPreviewHTML(ins);
  } catch (e) {
    box.innerHTML = `<p class="err">预览失败：${escape(e.message)}</p>`;
  }
}

async function doExport() {
  const repo = $('export-mode').value === 'repo';
  const p = currentProfile();
  if (!p) return setStatus('未选择 Profile', 'err');
  const btn = $('export-go');
  const busy = $('export-busy');
  const result = $('export-result');
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

/* ---- 导出 DSH_HOME（导出页子 tab） ---- */
let exportHomes = [];

function switchExportTab(tab) {
  document.querySelectorAll('[data-export-tab]').forEach((b) => b.classList.toggle('active', b.dataset.exportTab === tab));
  $('export-profile-view').hidden = tab !== 'profile';
  $('export-home-view').hidden = tab !== 'home';
}

function renderHomeSel() {
  const sel = $('home-sel');
  sel.innerHTML = exportHomes.length
    ? exportHomes.map((h, i) => `<option value="${i}">${escape(h.name)}（${escape(h.dir)}）</option>`).join('')
    : '<option value="">（未发现 DSH_HOME）</option>';
}

async function initExportHome() {
  try { exportHomes = await bridge.listHomes(); } catch { exportHomes = []; }
  renderHomeSel();
  const vsel = $('home-dsh');
  let versions = [];
  try { versions = await bridge.listDshVersions(); } catch { /* 忽略 */ }
  vsel.innerHTML = '<option value="">自动（最新已装）</option>'
    + versions.map((v) => `<option value="${escape(v)}">${escape(v)}</option>`).join('');
}

function currentHome() {
  const idx = $('home-sel').value;
  return idx === '' ? null : exportHomes[Number(idx)];
}

function updateHomePreview() {
  const box = $('home-preview');
  const h = currentHome();
  box.innerHTML = h
    ? '<p>将把整个 DSH_HOME 打包为 dshhome 整合包：</p><ul><li>多个 profile（排除 web / headless 安装基线）</li><li>.agent-presets/ 预设</li><li>skills/ 技能</li><li>AGENTS.md 全局指令</li><li>data/ 全局数据</li></ul>'
    : '<p class="muted">选择 DSH_HOME 后显示</p>';
}

async function doExportHome() {
  const h = currentHome();
  if (!h) return setStatus('未选择 DSH_HOME', 'err');
  const btn = $('home-go');
  const busy = $('home-busy');
  const result = $('home-result');
  const out = $('home-out').value.trim() || undefined;
  btn.disabled = true;
  busy.hidden = false;
  result.hidden = true;
  try {
    const r = await bridge.exportHome({
      home: { name: h.name, dir: h.dir },
      name: $('home-name').value.trim() || undefined,
      version: $('home-version').value.trim() || undefined,
      displayName: $('home-display').value.trim() || undefined,
      description: $('home-desc').value.trim() || undefined,
      author: $('home-author').value.trim() || undefined,
      icon: $('home-icon').value.trim() || undefined,
      dshVersion: $('home-dsh').value || undefined,
      defaultProfile: $('home-default-profile').value.trim() || undefined,
      out,
    });
    result.innerHTML = exportResultHTML(r);
    result.className = 'result ok';
    setStatus(`导出完成：${r.output}`, 'ok');
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
  const source = $('pack-source').value.trim();
  if (!source) return setStatus('请先选择整合包文件', 'err');
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
      ? `（预览）会安装为 Profile「${r.profileName}」到 ${r.dir}${r.exists ? '\n（目标已存在，真实安装需 --force）' : ''}`
      : `✓ 已安装：${r.profileName}\n${r.dir}\nfiles 下载 ${r.filesDownloaded} 个`;
    setStatus(r.dryRun ? '预览完成' : '安装完成', 'ok');
  } catch (e) {
    $('import-out').textContent = '✗ ' + e.message;
    setStatus(e.message, 'err');
  }
}

function switchInstallTab(tab) {
  document.querySelectorAll('[data-install-tab]').forEach((b) => b.classList.toggle('active', b.dataset.installTab === tab));
  $('install-profile-view').hidden = tab !== 'profile';
  $('install-home-view').hidden = tab !== 'home';
}

async function doImportHome() {
  const source = $('pack-source').value.trim();
  if (!source) return setStatus('请先选择整合包文件', 'err');
  const opts = {
    source,
    home: $('import-home-target').value || undefined,
    dryRun: $('import-home-dry').checked,
  };
  $('import-home-out').textContent = '';
  try {
    const r = await bridge.installPack(opts);
    if (r.dryRun) {
      $('import-home-out').textContent = r.type === 'dshhome'
        ? `（预览）会安装为 DSH_HOME 到 ${r.dir}\n  profile: ${r.profiles.join(', ')}（默认 ${r.defaultProfile}）${r.exists ? '\n（目标已存在，真实安装需 --force）' : ''}`
        : `（预览）会安装为 Profile「${r.profileName}」到 ${r.dir}${r.exists ? '\n（目标已存在，真实安装需 --force）' : ''}`;
    } else {
      $('import-home-out').textContent = r.type === 'dshhome'
        ? `✓ 已安装 DSH_HOME：${r.dir}\n  profile: ${r.profiles.join(', ')}（默认 ${r.defaultProfile}）\nfiles 下载 ${r.filesDownloaded} 个`
        : `✓ 已安装：${r.profileName}\n${r.dir}\nfiles 下载 ${r.filesDownloaded} 个`;
    }
    setStatus(r.dryRun ? '预览完成' : '安装完成', 'ok');
  } catch (e) {
    $('import-home-out').textContent = '✗ ' + e.message;
    setStatus(e.message, 'err');
  }
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* ---- boot ---- */
function init() {
  bindTabs();
  $('market-reload').addEventListener('click', () => refreshMarket());
  $('market-local').addEventListener('click', async () => {
    const p = await bridge.selectFile([{ name: '市场索引', extensions: ['json'] }]);
    if (p) refreshMarket(p);
  });
  $('market-out').addEventListener('click', (e) => {
    const btn = e.target.closest('.card-install');
    if (btn) installFromMarket(btn);
  });
  $('pack-browse').addEventListener('click', async () => {
    const p = await bridge.selectFile([{ name: 'DSH 整合包', extensions: ['dspack'] }]);
    if (p) { $('pack-source').value = p; loadPackPreview(); }
  });
  $('pack-source').addEventListener('change', loadPackPreview);
  $('export-go').addEventListener('click', doExport);
  $('export-home').addEventListener('change', () => { renderProfiles(); updatePreview(); });
  $('export-profile').addEventListener('change', updatePreview);
  $('export-name').addEventListener('change', updatePreview);
  $('export-version').addEventListener('change', updatePreview);
  $('export-display').addEventListener('change', updatePreview);
  $('export-desc').addEventListener('change', updatePreview);
  $('export-author').addEventListener('change', updatePreview);
  $('export-icon').addEventListener('change', updatePreview);
  $('export-profilename').addEventListener('change', updatePreview);
  $('export-dsh').addEventListener('change', updatePreview);
  $('export-select-all').addEventListener('change', onSelectAll);
  $('export-files').addEventListener('change', onPickerChange);
  $('export-mode').addEventListener('change', onModeChange);
  $('export-content').addEventListener('change', updatePreview);
  $('export-refresh').addEventListener('click', initExport);
  $('export-browse').addEventListener('click', async () => {
    const d = await bridge.selectDir();
    if (d) $('export-out').value = d;
  });
  $('import-go').addEventListener('click', doImport);
  $('import-home-go').addEventListener('click', doImportHome);

  // 安装区子 tab（导入 Profile / 导入 DSH_HOME）
  document.querySelectorAll('[data-install-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchInstallTab(btn.dataset.installTab));
  });

  // 导出页子 tab（Profile / DSH_HOME）
  document.querySelectorAll('[data-export-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchExportTab(btn.dataset.exportTab));
  });
  $('home-sel').addEventListener('change', updateHomePreview);
  $('home-refresh').addEventListener('click', initExportHome);
  $('home-go').addEventListener('click', doExportHome);
  $('home-browse').addEventListener('click', async () => {
    const d = await bridge.selectDir();
    if (d) $('home-out').value = d;
  });

  // 安装进度：异步推送到状态栏 + 导入页输出区，避免「卡住」观感。
  bridge.onInstallProgress?.((p) => {
    const label = INSTALL_STAGES[p?.stage] ?? p?.detail ?? p?.stage ?? '';
    if (!label) return;
    setStatus(`正在安装… ${label}`, '');
    if (!$('pane-pack').hidden) $('import-out').textContent = `⏳ ${label}`;
  });

  if (!bridge) {
    setStatus('未检测到 Electron 桥（window.packforge）。请用桌面端运行：pnpm --filter gui start', 'err');
    return;
  }
  // 注册 URL 协议导入：dspack://install?url=<http(s)://…>
  bridge.onProtocolUrl?.((url) => {
    if (!url) return;
    switchTab('pack');
    $('pack-source').value = url;
    loadPackPreview();
    setStatus('收到整合包链接（dspack://），确认后点「安装」', 'ok');
  });
  refreshMarket();
  initExport();
  initExportHome();
}

init();