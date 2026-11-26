import { test } from 'node:test';
import { buildDspack, parseDspack, encodeText } from '../src/dspack.js';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { parse } from 'yaml';
import { NodeHost } from '@dsh-packforge/host-node';
import { collectPluginMetadata, validatePluginMetadata, validatePluginAssets } from '../src/plugin-metadata.js';
import { applyPluginSources, fetchPluginTarball, installedPluginSource } from '../src/registry.js';
import { buildManifest } from '../src/manifest.js';

const id = '@example/foo';
test('v6 归档必须配容器 v4，旧版标记配对继续可读', () => {
  const pack = (manifestVersion, containerVersion) => buildDspack({
    'manifest.json': encodeText(JSON.stringify({ manifestVersion, type: 'profile', plugins: {} })),
    'dspack.json': encodeText(JSON.stringify({ format:'dspack', version:containerVersion })),
  });
  for (const [manifestVersion,containerVersion] of [[4,2],[5,3],[6,4]]) {
    assert.equal(parseDspack(pack(manifestVersion,containerVersion)).marker.version,containerVersion);
  }
  for (const [manifestVersion,containerVersion] of [[5,4],[6,3],[6,5]]) {
    assert.throws(()=>parseDspack(pack(manifestVersion,containerVersion)),/版本|配套/);
  }
});
const release = '1.2.3';
const source = { type: 'npm', registry: 'https://registry.example/tenant/' };

function archive(name, version) {
  const text = Buffer.from(JSON.stringify({ name, version }));
  const tar = Buffer.alloc(2048);
  tar.write('package/package.json');
  tar.write(text.length.toString(8).padStart(11, '0') + '\0', 124);
  tar.write('0', 156);
  text.copy(tar, 512);
  return gzipSync(tar);
}

function addRegistry(host, bytes, metadata = {}) {
  const requests = [];
  host.download = async (url, dest, { headers, redirectHeaders }) => {
    requests.push({ url, headers, redirectHeaders });
    if (url === source.registry + '@example%2Ffoo/1.2.3') {
      await host.writeTextFile(dest, JSON.stringify({
        name: id, version: release,
        dist: { tarball: 'https://cdn.example/signed', integrity: 'sha512-' + createHash('sha512').update(bytes).digest('base64') },
        ...metadata,
      }));
    } else if (url === 'https://cdn.example/signed') {
      await host.writeFile(dest, bytes);
    } else {
      throw new Error('意外的取件地址');
    }
  };
  return requests;
}

test('专用源按直接依赖的精确版本隔离，保留其他 registry、锁条目和重新导出的坐标', async (t) => {
  const host = new NodeHost();
  const dir = await host.mkdtemp('dspack-test-');
  t.after(() => host.rm(dir, { recursive: true, force: true }));
  host.env = () => null;
  host.homedir = () => dir;
  await host.writeTextFile(host.joinPath(dir, '.npmrc'), '//registry.example/tenant/:_authToken=example\n//cdn.example/:_authToken=other\n');
  const requests = addRegistry(host, archive(id, release));
  const yaml = 'registries:\n  "@example": https://other.example/\noverrides:\n  "@example/foo@^2.0.0": 2.0.1\n';
  await host.writeTextFile(host.joinPath(dir, 'pnpm-workspace.yaml'), yaml);
  await host.writeTextFile(host.joinPath(dir, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\nimporters:\n  .:\n    dependencies:\n      "@example/foo": {specifier: 1.2.3, version: 1.2.3}\n      "@example/bar": {specifier: 1.0.0, version: 1.0.0}\n');
  const unit = { bundles: [id], dependencies: { [id]: release, '@example/bar': '1.0.0' }, plugins: { [id]: { source } } };
  const file = host.joinPath(dir, 'package.json');
  await host.writeTextFile(file, JSON.stringify({ name: 'example', dependencies: unit.dependencies }));
  await applyPluginSources(host, dir, unit);
  const pkg = JSON.parse(await host.readTextFile(file));
  assert.match(pkg.dependencies[id], /^file:\.dspack-sources\/[0-9a-f]{64}\.tgz$/);
  assert.equal(pkg.dependencies['@example/bar'], '1.0.0');
  assert.equal(await host.readTextFile(host.joinPath(dir, 'pnpm-workspace.yaml')), yaml);
  const lock = parse(await host.readTextFile(host.joinPath(dir, 'pnpm-lock.yaml')));
  assert.deepEqual(Object.keys(lock.importers['.'].dependencies), ['@example/bar']);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].headers.Authorization, 'Bearer example');
  assert.deepEqual(await requests[0].redirectHeaders('https://registry.example/tenant/objects/tar'), requests[0].headers);
  assert.deepEqual(await requests[0].redirectHeaders('https://registry.example/another/tar'), {});
  assert.deepEqual(await requests[0].redirectHeaders('https://cdn.example/file'), {});
  assert.deepEqual(requests[1].headers, {});
  const built = await buildManifest(host, { name: 'example', dir });
  assert.equal(built.dependencies[id], release);
  await collectPluginMetadata(host, dir, built, { entries: {} });
  assert.deepEqual(built.plugins[id].source, source);
  pkg.dependencies[id] = '1.2.4';
  assert.equal(installedPluginSource(pkg, id), null);
});

test('拒绝 registry 身份冒用、校验和错误及包内同名不同版本', async (t) => {
  const host = new NodeHost();
  const dir = await host.mkdtemp('dspack-test-');
  t.after(() => host.rm(dir, { recursive: true, force: true }));
  host.env = () => null;
  host.homedir = () => dir;
  for (const [bytes, meta, pattern] of [
    [archive(id, release), { name: '@example/bar' }, /包名或版本/],
    [archive(id, '1.2.4'), {}, /tarball 内的包名或版本/],
    [archive(id, release), { dist: { tarball: 'https://cdn.example/signed', integrity: 'sha512-xxx' } }, /integrity/],
  ]) {
    addRegistry(host, bytes, meta);
    await assert.rejects(fetchPluginTarball(host, id, release, source.registry), pattern);
  }
});

test('静态插件元数据使用所有已导出的 locale，私有图标内嵌且按内容去重', async (t) => {
  const host = new NodeHost();
  const dir = await host.mkdtemp('dspack-test-');
  t.after(() => host.rm(dir, { recursive: true, force: true }));
  const root = host.joinPath(dir, 'node_modules', id);
  const pkg = { name: id, version: release, description: 'fallback', private: true,
    exports: { './locale/*.json': './i18n/*.json', './icon': './icon.png' }, dsh: { bundle: {} } };
  await host.writeTextFile(host.joinPath(dir, 'package.json'), JSON.stringify({ dependencies: { [id]: release } }));
  await host.writeTextFile(host.joinPath(root, 'package.json'), JSON.stringify(pkg));
  await host.writeTextFile(host.joinPath(root, 'i18n', 'zh-CN.json'), '{"meta":{"title":"插件","description":"简介"}}');
  await host.writeTextFile(host.joinPath(root, 'i18n', 'en.json'), '{"meta":{"title":"Example"}}');
  await host.writeFile(host.joinPath(root, 'icon.png'), Uint8Array.of(137, 80, 78, 71));
  const entries = {};
  const unit = { dependencies: { [id]: release }, bundles: [id] };
  await collectPluginMetadata(host, dir, unit, { entries, plugins: { [id]: { version: '0.9.0', source } } });
  const plugin = unit.plugins[id];
  assert.deepEqual({ ...plugin.name }, { en: 'Example', 'zh-CN': '插件' });
  assert.deepEqual({ ...plugin.desc }, { 'zh-CN': '简介' });
  assert.match(plugin.icon, /^assets\/plugins\/[0-9a-f]{64}\.png$/);
  assert.equal(plugin.source, undefined);
  await collectPluginMetadata(host, dir, unit, { entries, plugins: { [id]: { source } } });
  assert.equal(unit.plugins[id].source, undefined);
  assert.doesNotThrow(() => validatePluginAssets(unit, entries));
  assert.throws(() => validatePluginAssets(unit, {}), /图标/);
  assert.ok(validatePluginMetadata({ ...unit, dependencies: { [id]: '^1.0.0' }, plugins: { [id]: { source } } }).length);
  assert.ok(validatePluginMetadata({ ...unit, plugins: { [id]: { source: { type: 'npm', registry: 'https://example:password@registry.example/' } } } }).length);
});

test('无 exports 的包读 locale 目录，普通 pnpm 锁按已装 registry 和 SRI 确认公开图标', async (t) => {
  const host = new NodeHost();
  const dir = await host.mkdtemp('dspack-test-');
  t.after(() => host.rm(dir, { recursive: true, force: true }));
  host.env = () => null;
  host.homedir = () => dir;
  const root = host.joinPath(dir, 'node_modules', id);
  const pkg = { name:id, version:release, icon:'icons/foo.svg', dsh:{bundle:{}} };
  const dep = { [id]: release };
  const put = (p,s) => host.writeTextFile(host.joinPath(dir,...p.split('/')),s);
  await put('package.json',JSON.stringify({dependencies:dep}));
  await host.writeTextFile(host.joinPath(root, 'package.json'),JSON.stringify(pkg));
  await host.writeTextFile(host.joinPath(root, 'locale','zh.json'),'{"meta":{"title":"无导出表的名称","description":"本地简介"}}');
  await host.writeTextFile(host.joinPath(root, 'icons','foo.svg'),'<svg xmlns="http://www.w3.org/2000/svg"/>');
  await put('node_modules/.modules.yaml','registries:\n  default: https://registry.npmjs.org/\n');
  const integrity = 'sha512-' + createHash('sha512').update('fixture').digest('base64');
  await put('pnpm-lock.yaml','packages:\n  "@example/foo@1.2.3":\n    resolution: {integrity: '+integrity+'}\n');
  let requests = 0;
  host.download = async (url, dest) => {
    assert.equal(url,'https://registry.npmjs.org/@example%2Ffoo/1.2.3');
    requests++;
    await host.writeTextFile(dest,JSON.stringify({name:id,version:release,
      dist:{tarball:'https://registry.npmjs.org/@example/foo/-/foo-1.2.3.tgz',integrity}}));
  };
  const unit = {dependencies:dep, bundles:[id]};
  await collectPluginMetadata(host,dir,unit,{entries:{}});
  assert.equal(unit.plugins[id].name.zh,'无导出表的名称');
  assert.equal(unit.plugins[id].desc.zh,'本地简介');
  assert.match(unit.plugins[id].icon,/^https:\/\/cdn\.jsdelivr\.(?:net|com)\/npm\/@example\/foo@1\.2\.3\/icons\/foo\.svg$/);
  assert.equal(requests,1);
  await put('.npmrc','@example:registry=https://private.example/\n');
  await collectPluginMetadata(host,dir,unit,{entries:{}});
  assert.match(unit.plugins[id].icon,/^assets\/plugins\//);
  assert.equal(requests,1);
});

test('读取受信任目标 profile 的鉴权，覆盖用户级而不读取归档展开目录里的凭据', async (t) => {
  const host = new NodeHost();
  const home = await host.mkdtemp('dspack-test-');
  t.after(() => host.rm(home, { recursive: true, force: true }));
  host.env = () => null;
  host.homedir = () => home;
  const target = host.joinPath(home, 'target');
  const stage = host.joinPath(home, 'stage');
  const key = '//registry.example/tenant/:_authToken=';
  for (const [root,token] of [[home,'user-example'],[target,'profile-example'],[stage,'untrusted-example']]) {
    await host.writeTextFile(host.joinPath(root, '.npmrc'), key + token + '\n');
  }
  const requests = addRegistry(host,archive(id,release));
  await host.writeTextFile(host.joinPath(stage, 'package.json'),JSON.stringify({dependencies:{[id]:release}}));
  await applyPluginSources(host,stage,{dependencies:{[id]:release},plugins:{[id]:{source}}},{authDir:target});
  assert.equal(requests[0].headers.Authorization,'Bearer profile-example');
  assert.deepEqual(requests[1].headers,{});
});
