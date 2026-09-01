// DshPluginHost 适配测试：用一个「内存文件系统 + node:crypto」的 mock bridge 模拟 DSH 运行时，
// 证明 DshPluginHost 无需 node:fs 即能驱动 core 的打包/读档链路（等价于插件在浏览器里的能力）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createDshPluginHost, isDshBridgeSupported } from '../src/index.js';
import { packProfile, inspectPack } from '@dsh-packforge/core';

/* ------------------------- 工具（仅测试用） ------------------------- */
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const enc = (s) => encoder.encode(s);
const dec = (d) => decoder.decode(d);

function makeMockBridge() {
  const files = new Map(); // abs -> Uint8Array
  const dirs = new Set(['/']);
  let seq = 0;

  const norm = (p) => String(p).replace(/\\/g, '/').replace(/\/+/g, '/');
  const basename = (p) => norm(p).split('/').filter(Boolean).pop() ?? '';
  const dirname = (p) => '/' + norm(p).split('/').filter(Boolean).slice(0, -1).join('/');
  const join = (...parts) => norm('/' + parts.filter(Boolean).map((x) => String(x).replace(/\\/g, '/')).join('/'));
  const mkdirp = (abs) => {
    let cur = '';
    for (const seg of norm(abs).split('/').filter(Boolean)) {
      cur += '/' + seg;
      dirs.add(cur);
    }
  };

  return {
    join,
    resolve: (...parts) => join('/', ...parts),
    basename,
    homedir: () => '/root',
    env: () => null,
    async readTextFile(abs) {
      const d = files.get(abs);
      return d ? dec(d) : null;
    },
    async writeTextFile(abs, text) {
      mkdirp(dirname(abs));
      files.set(abs, enc(text));
    },
    async readFile(abs) {
      return files.get(abs) ?? null;
    },
    async writeFile(abs, data) {
      mkdirp(dirname(abs));
      files.set(abs, data instanceof Uint8Array ? data : new Uint8Array(data));
    },
    async stat(abs) {
      if (files.has(abs)) return { size: files.get(abs).byteLength, isFile: true, isDirectory: false, isSymbolicLink: false };
      if (dirs.has(abs)) return { size: 0, isFile: false, isDirectory: true, isSymbolicLink: false };
      return null;
    },
    async readdir(abs) {
      if (!dirs.has(abs)) return null;
      const out = [];
      const seen = new Set();
      for (const [k] of files) if (dirname(k) === abs && !seen.has(basename(k))) { seen.add(basename(k)); out.push({ name: basename(k), abs: k, type: 'file' }); }
      for (const d of dirs) if (dirname(d) === abs && d !== abs && !seen.has(basename(d))) { seen.add(basename(d)); out.push({ name: basename(d), abs: d, type: 'dir' }); }
      return out;
    },
    async mkdir(abs) { mkdirp(abs); },
    async rm(abs, opts = {}) {
      if (files.has(abs)) files.delete(abs);
      if (opts.recursive) {
        for (const k of [...files.keys()]) if (k === abs || k.startsWith(abs + '/')) files.delete(k);
        for (const d of [...dirs]) if (d === abs || d.startsWith(abs + '/')) dirs.delete(d);
      }
    },
    async move(from, to) {
      const d = files.get(from);
      if (d) { files.delete(from); mkdirp(dirname(to)); files.set(to, d); }
    },
    async mkdtemp(prefix) {
      const d = join('/tmp', prefix + String(++seq));
      dirs.add(d);
      return d;
    },
    async sha256(bytes) {
      return crypto.createHash('sha256').update(bytes).digest('hex');
    },
    async sha256File(abs) {
      const d = files.get(abs);
      return d ? this.sha256(d) : null;
    },
    download: () => Promise.reject(new Error('mock: 无网络')),
    exec: () => Promise.resolve({ status: 0 }),
  };
}

/* --------------------------- 测试 --------------------------- */
test('DshPluginHost：支持性判定', () => {
  assert.equal(isDshBridgeSupported(null), false);
  assert.equal(isDshBridgeSupported(makeMockBridge()), true);
  assert.equal(createDshPluginHost(makeMockBridge()).supported, true);
  assert.equal(createDshPluginHost(null).supported, false);
  assert.throws(() => createDshPluginHost(null).joinPath('a'), /未注入/);
});

test('DshPluginHost：经桥接打包 .dspack 并读回（无 node:fs）', async () => {
  const bridge = makeMockBridge();
  const host = createDshPluginHost(bridge);

  const profileDir = bridge.join('/root', '.dsh', 'profiles', 'web');
  await bridge.writeTextFile(bridge.join(profileDir, 'package.json'), JSON.stringify({ name: 'web', private: true }));
  await bridge.writeTextFile(bridge.join(profileDir, 'cordis.patch.yml'), '[]\n');

  const out = bridge.join('/root', 'out');
  const r = await packProfile(host, { name: 'web', dir: profileDir }, { out, dshVersion: '0.1.1-rc.2' });

  assert.equal(r.manifest.name, 'web');
  assert.match(r.output, /web-1\.0\.0\.dspack$/);
  assert.equal(r.sha256.length, 64);

  // 从桥接文件系统读回字节并 inspect（证明 writeFile + sha256 经桥接正确落地）
  const bytes = await bridge.readFile(r.output);
  assert.ok(bytes);
  const view = await inspectPack(host, bytes);
  assert.equal(view.valid, true);
  assert.equal(view.containerVersion, 2);
  assert.equal(view.manifest.name, 'web');
  assert.equal(view.manifest.dshVersion, '0.1.1-rc.2');
});

test('DshPluginHost：sha256 回退 WebCrypto 路径（bridge 只给 read/write）', async () => {
  const bridge = makeMockBridge();
  const { sha256, ...rest } = bridge; // 去掉 bridge.sha256，强制回退
  rest.sha256File = null; // 去掉文件级，也走兜底
  delete rest.sha256File;
  const host = createDshPluginHost(rest);
  // supported 只要求 sha256 存在；去掉后忽略，直接落数据走 readFile+sha256 兜底
  await rest.writeTextFile('/root/x.txt', 'hello');
  const digest = await host.sha256File('/root/x.txt');
  assert.equal(digest, crypto.createHash('sha256').update('hello').digest('hex'));
});