import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NodeHost } from '@dsh-packforge/host-node';
import { exportRepo, ReleaseConflictError } from '../src/index.js';

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

test('exportRepo：manifest 档只写清单 + .gitignore，仓库名不带版本号', async () => {
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
    assert.ok(r.written.includes('manifest.json'));
    assert.ok(r.written.includes('.gitignore'));
    assert.equal(r.readme, '');
    assert.equal(await host.readTextFile(host.joinPath(r.dir, 'README.md')), null);
    assert.ok(r.dir.endsWith('my-web')); // 不带 -1.2.3

    const m = JSON.parse(await host.readTextFile(host.joinPath(r.dir, 'manifest.json')));
    assert.equal(m.manifestVersion, 5);
    assert.equal(m.type, 'profile');
    assert.equal(m.dshVersion, '0.1.1-rc.2');
    assert.equal(m.dependencies['dsh-pet'], '0.2.0');
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
    assert.ok(r.written.includes('manifest.json'));
    assert.ok(r.written.includes('README.md'));
    assert.ok(r.written.includes('.gitignore'));
    const readme = await host.readTextFile(host.joinPath(r.dir, 'README.md'));
    assert.match(readme, /my-web/);
    assert.match(readme, /1\.2\.3/);
    assert.match(readme, /dsh-pet/);
    assert.equal(await host.readTextFile(host.joinPath(r.dir, '.dspackignore')), null);
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('exportRepo：full 档含全套且剔除敏感文件', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-repo-');
  try {
    const dir = await makeProfile(host, root);
    const r = await exportRepo(host, { name: 'my-web', dir }, { out: host.joinPath(root, 'out'), content: 'full' });
    assert.ok(r.written.includes('.dspackignore'));
    assert.ok(r.written.includes('package.json'));
    assert.ok(r.written.includes('pnpm-workspace.yaml'));
    assert.ok(r.written.includes('overrides/skills/hello/SKILL.md'));
    assert.ok(r.written.includes('.gitignore'));
    assert.ok(!r.written.includes('.env'));

    const ignored = await host.readTextFile(host.joinPath(r.dir, '.dspackignore'));
    assert.match(ignored, /node_modules/);
    assert.match(ignored, /release\//);
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('exportRepo：release 产出 .dspack + .sha256 且 gitignore', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-repo-');
  try {
    const dir = await makeProfile(host, root);
    const r = await exportRepo(host, { name: 'my-web', dir }, { out: host.joinPath(root, 'out'), content: 'readme' });
    assert.ok(r.release);
    assert.equal(r.release.dspack, 'my-web-1.2.3.dspack');
    assert.equal(r.release.sha256, 'my-web-1.2.3.dspack.sha256');

    const dspack = await host.readFile(host.joinPath(r.dir, 'release', r.release.dspack));
    assert.ok(dspack && dspack.length > 0);
    const sha = await host.readTextFile(host.joinPath(r.dir, 'release', r.release.sha256));
    assert.match(sha, /my-web-1\.2\.3\.dspack/);

    // 仓库根部的清单（在 .dspack 之外）带顶层 sha256
    const m = JSON.parse(await host.readTextFile(host.joinPath(r.dir, 'manifest.json')));
    assert.equal(m.sha256, r.release.sha256Value);

    const gitignore = await host.readTextFile(host.joinPath(r.dir, '.gitignore'));
    assert.match(gitignore, /release\//);
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('exportRepo：版本冲突抛 ReleaseConflictError，replaceRelease 覆盖', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-repo-');
  try {
    const dir = await makeProfile(host, root);
    const opts = { out: host.joinPath(root, 'out'), content: 'readme' };
    await exportRepo(host, { name: 'my-web', dir }, opts);

    // 同版本再次导出 → 冲突
    await assert.rejects(() => exportRepo(host, { name: 'my-web', dir }, opts), ReleaseConflictError);

    // replaceRelease=true → 覆盖成功
    const r = await exportRepo(host, { name: 'my-web', dir }, { ...opts, replaceRelease: true });
    assert.ok(r.release);
    assert.equal(r.conflicted, true);
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('exportRepo：非法 content 回退 readme', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-repo-');
  try {
    const dir = await makeProfile(host, root);
    const r = await exportRepo(host, { name: 'my-web', dir }, { out: host.joinPath(root, 'out'), content: 'bogus' });
    assert.equal(r.content, 'readme');
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});
