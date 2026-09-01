// DSH 客户端插件宿主 —— 把 DSH 客户端运行时注入的能力（bridge）适配成 @dsh-packforge/core 的 Host 契约。
//
// 插件运行在 DSH 的 Web GUI 里（浏览器），不能 import node:fs / node:crypto。
// 文件系统、下载、sha256、外部命令，全部由 DSH bridge 提供；这里只做 1:1 适配与兜底：
//   - sha256 回退 WebCrypto（crypto.subtle.digest('SHA-256')）；
//   - sha256File 回退「读整文件 + sha256」；
//   - 路径连接按 bridge 语义（bridge 决定 POSIX 或平台分隔符）。
//
// DshBridge 契约（DSH 客户端插件的 cordis Context 适配后应提供的最小能力）：
//   join(...parts) => string              连接为绝对路径
//   resolve(...parts) => string           解析为绝对路径
//   basename(abs) => string
//   homedir() => string
//   env(name) => string|null（可选）
//   readTextFile(abs) => Promise<string|null>
//   writeTextFile(abs, text) => Promise<void>     自动建父目录
//   readFile(abs) => Promise<Uint8Array|null>
//   writeFile(abs, bytes) => Promise<void>        自动建父目录
//   stat(abs) => Promise<{size,isFile,isDirectory,isSymbolicLink}|null>
//   readdir(abs) => Promise<Array<{name,abs,type}>|null>   type∈file|dir|symlink|other
//   mkdir(abs) => Promise<void>
//   rm(abs, {recursive?,force?}) => Promise<void>
//   move(from, to) => Promise<void>
//   mkdtemp(prefix) => Promise<string>
//   sha256(bytes) => Promise<string>      (64 位十六进制；缺省回退 WebCrypto)
//   sha256File(abs) => Promise<string|null>（可选，缺省读整文件+sha256 兜底）
//   download(url, destAbs) => Promise<void>
//   exec(cmd, args, {cwd}) => Promise<{status,error?}>（可选；浏览器可能不支持）
import { Host } from '@dsh-packforge/core';

/** 判断一个（未适配的）DSH 运行时上下文是否满足最小 bridge 契约（fs + 路径；sha256 可用 bridge 或 WebCrypto 兜底）。 */
export function isDshBridgeSupported(bridge) {
  return !!(
    bridge &&
    typeof bridge.join === 'function' &&
    typeof bridge.readFile === 'function' &&
    typeof bridge.writeFile === 'function'
  );
}

/** 用 DSH bridge 构造 Host。 */
export function createDshPluginHost(bridge) {
  return new DshPluginHost(bridge);
}

export class DshPluginHost extends Host {
  constructor(bridge) {
    super();
    this.bridge = bridge ?? null;
  }

  get supported() {
    return isDshBridgeSupported(this.bridge);
  }

  requireBridge() {
    if (!this.supported) {
      throw new Error('DshPluginHost：未注入 DSH bridge（需提供 join/readFile/writeFile/sha256 等能力）');
    }
    return this.bridge;
  }

  joinPath(...parts) {
    return this.requireBridge().join(...parts);
  }

  resolvePath(...parts) {
    return this.requireBridge().resolve(...parts);
  }

  cwd() {
    const b = this.bridge;
    return (b && typeof b.cwd === 'function' && b.cwd()) || (b && typeof b.homedir === 'function' && b.homedir()) || '/';
  }

  homedir() {
    return this.requireBridge().homedir();
  }

  env(name) {
    const b = this.bridge;
    return (b && typeof b.env === 'function' && b.env(name)) || null;
  }

  basename(abs) {
    return this.requireBridge().basename(abs);
  }

  async readTextFile(abs) {
    return this.requireBridge().readTextFile(abs);
  }

  async writeTextFile(abs, text) {
    await this.requireBridge().writeTextFile(abs, text);
  }

  async readFile(abs) {
    return this.requireBridge().readFile(abs);
  }

  async writeFile(abs, data) {
    await this.requireBridge().writeFile(abs, data);
  }

  async stat(abs) {
    return this.requireBridge().stat(abs);
  }

  async readdir(abs) {
    return this.requireBridge().readdir(abs);
  }

  async mkdir(abs) {
    await this.requireBridge().mkdir(abs);
  }

  async rm(abs, opts) {
    await this.requireBridge().rm(abs, opts);
  }

  async mkdtemp(prefix) {
    return this.requireBridge().mkdtemp(prefix);
  }

  async sha256(data) {
    const b = this.bridge;
    if (b && typeof b.sha256 === 'function') return b.sha256(data);
    // 回退 WebCrypto
    if (typeof globalThis.crypto?.subtle?.digest === 'function') {
      const buf = await globalThis.crypto.subtle.digest('SHA-256', data);
      return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
    }
    throw new Error('DshPluginHost.sha256：bridge 与 WebCrypto 均不可用');
  }

  async sha256File(abs) {
    const b = this.bridge;
    if (b && typeof b.sha256File === 'function') return b.sha256File(abs);
    const data = await this.readFile(abs);
    if (!data) return null;
    return this.sha256(data);
  }

  async exec(cmd, args, opts) {
    const b = this.bridge;
    if (!b || typeof b.exec !== 'function') {
      return { status: null, error: 'DSH 环境不支持外部命令（无 exec bridge）' };
    }
    return b.exec(cmd, args, opts);
  }

  async download(url, destAbs) {
    await this.requireBridge().download(url, destAbs);
  }

  async move(from, to) {
    await this.requireBridge().move(from, to);
  }
}