import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  coordsToPkgDeps,
  pkgDepsToCoords,
  parseGitCoord,
  parsePkgGitSpec,
  validateManifest,
  resolveLocale,
  isLocaleString,
} from '../src/manifest.js';

const VALID_MANIFEST = {
  manifestVersion: 4,
  type: 'profile',
  name: 'all-about-whales',
  version: '1.0.0',
  displayName: { 'en-US': 'All About Whales', 'zh-CN': '大肥鱼套装' },
  description: { 'zh-CN': '让你的DSH充满大肥鱼的味道' },
  author: 'hxh230802',
  icon: '',
  dshVersion: '0.1.1-rc.2',
  profileName: 'all-about-whales',
  bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dsh-pet'],
  dependencies: {
    'dsh-pet': '0.2.0',
    'github:DViridescent/dafy-whale-theme': '99e8c57',
  },
  patch: '[]\n',
  files: [],
};

test('正向：坐标 → package.json 依赖（v3 §5 三态）', () => {
  assert.deepEqual(
    coordsToPkgDeps({
      'dsh-pet': '0.2.0',
      'github:DViridescent/dafy-whale-theme': '99e8c57',
      'github:owner/repo#path:/pkg': 'abc1234',
    }),
    {
      'dsh-pet': '0.2.0',
      'dafy-whale-theme': 'github:DViridescent/dafy-whale-theme#99e8c57',
      pkg: 'github:owner/repo#abc1234&path:pkg',
    },
  );
});

test('正向：git latest → 不带 #（跟随默认分支最新）', () => {
  assert.deepEqual(
    coordsToPkgDeps({
      'github:a/b': 'latest',
      'github:a/b#path:/pkg': 'latest',
    }),
    {
      b: 'github:a/b',
      pkg: 'github:a/b&path:pkg',
    },
  );
});

test('反向：package.json 依赖 → 坐标', () => {
  assert.deepEqual(
    pkgDepsToCoords({
      'dsh-pet': '0.2.0',
      'dafy-whale-theme': 'github:DViridescent/dafy-whale-theme#99e8c57',
      pkg: 'github:owner/repo#abc1234&path:pkg',
    }),
    {
      'dsh-pet': '0.2.0',
      'github:DViridescent/dafy-whale-theme': '99e8c57',
      'github:owner/repo#path:/pkg': 'abc1234',
    },
  );
});

test('parseGitCoord：monorepo 子目录', () => {
  assert.deepEqual(parseGitCoord('github:owner/repo#path:/pkg'), {
    owner: 'owner',
    repo: 'repo',
    subpath: 'pkg',
    name: 'pkg',
  });
  assert.deepEqual(parseGitCoord('github:owner/repo'), {
    owner: 'owner',
    repo: 'repo',
    subpath: '',
    name: 'repo',
  });
  assert.equal(parseGitCoord('dsh-pet'), null);
});

test('parsePkgGitSpec：git+https 归一化', () => {
  assert.deepEqual(parsePkgGitSpec('git+https://github.com/owner/repo.git#abc1234'), {
    owner: 'owner',
    repo: 'repo',
    subpath: '',
    sha: 'abc1234',
  });
  assert.deepEqual(parsePkgGitSpec('github:owner/repo#abc1234&path:pkg'), {
    owner: 'owner',
    repo: 'repo',
    subpath: 'pkg',
    sha: 'abc1234',
  });
});

test('validateManifest：合法 v4 通过', () => {
  assert.deepEqual(validateManifest(VALID_MANIFEST), []);
});

test('validateManifest：collection 拒绝', () => {
  const errs = validateManifest({ ...VALID_MANIFEST, type: 'collection' });
  assert.ok(errs.some((e) => e.includes('profile')));
});

test('validateManifest：旧版 manifestVersion 拒绝', () => {
  const errs = validateManifest({ ...VALID_MANIFEST, manifestVersion: 3 });
  assert.ok(errs.some((e) => e.includes('manifestVersion')));
});

test('validateManifest：files[] 校验', () => {
  const good = {
    ...VALID_MANIFEST,
    files: [{ path: 'data/x.bin', sha256: 'a'.repeat(64), size: 10, urls: ['https://example.com/x.bin'] }],
  };
  assert.deepEqual(validateManifest(good), []);

  const bad = {
    ...VALID_MANIFEST,
    files: [{ path: '/abs/x.bin', sha256: 'zz', size: -1, urls: [] }],
  };
  const errs = validateManifest(bad);
  assert.ok(errs.some((e) => e.includes('path')));
  assert.ok(errs.some((e) => e.includes('sha256')));
  assert.ok(errs.some((e) => e.includes('size')));
  assert.ok(errs.some((e) => e.includes('urls')));
});

test('多语言解析', () => {
  assert.equal(isLocaleString('plain'), true);
  assert.equal(isLocaleString({ 'zh-CN': 'a', 'en-US': 'b' }), true);
  assert.equal(isLocaleString(['a']), false);
  assert.equal(isLocaleString(42), false);

  const map = { 'en-US': 'English', 'zh-CN': '中文', fr: 'Français' };
  assert.equal(resolveLocale(map, 'zh-CN'), '中文');
  assert.equal(resolveLocale(map, 'ja-JP'), 'English');
  assert.equal(resolveLocale('just string', 'zh-CN'), 'just string');
  assert.equal(resolveLocale({ fr: 'Français' }, 'zh-CN'), 'Français');
});