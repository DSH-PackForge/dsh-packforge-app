import { parseDspack, decodeText } from './dspack.js';
import { validateManifest, coordsToPkgDeps, sanitizeSlug } from './manifest.js';

/**
 * 一键安装：读取本地/URL 的 .dspack → 校验头 & manifest v4 → overrides/ 落盘 →
 * 重建 package.json（坐标→依赖）→ pnpm install → files[] 按需下载校验 → 对账。
 * 任一环节失败：删除 profile 目录整体回滚。
 *
 * 安全要点：
 * - .dspack 为标准 ZIP，格式合法性由 parseDspack（解压）与 manifest v4 校验共同保证；
 * - overrides/ 与 files[].path 的相对路径禁用 `..` 段（防逃逸）；
 * - target 名经 sanitizeSlug 规范化；同名 Profile 无 --force 时报错；
 * - 指定 expectedSha256/expectedSize 时先做完整性校验。
 *
 * @param {Host} host
 * @param {object} opts { source, profilesRoot?, name?, registry?, force?, noInstall?, dryRun?, expectedSha256?, expectedSize? }
 * @returns {Promise<{profileName, dir, manifest, dryRun, installed, reconcile, filesDownloaded}>}
 */
export async function installPack(host, opts = {}) {
  const { source } = opts;
  if (!source) throw new Error('请指定要安装的整合包（本地 .dspack 路径或 URL）');

  const profilesRoot = opts.profilesRoot || host.joinPath(host.homedir(), '.dsh', 'profiles');
  const { path: packPath, tempDir } = await resolvePackSource(host, source);

  try {
    await verifyIntegrity(host, packPath, opts);

    const bytes = await host.readFile(packPath);
    if (!bytes) throw new Error('无法读取整合包文件');
    const { entries } = parseDspack(bytes);

    if (!entries['manifest.json']) throw new Error('整合包缺少 manifest.json（不是有效的 .dspack）');
    const manifest = parseJson(decodeText(entries['manifest.json']));
    const errors = validateManifest(manifest);
    if (errors.length) throw new Error(`整合包不合法：${errors.join('；')}`);

    const profileName = sanitizeSlug(opts.name || manifest.profileName || manifest.name);
    if (!profileName) throw new Error('无法确定 Profile 名称');
    const target = host.joinPath(profilesRoot, profileName);

    if ((await host.stat(target)) != null && !opts.force) {
      throw new Error(`Profile「${profileName}」已存在：${target}（使用 --force 覆盖）`);
    }

    if (opts.dryRun) {
      return { profileName, dir: target, manifest, dryRun: true, installed: false, reconcile: null, filesDownloaded: 0 };
    }

    if ((await host.stat(target)) != null) {
      await host.rm(target, { recursive: true, force: true });
    }
    await host.mkdir(target);

    try {
      await materializePackage(host, target, manifest, entries);

      let installed = false;
      let reconcile = null;
      if (!opts.noInstall) {
        installed = true;
        await pnpmInstall(host, target, opts, !!entries['pnpm-lock.yaml']);
        reconcile = await reconcileProfile(host, target, manifest);
        if (reconcile.missing.length > 0) {
          throw new Error(
            `整合包层栈有 ${reconcile.missing.length} 个 bundle 无法解析为补丁层：` +
              `${reconcile.missing.join(', ')}。这些包未声明 dsh.bundle.patch，属于无效的整合包。`,
          );
        }
      }

      const filesDownloaded = await downloadFiles(host, target, manifest.files ?? []);

      return { profileName, dir: target, manifest, dryRun: false, installed, reconcile, filesDownloaded };
    } catch (e) {
      await host.rm(target, { recursive: true, force: true }).catch(() => {});
      throw e;
    }
  } finally {
    if (tempDir) await host.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

/* ------------------------------------------------------------------ */

/** 把「本地路径 | http(s) URL」统一解析为本地文件路径；URL 会下载到临时目录（调用方负责清理返回的 tempDir）。 */
export async function resolvePackSource(host, source) {
  if (/^https?:\/\//i.test(source)) {
    const tempDir = await host.mkdtemp('dspack-dl-');
    const dest = host.joinPath(tempDir, 'pack.dspack');
    await host.download(source, dest);
    return { path: dest, tempDir };
  }
  const local = host.resolvePath(source);
  const st = await host.stat(local);
  if (!st?.isFile) throw new Error(`找不到整合包文件：${local}`);
  return { path: local, tempDir: null };
}

/** 完整性校验（可选，来自市场索引的 sha256/size）。 */
export async function verifyIntegrity(host, packPath, opts = {}) {
  if (opts.expectedSize != null) {
    const st = await host.stat(packPath);
    if (!st || st.size !== opts.expectedSize) {
      throw new Error(`大小不符：期望 ${opts.expectedSize} 字节，实际 ${st?.size ?? '未知'}`);
    }
  }
  if (opts.expectedSha256) {
    const actual = await host.sha256File(packPath);
    if (actual !== opts.expectedSha256.toLowerCase()) {
      throw new Error(`sha256 校验失败（可能被篡改）：期望 ${opts.expectedSha256}，实际 ${actual}`);
    }
  }
}

async function materializePackage(host, dir, manifest, entries) {
  // 1) overrides/* → profile 根
  for (const [entryPath, data] of Object.entries(entries)) {
    if (!entryPath.startsWith('overrides/')) continue;
    const rel = safeRel(entryPath.slice('overrides/'.length));
    if (!rel) continue;
    await host.writeFile(host.joinPath(dir, rel), data);
  }

  // 2) package.json：以 manifest 为唯一事实源重建 dependencies / bundles；保留快照其余字段
  const base = parseJson(decodeText(entries['package.json'] || new Uint8Array())) ?? {};
  const pkg = base && typeof base === 'object' && !Array.isArray(base) ? base : {};
  pkg.dependencies = coordsToPkgDeps(manifest.dependencies ?? {});
  pkg.dsh = { ...(pkg.dsh ?? {}), profile: { ...(pkg.dsh?.profile ?? {}), bundles: manifest.bundles ?? [] } };
  await host.writeTextFile(host.joinPath(dir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

  // 3) pnpm 设置 / 锁文件快照（根机器文件，可选）
  for (const name of ['pnpm-workspace.yaml', 'pnpm-lock.yaml']) {
    if (entries[name]) await host.writeFile(host.joinPath(dir, name), entries[name]);
  }

  // 4) cordis.patch.yml：overrides 已优先落地；缺则回退 manifest.patch
  const patchPath = host.joinPath(dir, 'cordis.patch.yml');
  if ((await host.stat(patchPath)) == null && typeof manifest.patch === 'string') {
    await host.writeTextFile(patchPath, manifest.patch);
  }
}

async function pnpmInstall(host, target, opts, frozen) {
  const args = ['install'];
  if (frozen) args.push('--frozen-lockfile');
  if (opts.registry) args.push('--registry', opts.registry);
  let r = await host.exec('pnpm', args, { cwd: target });
  // frozen-lockfile 失配时回退普通安装（v3/v4 导入语义）
  if (frozen && r.status !== 0) {
    r = await host.exec('pnpm', ['install', ...(opts.registry ? ['--registry', opts.registry] : [])], { cwd: target });
  }
  if (r.error) throw new Error(`pnpm install 执行失败：${r.error}`);
  if (r.status !== 0) throw new Error(`pnpm install 失败（退出码 ${r.status ?? '未知'}）`);
}

/** files[] 重内容：每个 url 依次尝试下载 → sha256+size 校验 → 落到 path。 */
async function downloadFiles(host, target, files) {
  let count = 0;
  const tmp = await host.mkdtemp('dspack-files-');
  try {
    for (const f of files ?? []) {
      const rel = safeRel(f.path);
      const tmpFile = host.joinPath(tmp, `dl-${count}`);
      let ok = false;
      let lastErr = null;
      for (const url of f.urls) {
        try {
          await host.download(url, tmpFile);
          ok = true;
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!ok) throw new Error(`files[] 下载失败：${rel}（${lastErr?.message ?? '无可用源'}）`);

      const sha = await host.sha256File(tmpFile);
      const st = await host.stat(tmpFile);
      if (sha !== String(f.sha256).toLowerCase() || (st?.size ?? -1) !== f.size) {
        throw new Error(`files[] 完整性校验失败：${rel}`);
      }
      await host.move(tmpFile, host.joinPath(target, rel));
      count += 1;
    }
    return count;
  } finally {
    await host.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * 安装后对账（v4 沿用 DSH 语义：Bundle 唯一判据 = dsh.bundle.patch 声明存在）。
 * @returns {{ missing: string[], added: string[] }}
 *   - missing：层栈中「同时是依赖」的包，装完无 dsh.bundle.patch → 无效，需回滚；
 *   - added：依赖里声明了 dsh.bundle.patch 却未进层栈 → 自动补进（调用方需写回 manifests）。
 */
export async function reconcileProfile(host, profileDir, manifest) {
  const missing = [];
  const added = [];
  const pkgDeps = coordsToPkgDeps(manifest.dependencies ?? {});
  const bundles = [...(manifest.bundles ?? [])];

  for (const name of bundles) {
    if (!Object.hasOwn(pkgDeps, name)) continue; // 模板型 bundle：由 DSH 安装目录 fallback 兜底
    const pkg = await readJson(host, host.joinPath(profileDir, 'node_modules', name, 'package.json'));
    if (!pkg || pkg.dsh?.bundle?.patch === undefined) missing.push(name);
  }
  for (const name of Object.keys(pkgDeps)) {
    const pkg = await readJson(host, host.joinPath(profileDir, 'node_modules', name, 'package.json'));
    if (pkg && pkg.dsh?.bundle?.patch !== undefined && !bundles.includes(name)) {
      bundles.push(name);
      added.push(name);
    }
  }
  return { missing, added };
}

/* ------------------- 工具 ------------------- */

function parseJson(raw) {
  if (raw == null || raw === '') return null;
  try {
    return raw instanceof Uint8Array ? JSON.parse(decodeText(raw)) : JSON.parse(raw);
  } catch {
    return null;
  }
}

async function readJson(host, p) {
  return parseJson(await host.readTextFile(p));
}

/** 归一化相对路径并拒绝危险段（防路径穿越）。 */
function safeRel(rel) {
  const r = String(rel).replace(/\\/g, '/');
  if (!r || r.startsWith('/') || /^[a-zA-Z]:/.test(r)) throw new Error(`非法相对路径：${rel}`);
  if (r.split('/').includes('..')) throw new Error(`路径含危险段 '..'：${rel}`);
  return r;
}