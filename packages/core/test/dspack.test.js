import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDspack, parseDspack, encodeText, decodeText } from '../src/dspack.js';

test('打包为标准 ZIP：PK 签名、无 DSPK 魔数头', () => {
  const bytes = buildDspack({ 'manifest.json': encodeText('{"manifestVersion":4}') });
  // ZIP 本地文件头签名 PK\x03\x04
  assert.equal(bytes[0], 0x50); // 'P'
  assert.equal(bytes[1], 0x4b); // 'K'
  assert.equal(bytes[2], 0x03);
  assert.equal(bytes[3], 0x04);
  assert.notEqual(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]), 'DSPK');
});

test('打包/解包 roundtrip', () => {
  const entries = {
    'manifest.json': encodeText('{"manifestVersion":4}'),
    'package.json': encodeText('{"name":"x"}'),
    'overrides/cordis.patch.yml': encodeText('[]\n'),
    'overrides/skills/readme.md': encodeText('# hi\n'),
  };
  const bytes = buildDspack(entries);
  const { entries: got } = parseDspack(bytes);
  assert.deepEqual(Object.keys(got).sort(), Object.keys(entries).sort());
  assert.equal(decodeText(got['overrides/cordis.patch.yml']), '[]\n');
  assert.equal(decodeText(got['manifest.json']), '{"manifestVersion":4}');
});

test('非 ZIP / 空内容 → 报错', () => {
  assert.throws(() => parseDspack(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])), /ZIP/);
  assert.throws(() => parseDspack(new Uint8Array()), /空内容/);
});

test('encodeText/decodeText 往返', () => {
  assert.equal(decodeText(encodeText('你好')), '你好');
});