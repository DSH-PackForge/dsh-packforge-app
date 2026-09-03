import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NodeHost } from '@dsh-packforge/host-node';
import { scanProfile, packProfile } from '../src/index.js';
import { parseDspack, decodeText } from '../src/dspack.js';

test('导出：敏感过滤 + manifest v5 + overrides/ 布局 + sha256 全包', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-');
  const dir = host.joinPath(root, 'profile');
  const outDir = host.joinPath(root, 'out');
  try {
    await host.mkdir(dir);
    await host.writeTextFile(
      host.joinPath(dir, 'package.json'),
      JSON.stringify({
        name: 'dsh-my-web',
        version: '1.2.3',
        dependencies: { 'dsh-pet': '0.2.0' },
        dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } },
      }),
    );
    await host.writeTextFile(host.joinPath(dir, 'cordis.patch.yml'), '[]\n');
    await host.writeTextFile(host.joinPath(dir, 'skills', 'hello', 'SKILL.md'), '# hi\n');
    await host.writeTextFile(host.joinPath(dir, '.env'), 'SECRET=1\n'); // 应剔除
    await host.writeTextFile(host.joinPath(dir, 'node_modules', 'x', 'package.json'), '{}'); // 应剔除

    const scan = await scanProfile(host, dir);
    assert.ok(scan.excluded.some((e) => e.rel === 'node_modules' && e.reason === 'deny'));
    assert.ok(scan.excluded.some((e) => e.rel === '.env' && e.reason === 'deny'));

    const result = await packProfile(host, { name: 'my-web', dir }, { out: outDir, dshVersion: '0.1.1-rc.2' });

    assert.equal(result.manifest.manifestVersion, 5);
    assert.equal(result.manifest.type, 'profile');
    assert.equal(result.manifest.dshVersion, '0.1.1-rc.2');
    assert.equal(result.manifest.dependencies['dsh-pet'], '0.2.0');
    assert.ok(result.output.endsWith('my-web-1.2.3.dspack'));

    const bytes = await host.readFile(result.output);
    const { entries } = parseDspack(bytes);
    assert.ok(entries['manifest.json']);
    assert.ok(entries['package.json']); // 根机器文件
    assert.ok(entries['overrides/cordis.patch.yml']); // 用户文件进 overrides/
    assert.ok(entries['overrides/skills/hello/SKILL.md']);
    assert.equal(decodeText(entries['overrides/cordis.patch.yml']), '[]\n');
    assert.equal(entries['.env'], undefined);
    assert.equal(entries['overrides/.env'], undefined);

    // sha256 覆盖「头 + ZIP」全量字节
    assert.match(result.sha256, /^[0-9a-f]{64}$/);
    assert.equal(result.sha256, await host.sha256(bytes));
    assert.equal(result.size, bytes.length);
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('空 Profile（全部被过滤）报错', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-empty-');
  try {
    await host.writeTextFile(host.joinPath(root, '.env'), 'x');
    await assert.rejects(() => packProfile(host, { name: 'empty', dir: root }, {}), /没有可打包的文件/);
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});