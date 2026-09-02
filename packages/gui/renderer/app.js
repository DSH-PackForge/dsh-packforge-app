// 渲染进程逻辑（浏览器 ESM，仅依赖纯展示模块 format.js + Electron 桥 window.packforge）。
import { packViewHTML, marketCardHTML, exportResultHTML, exportRepoResultHTML } from '../src/format.js';

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

let pendingIntegrity = null; // 市场跳转带入的完整性校验 { source, sha, size }

async function installFromMarket(btn) {
  const source = btn.dataset.url;
  if (!source) return setStatus('该条目无下载地址', 'err');
  const size = Number(btn.dataset.size);
  pendingIntegrity = {
    source,
    sha: btn.dataset.sha || undefined,
    size: Number.isInteger(size) && size > 0 ? size : undefined,
  };
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
    // 按解析出的 type 自动显示对应安装字段（无需手选 Profile / DSH_HOME）
    const isHome = r.manifest?.type === 'dshhome';
    $('install-profile-view').hidden = isHome;
    $('install-home-view').hidden = !isHome;
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
    homeInclude: homeIncludeFromSwitches(),
  };
}

/* 导出内容开关：上一级目录（DSH_HOME）内容的分类开关 */
let homeCats = { skills: [], presets: [], instructions: [], other: [] };

function categorizeHomeFiles(files) {
  const skills = new Map();    // name -> rels[]（每个 skill 一个条目，目录型 skill 的资源文件归并）
  const presets = new Map();   // id -> rels[]
  const instructions = [];
  const other = [];
  for (const f of files ?? []) {
    const rel = String(f.rel || '');
    const seg = rel.split('/');
    if (seg[0] === 'skills' && seg.length >= 2) {
      const name = seg.length === 2 && seg[1].endsWith('.md') ? seg[1].slice(0, -3) : seg[1];
      if (!skills.has(name)) skills.set(name, []);
      skills.get(name).push(rel);
    } else if (seg[0] === '.agent-presets' && seg.length >= 2) {
      const id = seg[1];
      if (!presets.has(id)) presets.set(id, []);
      presets.get(id).push(rel);
    } else if (rel === 'AGENTS.md') {
      instructions.push(rel);
    } else {
      other.push(rel);
    }
  }
  return { skills: [...skills.values()], presets: [...presets.values()], instructions, other };
}

function renderHomeContentSwitches() {
  $('export-skill-count').textContent = homeCats.skills.length ? `（${homeCats.skills.length} 个）` : '（无）';
  $('export-preset-count').textContent = homeCats.presets.length ? `（${homeCats.presets.length} 个）` : '（无）';
  $('export-skill').disabled = !homeCats.skills.length;
  $('export-preset').disabled = !homeCats.presets.length;
  $('export-instruction').disabled = !homeCats.instructions.length;
}

function homeIncludeFromSwitches() {
  const rels = [];
  if ($('export-skill').checked) for (const rs of homeCats.skills) rels.push(...rs);
  if ($('export-preset').checked) for (const rs of homeCats.presets) rels.push(...rs);
  if ($('export-instruction').checked) rels.push(...homeCats.instructions);
  return rels.length ? rels : undefined;
}

function onModeChange() {
  const repo = $('export-mode').value === 'repo';
  $('export-content-field').hidden = !repo;
  $('export-go').textContent = repo ? '导出仓库' : '打包导出';
  updatePreview();
}

async function updatePreview() {
  const summary = $('export-summary');
  const p = currentProfile();
  if (!p) {
    summary.textContent = '';
    return;
  }
  summary.className = 'summary-box';
  summary.textContent = '扫描中…';
  try {
    const ins = await bridge.inspectProfile({ profile: { name: p.name, dir: p.dir }, ...exportOpts() });
    homeCats = categorizeHomeFiles(ins.homeFiles ?? []);
    renderHomeContentSwitches();
    const m = ins.manifest;
    const parts = [`${m.name}@${m.version}`];
    if ((m.bundles ?? []).length) parts.push(`${m.bundles.length} 个 bundle`);
    if (homeCats.skills.length) parts.push(`${homeCats.skills.length} 个 skill`);
    if (homeCats.presets.length) parts.push(`${homeCats.presets.length} 个预设`);
    if (homeCats.instructions.length) parts.push('含全局指令');
    summary.textContent = '将导出：' + parts.join(' · ');
  } catch (e) {
    summary.className = 'summary-box err';
    summary.textContent = `预览失败：${e.message}`;
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

/* dshhome 导出内容开关 */
let homeContent = { skills: [], presets: [], instructions: [], data: [] };

function categorizeHomeContent(files) {
  const skills = new Map();    // name -> rels[]（每个 skill 一个条目）
  const presets = new Map();   // id -> rels[]
  const instructions = [];
  const data = [];
  for (const f of files ?? []) {
    const rel = String(f.rel || '');
    const seg = rel.split('/');
    if (seg[0] === 'skills' && seg.length >= 2) {
      const name = seg.length === 2 && seg[1].endsWith('.md') ? seg[1].slice(0, -3) : seg[1];
      if (!skills.has(name)) skills.set(name, []);
      skills.get(name).push(rel);
    } else if (seg[0] === '.agent-presets' && seg.length >= 2) {
      const id = seg[1];
      if (!presets.has(id)) presets.set(id, []);
      presets.get(id).push(rel);
    } else if (rel === 'AGENTS.md') {
      instructions.push(rel);
    } else if (rel.startsWith('data/')) {
      data.push(rel);
    }
  }
  return { skills: [...skills.values()], presets: [...presets.values()], instructions, data };
}

function renderHomeSwitches() {
  $('home-skill-count').textContent = homeContent.skills.length ? `（${homeContent.skills.length} 个）` : '（无）';
  $('home-preset-count').textContent = homeContent.presets.length ? `（${homeContent.presets.length} 个）` : '（无）';
  $('home-skill').disabled = !homeContent.skills.length;
  $('home-preset').disabled = !homeContent.presets.length;
  $('home-instruction').disabled = !homeContent.instructions.length;
  $('home-data').disabled = !homeContent.data.length;
}

function homeExcludeFromSwitches() {
  const excludes = [];
  if (!$('home-skill').checked) excludes.push('skills/');
  if (!$('home-preset').checked) excludes.push('.agent-presets/');
  if (!$('home-instruction').checked) excludes.push('AGENTS.md');
  if (!$('home-data').checked) excludes.push('data/');
  return excludes.length ? excludes : undefined;
}

async function updateHomePreview() {
  const summary = $('home-summary');
  const h = currentHome();
  if (!h) {
    summary.textContent = '';
    return;
  }
  summary.className = 'summary-box';
  summary.textContent = '扫描中…';
  try {
    const ins = await bridge.inspectHome({ home: { name: h.name, dir: h.dir } });
    homeContent = categorizeHomeContent(ins.allFiles ?? ins.files ?? []);
    renderHomeSwitches();
    const profiles = Object.keys(ins.manifest?.profiles ?? {});
    const parts = [`${ins.manifest?.name}@${ins.manifest?.version}`, `${profiles.length} 个 profile`];
    if (homeContent.skills.length) parts.push(`${homeContent.skills.length} 个 skill`);
    if (homeContent.presets.length) parts.push(`${homeContent.presets.length} 个预设`);
    if (homeContent.instructions.length) parts.push('含全局指令');
    if (homeContent.data.length) parts.push(`${homeContent.data.length} 个数据文件`);
    summary.textContent = '将导出：' + parts.join(' · ');
  } catch (e) {
    summary.className = 'summary-box err';
    summary.textContent = `扫描失败：${e.message}`;
  }
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
      exclude: homeExcludeFromSwitches(),
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
  const integrity = pendingIntegrity && pendingIntegrity.source === source ? pendingIntegrity : null;
  const opts = {
    source,
    name: $('import-name').value || undefined,
    profilesRoot: $('import-root').value || undefined,
    dryRun: $('import-dry').checked,
    expectedSha256: integrity?.sha,
    expectedSize: integrity?.size,
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

async function doImportHome() {
  const source = $('pack-source').value.trim();
  if (!source) return setStatus('请先选择整合包文件', 'err');
  const integrity = pendingIntegrity && pendingIntegrity.source === source ? pendingIntegrity : null;
  const opts = {
    source,
    home: $('import-home-target').value || undefined,
    dryRun: $('import-home-dry').checked,
    expectedSha256: integrity?.sha,
    expectedSize: integrity?.size,
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

/* 输出目录快捷预设（桌面 / 下载 / 主目录） */
let defaultDirs = { home: '', desktop: '', downloads: '' };

async function loadDefaultDirs() {
  try { defaultDirs = await bridge.defaultDirs(); } catch { /* 忽略 */ }
}

function bindOutPreset(selId, inputId) {
  $(selId).addEventListener('change', () => {
    const v = $(selId).value;
    if (v && defaultDirs[v]) $(inputId).value = defaultDirs[v];
  });
}

/* ---- 导出工作区配置持久化（.dshpkcfg） ---- */
const cfgSet = (id, v) => { if (v != null && v !== '') $(id).value = v; };

function exportCfg() {
  return {
    name: $('export-name').value.trim(),
    version: $('export-version').value.trim(),
    displayName: $('export-display').value.trim(),
    description: $('export-desc').value.trim(),
    author: $('export-author').value.trim(),
    icon: $('export-icon').value.trim(),
    profileName: $('export-profilename').value.trim(),
    dshVersion: $('export-dsh').value,
    mode: $('export-mode').value,
    content: $('export-content').value,
    out: $('export-out').value.trim(),
    exportContent: {
      skill: $('export-skill').checked,
      preset: $('export-preset').checked,
      instruction: $('export-instruction').checked,
    },
  };
}

function applyExportCfg(cfg) {
  if (!cfg) return;
  cfgSet('export-name', cfg.name);
  cfgSet('export-version', cfg.version);
  cfgSet('export-display', cfg.displayName);
  cfgSet('export-desc', cfg.description);
  cfgSet('export-author', cfg.author);
  cfgSet('export-icon', cfg.icon);
  cfgSet('export-profilename', cfg.profileName);
  cfgSet('export-dsh', cfg.dshVersion);
  cfgSet('export-mode', cfg.mode);
  cfgSet('export-content', cfg.content);
  cfgSet('export-out', cfg.out);
  if (cfg.exportContent) {
    $('export-skill').checked = cfg.exportContent.skill !== false;
    $('export-preset').checked = cfg.exportContent.preset !== false;
    $('export-instruction').checked = cfg.exportContent.instruction === true;
  }
}

async function loadExportCfg() {
  const p = currentProfile();
  if (!p) return;
  try { applyExportCfg(await bridge.loadCfg(p.dir)); } catch { /* 忽略 */ }
}

function homeCfg() {
  return {
    name: $('home-name').value.trim(),
    version: $('home-version').value.trim(),
    displayName: $('home-display').value.trim(),
    description: $('home-desc').value.trim(),
    author: $('home-author').value.trim(),
    icon: $('home-icon').value.trim(),
    defaultProfile: $('home-default-profile').value.trim(),
    dshVersion: $('home-dsh').value,
    out: $('home-out').value.trim(),
    exportContent: {
      skill: $('home-skill').checked,
      preset: $('home-preset').checked,
      instruction: $('home-instruction').checked,
      data: $('home-data').checked,
    },
  };
}

function applyHomeCfg(cfg) {
  if (!cfg) return;
  cfgSet('home-name', cfg.name);
  cfgSet('home-version', cfg.version);
  cfgSet('home-display', cfg.displayName);
  cfgSet('home-desc', cfg.description);
  cfgSet('home-author', cfg.author);
  cfgSet('home-icon', cfg.icon);
  cfgSet('home-default-profile', cfg.defaultProfile);
  cfgSet('home-dsh', cfg.dshVersion);
  cfgSet('home-out', cfg.out);
  if (cfg.exportContent) {
    $('home-skill').checked = cfg.exportContent.skill !== false;
    $('home-preset').checked = cfg.exportContent.preset !== false;
    $('home-instruction').checked = cfg.exportContent.instruction !== false;
    $('home-data').checked = cfg.exportContent.data !== false;
  }
}

async function loadHomeCfg() {
  const h = currentHome();
  if (!h) return;
  try { applyHomeCfg(await bridge.loadCfg(h.dir)); } catch { /* 忽略 */ }
}

function saveExportCfg() {
  const p = currentProfile();
  if (!p) return setStatus('未选择 Profile', 'err');
  bridge.saveCfg(p.dir, exportCfg());
  setStatus('已保存配置', 'ok');
}

function saveHomeCfg() {
  const h = currentHome();
  if (!h) return setStatus('未选择 DSH_HOME', 'err');
  bridge.saveCfg(h.dir, homeCfg());
  setStatus('已保存配置', 'ok');
}

async function saveAndExport() {
  saveExportCfg();
  await doExport();
}

async function saveAndExportHome() {
  saveHomeCfg();
  await doExportHome();
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
  $('export-save').addEventListener('click', saveExportCfg);
  $('export-save-go').addEventListener('click', saveAndExport);
  $('export-home').addEventListener('change', () => { renderProfiles(); updatePreview(); });
  $('export-profile').addEventListener('change', () => { loadExportCfg(); updatePreview(); });
  $('export-name').addEventListener('change', updatePreview);
  $('export-version').addEventListener('change', updatePreview);
  $('export-display').addEventListener('change', updatePreview);
  $('export-desc').addEventListener('change', updatePreview);
  $('export-author').addEventListener('change', updatePreview);
  $('export-icon').addEventListener('change', updatePreview);
  $('export-profilename').addEventListener('change', updatePreview);
  $('export-dsh').addEventListener('change', updatePreview);
  $('export-skill').addEventListener('change', updatePreview);
  $('export-preset').addEventListener('change', updatePreview);
  $('export-instruction').addEventListener('change', updatePreview);
  $('export-mode').addEventListener('change', onModeChange);
  $('export-content').addEventListener('change', updatePreview);
  $('export-refresh').addEventListener('click', initExport);
  $('export-browse').addEventListener('click', async () => {
    const d = await bridge.selectDir();
    if (d) $('export-out').value = d;
  });
  loadDefaultDirs();
  bindOutPreset('export-out-preset', 'export-out');
  bindOutPreset('home-out-preset', 'home-out');
  $('import-go').addEventListener('click', doImport);
  $('import-home-go').addEventListener('click', doImportHome);
  $('import-root-browse').addEventListener('click', async () => {
    const d = await bridge.selectDir();
    if (d) $('import-root').value = d;
  });
  $('import-home-browse').addEventListener('click', async () => {
    const d = await bridge.selectDir();
    if (d) $('import-home-target').value = d;
  });

  // 导出页子 tab（Profile / DSH_HOME）
  document.querySelectorAll('[data-export-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchExportTab(btn.dataset.exportTab));
  });
  $('home-sel').addEventListener('change', () => { loadHomeCfg(); updateHomePreview(); });
  $('home-skill').addEventListener('change', updateHomePreview);
  $('home-preset').addEventListener('change', updateHomePreview);
  $('home-instruction').addEventListener('change', updateHomePreview);
  $('home-data').addEventListener('change', updateHomePreview);
  $('home-refresh').addEventListener('click', initExportHome);
  $('home-go').addEventListener('click', doExportHome);
  $('home-save').addEventListener('click', saveHomeCfg);
  $('home-save-go').addEventListener('click', saveAndExportHome);
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