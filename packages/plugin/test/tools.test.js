import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NodeHost } from '@dsh-packforge/host-node';
import { apply, name, inject } from '../src/index.js';
import { dspackToolDefinitions, dspackExport, dspackView, dspackInstall } from '../src/tools.js';
import { dspackSkillDefinitions } from '../src/skills.js';

test('exports：cordis 面 { name, inject, apply }', () => {
  assert.equal(name, 'dspack-host');
  assert.deepEqual(inject, ['tools', 'systemPrompt', 'skills']);
  assert.equal(typeof apply, 'function');
});

test('工具定义：每个都有模型面对字段 + execute', () => {
  assert.equal(dspackToolDefinitions.length, 4);
  const names = dspackToolDefinitions.map((d) => d.name);
  assert.deepEqual(names, ['dspack_list', 'dspack_export', 'dspack_view', 'dspack_install']);

  for (const d of dspackToolDefinitions) {
    assert.equal(typeof d.name, 'string');
    assert.equal(typeof d.description, 'string');
    // parameters 是标准 JSON Schema 对象根
    assert.equal(d.parameters.type, 'object');
    assert.equal(d.parameters.additionalProperties, false);
    // output 契约
    assert.equal(typeof d.output.schema, 'object');
    assert.equal(typeof d.output.render, 'function');
    assert.equal(typeof d.execute, 'function');
    // execute 必须返回 Promise
    assert.equal(d.execute.constructor.name, 'AsyncFunction');
  }
});

test('skill 定义：name kebab-case + description + content', () => {
  assert.equal(dspackSkillDefinitions.length, 1);
  const s = dspackSkillDefinitions[0];
  assert.equal(s.name, 'export-dspack');
  assert.match(s.name, /^[a-z][a-z0-9-]*$/);
  assert.equal(typeof s.description, 'string');
  assert.equal(typeof s.whenToUse, 'string');
  assert.equal(typeof s.source, 'string');
  assert.equal(s.source, 'runtime');
  assert.equal(typeof s.content, 'string');
  assert.match(s.content, /dspack_export/);
  assert.match(s.content, /dspack_list/);
});

test('apply：注册工具 + 注入 system prompt + 注册 skill', () => {
  const registered = [];
  const sections = [];
  const skills = [];
  const ctx = {
    tools: { register: (d) => registered.push(d) },
    systemPrompt: { section: (s) => sections.push(s) },
    skills: { register: (s) => skills.push(s) },
  };
  apply(ctx);
  assert.equal(registered.length, 4);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].name, 'dspack:guidance');
  assert.equal(typeof sections[0].order, 'number');
  assert.match(sections[0].text, /dspack_export/);
  assert.equal(skills.length, 1);
  assert.equal(skills[0].name, 'export-dspack');
});

test('apply：无 ctx.tools / ctx.systemPrompt / ctx.skills 时静默降级，不抛', () => {
  assert.doesNotThrow(() => apply({}));
  assert.doesNotThrow(() => apply({ tools: {} }));
  assert.doesNotThrow(() => apply({ tools: { register: () => {} } })); // 无 systemPrompt / skills 也 OK
  assert.doesNotThrow(() => apply({ skills: {} }));
  assert.doesNotThrow(() => apply({ skills: { register: () => {} } })); // 无 tools 也 OK
});

test('端到端：export → view → install(dryRun) 走真实 NodeHost', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('dspack-host-test-');
  try {
    // 构造一个最小合法 profile
    const profileDir = host.joinPath(root, 'profiles', 'web');
    await host.mkdir(profileDir);
    await host.writeTextFile(host.joinPath(profileDir, 'package.json'), JSON.stringify({
      name: 'web', version: '1.0.0', dependencies: {}, dsh: { profile: { bundles: [] } },
    }));
    await host.writeTextFile(host.joinPath(profileDir, 'cordis.patch.yml'), '[]\n');
    await host.writeTextFile(host.joinPath(profileDir, 'skill.md'), '# hi\n');

    // 1) 导出
    const outDir = host.joinPath(root, 'out');
    const exp = await dspackExport.execute({ profile: profileDir, out: outDir });
    assert.equal(exp.name, 'web');
    assert.equal(exp.version, '1.0.0');
    assert.match(exp.output, /web-1\.0\.0\.dspack$/);
    assert.equal(exp.sha256.length, 64);
    assert.ok(exp.size > 0);
    const bytes = await host.readFile(exp.output);
    assert.ok(bytes);
    assert.equal(bytes[0], 0x50); // 'P' —— 标准 ZIP
    assert.equal(bytes[1], 0x4b); // 'K'

    // 2) 查看
    const view = await dspackView.execute({ source: exp.output });
    assert.equal(view.valid, true);
    assert.equal(view.name, 'web');
    assert.equal(view.version, '1.0.0');
    assert.equal(view.sha256, exp.sha256);
    assert.ok(view.totalEntries >= 3); // package.json + cordis.patch.yml + skill.md + manifest.json

    // 3) 安装（dryRun，不碰真实 ~/.dsh）
    const profilesRoot = host.joinPath(root, 'installed');
    const inst = await dspackInstall.execute({ source: exp.output, profilesRoot, dryRun: true });
    assert.equal(inst.dryRun, true);
    assert.equal(inst.profileName, 'web');
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});