/**
 * GUI 展示层（纯函数，无 DOM/无运行时依赖，可单测）：
 * 把 core（inspectPack / readMarketIndex）返回的纯数据渲染成 HTML 片段。
 * Electron 渲染进程与（未来的）插件 webView 共用。
 */

export function formatBytes(n) {
  if (n == null) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function shortSha(hex) {
  return hex ? `${String(hex).slice(0, 16)}…` : '';
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function pickLocale(map, locale = 'zh-CN', fallback = '') {
  if (typeof map === 'string' && map) return map;
  if (map && typeof map === 'object') {
    if (typeof map[locale] === 'string') return map[locale];
    const first = Object.values(map).find((v) => typeof v === 'string');
    if (first) return first;
  }
  return fallback;
}

/** 把扁平记录 [{path,size}] 生成嵌套树（目录为节点、文件为叶子）。 */
export function treeFromPaths(records) {
  const root = new Map();
  for (const rec of records ?? []) {
    const parts = String(rec.path).split('/');
    let node = root;
    for (let i = 0; i < parts.length; i += 1) {
      const name = parts[i];
      const isLeaf = i === parts.length - 1;
      if (!node.has(name)) node.set(name, { name, size: 0, children: isLeaf ? [] : new Map() });
      const cur = node.get(name);
      if (isLeaf) {
        cur.size = rec.size ?? 0;
        cur.children = [];
      }
      node = cur.children;
    }
  }
  return [...root.values()].map(toObj);
}

function toObj(n) {
  return { name: n.name, size: n.size, children: n.children instanceof Map ? [...n.children.values()].map(toObj) : [] };
}

/** 查看整合包：inspectPack 结果 → HTML 片段。 */
export function packViewHTML(r) {
  if (!r) return '<p class="muted">请先打开一个 .dspack</p>';
  const m = r.manifest;
  const tree = treeFromPaths(r.overrides);
  return `
  <div class="pv-head">
    <span class="badge ${r.valid ? 'ok' : 'bad'}">${r.valid ? '校验合法' : '校验失败'}</span>
    <span class="pill">${m ? `manifest v${m.manifestVersion}` : '无 manifest'}</span>
    <span class="pill">标准 ZIP</span>
    <span class="muted">${formatBytes(r.size)} · sha256 ${shortSha(r.sha256)}</span>
  </div>
  ${r.valid ? '' : `<ul class="errs">${r.validation.map((e) => `<li>✗ ${escapeHtml(e)}</li>`).join('')}</ul>`}
  ${m ? manifestHTML(m) : '<p class="muted">无 manifest.json</p>'}
  <h3>根机器文件（${r.machine.length}）</h3>
  ${r.machine.length ? entryListHTML(r.machine) : '<p class="muted">无</p>'}
  <h3>overrides/（${r.overrides.length}）</h3>
  ${tree.length ? treeHTML(tree) : '<p class="muted">无</p>'}
  ${r.other.length ? `<h3>其它根条目（${r.other.length}）</h3>${entryListHTML(r.other)}` : ''}
  `.trim();
}

export function manifestHTML(m) {
  const bundles = m.bundles ?? [];
  const deps = Object.keys(m.dependencies ?? {});
  const files = m.files ?? [];
  const disp = typeof m.displayName === 'string' ? m.displayName : pickLocale(m.displayName, 'zh-CN', '');
  return `
  <div class="mhead">
    <h2>${escapeHtml(m.name)} <span class="muted">v${escapeHtml(String(m.version))}</span></h2>
    ${disp ? `<div class="muted">${escapeHtml(disp)}</div>` : ''}
  </div>
  <table class="kv">
    <tr><td>类型</td><td>${escapeHtml(m.type ?? '')}</td></tr>
    <tr><td>dsh 版本</td><td>${escapeHtml(m.dshVersion ?? '未钉定')}</td></tr>
    <tr><td>作者</td><td>${escapeHtml(m.author ?? '')}</td></tr>
    <tr><td>层栈</td><td>${bundles.map(escapeHtml).join(', ') || '<span class="muted">无</span>'}</td></tr>
    <tr><td>依赖</td><td>${deps.map(escapeHtml).join(', ') || '<span class="muted">无</span>'}</td></tr>
    <tr><td>重内容</td><td>${files.length} 个 files[] 条目</td></tr>
  </table>
  ${typeof m.description === 'string' && m.description ? `<p class="desc">${escapeHtml(m.description)}</p>` : ''}
  `.trim();
}

export function marketCardHTML(p) {
  const fmt = p.format === 'dspack' ? '.dspack v4' : p.format === 'tgz' ? '.tgz（旧 v3）' : '未知格式';
  const action =
    p.format === 'dspack'
      ? `<button class="card-install" data-name="${escapeHtml(p.name)}" data-url="${escapeHtml(p.downloadUrl)}" data-sha="${escapeHtml(p.sha256 ?? '')}" data-size="${p.size ?? ''}">安装</button>`
      : '<span class="muted">旧格式，暂不支持安装</span>';
  return `
  <article class="card ${p.format === 'dspack' ? '' : 'stale'}" data-name="${escapeHtml(p.name)}">
    <header>
      <h3>${escapeHtml(p.displayName)}</h3>
      <span class="muted">${escapeHtml(p.name)} · v${escapeHtml(String(p.version))}</span>
    </header>
    <p class="card-desc">${escapeHtml(p.description) || '<span class="muted">无描述</span>'}</p>
    <div class="meta">
      <span class="pill">${fmt}</span>
      ${p.dshVersion ? `<span>dsh ${escapeHtml(p.dshVersion)}</span>` : ''}
      ${p.author ? `<span>by ${escapeHtml(p.author)}</span>` : ''}
      ${p.size ? `<span>${formatBytes(p.size)}</span>` : ''}
    </div>
    ${p.sha256 ? `<div class="muted mono">${shortSha(p.sha256)}</div>` : ''}
    <div class="card-actions">${action}</div>
  </article>`;
}

/** 导出：inspectProfile 干跑结果 → 打包前预览。 */
export function exportPreviewHTML(ins) {
  if (!ins) return '';
  const m = ins.manifest;
  const files = ins.files ?? [];
  const total = files.reduce((a, f) => a + (f.size || 0), 0);
  const bundles = m.bundles ?? [];
  const deps = Object.keys(m.dependencies ?? {});
  const disp = typeof m.displayName === 'string' ? m.displayName : pickLocale(m.displayName, 'zh-CN', m.name);
  const profile = ins.profile ?? {};
  const name = profile.name || m.name;
  return `
  <h3 class="preview-title">打包预览</h3>
  <table class="kv">
    <tr><td>整合包</td><td>${escapeHtml(m.name)} <span class="muted">v${escapeHtml(String(m.version))}</span></td></tr>
    <tr><td>展示名</td><td>${escapeHtml(disp)}</td></tr>
    <tr><td>DSH 版本</td><td>${m.dshVersion ? escapeHtml(m.dshVersion) : '<span class="muted">最新（未钉定）</span>'}</td></tr>
    <tr><td>层栈</td><td>${bundles.length ? bundles.map(escapeHtml).join(', ') : '<span class="muted">无</span>'}</td></tr>
    <tr><td>依赖</td><td>${deps.length ? deps.map(escapeHtml).join(', ') : '<span class="muted">无</span>'}</td></tr>
    <tr><td>将打包</td><td>${files.length} 个文件 · ${formatBytes(total)}</td></tr>
    <tr><td>排除</td><td>${(ins.excluded ?? []).length} 个文件/目录</td></tr>
  </table>
  <div class="muted mono pre-file">→ ${escapeHtml(name)}-${escapeHtml(String(m.version))}.dspack</div>
  `.trim();
}

/** 导出成功结果 → HTML（外框 ok/err 由 app.js 决定）。 */
export function exportResultHTML(r) {
  return `
  <div class="res-title">✓ 导出成功</div>
  <div class="mono">${escapeHtml(r.output)}</div>
  <table class="kv">
    <tr><td>大小</td><td>${formatBytes(r.size)}</td></tr>
    <tr><td>sha256</td><td class="mono">${shortSha(r.sha256)}</td></tr>
  </table>`;
}

/** 仓库内容档 → 中文标签（与 core/repo.js 对齐，展示层独立映射）。 */
export const REPO_CONTENT_LABEL = {
  manifest: '仅清单（manifest.json）',
  readme: '清单 + README',
  full: '全套文件（overrides/ + release/）',
};

/** 导出仓库成功结果 → HTML（外框 ok/err 由 app.js 决定）。 */
export function exportRepoResultHTML(r) {
  const label = REPO_CONTENT_LABEL[r.content] || r.content;
  const files = (r.written ?? []).map((w) => `<li class="mono">${escapeHtml(w)}</li>`).join('');
  return `
  <div class="res-title">✓ 仓库已导出</div>
  <div class="mono">${escapeHtml(r.dir)}</div>
  <table class="kv">
    <tr><td>内容</td><td>${escapeHtml(label)}</td></tr>
    <tr><td>整合包</td><td>${escapeHtml(r.manifest?.name ?? '')} v${escapeHtml(String(r.manifest?.version ?? ''))}</td></tr>
    <tr><td>写入</td><td>${(r.written ?? []).length} 项</td></tr>
  </table>
  ${files ? `<ul class="tree repo-written">${files}</ul>` : ''}`;
}

function entryListHTML(recs) {
  return `<ul class="tree">${recs.map((e) => `<li>${escapeHtml(e.path)} <span class="muted">(${formatBytes(e.size)})</span></li>`).join('')}</ul>`;
}

function treeHTML(nodes) {
  return `<ul class="tree">${nodes.map((n) => {
    const isDir = n.children.length > 0;
    const label = isDir
      ? `<span class="dir">${escapeHtml(n.name)}/</span>`
      : `${escapeHtml(n.name)} ${n.size ? `<span class="muted">(${formatBytes(n.size)})</span>` : ''}`;
    return `<li>${label}${isDir ? treeHTML(n.children) : ''}</li>`;
  }).join('')}</ul>`;
}