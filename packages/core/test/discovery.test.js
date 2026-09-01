import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NodeHost } from '@dsh-packforge/host-node';
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