// DSH host 面 · skill 注册：把 PackForge 的「整合包工作流」作为 runtime skill 交给 ctx.skills，
// 让 AI 在「打包/分享/发布整合包」语境下自主加载这份流程知识（比单句 systemPrompt 路由更完整）。
//
// 契约（已从 DSH 0.1.2-alpha.5 源码确证，@deepseek-ai/dsh-skill）：
//   - ctx.skills 是 host cordis Context 服务（SkillRegistry）。
//   - ctx.skills.register(skill) 注册一个 runtime skill，必填 { name, description, source, content }。
//     register 只给 invocation/provider 补默认；source 不补，漏了会在 load 时抛「source must be a string」。
//   - name 须 kebab-case；同 layer 内 project > runtime > user 优先级（用户本地 skills/ 可覆盖）。

/** 当前仅一个 skill：导出整合包（dspack_export 的端到端工作流指引）。 */
export const dspackSkillDefinitions = [
  {
    name: 'export-dspack',
    description: '把 DSH profile 导出为可分享的 .dspack 整合包（含技能/预设/指令/数据）',
    whenToUse: '用户想打包、导出、分享、发布一个 DSH 整合包或 profile 时',
    source: 'runtime',
    content: `# 导出 DSH 整合包（.dspack）

目标：把一个调好的 profile 打包成单文件 .dspack（或 git 源仓库），可分发给别人一键安装。

## 流程
1. 确认对象：先 "dspack_list" 列出可用 profile；用户没指定时读当前 home 的 last_profile 或 .dshpkcfg，不确定就问，别猜。
2. 确认内容：四个开关 skills/、.agent-presets/、AGENTS.md、data/，默认全带；用户说「只要 skill」时按需关掉其余。
3. 确认元数据：name（slug 小写连字符）、version（默认 1.0.0）、displayName / description / author、dshVersion（默认取已装最新）。
4. 执行："dspack_export"。默认 mode=dspack（单文件 + sha256）；要发 git 仓库/市场用 mode=repo。
5. 汇报：产出路径 + 大小 + sha256；可选 "dspack_view" 回校验一次。

## 注意
- .dshpkcfg 是工具本地快照，会自动排除，不会进包。
- 同版本重复导出：dspack 形态用 force 覆盖；repo 形态同版本会冲突（需先 bump version）。
- 导出的粒度是「单个 profile」，home 级内容（skills/ 等）经 homeInclude 一并带上。`,
  },
];
