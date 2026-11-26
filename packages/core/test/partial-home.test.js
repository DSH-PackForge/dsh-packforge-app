import assert from 'node:assert/strict';
import test from 'node:test';
import { NodeHost } from '@dsh-packforge/host-node';
import { packHome } from '../src/pack.js';
import { parseDspack } from '../src/dspack.js';

test('整机导出须为每份配置档补丁选择其归属，缺失时不生成归档', async t => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pack-partial-home-');
  t.after(() => host.rm(root, {recursive:true, force:true}));
  const home = {name:'example', dir:host.joinPath(root, 'home')};
  const base = host.joinPath(home.dir, 'profiles');
  await host.writeTextFile(host.joinPath(base, 'work', 'package.json'), '{"name":"work"}');
  await host.writeTextFile(host.joinPath(base, 'notes', 'package.json'), '{"name":"notes"}');
  await host.writeTextFile(host.joinPath(base, 'notes', 'cordis.patch.yml'), '- id: llm-pi-ai\n  config:\n    providers:\n      example:\n        baseURL: https://api.example/\n');
  const opts = {out: root, include:['profiles/work/package.json', 'profiles/notes/cordis.patch.yml']};
  await assert.rejects(packHome(host, home, opts), /profiles\/notes\/package\.json/);
  assert.equal(await host.stat(host.joinPath(root, 'example-1.0.0.dspack')), null);
  opts.include.push('profiles/notes/package.json');
  const result = await packHome(host, home, opts);
  const {entries} = parseDspack(await host.readFile(result.output));
  const patch = new TextDecoder().decode(entries['overrides/profiles/notes/cordis.patch.yml']);
  assert.doesNotMatch(patch, /api\.example/);
  assert.equal(result.manifest.profiles.notes.patch, patch);
});
