import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const bundle = join(here, '..', 'lib', 'client.js');

const built = existsSync(bundle);

test('客户端 bundle：注册 {id, factory}，工厂产出 {name, apply}', async () => {
  if (!built) {
    test('(跳过：先运行 `pnpm --filter @dsh-packforge/plugin bundle` 生成 lib/client.js)', () => {});
    return;
  }
  let captured = null;
  globalThis.__ModuleLoader__ = { load: (o) => { captured = o; } };
  // bundle 里 react 是 external（`require("react")`），由 DSH 浏览器模块系统提供；
  // 测试用 createRequire 模拟这套模块系统，否则 Node ESM 下顶层 __require("react") 会抛错。
  globalThis.require = createRequire(import.meta.url);
  try {
    await import(pathToFileURL(bundle).href);
  } finally {
    delete globalThis.__ModuleLoader__;
    delete globalThis.require;
  }
  assert.ok(captured, 'bundle 未调用 window.__ModuleLoader__.load');
  assert.equal(captured.id, '@dsh-packforge/plugin');
  const exports = captured.factory(() => {});
  assert.equal(exports.name, 'dsh-packforge');
  assert.equal(typeof exports.apply, 'function');
});

test('客户端 bundle：浏览器安全（无 node: 内建引入）', () => {
  if (!built) return;
  const txt = readFileSync(bundle, 'utf8');
  assert.doesNotMatch(txt, /(?:from\s*["']|require\(\s*["'])node:/);
});