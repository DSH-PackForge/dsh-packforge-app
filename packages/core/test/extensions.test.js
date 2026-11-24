import assert from 'node:assert/strict';
import test from 'node:test';
import { parse } from 'yaml';
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
  const manager = rows.find(r=>r.id==='mcp-manager');
  assert.equal(manager.config.servers.notes.url,'https://notes.example/mcp');
  assert(/^Bearer \$\{credential:/.test(manager.config.servers.notes.headers.Authorization));
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
  async function commit(body) {
    await host.writeTextFile(gitPath,body);
    git(['add','--','documentation']);
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
  assert.equal(await host.readTextFile(host.joinPath(target,'skills','demo','SKILL.md')),'# one\n');
  const tracked={};
  await collectExtensions(host,{home,profiles:[profile],manifest,entries:tracked,selection:select('track','main')});
  const latest=await commit('# two\n');
  const track=await planExtensionInstall(host,{...options,entries:tracked});
  await track.apply();
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
  assert.equal(decode(embedded[archive.items[0].files[0].entry]),'# edited\n');
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
