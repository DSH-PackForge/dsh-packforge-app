# AGENT.md

DSH-PackForge 图形化管理工具的 AI 开发指南（本仓库是桌面端 + CLI + 客户端插件的 monorepo）。

## 项目是什么

DSH 整合包（`.dspack`）生态的桌面端 + CLI + 客户端插件。像 Minecraft 整合包一样，一键导出 / 导入 / 浏览 DSH AI 智能体配置包。

- 规范：manifest v5（可复现层栈契约）、pack-structure v3（`.dspack` = 标准 ZIP + `overrides/`）。
- **一个引擎，多个宿主**：业务逻辑只在 `packages/core`（主机无关，I/O 经 `Host` 接口注入，不 import `node:*`），CLI / GUI / 插件都复用它，**绝不复刻**。

## 结构（pnpm workspace）

```
packages/
├── core             @dsh-packforge/core           主机无关引擎
├── host-node        @dsh-packforge/host-node     Node 适配器
├── host-dsh-plugin  @dsh-packforge/host-dsh-plugin  DSH 客户端插件适配器
├── cli              @dsh-packforge/cli           dspack 命令（薄门面）
├── gui              @dsh-packforge/gui           Electron 桌面端（市场/查看/导出/导入）
└── plugin           @dsh-packforge/plugin        DSH 客户端插件
```

## 常用命令

```bash
pnpm install
pnpm test                       # 全部测试
pnpm --filter gui start         # 桌面端 dev 模式
pnpm build:win                  # 一键出 Windows 安装包
```

`pnpm build:win` = `scripts/build-win.mjs` 串起：`build-icons.mjs`（PNG→ICO）→ `build-cli.mjs`（Node SEA 打 `dspack.exe`）→ `copy-preview.mjs`（拷预览 DLL）→ electron-builder。

## ⚠️ 打包的硬性前提（本机实测踩过的坑，务必遵守）

1. **项目路径必须短**：electron-builder 用的 NSIS 3.04 是 ANSI 版，`.pnpm` 下的模板路径一旦 >260 字符，makensis 就报 `could not find ...\StdUtils.nsh`（文件明明存在）。当前仓库位于 `F:\ScientificAndTechnological\...\DSH-PackForge\dsh-packforge-app` **太深（274 字符）**，必须**复制副本到短路径（如 `F:\dsh\dsh-packforge-app`）再构建**，产物拷回原项目 `packages/gui/dist/`。`node-linker=hoisted` / junction / `--preserve-symlinks` 都**无效**（路径不变或破坏模块解析）。
2. **winCodeSign 符号链接**：无「开发者模式」且非管理员时，7za 解压 winCodeSign 的 `darwin/*.dylib` 符号链接会失败（`Cannot create symbolic link`）。解法：开开发者模式；或手动预填缓存 `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0\`（跳过 darwin 符号链接）。
3. **electron 二进制下载**（postinstall）走 GitHub，可能 TLS 握手失败。本地有缓存 `%LOCALAPPDATA%\electron\Cache\electron-v33.4.11-win32-x64.zip`，可 `ELECTRON_SKIP_BINARY_DOWNLOAD=1 pnpm install` 后手动解压到 `node_modules/.pnpm/electron@*/node_modules/electron/dist/`。
4. **放行安装脚本**：`pnpm-workspace.yaml` 里 `onlyBuiltDependencies: [electron, esbuild]` 别删；删了 pnpm 11 会 `Ignored build scripts`，`pnpm run` 直接失败。

## 预览处理器（集成 dspack-preview）

- DLL 由独立仓库 `dspack-preview` 编译（MSVC x64），`scripts/copy-preview.mjs` 拷到 `packages/gui/build/dspack-preview/`。
- 安装/卸载用 **regsvr32**（`$WINDIR\SysNative\regsvr32.exe`，64 位）调 DLL 自己的 `DllRegisterServer` / `DllUnregisterServer`，**不要手写注册表**（会漏键/写错 hive）。
- DLL 放固定 `C:\Program Files\DSH-PackForge\dspack-preview\`（prevhost 低完整性可读；且卸载时不被 `RMDir /r $INSTDIR` 一起删掉，才能 regsvr32 /u 注销）。
- 安装器 `perMachine: true`（需管理员/UAC），因为要写 Program Files + HKLM。
- 相关：`packages/gui/build/installer.nsh`（`customInstall` / `customUnInstall` 宏）、`packages/gui/package.json` 的 `build` 字段（icon / fileAssociations / protocols / extraResources / nsis）。
- `.dspack` 双击打开由 `electron/main.mjs` 的 `extractDspackFile` 处理；`dspack://` 协议由 electron-builder `protocols` + main.mjs `extractDspackUrl` 处理。

## 发 Release

```bash
# 1. 版本 bump：所有 package.json 的 version + packages/cli/src/cli.js 的 `const VERSION`
# 2. 复制到短路径副本构建（见「路径必须短」），产物拷回 packages/gui/dist/
# 3. 提交 + 推（SSH 22 被墙，用 HTTPS）：
git push https://github.com/DSH-PackForge/dsh-packforge-app.git master
git tag vX.Y.Z && git push https://github.com/DSH-PackForge/dsh-packforge-app.git vX.Y.Z
# 4. 发 release：
gh release create vX.Y.Z --repo DSH-PackForge/dsh-packforge-app --title "vX.Y.Z" \
  --notes-file notes.md "packages/gui/dist/DSH PackForge Setup X.Y.Z.exe" \
  "packages/gui/dist/DSH PackForge X.Y.Z.exe"
```

## 关键文件

- `docs/发布.md` — 发布/打包指南
- `packages/gui/package.json` `build` 字段 — electron-builder 配置
- `packages/gui/build/installer.nsh` — NSIS 自定义段（预览注册 + CLI 入 PATH）
- `packages/gui/electron/main.mjs` — 主进程（IPC、协议、文件关联）
- `scripts/build-*.mjs` — 构建脚本
- 格式规范本体在 DSH-PackForge 主仓库的 `specs/`
