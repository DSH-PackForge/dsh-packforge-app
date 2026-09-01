import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NodeHost } from '@dsh-packforge/host-node';
import { selectFiles, packProfile, inspectProfile } from '../src/index.js';
import { parseDspack } from '../src/dspack.js';

test('selectFiles：undefined=全量、[]=空、数组/Set=白名单', () => {
  const files = [{ rel: 'a' }, { rel: 'b' }, { rel: 'skills/x.md' }];
  assert.equal(selectFiles(files, undefined).length, 3);
  assert.equal(selectFiles(files, null).length, 3);
  assert.equal(selectFiles(files, []).length, 0);
  assert.deepEqual(selectFiles(files, ['a', 'skills/x.md']).map((f) => f.rel), ['a', 'skills/x.md']);
  assert.deepEqual(selectFiles(files, new Set(['b'])).map((f) => f.rel), ['b']);
});

test('packProfile：include 只打包选中文件（manifest 始终写入）', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-inc-');
  const dir = host.joinPath(root, 'profile');
  const outDir = host.joinPath(root, 'out');
  try {
    await host.mkdir(dir);
    await host.writeTextFile(host.joinPath(dir, 'package.json'), JSON.stringify({ name: 'dsh-x', version: '1.0.0' }));
    await host.writeTextFile(host.joinPath(dir, 'cordis.patch.yml'), '[]\n');
    await host.writeTextFile(host.joinPath(dir, 'skills', 'a', 'SKILL.md'), '# a\n');
    await host.writeTextFile(host.joinPath(dir, 'skills', 'b', 'SKILL.md'), '# b\n');

    const r = await packProfile(host, { name: 'x', dir }, { out: outDir, include: ['package.json', 'skills/a/SKILL.md'] });
    const bytes = await host.readFile(r.output);
    const { entries } = parseDspack(bytes);
    assert.ok(entries['manifest.json']); // 始终写
    assert.ok(entries['package.json']);
    assert.ok(entries['overrides/skills/a/SKILL.md']);
    assert.equal(entries['overrides/skills/b/SKILL.md'], undefined); // 未选中
    assert.equal(entries['overrides/cordis.patch.yml'], undefined); // 未选中
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('inspectProfile：include 时 files=选中、allFiles=全量、special 按选中', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-ins-');
  const dir = host.joinPath(root, 'profile');
  try {
    await host.mkdir(dir);
    await host.writeTextFile(host.joinPath(dir, 'package.json'), JSON.stringify({ name: 'dsh-x', version: '1.0.0' }));
    await host.writeTextFile(host.joinPath(dir, 'skills', 'a', 'SKILL.md'), '# a\n');
    await host.writeTextFile(host.joinPath(dir, 'skills', 'b', 'SKILL.md'), '# b\n');

    const ins = await inspectProfile(host, { name: 'x', dir }, { include: ['skills/a/SKILL.md'] });
    assert.equal(ins.allFiles.length, 3);
    assert.equal(ins.files.length, 1);
    assert.deepEqual(ins.special.skills.map((s) => s.name), ['a']); // b 被排除
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('packProfile：include 空数组（一个都不选）报错', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-inc0-');
  const dir = host.joinPath(root, 'profile');
  try {
    await host.mkdir(dir);
    await host.writeTextFile(host.joinPath(dir, 'package.json'), JSON.stringify({ name: 'dsh-x', version: '1.0.0' }));
    await assert.rejects(() => packProfile(host, { name: 'x', dir }, { include: [] }), /没有选中的文件/);
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});