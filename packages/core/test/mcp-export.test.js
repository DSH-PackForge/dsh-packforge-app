import test from 'node:test';
import assert from 'node:assert/strict';
import {stringify} from 'yaml';
import {splitPatch, fillSlots} from '../src/extension-patch.js';
import {validateExtensions} from '../src/extension-validate.js';
import {planExtensionInstall} from '../src/extension-install.js';
import {NodeHost} from '@dsh-packforge/host-node';

const manifest = {manifestVersion:6,type:'profile',profileName:'test'};
const body = config => stringify([{insert:[{id:'example',name:'@deepseek-ai/dsh-mcp-client',config:{serverName:'example',...config}}]}]);
const sidecar = item => ({'mcp.json':new TextEncoder().encode(JSON.stringify({items:[item]}))});

test('stdio 选项与头字段仅导出凭据引用，保留参数名、授权方案和显式引用名',() => {
  const args = ['--api-key=fixture-value','--token','fixture-value','-H','Authorization: Bearer fixture-value',
    '--header=X-Api-Key: fixture-value','-HAuthorization: Basic fixture-value',
    'API_TOKEN=fixture-value','--client-secret=${credential:MY_REF}','--url=https://example.test/mcp?v=1','--verbose'];
  const {items:[item],patch} = splitPatch(body({command:'node',args}),'home');
  assert.equal(item.unsupported,false);
  assert.doesNotMatch(JSON.stringify([item,patch]),/fixture-value/);
  assert.equal(item.credentialRefs.length,7);
  assert.ok(item.credentialRefs.includes('MY_REF'));
  validateExtensions(manifest,sidecar(item));
  const restored = fillSlots(item.value,Object.fromEntries(item.credentialRefs.map(ref=>[ref,'reentered'])));
  assert.deepEqual(restored.config.args,args.map(arg=>arg.replace('fixture-value','reentered').replace('${credential:MY_REF}','reentered')));
});

test('无法表示的脚本、带认证 URL 及签名地址从公开摘要和原始补丁同时剥离', () => {
  for (const config of [
    {command:'pwsh.exe',args:['-Command','Write-Output fixture-value']},
    {command:'bash',args:['-lc','echo fixture-value']},
    {command:'/usr/bin/env',args:['bash','-lc','echo fixture-value']},
    {command:'node',args:['-e','console.log("fixture-value")']},
    {command:'node',args:['--url=https://example.test/mcp?sig=fixture-value']},
    {command:'node',args:['--connection=postgres://account:fixture-value@db.test/mcp']},
    {transport:'streamable-http',url:'https://user:fixture-value@example.test/mcp'},
    {transport:'streamable-http',url:'https://example.test/mcp?opaque=fixture-value'},
  ]) {
    const {items:[item],patch} = splitPatch(body(config),'home');
    assert.equal(item.unsupported,true);
    assert.doesNotMatch(JSON.stringify([item,patch]),/fixture-value/);
    const unmasked = {...item,value:{...item.value,config:{serverName:'example',...config}}};
    assert.throws(()=>validateExtensions(manifest,sidecar(unmasked)),/MCP/);
  }
});

test('归档校验拒绝明文 stdio 凭据、越界前缀，允许普通命令参数和公开端点',() => {
  const {items:[item]} = splitPatch(body({command:'npx',args:['-y','@sample/example','--port=19000']}),'home');
  validateExtensions(manifest,sidecar(item));
  for (const args of [
    ['--password=fixture-value'], ['-H','Authorization: Bearer fixture-value'],
    [{$credential:'TOKEN',prefix:'--token=fixture-value'}],
  ]) {
    const record = {...item,value:{...item.value,config:{...item.value.config,args}}};
    assert.throws(()=>validateExtensions(manifest,sidecar(record)),/MCP/);
  }
});

test('HOME 与各配置档共享 MCP namespace，独立配置档的同名服务可共存',async t=>{
  const host = new NodeHost(), home = await host.mkdtemp('mcp-namespace-');
  t.after(()=>host.rm(home,{recursive:true,force:true}));
  const whole = {manifestVersion:6,type:'dshhome',profiles:{a:{},b:{}}};
  function row(id,scope) {
    const raw = stringify([{insert:[{id,name:'@deepseek-ai/dsh-mcp-client',config:{serverName:'tools',command:'node'}}]}]);
    return splitPatch(raw,scope).items[0];
  }
  const global = row('common','home'), a = row('local-a','profile:a'), b = row('local-b','profile:b');
  function plan(items,decisions) {
    const entries = {'mcp.json':new TextEncoder().encode(JSON.stringify({items}))};
    return planExtensionInstall(host,{home,manifest:whole,entries,decisions});
  }
  assert.deepEqual((await plan([a,b])).items.map(i=>i.skipped),[false,false]);
  assert.deepEqual((await plan([global,a,b])).items.map(i=>i.skipped),[false,true,true]);
  const chosen = await plan([global,a,b],{[a.key]:'replace'});
  assert.deepEqual(chosen.items.map(i=>i.skipped),[true,false,false]);
  await assert.rejects(plan([global,a],{[global.key]:'replace',[a.key]:'replace'}),/相同名称/);
  await chosen.apply();
  assert.equal(await host.readTextFile(host.joinPath(home,'cordis.patch.yml')),null);
  assert.equal((await plan([global])).items[0].conflict,true);
  await assert.rejects(plan([global],{[global.key]:'replace'}),/另一作用域/);
});
