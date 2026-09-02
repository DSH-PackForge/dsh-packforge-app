import { parseArgs } from 'node:util';
import { NodeHost } from '@dsh-packforge/host-node';
import {
  discoverProfiles,
  discoverHomes,
  resolveProfileInput,
  listInstalledDshVersions,
  packProfile,
  packHome,
  inspectProfile,
  inspectPack,
  installPack,
  resolvePackSource,
  readMarketIndex,
  fetchMarketPackDetail,
  DEFAULT_MARKET_INDEX,
} from '@dsh-packforge/core';

const VERSION = '0.1.0';

const HELP = `dspack v${VERSION} — DSH 整合包 .dspack 工具（manifest v4 + pack-structure v2）

用法:
  dspack <command> [options]

命令:
  list                列出本机可导出的 Profile（含经典 ~/.dsh 与 DSH 启动器实例）
  homes               列出本机 DSH_HOME 实例（dshhome 导出 / 安装目标）
  pack <profile|dir>  一键导出单个 Profile 为 .dspack 整合包
  pack-home <home>    一键导出整个 DSH_HOME 为 .dspack 整合包（dshhome）
  inspect <profile>   打包前预览（将包含/排除哪些文件、manifest 内容）
  view <source>        查看一个已有的 .dspack（本地路径或 URL）
  install <source>    一键安装 .dspack 整合包（本地路径或 URL）
  market [<index>]    浏览市场索引（列出整合包 / 格式 / 下载源）
  version             显示版本
  help                显示本帮助

pack 选项:
  --name <slug>           整合包标识（默认取 Profile 目录名）
  --display-name <str>    UI 展示名（字符串或多语言 JSON map）
  --version <semver>      版本号（默认 1.0.0 或 package.json 的 version）
  --description <str>     描述（字符串或多语言 JSON map）
  --author <str>          作者
  --icon <rel|url>        图标
  --dsh-version <ver>     精确 DSH 版本（默认取启动器最新已装版本）
  --profile-name <str>    导入时创建的 profile 名
  --out <dir>             输出目录（默认当前目录）
  --force                 覆盖已存在的输出文件

inspect 选项:
  --json                  以 JSON 输出 manifest 预览

view 选项:
  --json                  以 JSON 输出完整查看结果

market 选项:
  --json                  以 JSON 输出市场条目（默认官方远端，可用位置参数或 $env:DSHPACK_MARKET_INDEX 覆盖）
  --detail <name|id>     懒加载某个整合包的完整 manifest + README（来自 packs/<owner>.<repo>/）

install 选项:
  --name <slug>           安装后的 Profile 目录名（默认取 manifest）
  --registry <url>        pnpm 安装依赖时的镜像源
  --profiles-root <path>  安装目标根（默认 ~/.dsh/profiles）
  --home <path>           dshhome 安装目标（默认 ~/.dsh；仅 dshhome 包）
  --sha256 <hex>          从索引带入的完整性校验
  --size <bytes>          从索引带入的大小校验
  --force                 覆盖已存在的同名 Profile
  --no-install            只解包落盘，不执行 pnpm install
  --dry-run               只预览安装计划，不写任何文件
  --timeout <ms>          pnpm install 超时（默认 10 分钟）

示例:
  dspack list
  dspack pack web --display-name "网页开发助手" --out ./dist
  dspack pack "大肥鱼套装" --dsh-version 0.1.1-rc.2
  dspack inspect all-about-whales
  dspack view ./web-1.0.0.dspack
  dspack view https://example.com/web-1.0.0.dspack
  dspack install ./web-1.0.0.dspack
  dspack install https://example.com/web-1.0.0.dspack --registry https://registry.npmmirror.com
  dspack market ./market/index.json
  dspack market --detail all-about-whales
`;

export async function main(argv) {
  const [cmd, ...rest] = argv;
  const host = new NodeHost();
  try {
    switch (cmd) {
      case 'list':
        return await runList(host);
      case 'homes':
        return await runHomes(host);
      case 'pack':
        return await runPack(host, rest);
      case 'pack-home':
        return await runPackHome(host, rest);
      case 'inspect':
        return await runInspect(host, rest);
      case 'view':
        return await runView(host, rest);
      case 'install':
        return await runInstall(host, rest);
      case 'market':
        return await runMarket(host, rest);
      case 'version':
      case '-v':
      case '--version':
        log(`dspack v${VERSION}`);
        return;
      case 'help':
      case '-h':
      case '--help':
      case undefined:
        log(HELP);
        return;
      default:
        error(`未知命令：${cmd}\n`);
        log(HELP);
        process.exitCode = 1;
    }
  } catch (e) {
    error(`✗ ${e.message}`);
    process.exitCode = 1;
  }
}

function parse(options, args) {
  try {
    return parseArgs({ options, allowPositionals: true, args, strict: true });
  } catch (e) {
    throw new Error(`参数错误：${e.message}`);
  }
}

async function runList(host) {
  const { profiles } = await discoverProfiles(host);
  log('已发现 Profile：');
  if (!profiles.length) {
    log('  （无——未在 ~/.dsh 或 DSH 启动器中找到任何 Profile）');
    return;
  }
  for (const p of profiles) {
    const tag = p.source === 'classic' ? '经典' : `启动器·${p.home ?? '?'}`;
    log(`  ${p.name}\t[${tag}]\t${p.dir}`);
  }
}

async function runHomes(host) {
  const homes = await discoverHomes(host);
  log('已发现 DSH_HOME 实例：');
  if (!homes.length) {
    log('  （无——未在 ~/.dsh 或 DSH 启动器中找到任何实例）');
    return;
  }
  for (const h of homes) {
    const tag = h.source === 'classic' ? '经典' : '启动器';
    log(`  ${h.name}\t[${tag}]\t${h.dir}`);
  }
}

async function runPackHome(host, args) {
  const { values, positionals } = parse(
    {
      name: { type: 'string' },
      'display-name': { type: 'string' },
      version: { type: 'string' },
      description: { type: 'string' },
      author: { type: 'string' },
      icon: { type: 'string' },
      'dsh-version': { type: 'string' },
      'default-profile': { type: 'string' },
      out: { type: 'string' },
      force: { type: 'boolean' },
    },
    args,
  );

  const input = positionals[0];
  let home = null;
  if (input) {
    const abs = host.resolvePath(input);
    const st = await host.stat(abs);
    if (st?.isDirectory) {
      home = { name: host.basename(abs), dir: abs };
    } else {
      const homes = await discoverHomes(host);
      home = homes.find((h) => h.name === input) ?? null;
    }
  }
  if (!home) {
    const homes = await discoverHomes(host);
    if (homes.length === 1) home = homes[0];
  }
  if (!home) throw new Error(`找不到 DSH_HOME「${input ?? ''}」。${homesHint(await discoverHomes(host))}`);

  let dshVersion = values['dsh-version'];
  if (!dshVersion) {
    const versions = await listInstalledDshVersions(host);
    dshVersion = versions[0] || '';
  }

  const result = await packHome(host, home, {
    name: values.name,
    displayName: values['display-name'],
    version: values.version,
    description: values.description,
    author: values.author,
    icon: values.icon,
    dshVersion,
    defaultProfile: values['default-profile'],
    out: values.out,
    force: values.force,
  });

  const m = result.manifest;
  log('✓ dshhome 整合包导出完成');
  log(`  Home     : ${home.name} (${home.dir})`);
  log(`  名称     : ${m.name}`);
  log(`  展示名   : ${renderLocale(m.displayName)}`);
  log(`  版本     : ${m.version}`);
  log(`  dsh 版本 : ${m.dshVersion || '（未钉定）'}`);
  log(`  profile  : ${Object.keys(m.profiles).length} 个（默认 ${m.defaultProfile}）`);
  log(`  preset   : ${Object.keys(m.presets ?? {}).length} 个`);
  log(`  skill    : ${(m.skills ?? []).length} 个`);
  log(`  指令     : ${m.instructions}`);
  log(`  包含文件 : ${result.included}（排除 ${result.excluded}）`);
  log(`  输出     : ${result.output} (${formatBytes(result.size)})`);
  log(`  SHA-256  : ${result.sha256}`);
}

function homesHint(homes) {
  return homes.length ? `可用：${homes.map((h) => h.name).join(', ')}\n也可以直接传目录路径。` : '未发现任何 DSH_HOME。';
}

async function runPack(host, args) {
  const { values, positionals } = parse(
    {
      name: { type: 'string' },
      'display-name': { type: 'string' },
      version: { type: 'string' },
      description: { type: 'string' },
      author: { type: 'string' },
      icon: { type: 'string' },
      'dsh-version': { type: 'string' },
      'profile-name': { type: 'string' },
      out: { type: 'string' },
      force: { type: 'boolean' },
    },
    args,
  );

  const profile = await resolveProfileInput(host, positionals[0]);
  if (!profile) throw new Error(`找不到 Profile「${positionals[0] ?? ''}」。${profileHint(await discoverProfiles(host))}`);

  let dshVersion = values['dsh-version'];
  if (!dshVersion) {
    const versions = await listInstalledDshVersions(host);
    dshVersion = versions[0] || '';
  }

  const result = await packProfile(host, profile, {
    name: values.name,
    displayName: values['display-name'],
    version: values.version,
    description: values.description,
    author: values.author,
    icon: values.icon,
    dshVersion,
    profileName: values['profile-name'],
    out: values.out,
    force: values.force,
  });

  const m = result.manifest;
  log('✓ 整合包导出完成');
  log(`  Profile  : ${profile.name} (${profile.dir})`);
  log(`  名称     : ${m.name}`);
  log(`  展示名   : ${renderLocale(m.displayName)}`);
  log(`  版本     : ${m.version}`);
  log(`  dsh 版本 : ${m.dshVersion || '（未钉定）'}`);
  log(`  层栈     : ${m.bundles.length} 个 bundle`);
  log(`  依赖     : ${Object.keys(m.dependencies ?? {}).length} 个`);
  log(`  包含文件 : ${result.included}（排除 ${result.excluded}）`);
  log(`  输出     : ${result.output} (${formatBytes(result.size)})`);
  log(`  SHA-256  : ${result.sha256}`);
}

async function runInspect(host, args) {
  const { values, positionals } = parse({ json: { type: 'boolean' } }, args);
  const profile = await resolveProfileInput(host, positionals[0]);
  if (!profile) throw new Error(`找不到 Profile「${positionals[0] ?? ''}」。${profileHint(await discoverProfiles(host))}`);

  const { files, excluded, manifest, special } = await inspectProfile(host, profile);

  if (values.json) {
    log(JSON.stringify({ profile: profile.dir, manifest, files, excluded, special }, null, 2));
    return;
  }

  log(`Profile : ${profile.name} (${profile.dir})`);
  log(`包含 ${files.length} 个文件，排除 ${excluded.length} 项\n`);
  const sp = special ?? {};
  if (sp.skills?.length) log(`Skill      : ${sp.skills.length} 个（${sp.skills.map((s) => s.name).join(', ')}）`);
  if (sp.agentPresets?.length) log(`Agent 预设 : ${sp.agentPresets.length} 个（${sp.agentPresets.map((a) => a.id).join(', ')}）`);
  if (sp.icons?.length) log(`图标       : ${sp.icons.join(', ')}`);
  if (sp.skills?.length || sp.agentPresets?.length || sp.icons?.length) log('');
  if (files.length) {
    log('将打包的文件:');
    for (const f of files) log(`  ${f.rel}  (${formatBytes(f.size)})`);
  }
  if (excluded.length) {
    log('\n已排除（敏感/生成/符号链接）:');
    for (const e of excluded) log(`  ${e.rel}  [${e.reason}]`);
  }
  log('\nmanifest.json 预览:');
  log(JSON.stringify(manifest, null, 2));
}

function profileHint({ profiles }) {
  return profiles.length ? `可用：${profiles.map((p) => p.name).join(', ')}\n也可以直接传目录路径。` : '未发现任何 Profile。';
}

async function runView(host, args) {
  const { values, positionals } = parse({ json: { type: 'boolean' } }, args);
  const source = positionals[0];
  if (!source) throw new Error('请指定要查看的 .dspack（本地路径或 URL）');

  const { path, tempDir } = await resolvePackSource(host, source);
  let r;
  try {
    r = await inspectPack(host, path);
  } finally {
    if (tempDir) await host.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
  if (values.json) {
    log(JSON.stringify(r, null, 2));
    return;
  }

  log(`整合包 : ${source}`);
  log(`容器   : 标准 ZIP  [${formatBytes(r.size)}]  sha256=${short(r.sha256)}`);
  log(`校验   : ${r.valid ? '合法 ✓' : '非法 ✗'}`);
  if (!r.valid) for (const err of r.validation) log(`         ✗ ${err}`);

  const m = r.manifest;
  if (m) {
    log('\nmanifest:');
    log(`  名称     : ${m.name}@${m.version}`);
    log(`  展示名   : ${renderLocale(m.displayName)}`);
    log(`  dsh 版本 : ${m.dshVersion || '（未钉定）'}`);
    log(`  类型     : ${m.type}`);
    log(`  层栈     : ${m.bundles.length} 个 bundle`);
    log(`  依赖     : ${Object.keys(m.dependencies ?? {}).length} 个`);
    log(`  重内容   : ${(m.files ?? []).length} 个 files[] 条目`);
  }
  if (r.machine.length) {
    log('\n根机器文件:');
    for (const e of r.machine) log(`  ${e.path}  (${formatBytes(e.size)})`);
  }
  if (r.overrides.length) {
    log(`\noverrides/ (${r.overrides.length} 个):`);
    for (const e of r.overrides) log(`  ${e.path}  (${formatBytes(e.size)})`);
  }
  if (r.other.length) {
    log('\n其它根条目:');
    for (const e of r.other) log(`  ${e.path}  (${formatBytes(e.size)})`);
  }
}

async function runMarket(host, args) {
  const { values, positionals } = parse(
    { json: { type: 'boolean' }, detail: { type: 'string' } },
    args,
  );
  const indexPath = positionals[0] || host.env('DSHPACK_MARKET_INDEX') || DEFAULT_MARKET_INDEX;

  const { packs } = await readMarketIndex(host, indexPath);

  // market --detail <name|id>：懒加载完整 manifest + README 并打印
  if (values.detail) {
    const target = String(values.detail);
    const p = packs.find((x) => x.name === target || x.id === target);
    if (!p) return error(`市场索引中未找到「${target}」`);
    log(`懒加载详情：${p.name}  (${p.id || '无 id'})`);
    const { manifest, readme } = await fetchMarketPackDetail(host, indexPath, p);
    if (!manifest) {
      log('  （完整 manifest 拉取失败，以下为索引摘要）');
      log(`  展示名 : ${p.displayName}`);
      log(`  版本   : ${p.version}  (manifest v${p.manifestVersion})`);
      log(`  下载   : ${p.downloadUrl}`);
      return;
    }
    log(`  展示名 : ${renderLocale(manifest.displayName) || p.displayName}`);
    log(`  类型   : ${manifest.type || 'profile'}`);
    log(`  版本   : ${manifest.version}  (manifest v${manifest.manifestVersion ?? p.manifestVersion})`);
    log(`  dsh    : ${manifest.dshVersion || '（未钉定）'}`);
    if (manifest.type === 'dshhome') {
      const names = Object.keys(manifest.profiles ?? {});
      log(`  profile: ${names.length} 个${manifest.defaultProfile ? `（默认 ${manifest.defaultProfile}）` : ''}`);
      for (const n of names) {
        const u = manifest.profiles[n] || {};
        log(`    - ${n}: ${(u.bundles ?? []).length} bundles / ${Object.keys(u.dependencies ?? {}).length} deps`);
      }
      if (Object.keys(manifest.presets ?? {}).length) log(`  presets: ${Object.keys(manifest.presets).join(', ')}`);
      if ((manifest.skills ?? []).length) log(`  skills : ${manifest.skills.map((s) => s.path ?? s).join(', ')}`);
      if (manifest.instructions) log(`  指令   : ${manifest.instructions}`);
    } else {
      log(`  层栈   : ${(manifest.bundles ?? []).join(', ') || '（无）'}`);
      log(`  依赖   : ${Object.keys(manifest.dependencies ?? {}).join(', ') || '（无）'}`);
      log(`  重内容 : ${(manifest.files ?? []).length} 个 files[] 条目`);
    }
    if (readme) log(`  README : ${readme.split('\n').length} 行（已拉取）`);
    return;
  }

  if (values.json) {
    log(JSON.stringify({ packs }, null, 2));
    return;
  }

  log(`市场共 ${packs.length} 个整合包：`);
  for (const p of packs) {
    const fmt = p.format === 'dspack' ? '.dspack v4' : p.format === 'tgz' ? '.tgz（旧 v3）' : '未知格式';
    log(`  ${p.displayName || p.name}  [${fmt}]  ${p.name}@${p.version}  dsh ${p.dshVersion || '?'}`);
    if (p.description) log(`    ${p.description}`);
    if (p.downloadUrl) log(`    下载  ${p.downloadUrl}${p.sha256 ? `  (sha256 ${short(p.sha256)})` : ''}`);
  }
}

async function runInstall(host, args) {
  const { values, positionals } = parse(
    {
      name: { type: 'string' },
      registry: { type: 'string' },
      'profiles-root': { type: 'string' },
      home: { type: 'string' },
      sha256: { type: 'string' },
      size: { type: 'string' },
      force: { type: 'boolean' },
      'no-install': { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      timeout: { type: 'string' },
    },
    args,
  );

  const expectedSize = values.size != null && values.size !== '' ? Number(values.size) : undefined;
  if (expectedSize !== undefined && !Number.isFinite(expectedSize)) {
    throw new Error(`--size 必须是整数：${values.size}`);
  }
  const timeoutMs = values.timeout != null && values.timeout !== '' ? Number(values.timeout) : undefined;
  if (timeoutMs !== undefined && (!Number.isFinite(timeoutMs) || timeoutMs <= 0)) {
    throw new Error(`--timeout 必须是正整数（毫秒）：${values.timeout}`);
  }

  const result = await installPack(host, {
    source: positionals[0],
    profilesRoot: values['profiles-root'],
    home: values.home,
    name: values.name,
    registry: values.registry,
    force: values.force,
    noInstall: values['no-install'],
    dryRun: values['dry-run'],
    expectedSha256: values.sha256,
    expectedSize,
    timeoutMs,
  });

  if (result.dryRun) {
    log('（预览，未写任何文件）');
    if (result.type === 'dshhome') {
      log(`  DSH_HOME: ${result.dir}`);
      log(`  profile : ${result.profiles.join(', ')}（默认 ${result.defaultProfile}）`);
    } else {
      log(`  Profile : ${result.profileName}`);
      log(`  目标    : ${result.dir}`);
    }
    log(`  名称    : ${result.manifest.name}@${result.manifest.version}`);
    log(`  dsh     : ${result.manifest.dshVersion || '未钉定'}`);
    if (result.exists) log(`  已存在  : 是（真实安装需 --force 覆盖）`);
    return;
  }

  log('✓ 整合包安装完成');
  if (result.type === 'dshhome') {
    log(`  DSH_HOME  : ${result.dir}`);
    log(`  profile   : ${result.profiles.join(', ')}（默认 ${result.defaultProfile}）`);
  } else {
    log(`  Profile   : ${result.profileName} (${result.dir})`);
  }
  log(`  依赖重建 : ${result.installed ? 'pnpm install ✔' : '已跳过（--no-install）'}`);
  if (result.reconcile) {
    const r = result.reconcile;
    log(`  对账     : ${r.missing.length ? '缺失 ' + r.missing.join(', ') : '通过'}` + (r.added.length ? `（自动补进 ${r.added.join(', ')}）` : ''));
  }
  log(`  重内容   : 下载 ${result.filesDownloaded} 个文件`);
}

function renderLocale(v) {
  return typeof v === 'string' ? v : JSON.stringify(v);
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function short(hex) {
  return hex ? `${hex.slice(0, 12)}…` : '';
}

const log = (...a) => console.log(...a);
const error = (...a) => console.error(...a);