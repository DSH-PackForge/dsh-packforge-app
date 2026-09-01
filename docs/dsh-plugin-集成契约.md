# DSH 插件集成契约（两个需求）

> 调研对象：DSH 客户端 0.1.0-rc.8 源码（`…\in.dsh-plug.dsh-launcher\versions\0.1.0-rc.8\node_modules\.pnpm\…`）。
> 结论全部来自真实源码确证，非猜测。本文档面向两个需求：
> 1. **AI 可自主导出** —— 你对 DSH 里的 AI 说「导出整合包」，它知道这个能力并自己调用。
> 2. **设置面板加「整合包」图形界面** —— 点设置按钮后，在「通用设置/模型/插件」旁多一个「整合包」入口。

---

## 0. 一图结论

| 需求 | DSH 扩展点 | 插件侧 | 关键 API |
|---|---|---|---|
| 设置面板「整合包」 | slot 系统 `settings.section` | **client（web）** | `ctx.slots.inject("settings.section", () => ctx.slots.register({…}, DspackSection))` |
| AI 自主导出 | 工具注册 `ctx.tools` | **host（Node）** | `ctx.tools.register(defineTool({ name, description, parameters, output, execute }))` |

DSH 插件有 **host 面**（Node 侧 cordis Context）和 **client 面**（浏览器 `__ModuleLoader__`）之分：
- 「给 AI 加工具」必须在 **host 面**（`ctx.tools` 只在 host cordis Context 上）。
- 「加设置面板 GUI」必须在 **client 面**（`ctx.slots` 只在 client Context 上）。

因此需要 **新建一个 host 工具插件包** + **改造现有 client 插件**，两者共享 `@dsh-packforge/core`。

---

## 1. 需求 2：设置面板加「整合包」section（client）

### 1.1 机制：slot 系统

设置面板是一个 slot 组合体，第三方插件只往 `settings.section` 这个 slot 里注册一项，左侧导航就会自动多出一条，**完全不用改 DSH 外壳**。

证据：
- `@deepseek-ai/dsh-client-ui-settings/lib/types/client/contract/slots.d.ts` —— 声明了全部设置 slot：
  `settings.trigger / settings.header / settings.action / settings.close / settings.section / settings.plugins.tab / settings.onboarding / settings.general.item`。
  注释原文：*「A feature owns its own settings pages — adding a setting never means editing the shell」*。
- `settings.section` 定义：`kind:'list'`，每个 list entry 是一个设置页；options 携带 `id`（section key）、`order`（导航位次）、`label`（registrant 本地化文字）。
- 渲染者：`@deepseek-ai/dsh-client-ui-settings-general/lib/client.js` 的 `SettingsRoot` 组件，按 `order` 升序把 `settings.section` 各 entry 渲染成左侧导航，点击后 `renderSlot("settings.section", {close:{only:activeId}})` 只挂载激活的那一项。

### 1.2 注册代码（照抄 `settings-general` / `settings-models`）

```js
// client 插件导出（cordis 面）
const inject = ["slots", "locale"];   // 需要的 cordis 服务

function apply(ctx) {
  // 1) 注册本插件的双语文案
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dspack: dict");
  const t = ctx.locale.bind(NS);

  // 2) 注册一个设置 section
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "dspack",                // 唯一 section id
    order: 20,                   // 导航顺序
    label: () => t("nav"),       // 导航文字「整合包」
    inject: () => ({ /* 要注入给页面的状态/方法/controller */ })
  }, DspackSection));            // 页面主体 React 组件
}
export { apply, inject, name };
```

真实样例（可直接对照）：
- `@deepseek-ai/dsh-client-ui-settings-general/lib/client.js`：注册 `id:"general", order:0` 的 GeneralSection。
- `@deepseek-ai/dsh-client-ui-settings-models/lib/client.js`（`apply` 内）：注册 `id:"models", order:10`，`inject: () => ({ controller, hooks:{snapshot}, api, schema, t })`，组件 `ModelsSection`。
- `@deepseek-ai/dsh-client-ui-settings-plugins/lib/client.js`：注册 `id:"plugins", order:15`。

### 1.3 导航顺序（order）

| section | id | order |
|---|---|---|
| 通用设置 | `general` | 0 |
| 模型 | `models` | 10 |
| （agent-presets 等中间项） | — | — |
| 插件 | `plugins` | 15 |
| **整合包（新增）** | `dspack` | **20**（建议放最后） |

### 1.4 Section 页面内容怎么渲染

`SettingsSectionOwnerProps` 只约定 `{ close: () => void }`。页面主体由注册时的第二参数（React 组件）承载；组件实际收到的 props = **owner props（close）+ slot 系统注入的 `renderSlot` + 你 `inject` 返回的对象**（若有 `children` 子 slot 还可 `renderSlot("子slot名")`）。

我们不需要子 slot，组件直接渲染完整的整合包 GUI：

```js
function DspackSection({ close, t, controller /* …来自 inject */ }) {
  return /* 导出 / 导入 / 市场 / 查看 四块 UI */;
}
```

### 1.5 package.json 形态（client 插件）

对照 `settings-models/package.json`：

```jsonc
{
  "name": "@dsh-packforge/plugin",
  "exports": {
    ".": "./src/index.js",
    "./client": "./lib/client.js"        // 浏览器 bundle
  },
  "dsh": {
    "client": {
      "platform": "web",
      "inject": [
        "@deepseek-ai/dsh-client-runtime",        // 已有
        "@deepseek-ai/dsh-client-ui-settings",   // 新增：settings slot 基座
        "@deepseek-ai/dsh-client-locale",        // 新增：locale 服务
        "@deepseek-ai/dsh-client-ui-slots"       // 新增：slots 服务
      ]
    }
  },
  "peerDependencies": {
    "@deepseek-ai/cordis": "^4.0.1",
    "@deepseek-ai/dsh-client-runtime": "^0.1.0-rc.8",
    "@deepseek-ai/dsh-client-ui-settings": "^0.1.0-rc.8",
    "@deepseek-ai/dsh-client-locale": "^0.1.0-rc.8",
    "@deepseek-ai/dsh-client-ui-slots": "^0.1.0-rc.8",
    "react": "^18.2.0"                          // DSH 模块系统提供，external
  }
}
```

**打包要点**：esbuild 把 `react`、`react/jsx-runtime`、`@deepseek-ai/*`、`@deepseek-ai/cordis` 全部标为 **external**（这些由 DSH 模块系统 `require` 供应）；`react/jsx-runtime` 说明无需自己带 JSX 编译器（可写 `React.createElement`，或走 DSH 的 transform）。

---

## 2. 需求 1：AI 自主导出（host）

### 2.1 机制：工具注册 `ctx.tools`

AI 的工具清单来自 `@deepseek-ai/dsh-tools` 的 `ToolRuntime` 服务（`ctx.tools`）。插件在 host 面注册一个 `ToolDefinition`（schema + 执行函数），模型就能在渲染工具清单里看到它的 `name/description/parameters`，并在需要时自主调用。

证据：
- `@deepseek-ai/dsh-tools/lib/types/index.d.ts` —— `declare module '@deepseek-ai/cordis' { interface Context { tools: ToolRuntime } }`；`ToolRuntime.register(definition): () => void`。
- 同文件 `ToolDefinition extends ToolSchema { output; execute; finalizeContent?; timeoutMs?; isConcurrencySafe?; presentCall?; presentResult?; }`。
- 同目录 `schema.d.ts` —— `defineTool(options)`。
- 真实示例：`@deepseek-ai/dsh-tool-todo/lib/index.js`（`todo_write` 工具的完整注册；下节直接提炼）。

### 2.2 最小可照抄代码

```js
// host 插件（Node 侧 cordis 面）
import { defineTool } from "@deepseek-ai/dsh-tools";

const name = "tool-dspack";
const inject = ["tools"];           // 注入 ctx.tools

function apply(ctx) {
  ctx.tools.register(defineTool({
    name: "dspack_export",          // 工具名：模型可见、全局唯一
    description: "把某个 DSH profile 打包导出为 .dspack 整合包。profile 用名字或绝对路径；out 为输出目录（缺省当前目录）。",
    parameters: {                    // 模型按此 schema 传参
      profile: { type: "string", required: true, description: "profile 名或绝对路径" },
      out:     { type: "string", description: "输出目录，缺省当前目录" },
    },
    output: {                        // 返回值契约
      schema: { type: "object", additionalProperties: false, properties: {
        output: { type: "string", required: true },
        sha256: { type: "string", required: true },
        size:   { type: "integer", required: true },
      } },
      render: (_args, value) => [{ type: "text", text:
        `已导出 ${value.output}（${value.size} 字节，sha256=${value.sha256}）` }],
    },
    execute(args, exec) {            // 真正干活：复用现有 core
      return PackForgeHost.export(args.profile, args.out);  // → { output, sha256, size }
    },
    presentCall: (args) => ({ card: "generic", title: "导出整合包", kind: "other", rawInput: args }),
  }));
}
export { apply, inject, name };
```

### 2.3 工具定义字段速查

| 字段 | 作用 |
|---|---|
| `name` | 工具唯一名，模型看到/调用的名字 |
| `description` | 发给模型的说明（何时用、怎么用） |
| `parameters` | 参数 JSON Schema 的 DSL 形式（`{type, required, description, items, enum, properties, additionalProperties}`） |
| `output.schema` | 返回值 JSON Schema，registry 强校验 |
| `output.render` | 把返回值投影成模型可见的 `ContentBlock[]`（`{type:"text", text}`） |
| `execute(args, exec)` | 执行体；`exec` 提供 `signal`（取消）、`deferContext`、`concludeTurn` |
| `presentCall` / `presentResult` | 纯 UI 呈现（pending/完成卡片），可选 |
| `timeoutMs` / `isConcurrencySafe` | 超时预算 / 并发分类，可选 |

### 2.4 让 AI「知道何时用」：system prompt 注入（可选但推荐）

`@deepseek-ai/dsh-system-prompt` 暴露 `ctx.systemPrompt.section(...)`（`lib/types/index.d.ts`），工具引导文字惯例用 `order 100–199`：

```js
ctx.systemPrompt.section({
  name: "dspack:guidance",
  order: 150,
  text: "当用户要求导出/导入/查看 DSH 整合包（.dspack）时，使用 dspack_export / dspack_install / dspack_view / dspack_list 工具。",
});
```

---

## 3. 架构建议

新增一个 host 工具插件包，与现有 client 插件独立、共享 core：

| 包 | 平台 | 职责 | 状态 |
|---|---|---|---|
| `@dsh-packforge/host-plugin` | Node / host | 注册 `dspack_export / dspack_list / dspack_view / dspack_install`（+ 可选市场搜索）；`execute` 用 `NodeHost` 走真实 fs | **新建** |
| `@dsh-packforge/plugin` | web / client | `settings.section`「整合包」GUI，复用现有 `host/api/capabilities` | **改造** |
| `@dsh-packforge/core` + `cli` | 共享 | 打包/导入/市场/查看的业务逻辑，host 工具与 client GUI 共用，保证行为一致 | 改动极小 |

- client GUI 继续走 `ctx.shell` 委派 CLI（现有 `api.shell(argv)` 设计），第一版不引入自定义 client↔host RPC。
- host 工具直接调 core（`NodeHost`），不依赖全局 CLI 安装。

### 落地改动清单

1. `packages/host-plugin/`（新）：
   - `src/index.js`：`defineTool` 注册 3–4 个工具 + 可选 `systemPrompt.section`。
   - `src/actions.js`：把 `packProfile/discoverProfiles/inspectPack/installPack` 包成工具 execute 直接调用的入口（用 `NodeHost`）。
   - `package.json`：deps = `@dsh-packforge/core` + `@deepseek-ai/dsh-tools` + `@deepseek-ai/cordis`；`main`/`exports["."]` 指向 host 入口。
   - `test/*.test.js`：mock `ctx`，断言 `defineTool` 产出 `{name,description,parameters,output,execute}`、execute 真调 core。
2. `packages/plugin/`（改造）：
   - `apply(ctx)` 增 settings section 注册；新增 `DspackSection` React 组件（导出/导入/市场/查看四块 UI）。
   - `package.json` 补 `dsh.client.inject` + peerDeps（见 §1.5）。
   - `bundle` 脚本：`react` + `@deepseek-ai/*` 标 external。
   - `test/*.test.js`：mock `ctx.slots`/`ctx.locale`，断言注册了 `settings.section` 且 id/order/label 正确。
3. `packages/core`：如需，补一个 host 工具专用薄入口（`packForgeActions`），几乎零改动。

---

## 4. 源码证据索引

| 结论 | 证据（DSH 0.1.0-rc.8 检出，`node_modules\.pnpm\…` 下） |
|---|---|
| 设置 slot 全集 + `settings.section` 契约 | `@deepseek-ai/dsh-client-ui-settings/lib/types/client/contract/slots.d.ts` |
| 「加设置不用改壳」的设计声明 | 同上（`settings.section` 注释） |
| 设置导航渲染者（按 order 排序、`{only}` 过滤） | `dsh-client-ui-settings-general/lib/client.js`（`SettingsRoot`） |
| `settings.section` 真实注册（general） | `dsh-client-ui-settings-general/lib/client.js`（`apply` 内，`order:0`） |
| `models` section（order 10） | `dsh-client-ui-settings-models/lib/client.js`（`id:"models", order:10`） |
| `plugins` section（order 15） | `dsh-client-ui-settings-plugins/lib/client.js`（`id:"plugins", order:15`） |
| client 插件 package.json 形态 | `dsh-client-ui-settings-models/package.json`（`dsh.client.inject` + `peerDependencies`） |
| `ctx.tools` + `ToolRuntime.register` | `@deepseek-ai/dsh-tools/lib/types/index.d.ts` |
| `ToolDefinition` 字段 | 同上（`ToolDefinition` / `ToolOutputDefinition`） |
| `defineTool` 签名 | `@deepseek-ai/dsh-tools/lib/types/schema.d.ts` |
| 真实工具注册示例 | `@deepseek-ai/dsh-tool-todo/lib/index.js`（`ctx.tools.register(defineTool({…}))`） |
| system prompt 可注入 + order 惯例 | `@deepseek-ai/dsh-system-prompt/lib/types/index.d.ts`（`SystemPrompt.section`） |
| `dsh.client` 字段真实格式 | `dsh-client-ui-settings-general/package.json`（`dsh.client{platform,inject}`） |

---

## 5. 风险与待办

- **真实 DSH 联调是最大 gap**：沙箱起不了 DSH Web GUI，`ctx.tools` / `ctx.slots` 目前只能靠 mock ctx 单测验证，最终要在真实 DSH 里跑一次。
- **host 插件的「安装进 DSH」途径未确证**：需再查 `@deepseek-ai/dsh-host-plugin-inventory` 包，确认第三方 host 插件如何被用户安装进 DSH（npm 装包后如何在 cordis host 装载清单里启用）。
- **client GUI 与 host 能力的一致性**：第一版 client 走 `ctx.shell`+CLI、host 工具直接调 core，两者共享 core 保证行为一致；后续如需更紧的 client↔host 联动，再引入 remote API 契约。