import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { NodeHost } from '@dsh-packforge/host-node';
import { installPack, buildDspack, encodeText, reconcileProfile } from '../src/index.js';

const VALID = {
  manifestVersion: 4,
  type: 'profile',
  name: 'demo',
  version: '1.0.0',
  dshVersion: '0.1.1-rc.2',
  profileName: 'demo',
  bundles: ['@deepseek-ai/dsh-base', 'dsh-pet'],
  dependencies: { 'dsh-pet': '0.2.0', 'github:owner/repo': 'abc1234' },
  patch: '[]\n',
  files: [],
};

function validEntries() {
  return {
    'manifest.json': encodeText(JSON.stringify(VALID)),
    'package.json': encodeText(JSON.stringify({ name: 'demo-snap', scripts: { start: 'dsh' } })),
    'pnpm-workspace.yaml': encodeText('packages:\n  - .\n'),
    'pnpm-lock.yaml': encodeText('lockfileVersion: "9.0"\n'),
    'overrides/cordis.patch.yml': encodeText('[]\n'),
    'overrides/skills/skill.md': encodeText('# skill\n'),
  };
}

function serve(bytes) {
  return new Promise((resolve) => {
    const s = http.createServer((_req, res) => {
      res.writeHead(200, { 'content-length': String(bytes.length) });
      res.end(bytes);
    });
    s.listen(0, '127.0.0.1', () =>
      resolve({ url: `http://127.0.0.1:${s.address().port}/x.bin`, close: () => new Promise((r) => s.close(r)) }),
    );
  });
}

test('导入：overrides 落盘 + package.json 重建（坐标→依赖）+ 快照保留', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-inst-');
  try {
    const profilesRoot = host.joinPath(root, 'profiles');
    await host.mkdir(profilesRoot);
    const p = host.joinPath(root, 'demo-1.0.0.dspack');
    await host.writeFile(p, buildDspack(validEntries()));

    const r = await installPack(host, { source: p, profilesRoot, noInstall: true });

    assert.equal(r.profileName, 'demo');
    assert.equal(r.installed, false);
    assert.equal(r.filesDownloaded, 0);

    const dir = r.dir;
    const pkg = JSON.parse(await host.readTextFile(host.joinPath(dir, 'package.json')));
    assert.deepEqual(pkg.dependencies, { 'dsh-pet': '0.2.0', repo: 'github:owner/repo#abc1234' });
    assert.deepEqual(pkg.dsh.profile.bundles, ['@deepseek-ai/dsh-base', 'dsh-pet']);
    assert.equal(pkg.scripts.start, 'dsh'); // 快照字段保留

    assert.equal(await host.readTextFile(host.joinPath(dir, 'cordis.patch.yml')), '[]\n');
    assert.equal(await host.readTextFile(host.joinPath(dir, 'skills', 'skill.md')), '# skill\n');
    assert.equal(await host.readTextFile(host.joinPath(dir, 'pnpm-workspace.yaml')), 'packages:\n  - .\n');
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('sha256 不符 → 拒绝且不落盘', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-inst-');
  try {
    const profilesRoot = host.joinPath(root, 'profiles');
    await host.mkdir(profilesRoot);
    const p = host.joinPath(root, 'demo-1.0.0.dspack');
    await host.writeFile(p, buildDspack(validEntries()));

    await assert.rejects(
      () => installPack(host, { source: p, profilesRoot, expectedSha256: '0'.repeat(64) }),
      /sha256/,
    );
    assert.equal(await host.stat(host.joinPath(profilesRoot, 'demo')), null);
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('dry-run 不写任何文件', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-inst-');
  try {
    const profilesRoot = host.joinPath(root, 'profiles');
    await host.mkdir(profilesRoot);
    const p = host.joinPath(root, 'demo-1.0.0.dspack');
    await host.writeFile(p, buildDspack(validEntries()));

    const r = await installPack(host, { source: p, profilesRoot, dryRun: true });
    assert.equal(r.dryRun, true);
    assert.equal(await host.stat(r.dir), null);
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('files[] 路径穿越拒绝', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-inst-');
  try {
    const profilesRoot = host.joinPath(root, 'profiles');
    await host.mkdir(profilesRoot);
    const m = { ...VALID, files: [{ path: '../evil.txt', sha256: 'a'.repeat(64), size: 1, urls: ['http://127.0.0.1:1/x'] }] };
    const entries = validEntries();
    entries['manifest.json'] = encodeText(JSON.stringify(m));
    const p = host.joinPath(root, 'demo-1.0.0.dspack');
    await host.writeFile(p, buildDspack(entries));

    await assert.rejects(
      () => installPack(host, { source: p, profilesRoot, noInstall: true }),
      /危险段|非法/,
    );
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('reconcile：缺声明→missing，带声明→added，模板型跳过', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-rec-');
  try {
    // bad：既是 bundle 又是依赖，但 node_modules 里无 dsh.bundle.patch → missing
    await host.writeTextFile(host.joinPath(root, 'node_modules', 'bad', 'package.json'), '{}');
    // good：依赖带 dsh.bundle.patch 声明，但不在 bundles → added
    await host.writeTextFile(
      host.joinPath(root, 'node_modules', 'good', 'package.json'),
      JSON.stringify({ dsh: { bundle: { patch: 'x' } } }),
    );

    const manifest = { bundles: ['tmpl', 'bad'], dependencies: { bad: '1.0.0', good: '1.0.0' } };
    const r = await reconcileProfile(host, root, manifest);
    assert.deepEqual(r.missing, ['bad']);
    assert.deepEqual(r.added, ['good']);
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('files[] 按需下载 + sha256/size 校验', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-inst-');
  const payload = crypto.randomBytes(64);
  const sha = crypto.createHash('sha256').update(payload).digest('hex');
  const server = await serve(payload);
  try {
    const profilesRoot = host.joinPath(root, 'profiles');
    await host.mkdir(profilesRoot);
    const m = {
      ...VALID,
      files: [{ path: 'data/model.bin', sha256: sha, size: payload.length, urls: [server.url] }],
    };
    const entries = validEntries();
    entries['manifest.json'] = encodeText(JSON.stringify(m));
    const p = host.joinPath(root, 'demo-1.0.0.dspack');
    await host.writeFile(p, buildDspack(entries));

    const r = await installPack(host, { source: p, profilesRoot, noInstall: true });
    assert.equal(r.filesDownloaded, 1);
    const got = await host.readFile(host.joinPath(r.dir, 'data', 'model.bin'));
    assert.deepEqual(Array.from(got), Array.from(payload));
  } finally {
    await server.close();
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('从 URL 安装（下载 .dspack + 完整性校验）', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-url-');
  const bytes = buildDspack(validEntries());
  const sha = crypto.createHash('sha256').update(bytes).digest('hex');
  const server = await serve(bytes);
  try {
    const profilesRoot = host.joinPath(root, 'profiles');
    await host.mkdir(profilesRoot);

    const r = await installPack(host, {
      source: server.url,
      profilesRoot,
      noInstall: true,
      expectedSha256: sha,
      expectedSize: bytes.byteLength,
    });

    assert.equal(r.profileName, 'demo');
    assert.equal(r.installed, false);
    const pkg = JSON.parse(await host.readTextFile(host.joinPath(r.dir, 'package.json')));
    assert.equal(pkg.dependencies['dsh-pet'], '0.2.0');
  } finally {
    await server.close();
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});