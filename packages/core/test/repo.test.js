import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NodeHost } from '@dsh-packforge/host-node';
import { exportRepo } from '../src/index.js';

async function makeProfile(host, root) {
  const dir = host.joinPath(root, 'profile');
  await host.mkdir(dir);
  await host.writeTextFile(
    host.joinPath(dir, 'package.json'),
    JSON.stringify({
      name: 'dsh-my-web',
      version: '1.2.3',
      dependencies: { 'dsh-pet': '0.2.0' },
      dsh: { profile: { bundles: ['@deepseek-ai/dsh-base'] } },
    }),
  );
  await host.writeTextFile(host.joinPath(dir, 'pnpm-workspace.yaml'), 'packages: []\n');
  await host.writeTextFile(host.joinPath(dir, 'skills', 'hello', 'SKILL.md'), '# hi\n');
  await host.writeTextFile(host.joinPath(dir, '.env'), 'SECRET=1\n'); // 剔除
  return dir;
}

test('exportRepo：manifest 档只写清单', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-repo-');
  try {
    const dir = await makeProfile(host, root);
    const r = await exportRepo(
      host,
      { name: 'my-web', dir },
      { out: host.joinPath(root, 'out'), content: 'manifest', dshVersion: '0.1.1-rc.2' },
    );
    assert.equal(r.content, 'manifest');
    assert.deepEqual(r.written, ['manifest.json']);
    assert.equal(r.readme, '');

    const m = JSON.parse(await host.readTextFile(host.joinPath(r.dir, 'manifest.json')));
    assert.equal(m.manifestVersion, 5);
    assert.equal(m.type, 'profile');
    assert.equal(m.dshVersion, '0.1.1-rc.2');
    assert.equal(m.dependencies['dsh-pet'], '0.2.0');
    assert.equal(await host.readTextFile(host.joinPath(r.dir, 'README.md')), null);
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('exportRepo：readme 档 = 清单 + README', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-repo-');
  try {
    const dir = await makeProfile(host, root);
    const r = await exportRepo(host, { name: 'my-web', dir }, { out: host.joinPath(root, 'out'), content: 'readme' });
    assert.deepEqual(r.written, ['manifest.json', 'README.md']);
    const readme = await host.readTextFile(host.joinPath(r.dir, 'README.md'));
    assert.match(readme, /my-web/);
    assert.match(readme, /1\.2\.3/);
    assert.match(readme, /dsh-pet/);
    assert.equal(await host.readTextFile(host.joinPath(r.dir, '.dspackignore')), null);
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('exportRepo：full 档含全套（机器/overrides/release/ignore）且剔除敏感文件', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-repo-');
  try {
    const dir = await makeProfile(host, root);
    const r = await exportRepo(host, { name: 'my-web', dir }, { out: host.joinPath(root, 'out'), content: 'full' });
    assert.ok(r.written.includes('.dspackignore'));
    assert.ok(r.written.includes('package.json'));           // 机器文件进根
    assert.ok(r.written.includes('pnpm-workspace.yaml'));
    assert.ok(r.written.includes('overrides/skills/hello/SKILL.md')); // 用户文件进 overrides/
    assert.ok(r.written.includes('release/'));

    assert.ok(!r.written.includes('.env'));
    assert.ok(!r.written.includes('overrides/.env'));        // 敏感文件剔除

    const ignored = await host.readTextFile(host.joinPath(r.dir, '.dspackignore'));
    assert.match(ignored, /node_modules/);
    assert.match(ignored, /release\//);
    assert.match(ignored, /\.dspackignore/);

    const skill = await host.readTextFile(host.joinPath(r.dir, 'overrides', 'skills', 'hello', 'SKILL.md'));
    assert.equal(skill, '# hi\n');
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('exportRepo：非法 content 回退 full', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-repo-');
  try {
    const dir = await makeProfile(host, root);
    const r = await exportRepo(host, { name: 'my-web', dir }, { out: host.joinPath(root, 'out'), content: 'bogus' });
    assert.equal(r.content, 'full');
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});