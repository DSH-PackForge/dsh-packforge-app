// 构建 DSH 客户端插件 bundle。
// 关键：esbuild 打包成 CJS（`require("react")` 用 factory 的 require 解析），再包成
//   window.__ModuleLoader__.load({ id, factory: (require) => { … return module.exports } })
// 这是 DSH 0.1.2-rc.1 的 client-modules 契约（见 dsh-client-ui-settings-general/lib/client.js）。
// 不能直接用 esbuild `--format=iife --external:react`——那会生成 __require 垫片，在 <script> 里没有全局 require 而崩。
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PACKAGE_ID = '@dsh-packforge/plugin';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(ROOT, 'packages', 'plugin', 'src', 'client.js');
const OUT = path.join(ROOT, 'packages', 'plugin', 'lib', 'client.js');

const result = await build({
  entryPoints: [ENTRY],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  external: ['react', 'react/jsx-runtime', '@deepseek-ai/*'],
  write: false,
  logLevel: 'warning',
});

const cjs = result.outputFiles[0].text.trimEnd();

const wrapped = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(PACKAGE_ID)},
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
${cjs}
    return module.exports;
  },
});
`;

writeFileSync(OUT, wrapped);
console.log('[bundle-client] wrote', OUT);
