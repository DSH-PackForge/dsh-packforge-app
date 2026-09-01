// DSH 客户端插件入口（cordis 风格：Web 壳构造模块系统后，对每个条目调用 factory(require)，
// 取得 cordis 插件对象并激活其 apply(ctx)）。
//
// 真实契约（已从 DSH 0.1.0-rc.8 源码检出确证）：
//   - 插件 = cordis 插件：导出 { name?, inject?, apply(ctx) }；
//     客户端半边经 `window.__DSH_BOOT__`（WebBootGraph）＋ `window.__ModuleLoader__.load({id, factory})` 装载。
//   - `ctx.modules`  = ClientModuleLoader（模块系统，client 包注入）。
//   - `ctx.fs`      = FileSystem（@deepseek-ai/dsh-fs），**面向模型的文本型沙箱 FS**：
//         resolve(path)→FsTarget / processPath / stat / lstat / readText / readBytes / listDir / writeText / editText。
//         ⚠ 没有二进制写（无 writeBytes）、没有 mkdir / rm / move / 递归复制。
//   - `ctx.shell`   = ShellExecutor（@deepseek-ai/dsh-shell）：resolve(request)→spec、run(spec)→{exitCode, stdout, stderr}。
//
// 结论（决定 M4 架构）：
//   `.dspack` 打包/安装是「二进制 zip 读写 + 递归建目录 + 整目录回滚 + 跑 pnpm」，
//   `ctx.fs` 只能读字节、写文本、列目录，**无法独立承载** → 完整工作流走 `ctx.shell` 运行 `dspack` CLI；
//   `ctx.fs.readBytes + WebCrypto sha256` 只用于「把用户交给 UI 的 .dspack 字节流在浏览器内就地查看」。
import { createDshPluginHost, isDshBridgeSupported } from '@dsh-packforge/host-dsh-plugin';
import * as core from '@dsh-packforge/core';
import { registerSettingsSection } from './settings.js';

export const name = 'dsh-packforge';

export { core, createDshPluginHost, isDshBridgeSupported };

// 就地查看一个 .dspack 的字节流（浏览器内，无 node:fs）。保留给 UI 层：选文件/拖入 → bytes → 这里。
export const viewPackBytes = (bytes) => core.inspectPack({ readFile: async () => bytes, sha256: sha256Bytes }, bytes);

// 读 .dspack 的字节上限（ctx.fs.readBytes 必须显式传 maxBytes，防止无界缓冲）。
const DSPACK_READ_CAP = 512 * 1024 * 1024;

/**
 * 把 DSH 客户端插件 Context 适配成 DshBridge（见 host-dsh-plugin 的契约）。
 * 逐项忠实映射真实服务；`ctx.fs` 不提供的操作显式抛错（并指明应改走 ctx.shell 委派 CLI）。
 * 无 `ctx.fs` 时返回 null（插件静默停摆，不影响 DSH 本体）。
 */
export function dshBridgeFromContext(ctx) {
  const fs = firstDefined(ctx?.fs, ctx?.dsh?.fs);        // FileSystem 服务（真实 Context key: `fs`）
  const shell = firstDefined(ctx?.shell, ctx?.dsh?.shell); // ShellExecutor 服务（真实 Context key: `shell`）
  if (!fs) return null;

  const bridge = {
    // —— 路径工具：FileSystem 是 target 型，不提供字符串 join/resolve，用 POSIX 纯字符串兜底 ——
    join: (...parts) => parts.filter(Boolean).map((x) => String(x).replace(/\\/g, '/')).join('/').replace(/\/+/g, '/'),
    resolve: (...parts) => '/' + parts.filter(Boolean).map((x) => String(x).replace(/\\/g, '/')).join('/').replace(/\/+/g, '/'),
    basename: (p) => String(p).replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? '',
    homedir: () => '~',
    env: () => null,

    // —— ctx.fs 能承载的能力 ——
    readTextFile: (p) => fs.resolve(p).then((t) => fs.readText(t)),
    readFile: (p) => fs.resolve(p).then((t) => fs.readBytes(t, undefined, DSPACK_READ_CAP)),
    readdir: async (p) => {
      const t = await fs.resolve(p);
      const entries = await fs.listDir(t);
      return entries.map((e) => ({
        name: e.name,
        abs: typeof fs.processPath === 'function' ? fs.processPath(e.target) : e.target?.displayPath ?? e.name,
        type: e.type === 'directory' ? 'dir' : 'file',
      }));
    },
    stat: async (p) => {
      let info = null;
      if (typeof fs.lstat === 'function') info = await fs.lstat(p).catch(() => undefined);
      if (!info) {
        const t = await fs.resolve(p);
        info = (await fs.stat(t).catch(() => undefined)) ?? null;
      }
      if (!info) return null;
      return {
        size: info.size ?? 0,
        isFile: info.type === 'file',
        isDirectory: info.type === 'directory',
        isSymbolicLink: info.type === 'symlink',
      };
    },
    writeTextFile: async (p, txt) => { await fs.writeText(await fs.resolve(p), txt); },

    // —— ctx.fs 明确不提供的能力：显式抛错，提示改走 ctx.shell ——
    writeFile: () => Promise.reject(new Error('ctx.fs 无二进制写（byte/zip 无法落盘）；完整导出/导入请经 ctx.shell 运行 dspack CLI')),
    mkdir: () => Promise.reject(new Error('ctx.fs 无 mkdir；请经 ctx.shell 运行 dspack CLI')),
    rm: () => Promise.reject(new Error('ctx.fs 无 rm；请经 ctx.shell 运行 dspack CLI')),
    move: () => Promise.reject(new Error('ctx.fs 无 move；请经 ctx.shell 运行 dspack CLI')),
    mkdtemp: () => Promise.reject(new Error('ctx.fs 无 mkdtemp；请经 ctx.shell 运行 dspack CLI')),
    download: () => Promise.reject(new Error('DSH 客户端无 download 服务；请经 ctx.shell 运行 dspack CLI')),

    // —— 摘要 / 执行 ——
    sha256: sha256Bytes,
    sha256File: async (p) => { const d = await bridge.readFile(p); return d ? bridge.sha256(d) : null; },
    exec: (cmd, args, opts) => execViaShell(shell, cmd, args, opts),
  };
  return bridge;
}

/**
 * cordis 插件入口。装载后：可用时把 `ctx.fs` 适配成 Host（就地查看字节流），
 * 并给出能力面（哪些操作 ctx.fs 能承载、哪些必须 shell 委派）。
 * 无可用服务时静默停摆，不抛，避免拖垮 DSH 本体。
 */
export async function apply(ctx) {
  const bridge = dshBridgeFromContext(ctx);
  const shell = firstDefined(ctx?.shell, ctx?.dsh?.shell);
  const host = bridge && isDshBridgeSupported(bridge) ? createDshPluginHost(bridge) : null;

  const capabilities = {
    readText: !!bridge,
    readBinary: !!bridge,
    writeText: !!bridge,
    stats: !!bridge,
    listDir: !!bridge,
    binaryWrite: false,  // ctx.fs 无 writeBytes
    mkdir: false,
    rm: false,
    move: false,
    download: false,
    exec: !!shell,
  };

  const api = {
    // 就地查看（浏览器内）：UI 拿到 .dspack 字节流后直接解析，无需落盘。
    viewBytes: viewPackBytes,
    // 完整导出/导入/市场/查看整合包：走 ctx.shell 委派 dspack CLI（真实文件系统 + pnpm + 下载全在 host 侧完成）。
    shell: (argv) => execViaShell(shell, 'dspack', argv),
  };

  const packforge = { host, api, capabilities };

  // 需求 2：设置面板「整合包」section（运行时提供 slots+locale 服务时注册；缺失静默跳过）。
  registerSettingsSection(ctx, packforge);

  if (ctx && typeof ctx.provide === 'function') {
    try { ctx.provide('dsh-packforge', packforge); } catch { /* 形态不匹配则忽略 */ }
  }
  return packforge;
}

// —— 内部 ——

function firstDefined(...vals) {
  return vals.find((v) => v !== undefined && v !== null);
}

/** WebCrypto SHA-256（浏览器端无 node:crypto），hex 输出。 */
export async function sha256Bytes(bytes) {
  const c = globalThis.crypto;
  if (c?.subtle?.digest) {
    const buf = await c.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('无 WebCrypto，无法计算 sha256');
}

/** ctx.shell 适配为 Host.exec：resolve(ShellExecRequest) → run(ShellExecSpec) → {status, stdout, stderr}。 */
async function execViaShell(shell, cmd, args, opts = {}) {
  if (!shell) return { status: null, stdout: '', stderr: '无 ctx.shell 服务' };
  try {
    const command = [cmd, ...(args ?? [])].map(shellQuote).join(' ');
    const spec = await shell.resolve({ command, workdir: opts.cwd, env: opts.env, timeoutMs: opts.timeoutMs });
    const r = await shell.run(spec);
    return {
      status: r?.exitCode ?? r?.code ?? null,
      stdout: r?.stdout ?? r?.output ?? '',
      stderr: r?.stderr ?? r?.error ?? '',
    };
  } catch (e) {
    return { status: 1, stdout: '', stderr: String(e?.message ?? e) };
  }
}

function shellQuote(arg) {
  const s = String(arg);
  if (/^[A-Za-z0-9_./:=+@,\\-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, `'\\''`)}'`;
}