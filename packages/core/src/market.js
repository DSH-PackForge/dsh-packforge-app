/**
 * 市场索引读取（宿主无关：Electron GUI 与 DSH 客户端插件共用）。
 * - 兼容现行索引（schemaVersion 1，`modpacks[]`，单 `downloadUrl`+`sha256`+`size`）；
 * - 兼容后续 `files[]` 指针式与 `format`/`manifestVersion` 扩展；
 * - 从下载地址/版本号自动判别 `.dspack`(v4) 与 `.tgz`(v3) 旧格式。
 */

/** 读取本地/URL 拉取的 index.json，返回归一化后的市场条目列表。 */
export async function readMarketIndex(host, indexPath) {
  const text = await host.readTextFile(host.resolvePath(indexPath));
  const index = parseJson(text);
  const raw = Array.isArray(index?.modpacks) ? index.modpacks : Array.isArray(index?.packs) ? index.packs : [];
  return {
    schemaVersion: index?.schemaVersion ?? 1,
    generatedAt: index?.generatedAt ?? null,
    packs: raw.map((e) => normalizeMarketPack(e)).filter(Boolean),
  };
}

/** 归一化一条市场条目；不可识别返回 null。 */
export function normalizeMarketPack(entry, locale = 'zh-CN') {
  if (!entry || typeof entry.name !== 'string') return null;
  const urls = collectUrls(entry);
  return {
    name: entry.name,
    displayName: pickLocale(entry.displayName, locale, entry.name),
    description: pickLocale(entry.description, locale, ''),
    version: entry.version ?? '',
    author: entry.author ?? '',
    icon: pickLocale(entry.icon, locale, ''),
    dshVersion: entry.dshVersion ?? '',
    profileName: entry.profileName ?? entry.name,
    category: entry.category ?? '',
    updatedAt: entry.updatedAt ?? '',
    manifestVersion: entry.manifestVersion ?? inferManifestVersion(urls),
    format: detectFormat(entry, urls),
    urls,
    downloadUrl: urls[0] ?? '',
    sha256: entry.sha256 ?? entry.files?.[0]?.sha256 ?? '',
    size: entry.size ?? entry.files?.[0]?.size ?? 0,
    bundles: entry.bundles ?? [],
    dependencies: entry.dependencies ?? {},
  };
}

function collectUrls(entry) {
  if (Array.isArray(entry.files) && entry.files.length) {
    const out = [];
    for (const f of entry.files) for (const u of f.urls ?? []) out.push(u);
    if (out.length) return out;
  }
  return entry.downloadUrl ? [entry.downloadUrl] : [];
}

function detectFormat(entry, urls) {
  if (urls.some((u) => /\.dspack(\?|#|$)/i.test(u))) return 'dspack';
  if (urls.some((u) => /\.tgz(\?|#|$)/i.test(u))) return 'tgz';
  if (entry.manifestVersion === 4) return 'dspack';
  if (entry.manifestVersion === 3) return 'tgz';
  return 'unknown';
}

function inferManifestVersion(urls) {
  if (urls.some((u) => /\.dspack/i.test(u))) return 4;
  if (urls.some((u) => /\.tgz/i.test(u))) return 3;
  return 0;
}

function pickLocale(map, locale, fallback) {
  if (typeof map === 'string' && map) return map;
  if (map && typeof map === 'object') {
    if (typeof map[locale] === 'string') return map[locale];
    const first = Object.values(map).find((v) => typeof v === 'string');
    if (first) return first;
  }
  return fallback ?? '';
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}