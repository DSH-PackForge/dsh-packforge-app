import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NodeHost } from '@dsh-packforge/host-node';
import { discoverExtensions } from '../src/extensions.js';
import { decodeText, parseDspack } from '../src/dspack.js';
import { packHome, prepareProfileArchive } from '../src/pack.js';

test('插件排除路径不进入常规归档或已选择的路径资源', async t => {
  const host = new NodeHost();
  const root = await host.mkdtemp('plugin-exclusions-');
  t.after(() => host.rm(root, { recursive: true, force: true }));
  const home = host.joinPath(root, 'home');
  const author = { name: 'author', dir: host.joinPath(home, 'profiles', 'author') };
  const out = host.joinPath(root, 'output');
  const plugin = '@pack/demo';
  const pkg = JSON.stringify({ name: 'fixture', dependencies: { [plugin]: '1.0.0' } });
  const exclusions = JSON.stringify(['<profile>/data/history', 'data/local.json']);
  const hidden = new Set();
  for (const name of ['author', 'orphan']) {
    const dir = host.joinPath(home, 'profiles', name);
    const bundle = host.joinPath(dir, 'node_modules', '@pack', 'demo', 'dsh_pack');
    await host.writeTextFile(host.joinPath(bundle, 'exclude.json'), exclusions);
    hidden.add(host.joinPath(dir, 'data', 'history', 'old.txt'));
  }
  await host.writeTextFile(host.joinPath(author.dir, 'package.json'), pkg);
  const bundle = host.joinPath(author.dir, 'node_modules', '@pack', 'demo', 'dsh_pack');
  await host.writeTextFile(host.joinPath(bundle, 'paths.json'), JSON.stringify([
    { name: '数据', paths: ['<profile>/data'] },
    { name: '历史', paths: ['<profile>/data/history'] },
  ]));
  await host.writeTextFile(host.joinPath(author.dir, 'data', 'notes.txt'), 'shareable');
  await host.writeTextFile(host.joinPath(home, 'profiles', 'other', 'package.json'), '{}');
  await host.writeTextFile(host.joinPath(home, 'data', 'shared.txt'), 'common');
  hidden.add(host.joinPath(home, 'data', 'local.json'));
  for (const file of hidden) {
    await host.writeTextFile(file, 'local fixture');
  }
  const readFile = host.readFile.bind(host);
  host.readFile = path => {
    assert.ok(!hidden.has(path), '排除文件在读取内容前被过滤');
    return readFile(path);
  };

  const choices = await discoverExtensions(host, { home, profiles: [author] });
  assert.deepEqual(choices.paths.map(item => item.id), ['0']);
  const { entries } = await prepareProfileArchive(host, author, {
    home,
    dshVersion: '0.2.3-alpha.2',
    homeInclude: ['data/local.json', 'data/shared.txt'],
    selection: { paths: [choices.paths[0].key] },
  });
  const payload = JSON.parse(decodeText(entries['path.json']));
  assert.deepEqual(payload.plugins[plugin][0].files.map(file => file.path), ['profiles/author/data/notes.txt']);
  assert.ok(entries['home/data/shared.txt']);
  assert.equal(entries['home/data/local.json'], undefined);
  assert.equal(entries['overrides/data/history/old.txt'], undefined);

  const include = [
    'profiles/other/package.json',
    'profiles/author/data/history/old.txt',
    'profiles/orphan/data/history/old.txt',
    'data/local.json',
    'data/shared.txt',
  ];
  for (const files of [undefined, include]) {
    const { output } = await packHome(host, { name: 'fixture-home', dir: home }, {
      name: files ? 'fixture-partial' : 'fixture-full',
      out,
      defaultProfile: 'other',
      dshVersion: '0.2.3-alpha.2',
      include: files,
    });
    const whole = parseDspack(await host.readFile(output)).entries;
    assert.ok(whole['overrides/data/shared.txt']);
    assert.equal(whole['overrides/data/local.json'], undefined);
    assert.equal(whole['overrides/profiles/author/data/history/old.txt'], undefined);
    assert.equal(whole['overrides/profiles/orphan/data/history/old.txt'], undefined);
  }
});
