import test from 'node:test';
import assert from 'node:assert/strict';
import { dshBridgeFromContext, viewPackBytes } from '../src/index.js';
import { buildDspack, encodeText } from '@dsh-packforge/core';

// 按 DSH 真实契约（@deepseek-ai/dsh-fs 的 FileSystem）做的最小 mock。
function makeFs(tree) {
  const writes = [];
  const resolve = async (p) => ({ targetKey: p, displayPath: p });
  const processPath = (t) => t.displayPath;
  const stat = async (t) => {
    const e = tree.get(t.displayPath);
    if (!e) return undefined;
    return { version: 'v', type: e.type === 'symlink' ? 'other' : e.type, size: e.size ?? 0 };
  };
  const lstat = async (p) => {
    const e = tree.get(p);
    if (!e) return undefined;
    return { version: 'v', type: e.type, size: e.size ?? 0 };
  };
  const readText = async (t) => tree.get(t.displayPath)?.text ?? '';
  const readBytes = async (t) => tree.get(t.displayPath)?.bytes ?? new Uint8Array(0);
  const listDir = async (t) => {
    const prefix = t.displayPath + '/';
    const out = [];
    for (const [k, v] of tree) {
      if (k.startsWith(prefix) && k.slice(prefix.length).indexOf('/') === -1) {
        out.push({
          name: k.slice(prefix.length),
          type: v.type === 'dir' ? 'directory' : v.type === 'symlink' ? 'other' : 'file',
          target: { targetKey: k, displayPath: k },
          size: v.size ?? 0,
        });
      }
    }
    return out;
  };
  const writeText = async (t, content) => {
    writes.push({ path: t.displayPath, content });
    tree.set(t.displayPath, { type: 'file', size: content.length, text: content });
    return { operation: 'update', version: 'v', before: null, after: content };
  };
  return { resolve, processPath, stat, lstat, readText, readBytes, listDir, writeText, writes };
}

function makeShell(runResult) {
  const calls = [];
  const shell = {
    resolve: (req) => { calls.push({ phase: 'resolve', req }); return req; },
    run: async (spec) => { calls.push({ phase: 'run', spec }); return runResult; },
  };
  return { shell, calls };
}

test('ctx.fs（FileSystem）→ bridge 文本/二进制/metadata/目录 忠实映射', async () => {
  const b1 = new Uint8Array([1, 2, 3, 4]);
  const tree = new Map([
    ['/root/a.txt', { type: 'file', size: 3, text: 'abc' }],
    ['/root/b.bin', { type: 'file', size: 4, bytes: b1 }],
    ['/root/sub', { type: 'dir' }],
    ['/root/sub/c.txt', { type: 'file', size: 2, text: 'ok' }],
    ['/root/lnk', { type: 'symlink' }],
  ]);
  const fs = makeFs(tree);
  const bridge = dshBridgeFromContext({ fs });

  assert.equal(await bridge.readTextFile('/root/a.txt'), 'abc');
  assert.deepEqual(Array.from(await bridge.readFile('/root/b.bin')), [1, 2, 3, 4]);

  const stFile = await bridge.stat('/root/a.txt');
  assert.equal(stFile.isFile, true);

  const stLink = await bridge.stat('/root/lnk');
  assert.equal(stLink.isSymbolicLink, true);

  const stMissing = await bridge.stat('/root/nope');
  assert.equal(stMissing, null);

  const dir = await bridge.readdir('/root/sub');
  assert.deepEqual(dir.map((e) => e.name), ['c.txt']);
  assert.equal(dir[0].type, 'file');

  await bridge.writeTextFile('/root/new.txt', 'hi');
  assert.equal(fs.writes.length, 1);
  assert.equal(fs.writes[0].path, '/root/new.txt');
  assert.equal(fs.writes[0].content, 'hi');
});

test('ctx.fs 无二进制写/mkdir/rm/move → 显式抛错', async () => {
  const bridge = dshBridgeFromContext({ fs: makeFs(new Map()) });
  await assert.rejects(() => bridge.writeFile('/x', new Uint8Array(1)), /无二进制写/);
  await assert.rejects(() => bridge.mkdir('/x'), /无 mkdir/);
  await assert.rejects(() => bridge.rm('/x'), /无 rm/);
  await assert.rejects(() => bridge.move('/a', '/b'), /无 move/);
});

test('ctx.shell（ShellExecutor）→ bridge.exec 映射', async () => {
  const { shell, calls } = makeShell({ exitCode: 0, stdout: 'ok', stderr: '' });
  const bridge = dshBridgeFromContext({ fs: makeFs(new Map()), shell });
  const r = await bridge.exec('dspack', ['pack', 'web'], { cwd: '/x' });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, 'ok');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].phase, 'resolve');
  assert.match(calls[0].req.command, /^dspack pack web$/);
  assert.equal(calls[0].req.workdir, '/x');
  assert.equal(calls[1].phase, 'run');
  assert.equal(calls[1].spec, calls[0].req);
});

test('viewPackBytes：浏览器内就地解析 .dspack（无 node:fs）', async () => {
  const entries = { 'manifest.json': encodeText(JSON.stringify({ manifestVersion: 4, version: '1.0.0', type: 'profile' })) };
  const bytes = buildDspack(entries);
  const r = await viewPackBytes(bytes);
  assert.equal(r.totalEntries, 1);
  assert.equal(r.sha256.length, 64); // WebCrypto 计算出的 hex
});