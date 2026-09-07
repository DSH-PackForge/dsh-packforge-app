// DSH host 面 · 命令注册：client 设置面板经 remote.commands 直调，
// 复用 core 的 packProfile / loadWorkspaceConfig / readMarketIndex / scanProfile（与 AI 工具同一份逻辑，不经 CLI）。
//
// 契约（已从 DSH 0.1.2-alpha.5 源码确证）：
//   - host：ctx.commands.register({ name, description, handler })；
//     handler(invocation) → { kind: 'success', text } | { kind: 'error', text }；
//     invocation = { commandId, agent, rawInput, attachments, signal }。
//   - client：ctx.remote.commands.execute(sessionId, '/<name>', []) → RemoteResult。
//   - 命令名须匹配 /^[a-z][a-z0-9_-]*$/。
//
// 导出语义：导出「单个 profile」（type:profile），skill/preset/AGENTS.md/data 通过 packProfile 的
// homeInclude 进 home/ 目录（安装落到 $DSH_HOME 根）——这正是 manifest v5 对 profile 包支持 home 级内容的形态。
import { packProfile, loadWorkspaceConfig, readMarketIndex, scanProfile } from '@dsh-packforge/core';
import { getHost } from './host.js';

/** 安装基线 / 脚手架目录，不列入可导出 profile。 */
const BASELINE_DIRS = new Set(['web', 'headless', 'node_modules', '__temp__']);

/** 可选 rawInput（JSON 或空）→ 导出选项；非法/非对象回退到 {}。 */
function parseOverrides(rawInput) {
  const text = String(rawInput ?? '').trim();
  if (!text) return {};
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

function normPath(p) {
  return String(p).replace(/\\/g, '/').toLowerCase();
}

/** 从启动器 config.json 找当前 home 对应的 instance（尽力而为，找不到返回 null）。 */
async function readLauncherInstance(host, homeDir) {
  const candidates = [];
  const appData = host.env('APPDATA');
  if (appData) candidates.push(host.joinPath(appData, 'in.dsh-plug.dsh-launcher', 'config.json'));
  const xdg = host.env('XDG_CONFIG_HOME') || host.joinPath(host.homedir(), '.config');
  candidates.push(host.joinPath(xdg, 'in.dsh-plug.dsh-launcher', 'config.json'));
  for (const p of candidates) {
    const raw = await host.readTextFile(p);
    if (!raw) continue;
    let cfg;
    try { cfg = JSON.parse(raw); } catch { continue; }
    const home = (cfg.homes ?? []).find((h) => h?.path && normPath(h.path) === normPath(homeDir));
    if (!home) continue;
    const inst = (cfg.instances ?? []).find((i) => i?.home_id === home.id);
    return { cfg, inst };
  }
  return null;
}

/** 当前 home 对应的 last_profile / default_profile。 */
async function detectCurrentProfile(host, homeDir) {
  const found = await readLauncherInstance(host, homeDir);
  return found?.inst?.last_profile || found?.inst?.default_profile || undefined;
}

/** 当前 home 对应的 DSH 版本（instances[].version_id → versions[].version）。 */
async function detectCurrentVersion(host, homeDir) {
  const found = await readLauncherInstance(host, homeDir);
  const ver = (found?.cfg?.versions ?? []).find((v) => v?.id === found?.inst?.version_id);
  return ver?.version;
}

/** 列出当前实例的 profile 目录（排除安装基线），并探测当前 profile。 */
async function listProfiles(host) {
  const envHome = host.env('DSH_HOME');
  if (!envHome) return { profiles: [], current: undefined };
  const homeDir = host.resolvePath(envHome);
  const entries = await host.readdir(host.joinPath(homeDir, 'profiles'));
  const profiles = (entries ?? [])
    .map((e) => e.name)
    .filter((n) => n && !BASELINE_DIRS.has(n) && !n.startsWith('.') && !n.startsWith('_'))
    .sort();
  return { profiles, current: await detectCurrentProfile(host, homeDir) };
}

/** exportContent 布尔开关 → homeInclude（home 级内容精确 rel 路径集合），供 packProfile 打进 home/。 */
function buildHomeInclude(homeFiles, ec) {
  const set = new Set();
  for (const f of homeFiles) {
    const rel = f.rel;
    if (ec.skill && rel.startsWith('skills/')) set.add(rel);
    else if (ec.preset && rel.startsWith('.agent-presets/')) set.add(rel);
    else if (ec.instruction && rel === 'AGENTS.md') set.add(rel);
    else if (ec.data && rel.startsWith('data/')) set.add(rel);
  }
  return set;
}

/** 注册 dspack-profiles / dspack-config / dspack-export / dspack-market；ctx 无 commands 服务时静默跳过。 */
export function registerPackCommands(ctx) {
  const commands = ctx?.get?.('commands') ?? ctx?.commands;
  if (!commands || typeof commands.register !== 'function') return;

  commands.register({
    name: 'dspack-config',
    description: '读取当前 profile 的 .dshpkcfg 导出配置',
    handler: async () => {
      try {
        const host = getHost();
        const envHome = host.env('DSH_HOME');
        if (!envHome) return { kind: 'error', text: '未设置 $DSH_HOME，无法读取配置' };
        const { profiles, current } = await listProfiles(host);
        const profileName = current || profiles[0];
        if (!profileName) return { kind: 'error', text: '当前实例没有可导出的 profile' };
        const profileDir = host.joinPath(host.resolvePath(envHome), 'profiles', profileName);
        const cfg = await loadWorkspaceConfig(host, profileDir);
        return { kind: 'success', text: JSON.stringify(cfg ?? {}) };
      } catch (e) {
        return { kind: 'error', text: `读取配置失败：${e?.message ?? e}` };
      }
    },
  });

  commands.register({
    name: 'dspack-dsh-version',
    description: '识别当前 DSH 版本',
    handler: async () => {
      const host = getHost();
      const envHome = host.env('DSH_HOME');
      if (!envHome) return { kind: 'error', text: '未设置 $DSH_HOME' };
      const ver = await detectCurrentVersion(host, host.resolvePath(envHome));
      if (!ver) return { kind: 'error', text: '无法识别当前 DSH 版本' };
      return { kind: 'success', text: ver };
    },
  });

  commands.register({
    name: 'dspack-save-config',
    description: '保存当前 profile 的 .dshpkcfg 导出配置',
    handler: async (invocation) => {
      try {
        const host = getHost();
        const envHome = host.env('DSH_HOME');
        if (!envHome) return { kind: 'error', text: '未设置 $DSH_HOME，无法保存配置' };
        const { profiles, current } = await listProfiles(host);
        const profileName = current || profiles[0];
        if (!profileName) return { kind: 'error', text: '当前实例没有可导出的 profile' };
        const profileDir = host.joinPath(host.resolvePath(envHome), 'profiles', profileName);
        const config = parseOverrides(invocation?.rawInput);
        await host.writeTextFile(host.joinPath(profileDir, '.dshpkcfg'), JSON.stringify(config, null, 2) + '\n');
        return { kind: 'success', text: `已保存配置（${profileName}/.dshpkcfg）` };
      } catch (e) {
        return { kind: 'error', text: `保存配置失败：${e?.message ?? e}` };
      }
    },
  });

  commands.register({
    name: 'dspack-export',
    description: '导出当前 profile（含勾选的 home 级内容）为 .dspack 整合包',
    handler: async (invocation) => {
      try {
        const host = getHost();
        const envHome = host.env('DSH_HOME');
        if (!envHome) return { kind: 'error', text: '未设置 $DSH_HOME，无法确定当前实例' };
        const homeDir = host.resolvePath(envHome);
        const overrides = parseOverrides(invocation?.rawInput);
        const { profiles, current } = await listProfiles(host);
        const profileName = overrides.profile || current || profiles[0];
        if (!profileName) return { kind: 'error', text: '当前实例没有可导出的 profile' };

        const ec = { skill: true, preset: true, instruction: true, data: true, ...(overrides.exportContent ?? {}) };
        const homeScan = await scanProfile(host, homeDir);
        const homeFiles = homeScan.files.filter((f) => !f.rel.startsWith('profiles/'));
        const homeInclude = buildHomeInclude(homeFiles, ec);

        const opts = { ...overrides, homeInclude };
        delete opts.profile;
        delete opts.exportContent;
        const profile = { name: profileName, dir: host.joinPath(homeDir, 'profiles', profileName) };
        const r = await packProfile(host, profile, opts);
        return { kind: 'success', text: `已导出 ${r.output}（${r.size} 字节，sha256=${r.sha256}）` };
      } catch (e) {
        return { kind: 'error', text: `导出失败：${e?.message ?? e}` };
      }
    },
  });

  commands.register({
    name: 'dspack-market',
    description: '浏览 DSH 整合包市场索引',
    handler: async () => {
      try {
        const host = getHost();
        const r = await readMarketIndex(host);
        if (r.error) return { kind: 'error', text: `市场读取失败：${r.error}` };
        const lines = r.packs.map((p) => `- ${p.displayName || p.name} (${p.version})`).join('\n');
        return { kind: 'success', text: `市场共 ${r.packs.length} 个整合包：\n${lines}` };
      } catch (e) {
        return { kind: 'error', text: `市场读取失败：${e?.message ?? e}` };
      }
    },
  });
}
