// DSH-PackForge core 公共 API（供 CLI / GUI / 插件以编程方式调用）。
export { Host } from './host.js';
export { isExcluded } from './security.js';
export { scanProfile } from './scan.js';
export {
  buildManifest,
  validateManifest,
  validateFileEntry,
  coordsToPkgDeps,
  pkgDepsToCoords,
  coordinatesFromProfileDeps,
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
export {
  buildDspack,
  parseDspack,
  encodeHeader,
  decodeHeader,
  encodeText,
  decodeText,
  DSPK_MAGIC,
  DSPK_HEADER_SIZE,
  DSPK_CONTAINER_VERSION,
} from './dspack.js';
export { packProfile, dspackEntryPath } from './pack.js';
export { inspectProfile, inspectPack } from './inspect.js';
export { installPack, verifyIntegrity, reconcileProfile, resolvePackSource } from './install.js';
export { readMarketIndex, normalizeMarketPack } from './market.js';