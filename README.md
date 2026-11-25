# dsh-packforge-app

[![整合包必备](https://dsh-packforge.github.io/dsh-pack-market/badges/plugins/DSH-PackForge-dsh-packforge-app-zh.svg)](https://dsh-packforge.github.io/dsh-pack-market/#/plugin/DSH-PackForge%2Fdsh-packforge-app)
[![Essential for packs](https://dsh-packforge.github.io/dsh-pack-market/badges/plugins/DSH-PackForge-dsh-packforge-app-en.svg)](https://dsh-packforge.github.io/dsh-pack-market/#/plugin/DSH-PackForge%2Fdsh-packforge-app)

DSH 整合包平台 · **图形化管理工具**（一个 monorepo，两种宿主：Electron 桌面端 + DSH 客户端插件）。

像玩 Minecraft 整合包一样，一键导出、导入、浏览 DSH AI 智能体配置包。本项目遵循**最新规范**：

- **manifest v6**（`DSH-PackForge/specs/manifest/v6.md`）：可复现层栈契约 + `type`（`profile` / `dshhome`）+ `files[]`
- **pack-structure v4 / `.dspack`**（`DSH-PackForge/specs/pack-structure/v4.md`）：标准 ZIP + `overrides/`（压缩软件可直接打开）
- **workspace-config v1 / `.dshpkcfg`**（`specs/workspace-config/v1.md`）：导出工作区本地快照

## 导出与更新 v6 整合包

在桌面端进入导出页面，选择单个配置档（profile）或整个 `DSH_HOME`（dshhome），再打开「插件与资源」。系统会自动从已安装插件的 `locale` 目录读取名称与简介，作者可自定义插件名称、简介、图标以及当前精确版本对应的专用 npm 包源（registry）；安装器会单独下载并校验该版本的压缩包（tarball），其余依赖继续沿用各自原有来源。

插件可在其发布包根目录的 `dsh_pack/paths.json` 中声明额外数据文件：路径以 `./` 从 `DSH_HOME` 起算，其中的 `<profile>` 占位符会在安装时替换为目标配置档名。作者可逐项勾选插件数据路径、模型服务商（Provider）、MCP 服务与技能（Skill）；技能支持随包内嵌（embedded）、固定 Git 提交（fixed）或跟踪分支/标签（track）。导入时可以逐项选择资源。需要凭据的条目可粘贴密钥，也可确认复用目标机已有凭据。缺少必需凭据时会跳过该项。

使用命令行时，可先列出可导出的资源键，再将勾选结果保存为 JSON 配置文件。导出整个 `DSH_HOME`（dshhome）时使用 `dspack resources <home> --home` 与 `dspack pack-home <home> --config <file>`：

```sh
dspack resources ./profiles/work
dspack pack ./profiles/work --config pack-options.json --out ./release
dspack install ./release/work-1.0.0.dspack
dspack update ./release/work-1.1.0.dspack --dry-run
dspack update ./release/work-1.1.0.dspack
```

在终端交互式安装或更新时，对要跳过的资源输入 `s`。在脚本中，先用 `--dry-run` 查看资源键，再按需重复指定 `--skip-resource <资源键>`，例如 `dspack install ./release/work-1.0.0.dspack --skip-resource skill:home:notes`。

更新时会对比「安装基线（baseline）、本机当前文件、新版整合包」三方状态：冲突默认保留本机修改，交互式导入支持按配置字段选择采用新版；跟踪分支或标签的技能在显式更新时会重新解析最新提交，即使整合包版本号未变。旧版整合包首次升级时，可同时传入 `--previous` 与 `--previous-sha256` 重建基线。

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

- [x] M0 核心引擎（`.dspack` 容器 + manifest v4/v5/v6 校验 + 坐标转换 + 安全过滤/扫描）
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
pnpm --filter gui start   # 市场默认从官方 GitHub Pages 拉取；可用 DSHPACK_MARKET_INDEX 覆盖
```

## 分发（npm / 桌面安装包 / 插件 bundle）

三种产物各自出包，详见 [`docs/发布.md`](docs/发布.md)：

```bash
pnpm --filter @dsh-packforge/plugin bundle   # DSH 插件浏览器 bundle（lib/client.js）
pnpm -r --filter @dsh-packforge/core publish --access public   # …依次发 5 个 npm 包
pnpm --filter gui dist                         # Electron Windows 安装包（NSIS + portable）
```