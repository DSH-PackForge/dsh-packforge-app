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
    intro: '把当前实例里正在运行的 profile 导出为 .dspack 整合包（skill/预设/指令/数据可一并带上）。',
    'action.read': '读取配置',
    'action.save': '保存配置',
    'action.export': '导出',
    'action.market': '浏览市场',
    'action.browse': '浏览…',
    'action.detect': '自动识别',
    'group.meta': '基本信息',
    'group.output': '输出',
    'group.content': '导出内容',
    'field.name': '整合包名（留空用 profile 名）',
    'field.version': '版本（留空用默认）',
    'field.displayName': '展示名（留空用 profile 名）',
    'field.description': '描述',
    'field.author': '作者',
    'field.icon': '图标 URL',
    'field.dshVersion': 'DSH 版本（留空取最新已装）',
    'field.out': '输出目录（留空用当前目录）',
    'export.skill': 'skills/ 技能',
    'export.preset': '.agent-presets/ 预设',
    'export.instruction': 'AGENTS.md 全局指令',
    'export.data': 'data/ 数据',
    'result.pending': '处理中…',
    'result.readOk': '已读取配置',
    'result.readFail': '读取配置失败（无 .dshpkcfg 或命令不可用）',
    note: '完整导出/导入也可直接对 AI 说（由 dspack_export / dspack_install 工具接管）。',
  },
  en: {
    nav: 'Modpacks',
    title: 'Modpacks',
    intro: 'Export the running profile of this instance as a .dspack pack (skills / presets / instructions / data can ride along).',
    'action.read': 'Read config',
    'action.save': 'Save config',
    'action.export': 'Export',
    'action.market': 'Browse market',
    'action.browse': 'Browse…',
    'action.detect': 'Auto detect',
    'group.meta': 'Metadata',
    'group.output': 'Output',
    'group.content': 'Export content',
    'field.name': 'Pack name (blank = profile name)',
    'field.version': 'Version (blank = default)',
    'field.displayName': 'Display name (blank = profile name)',
    'field.description': 'Description',
    'field.author': 'Author',
    'field.icon': 'Icon URL',
    'field.dshVersion': 'DSH version (blank = latest)',
    'field.out': 'Output dir (blank = current)',
    'export.skill': 'skills/ skills',
    'export.preset': '.agent-presets/ presets',
    'export.instruction': 'AGENTS.md instruction',
    'export.data': 'data/ data',
    'result.pending': 'Working…',
    'result.readOk': 'Config loaded',
    'result.readFail': 'Failed to read config (no .dshpkcfg or command unavailable)',
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

  // 双语文案：经 ctx.effect 注册；不把 locale.register 的返回值透传给 effect（cordis effect 只接受 function/null/Promise/可迭代，普通对象会抛 Invalid effect）。
  const registerLocale = () => { locale.register(NS, dict); };
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
        locale: NS,
        inject: () => ({ t, packforge }),
      },
      DspackSection,
    ),
  );
  return true;
}

/** 表单里的文本字段（profile 包元数据 + 输出）。 */
const TEXT_FIELDS = ['name', 'version', 'displayName', 'description', 'author', 'icon', 'dshVersion', 'out'];

/** 分组布局：每个分组一个标题 + 一组字段。 */
const GROUPS = [
  { title: 'group.meta', fields: ['name', 'version', 'displayName', 'description', 'author', 'icon'] },
  { title: 'group.output', fields: ['dshVersion', 'out'] },
];

/** 「整合包」设置页主体：分组表单 + 读取配置/导出/浏览市场按钮（经 remote.commands）+ 结果展示。 */
export function DspackSection({ t, packforge }) {
  const runCommand = packforge?.api?.runCommand;
  const readConfig = packforge?.api?.readConfig;
  const pickDirectory = packforge?.api?.pickDirectory;
  const detectDshVersion = packforge?.api?.detectDshVersion;
  const fields = {};
  let resultEl = null;

  const ref = (key) => (el) => { fields[key] = el; };

  const fillForm = (cfg, refs = fields) => {
    for (const key of TEXT_FIELDS) if (refs[key]) refs[key].value = cfg[key] ?? '';
    const ec = cfg.exportContent ?? {};
    for (const key of ['skill', 'preset', 'instruction', 'data']) {
      if (refs[key]) refs[key].checked = ec[key] !== false;
    }
  };

  const showResult = (r) => {
    if (!resultEl) return;
    if (r?.pending) { resultEl.textContent = t('result.pending'); return; }
    resultEl.textContent = r?.ok ? `✓ ${r.text}` : `✗ ${r.error}`;
  };

  const doReadConfig = async () => {
    if (!readConfig) return;
    showResult({ pending: true });
    const refs = { ...fields }; // await 前快照，避免 await 期间组件重渲染导致 fields 变空
    const cfg = await readConfig();
    if (cfg && typeof cfg === 'object') { fillForm(cfg, refs); showResult({ ok: true, text: t('result.readOk') }); }
    else showResult({ ok: false, error: t('result.readFail') });
  };

  const doBrowse = async () => {
    if (!pickDirectory) return;
    const outEl = fields.out; // await 前快照，避免重渲染后 fields.out 变空
    const r = await pickDirectory();
    if (r?.ok && r.path && outEl) outEl.value = r.path;
    else if (r && !r.ok) showResult({ ok: false, error: r.error });
  };

  const doDetectVersion = async () => {
    if (!detectDshVersion) return;
    const el = fields.dshVersion; // await 前快照
    const ver = await detectDshVersion();
    if (ver && el) el.value = ver;
  };

  const doSaveConfig = async () => {
    if (!runCommand) return;
    const config = {};
    for (const key of TEXT_FIELDS) config[key] = fields[key]?.value?.trim() ?? '';
    config.exportContent = {
      skill: fields.skill?.checked ?? true,
      preset: fields.preset?.checked ?? true,
      instruction: fields.instruction?.checked ?? true,
      data: fields.data?.checked ?? true,
    };
    showResult({ pending: true });
    showResult(await runCommand('/dspack-save-config ' + JSON.stringify(config)));
  };

  const doExport = async () => {
    if (!runCommand) return;
    const overrides = {};
    for (const key of TEXT_FIELDS) {
      const v = fields[key]?.value?.trim();
      if (v) overrides[key] = v;
    }
    overrides.exportContent = {
      skill: fields.skill?.checked ?? true,
      preset: fields.preset?.checked ?? true,
      instruction: fields.instruction?.checked ?? true,
      data: fields.data?.checked ?? true,
    };
    showResult({ pending: true });
    showResult(await runCommand('/dspack-export ' + JSON.stringify(overrides)));
  };

  const doMarket = async () => {
    if (!runCommand) return;
    showResult({ pending: true });
    showResult(await runCommand('/dspack-market'));
  };

  const style = {
    section: { display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720, padding: '8px 0' },
    title: { margin: 0, fontSize: 16, fontWeight: 500, lineHeight: '24px' },
    intro: { margin: 0, fontSize: 14, lineHeight: '22px', color: 'var(--dsw-alias-label-tertiary)' },
    group: { display: 'flex', flexDirection: 'column', gap: 6 },
    groupTitle: { margin: '8px 0 0', fontSize: 13, fontWeight: 600, lineHeight: '20px', color: 'var(--dsw-alias-label-primary)' },
    field: { display: 'flex', flexDirection: 'column', gap: 4 },
    fieldLabel: { fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-secondary)' },
    input: {
      height: 32, padding: '4px 10px', borderRadius: 8, border: '1px solid var(--dsw-alias-border-l2)',
      fontSize: 13, lineHeight: '20px', background: 'var(--dsw-alias-bg-layer-1)',
      color: 'var(--dsw-alias-label-primary)', font: 'inherit', outline: 'none', boxSizing: 'border-box',
    },
    outRow: { display: 'flex', gap: 8 },
    browseBtn: {
      height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid var(--dsw-alias-border-l2)',
      cursor: 'pointer', fontSize: 13, lineHeight: '20px', background: 'var(--dsw-alias-bg-layer-1)',
      color: 'var(--dsw-alias-label-primary)', font: 'inherit',
    },
    check: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
    checkInput: { margin: 0 },
    checkLabel: { fontSize: 13, lineHeight: '20px', color: 'var(--dsw-alias-label-primary)' },
    actions: { display: 'flex', gap: 8, margin: '4px 0 0', padding: 0, listStyle: 'none' },
    btn: {
      height: 36, padding: '0 14px', borderRadius: 18, border: 'none', cursor: 'pointer',
      fontSize: 14, lineHeight: '22px', background: 'var(--dsw-alias-button-primary-fill)',
      color: 'var(--dsw-alias-label-primary-foreground)', font: 'inherit',
    },
    note: { margin: 0, fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)' },
    result: { margin: 0, fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
  };

  const field = (key) => {
    if (key === 'out') {
      return h('label', { style: style.field },
        h('span', { style: style.fieldLabel }, t('field.out')),
        h('div', { style: style.outRow },
          h('input', { style: { ...style.input, flex: 1 }, ref: ref('out') }),
          h('button', { type: 'button', style: style.browseBtn, disabled: !pickDirectory, onClick: doBrowse }, t('action.browse')),
        ),
      );
    }
    if (key === 'dshVersion') {
      return h('label', { style: style.field },
        h('span', { style: style.fieldLabel }, t('field.dshVersion')),
        h('div', { style: style.outRow },
          h('input', { style: { ...style.input, flex: 1 }, ref: ref('dshVersion') }),
          h('button', { type: 'button', style: style.browseBtn, disabled: !detectDshVersion, onClick: doDetectVersion }, t('action.detect')),
        ),
      );
    }
    return h('label', { style: style.field },
      h('span', { style: style.fieldLabel }, t('field.' + key)),
      h('input', { style: style.input, ref: ref(key) }),
    );
  };

  const checkbox = (key) => h('label', { style: style.check },
    h('input', { type: 'checkbox', style: style.checkInput, defaultChecked: true, ref: ref(key) }),
    h('span', { style: style.checkLabel }, t('export.' + key)),
  );

  const group = (g) => h('div', { style: style.group },
    h('div', { style: style.groupTitle }, t(g.title)),
    ...g.fields.map(field),
  );

  return h('div', { style: style.section },
    h('h2', { style: style.title }, t('title')),
    h('p', { style: style.intro }, t('intro')),
    ...GROUPS.map(group),
    h('div', { style: style.group },
      h('div', { style: style.groupTitle }, t('group.content')),
      checkbox('skill'),
      checkbox('preset'),
      checkbox('instruction'),
      checkbox('data'),
    ),
    h('ul', { style: style.actions },
      h('li', { key: 'read' },
        h('button', { type: 'button', style: style.btn, disabled: !readConfig, onClick: doReadConfig }, t('action.read')),
      ),
      h('li', { key: 'save' },
        h('button', { type: 'button', style: style.btn, disabled: !runCommand, onClick: doSaveConfig }, t('action.save')),
      ),
      h('li', { key: 'export' },
        h('button', { type: 'button', style: style.btn, disabled: !runCommand, onClick: doExport }, t('action.export')),
      ),
      h('li', { key: 'market' },
        h('button', { type: 'button', style: style.btn, disabled: !runCommand, onClick: doMarket }, t('action.market')),
      ),
    ),
    h('p', { style: style.result, ref: (el) => { resultEl = el; } }),
    h('p', { style: style.note }, t('note')),
  );
}
