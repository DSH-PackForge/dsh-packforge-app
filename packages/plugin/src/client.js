// DSH 客户端插件·浏览器入口（由 `pnpm bundle` 打成 lib/client.js）。
//
// 契约（见 @deepseek-ai/dsh-client-modules 的 client 头注释）：
//   客户端 bundle 只负责「注册工厂」——脚本执行时调用
//   window.__ModuleLoader__.load({id, factory})；模块系统在首次 import 时才
//   物化 factory(require)→exports。这里把插件的 cordis 面（{name, apply}）交给 DSH。
import { name, apply } from './index.js';

// 模块 id 用包名（WebBootEntry.id == package name，`/plugins/<id>/client.js` 路由也按它）。
const PACKAGE_ID = '@dsh-packforge/plugin';

const loader = globalThis.__ModuleLoader__;
if (typeof loader?.load === 'function') {
  loader.load({
    id: PACKAGE_ID,
    factory: () => ({ name, apply }),
  });
}