import { scanProfile, selectFiles } from './scan.js';
import { buildManifest, buildHomeManifest } from './manifest.js';
import { buildDspack, encodeText, dspackMarker, DSPACK_CONTAINER_VERSION } from './dspack.js';

// .dspack（pack-structure v3）布局：根只放机器文件；其余用户文件进 overrides/。
const ROOT_MACHINE = new Set(['package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml']);

/** 把扫描出的相对路径映射为归档内条目名。 */
export function dspackEntryPath(rel) {
  const r = String(rel).replace(/\\/g, '/');
  return ROOT_MACHINE.has(r) ? r : `overrides/${r}`;
}

/**
 * 一键导出（单 profile）：扫描 Profile → 生成 manifest v5 → 打包 .dspack（dspack.json version 3）。
 * 全程只读用户 Profile 目录，在内存中拼 ZIP 后一次写盘，不落暂存清单。
 *
 * @param {Host} host
 * @param {{name: string, dir: string}} profile
 * @param {object} opts 见 buildManifest + { out, force }
 * @returns {Promise<{manifest, output, sha256, size, included, excluded}>}
 */
export async function packProfile(host, profile, opts = {}) {
  const scan = await scanProfile(host, profile.dir);
  if (scan.files.length === 0) {
    throw new Error(`Profile「${profile.name}」没有可打包的文件（全部被过滤或目录为空）`);
  }
  // opts.include（rel 白名单）指定要包含的文件；未给则全量。
  const files = selectFiles(scan.files, opts.include);
  if (files.length === 0) {
    throw new Error(`没有选中的文件（请至少勾选一个文件/目录）`);
  }

  const manifest = await buildManifest(host, profile, opts, scan);

  // home 级内容（上一级目录）：用户勾选的全局 skill / 预设等，进 home/ 目录（安装落到 $DSH_HOME 根）。
  const homeDir = opts.home || host.joinPath(profile.dir, '..', '..');
  const homeFiles = (await scanProfile(host, homeDir)).files.filter((f) => !f.rel.startsWith('profiles/'));
  const homeSet = opts.homeInclude instanceof Set ? opts.homeInclude : (opts.homeInclude ? new Set(opts.homeInclude) : null);
  const selectedHome = homeSet ? homeFiles.filter((f) => homeSet.has(f.rel)) : [];

  const entries = {};
  for (const f of files) {
    const data = await host.readFile(f.abs);
    if (!data) continue; // 读不到：跳过
    entries[dspackEntryPath(f.rel)] = data;
  }
  for (const f of selectedHome) {
    const data = await host.readFile(f.abs);
    if (!data) continue;
    entries[`home/${f.rel}`] = data;
  }
  // manifest.json 始终在归档根（契约头，覆盖任何扫描残留）；dspack.json 为容器标记。
  entries['manifest.json'] = encodeText(JSON.stringify(manifest, null, 2) + '\n');
  entries['dspack.json'] = encodeText(JSON.stringify(dspackMarker(DSPACK_CONTAINER_VERSION)) + '\n');

  const bytes = buildDspack(entries);
  const outDir = opts.out ? host.resolvePath(opts.out) : host.cwd();
  const outPath = host.joinPath(outDir, `${manifest.name}-${manifest.version}.dspack`);

  if ((await host.stat(outPath)) != null && !opts.force) {
    throw new Error(`输出文件已存在：${outPath}（使用 --force 覆盖）`);
  }
  await host.mkdir(outDir);
  await host.writeFile(outPath, bytes);

  return {
    manifest,
    output: outPath,
    sha256: await host.sha256(bytes),
    size: bytes.length,
    included: Object.keys(entries).length,
    excluded: scan.excluded.length,
  };
}

/**
 * 一键导出（dshhome）：扫描整个 $DSH_HOME → 识别四类单元 → 生成 manifest v5 → 打包 .dspack（dspack.json version 3）。
 * overrides/ 按 home 相对路径平铺：profiles/、.agent-presets/、skills/、AGENTS.md、data/。
 *
 * @param {Host} host
 * @param {{name: string, dir: string}} home home 根目录
 * @param {object} opts { name, displayName, version, description, author, icon, dshVersion,
 *                        defaultProfile, include, out, force }
 * @returns {Promise<{manifest, output, sha256, size, included, excluded, summary}>}
 */
export async function packHome(host, home, opts = {}) {
  const scan = await scanProfile(host, home.dir);
  if (scan.files.length === 0) {
    throw new Error(`DSH_HOME「${home.name}」没有可打包的文件（全部被过滤或目录为空）`);
  }
  let files = selectFiles(scan.files, opts.include);
  // exclude：黑名单（rel 前缀），供「导出内容」开关排除 skill / preset / 指令 / 数据
  const excludes = opts.exclude ?? [];
  if (excludes.length) {
    files = files.filter((f) => !excludes.some((p) => f.rel === p || f.rel.startsWith(p)));
  }
  if (files.length === 0) {
    throw new Error(`没有选中的文件（请至少勾选一个文件/目录）`);
  }

  // 从扫描结果识别四类单元；web/headless（安装基线）不进包。
  const summary = summarizeHome(files);
  const profiles = [...summary.profiles.keys()]
    .filter((name) => name !== 'web' && name !== 'headless')
    .map((name) => ({ name, dir: host.joinPath(home.dir, 'profiles', name) }));
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

  const entries = {};
  for (const f of files) {
    const data = await host.readFile(f.abs);
    if (!data) continue;
    entries[dspackEntryPath(f.rel)] = data;
  }
  entries['manifest.json'] = encodeText(JSON.stringify(manifest, null, 2) + '\n');
  entries['dspack.json'] = encodeText(JSON.stringify(dspackMarker(DSPACK_CONTAINER_VERSION)) + '\n');

  const bytes = buildDspack(entries);
  const outDir = opts.out ? host.resolvePath(opts.out) : host.cwd();
  const outPath = host.joinPath(outDir, `${manifest.name}-${manifest.version}.dspack`);

  if ((await host.stat(outPath)) != null && !opts.force) {
    throw new Error(`输出文件已存在：${outPath}（使用 --force 覆盖）`);
  }
  await host.mkdir(outDir);
  await host.writeFile(outPath, bytes);

  return {
    manifest,
    output: outPath,
    sha256: await host.sha256(bytes),
    size: bytes.length,
    included: Object.keys(entries).length,
    excluded: scan.excluded.length,
    summary,
  };
}

/**
 * 从扫描文件识别 dshhome 四类单元（相对 $DSH_HOME 根）：
 * - profiles：profiles/<name>/package.json
 * - presets：.agent-presets/<id>/agent.cordis.yml
 * - skills：skills/<name>.md（平铺）或 skills/<name>/SKILL.md（目录 bundle）
 * - instructions：根 AGENTS.md
 */
export function summarizeHome(files) {
  const profiles = new Map();
  const presets = new Map();
  const skills = [];
  const skillNames = new Set();
  let instructions = null;

  for (const f of files ?? []) {
    const rel = String(f.rel || '').replace(/\\/g, '/');
    if (!rel) continue;
    const seg = rel.split('/');

    if (seg[0] === 'profiles' && seg.length >= 3 && seg[2] === 'package.json') {
      profiles.set(seg[1], true);
      continue;
    }
    if (seg[0] === '.agent-presets' && seg.length >= 3 && seg[2] === 'agent.cordis.yml') {
      presets.set(seg[1], `.agent-presets/${seg[1]}`);
      continue;
    }
    if (seg[0] === 'skills') {
      if (seg.length === 2 && seg[1].endsWith('.md')) {
        const name = seg[1].slice(0, -3);
        if (!skillNames.has(name)) { skillNames.add(name); skills.push({ path: `skills/${name}` }); }
      } else if (seg.length >= 3 && seg[2] === 'SKILL.md') {
        if (!skillNames.has(seg[1])) { skillNames.add(seg[1]); skills.push({ path: `skills/${seg[1]}` }); }
      }
      continue;
    }
    if (rel === 'AGENTS.md') instructions = 'AGENTS.md';
  }

  return { profiles, presets, skills, instructions };
}
