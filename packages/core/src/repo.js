// 导出「源仓库」（v4 源形态）：把 Profile 物化为可二次开发 / 重打包的目录。
// 三档内容（opts.content）：
//   - manifest：仅清单（manifest.json）
//   - readme  ：清单 + README.md
//   - full    ：全套（机器文件 + overrides/ + .dspackignore + release/）
// 布局遵循 pack-structure v2：机器文件进根目录，其余用户文件进 overrides/。
import { scanProfile } from './scan.js';
import { buildManifest, resolveLocale } from './manifest.js';
import { dspackEntryPath } from './pack.js';

/** 合法内容档。 */
export const REPO_CONTENT_LEVELS = ['manifest', 'readme', 'full'];

/** 内容档 → 中文标签（GUI/CLI 展示）。 */
export const REPO_CONTENT_LABEL = {
  manifest: '仅清单（manifest.json）',
  readme: '清单 + README',
  full: '全套文件（overrides/ + release/）',
};

/**
 * 导出源仓库。
 * @param {Host} host
 * @param {{name:string,dir:string}} profile
 * @param {object} opts { out?, content?, displayName?, dshVersion?, ...其余透传 buildManifest }
 * @returns {Promise<{dir,manifest,content,written:string[],readme:string,ignored:string}>}
 */
export async function exportRepo(host, profile, opts = {}) {
  const content = REPO_CONTENT_LEVELS.includes(opts.content) ? opts.content : 'full';
  const scan = await scanProfile(host, profile.dir);
  const manifest = await buildManifest(host, profile, opts, scan);

  const parent = opts.out ? host.resolvePath(opts.out) : host.cwd();
  const repoDir = host.joinPath(parent, `${manifest.name}-${manifest.version}`);
  await host.mkdir(parent);

  const written = [];
  const writeText = async (name, body) => {
    await host.writeTextFile(host.joinPath(repoDir, name), body);
    written.push(name);
  };

  // 1) 清单（所有档）
  await writeText('manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);

  // 2) README（readme / full）
  const readme = content === 'manifest' ? '' : renderReadme(manifest, scan);
  if (content !== 'manifest') await writeText('README.md', readme);

  // 3) 全套（full）
  let ignored = '';
  if (content === 'full') {
    ignored = renderDspackIgnore();
    await writeText('.dspackignore', ignored);
    for (const f of scan.files) {
      const data = await host.readFile(f.abs);
      if (!data) continue;
      const dest = dspackEntryPath(f.rel); // 机器文件→根；其余→overrides/
      await host.writeFile(host.joinPath(repoDir, ...dest.split('/')), data);
      written.push(dest);
    }
    await host.mkdir(host.joinPath(repoDir, 'release'));
    written.push('release/');
  }

  return { dir: repoDir, manifest, content, written, readme, ignored };
}

/**
 * 生成 README.md（markdown）。描述来源为 manifest v4（displayName/description 支持 i18n map）。
 * @param {object} m manifest v4
 * @param {{files:Array,excluded:Array}} scan 扫描结果（用于文件清单段落）
 */
export function renderReadme(m, scan = { files: [], excluded: [] }) {
  const disp = resolveLocale(m.displayName, 'zh-CN') || m.name;
  const desc = resolveLocale(m.description, 'zh-CN');
  const bundles = (m.bundles ?? []).map((b) => `- \`${b}\``).join('\n') || '（无）';
  const deps = Object.entries(m.dependencies ?? {})
    .map(([k, v]) => `- \`${k}\` @ \`${v}\``)
    .join('\n') || '（无）';

  return [
    `# ${disp}`,
    '',
    desc || '（无描述）',
    '',
    `> 由 DSH PackForge 生成 · manifest v${m.manifestVersion} · type=${m.type || 'profile'}`,
    '',
    '## 元信息',
    '',
    '| 字段 | 值 |',
    '| --- | --- |',
    `| 整合包 | \`${m.name}\` v\`${m.version}\` |`,
    `| DSH 版本 | ${m.dshVersion ? `\`${m.dshVersion}\`` : '未钉定（安装端兜底）'} |`,
    `| 作者 | ${m.author || '—'} |`,
    `| 层栈 | ${(m.bundles ?? []).length} 个 bundle |`,
    `| 依赖 | ${Object.keys(m.dependencies ?? {}).length} 个 |`,
    '',
    '## 层栈（bundles）',
    '',
    bundles,
    '',
    '## 依赖（坐标 → 固定版本）',
    '',
    deps,
    '',
    '## 文件清单',
    '',
    `源 Profile 共 ${scan.files?.length ?? 0} 个文件（排除 ${scan.excluded?.length ?? 0} 个命中规则项）。`,
    '打包时机器文件（`package.json` / `pnpm-workspace.yaml` / `pnpm-lock.yaml`）进根目录，其余进 `overrides/`。',
    '',
    '## 使用',
    '',
    '- 分发：重打包生成 `.dspack`（产物输出到 `release/`）',
    `- 安装：\`dspack install release/${m.name}-${m.version}.dspack\``,
    '',
  ].join('\n');
}

/**
 * 生成 .dspackignore（gitignore 风格）——与引擎安全规则 security.js 对齐，
 * 另追加仓库自身不入包项（.git/ / release/ / .dspackignore / README.md）。
 */
export function renderDspackIgnore() {
  return [
    '# DSH PackForge 打包忽略规则（自动生成；与引擎安全规则 security.js 对齐）',
    '# 重打包为 .dspack 时，命中以下模式的文件/目录不会进入整合包。',
    '',
    '# --- 依赖与构建产物 ---',
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '.cache/',
    '.turbo/',
    '.pnpm-store/',
    '',
    '# --- 自动生成的 DSH 配置（安装时由层栈 + patch 重新合成） ---',
    'cordis.yml',
    '',
    '# --- 打包产物（防嵌套） ---',
    'manifest.json',
    '*.dspack',
    '*.tgz',
    '*.tar.gz',
    '*.zip',
    '',
    '# --- 其它包管理器锁文件（DSH 固定使用 pnpm） ---',
    'package-lock.json',
    'yarn.lock',
    '',
    '# --- 日志 ---',
    'npm-debug.log',
    'pnpm-debug.log',
    '',
    '# --- 敏感文件 ---',
    '.env',
    '.env.*',
    '.npmrc',
    '.netrc',
    '.yarnrc',
    '.yarnrc.yml',
    '.pypirc',
    '.npmignore',
    '*.key',
    '*.pem',
    '*.p12',
    '*.pfx',
    '*.crt',
    '*.der',
    '*.asc',
    '*.credentials',
    'credentials*.yml',
    'id_rsa*',
    'id_ed25519*',
    'id_ecdsa*',
    'id_ed448*',
    'id_dsa*',
    'secrets*.json',
    'secrets*.yml',
    '*api_key*',
    '*token*',
    '',
    '# --- 仓库自身（不入包） ---',
    '.git/',
    '.dspackignore',
    'release/',
    'README.md',
    '',
  ].join('\n');
}