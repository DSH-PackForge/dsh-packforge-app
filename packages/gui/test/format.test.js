import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packViewHTML, marketCardHTML, manifestHTML, treeFromPaths, escapeHtml, formatBytes, pickLocale, exportPreviewHTML, exportResultHTML, exportRepoResultHTML, specialHTML, specialFieldHTML } from '../src/format.js';

const FIXTURE = {
  sha256: 'a'.repeat(64),
  size: 11172,
  valid: true,
  validation: [],
  manifest: {
    manifestVersion: 4,
    type: 'profile',
    name: 'web',
    version: '1.0.0',
    dshVersion: '0.1.1-rc.2',
    author: 'me',
    bundles: ['@deepseek-ai/dsh-base', 'dsh-pet'],
    dependencies: { 'dsh-pet': '0.2.0' },
    files: [],
  },
  machine: [
    { path: 'package.json', size: 297 },
    { path: 'pnpm-workspace.yaml', size: 180 },
  ],
  overrides: [
    { path: 'overrides/cordis.patch.yml', size: 217 },
    { path: 'overrides/skills/web.md', size: 12 },
  ],
  other: [],
  totalEntries: 5,
};

test('packViewHTML：渲染校验态/manifest/tree', () => {
  const html = packViewHTML(FIXTURE);
  assert.match(html, /校验合法/);
  assert.match(html, /manifest v4/);
  assert.match(html, /标准 ZIP/);
  assert.match(html, /web/);
  assert.match(html, /v1\.0\.0/);
  assert.match(html, /overrides\//);
  assert.match(html, /cordis\.patch\.yml/);
  assert.match(html, /skills/);
  assert.match(html, /web\.md/);
  assert.match(html, /10\.9 KB/);
});

test('packViewHTML：非法校验显示错误', () => {
  const html = packViewHTML({ ...FIXTURE, valid: false, validation: ['type 必须是 profile'] });
  assert.match(html, /校验失败/);
  assert.match(html, /type 必须是 profile/);
});

test('treeFromPaths：嵌套目录', () => {
  const tree = treeFromPaths([
    { path: 'overrides/cordis.patch.yml', size: 1 },
    { path: 'overrides/skills/sub/web.md', size: 2 },
  ]);
  const top = tree.find((n) => n.name === 'overrides');
  assert.ok(top);
  const skills = top.children.find((n) => n.name === 'skills');
  assert.ok(skills);
  assert.equal(skills.children.find((n) => n.name === 'sub').children[0].name, 'web.md');
});

test('marketCardHTML：格式徽章 + 展示名 + 描述', () => {
  const html = marketCardHTML({
    name: 'web', displayName: '网页开发', version: '1.0.0', description: 'desc', format: 'dspack', dshVersion: '0.1.1-rc.2', size: 11172, sha256: 'abc', downloadUrl: 'https://x/web.dspack',
  });
  assert.match(html, /网页开发/);
  assert.match(html, /\.dspack v4/);
  assert.match(html, /desc/);
  assert.match(html, /card-install/);
  assert.match(html, /data-url="https:\/\/x\/web\.dspack"/);
});

test('marketCardHTML：旧格式显示不可安装提示', () => {
  const html = marketCardHTML({ name: 'x', format: 'tgz', version: '1.0.0', downloadUrl: 'https://x/x.tgz' });
  assert.match(html, /暂不支持安装/);
  assert.doesNotMatch(html, /card-install/);
});

test('escapeHtml / formatBytes / pickLocale', () => {
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
  assert.equal(formatBytes(2048), '2.0 KB');
  assert.equal(pickLocale({ 'en-US': 'Hi', 'zh-CN': '你好' }, 'zh-CN'), '你好');
  assert.equal(pickLocale({ 'en-US': 'Hi' }, 'zh-CN', 'fb'), 'Hi');
});

test('exportPreviewHTML：渲染打包预览（名称/版本/层栈/依赖/文件统计）', () => {
  const html = exportPreviewHTML({
    profile: { name: 'web', dir: '/x/web' },
    files: [
      { rel: 'package.json', abs: '/x/web/package.json', size: 100 },
      { rel: 'overrides/a.md', abs: '/x/web/overrides/a.md', size: 200 },
    ],
    excluded: [{ rel: 'node_modules', abs: '/x/web/node_modules', reason: 'deny' }],
    manifest: {
      manifestVersion: 4, type: 'profile', name: 'web', version: '1.0.0',
      displayName: '网页开发', dshVersion: '0.1.1-rc.2',
      bundles: ['@deepseek-ai/dsh-base'], dependencies: { 'dsh-pet': '0.2.0' },
    },
  });
  assert.match(html, /网页开发/);
  assert.match(html, /0\.1\.1-rc\.2/);
  assert.match(html, /@deepseek-ai\/dsh-base/);
  assert.match(html, /dsh-pet/);
  assert.match(html, /2 个文件/);
  assert.match(html, /1 个文件\/目录/);
  assert.match(html, /web-1\.0\.0\.dspack/);
  assert.match(html, /300 B/);
});

test('specialHTML：渲染特殊目录摘要（skill/agent-preset/icon）', () => {
  const html = specialHTML({
    skills: [{ name: 'fmt' }, { name: 'audit' }],
    agentPresets: [{ id: 'code' }],
    icons: ['icons/logo.png'],
  });
  assert.match(html, /Skill/);
  assert.match(html, /2 个 · fmt, audit/);
  assert.match(html, /Agent 预设/);
  assert.match(html, /1 个 · code/);
  assert.match(html, /图标/);
  assert.match(html, /icons\/logo\.png/);
});

test('specialHTML：无内容返回空串', () => {
  assert.equal(specialHTML({ skills: [], agentPresets: [], icons: [] }), '');
  assert.equal(specialHTML(undefined), '');
});

test('specialFieldHTML：空时也始终三行（均显示「无」）', () => {
  const html = specialFieldHTML({ skills: [], agentPresets: [], icons: [] });
  assert.match(html, /Skill/);
  assert.match(html, /Agent 预设/);
  assert.match(html, /图标/);
  assert.equal((html.match(/无/g) || []).length, 3);
});

test('specialFieldHTML：列出识别到的名称', () => {
  const html = specialFieldHTML({ skills: [{ name: 'fmt' }], agentPresets: [{ id: 'code' }], icons: ['icons/logo.png'] });
  assert.match(html, /1 个 · fmt/);
  assert.match(html, /1 个 · code/);
  assert.match(html, /icons\/logo\.png/);
});

test('exportResultHTML：渲染成功结果', () => {
  const html = exportResultHTML({ output: 'C:\\out\\web-1.0.0.dspack', size: 300, sha256: 'a'.repeat(64) });
  assert.match(html, /导出成功/);
  assert.match(html, /web-1\.0\.0\.dspack/);
  assert.match(html, /300 B/);
  assert.match(html, /a{16}/);
});

test('exportRepoResultHTML：渲染仓库结果（内容档/写入清单）', () => {
  const html = exportRepoResultHTML({
    dir: 'C:\\out\\web-1.0.0',
    content: 'full',
    manifest: { name: 'web', version: '1.0.0' },
    written: ['manifest.json', 'README.md', 'release/'],
  });
  assert.match(html, /仓库已导出/);
  assert.match(html, /全套文件/);
  assert.match(html, /web v1\.0\.0/);
  assert.match(html, /README\.md/);
  assert.match(html, /3 项/);
});