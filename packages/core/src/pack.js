import { scanProfile, selectFiles } from './scan.js';
import { buildManifest } from './manifest.js';
import { buildDspack, encodeText } from './dspack.js';

// .dspack（pack-structure v2）布局：根只放机器文件；其余用户文件进 overrides/。
const ROOT_MACHINE = new Set(['package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml']);

/** 把扫描出的相对路径映射为归档内条目名。 */
export function dspackEntryPath(rel) {
  const r = String(rel).replace(/\\/g, '/');
  return ROOT_MACHINE.has(r) ? r : `overrides/${r}`;
}

/**
 * 一键导出：扫描 Profile → 生成 manifest v4 → 打包 .dspack。
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

  const entries = {};
  for (const f of files) {
    const data = await host.readFile(f.abs);
    if (!data) continue; // 读不到：跳过
    entries[dspackEntryPath(f.rel)] = data;
  }
  // manifest.json 始终在归档根（契约头，覆盖任何扫描残留）
  entries['manifest.json'] = encodeText(JSON.stringify(manifest, null, 2) + '\n');

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