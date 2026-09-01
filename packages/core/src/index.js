// DSH-PackForge core 公共 API（供 CLI / GUI / 插件以编程方式调用）。
export { Host } from './host.js';
export { isExcluded } from './security.js';
export { scanProfile, selectFiles } from './scan.js';
export { summarizeSpecial } from './special.js';
export {
  buildManifest,
  validateManifest,
  validateFileEntry,
  coordsToPkgDeps,
  pkgDepsToCoords,
  coordinatesFromProfileDeps,
  gitCommitFromLock,
  isExactSemver,
  parseGitCoord,
  parsePkgGitSpec,
  resolveLocale,
  isLocaleString,
  extractBundles,
  extractDependencies,
  sanitizeSlug,
} from './manifest.js';
export {
  discoverProfiles,
  listInstalledDshVersions,
  resolveProfileInput,
  skipProfileDir,
  compareVersions,
  sortVersionsDesc,
} from './discovery.js';
export { buildDspack, parseDspack, encodeText, decodeText } from './dspack.js';
export { packProfile, dspackEntryPath } from './pack.js';
export { exportRepo, renderReadme, renderDspackIgnore, REPO_CONTENT_LEVELS, REPO_CONTENT_LABEL } from './repo.js';
export { inspectProfile, inspectPack } from './inspect.js';
export { installPack, verifyIntegrity, reconcileProfile, resolvePackSource } from './install.js';
export { readMarketIndex, normalizeMarketPack, DEFAULT_MARKET_INDEX } from './market.js';