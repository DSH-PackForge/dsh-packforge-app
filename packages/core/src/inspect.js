import { scanProfile } from './scan.js';
import { buildManifest } from './manifest.js';
import { validateManifest } from './manifest.js';
import { parseDspack, decodeText } from './dspack.js';

/** 干跑检查：返回扫描结果 + manifest v4 预览，不写任何文件。 */
export async function inspectProfile(host, profile, opts = {}) {
  const scan = await scanProfile(host, profile.dir);
  const manifest = await buildManifest(host, profile, opts, scan);
  return { profile, ...scan, manifest };
}

/**
 * 查看一个已有的 `.dspack` 整合包（不解压到磁盘）：容器版本、全包 sha256/size、
 * manifest v4 校验结果、根机器文件 / overrides/ / 其它条目的目录树。
 * 供 GUI「查看整合包」与 CLI `view` 复用；纯内存，宿主无关。
 *
 * @param {Host} host
 * @param {string|Uint8Array} source 本地 .dspack 路径或已在内存中的字节
 * @returns {Promise<{sha256,size,valid,validation,manifest,machine,overrides,other,totalEntries}>}
 */
export async function inspectPack(host, source) {
  const bytes = source instanceof Uint8Array ? source : await host.readFile(host.resolvePath(source));
  if (!bytes) throw new Error('无法读取整合包文件');
  const { entries } = parseDspack(bytes);

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
  const other = [];
  for (const [p, data] of Object.entries(entries)) {
    if (p === 'manifest.json') continue;
    const size = data?.byteLength ?? data?.length ?? 0;
    const rec = { path: p, size };
    if (p === 'package.json' || p === 'pnpm-workspace.yaml' || p === 'pnpm-lock.yaml') machine.push(rec);
    else if (p.startsWith('overrides/')) overrides.push(rec);
    else other.push(rec);
  }
  const byPath = (a, b) => a.path.localeCompare(b.path);
  machine.sort(byPath);
  overrides.sort(byPath);
  other.sort(byPath);

  return {
    sha256: await host.sha256(bytes),
    size: bytes.byteLength,
    valid: validation.length === 0,
    validation,
    manifest,
    machine,
    overrides,
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