import { test } from 'node:test';
import assert from 'node:assert/strict';
import { syncPackTree, recoverPackUpdate } from '../src/update.js';
import { NodeHost } from '@dsh-packforge/host-node';
import { parse } from 'yaml';

async function setup(t) {
  const host = new NodeHost();
  const root = await host.mkdtemp('pack-update-test-');
  t.after(() => host.rm(root, { recursive: true, force: true }));
  const home = host.joinPath(root, 'real');
  const stage = host.joinPath(root, 'stage');
  const manifest = { name: 'example', profileName: 'one', type: 'profile', manifestVersion: 6, version: '1' };
  const write = (dir, path, text) => host.writeTextFile(host.joinPath(dir, path), text);
  const read = (dir, path) => host.readTextFile(host.joinPath(dir, path));
  const run = (options = {}) => syncPackTree(host, { home, stagedHome: stage, manifest, mode: 'update', ...options });
  await host.mkdir(stage);
  return { host, root, home, stage, manifest, write, read, run };
}

test('初装与多次升级分别识别上游变更、本地删除、自建文件及双边冲突', async t => {
  const {host, home, stage, write, read, run} = await setup(t);
  const path = 'profiles/one/a.txt';
  await write(stage, path, 'one');
  await write(stage, 'skills/shared/SKILL.md', 'one');
  assert.equal((await run({ mode: 'install' })).applied, true);
  await write(home, path, 'local');
  await write(home, 'profiles/one/solo', 'mine');
  await host.rm(host.joinPath(home, 'skills/shared/SKILL.md'));
  await write(stage, path, 'two');
  let preview = await run({ dryRun: true });
  assert.deepEqual(preview.conflicts.map(c => c.path), [path]);
  await write(home, path, 'new-local');
  await assert.rejects(run({previewToken:preview.previewToken,resolutions:{[path]:'upstream'}}), /重新预览/);
  preview = await run({ dryRun:true });
  assert.equal((await run()).applied,true);
  assert.equal(await read(home, path), 'new-local');
  assert.equal(await read(home, 'skills/shared/SKILL.md'), null);
  await write(stage, path, 'three');
  preview = await run({dryRun:true});
  assert.equal((await run({previewToken:preview.previewToken,resolutions:{[path]:'upstream'}})).applied, true);
  assert.equal(await read(home,path), 'three');
  assert.equal(await read(home,'profiles/one/solo'),'mine');
});

test('合并同一份 JSON 与 Cordis YAML 不同成员，保留本地注释与已有密钥', async t => {
  const {host, home, stage, write, read, run} = await setup(t);
  const pkg = 'profiles/one/package.json';
  const patch = 'profiles/one/cordis.patch.yml';
  const first = '- insert:\n    - id: first\n      config: { a: 1 }\n';
  const second = '- insert:\n    - id: second\n      name: upstream\n';
  const local = '- insert:\n    - id: local\n      name: local # 自定义\n';
  await write(stage, pkg, JSON.stringify({dependencies:{a:'1'},dsh:{profile:{bundles:['a']}}}));
  await write(stage, patch, first);
  await write(stage, '.credentials.yaml', 'DO-NOT-COPY');
  await write(stage, '.dsh-pack/skills/one/x/SKILL.md', 'slot');
  await write(stage, 'profiles/one/.dspack-sources/archive.tgz', 'tarball');
  await write(home,'.credentials.yaml','prior');
  await run({mode:'install'});
  assert.equal(await read(home,'.dsh-pack/skills/one/x/SKILL.md'),'slot');
  assert.equal(await read(home,'profiles/one/.dspack-sources/archive.tgz'),'tarball');
  await write(home, pkg, JSON.stringify({dependencies:{a:'1',local:'9'},dsh:{profile:{bundles:['a','local']}}}));
  await write(home, patch, first + local);
  await write(stage, pkg, JSON.stringify({dependencies:{a:'2',new:'2'},dsh:{profile:{bundles:['a','new']}}}));
  await write(stage, patch, first.replace('a: 1','a: 2') + second);
  const result=await run();
  assert.equal(result.applied, true);
  const saved = JSON.parse(await read(home,pkg));
  assert.deepEqual(saved.dependencies,{a:'2',local:'9',new:'2'});
  assert.deepEqual(new Set(saved.dsh.profile.bundles),new Set(['a','local','new']));
  const patched = await read(home,patch);
  assert.match(patched,/# 自定义/);
  assert.deepEqual(new Set(parse(patched).map(v=>v.insert[0].id)),new Set(['first','local','second']));
  assert.equal(parse(patched)[0].insert[0].config.a,2);
  assert.equal(await read(home,'.credentials.yaml'),'prior');
  const records=await host.readdir(host.joinPath(home,'.dsh-pack/updates/baselines'));
  assert.doesNotMatch(await host.readTextFile(records[0].abs),/DO-NOT-COPY|prior|自定义/);
});

test('共享路径在第二个整合包删除引用时保留，已修改文件不被初次迁移盲目覆盖', async t => {
  const {host,home,stage,manifest,write,read,run} = await setup(t);
  const shared='AGENTS.md';
  await write(stage,shared,'one');
  await run({mode:'install'});
  const second={...manifest,name:'second',profileName:'two'};
  await run({mode:'install',manifest:second});
  await host.rm(host.joinPath(stage,shared));
  assert.equal((await run({manifest:second})).applied,true);
  assert.equal(await read(home,shared),'one');
  assert.equal((await run()).applied,true);
  assert.equal(await read(home,shared),null);
  await write(stage,'new.txt','upstream');
  await write(home,'new.txt','local');
  const preview=await run({manifest:{...manifest,name:'third',profileName:'three'},dryRun:true});
  assert.equal(preview.unknownBase,true);
  assert.deepEqual(preview.conflicts.map(c=>c.path),['new.txt']);
});

test('校验旧包可迁移 v5 基线，保留已改内容并清理已撤下的上游文件', async t => {
  const {host,root,home,stage,manifest,write,read,run} = await setup(t);
  const prev = host.joinPath(root,'old');
  for (const dest of [prev,home]) {
    await write(dest,'gone','one');
    await write(dest,'user','one');
  }
  await write(home,'user','user');
  await write(stage,'user','one');
  const previous={manifest:{...manifest,manifestVersion:5},stagedHome:prev,sha256:'a'.repeat(64),expectedSha256:'a'.repeat(64)};
  await assert.rejects(run({previous:{...previous,sha256:'b'.repeat(64)}}),/SHA-256/);
  assert.equal((await run({previous})).applied,true);
  assert.equal(await read(home,'gone'),null);
  assert.equal(await read(home,'user'),'user');
});

test('依赖或凭据失败时还原原有依赖目录、配置、凭据与锁文件', async t => {
  const {host,home,stage,write,read,run} = await setup(t);
  const pkg='profiles/one/package.json',modules='profiles/one/node_modules/p/index.js';
  await write(stage,pkg,'{"dependencies":{"p":"1"}}');
  await run({mode:'install'});
  await write(home,modules,'old');
  await write(home,'profiles/one/pnpm-lock.yaml','old lock');
  await write(home,'.credentials.yaml','old secret');
  await write(stage,pkg,'{"dependencies":{"p":"2"}}');
  await assert.rejects(run({
    finalize:async ({affectedProfiles})=>{
      assert.deepEqual(affectedProfiles,[host.joinPath(home,'profiles','one')]);
      assert.equal(await read(home,modules),null);
      await write(home,modules,'new');
      await write(home,'profiles/one/pnpm-lock.yaml','new lock');
    },
    commitCredentials:async ()=>{
      await write(home,'.credentials.yaml','new secret');
      throw new Error('cancel');
    },
  }),/cancel/);
  assert.equal(await read(home,modules),'old');
  assert.equal(await read(home,pkg),'{"dependencies":{"p":"1"}}');
  assert.equal(await read(home,'profiles/one/pnpm-lock.yaml'),'old lock');
  assert.equal(await read(home,'.credentials.yaml'),'old secret');
  assert.equal((await run()).applied,true);
  assert.equal(await read(home,modules),'old');
  assert.equal(await host.stat(host.joinPath(home,'.dsh-pack/updates/transaction')),null);
});

test('持有目录锁期间排除并发更新，失败重试时可恢复完整基线', async t => {
  const {host,home,stage,write,read,run} = await setup(t);
  const pkg='profiles/one/package.json';
  await write(stage,pkg,'{}');
  let notify, finish;
  const ready=new Promise(resolve=>{notify=resolve;});
  const hold=new Promise(resolve=>{finish=resolve;});
  const installing=run({mode:'install',finalize:async ()=>{notify();await hold;}});
  await ready;
  try {
    await assert.rejects(run(),/另一项/);
  } finally {
    finish();
  }
  await installing;
  const journal=host.joinPath(home,'.dsh-pack/updates/transaction');
  const records=await host.readdir(host.joinPath(home,'.dsh-pack/updates/baselines'));
  const key=records[0].name.slice(0,-5);
  await write(journal,'old/0','{}');
  await write(journal,'journal.json',JSON.stringify({id:'new',key,profilesDir:'profiles',operations:[{path:pkg,kind:'file',existed:true}]}));
  await write(home,pkg,'incomplete');
  await recoverPackUpdate(host,home);
  assert.equal(await read(home,pkg),'{}');
});

test('跳过选定技能时保留基线与本地内容，继续更新前检查预览选择', async t => {
  const {host,home,stage,write,read,run}=await setup(t);
  const path='skills/example/SKILL.md',other='skills/example-extra/SKILL.md';
  await write(stage,path,'v1');
  await write(stage,other,'v1');
  await run({mode:'install'});
  await host.rm(host.joinPath(stage,'skills'));
  await write(stage,'extra','available');
  for (const bad of ['..','skills/../home','/skills','C:/skills','skills\\example']) {
    await assert.rejects(run({preservePaths:[bad]}),/路径/);
  }
  await run({preservePaths:['skills/example']});
  assert.equal(await read(home,path),'v1');
  assert.equal(await read(home,other),null);
  assert.equal(await read(home,'extra'),'available');
  await write(stage,path,'v2');
  assert.equal((await run()).applied,true);
  assert.equal(await read(home,path),'v2');
});

test('暂缓重建的依赖可在下一次安装恢复，pnpm 重写的锁仍可接收上游版本', async t => {
  const {home,stage,write,read,run}=await setup(t);
  const lock='profiles/one/pnpm-lock.yaml';
  await write(stage,'profiles/one/package.json','{"dependencies":{"p":"1"}}');
  await write(stage,lock,'source1');
  await run({mode:'install'});
  let calls=0;
  await run({finalize:async()=>{calls++;await write(home,lock,'generated');}});
  assert.equal(calls,1);
  await write(stage,lock,'source2');
  const preview=await run({dryRun:true});
  assert.deepEqual(preview.conflicts,[]);
  await run();
  assert.equal(await read(home,lock),'source2');
});

test('安装未取得既有文件的所有权，后续上游撤下与本地相同的文件也保留', async t => {
  const {host,home,stage,write,read,run}=await setup(t);
  await write(stage,'existing','same');
  await write(home,'existing','same');
  await run({mode:'install'});
  await host.rm(host.joinPath(stage,'existing'));
  await run();
  assert.equal(await read(home,'existing'),'same');
});

test('同一配置发生冲突时采用上游只替换有冲突的成员', async t => {
  const {home,stage,write,read,run}=await setup(t);
  const path='profiles/one/config.json';
  await write(stage,path,'{"both":1,"untouched":0}');
  await run({mode:'install'});
  await write(home,path,'{"both":2,"mine":"ABC","untouched":0}');
  await write(stage,path,'{"both":3,"up":4,"untouched":0}');
  const p=await run({dryRun:true});
  assert.equal(p.conflicts[0].path,path);
  await run({previewToken:p.previewToken,resolutions:{[path]:'upstream'}});
  assert.deepEqual(JSON.parse(await read(home,path)),{both:3,mine:'ABC',up:4,untouched:0});
});

test('同一配置文件两个冲突可以分别接受新版与保留本地', async t => {
  const {home, stage, write, read, run} = await setup(t);
  const path = 'profiles/one/preferences.json';
  await write(stage, path, JSON.stringify({a:1, b:1}));
  await run({mode:'install'});
  await write(home, path, JSON.stringify({a:2, b:2}));
  await write(stage, path, JSON.stringify({a:3, b:3}));
  const preview = await run({dryRun:true});
  const members = preview.conflicts[0].fields;
  assert.deepEqual(members.map(m => m.label).sort(), ['a','b']);
  await run({previewToken:preview.previewToken, resolutions:{[members.find(m => m.label === 'a').key]:'upstream'}});
  assert.deepEqual(JSON.parse(await read(home,path)), {a:3, b:2});
});

test('大小写别名随上游改名，保留本地内容并在失败后恢复原目录项', async t => {
  const {host,stage,home,root,run,write,read} = await setup(t);
  const old = 'profiles/one/data/settings.txt', next = 'profiles/one/Data/Settings.txt';
  await write(stage,old,'upstream');
  await run({mode:'install'});
  if (!await host.packEntryType(host.joinPath(home,next))) { t.skip('当前卷区分大小写'); return; }
  const second = host.joinPath(root,'second');
  await write(second,next,'upstream');
  await write(home,old,'local');
  const opts = {stagedHome:second}, entries = async dir => (await host.readdir(host.joinPath(home,dir))).map(e=>e.name);
  const preview = await run({...opts,dryRun:true});
  assert.deepEqual(preview.changes.filter(c=>c.action==='rename').map(c=>c.path), ['profiles/one/Data',next]);
  assert(!preview.changes.some(c=>c.action==='remove'));
  await assert.rejects(run({...opts,validateProfiles:async()=>{throw new Error('取消提交');}}),/取消提交/);
  assert((await entries('profiles/one')).includes('data'));
  assert.deepEqual(await entries('profiles/one/data'),['settings.txt']);
  assert.equal(await read(home,old),'local');
  await run({...opts,previewToken:preview.previewToken});
  assert((await entries('profiles/one')).includes('Data'));
  assert.deepEqual(await entries('profiles/one/Data'),['Settings.txt']);
  assert.equal(await read(home,next),'local');
  await write(second,next,'new upstream');
  assert.equal((await run({...opts,dryRun:true})).conflicts[0].path,next);
});

test('区分大小写的卷保留目标位置已有的独立本机文件', async t => {
  const {host,stage,home,root,run,write,read} = await setup(t);
  const old='profiles/one/file', next='profiles/one/File';
  await write(stage,old,'base');
  await run({mode:'install'});
  if (await host.packEntryType(host.joinPath(home,next))) { t.skip('当前卷不区分大小写'); return; }
  await write(home,next,'user data');
  const second=host.joinPath(root,'second');
  await write(second,next,'upstream');
  const preview=await run({stagedHome:second,dryRun:true});
  assert(preview.conflicts.some(c=>c.path===next));
  await run({stagedHome:second});
  assert.equal(await read(home,next),'user data');
  assert.equal(await read(home,old),null);
});

test('缓存已就绪的 profile 重新安装缺失的直接依赖，失败恢复现有模块', async t => {
  const {host,stage,home,run,write,read} = await setup(t);
  const modules='profiles/one/node_modules', file=modules+'/@example/p/package.json';
  await write(stage,'profiles/one/package.json',JSON.stringify({dependencies:{'@example/p':'1.0.0',optional:'2.0.0'},optionalDependencies:{optional:'2.0.0'}}));
  let calls=0;
  const finalize=async()=>{calls++;await write(home,file,'{"name":"@example/p","version":"1.0.0"}');};
  await run({mode:'install',finalize});
  await run({finalize});
  assert.equal(calls,1);
  const pristine=await run({finalize,dryRun:true});
  await host.rm(host.joinPath(home,modules),{recursive:true,force:true});
  const repair=await run({finalize,dryRun:true});
  assert(repair.changes.some(c=>c.path===modules && c.action==='install'));
  await assert.rejects(run({finalize,previewToken:pristine.previewToken}), /重新预览/);
  await run({finalize});
  assert.equal(calls,2);
  await write(home,modules+'/local.txt','local');
  await host.rm(host.joinPath(home,file));
  await assert.rejects(run({finalize:async()=>{throw new Error('离线');}}),/离线/);
  assert.equal(await read(home,modules+'/local.txt'),'local');
  await run({finalize});
  assert.equal(calls,3);
  await write(home,file,'{"name":"@example/p","version":"0.9.0"}');
  await run({finalize});
  assert.equal(calls,4);
});

test('仅技能执行位改变时预览和回滚，保留本机内容与读写权限', async t => {
  const {host,stage,home,run,write,read}=await setup(t);
  const rel='skills/example/bin/tool', local=host.joinPath(home,rel), staged=host.joinPath(stage,rel);
  await write(stage,rel,'base');
  if (await host.packFileMode(staged) === null) { t.skip('当前宿主不提供 POSIX 权限'); return; }
  await host.chmodPackFile(staged,0o644);
  await run({mode:'install'});
  await write(home,rel,'local data');
  await host.chmodPackFile(local,0o640);
  await host.chmodPackFile(staged,0o755);
  const preview=await run({dryRun:true});
  assert(preview.changes.some(c=>c.action==='chmod' && c.path===rel));
  await assert.rejects(run({validateProfiles:async()=>{throw new Error('回滚权限');}}),/回滚权限/);
  assert.equal(await host.packFileMode(local),0o640);
  assert.equal(await read(home,rel),'local data');
  await run({previewToken:preview.previewToken});
  assert.equal(await host.packFileMode(local),0o750);
  assert.equal(await read(home,rel),'local data');
  await host.chmodPackFile(staged,0o644);
  await run();
  assert.equal(await host.packFileMode(local),0o640);
  await host.chmodPackFile(local,0o740);
  await host.rm(staged);
  const removed=await run({dryRun:true});
  assert(removed.conflicts.some(c=>c.path===rel));
  await run(); assert.equal(await read(home,rel),'local data');
});
