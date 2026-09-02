import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NodeHost } from '@dsh-packforge/host-node';
import { readMarketIndex, fetchMarketPackDetail, normalizeMarketPack, packDirId } from '../src/index.js';

test('market：旧式 .tgz 单下载 + 多语言展示名', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-mkt-');
  try {
    const p = host.joinPath(root, 'index.json');
    await host.writeTextFile(
      p,
      JSON.stringify({
        schemaVersion: 1,
        modpacks: [
          {
            manifestVersion: 3,
            name: 'all-about-whales',
            displayName: { 'en-US': 'All About Whales', 'zh-CN': '大肥鱼套装' },
            version: '1.0.0',
            description: { 'zh-CN': '大肥鱼味' },
            downloadUrl: 'https://x/all-about-whales-1.0.0.tgz',
            sha256: 'abc',
            size: 10916,
          },
        ],
      }),
    );
    const { packs } = await readMarketIndex(host, p);
    assert.equal(packs.length, 1);
    const pk = packs[0];
    assert.equal(pk.displayName, '大肥鱼套装');
    assert.equal(pk.format, 'tgz');
    assert.equal(pk.manifestVersion, 3);
    assert.equal(pk.downloadUrl, 'https://x/all-about-whales-1.0.0.tgz');
    assert.equal(pk.sha256, 'abc');
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('market：.dspack files[] 指针式 + format 判别', () => {
  const pk = normalizeMarketPack({
    name: 'web',
    manifestVersion: 4,
    displayName: { 'zh-CN': '网页开发' },
    files: [{ path: 'web-1.0.0.dspack', sha256: 's1', size: 11172, urls: ['https://x/web-1.0.0.dspack'] }],
  });
  assert.equal(pk.format, 'dspack');
  assert.equal(pk.manifestVersion, 4);
  assert.equal(pk.displayName, '网页开发');
  assert.equal(pk.sha256, 's1');
  assert.equal(pk.size, 11172);
  assert.deepEqual(pk.urls, ['https://x/web-1.0.0.dspack']);
});

test('market：空/坏索引鲁棒', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-mkt-');
  try {
    const p = host.joinPath(root, 'index.json');
    await host.writeTextFile(p, 'not-json');
    const r = await readMarketIndex(host, p);
    assert.deepEqual(r.packs, []);
    assert.equal(r.schemaVersion, 1);
    assert.ok(r.error.includes('不是有效 JSON'));
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('market：schemaVersion 2 精简索引 + 懒加载完整 manifest 与 README', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-mkt-');
  try {
    const index = host.joinPath(root, 'index.json');
    await host.writeTextFile(
      index,
      JSON.stringify({
        schemaVersion: 2,
        modpacks: [
          {
            manifestVersion: 4,
            type: 'profile',
            name: 'all-about-whales',
            version: '1.0.0',
            displayName: { 'zh-CN': '大肥鱼套装' },
            downloadUrl: 'https://x/all-about-whales-1.0.0.dspack',
            sha256: 'abc',
            size: 6670,
            id: 'DSH-PackForge.all-about-whales',
            owner: 'DSH-PackForge',
            repo: 'all-about-whales',
            bundleCount: 6,
            depCount: 4,
          },
        ],
      }),
    );
    const detailDir = host.joinPath(root, 'packs', 'DSH-PackForge.all-about-whales');
    await host.mkdir(detailDir);
    await host.writeTextFile(
      host.joinPath(detailDir, 'manifest.json'),
      JSON.stringify({ manifestVersion: 4, type: 'profile', name: 'all-about-whales', version: '1.0.0', bundles: ['a', 'b'], dependencies: { x: '1.0.0' } }),
    );
    await host.writeTextFile(host.joinPath(detailDir, 'README.md'), '# Hi\n\nhello');

    const { packs } = await readMarketIndex(host, index);
    assert.equal(packs.length, 1);
    assert.equal(packs[0].id, 'DSH-PackForge.all-about-whales');
    assert.equal(packDirId(packs[0]), 'DSH-PackForge.all-about-whales');
    // 精简索引不含 bundles/dependencies（懒加载前为空）
    assert.deepEqual(packs[0].bundles, []);
    assert.deepEqual(packs[0].dependencies, {});

    const { manifest, readme } = await fetchMarketPackDetail(host, index, packs[0]);
    assert.deepEqual(manifest.bundles, ['a', 'b']);
    assert.deepEqual(manifest.dependencies, { x: '1.0.0' });
    assert.match(readme, /hello/);
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('market：无 id 条目懒加载返回空', async () => {
  assert.equal(packDirId({ name: 'x' }), '');
  assert.equal(packDirId({ owner: 'o', repo: 'r' }), 'o.r');
});

test('market：http(s) URL 拉取索引（host.download 到临时文件后读取并清理）', async () => {
  const body = JSON.stringify({
    schemaVersion: 1,
    modpacks: [{ name: 'web', version: '1.0.0', manifestVersion: 4, downloadUrl: 'https://x/web.dspack' }],
  });
  const files = new Map();
  const host = {
    joinPath: (...p) => p.join('/'),
    resolvePath: (p) => p,
    mkdtemp: async () => '/tmp/pfx-mkt',
    download: async (_url, dest) => { files.set(dest, body); },
    readTextFile: async (abs) => files.get(abs) ?? null,
    rm: async () => { files.clear(); },
  };
  const r = await readMarketIndex(host, 'https://dsh-packforge.github.io/dsh-pack-market/index.json');
  assert.equal(r.packs.length, 1);
  assert.equal(r.packs[0].name, 'web');
  assert.equal(r.packs[0].format, 'dspack');
});