import assert from 'node:assert/strict';
import test from 'node:test';
import { parse } from 'yaml';
import { managedInstall } from '../src/managed-install.js';
import { syncPackTree } from '../src/update.js';
import { readMcpComposition } from '../src/mcp-composition.js';
import { NodeHost } from '@dsh-packforge/host-node';
import { collectExtensions,discoverExtensions,planExtensionInstall,validateExtensions } from '../src/extensions.js';
import { splitPatch,mergePatch } from '../src/extension-patch.js';
import { checkSkillSource } from '../src/extension-skills.js';

const native = [
  '- id: llm-deepseek','  config:', '    baseURL: https://deepseek.example/v1','    apiKeyEnv: NATIVE_KEY',
  '- id: llm-pi-ai','  config:','    providers:','      example:', '        baseURL: https://llm.example/v1', '        apiKeyEnv: SAMPLE_KEY',
  '- id: mcp-manager','  config:','    servers:','      notes:','        transport: streamable-http','        url: https://notes.example/mcp','        headers:','          Authorization: Bearer demo-test-secret',
  '- insert:','    - id: another','      name: unrelated-plugin','      config: { interval: 4 }','    - id: mcp-local','      name: "@deepseek-ai/dsh-mcp-client"','      config:','        serverName: sample','        command: node','        env:','          AUTH_TOKEN: demo-test-secret',
].join('\n');
const encode = v => new TextEncoder().encode(typeof v === 'string' ? v : JSON.stringify(v));
const decode = v => new TextDecoder().decode(v);

test('用户可替换目标补丁中的单项服务，保留该层原有空表语义和其他服务',async t=>{
  const host=new NodeHost(),home=await host.mkdtemp('mcp-local-replace-');
  t.after(()=>host.rm(home,{recursive:true,force:true}));
  const profileDir=host.joinPath(home,'profiles','work'),file=host.joinPath(profileDir,'cordis.patch.yml');
  const row={id:'mcp-manager',name:'@deepseek-ai/dsh-mcp-manager',config:{servers:{one:{command:'node'},other:{command:'deno'}}}};
  const source=splitPatch(JSON.stringify([{id:row.id,config:{servers:{one:{command:'bun'}}}}]),'home').items[0];
  const options={home,profileDir,profileName:'work',manifest:{manifestVersion:6,type:'profile',profileName:'work'},entries:{'mcp.json':encode({items:[source]})}};
  for (const includeOther of [true,false]) {
    if (!includeOther) delete row.config.servers.other;
    await host.writeTextFile(file,JSON.stringify([{insert:[row]}]));
    const preview=await planExtensionInstall(host,options);
    assert.equal(preview.items[0].skipped,true);
    assert.equal(preview.items[0].canReplace,true);
    const install=await planExtensionInstall(host,{...options,decisions:{[source.key]:'replace'}});
    await install.apply(); await install.verifyMcp();
    const rows=parse(await host.readTextFile(file)).flatMap(r=>r.insert||[]);
    assert.deepEqual(Object.keys(rows.find(r=>r.id===row.id).config.servers),includeOther?['other']:[]);
    assert.equal(rows.find(r=>r.id==='dspack-mcp-one').config.command,'bun');
  }
});

test('从已有受管 manager 条目升级为独立客户端，可再次升级；冲突覆盖使提交回滚',async t=>{
  const host=new NodeHost(),home=await host.mkdtemp('mcp-manager-migrate-');
  t.after(()=>host.rm(home,{recursive:true,force:true}));
  const profileDir=host.joinPath(home,'profiles','work'), patch=host.joinPath(profileDir,'cordis.patch.yml'), profilesRoot=host.joinPath(home,'profiles');
  const temp=await host.mkdtemp('mcp-old-version-');
  t.after(()=>host.rm(temp,{recursive:true,force:true}));
  const base={name:'example',type:'profile',profileName:'work',manifestVersion:6,version:'1'};
  const write=(root,file,body)=>host.writeTextFile(host.joinPath(root,'profiles','work',file),body);
  const oldRow={id:'mcp-manager',name:'@deepseek-ai/dsh-mcp-manager',config:{servers:{sample:{command:'node',transport:'stdio'}}}};
  await write(temp,'package.json','{}');
  await write(temp,'cordis.patch.yml',JSON.stringify([{insert:[oldRow]}]));
  await syncPackTree(host,{home,stagedHome:temp,manifest:base,mode:'install'});
  const source=splitPatch(JSON.stringify([{id:'mcp-manager',config:{servers:{sample:{command:'deno',transport:'stdio'}}}}]),'profile:work').items[0];
  const entries={'mcp.json':encode({items:[source]})};
  const handlers={stage:async stage=>{await write(stage,'package.json','{}');await write(stage,'cordis.patch.yml','[]');return {};},verify:async()=>{}};
  const install=extra=>managedInstall(host,{...base,version:'2'},entries,{profilesRoot,noInstall:true,update:true,...extra},handlers);
  const info=await install({dryRun:true,listResourcesOnly:true});
  assert.equal(info.items[0].skipped,false);
  await install();
  const saved=await host.readTextFile(patch);
  assert.deepEqual((await readMcpComposition(host,{home,profileDir})).servers.map(s=>s.owner),['client:dspack-mcp-sample']);
  await install();
  const overlay=host.joinPath(home,'new-overlay.yml');
  await host.writeTextFile(overlay,'[]');
  const changed={...handlers,verify:async()=>{
    await host.writeTextFile(overlay,JSON.stringify([{id:'dspack-mcp-sample',disabled:true}]));
  }};
  await assert.rejects(managedInstall(host,{...base,version:'3'},entries,{profilesRoot,noInstall:true,update:true,overlayPaths:[overlay]},changed),/被其他配置覆盖/);
  assert.equal(await host.readTextFile(patch),saved);
});

test('独立客户端在 bundle、profile、HOME 与启动覆盖层组合后仍生效，更新只移除自己的旧服务',async t=>{
  const host=new NodeHost(), home=await host.mkdtemp('mcp-composed-update-');
  t.after(()=>host.rm(home,{recursive:true,force:true}));
  const profilesRoot=host.joinPath(home,'profiles'), profileDir=host.joinPath(profilesRoot,'work');
  const patchFile=host.joinPath(profileDir,'cordis.patch.yml'), globalFile=host.joinPath(home,'cordis.patch.yml');
  const overlay=host.joinPath(home,'overlay.yml'), bundle=host.joinPath(home,'node_modules','fixture-bundle');
  const bundles=['fixture-bundle'], pkg=JSON.stringify({dsh:{profile:{bundles}}});
  await host.writeTextFile(host.joinPath(bundle,'package.json'),JSON.stringify({dsh:{bundle:{patch:'./patch.yml'}}}));
  const server=(command,extra)=>({command,transport:'stdio',...extra});
  const source=(key,command)=>JSON.stringify([{id:'mcp-manager',config:{servers:{[key]:server(command)}}}]);
  await host.writeTextFile(host.joinPath(bundle,'patch.yml'),JSON.stringify([{insert:[{id:'mcp-manager',name:'@deepseek-ai/dsh-mcp-manager',config:{servers:{base:server('node')}}}]}]));
  async function install(id,update,overlayPaths=[]) {
    const selected=splitPatch(source(id,'node'),'profile:work');
    const manifest={name:'example',version:update?'2':'1',manifestVersion:6,type:'profile',profileName:'work',bundles};
    const handlers={stage:async stage=>{
      await host.writeTextFile(host.joinPath(stage,'profiles','work','package.json'),pkg);
      await host.writeTextFile(host.joinPath(stage,'profiles','work','cordis.patch.yml'),selected.patch);
      return {};
    },verify:async()=>{}};
    return managedInstall(host,manifest,{'mcp.json':encode({items:selected.items})},{profilesRoot,noInstall:true,update,overlayPaths},handlers);
  }
  const names=async (overlayPaths=[]) => (await readMcpComposition(host,{home,profileDir,overlayPaths})).servers.map(s=>s.server).sort();
  await install('first',false);
  assert.deepEqual(await names(),['base','first']);
  await host.writeTextFile(globalFile,JSON.stringify([{id:'mcp-manager',config:{servers:{global:server('bun',{env:{TOKEN:'local-test-value'}})}}}]));
  assert.deepEqual(await names(),['first','global']);
  let local=parse(await host.readTextFile(patchFile));
  local.push({insert:[{id:'user-client',name:'@deepseek-ai/dsh-mcp-client',config:{serverName:'user',transport:'stdio',command:'deno'}}]});
  await host.writeTextFile(patchFile,JSON.stringify(local));
  await host.writeTextFile(overlay,source('top','node'));
  await install('next',true,[overlay]);
  assert.deepEqual(await names([overlay]),['next','top','user']);
  assert.deepEqual(await names(),['global','next','user']);
  const finalPatch=await host.readTextFile(patchFile);
  assert(!finalPatch.includes('local-test-value'));
  assert(!finalPatch.includes('dspack-mcp-first'));
  await install('next',true,[overlay]);
  assert.deepEqual(await names([overlay]),['next','top','user']);
  local=parse(await host.readTextFile(patchFile));
  local.flatMap(r=>r.insert||[]).find(r=>r.id==='dspack-mcp-next').disabled=true;
  await host.writeTextFile(patchFile,JSON.stringify(local));
  const kept=await install('next',true,[overlay]);
  assert.match(kept.items[0].notice,/采用了该客户端的本地配置/);
  assert.equal((await readMcpComposition(host,{home,profileDir,overlayPaths:[overlay]})).servers.find(s=>s.server==='next').enabled,false);
});

test('包内 manager 服务保留客户端配置；不能覆盖其他层的同名服务',async t=>{
  const host=new NodeHost(), home=await host.mkdtemp('mcp-layer-conflict-');
  t.after(()=>host.rm(home,{recursive:true,force:true}));
  const profileDir=host.joinPath(home,'profiles','work'), file=host.joinPath(home,'cordis.patch.yml');
  const inserted=[{insert:[{id:'mcp-manager',name:'@deepseek-ai/dsh-mcp-manager',config:{servers:{existing:{transport:'stdio',command:'node'}}}}]}];
  await host.writeTextFile(file,JSON.stringify(inserted));
  const make=(name,config)=>splitPatch(JSON.stringify([{id:'mcp-manager',config:{servers:{[name]:config}}}]),'home').items[0];
  const options={home,profileDir,profileName:'work',manifest:{manifestVersion:6,type:'profile',profileName:'work'}};
  const plan=(entry,decisions)=>planExtensionInstall(host,{...options,entries:{'mcp.json':encode({items:[entry]})},decisions});
  const conflict=make('existing',{transport:'stdio',command:'deno'});
  assert.equal((await plan(conflict)).items[0].skipped,true);
  await assert.rejects(plan(conflict,{[conflict.key]:'replace'}),/其他来源|另一作用域/);
  const imported=make('oauth',{transport:'streamable-http',url:'https://example.test/mcp',enabled:false,oauth:{credentialKey:'mcp-client/example'},toolLoading:'on-demand'});
  const accepted=await plan(imported);
  await accepted.apply(); await accepted.verifyMcp();
  const raw=await host.readTextFile(host.joinPath(profileDir,'cordis.patch.yml'));
  const row=parse(raw).flatMap(r=>r.insert||[]).find(r=>r.id==='dspack-mcp-oauth');
  assert.equal(row.disabled,true);
  assert.equal(row.config.enabled,undefined);
  assert.equal(row.config.startupTimeoutMs,30000);
  assert.equal(row.config.toolLoading,'on-demand');
  assert.equal(row.config.expandTemplates,true);
  assert.equal(row.config.failOnStartupError,false);
  assert.equal(row.config.oauth.credentialKey,'mcp-client/example');
  assert.deepEqual(row.inject,['credentials']);
  assert.equal(imported.credentialRefs.length,0);
  const external='@deepseek-ai/dsh-unavailable-test-bundle';
  await host.writeTextFile(host.joinPath(profileDir,'package.json'),JSON.stringify({dsh:{profile:{bundles:[external]}}}));
  await accepted.verifyMcp();
  assert.match(accepted.items[0].notice,/实际启动环境核验/);
  await host.writeTextFile(host.joinPath(profileDir,'node_modules',...external.split('/'),'package.json'),JSON.stringify({dsh:{bundle:{patch:'./missing.yml'}}}));
  await assert.rejects(accepted.verifyMcp({allowUnresolved:true}),/无法核验/);
});

test('校验实际凭据优先级、启动目录与最终写入',async t=>{
  const host=new NodeHost(), home=await host.mkdtemp('credential-precedence-');
  t.after(()=>host.rm(home,{recursive:true,force:true}));
  const dir=host.joinPath(home,'profiles','work'), launch=host.joinPath(home,'launch');
  host.cwd=()=>launch;
  const environment=new Map();
  host.env=key=>environment.get(key);
  const ref='EXAMPLE_API_KEY', store=host.joinPath(home,'.credentials.yaml');
  const profileFile=host.joinPath(dir,'cordis.patch.yml');
  const source=splitPatch('- id: llm-pi-ai\n  config:\n    providers:\n      example: {apiKeyEnv: EXAMPLE_API_KEY, baseURL: https://example.test/v1}\n','home').items[0];
  const opts={home,profileName:'work',profileDir:dir,manifest:{type:'profile',manifestVersion:6,profileName:'source'},
    entries:{'provider.json':encode({items:[source]})}};
  await host.writeTextFile(host.joinPath(dir,'.env'),ref+'=profile-only\n');
  assert.deepEqual((await planExtensionInstall(host,opts)).items[0].missingCredentials,[ref]);
  await host.writeTextFile(host.joinPath(launch,'.env'),ref+'=launch-value\n');
  await host.writeTextFile(host.joinPath(home,'.env'),ref+'=home-value\n');
  assert.deepEqual((await planExtensionInstall(host,opts)).items[0].availableCredentials,[ref]);
  const frozen=await planExtensionInstall(host,{...opts,credentialEnvironment:()=>null});
  assert.deepEqual(frozen.items[0].missingCredentials,[ref]);
  const redirect=await planExtensionInstall(host,{...opts,credentials:{[source.key]:{[ref]:'home-value'}}});
  await redirect.apply();
  assert.notEqual(parse(await host.readTextFile(profileFile))[0].config.providers.example.apiKeyEnv,ref);
  await host.rm(profileFile,{force:true});
  environment.set(ref,'environment-value');
  await host.writeCredentialStore(store,'version: 1\nrefs: {EXAMPLE_API_KEY: stored-value}\n');
  const plan=await planExtensionInstall(host,{...opts,credentials:{[source.key]:{[ref]:'environment-value'}}});
  await plan.apply(); await plan.commitCredentials();
  const chosen=parse(await host.readTextFile(profileFile))[0].config.providers.example.apiKeyEnv;
  const values=parse(await host.readTextFile(store)).refs;
  assert.notEqual(chosen,ref);
  assert.equal(values[ref],'stored-value');
  const stored=await planExtensionInstall(host,{...opts,credentialEnvironment:()=>null});
  assert.deepEqual(stored.items[0].availableCredentials,[ref]);
  assert.equal(values[chosen],'environment-value');
  if (process.platform !== 'win32') assert.equal(await host.packFileMode(store),0o600);

  const manager=splitPatch('- id: mcp-manager\n  config:\n    servers:\n      example:\n        command: node\n        env: {KEY: "${credential:EXAMPLE_API_KEY}", OTHER: "${credential:SECOND_REF}"}\n','home').items[0];
  environment.set('SECOND_REF','another-value');
  const mixed=await planExtensionInstall(host,{...opts,entries:{'mcp.json':encode({items:[manager]})},
    credentials:{[manager.key]:{[ref]:'pasted-value'}},confirmedCredentials:{[manager.key]:true}});
  assert.equal(mixed.items[0].skipped,false);
  await mixed.apply(); await mixed.commitCredentials();
  const env=parse(await host.readTextFile(profileFile)).flatMap(row=>row.insert||[]).find(row=>row.id==='dspack-mcp-example').config.env;
  assert.equal(env.OTHER,'${credential:SECOND_REF}');
  const mixedRef=/^\$\{credential:(.+)\}$/.exec(env.KEY)[1];
  assert.notEqual(mixedRef,ref);
  assert.equal(parse(await host.readTextFile(store)).refs[mixedRef],'pasted-value');
});

test('原生模型、pi-ai、管理器和独立 MCP 从两个补丁副本剥离，凭据在最终提交阶段单独保存', async t=>{
  const host = new NodeHost();
  const sandbox = await host.mkdtemp('extensions-test-');
  t.after(()=>host.rm(sandbox,{recursive:true,force:true}));
  const home = host.joinPath(sandbox,'source'), profile = {name:'test',dir:host.joinPath(home,'profiles','test')};
  await host.writeTextFile(host.joinPath(home,'cordis.patch.yml'),native);
  await host.writeTextFile(host.joinPath(profile.dir,'package.json'),'{}');
  const location = {home,profiles:[profile]};
  const choices = await discoverExtensions(host,location);
  assert.equal(choices.providers.length,2); assert.equal(choices.mcp.length,2);
  assert(!JSON.stringify(choices).includes('demo-test-secret'));
  const manifest = {manifestVersion:6,type:'profile',profileName:'test'};
  const entries = {'home/cordis.patch.yml':encode(native),'overrides/cordis.patch.yml':encode('')};
  await collectExtensions(host,{...location,manifest,entries,selection:{
    providers:choices.providers.map(i=>i.key),mcp:choices.mcp.map(i=>i.key),
  }});
  validateExtensions(manifest,entries);
  assert(!Object.values(entries).some(v=>decode(v).includes('demo-test-secret')));
  assert(!decode(entries['home/cordis.patch.yml']).includes('https://notes.example'));
  assert(decode(entries['home/cordis.patch.yml']).includes('unrelated-plugin'));
  const real = host.joinPath(sandbox,'target'), target = host.joinPath(real,'profiles','renamed'), st = host.joinPath(sandbox,'stage'), sp = host.joinPath(st,'profiles','renamed');
  const opts = {home:st,profileDir:sp,profileName:'renamed',credentialHome:real,credentialProfileDir:target,manifest,entries,staging:true};
  await host.writeTextFile(host.joinPath(target,'cordis.patch.yml'),'- id: other\n  config: { theme: light }\n');
  const before = await planExtensionInstall(host,opts);
  assert(before.items.every(i=>i.missingCredentials.length));
  const credentials = Object.fromEntries(before.items.flatMap(i=>i.credentialRefs.map(ref=>[ref,'sample-new-value'])));
  const plan = await planExtensionInstall(host,{...opts,credentials});
  await plan.apply();
  const staged = await host.readTextFile(host.joinPath(sp,'cordis.patch.yml'));
  assert(!staged.includes('sample-new-value'));
  const rows = parse(staged);
  const imported = rows.flatMap(row=>row.insert||[]).find(row=>row.id==='dspack-mcp-notes');
  assert.equal(imported.config.url,'https://notes.example/mcp');
  assert(/^Bearer \$\{credential:/.test(imported.config.headers.Authorization));
  assert.equal(rows.find(r=>r.insert)?.insert[0].config.expandTemplates,true);
  assert.equal(rows.find(r=>r.id==='llm-deepseek').config.apiKeyEnv,'NATIVE_KEY');
  assert.equal(await host.stat(host.joinPath(st,'.credentials.yaml')),null);
  await host.writeTextFile(host.joinPath(target,'cordis.patch.yml'),staged);
  await plan.commitCredentials();
  const store = parse(await host.readTextFile(host.joinPath(real,'.credentials.yaml')));
  assert.deepEqual(store.refs,credentials);
  const keep = await planExtensionInstall(host,{...opts,credentials:{}});
  assert(keep.items.every(i=>i.availableCredentials.length && i.missingCredentials.length));
  await keep.apply();
  assert((await host.readTextFile(host.joinPath(sp,'cordis.patch.yml'))).includes('NATIVE_KEY'));
});

test('路径声明经 <profile> 重定位并单独校验，未选择的文件从 overrides 删除', async t=>{
  const host=new NodeHost(), home=await host.mkdtemp('extensions-path-');
  t.after(()=>host.rm(home,{recursive:true,force:true}));
  const profile={name:'original',dir:host.joinPath(home,'profiles','original')}, location={home,profiles:[profile]};
  await host.writeTextFile(host.joinPath(profile.dir,'package.json'),JSON.stringify({dependencies:{'@pack/demo':'1.0.0'}}));
  await host.writeTextFile(host.joinPath(profile.dir,'node_modules','@pack','demo','dsh_pack','paths.json'),
    JSON.stringify({name:{zh:'工具数据'},paths:['./profiles/<profile>/tool-data']}));
  await host.writeTextFile(host.joinPath(profile.dir,'tool-data','a.txt'),'one');
  const manifest={manifestVersion:6,type:'profile',profileName:'original'};
  const entries={'overrides/tool-data/a.txt':encode('one')};
  const choices=await discoverExtensions(host,location);
  await collectExtensions(host,{...location,manifest,entries,selection:{}});
  assert.deepEqual(Object.keys(entries),[]);
  await collectExtensions(host,{...location,manifest,entries,selection:{paths:choices.paths.map(i=>i.key)}});
  validateExtensions(manifest,entries);
  const target=host.joinPath(home,'profiles','target');
  const plan=await planExtensionInstall(host,{home,profileName:'target',profileDir:target,manifest,entries});
  await plan.apply();
  assert.equal(await host.readTextFile(host.joinPath(target,'tool-data','a.txt')),'one');
  const corrupt=JSON.parse(decode(entries['path.json']));
  corrupt.plugins['@pack/demo'][0].files[0].tail='../no';
  assert.throws(()=>validateExtensions(manifest,{...entries,'path.json':encode(corrupt)}));
});

test('拒绝携带凭据或相对目录逃逸的远程技能声明',()=>{
  assert.throws(()=>checkSkillSource({mode:'track',ref:'main',repository:'https://u:pw@example.test/s'}));
  assert.throws(()=>checkSkillSource({mode:'track',ref:'main',repository:'https://example.test/s',subdir:'../x'}));
  assert.throws(()=>checkSkillSource({mode:'fixed',ref:'main',repository:'https://example.test/s'}));
});

test('修改一个 MCP manager 配置保留其他服务与其他行',()=>{
  const raw='- id: mcp\n  config:\n    servers:\n      local: {command: node, transport: stdio}\n      other: {command: deno, transport: stdio}\n';
  const item=splitPatch(raw,'home').items.find(i=>i.id==='local');
  const result=mergePatch(raw,item,{...item.value,config:{serverName:'local',command:'bun',transport:'stdio'}});
  const servers=parse(result)[0].config.servers;
  assert.equal(servers.other.command,'deno');assert.equal(servers.local.command,'bun');
});

test('固定技能按 SHA 安装，跟踪技能解析新提交，修改过的本地内容只能内嵌', async t=>{
  const {execFileSync} = await import('node:child_process');
  const host = new NodeHost(), root=await host.mkdtemp('extensions-git-');
  t.after(()=>host.rm(root,{recursive:true,force:true}));
  const repo=host.joinPath(root,'origin'), home=host.joinPath(root,'source');
  const url='https://fixture.invalid/example/skills.git';
  const git=(args,cwd=repo)=>execFileSync('git',args,{cwd,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();
  await host.mkdir(repo);
  git(['init','-q','-b','main']);
  const gitPath=host.joinPath(repo,'documentation','demo','SKILL.md');
  const scriptPath='documentation/demo/scripts/run.sh';
  await host.writeTextFile(host.joinPath(repo,scriptPath),'#!/bin/sh\nexit 0\n');
  async function commit(body, executable=true) {
    await host.writeTextFile(gitPath,body);
    git(['add','--','documentation']);
    git(['update-index',executable ? '--chmod=+x' : '--chmod=-x','--',scriptPath]);
    git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','commit','-q','-m','test: 更新技能样例']);
    return git(['rev-parse','HEAD']);
  }
  const old=await commit('# one\n');
  // 使用真实 Git 对象与引用，仅将测试 URL 映射至本机临时仓库。
  host.git=async(args,{cwd})=>{
    return {status:0,stdout:git(args.map(a=>a===url ? repo : a),cwd)};
  };
  const profile={name:'source',dir:host.joinPath(home,'profiles','source')};
  await host.writeTextFile(host.joinPath(profile.dir,'package.json'),'{}');
  const manifest={manifestVersion:6,type:'profile',profileName:'source'};
  const key='skill:home:demo';
  const select=(mode,ref)=>({skills:[{key,id:'demo',mode,ref,repository:url,subdir:'documentation/demo',name:{zh:'示例',en:'Demo'}}]});
  const entries={};
  await collectExtensions(host,{home,profiles:[profile],manifest,entries,selection:select('fixed',old)});
  validateExtensions(manifest,entries);
  const target=host.joinPath(root,'target');
  const options={home:target,profileName:'renamed',manifest,entries};
  const fixed=await planExtensionInstall(host,options);
  await fixed.apply();
  const installedScript=host.joinPath(target,'skills','demo','scripts','run.sh');
  assert.deepEqual(fixed.executablePaths,['skills/demo/scripts/run.sh']);
  if (process.platform !== 'win32') assert.equal(await host.packFileMode(installedScript),0o755);
  assert.equal(await host.readTextFile(host.joinPath(target,'skills','demo','SKILL.md')),'# one\n');
  const tracked={};
  await collectExtensions(host,{home,profiles:[profile],manifest,entries:tracked,selection:select('track','main')});
  const latest=await commit('# two\n',false);
  const track=await planExtensionInstall(host,{...options,entries:tracked});
  await track.apply();
  assert.deepEqual(track.executablePaths,[]);
  if (process.platform !== 'win32') assert.equal((await host.packFileMode(installedScript)) & 0o111,0);
  const installed=host.joinPath(target,'skills','demo');
  assert.equal(await host.readTextFile(host.joinPath(installed,'SKILL.md')),'# two\n');
  assert.equal(JSON.parse(await host.readTextFile(host.joinPath(installed,'.dsh-skill.json'))).commit,latest);
  const local=await discoverExtensions(host,{home:target,profiles:[]});
  assert.equal(local.skills[0].source.commit,latest);
  await host.writeTextFile(host.joinPath(installed,'SKILL.md'),'# edited\n');
  await assert.rejects(collectExtensions(host,{home:target,profiles:[],manifest,entries:{},selection:select('track','main')}),/内嵌/);
  const embedded={};
  await collectExtensions(host,{home:target,profiles:[],manifest,entries:embedded,selection:{skills:[{key,mode:'embedded'}]}});
  const archive=JSON.parse(decode(embedded['skill.json']));
  assert.equal(decode(embedded[archive.items[0].files.find(f=>f.path === 'SKILL.md').entry]),'# edited\n');
});

test('最终选择本机配置时不写密钥，涉及多个目标的同名凭据只授权给填写的条目',async t=>{
  const host=new NodeHost(), home=await host.mkdtemp('extensions-consent-');
  t.after(()=>host.rm(home,{recursive:true,force:true}));
  const manifest={manifestVersion:6,type:'profile',profileName:'work'};
  const raw='- id: llm-pi-ai\n  config:\n    providers:\n      a: {apiKeyEnv: DEMO_SHARED_REF, baseURL: https://one.example/v1}\n      b: {apiKeyEnv: DEMO_SHARED_REF, baseURL: https://two.example/v1}\n';
  const records=splitPatch(raw,'home').items;
  const entries={'provider.json':encode({items:records})};
  const dir=host.joinPath(home,'profiles','work'), opts={home,profileDir:dir,profileName:'work',manifest,entries,staging:true};
  const noConsent=await planExtensionInstall(host,{...opts,credentials:{DEMO_SHARED_REF:'demo-first-value'}});
  assert(noConsent.items.every(i=>i.skipped));
  const credentials={[records[0].key]:{DEMO_SHARED_REF:'demo-first-value'}};
  const plan=await planExtensionInstall(host,{...opts,credentials});
  assert.deepEqual(plan.items.map(i=>i.skipped),[false,true]);
  await plan.apply();
  const dest=host.joinPath(dir,'cordis.patch.yml'), staged=await host.readTextFile(dest);
  await host.writeTextFile(dest,staged.replace('one.example','local.example'));
  await plan.commitCredentials();
  assert.equal(await host.readTextFile(host.joinPath(home,'.credentials.yaml')),null);
  await host.writeTextFile(dest,staged);
  await plan.commitCredentials();
  const refs=parse(await host.readTextFile(host.joinPath(home,'.credentials.yaml'))).refs;
  assert.equal(refs.DEMO_SHARED_REF,undefined);
  assert.deepEqual(Object.values(refs),['demo-first-value']);
  const route=parse(staged)[0].config.providers.a;
  assert.equal(refs[route.apiKeyEnv],'demo-first-value');
});

test('未激活配置档从自己的技能槽导出，整机保留各槽且不重复打包活动链接',async t=>{
  const {symlink} = await import('node:fs/promises');
  const host=new NodeHost(),home=await host.mkdtemp('extensions-slots-');
  t.after(()=>host.rm(home,{recursive:true,force:true}));
  const profiles=[];
  for (const id of ['active','other']) {
    const dir=host.joinPath(home,'profiles',id), slot=host.joinPath(home,'.dsh-pack','skills',id);
    profiles.push({name:id,dir});
    await host.writeTextFile(host.joinPath(dir,'package.json'),'{}');
    await host.writeTextFile(host.joinPath(slot,'notes','SKILL.md'),'# '+id+'\n');
    await host.writeTextFile(host.joinPath(slot,'notes','.dsh-skill.json'),JSON.stringify({repo:'https://example.invalid/'+id+'.git',commit:'b'.repeat(40),ref:'main'}));
  }
  await symlink(host.joinPath(home,'.dsh-pack','skills','active'),host.joinPath(home,'skills'),'junction');
  const inactive={home,profiles:[profiles[1]]};
  const choices=await discoverExtensions(host,inactive);
  assert.deepEqual(choices.skills.map(x=>x.key),['skill:home:notes']);
  assert.equal(choices.skills[0].source.repository,'https://example.invalid/other.git');
  const manifest={manifestVersion:6,type:'profile',profileName:'other'};
  const entries={'home/skills/notes/SKILL.md':encode('# active\n')};
  await collectExtensions(host,{...inactive,manifest,entries,selection:{skills:choices.skills.map(x=>x.key)}});
  const selected=JSON.parse(decode(entries['skill.json'])).items[0];
  assert.equal(decode(entries[selected.files[0].entry]),'# other\n');
  assert(!entries['home/skills/notes/SKILL.md']);
  const whole={manifestVersion:6,type:'dshhome',profiles:{active:{},other:{}}};
  const all=await discoverExtensions(host,{home,profiles,wholeHome:true});
  assert.deepEqual(all.skills.map(s=>s.key),['skill:profile:active:notes','skill:profile:other:notes']);
  const archive={'overrides/skills/notes/SKILL.md':encode('# active\n')};
  await collectExtensions(host,{home,profiles,manifest:whole,entries:archive,selection:{skills:all.skills.map(s=>s.key)}});
  validateExtensions(whole,archive);
  assert(!archive['overrides/skills/notes/SKILL.md']);
  const target=host.joinPath(home,'restored');
  const plan=await planExtensionInstall(host,{home:target,manifest:whole,entries:archive});
  await plan.apply();
  assert.equal(await host.readTextFile(host.joinPath(target,'.dsh-pack','skills','other','notes','SKILL.md')),'# other\n');
});
