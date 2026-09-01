import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerSettingsSection, DspackSection } from '../src/settings.js';

/** mock DSH client slots 服务。 */
function makeSlots() {
  const injected = {};
  return {
    injected,
    inject(name, factory) { injected[name] = factory; },
    register(options, Component) { return { options, Component }; },
  };
}

/** mock DSH client locale 服务（bind 按 zh 词典取值）。 */
function makeLocale() {
  const state = { dict: null };
  return {
    state,
    register(ns, dict) { state.dict = dict; return () => {}; },
    bind(ns) { return (key) => state.dict?.zh?.[key] ?? key; },
  };
}

test('registerSettingsSection：注册 settings.section（id/order/label + React 组件）', () => {
  const slots = makeSlots();
  const locale = makeLocale();
  const ctx = { slots, locale, effect: (fn) => fn() };
  const packforge = { api: { shell: () => {} }, capabilities: {}, host: null };

  assert.equal(registerSettingsSection(ctx, packforge), true);

  const factory = slots.injected['settings.section'];
  assert.equal(typeof factory, 'function');

  const { options, Component } = factory();
  assert.equal(options.name, 'settings.section');
  assert.equal(options.id, 'dspack');
  assert.equal(options.order, 20);
  assert.equal(typeof options.label, 'function');
  assert.equal(options.label(), '整合包');           // zh
  assert.equal(typeof options.inject, 'function');
  const injected = options.inject();
  assert.equal(typeof injected.t, 'function');
  assert.equal(injected.packforge, packforge);
  assert.equal(Component, DspackSection);
  assert.equal(typeof Component, 'function');
});

test('registerSettingsSection：无 slots / locale 时静默降级返回 false', () => {
  assert.equal(registerSettingsSection({}, {}), false);
  assert.equal(registerSettingsSection({ slots: makeSlots() }, {}), false);              // 缺 locale
  assert.equal(registerSettingsSection({ locale: makeLocale() }, {}), false);            // 缺 slots
  assert.doesNotThrow(() => registerSettingsSection({ slots: { inject() {} }, locale: { register() {}, bind() {} } }, {}));
});

test('registerSettingsSection：无 ctx.effect 时仍能注册', () => {
  const slots = makeSlots();
  const locale = makeLocale();
  const ctx = { slots, locale }; // 无 effect
  assert.equal(registerSettingsSection(ctx, { api: {}, capabilities: {}, host: null }), true);
  assert.equal(typeof slots.injected['settings.section'], 'function');
});

test('DspackSection 是 React 组件函数（createElement 返回元素树）', () => {
  const el = DspackSection({ t: (k) => k, packforge: { api: { shell: () => {} } } });
  assert.ok(el);
  assert.equal(typeof el.type, 'string'); // 'div'
  assert.equal(el.props.children.filter(Boolean).length > 0, true);
});