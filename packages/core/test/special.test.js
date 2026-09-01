import { test } from 'node:test';
import assert from 'node:assert';
import { summarizeSpecial } from '../src/index.js';

test('special：识别 skill（平铺 .md 与目录 SKILL.md）', () => {
  const r = summarizeSpecial([
    { rel: 'skills/fmt.md' },
    { rel: 'skills/audit/SKILL.md' },
    { rel: 'skills/audit/extra.txt' }, // 非 SKILL.md，不识别
  ]);
  assert.deepEqual(r.skills.map((s) => s.name), ['fmt', 'audit']);
  assert.deepEqual(r.agentPresets, []);
  assert.deepEqual(r.icons, []);
});

test('special：识别 agent-preset，其内部资产不误判为 skill', () => {
  const r = summarizeSpecial([
    { rel: '.agent-presets/code/agent.cordis.yml' },
    { rel: '.agent-presets/code/preset.yml' },
    { rel: '.agent-presets/code/skills/helper/SKILL.md' }, // preset 自附 skill，不单独算
  ]);
  assert.deepEqual(r.agentPresets, [{ id: 'code', file: '.agent-presets/code/agent.cordis.yml' }]);
  assert.deepEqual(r.skills, []);
  assert.deepEqual(r.icons, []);
});

test('special：识别 icon（icons/ + icon/ + 根 logo.*）', () => {
  const r = summarizeSpecial([
    { rel: 'icons/logo.png' },
    { rel: 'icon/app.svg' },
    { rel: 'logo.webp' },
    { rel: 'README.md' },
  ]);
  assert.deepEqual(r.icons.sort(), ['icon/app.svg', 'icons/logo.png', 'logo.webp'].sort());
  assert.deepEqual(r.skills, []);
  assert.deepEqual(r.agentPresets, []);
});

test('special：空输入返回空分类', () => {
  assert.deepEqual(summarizeSpecial([]), { skills: [], agentPresets: [], icons: [] });
  assert.deepEqual(summarizeSpecial(undefined), { skills: [], agentPresets: [], icons: [] });
});