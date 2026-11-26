import assert from 'node:assert/strict';
import test from 'node:test';
import { NodeHost } from '@dsh-packforge/host-node';
import { collectExtensions, discoverExtensions, validateExtensions } from '../src/extensions.js';
import { managedInstall } from '../src/managed-install.js';
import { syncPackTree } from '../src/update.js';

const encode = obj => new TextEncoder().encode(JSON.stringify(obj));
const decode = bytes => JSON.parse(new TextDecoder().decode(bytes));

test('空目录按规则导出、随 profile 重定位，并在更新中保留使用者的数据', async t => {
  const host = new NodeHost();
  const sandbox = await host.mkdtemp('pack-path-directories-');
  t.after(() => host.rm(sandbox, {recursive:true, force:true}));
  const source = host.joinPath(sandbox, 'source');
  const profile = {name:'original', dir:host.joinPath(source, 'profiles', 'original')};
  const paths = ['<profile>/empty-root', '<profile>/mixed', '<profile>/local', '<profile>/existing'];
  await host.writeTextFile(host.joinPath(profile.dir, 'package.json'), JSON.stringify({dependencies:{'pack-demo':'1.0.0'}}));
  await host.writeTextFile(host.joinPath(profile.dir, 'node_modules/pack-demo/dsh_pack/paths.json'), JSON.stringify({name:'数据目录',paths}));
  for (const rel of ['empty-root','mixed/nested/empty','local','existing']) await host.mkdir(host.joinPath(profile.dir, rel));
  await host.writeTextFile(host.joinPath(profile.dir, 'mixed/readme.txt'), 'content');
  await host.writeTextFile(host.joinPath(profile.dir, 'mixed/package.json'), '{"name":"data"}');
  const manifest = {manifestVersion:6, type:'profile', profileName:'original', name:'directories', version:'1.0.0'};
  const location = {home:source, profiles:[profile]};
  const entries = {};
  const choices = await discoverExtensions(host, location);
  await collectExtensions(host, {...location, manifest, entries, selection:{}});
  assert.equal(entries['path.json'], undefined);
  await collectExtensions(host, {...location, manifest, entries, selection:{paths:[choices.paths[0].key]}});
  validateExtensions(manifest, entries);
  const record = decode(entries['path.json']).plugins['pack-demo'][0];
  assert.deepEqual(record.directories.map(d => [d.index,d.tail]), [[0,''],[1,'nested/empty'],[2,''],[3,'']]);
  assert.equal(record.files.length, 2);
  assert.throws(() => validateExtensions(manifest, {...entries, 'overrides/mixed/nested/empty/local':encode('x')}));
  for (const invalid of [
    {...record.directories[0], tail:'../a'},
    {...record.directories[0], path:record.files[0].path, index:1, tail:'readme.txt'},
    {...record.directories[0], index:1, path:'profiles/original/mixed'},
    {...record.directories[0], entry:'spoof'},
  ]) {
    const payload = decode(entries['path.json']);
    payload.plugins['pack-demo'][0].directories[0] = invalid;
    assert.throws(() => validateExtensions(manifest, {...entries, 'path.json':encode(payload)}));
  }
  const home = host.joinPath(sandbox, 'target');
  const profilesRoot = host.joinPath(home, 'custom-profiles');
  const target = host.joinPath(profilesRoot, 'renamed');
  const path = rel => host.joinPath(target, rel);
  const kind = rel => host.packEntryType(path(rel));
  const hooks = {
    stage: async staged => {
      await host.writeTextFile(host.joinPath(staged, 'profiles/renamed/package.json'), '{}');
      return {};
    },
    verify: async () => {},
    finalize: async () => { throw new Error('模拟依赖安装中断'); },
  };
  const install = (payload, options={}) => managedInstall(host, manifest, payload, {profilesRoot, name:'renamed', ...options}, hooks);
  await assert.rejects(install(entries), /模拟依赖安装中断/);
  assert.equal(await host.packEntryType(target), null);
  await host.mkdir(path('existing'));
  assert.equal((await install(entries, {update:true, noInstall:true, dryRun:true})).applied, false);
  assert.equal(await kind('mixed'), null);
  await install(entries, {update:true, noInstall:true});
  for (const rel of ['empty-root','mixed/nested/empty','local','existing']) assert.equal(await kind(rel), 'dir');
  assert.equal(await host.readTextFile(path('mixed/readme.txt')), 'content');
  assert.equal(await host.readTextFile(path('mixed/package.json')), '{"name":"data"}');
  await host.writeTextFile(path('local/user.txt'), 'user');
  await host.removePackDirIfEmpty(path('empty-root'));
  await install(entries, {update:true, noInstall:true});
  assert.equal(await kind('empty-root'), null);
  await install(entries, {update:true, noInstall:true, decisions:{[record.key]:'skip'}});
  assert.equal(await kind('mixed/nested/empty'), 'dir');
  const obsolete = await install({}, {update:true, noInstall:true, dryRun:true});
  assert(obsolete.changes.some(c => c.path === 'custom-profiles/renamed/mixed/nested/empty' && c.action === 'remove'));
  await assert.rejects(install({}, {update:true}), /模拟依赖安装中断/);
  assert.equal(await kind('mixed/nested/empty'), 'dir');
  await install({}, {update:true, noInstall:true});
  assert.equal(await kind('mixed/nested/empty'), null);
  assert.equal(await kind('existing'), 'dir');
  assert.equal(await host.readTextFile(path('local/user.txt')), 'user');
});

test('共享空目录按最后一个拥有者清理，既有文件替换须确认并可恢复', async t => {
  const host = new NodeHost(), box = await host.mkdtemp('pack-directory-owners-');
  t.after(() => host.rm(box, {recursive:true, force:true}));
  const home = host.joinPath(box,'home'), stagedHome = host.joinPath(box,'stage');
  await host.mkdir(host.joinPath(stagedHome,'shared-empty'));
  const install = (profileName,directories,extra={}) => syncPackTree(host,{
    home,stagedHome,manifest:{name:profileName, version:'1', type:'profile', profileName},mode:'update',directories,...extra,
  });
  await install('first',['shared-empty']);
  await install('second',['shared-empty']);
  await install('first',[]);
  assert.equal(await host.packEntryType(host.joinPath(home,'shared-empty')), 'dir');
  await install('second',[]);
  assert.equal(await host.packEntryType(host.joinPath(home,'shared-empty')), null);
  await host.writeTextFile(host.joinPath(home,'shared-empty'),'existing');
  const preview = await install('first',['shared-empty'],{dryRun:true});
  assert.equal(preview.conflicts.length,1);
  await install('first',['shared-empty']);
  assert.equal(await host.readTextFile(host.joinPath(home,'shared-empty')),'existing');
  const retry = await install('first',['shared-empty'],{dryRun:true});
  const replace = {previewToken:retry.previewToken, resolutions:{'shared-empty':'upstream'}};
  await assert.rejects(install('first',['shared-empty'],{...replace, finalize:async()=>{throw new Error('中断');}}), /中断/);
  assert.equal(await host.readTextFile(host.joinPath(home,'shared-empty')),'existing');
  await install('first',['shared-empty'],replace);
  assert.equal(await host.packEntryType(host.joinPath(home,'shared-empty')), 'dir');
});
