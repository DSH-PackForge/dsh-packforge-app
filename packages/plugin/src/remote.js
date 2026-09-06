// DSH host 面 · Typert Remote controller（client↔host 直调，不经 CLI）。
//
// 契约（已从 dsh-api-workspace-controller / dsh-typert-protocol 源码确证）：
//   - host：`class X extends TypertRemoteService`，`super(ctx, serviceKey, { namespace })` 自动 bindTypertRemote 到 Gateway；
//     方法用 `@Remote` 装饰器标记。纯 JS 无装饰器，这里等价手动写 remote-methods 描述符。
//   - client：`inject: ["remote", "remote.dspack"]`，`await ctx.remote.dspack.method(request)` → RemoteResult<T>。
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { exportHomeFromWorkspace, readMarketIndex } from '@dsh-packforge/core';
import { getHost } from './host.js';

// 与 @deepseek-ai/dsh-typert-protocol 内部常量一致（包内未导出，只能按值对齐）。
const REMOTE_METHOD_DESCRIPTOR = '@deepseek-ai/dsh-typert-protocol/remote-methods';

/** 设置面板「导出/浏览市场」背后调用的 host 侧业务（直接走 core，无需 dspack CLI）。 */
export class DspackController extends TypertRemoteService {
  static inject = ['typert'];

  constructor(ctx) {
    super(ctx, 'dspackController', { namespace: 'dspack' });
  }

  /** 导出当前 DSH 实例（$DSH_HOME）为 dshhome 整合包（读 .dshpkcfg）。 */
  async exportHome(request = {}) {
    const host = getHost();
    const envHome = host.env('DSH_HOME');
    if (!envHome) throw new Error('未设置 $DSH_HOME，无法确定当前实例');
    const home = { name: host.basename(envHome), dir: host.resolvePath(envHome) };
    const r = await exportHomeFromWorkspace(host, home, request);
    return {
      name: r.manifest.name,
      version: r.manifest.version,
      output: r.output,
      sha256: r.sha256,
      size: r.size,
    };
  }

  /** 浏览市场索引（可选 source 覆盖默认远端）。 */
  async market(request = {}) {
    const host = getHost();
    const r = await readMarketIndex(host, request.source);
    return {
      count: r.packs.length,
      error: r.error,
      packs: r.packs.map((p) => ({ name: p.name, displayName: p.displayName, version: p.version, format: p.format })),
    };
  }
}

// 手动标记 Remote 方法（等价 @Remote，避免纯 JS 依赖装饰器语法）。
Object.defineProperty(DspackController.prototype, REMOTE_METHOD_DESCRIPTOR, {
  configurable: true,
  value: Object.freeze({
    version: 1,
    methods: Object.freeze([
      Object.freeze({ method: 'exportHome', invocation: Object.freeze({ kind: 'direct' }) }),
      Object.freeze({ method: 'market', invocation: Object.freeze({ kind: 'direct' }) }),
    ]),
  }),
});
