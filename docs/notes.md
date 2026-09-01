# dsh-packforge-app 会话笔记

> 跨会话恢复上下文用。新会话接手先读本文件 + README。

## 0. 完成状态（goal 已完成 · 第 5 轮）

**M0–M4 全部落地，51/51 测试通过**：core 38 / gui 6 / host-dsh-plugin 3 / plugin 4。

- M0 核心引擎 · M1 导出 · M2 导入 · M3 市场+Electron GUI · M4 DSH 客户端插件 —— 均已实现并按本文件第 4 节各自验证。
- M4 SDK 契约已从 0.1.0-rc.8 检出处确证（详见第 4 节 M4 行）：cordis `apply` + `ctx.fs`(FileSystem) + `ctx.shell`(ShellExecutor)；
  `ctx.fs` 无二进制写/mkdir/rm/move → 完整工作流走 `ctx.shell` 委派 `dspack` CLI。

**剩余（均为环境/部署侧，非代码缺口）**：
1. Electron 窗口实跑：需 `pnpm approve-builds` 放行 electron 二进制 + 图形环境 `pnpm --filter gui start`。
2. 插件在真 DSH 内冒烟：需把 `dspack` CLI 随插件打包（或入 host PATH）后实跑。
3. 市场索引 `format`/`manifestVersion` 扩展：跨仓回提 spec 仓库（`market.js` 已双向容忍新旧索引）。

## 1. 目标与格式（已与用户确认）

- 图形化整合包管理工具；范围 = **导出 / 导入 / 市场浏览**（**不做启动**）。
- 形态 = **Electron 桌面端(先) + DSH 客户端插件(后)**，同一 monorepo `dsh-packforge-app`。
- 格式 = **最新规范**：manifest **v4** + pack-structure **v2（`.dspack`）**；不做 v3/`.tgz` 兼容。
  - `.dspack` = 标准 ZIP（无自定义魔数头，压缩软件可直接打开）；根 `manifest.json` + 机器文件，用户文件进 `overrides/`。
  - v4 = 坐标→固定版本（v3 §5 继承）+ `type:"profile"` + `files[]`（`{path,sha256,size,urls[]}`）。

## 2. 两个 profile 根（实测，勿再调研）

- **经典**：`~\.dsh\profiles\*`。
- **启动器**：`%APPDATA%\in.dsh-plug.dsh-launcher\`，其中 **`config.json` 是权威注册表**：
  - `homes[]`（每个 home 是 DSH_HOME，路径写死在 `path`，内有 `profiles\`）
  - `versions[]`（`version` + `dir`，用于取精确 dshVersion）
  - `instances[]`（`default_profile` / `last_profile`）
  - `homes[]` 首项通常就是经典 `~/.dsh`（name=`用户默认 (~/.dsh)`）→ 读 homes[] 即可一次性覆盖经典+启动器。
- 旧版启动器 `%APPDATA%\dsh-launcher\launcher-config.json`（`~/.dsh-runtime\workspaces\`）仅作可选第三来源。
- 跳过目录：`node_modules` / `__temp__` / 点目录。

## 3. 环境坑（重要）

- **沙箱 EPERM（管道）**：`pnpm test`（`pnpm -r run` 生命周期会 spawn node 子进程并捕获 piped stdio）在沙箱内 EPERM。
  解法：**直接** `node --test --experimental-test-isolation=none "test/*.test.js"`（同进程，Node 展开 glob）。
  正常 CI 环境 `pnpm test` 可用。
- Node 24.19.0 / pnpm 11.7.0。
- `pnpm-workspace.yaml` 已设 `storeDir: node_modules/.pnpm-store`（防污染父目录）。

## 4. 进度

- [x] **M0 核心引擎**：`core`（Host 契约 / security / scan / manifest v4 / .dspack / pack / inspect）
      + `host-node` + `host-dsh-plugin`(占位) + cli/gui/plugin 占位。
- [x] **M1 导出**：`core/src/discovery.js`（双路径发现：经典 `~/.dsh/profiles` + 启动器 `config.json.homes[]`，
      按目录去重、跳过 node_modules/__temp__/点目录）+ `dshVersion` 精确钉定（启动器 `versions[]` 取最新）
      + 依赖精确版本钉定（`coordinatesFromProfileDeps` 读 node_modules）+ `cli` 门面（list/pack/inspect）。
      真实环境冒烟通过：list 出经典 8 + 启动器实例 4（去重后）；pack web → `web-1.0.0.dspack`，
      `manifestVersion=4 / dshVersion=0.1.1-rc.2 / validate=[]`（标准 ZIP 容器）。
- [x] **M2 导入**：`core/src/install.js` 安装闭环（本地/URL → ZIP 解压 → manifest v4 校验 → overrides/ 落盘
      → package.json 重建（coordsToPkgDeps）→ pnpm install（frozen-lockfile 失配自动回退）→ files[] 下载+sha256/size
      → reconcile（bundle 缺 `dsh.bundle.patch` → 回滚；依赖带 patch → 自动补进层栈）→ 失败整目录回滚）。
      Host 契约扩 `exec`/`download`/`move`；cli 新增 `install`（--no-install/--dry-run/--force/--registry/--sha256/--size）。
      31 测试全过 + CLI 端到端 pack→install 冒烟通过。
- [~] M3 市场浏览 + Electron GUI（进行中）：
      - `core/src/market.js`：`readMarketIndex/normalizeMarketPack`（容忍旧 `.tgz` 单下载 + 新 `files[]`/`.dspack`，自动判 format）
      - `core/src/inspect.js` `inspectPack`（查看 .dspack：容器版本/sha256/manifest/v4 校验/条目分类）+ cli `view`
      - `packages/gui`：Electron `main.mjs`+`preload.cjs`（IPC 桥接 core）+ 渲染进程 4 屏（市场/查看整合包/导出/导入），
        `gui/src/format.js` 纯展示层（packViewHTML/marketCardHTML/treeFromPaths）。37(core)+5(gui) 测试全过 + 语法检查 + 查看链路 headless 联调通过。
      - 市场「一键安装」已接（`installPack(downloadUrl, expectedSha256, expectedSize)` 下载+校验）；electron 已入 devDeps，其二进制下载被 pnpm build 策略拦（`pnpm approve-builds` 后再 `pnpm --filter gui start`，需图形环境）。
      - R4 补齐：`core` 导出 `resolvePackSource`（本地/URL→临时文件+清理约定）；cli 新增 `market` 命令、`view` 支持 URL；core 新增「从 URL 安装」单测（本地 http + sha256/size 校验）。38/38 过 + CLI `market` 实跑真实索引（正确标记 `.tgz` 旧格式）。
- [~] M4 DSH 客户端插件（SDK 契约已从 0.1.0-rc.8 检出确证；适配层忠实 + 已测）：
      - 真实契约：插件 = cordis `apply(ctx)`（`window.__DSH_BOOT__` + `__ModuleLoader__.load({id,factory})` 装载）；
        `ctx.modules`=ClientModuleLoader；`ctx.fs`=FileSystem（resolve/processPath/stat/lstat/readText/readBytes/listDir/writeText/editText，
        **无二进制写、无 mkdir/rm/move**）；`ctx.shell`=ShellExecutor（resolve(req)→spec、run→{exitCode,stdout,stderr}）。
      - `host-dsh-plugin`：`DshPluginHost`（bridge→core Host；sha256 回退 WebCrypto）。3 测试过（内存 fs+node:crypto 驱动 pack/inspect 全链路）。
      - `plugin`：`dshBridgeFromContext` 忠实映射 ctx.fs（读文本/读字节/stat 用 lstat 探 symlink/listDir/writeText）+ ctx.shell→exec；
        缺省能力（二进制写/mkdir/rm/move/download）显式抛错 → 完整工作流经 ctx.shell 委派 `dspack` CLI；`viewPackBytes`（浏览器内就地解析 .dspack）。4 测试过。
      - 待办（仅部署侧）：`dspack` CLI 二进制需随插件打包或在 host PATH；实跑一次确认客户端插件可调 ctx.shell。

## 7. 分发与打包（R6 · goal2）

- **npm 五包**：core / host-node / host-dsh-plugin / cli / plugin。补 `files`/`keywords`/`publishConfig(access:public)`、去 private。
  `pnpm pack` 5 包实测：`workspace:*` → `0.1.0`、files 只含 src/bin（不含 test/）、依赖序正确。发布命令见 `docs/发布.md`。
- **CLI**：`pnpm link --global`（沙箱限全局写 `%LOCALAPPDATA%\pnpm`，本机可跑）；单文件 exe 用 Node SEA/esbuild（纯 ESM，`vercel/pkg` 不支持 ESM）。
- **Electron**：`gui/package.json` 加 `main:electron/main.mjs` + `build`（appId/files/win nsis+portable）+ `dist` 脚本 + electron-builder@25.1.8（已装可 `--version`）。
  入口资源（electron/main.mjs、preload.cjs、renderer/*、src/format.js）确认存在；出包需本机 `pnpm approve-builds` + 图形/网络。
- **DSH 插件 bundle**：确证 `dsh.client` 格式（真实样例 `dsh-client-ui-commands`）：`dsh.client{platform:"web",inject:[...]}` + `exports["./client"]`→浏览器 bundle。
  plugin 加 `src/client.js`（`__ModuleLoader__.load({id:'@dsh-packforge/plugin',factory})`）+ `bundle` 脚本（esbuild；其 postinstall 被拦→直调 `@esbuild/win32-x64/esbuild.exe` 已出 `lib/client.js` 31.5KB）。
  静态检查无 `node:` 内建；运行时回归（mock __ModuleLoader__ 断言 {id,factory}→{name,apply}）。plugin 测试 6/6。

## 8. 导出形态：单文件 ⇄ 源仓库（R7）

- GUI 导出页重做：左表单 + 右实时预览（`inspectProfile` 干跑，不含写盘）；修两处隐藏 bug ——
  `export-out` id 重复（结果框被 input 吞掉）、`listProfiles()` 返回 `{profiles,roots}` 却被当数组 `.map()`（下拉一直空/抛异常）。
- 新增「导出形态」：`.dspack 单文件`（既有 `packProfile`）⇄ `仓库 源形态`（新 `core/exportRepo`）。
- `core/src/repo.js`：`exportRepo(host, profile, {content, out, ...})` 三档 content ——
  `manifest`（仅清单）/ `readme`（+README.md）/ `full`（机器文件进根 + `overrides/` + `.dspackignore` + `release/` 空目录）；
  另 `renderReadme`（manifest→markdown）/ `renderDspackIgnore`（gitignore 风格，与 security.js 对齐 + `.git/`、`release/`、`.dspackignore`、`README.md` 不入包）。
- 桥：`main.mjs` 增 `profiles:exportRepo`；`preload.cjs` 增 `exportRepo`；`format.js` 增 `exportRepoResultHTML` + `REPO_CONTENT_LABEL`。
- 测试：core 42 / gui 9 / host-dsh-plugin 3 / plugin 6 = **60 全绿**。
- 待办（未做）：仓库→`.dspack` 的反向重打包（repack 读取 `.dspackignore` 的实际生效逻辑）；CLI 加 `export`/`pack --repo` 形态。