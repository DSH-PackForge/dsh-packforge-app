import assert from 'node:assert/strict';
import test from 'node:test';
import { parse } from 'yaml';
import { planExtensionInstall } from '../src/extensions.js';
import { splitPatch } from '../src/extension-patch.js';
import { NodeHost } from '@dsh-packforge/host-node';
import { readMcpComposition } from '../src/mcp-composition.js';

const manager = '@deepseek-ai/dsh-mcp-manager', client = '@deepseek-ai/dsh-mcp-client';
const config = name => ({servers:{[name]:{transport:'stdio',command:'node'}}});
const addClient = (id,serverName) => ({id,name:client,config:{serverName}});
const entry = (id,name,value) => ({id,name,config:value});
const update = name => [{id:'manager',config:config(name)}];

test('按安装锚点、bundle 文件、profile、HOME 与启动覆盖的顺序组合实际 MCP 命名空间', async t => {
  const host=new NodeHost(), root=await host.mkdtemp('pack-mcp-composition-');
  t.after(()=>host.rm(root,{recursive:true,force:true}));
  const home=host.joinPath(root,'home'), profileDir=host.joinPath(home,'profiles','work');
  const install=host.joinPath(root,'install'), installAnchor=host.joinPath(install,'bin','package.json');
  const write=(file,value)=>host.writeTextFile(file,JSON.stringify(value));
  const pkg=host.joinPath(install,'node_modules','@example','base');
  await write(host.joinPath(pkg,'package.json'),{dsh:{bundle:{patch:['./insert.yml','last.yml']}}});
  await write(host.joinPath(pkg,'insert.yml'),[{insert:[entry('manager',manager,config('old')),addClient('bundled','client_a')]}]);
  await write(host.joinPath(pkg,'last.yml'),update('bundle'));
  await write(host.joinPath(profileDir,'node_modules','@example','base','package.json'),{dsh:{bundle:{patch:[]}}});
  await write(host.joinPath(profileDir,'package.json'),{dsh:{profile:{bundles:['@example/base']}}});
  const options={profileDir,home,installAnchor};
  const keys=result=>result.servers.map(s=>[s.server,s.scope]).sort(([a],[b])=>a.localeCompare(b));
  assert.deepEqual(keys(await readMcpComposition(host, options)),[['bundle','bundle'],['client_a','bundle']]);
  await write(host.joinPath(profileDir,'cordis.patch.yml'),[...update('profile'),{insert:[addClient('added','extra')]}]);
  await write(host.joinPath(home,'cordis.patch.yml'),update('home'));
  const both=await readMcpComposition(host,options);
  assert.deepEqual(keys(both),[['client_a','bundle'],['extra','profile'],['home','home']]);
  assert.deepEqual(both.unresolved,[]);
  const overlay=host.joinPath(root,'overlay.yml');
  await write(overlay,[...update('overlay'),{id:'added',disabled:true}]);
  const result=await readMcpComposition(host,{...options,overlayPaths:[overlay]});
  assert.deepEqual(keys(result),[['client_a','bundle'],['extra','profile'],['overlay','overlay']]);
  assert.equal(result.servers.find(s=>s.server==='extra').enabled,false);
  assert.equal(result.rows.find(r=>r.id==='manager').configScope,'overlay');
});

test('覆盖组配置会卸载旧子行，缺少 bundle、文件及动态标识仅报告来源', async t=>{
  const host=new NodeHost(), root=await host.mkdtemp('pack-mcp-composition-');
  t.after(()=>host.rm(root,{recursive:true,force:true}));
  const group={id:'group',group:true,config:[addClient('old','hidden')]};
  const sets=[{insert:[group]}, {id:'group',config:[addClient('new','visible')]}, {id:'old',config:{serverName:'phantom'}}];
  const basic={profileDir:root,home:root,bundles:[],profilePatch:JSON.stringify(sets),homePatch:null};
  const result=await readMcpComposition(host,basic);
  assert.deepEqual(result.servers.map(s=>s.server),['visible']);
  assert.deepEqual(result.unresolved,[]);
  const regroup=await readMcpComposition(host,{...basic,homePatch:JSON.stringify([{id:'new',config:{serverName:'replacement'}}])});
  assert(regroup.unresolved.some(reason=>reason.includes('重编组')));
  const unresolved=await readMcpComposition(host,{...basic,profilePatch:JSON.stringify([{insert:[addClient('new','base')]}]),
    bundles:['@example/missing'],overlayPaths:[host.joinPath(root,'unknown.yml')],
    homePatch:'- id: new\n  config:\n    serverName: !!js private_expression\n'});
  assert.deepEqual(new Set(unresolved.unresolved),new Set(['@example/missing','overlay','home']));
  assert.equal(unresolved.servers.length,0);
  assert(!JSON.stringify(unresolved).includes('private_expression'));
  const pkg=host.joinPath(root,'node_modules','broken');
  await host.writeTextFile(host.joinPath(pkg,'package.json'),JSON.stringify({dsh:{bundle:{patch:'missing.yml'}}}));
  const broken=await readMcpComposition(host,{...basic,bundles:['broken','absent']});
  assert.deepEqual(broken.missingBundles,['absent']);
  assert.deepEqual(broken.unresolvedBundles,['broken','absent']);
});

test('首次导入管理器服务后实际 Cordis 组合保留原有服务并挂载新增客户端',async t=>{
  const host=new NodeHost(), box=await host.mkdtemp('pack-compose-install-');
  t.after(()=>host.rm(box,{recursive:true,force:true}));
  const bundle=[{insert:[entry('mcp-manager',manager,config('bundle'))]}];
  for (const level of ['bundle','home','overlay']) {
    const home=host.joinPath(box,level), profileDir=host.joinPath(home,'profiles','work');
    const directory=host.joinPath(profileDir,'node_modules','example');
    await host.writeTextFile(host.joinPath(directory,'package.json'),JSON.stringify({dsh:{bundle:{patch:'patch.yml'}}}));
    await host.writeTextFile(host.joinPath(directory,'patch.yml'),JSON.stringify(bundle));
    await host.writeTextFile(host.joinPath(profileDir,'package.json'),JSON.stringify({dsh:{profile:{bundles:['example']}}}));
    const homePatches=level==='home' ? [{id:'mcp-manager',config:config('home')}] : [];
    const overlays=level==='overlay' ? [{id:'mcp-manager',config:config('overlay')}] : [];
    const patch=host.joinPath(home,'cordis.patch.yml');
    await host.writeTextFile(patch,JSON.stringify(homePatches));
    const input=splitPatch(JSON.stringify([{id:'mcp-manager',config:config('extra')}]),'profile:source');
    const manifest={type:'profile',manifestVersion:6,profileName:'source',bundles:['example']};
    const entries={'mcp.json':new TextEncoder().encode(JSON.stringify({items:input.items}))};
    const plan=await planExtensionInstall(host,{home,profileDir,profileName:'work',manifest,entries});
    await plan.apply();
    assert.equal(plan.items[0].skipped,false);
    const profile=await host.readTextFile(host.joinPath(profileDir,'cordis.patch.yml'));
    const result=host.composePackEntries([...bundle,...parse(profile),...homePatches,...overlays]);
    assert.deepEqual(result.find(row=>row.id==='mcp-manager').config.servers,config(level).servers);
    assert.equal(result.filter(row=>row.name===client && row.config.serverName==='extra').length,1);
    assert.equal(await host.readTextFile(patch),JSON.stringify(homePatches));
  }
});
