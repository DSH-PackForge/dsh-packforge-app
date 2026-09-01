# DSH 源码调查记录（过程与方法）

> 记录「如何定位 DSH 客户端插件契约」的完整调查过程、源码目录地图、踩过的坑，
> 供后续升级 DSH 版本（如 0.1.1-rc.2）时复用。结论部分的成品见 `docs/dsh-plugin-集成契约.md`。

---

## 1. 源码在哪

DSH 客户端（launcher 安装）的运行时源码位置：

```
C:\Users\asus\AppData\Roaming\in.dsh-plug.dsh-launcher\versions\0.1.0-rc.8\
├── node_modules\                              ← 真实依赖树
│   └── .pnpm\                                 ← pnpm 虚拟 store
│       ├── @deepseek-ai+dsh-web-app@0._3452fd5b4653c1e7f90a568210b46bff\   ← 主壳
│       │   └── node_modules\@deepseek-ai\      ← 几乎所有 client 包的 junction 汇入点
│       ├── @deepseek-ai+dsh-tool-*@...\        ← 各工具包真实目录
│       ├── @deepseek-ai+dsh-tools@...\
│       ├── @deepseek-ai+dsh-llm@...\
│       └── ...
```

- 主壳包 `dsh-web-app` 的 `node_modules/@deepseek-ai/` 下是**junction（目录联接）**，指向 `.pnpm` 里的真实目录，直接在这里 `read` 文件最方便。
- `.pnpm` 顶层目录名被 hash 后缀截断（`@deepseek-ai+dsh-client-ui-_fa9f3a…`），**不能靠完整包名匹配**，要用 `-like 'dsh-client-ui-settings*'` 或 `-match` 前缀筛。

---

## 2. 关键包地图（按功能分类）

在 `dsh-web-app\node_modules\@deepseek-ai\` 下：

| 分类 | 包 | 作用 |
|---|---|---|
| 设置 | `dsh-client-ui-settings` | 设置域 base，声明全部设置 slot 契约 |
| 设置 | `dsh-client-ui-settings-general` | 外壳 +「通用设置」section 注册者 |
| 设置 | `dsh-client-ui-settings-models` | 「模型」section 注册者 |
| 设置 | `dsh-client-ui-settings-plugins` | 「插件」section 注册者 |
| 设置 | `dsh-client-ui-settings-plugin-inventory` | 插件清单 tab |
| 工具 UI | `dsh-client-ui-tool` / `-skill` / `-commands` | 工具调用/skill/命令的**展示**层 |
| 运行时 | `dsh-system-prompt` / `dsh-agent-presets` | system prompt 装配、agent 预设 |
| 装载 | `dsh-client-modules` / `dsh-client-runtime` / `dsh-cordis-client-runner` / `dsh-cordis-host-runner` | 插件装载 |

在 `.pnpm` 顶层（独立真实目录，按 `@deepseek-ai+dsh-*` 找）：

| 分类 | 包 | 作用 |
|---|---|---|
| 工具注册 | `dsh-tools` | **`ctx.tools` 服务 + `defineTool`**（AI 工具契约的核心） |
| 工具实现 | `dsh-tool-bash/pwsh/fs/fs-se/skill/web/subagent/todo/goal/jobs/ask-u/ralph/workf/…` | 各 AI 工具 |
| 工具实现 | `dsh-tool-cordis` | 给 AI 看 cordis 运行时的检查工具（非自定义工具注册口） |
| LLM 契约 | `dsh-llm` | `ToolSchema`/`ContentBlock`/`HarnessError` 等类型源 |
| skill | `dsh-skill` / `dsh-skill-file` / `dsh-skill-badg…` | skill 机制 |
| 命令 | `dsh-commands` / `dsh-command-co/fe/go` | 命令机制 |
| agent | `dsh-agent` / `dsh-agent-loop` / `dsh-agent-tool` / `dsh-agent-inst/default/defa` | agent 运行时 |

---

## 3. 踩过的坑

1. **junction/hardlink 导致递归列目录为空 / 错路径**
   - `Get-ChildItem -Recurse` 直接列 `dsh-web-app\node_modules\@deepseek-ai\dsh-client-ui-settings` 返回空（它是 Junction）。
   - 解法：`Get-Item` 看 `LinkType=Junction`、`Target=真实目录`，或直接 `read` 该路径下的文件（read 能穿过 junction）。
   - `read` 真实路径与 junction 路径都能通，但**优先用 `dsh-web-app\node_modules\@deepseek-ai\<pkg>` 这个可读性强的 junction 路径**。

2. **`@deepseek-ai/dsh-client-ui-slots` 没有独立可定位目录**
   - slot 注册 API 的「服务」来源是它，但物理上没有单独的包目录可查。
   - 真相：它是 **type-only 虚拟包** —— 通过 `declare module '@deepseek-ai/dsh-client-ui-slots' { interface SlotMap {...} }` 提供类型；运行时 `ctx.slots` 服务由装载器注入，`require("@deepseek-ai/dsh-client-ui-slots")` 由模块系统虚拟解析。
   - 所以 slot 的**运行时 API 形态**是从「使用方」（`settings-general/lib/client.js`）反推的：`ctx.slots.inject / register / entries / getVersion / subscribe`，以及 `resolveSlotLabel`。

3. **host 插件 vs client 插件的判断依据**
   - client 插件：`package.json` 有 `dsh.client{platform,inject}`，`exports["./client"]` → 浏览器 bundle，`lib/client.js` 里 `window.__ModuleLoader__.load({id,factory})`。
   - host 插件：`main`/`exports["."]` → Node 侧 `apply(ctx)`（cordis Context），**没有 `dsh.client`**（证据：`dsh-tool-todo/package.json` 无 `dsh` 字段，纯 host）。
   - 一个包可同时含两面：`settings-general` 的 `lib/index.js` 是 host 空 `apply(){}`，`lib/client.js` 才是真 client 逻辑。

4. **`.d.ts` 比 `client.js` 更值得先读**
   - `client.js` 是编译后的巨长 bundle（`settings-general/lib/client.js` 605 行，含内联 CSS），但它是**完整可照抄的真实注册代码**。
   - 流程：先读 `lib/types/**/*.d.ts` 抓契约签名 → 再 grep `client.js` 里的 `settings.section` / `order:` / `register(` 定位真实用法。

---

## 4. 调查路径（时间线）

1. 定位芜湖：`Get-ChildItem` 列 `dsh-web-app` 依赖树，看到 `dsh-client-ui-settings*` 一族 → 确定「设置」和「工具/skill」两条主线。
2. 读 `dsh-client-ui-settings/lib/types/client/contract/slots.d.ts` → 拿到全部设置 slot 及 `settings.section` 契约（id/order/label）。
3. 读 `settings-general/lib/client.js` → 拿到 **`settings.section` 真实注册代码**（`ctx.slots.inject("settings.section", () => ctx.slots.register({…}, Component))`）+ `order:0`。
4. 读 `settings-models/lib/client.js` 的 `apply` → 确认 `models order:10`、`inject: () => ({…})` 把状态/controller 注入组件。
5. grep `settings-plugins/lib/client.js` → `plugins order:15`。
6. 读三个 settings 包的 `package.json` → 确认 `dsh.client.inject` + `peerDependencies` 形态。
7. 尝试定位 `dsh-client-ui-slots` 包 → 失败 → 识别为 type-only 虚拟包，API 从使用方反推。
8. `.pnpm` 顶层筛 `@deepseek-ai+dsh-*` → 发现 `dsh-tools` / `dsh-tool-*` / `dsh-llm` / `dsh-skill` / `dsh-commands` 工具生态。
9. 读 `dsh-system-prompt/lib/types/index.d.ts` → 拿到 `ctx.systemPrompt.section/context/tools`（system prompt 与工具 schema 都是 host 可扩展的）。
10. 读 `dsh-tools/lib/types/{index,schema}.d.ts` → 拿到 `ToolRuntime.register` + `ToolDefinition` + `defineTool` 完整契约。
11. 读 `dsh-tool-todo/lib/index.js` → 拿到 `ctx.tools.register(defineTool({name,description,parameters,output,execute}))` 的**完整可照抄示例**。
12. 读 `dsh-tool-todo/package.json` → 确认 host 工具插件无 `dsh.client`，靠 `main`+cordis host runner 装载。

---

## 5. 过程中的一次工具失效（记录在案）

- 最初并行派了两个 background subagent 分别调研「设置 slot」和「AI 工具/skill」，**均在完成前失败、未返回有效输出**（closing message 为空）。
- 转为亲自按上述路径读源码，很快拿到全部结论。
- 教训：DSH 源码目录层级深、junction 多，子代理容易迷路或超时；**这种精确契约调研，亲自 grep+read 指定文件更可靠**，subagent 更适合做「大范围粗筛」而非「逐文件精确取证」。

---

## 6. 复用指引（升级 DSH 版本时）

要找「某个契约」时，按这个顺序：

1. `versions\<新版本>\node_modules\.pnpm\@deepseek-ai+dsh-web-app@…\node_modules\@deepseek-ai\` 里先按功能名筛包。
2. 找 `.d.ts`（`lib/types/**/*.d.ts`）读契约签名；若包是 type-only 虚拟包（找不到目录），从使用方 `client.js` 反推。
3. 找真实示例：`*-settings-general`（设置 section）、`dsh-tool-todo`（工具注册）是两个最干净的范本。
4. `.pnpm` 顶层找 host 侧包（`dsh-tools`/`dsh-tool-*`/`dsh-system-prompt`），名字被 hash 截断，用前缀 `-like` 筛。
5. 判断 host/client：看 `package.json` 有没有 `dsh.client`（有=client 面）、`main`/`exports["."]` 指向的 `apply` 是不是 Node cordis 面。