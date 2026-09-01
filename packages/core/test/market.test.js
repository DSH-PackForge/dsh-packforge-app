import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NodeHost } from '@dsh-packforge/host-node';
import { readMarketIndex, normalizeMarketPack } from '../src/index.js';

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
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
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