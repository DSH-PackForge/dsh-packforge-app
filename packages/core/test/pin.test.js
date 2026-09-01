import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NodeHost } from '@dsh-packforge/host-node';
import { buildManifest, isExactSemver } from '../src/index.js';

test('isExactSemver', () => {
  assert.equal(isExactSemver('0.2.0'), true);
  assert.equal(isExactSemver('0.2.0-rc.1'), true);
  assert.equal(isExactSemver('^0.2.0'), false);
  assert.equal(isExactSemver('>=1.0.0'), false);
});

test('导出时：npm 范围 → 精确版本（读 node_modules），git → commit sha', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-pin-');
  try {
    const dir = host.joinPath(root, 'p');
    await host.writeTextFile(
      host.joinPath(dir, 'package.json'),
      JSON.stringify({
        dependencies: {
          'dsh-pet': '^0.2.0',
          'gh-x': 'github:a/b#abc1234',
          sub: 'github:a/b#abc1234&path:pkg',
        },
      }),
    );
    await host.writeTextFile(host.joinPath(dir, 'node_modules', 'dsh-pet', 'package.json'), JSON.stringify({ version: '0.2.7' }));

    const m = await buildManifest(host, { name: 'x', dir }, {});
    assert.equal(m.dependencies['dsh-pet'], '0.2.7'); // 范围 → 实测精确
    assert.equal(m.dependencies['github:a/b'], 'abc1234'); // git sha
    assert.equal(m.dependencies['github:a/b#path:/pkg'], 'abc1234'); // monorepo 子目录
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});