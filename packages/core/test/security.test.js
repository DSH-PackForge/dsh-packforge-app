import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isExcluded } from '../src/security.js';

test('精确名称命中（任意层级）', () => {
  assert.equal(isExcluded('node_modules/foo/index.js'), true);
  assert.equal(isExcluded('a/b/cordis.yml'), true);
  assert.equal(isExcluded('manifest.json'), true);
  assert.equal(isExcluded('.env'), true);
  assert.equal(isExcluded('dist/x.js'), true);
  assert.equal(isExcluded('src/.cache/z'), true);
});

test('扩展名（密钥证书）', () => {
  assert.equal(isExcluded('certs/root.pem'), true);
  assert.equal(isExcluded('tls/a.CRT'), true);
  assert.equal(isExcluded('seal/x.p12'), true);
});

test('文件名正则（凭据与密钥）', () => {
  assert.equal(isExcluded('credentials.yaml'), true);
  assert.equal(isExcluded('a/.credentials.yml'), true);
  assert.equal(isExcluded('secrets.json'), true);
  assert.equal(isExcluded('key/id_rsa'), true);
  assert.equal(isExcluded('api_key.txt'), true);
  assert.equal(isExcluded('token.json'), true);
});

test('相对路径：禁止嵌套压缩包', () => {
  assert.equal(isExcluded('data/x.zip'), true);
  assert.equal(isExcluded('cache/b.tgz'), true);
  assert.equal(isExcluded('packs/c.dspack'), true);
});

test('普通文件不剔除', () => {
  assert.equal(isExcluded('package.json'), false);
  assert.equal(isExcluded('cordis.patch.yml'), false);
  assert.equal(isExcluded('skills/readme.md'), false);
  assert.equal(isExcluded('icons/logo.png'), false);
});