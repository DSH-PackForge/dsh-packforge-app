import { scanProfile, selectFiles } from './scan.js';
import { buildManifest, buildHomeManifest } from './manifest.js';
import { validateManifest } from './manifest.js';
import { parseDspack, decodeText } from './dspack.js';
import { summarizeSpecial } from './special.js';
import { summarizeHome } from './pack.js';

/** 干跑检查：返回扫描结果 + manifest v4 预览 + 特殊目录摘要，不写任何文件。
 *  opts.include（rel 白名单）给定则 files/special 只取选中项，allFiles 保留全量。 */
export async function inspectProfile(host, profile, opts = {}) {
  const scan = await scanProfile(host, profile.dir);
  const files = selectFiles(scan.files, opts.include);
  const manifest = await buildManifest(host, profile, opts, scan);
  // home 级候选（上一级目录）：供 GUI 勾选，勾选项打包进 home/ 目录。
  const homeDir = opts.home || host.joinPath(profile.dir, '..', '..');
  const homeFiles = (await scanProfile(host, homeDir)).files.filter((f) => !f.rel.startsWith('profiles/'));
  return {
    profile,
    files,
    allFiles: scan.files,
    excluded: scan.excluded,
    manifest,
    special: summarizeSpecial(files),
    homeFiles,
    homeDir,
  };
}

/** 干跑检查（dshhome）：扫描整个 home → 识别四类单元 → 预览 manifest v5，不写任何文件。 */
export async function inspectHome(host, home, opts = {}) {
  const scan = await scanProfile(host, home.dir);
  const files = selectFiles(scan.files, opts.include);
  const summary = summarizeHome(files);
  const profiles = [...summary.profiles.keys()]
    .filter((n) => n !== 'web' && n !== 'headless')
    .map((n) => ({ name: n, dir: host.joinPath(home.dir, 'profiles', n) }));
  const presets = {};
  for (const [id, path] of summary.presets) presets[id] = { path };
  const manifest = await buildHomeManifest(host, home, {
    name: opts.name,
    displayName: opts.displayName,
    version: opts.version,
    description: opts.description,
    author: opts.author,
    icon: opts.icon,
    dshVersion: opts.dshVersion,
    defaultProfile: opts.defaultProfile,
    profiles,
    presets,
    skills: summary.skills,
    instructions: summary.instructions || 'AGENTS.md',
    files: opts.files ?? [],
  });
  return { home, files, allFiles: scan.files, excluded: scan.excluded, manifest, summary };
}

/**
 * 查看一个已有的 `.dspack` 整合包（不解压到磁盘）：容器版本、全包 sha256/size、
 * manifest 校验结果、根机器文件 / overrides/ / 其它条目的目录树。
 * 供 GUI「查看整合包」与 CLI `view` 复用；纯内存，宿主无关。
 *
 * @param {Host} host
 * @param {string|Uint8Array} source 本地 .dspack 路径或已在内存中的字节
 * @returns {Promise<{sha256,size,containerVersion,valid,validation,manifest,machine,overrides,other,totalEntries}>}
 */
export async function inspectPack(host, source) {
  const bytes = source instanceof Uint8Array ? source : await host.readFile(host.resolvePath(source));
  if (!bytes) throw new Error('无法读取整合包文件');
  const { entries, marker } = parseDspack(bytes);

  let manifest = null;
  let validation;
  if (entries['manifest.json']) {
    manifest = parseJson(decodeText(entries['manifest.json']));
    validation = manifest ? validateManifest(manifest) : ['manifest.json 无法解析'];
  } else {
    validation = ['缺少 manifest.json'];
  }

  const machine = [];
  const overrides = [];
  const home = [];
  const other = [];
  for (const [p, data] of Object.entries(entries)) {
    if (p === 'manifest.json') continue;
    const size = data?.byteLength ?? data?.length ?? 0;
    const rec = { path: p, size };
    if (p === 'dspack.json' || p === 'package.json' || p === 'pnpm-workspace.yaml' || p === 'pnpm-lock.yaml') machine.push(rec);
    else if (p.startsWith('overrides/')) overrides.push(rec);
    else if (p.startsWith('home/')) home.push(rec);
    else other.push(rec);
  }
  const byPath = (a, b) => a.path.localeCompare(b.path);
  machine.sort(byPath);
  overrides.sort(byPath);
  home.sort(byPath);
  other.sort(byPath);

  return {
    sha256: await host.sha256(bytes),
    size: bytes.byteLength,
    containerVersion: marker?.version ?? null,
    valid: validation.length === 0,
    validation,
    manifest,
    machine,
    overrides,
    home,
    other,
    totalEntries: Object.keys(entries).length,
  };
}

function parseJson(raw) {
  if (raw == null || raw === '') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
