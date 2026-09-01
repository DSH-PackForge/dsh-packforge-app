# dsh-packforge-app

DSH 整合包平台 · **图形化管理工具**（一个 monorepo，两种宿主：Electron 桌面端 + DSH 客户端插件）。

像玩 Minecraft 整合包一样，一键导出、导入、浏览 DSH AI 智能体配置包。本项目遵循**最新规范**：

- **manifest v4**（`DSH-PackForge/specs/manifest/v4.md`）：可复现层栈契约 + `type` + `files[]`
- **pack-structure v2 / `.dspack`**（`DSH-PackForge/specs/pack-structure/v2.md`）：`DSPK` 头 + ZIP + `overrides/`

## 包结构（pnpm workspace）

```
packages/
├── core                 @dsh-packforge/core        主机无关引擎（Host 注入 I/O）
├── host-node            @dsh-packforge/host-node   Node 适配器（CLI / Electron / server）
├── host-dsh-plugin      @dsh-packforge/host-dsh-plugin  DSH 客户端插件适配器（M4）
├── cli                  @dsh-packforge/cli         dspack 命令（薄门面）
├── gui                  @dsh-packforge/gui         Electron 桌面端（市场浏览 / 导出 / 导入 / 查看整合包）
└── plugin               @dsh-packforge/plugin      DSH 客户端插件（M4）
```

## 原则

- **一个引擎，多个宿主**：pack/install 的业务规则只存在于 `core`，GUI 与 CLI 绝不复刻。
- **主机无关**：`core` 不 import Node 内建（`node:fs`/`node:crypto`），I/O 全部经 `Host` 接口注入。
- **安全默认**：sha256/size 校验、四类敏感过滤、失败回滚。

## 路线

- [x] M0 核心引擎（`.dspack` 容器 + manifest v4 校验 + 坐标转换 + 安全过滤/扫描）
- [x] M1 导出（经典 + 启动器双路径扫描、打包 `.dspack`）
- [x] M2 导入（`.dspack` 安装闭环 + `files[]` 按需下载）
- [x] M3 市场浏览 + Electron GUI（市场/查看整合包/导出/导入四屏）
- [~] M4 DSH 客户端插件（SDK 契约已确证：cordis `apply` + `ctx.fs`/FileSystem + `ctx.shell`；适配层忠实并测试；剩部署侧 CLI 打包与实跑）

## 开发

```bash
pnpm install
pnpm test
```

> 沙箱内 `pnpm test` 的 lifecycle spawn 会触发 EPERM（受限边界），可改用：
> `cd packages/core && node --test --experimental-test-isolation=none "test/*.test.js"`。

桌面端运行（需图形环境 + 安装 electron）：

```bash
pnpm install
pnpm --filter gui start   # 市场索引：DSHPACK_MARKET_INDEX=/path/to/index.json
```

## 分发（npm / 桌面安装包 / 插件 bundle）

三种产物各自出包，详见 [`docs/发布.md`](docs/发布.md)：

```bash
pnpm --filter @dsh-packforge/plugin bundle   # DSH 插件浏览器 bundle（lib/client.js）
pnpm -r --filter @dsh-packforge/core publish --access public   # …依次发 5 个 npm 包
pnpm --filter gui dist                         # Electron Windows 安装包（NSIS + portable）
```