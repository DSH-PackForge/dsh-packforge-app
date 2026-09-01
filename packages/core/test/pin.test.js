import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NodeHost } from '@dsh-packforge/host-node';
import { buildManifest, isExactSemver, gitCommitFromLock } from '../src/index.js';

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

test('gitCommitFromLock：从 packages 区块解析 resolution.commit', () => {
  const lock = [
    "lockfileVersion: '9.0'",
    '',
    'packages:',
    '',
    '  dafy-whale-theme@99e8c571c40eee8d2e0599af8eddfcbf4f47fc89:',
    '    resolution:',
    '      commit: 99e8c571c40eee8d2e0599af8eddfcbf4f47fc89',
    '      repo: https://github.com/DViridescent/dafy-whale-theme.git',
    '      type: git',
    '',
    'snapshots:',
    '',
    '  dafy-whale-theme@99e8c571c40eee8d2e0599af8eddfcbf4f47fc89: {}',
    '',
  ].join('\n');
  assert.equal(gitCommitFromLock(lock, 'dafy-whale-theme'), '99e8c571c40eee8d2e0599af8eddfcbf4f47fc89');
  assert.equal(gitCommitFromLock(lock, 'nope'), null);
});

test('导出：git 依赖无 #sha 时从 pnpm-lock 补齐 commit', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-gitlock-');
  try {
    const dir = host.joinPath(root, 'p');
    await host.writeTextFile(
      host.joinPath(dir, 'package.json'),
      JSON.stringify({ dependencies: { whale: 'git+https://github.com/DViridescent/dafy-whale-theme.git' } }),
    );
    await host.writeTextFile(
      host.joinPath(dir, 'pnpm-lock.yaml'),
      [
        "lockfileVersion: '9.0'",
        '',
        'packages:',
        '',
        '  whale@99e8c571c40eee8d2e0599af8eddfcbf4f47fc89:',
        '    resolution:',
        '      commit: 99e8c571c40eee8d2e0599af8eddfcbf4f47fc89',
        '      type: git',
        '',
      ].join('\n'),
    );
    const m = await buildManifest(host, { name: 'x', dir }, {});
    assert.equal(m.dependencies['github:DViridescent/dafy-whale-theme'], '99e8c571c40eee8d2e0599af8eddfcbf4f47fc89');
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('导出：git 依赖无 sha 且无 lock 报错（不产出空坐标）', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-gitnope-');
  try {
    const dir = host.joinPath(root, 'p');
    await host.writeTextFile(
      host.joinPath(dir, 'package.json'),
      JSON.stringify({ dependencies: { whale: 'git+https://github.com/DViridescent/dafy-whale-theme.git' } }),
    );
    await assert.rejects(() => buildManifest(host, { name: 'x', dir }, {}), /缺少 commit sha/);
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});