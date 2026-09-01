// DSH host 插件入口（cordis 面）。
//
// 契约（已从 DSH 0.1.0-rc.8 源码确证）：
//   - host 插件 = cordis 插件 `{ name, inject, apply(ctx) }`，由 cordis-plugin-loader 装载；
//   - `ctx.tools` 来自 @deepseek-ai/dsh-tools（ToolRuntime），`register(definition)` 把一个工具纳入模型工具清单；
//   - 工具定义见 ./tools.js（手写 ToolDefinition，零 DSH 运行时依赖）。
//
// 说明：本包代码不 import 任何 @deepseek-ai/* 模块——`ctx` 由 DSH host 运行时注入。
// 只要 host 装载本插件且提供了 `ctx.tools`，AI 就能看到并自主调用 dspack_* 工具。
import { dspackToolDefinitions } from './tools.js';

export const name = 'dspack-host';

export const inject = ['tools'];

/** 引导 AI 何时用这些工具的一段 system prompt（order 150 落在「工具引导 100–199」惯例区）。 */
const GUIDANCE_TEXT =
  '本环境提供 DSH 整合包（.dspack）能力：' +
  '导出用 dspack_export，列出可用 profile 用 dspack_list，查看已打包内容用 dspack_view，' +
  '安装新的整合包 profile 用 dspack_install。用户说「导出/打包/查看/安装整合包」时直接调用对应工具。';

export function apply(ctx) {
  if (!ctx?.tools || typeof ctx.tools.register !== 'function') return;

  for (const def of dspackToolDefinitions) {
    ctx.tools.register(def);
  }

  if (ctx?.systemPrompt && typeof ctx.systemPrompt.section === 'function') {
    ctx.systemPrompt.section({ name: 'dspack:guidance', order: 150, text: GUIDANCE_TEXT });
  }
}