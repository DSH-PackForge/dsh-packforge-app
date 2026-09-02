import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NodeHost } from '@dsh-packforge/host-node';
import {
  buildHomeManifest, validateManifest, packHome, installPack, parseDspack, decodeText,
} from '../src/index.js';

/** 建一个模拟 $DSH_HOME：两个自定义 profile + web（应排除）+ preset + skill + AGENTS.md + data。 */
async function makeHome(host, root) {
  const home = host.joinPath(root, '.dsh');
  await host.mkdir(host.joinPath(home, 'profiles', 'whale'));
  await host.mkdir(host.joinPath(home, 'profiles', 'minimal'));
  await host.mkdir(host.joinPath(home, 'profiles', 'web'));
  await host.mkdir(host.joinPath(home, '.agent-presets', 'coding'));
  await host.mkdir(host.joinPath(home, 'skills', 'whale-writer'));
  await host.mkdir(host.joinPath(home, 'data'));

  await host.writeTextFile(host.joinPath(home, 'profiles', 'whale', 'package.json'), JSON.stringify({
    name: 'dsh-profile-whale', version: '1.0.0',
    dependencies: { 'dsh-pet': '0.2.0' },
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', 'dsh-pet'] } },
  }));
  await host.writeTextFile(host.joinPath(home, 'profiles', 'whale', 'cordis.patch.yml'), '[]\n');

  await host.writeTextFile(host.joinPath(home, 'profiles', 'minimal', 'package.json'), JSON.stringify({
    name: 'dsh-profile-minimal', dependencies: {}, dsh: { profile: { bundles: ['@deepseek-ai/dsh-base'] } },
  }));

  await host.writeTextFile(host.joinPath(home, 'profiles', 'web', 'package.json'), '{}');

  await host.writeTextFile(host.joinPath(home, '.agent-presets', 'coding', 'agent.cordis.yml'), '- name: foo\n');
  await host.writeTextFile(host.joinPath(home, 'skills', 'whale-writer', 'SKILL.md'), '# hi\n');
  await host.writeTextFile(host.joinPath(home, 'AGENTS.md'), '# global\n');
  await host.writeTextFile(host.joinPath(home, 'data', 'x.txt'), 'x');

  return home;
}

test('validateManifest：v5 dshhome 合法', () => {
  const m = {
    manifestVersion: 5, type: 'dshhome', name: 'whale-studio', version: '1.0.0',
    defaultProfile: 'whale',
    profiles: {
      whale: { bundles: ['@deepseek-ai/dsh-base'], dependencies: { 'dsh-pet': '0.2.0' }, patch: '[]\n' },
    },
    presets: { coding: { path: '.agent-presets/coding' } },
    skills: [{ path: 'skills/whale-writer' }],
    instructions: 'AGENTS.md',
  };
  assert.deepEqual(validateManifest(m), []);
});

test('validateManifest：v5 拒绝安装基线 profile 与非法 defaultProfile', () => {
  const base = {
    manifestVersion: 5, type: 'dshhome', name: 'x', version: '1.0.0',
    defaultProfile: 'whale', profiles: { whale: { bundles: [], dependencies: {} } },
  };
  assert.ok(validateManifest({ ...base, profiles: { web: { bundles: [], dependencies: {} } } })
    .some((e) => e.includes('web')));
  assert.ok(validateManifest({ ...base, defaultProfile: 'nope' })
    .some((e) => e.includes('defaultProfile')));
  assert.ok(validateManifest({ ...base, type: 'collection' })
    .some((e) => e.includes('profile') || e.includes('dshhome')));
  // v5 也支持 type:"profile"（单 profile 形态），应通过
  assert.deepEqual(
    validateManifest({ manifestVersion: 5, type: 'profile', name: 'x', version: '1', bundles: [], dependencies: {} }),
    [],
  );
});

test('validateManifest：v4 profile 仍接受，collection 仍拒绝', () => {
  const v4 = { manifestVersion: 4, type: 'profile', name: 'x', version: '1', bundles: [], dependencies: {} };
  assert.deepEqual(validateManifest(v4), []);
  assert.ok(validateManifest({ ...v4, type: 'collection' }).some((e) => e.includes('profile')));
});

test('packHome：识别四类单元 + 排除 web + dspack.json v3', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-home-');
  try {
    const home = await makeHome(host, root);
    const result = await packHome(host, { name: 'default', dir: home }, { out: host.joinPath(root, 'out'), name: 'whale-studio', defaultProfile: 'whale' });

    const m = result.manifest;
    assert.equal(m.manifestVersion, 5);
    assert.equal(m.type, 'dshhome');
    assert.equal(m.defaultProfile, 'whale');
    assert.deepEqual(Object.keys(m.profiles).sort(), ['minimal', 'whale']); // web 被排除
    assert.deepEqual(Object.keys(m.presets), ['coding']);
    assert.deepEqual(m.skills, [{ path: 'skills/whale-writer' }]);
    assert.equal(m.instructions, 'AGENTS.md');
    assert.deepEqual(m.profiles.whale.bundles, ['@deepseek-ai/dsh-base', 'dsh-pet']);
    assert.equal(m.profiles.whale.dependencies['dsh-pet'], '0.2.0');

    const bytes = await host.readFile(result.output);
    const { entries, marker } = parseDspack(bytes);
    assert.equal(marker.version, 3);
    assert.equal(marker.format, 'dspack');
    assert.ok(entries['manifest.json']);
    assert.ok(entries['overrides/profiles/whale/cordis.patch.yml']);
    assert.ok(entries['overrides/.agent-presets/coding/agent.cordis.yml']);
    assert.ok(entries['overrides/skills/whale-writer/SKILL.md']);
    assert.ok(entries['overrides/AGENTS.md']);
    assert.equal(entries['overrides/profiles/web/package.json'], undefined); // web 不进包
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('installPack：dshhome 安装（noInstall）重建多 profile + home 级资源', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-inst-home-');
  try {
    const home = await makeHome(host, root);
    const packed = await packHome(host, { name: 'default', dir: home }, { name: 'whale-studio', defaultProfile: 'whale', out: host.joinPath(root, 'out2') });
    const p = host.joinPath(root, 'whale-studio-1.0.0.dspack');
    await host.writeFile(p, await host.readFile(packed.output));

    const targetHome = host.joinPath(root, 'installed-home');
    const r = await installPack(host, { source: p, home: targetHome, noInstall: true });

    assert.equal(r.type, 'dshhome');
    assert.deepEqual(r.profiles.sort(), ['minimal', 'whale']);
    assert.equal(r.defaultProfile, 'whale');

    const pkg = JSON.parse(await host.readTextFile(host.joinPath(targetHome, 'profiles', 'whale', 'package.json')));
    assert.equal(pkg.dependencies['dsh-pet'], '0.2.0');
    assert.deepEqual(pkg.dsh.profile.bundles, ['@deepseek-ai/dsh-base', 'dsh-pet']);

    assert.equal(await host.readTextFile(host.joinPath(targetHome, 'profiles', 'whale', 'cordis.patch.yml')), '[]\n');
    assert.equal(await host.readTextFile(host.joinPath(targetHome, 'AGENTS.md')), '# global\n');
    assert.equal(await host.readTextFile(host.joinPath(targetHome, '.agent-presets', 'coding', 'agent.cordis.yml')), '- name: foo\n');
    assert.equal(await host.readTextFile(host.joinPath(targetHome, 'skills', 'whale-writer', 'SKILL.md')), '# hi\n');
    assert.equal(await host.readTextFile(host.joinPath(targetHome, 'data', 'x.txt')), 'x');
    assert.equal(await host.stat(host.joinPath(targetHome, 'profiles', 'web')), null);
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('buildHomeManifest：直接构造 v5（单 profile 也走 buildProfileUnit）', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-bhm-');
  try {
    const dir = host.joinPath(root, 'p');
    await host.mkdir(dir);
    await host.writeTextFile(host.joinPath(dir, 'package.json'), JSON.stringify({
      dependencies: { 'dsh-pet': '0.2.0' }, dsh: { profile: { bundles: ['@deepseek-ai/dsh-base'] } },
    }));
    await host.writeTextFile(host.joinPath(dir, 'cordis.patch.yml'), '[]\n');

    const m = await buildHomeManifest(host, { name: 'home', dir: root }, {
      name: 'ws', defaultProfile: 'p', profiles: [{ name: 'p', dir }],
    });
    assert.equal(m.manifestVersion, 5);
    assert.equal(m.type, 'dshhome');
    assert.equal(m.defaultProfile, 'p');
    assert.deepEqual(m.profiles.p.bundles, ['@deepseek-ai/dsh-base']);
    assert.equal(m.profiles.p.dependencies['dsh-pet'], '0.2.0');
    assert.equal(m.profiles.p.patch, '[]\n');
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});
