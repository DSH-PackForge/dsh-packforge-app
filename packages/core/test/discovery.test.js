import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NodeHost } from '@dsh-packforge/host-node';
import { findLauncherInstallAnchor } from '../src/discovery.js';
import {
  discoverProfiles,
  listInstalledDshVersions,
  resolveProfileInput,
  compareVersions,
  sortVersionsDesc,
} from '../src/index.js';

test('双路径发现 + 去重 + 精确版本枚举', async () => {
  const host = new NodeHost();
  const root = await host.mkdtemp('pfx-disc-');
  try {
    const home = host.joinPath(root, 'home');
    const classic = host.joinPath(home, '.dsh', 'profiles');
    const whaleHome = host.joinPath(root, 'homes', 'big-whale');
    const whaleProfiles = host.joinPath(whaleHome, 'profiles');

    for (const n of ['web', 'my-assistant', 'node_modules', '__temp__', '.hidden']) {
      await host.mkdir(host.joinPath(classic, n));
    }
    for (const n of ['big-whale', 'web']) {
      await host.mkdir(host.joinPath(whaleProfiles, n));
    }

    const cfgPath = host.joinPath(root, 'launcher-config.json');
    await host.writeTextFile(
      cfgPath,
      JSON.stringify({
        homes: [
          { id: 'h-default', name: '用户默认 (~/.dsh)', path: host.joinPath(home, '.dsh') },
          { id: 'h-whale', name: '大肥鱼套装', path: whaleHome },
        ],
        versions: [{ version: '0.1.0-rc.8' }, { version: '0.1.1-rc.2' }],
      }),
    );

    const { profiles } = await discoverProfiles(host, { home, launcherConfig: cfgPath });

    const tagged = profiles.map((p) => `${p.name}@${p.source}:${p.home ?? '-'}`);
    assert.ok(tagged.includes('my-assistant@classic:-'));
    assert.ok(tagged.includes('web@classic:-'));
    assert.ok(tagged.includes('big-whale@launcher:大肥鱼套装'));
    assert.ok(tagged.includes('web@launcher:大肥鱼套装'));
    // 默认 home 与经典同目录 → 去重，总数为 4
    assert.equal(profiles.length, 4);
    assert.ok(!profiles.some((p) => ['node_modules', '__temp__', '.hidden'].includes(p.name)));

    // 版本降序（0.1.1-rc.2 高于 0.1.0-rc.8）
    assert.deepEqual(await listInstalledDshVersions(host, { launcherConfig: cfgPath }), ['0.1.1-rc.2', '0.1.0-rc.8']);

    // 手动选择目录
    const custom = await resolveProfileInput(host, classic, { home, launcherConfig: cfgPath });
    assert.equal(custom.source, 'custom');
    assert.equal(custom.name, 'profiles');

    // 名字匹配（经典同名命中）
    const byName = await resolveProfileInput(host, 'my-assistant', { home, launcherConfig: cfgPath });
    assert.equal(byName.dir, host.joinPath(classic, 'my-assistant'));
  } finally {
    await host.rm(root, { recursive: true, force: true }).catch(() => {});
  }
});

test('版本比较', () => {
  assert.ok(compareVersions('0.1.1-rc.2', '0.1.0-rc.8') > 0);
  assert.ok(compareVersions('0.1.0', '0.1.0-rc.8') > 0);
  assert.equal(compareVersions('0.1.1', '0.1.1'), 0);
  assert.deepEqual(sortVersionsDesc(['0.1.0-rc.8', '0.1.1-rc.2', '1.0.0']), ['1.0.0', '0.1.1-rc.2', '0.1.0-rc.8']);
});
test('按启动器已登记的目标与版本定位 MCP 的宿主，遇到多个安装保留待核验状态', async t => {
  const host = new NodeHost();
  const root = await host.mkdtemp('dspack-launcher-anchor-');
  t.after(() => host.rm(root, {recursive: true, force: true}));
  host.env = key => key === 'APPDATA' ? root : undefined;
  const config = host.joinPath(root, 'in.dsh-plug.dsh-launcher', 'config.json');
  const home = host.joinPath(root, 'workspace');
  const versions = ['one', 'two'].map((id, i) => ({id, version: '1.' + i + '.0', dir: host.joinPath(root, id)}));
  const locations = ['node_modules/@deepseek-ai/dsh/package.json', 'apps/cli/package.json'];
  for (const [index, entry] of versions.entries()) {
    await host.writeTextFile(host.joinPath(entry.dir, locations[index]), JSON.stringify({name:'@deepseek-ai/dsh', version:entry.version}));
  }
  const settings = {homes:[{id:'writing', path:home}], instances:[{home_id:'writing', version_id:'one'}], versions};
  const save = () => host.writeTextFile(config, JSON.stringify(settings));
  await save();
  assert.equal(await findLauncherInstallAnchor(host, home), host.joinPath(versions[0].dir, locations[0]));
  settings.instances.push({home_id:'writing',version_id:'two'});
  await save();
  assert.equal(await findLauncherInstallAnchor(host, home), undefined);
  assert.equal(await findLauncherInstallAnchor(host, home, '1.1.0'), host.joinPath(versions[1].dir, locations[1]));
  settings.versions[1].wsl = 'Debian';
  await save();
  assert.equal(await findLauncherInstallAnchor(host, home, '1.1.0'), undefined);
});
