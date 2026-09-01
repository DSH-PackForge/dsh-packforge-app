import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NodeHost } from '@dsh-packforge/host-node';
import { inspectPack, buildDspack, encodeText } from '../src/index.js';

const VALID = {
  manifestVersion: 4,
  type: 'profile',
  name: 'demo',
  version: '1.0.0',
  dshVersion: '0.1.1-rc.2',
  bundles: [],
  dependencies: {},
  patch: '[]\n',
  files: [],
};

test('view：查看 .dspack（容器/校验/条目分类/totalEntries）', async () => {
  const host = new NodeHost();
  const bytes = buildDspack({
    'manifest.json': encodeText(JSON.stringify(VALID)),
    'package.json': encodeText('{}'),
    'pnpm-workspace.yaml': encodeText('packages: []\n'),
    'overrides/a.md': encodeText('# a\n'),
    'overrides/b/c.txt': encodeText('x'),
  });
  const r = await inspectPack(host, bytes);

  assert.equal(r.valid, true);
  assert.equal(r.manifest.name, 'demo');
  assert.equal(r.size, bytes.byteLength);
  assert.equal(r.sha256, await host.sha256(bytes));
  assert.deepEqual(r.machine.map((e) => e.path), ['package.json', 'pnpm-workspace.yaml']);
  assert.deepEqual(r.overrides.map((e) => e.path), ['overrides/a.md', 'overrides/b/c.txt']);
  assert.equal(r.other.length, 0);
  assert.equal(r.totalEntries, 5);
});

test('view：非法 manifest → valid=false', async () => {
  const host = new NodeHost();
  const bytes = buildDspack({
    'manifest.json': encodeText(JSON.stringify({ manifestVersion: 3, type: 'profile', name: 'x', version: '1' })),
  });
  const r = await inspectPack(host, bytes);
  assert.equal(r.valid, false);
  assert.ok(r.validation.length > 0);
});

test('view：缺 manifest.json', async () => {
  const host = new NodeHost();
  const bytes = buildDspack({ 'package.json': encodeText('{}') });
  const r = await inspectPack(host, bytes);
  assert.equal(r.valid, false);
  assert.deepEqual(r.validation, ['缺少 manifest.json']);
});