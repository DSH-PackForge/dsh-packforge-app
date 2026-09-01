import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDspack,
  parseDspack,
  encodeHeader,
  decodeHeader,
  encodeText,
  decodeText,
  DSPK_MAGIC,
  DSPK_HEADER_SIZE,
  DSPK_CONTAINER_VERSION,
} from '../src/dspack.js';

test('头部编解码', () => {
  const h = encodeHeader();
  assert.equal(h.length, DSPK_HEADER_SIZE);
  const info = decodeHeader(h);
  assert.equal(info.magic, DSPK_MAGIC);
  assert.equal(info.version, DSPK_CONTAINER_VERSION);
});

test('打包/解包 roundtrip', () => {
  const entries = {
    'manifest.json': encodeText('{"manifestVersion":4}'),
    'package.json': encodeText('{"name":"x"}'),
    'overrides/cordis.patch.yml': encodeText('[]\n'),
    'overrides/skills/readme.md': encodeText('# hi\n'),
  };
  const bytes = buildDspack(entries);
  // 头 4 字节是 DSPK
  assert.equal(String.fromCharCode(...bytes.subarray(0, 4)), 'DSPK');

  const { entries: got, version } = parseDspack(bytes);
  assert.equal(version, DSPK_CONTAINER_VERSION);
  assert.deepEqual(Object.keys(got).sort(), Object.keys(entries).sort());
  assert.equal(decodeText(got['overrides/cordis.patch.yml']), '[]\n');
  assert.equal(decodeText(got['manifest.json']), '{"manifestVersion":4}');
});

test('篡改魔术字节 → 拒载', () => {
  const bytes = buildDspack({ a: encodeText('x') });
  bytes[0] = 0x58; // 'X'
  assert.throws(() => parseDspack(bytes), /缺少 DSPK 头/);
});

test('未知容器版本 → 拒载', () => {
  const bytes = buildDspack({ a: encodeText('x') });
  new DataView(bytes.buffer).setUint32(4, 999, true);
  assert.throws(() => parseDspack(bytes), /容器版本/);
});

test('长度不足 → 报错', () => {
  assert.throws(() => parseDspack(new Uint8Array([1, 2, 3])), /长度不足/);
});