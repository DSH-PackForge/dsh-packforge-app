// 打包安全规则：决定哪些文件绝不能进入整合包（overrides/ 与根机器文件同样适用）。
// 规则分四类：精确名称（匹配任意路径段）、扩展名、文件名正则、相对路径正则。
// 移植自旧版 CLI 的 security 规则，并随 `.dspack` 格式追加嵌套压缩包排除。

/** 任何路径段命中即排除（依赖、构建产物、生成配置、敏感文件） */
const DENY_EXACT = new Set([
  // 依赖与构建产物
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.cache',
  '.turbo',
  '.pnpm-store',
  // 自动生成的 DSH 配置文件（安装时由 bundles + patch 重新合成）
  'cordis.yml',
  // 打包产物（防嵌套）
  'manifest.json',
  // 其他包管理器的锁文件（DSH 使用 pnpm）
  'package-lock.json',
  'yarn.lock',
  // 日志
  'npm-debug.log',
  'pnpm-debug.log',
  // 敏感文件（精确名）
  '.env',
  '.npmrc',
  '.netrc',
  '.yarnrc',
  '.yarnrc.yml',
  '.pypirc',
  '.npmignore',
]);

/** 命中扩展名即排除（密钥/证书类） */
const DENY_EXT = new Set(['.key', '.pem', '.p12', '.pfx', '.crt', '.der', '.asc']);

/** 按文件名（basename）匹配的模式 */
const DENY_BASENAME = [
  /^\.env(\..+)?$/, // .env / .env.local / .env.production ...
  /(^|\.)credentials?\.ya?ml$/i, // credentials.yaml / .credentials.yml / my.credentials.yml
  /\.(credential|credentials)$/i, // *.credential / *.credentials
  /^id_(rsa|ed25519|ecdsa|ed448|dsa)(\.pub)?$/, // SSH 私钥
  /^secrets?\.(json|ya?ml)$/i, // secrets.json / secret.yml
  /^(api[-_]?key|apikey|token)s?([._-].*)?$/i, // api_key.txt / token.json / api.key
];

/** 按相对路径匹配的模式（禁止嵌套打包任何压缩包格式） */
const DENY_PATH = [/\.tgz$/, /\.tar\.gz$/, /\.zip$/, /\.dspack$/];

function matchExt(name) {
  const idx = name.lastIndexOf('.');
  if (idx <= 0) return '';
  return name.slice(idx).toLowerCase();
}

/** 判断某相对路径（'/' 分隔）是否必须排除。 */
export function isExcluded(relPath) {
  const rel = relPath.replace(/\\/g, '/');
  const segments = rel.split('/');
  const name = segments[segments.length - 1];

  // 任一路径段命中精确名单（任意层级）
  for (const seg of segments) {
    if (DENY_EXACT.has(seg)) return true;
  }

  if (DENY_EXT.has(matchExt(name))) return true;

  for (const re of DENY_BASENAME) {
    if (re.test(name)) return true;
  }
  for (const re of DENY_PATH) {
    if (re.test(rel)) return true;
  }
  return false;
}