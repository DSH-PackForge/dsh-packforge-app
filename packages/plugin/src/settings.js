// DSH 客户端插件 · 设置面板「整合包」section（需求 2）。
//
// 契约（已从 DSH 0.1.0-rc.8 源码确证，见 docs/dsh-plugin-集成契约.md）：
//   - 设置是 slot 系统：第三方往 `settings.section` 注册一项（id/order/label + React 组件）即可，
//     导航自动出现在「通用设置/模型/插件」旁边，无需改外壳。
//   - 注册 API：ctx.slots.inject("settings.section", () => ctx.slots.register(options, Component))
//   - 组件收到 owner props（close）+ 你 inject 返回的对象（t + packforge）。
import { createElement as h } from 'react';

const NS = 'dspack';

const dict = {
  zh: {
    nav: '整合包',
    title: '整合包',
    intro: '管理 DSH 整合包（.dspack）。导出/导入/市场在 host 侧经 dspack CLI 完成，就地查看走浏览器内解析。',
    'action.list': '列出 Profile',
    'action.market': '浏览市场',
    note: '完整导出/导入也可直接对 AI 说（由 dspack_export / dspack_install 工具接管）。',
  },
  en: {
    nav: 'Modpacks',
    title: 'Modpacks',
    intro: 'Manage DSH integration packs (.dspack). Export/import/market run on the host via the dspack CLI.',
    'action.list': 'List profiles',
    'action.market': 'Browse market',
    note: 'You can also ask the AI directly to export or install a pack.',
  },
};

/**
 * 把「整合包」section 挂进 DSH 设置面板。运行时缺少 slots/locale 服务时静默跳过（返回 false）。
 * @param {object} ctx DSH 客户端 cordis Context
 * @param {{host:any, api:any, capabilities:any}} packforge 注入给页面的能力面
 * @returns {boolean} 是否注册成功
 */
export function registerSettingsSection(ctx, packforge = {}) {
  const slots = ctx?.slots;
  const locale = ctx?.locale;
  if (!slots || typeof slots.inject !== 'function') return false;
  if (!locale || typeof locale.register !== 'function' || typeof locale.bind !== 'function') return false;

  // 双语文案：经 ctx.effect 注册（返回 disposer 由 cordis 托管清理）；无 ctx.effect 时直接注册。
  const registerLocale = () => locale.register(NS, dict);
  if (typeof ctx.effect === 'function') ctx.effect(registerLocale, 'dspack: settings dict');
  else registerLocale();

  const t = locale.bind(NS);

  slots.inject('settings.section', () =>
    slots.register(
      {
        name: 'settings.section',
        id: 'dspack',
        order: 20, // 通用=0 / 模型=10 / 插件=15 → 放最后
        label: () => t('nav'),
        inject: () => ({ t, packforge }),
      },
      DspackSection,
    ),
  );
  return true;
}

/** 「整合包」设置页主体（无状态：按钮触发 host 侧 CLI，输出显示在 DSH 终端/工具卡）。 */
export function DspackSection({ t, packforge }) {
  const api = packforge?.api;
  const shell = typeof api?.shell === 'function' ? api.shell : null;

  const actions = [
    { label: t('action.list'), run: () => shell(['list']) },
    { label: t('action.market'), run: () => shell(['market']) },
  ];

  const style = {
    section: { display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720, padding: '8px 0' },
    title: { margin: 0, fontSize: 16, fontWeight: 500, lineHeight: '24px' },
    intro: { margin: 0, fontSize: 14, lineHeight: '22px', color: 'var(--dsw-alias-label-tertiary)' },
    actions: { display: 'flex', gap: 8, margin: 0, padding: 0, listStyle: 'none' },
    btn: {
      height: 36, padding: '0 14px', borderRadius: 18, border: 'none', cursor: 'pointer',
      fontSize: 14, lineHeight: '22px', background: 'var(--dsw-alias-button-primary-fill)',
      color: 'var(--dsw-alias-label-primary-foreground)', font: 'inherit',
    },
    note: { margin: 0, fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)' },
  };

  return h('div', { style: style.section },
    h('h2', { style: style.title }, t('title')),
    h('p', { style: style.intro }, t('intro')),
    h('ul', { style: style.actions },
      actions.map((a) =>
        h('li', { key: a.label },
          h('button', {
            type: 'button', style: style.btn, disabled: !shell,
            onClick: () => { try { a.run(); } catch { /* 无 shell 或执行失败：忽略 */ } },
          }, a.label),
        ),
      ),
    ),
    h('p', { style: style.note }, t('note')),
  );
}