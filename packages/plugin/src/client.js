// DSH 客户端插件·浏览器入口（由 bundle-client.mjs 打成 lib/client.js）。
// 这里只负责「导出 cordis 插件面」；bundle 脚本会把它包成
//   window.__ModuleLoader__.load({ id, factory: (require) => { … return module.exports } })
// 使 react 等外部依赖经 DSH 的 factory require 解析（避免 esbuild __require 垫片在 <script> 里崩）。
export { name, inject, apply } from './client-plugin.js';