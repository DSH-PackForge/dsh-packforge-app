// manifest v4 契约（最新目标规范，见 DSH-PackForge/specs/manifest/v4.md）。
// v4 = v3 全部硬约束（依赖坐标钉死精确版本/commit sha、dshVersion 精确、多语言元数据）
//      + type（"profile" 现行 / "collection" 预留）+ files[]（重内容按需下载清单）。

const ICON_PATTERN = /^icons?\/.+\.(png|jpe?g|webp|ico|svg)$/i;

/**
 * 从 Profile 生成 manifest v4。
 * @param {Host} host 用于读取 package.json 与 cordis.patch.yml
 * @param {{name: string, dir: string}} profile
 * @param {object} opts { name, displayName, version, description, author, icon, dshVersion, profileName, files }
 * @param {{files: Array}} scan 扫描结果（用于图标探测）
 */
export async function buildManifest(host, profile, opts = {}, scan = { files: [] }) {
  const pkg = parseJson(await host.readTextFile(host.joinPath(profile.dir, 'package.json')));
  const name = sanitizeSlug(opts.name || profile.name);
  const version = opts.version || pkg?.version || '1.0.0';
  const displayName = opts.displayName || niceName(pkg?.name) || name;
  const description = opts.description ?? pkg?.description ?? '';
  const author = opts.author || (typeof pkg?.author === 'string' ? pkg.author : '') || '';
  // v4：dshVersion 必须是精确版本号（如 0.1.1-rc.2）。导出侧由扫描器注入；缺省置空可被导入端兜底。
  const dshVersion = opts.dshVersion || '';
  const icon = opts.icon || findIcon(scan.files) || '';
  const patch = (await host.readTextFile(host.joinPath(profile.dir, 'cordis.patch.yml'))) ?? '';

  return {
    manifestVersion: 4,
    type: 'profile',
    name,
    version,
    displayName,
    description,
    author,
    icon,
    dshVersion,
    profileName: opts.profileName || profile.name,
    bundles: extractBundles(pkg),
    dependencies: await coordinatesFromProfileDeps(host, profile.dir, pkg?.dependencies),
    patch,
    files: opts.files ?? [],
  };
}

/** 有序层栈：dsh.profile.bundles 原文顺序，去重，只留字符串。 */
export function extractBundles(pkg) {
  const bundles = pkg?.dsh?.profile?.bundles;
  if (!Array.isArray(bundles)) return [];
  const seen = new Set();
  const out = [];
  for (const b of bundles) {
    if (typeof b === 'string' && b.trim() && !seen.has(b)) {
      seen.add(b);
      out.push(b);
    }
  }
  return out;
}

/** 版本化依赖：package.json.dependencies 原文拷贝。 */
export function extractDependencies(pkg) {
  const deps = pkg?.dependencies;
  if (!deps || typeof deps !== 'object' || Array.isArray(deps)) return {};
  return { ...deps };
}

/** 规范化 slug：小写、非 [a-z0-9-] 转 -、合并连续 -。 */
export function sanitizeSlug(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** 展示名美化：去掉 DSH Profile 包名前缀。 */
function niceName(raw) {
  if (!raw) return '';
  return String(raw).replace(/^dsh-profile-/, '').replace(/^dsh-/, '');
}

function findIcon(files) {
  for (const f of files) {
    const rel = (f.rel || '').replace(/\\/g, '/');
    if (ICON_PATTERN.test(rel)) return rel;
  }
  for (const f of files) {
    const rel = (f.rel || '').replace(/\\/g, '/');
    if (/^logo\.[a-z0-9]+$/i.test(rel)) return rel;
  }
  return '';
}

function parseJson(raw) {
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------------------
 * 坐标转换（v3 §5，v4 原样继承）
 * manifest 形式「坐标 → 固定版本」 ⇄ package.json 形式「包名 → pnpm spec」
 * ------------------------------------------------------------------------- */

/**
 * 正向：坐标 → package.json 依赖（导入/安装侧使用）。
 *   "dsh-pet": "0.2.0"                              → "dsh-pet": "0.2.0"
 *   "github:owner/repo": "<sha>"                    → "repo": "github:owner/repo#<sha>"
 *   "github:owner/repo#path:/pkg": "<sha>"          → "pkg": "github:owner/repo#<sha>&path:pkg"
 */
export function coordsToPkgDeps(dependencies) {
  const out = {};
  for (const [coord, version] of Object.entries(dependencies ?? {})) {
    const git = parseGitCoord(coord);
    if (git) {
      out[git.name] =
        `github:${git.owner}/${git.repo}#${version}` + (git.subpath ? `&path:${git.subpath}` : '');
    } else {
      out[coord] = version; // npm 精确版本，原样保留
    }
  }
  return out;
}

/** 解析 manifest 侧的 git 坐标：'github:owner/repo' 或 'github:owner/repo#path:/子目录'。 */
export function parseGitCoord(coord) {
  if (typeof coord !== 'string' || !coord.startsWith('github:')) return null;
  const rest = coord.slice('github:'.length); // 'owner/repo' 或 'owner/repo#path:/pkg'
  const hash = rest.indexOf('#path:/');
  const repoPart = hash >= 0 ? rest.slice(0, hash) : rest;
  const subpath = hash >= 0 ? rest.slice(hash + '#path:/'.length) : '';
  const slash = repoPart.indexOf('/');
  if (slash <= 0) return null;
  return { owner: repoPart.slice(0, slash), repo: repoPart.slice(slash + 1), subpath, name: subpath || repoPart.slice(slash + 1) };
}

/**
 * 反向：package.json 依赖 → 坐标（导出侧使用）。
 *   "dsh-pet": "0.2.0"                            → "dsh-pet": "0.2.0"
 *   "repo": "github:owner/repo#<sha>"             → "github:owner/repo": "<sha>"
 *   "pkg": "github:owner/repo#<sha>&path:pkg"     → "github:owner/repo#path:/pkg": "<sha>"
 */
export function pkgDepsToCoords(dependencies) {
  const out = {};
  for (const [pkgName, spec] of Object.entries(dependencies ?? {})) {
    const git = parsePkgGitSpec(spec);
    if (git) {
      out[`github:${git.owner}/${git.repo}${git.subpath ? `#path:/${git.subpath}` : ''}`] = git.sha;
    } else {
      out[pkgName] = spec; // 暂不订死范围（导出侧 M1 用 node_modules 实测版本钉精确）
    }
  }
  return out;
}

const EXACT_SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;

/** 是否已是「精确版本」（无 ^ ~ > = 等前缀）。 */
export function isExactSemver(v) {
  return typeof v === 'string' && EXACT_SEMVER.test(v.trim());
}

/**
 * 生成 v4 dependencies（坐标→固定版本）：
 * - git 依赖：commit sha 优先取 package.json 的 `#sha`，缺则从 pnpm-lock.yaml 的 resolution.commit 补齐，
 *   仍缺则抛错（v3/v4 要求 git 依赖钉死 sha，静默写空会产出非法 manifest）；
 * - npm 依赖若仍是范围（^/~ 等），读 node_modules/<name>/package.json 的实测版本钉精确。
 */
export async function coordinatesFromProfileDeps(host, dir, deps) {
  if (!deps || typeof deps !== 'object' || Array.isArray(deps)) return {};
  const lockText = await host.readTextFile(host.joinPath(dir, 'pnpm-lock.yaml'));
  const out = {};
  for (const [pkgName, spec] of Object.entries(deps)) {
    const git = parsePkgGitSpec(spec);
    if (git) {
      const sha = git.sha || gitCommitFromLock(lockText, pkgName);
      if (!sha) {
        throw new Error(
          `git 依赖「${pkgName}」缺少 commit sha：请把 package.json 的版本写成 ${typeof spec === 'string' ? spec : '#<commit-sha>'}#<commit-sha>` +
            `，或先执行 pnpm install 生成 pnpm-lock.yaml 再导出`,
        );
      }
      out[`github:${git.owner}/${git.repo}${git.subpath ? `#path:/${git.subpath}` : ''}`] = sha;
      continue;
    }
    if (typeof spec === 'string' && spec && !isExactSemver(spec)) {
      const v = await readInstalledVersion(host, host.joinPath(dir, 'node_modules', pkgName, 'package.json'));
      out[pkgName] = v ?? spec;
    } else {
      out[pkgName] = spec;
    }
  }
  return out;
}

/**
 * 从 pnpm-lock.yaml 解析某 git 依赖的 commit sha（40 位十六进制）。
 * 扫描 `packages:` 区块内 `pkgName@…` 条目，取其 resolution.commit；找不到返回 null。
 */
export function gitCommitFromLock(text, pkgName) {
  if (!text || !pkgName) return null;
  const lines = String(text).split(/\r?\n/);
  let inPackages = false;
  let active = -1; // 目标条目的 key 缩进；-1 = 不在目标条目内
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!inPackages) {
      if (/^packages:\s*$/.test(trimmed)) inPackages = true;
      continue;
    }
    const indent = line.length - line.trimStart().length;
    if (trimmed.endsWith(':') && indent === 0) {
      if (/^packages:\s*$/.test(trimmed)) { active = -1; continue; }
      break; // 顶层区块（snapshots: 等）→ packages 结束
    }
    const key = line.match(/^\s*([^:]+):\s*$/);
    if (key) {
      const k = key[1].replace(/^["']|["']$/g, '');
      if (k === pkgName || k.startsWith(`${pkgName}@`)) {
        active = indent;
      } else if (active >= 0 && indent <= active) {
        active = -1;
      }
      continue;
    }
    if (active >= 0) {
      const cm = line.match(/\bcommit:\s*['"]?([0-9a-f]{40})['"]?/);
      if (cm) return cm[1];
    }
  }
  return null;
}

async function readInstalledVersion(host, pkgPath) {
  const pkg = parseJson(await host.readTextFile(pkgPath));
  return typeof pkg?.version === 'string' ? pkg.version : null;
}

/** 解析 package.json 侧的 git spec：github:owner/repo#sha[&path:pkg] 或 git+https://github.com/...  */
export function parsePkgGitSpec(spec) {
  if (typeof spec !== 'string') return null;

  let body = spec;
  if (body.startsWith('github:')) {
    body = body.slice('github:'.length); // 'owner/repo#sha[&path:pkg]'
    let subpath = '';
    const amp = body.indexOf('&path:');
    if (amp >= 0) {
      subpath = body.slice(amp + '&path:'.length);
      body = body.slice(0, amp);
    }
    const hash = body.indexOf('#');
    const repoPart = hash >= 0 ? body.slice(0, hash) : body;
    const sha = hash >= 0 ? body.slice(hash + 1) : '';
    const slash = repoPart.indexOf('/');
    if (slash <= 0) return null;
    return { owner: repoPart.slice(0, slash), repo: repoPart.slice(slash + 1), subpath, sha };
  }

  const m = spec.match(
    /^(?:git\+)?https?:\/\/(?:www\.)?github\.com\/([^/#]+)\/([^/#]+?)(?:\.git)?(?:#([^&]+))?(?:&path:([^#]+))?$/,
  );
  if (m) {
    return { owner: m[1], repo: m[2], subpath: m[4] || '', sha: m[3] || '' };
  }
  return null;
}

/* ---------------------------------------------------------------------------
 * 校验
 * ------------------------------------------------------------------------- */

/**
 * manifest v4 结构校验，返回错误信息数组（空数组 = 合法）。
 * 仅接受 manifestVersion 4；type 仅接受 'profile'（'collection' 预留报「暂未支持」）。
 */
export function validateManifest(m) {
  const errors = [];
  if (!m || typeof m !== 'object' || Array.isArray(m)) return ['manifest.json 缺失或不是对象'];

  if (m.manifestVersion !== 4) {
    if (m.manifestVersion === 3 || m.manifestVersion === 2) {
      errors.push(`manifestVersion 为 ${m.manifestVersion}（旧版 .tgz 格式），本工具仅安装 v4(.dspack) 整合包`);
    } else {
      errors.push('manifestVersion 必须为 4');
    }
  }
  if (m.type !== undefined && m.type !== 'profile') {
    errors.push('type 仅支持 "profile"（collection 为预留值，暂未支持）');
  }
  if (typeof m.name !== 'string' || !m.name.trim()) errors.push('manifest.name 缺失或为空');
  if (typeof m.version !== 'string' || !m.version.trim()) errors.push('manifest.version 缺失或为空');
  if (!Array.isArray(m.bundles) || m.bundles.some((b) => typeof b !== 'string')) {
    errors.push('manifest.bundles 必须是字符串数组');
  }
  if (typeof m.dependencies !== 'object' || m.dependencies === null || Array.isArray(m.dependencies)) {
    errors.push('manifest.dependencies 必须是对象');
  } else {
    for (const [k, v] of Object.entries(m.dependencies)) {
      if (typeof v !== 'string' || !v) errors.push(`dependencies[${k}] 必须是「坐标 → 固定版本」字符串`);
    }
  }
  if (m.patch !== undefined && typeof m.patch !== 'string') errors.push('manifest.patch 必须是字符串');
  if (m.dshVersion !== undefined && typeof m.dshVersion !== 'string') errors.push('manifest.dshVersion 必须是字符串');
  for (const f of ['displayName', 'description']) {
    if (m[f] !== undefined && !isLocaleString(m[f])) errors.push(`manifest.${f} 必须是字符串或多语言对象`);
  }
  if (m.files !== undefined) {
    if (!Array.isArray(m.files)) {
      errors.push('manifest.files 必须是数组');
    } else {
      m.files.forEach((f, i) => {
        for (const e of validateFileEntry(f)) errors.push(`files[${i}] ${e}`);
      });
    }
  }
  return errors;
}

/** files[] 单条校验（v4 §3：path/sha256/size/urls[]）。 */
export function validateFileEntry(f) {
  const errors = [];
  if (!f || typeof f !== 'object' || Array.isArray(f)) return ['不是对象'];
  if (typeof f.path !== 'string' || !f.path || f.path.startsWith('/') || /^[a-zA-Z]:/.test(f.path)) {
    errors.push('path 必须是相对路径（"+"分隔，不以盘符/斜杠开头）');
  }
  if (typeof f.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(f.sha256)) {
    errors.push('sha256 必须是 64 位十六进制');
  }
  if (typeof f.size !== 'number' || !Number.isInteger(f.size) || f.size <= 0) {
    errors.push('size 必须是正整数');
  }
  if (!Array.isArray(f.urls) || f.urls.length === 0 || f.urls.some((u) => typeof u !== 'string' || !/^https?:\/\//i.test(u))) {
    errors.push('urls 必须是非空数组，且每项是 http(s) 地址');
  }
  return errors;
}

/** displayName/description 的 string|map 判定。 */
export function isLocaleString(v) {
  if (typeof v === 'string') return true;
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const keys = Object.keys(v);
    return keys.length > 0 && keys.every((k) => typeof k === 'string' && k !== '' && typeof v[k] === 'string');
  }
  return false;
}

/** 按界面语言解析多语言元数据：字符串原样，map 按 locale → en-US → zh-CN → 首项回退。 */
export function resolveLocale(value, locale) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    if (locale && typeof value[locale] === 'string') return value[locale];
    if (typeof value['en-US'] === 'string') return value['en-US'];
    if (typeof value['zh-CN'] === 'string') return value['zh-CN'];
    for (const k of Object.keys(value)) {
      if (typeof value[k] === 'string') return value[k];
    }
  }
  return '';
}