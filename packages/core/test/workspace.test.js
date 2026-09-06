import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NodeHost } from '@dsh-packforge/host-node';
import { loadWorkspaceConfig, exportFromWorkspace, exportHomeFromWorkspace } from '../src/index.js';

test('loadWorkspaceConfig：读取 / 缺省 / 非法', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-ws-');
  try {
    assert.equal(await loadWorkspaceConfig(host, host.joinPath(root, 'none')), null);

    const dir = host.joinPath(root, 'profile');
    await host.mkdir(dir);
    await host.writeTextFile(host.joinPath(dir, '.dshpkcfg'), JSON.stringify({ name: 'foo', version: '2.0.0', mode: 'dspack' }));
    const cfg = await loadWorkspaceConfig(host, dir);
    assert.equal(cfg.name, 'foo');
    assert.equal(cfg.mode, 'dspack');

    await host.writeTextFile(host.joinPath(dir, '.dshpkcfg'), '{bad');
    assert.equal(await loadWorkspaceConfig(host, dir), null);
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('exportFromWorkspace：config 打底 + override 覆盖（dspack 路径）', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-ws-');
  try {
    const dir = host.joinPath(root, 'profile');
    await host.mkdir(dir);
    await host.writeTextFile(
      host.joinPath(dir, 'package.json'),
      JSON.stringify({ name: 'dsh-p', version: '1.0.0', dsh: { profile: { bundles: [] } } }),
    );
    await host.writeTextFile(host.joinPath(dir, 'pnpm-workspace.yaml'), 'packages: []\n');
    await host.writeTextFile(host.joinPath(dir, '.dshpkcfg'), JSON.stringify({ name: 'cfg-name', version: '2.0.0' }));
    const outDir = host.joinPath(root, 'out');

    // 无 override → 用 config 的 name/version
    const r1 = await exportFromWorkspace(host, { name: 'p', dir }, { out: outDir });
    assert.equal(r1.manifest.name, 'cfg-name');
    assert.equal(r1.manifest.version, '2.0.0');

    // override name → 覆盖 config
    const r2 = await exportFromWorkspace(host, { name: 'p', dir }, { out: outDir, name: 'override-name' });
    assert.equal(r2.manifest.name, 'override-name');
    assert.equal(r2.manifest.version, '2.0.0'); // version 仍取 config
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('exportHomeFromWorkspace：读 home 配置 + exportContent→exclude', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-ws-');
  try {
    const home = host.joinPath(root, 'home');
    await host.mkdir(host.joinPath(home, 'profiles', 'myproj'));
    await host.mkdir(host.joinPath(home, 'skills'));
    await host.writeTextFile(
      host.joinPath(home, 'profiles', 'myproj', 'package.json'),
      JSON.stringify({ name: 'dsh-myproj', version: '1.0.0', dependencies: {}, dsh: { profile: { bundles: [] } } }),
    );
    await host.writeTextFile(host.joinPath(home, 'profiles', 'myproj', 'pnpm-workspace.yaml'), 'packages: []\n');
    await host.writeTextFile(host.joinPath(home, 'skills', 'hello.md'), '# hi\n');
    await host.writeTextFile(host.joinPath(home, 'AGENTS.md'), '# instructions\n');
    await host.writeTextFile(
      host.joinPath(home, '.dshpkcfg'),
      JSON.stringify({ name: 'cfg-home', version: '2.0.0', exportContent: { skill: true, preset: true, instruction: false, data: true } }),
    );

    const r = await exportHomeFromWorkspace(host, { name: 'home', dir: home }, { out: host.joinPath(root, 'out') });
    assert.equal(r.manifest.name, 'cfg-home');
    assert.equal(r.manifest.version, '2.0.0');
    assert.ok(r.output);
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});
