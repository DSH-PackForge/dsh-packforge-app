// Node 宿主：实现 @dsh-packforge/core 的 Host 契约（以 node:fs 等内建能力注入）。
// 供 CLI / Electron / server 使用。
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import { spawn, spawnSync } from 'node:child_process';

export class NodeHost {
  #rootCAs;

  joinPath(...parts) {
    return path.join(...parts);
  }

  resolvePath(...parts) {
    return path.resolve(...parts);
  }

  cwd() {
    return process.cwd();
  }

  homedir() {
    return os.homedir();
  }

  env(name) {
    return process.env[name] ?? null;
  }

  basename(abs) {
    return path.basename(abs);
  }

  async readTextFile(abs) {
    try {
      return await fsp.readFile(abs, 'utf8');
    } catch {
      return null;
    }
  }

  async writeTextFile(abs, text) {
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, text, 'utf8'); // 无 BOM
  }

  async readFile(abs) {
    try {
      return new Uint8Array(await fsp.readFile(abs));
    } catch {
      return null;
    }
  }

  async writeFile(abs, data) {
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, data);
  }

  async stat(abs) {
    try {
      const s = await fsp.stat(abs);
      return {
        size: s.size,
        isFile: s.isFile(),
        isDirectory: s.isDirectory(),
        isSymbolicLink: s.isSymbolicLink(),
      };
    } catch {
      return null;
    }
  }

  async readdir(abs) {
    try {
      const entries = await fsp.readdir(abs, { withFileTypes: true });
      return entries.map((e) => ({
        name: e.name,
        abs: path.join(abs, e.name),
        type: e.isSymbolicLink() ? 'symlink' : e.isDirectory() ? 'dir' : e.isFile() ? 'file' : 'other',
      }));
    } catch {
      return null;
    }
  }

  async mkdir(abs) {
    await fsp.mkdir(abs, { recursive: true });
  }

  async rm(abs, opts = {}) {
    await fsp.rm(abs, { recursive: opts.recursive !== false, force: opts.force !== false });
  }

  async mkdtemp(prefix) {
    return await fsp.mkdtemp(path.join(os.tmpdir(), prefix));
  }

  async sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async sha256File(abs) {
    try {
      return await new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(abs);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
      });
    } catch {
      return null;
    }
  }

  async exec(cmd, args, opts = {}) {
    // 用异步 spawn（而非 spawnSync）：避免在 Electron 主进程同步阻塞导致界面卡死；
    // stdin 置 ignore 防止 pnpm/git 在无人输入时卡在交互提示；可选 timeoutMs 兜底防永久卡住。
    return await new Promise((resolve) => {
      let child;
      try {
        child = spawn(cmd, args, {
          cwd: opts.cwd,
          stdio: ['ignore', 'inherit', 'inherit'],
          shell: process.platform === 'win32',
          windowsHide: true,
        });
      } catch (err) {
        return resolve({ status: null, error: err.message });
      }

      let settled = false;
      let timer = null;
      const finish = (status, error) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        resolve({ status, error });
      };

      if (opts.timeoutMs > 0) {
        timer = setTimeout(() => {
          // 结束整个进程树：Windows 下 shell:true 时 child 是 cmd.exe，需 taskkill /T
          if (child.pid) {
            if (process.platform === 'win32') {
              try { spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true }); } catch { /* 忽略 */ }
            } else {
              try { process.kill(child.pid, 'SIGTERM'); } catch { /* 忽略 */ }
            }
          }
          finish(null, `命令超时（${opts.timeoutMs}ms）：${cmd} ${(args ?? []).join(' ')}`);
        }, opts.timeoutMs);
      }

      child.on('error', (err) => finish(null, err.message));
      child.on('close', (code) => finish(code ?? 0, undefined));
    });
  }

  async download(url, destAbs) {
    try {
      await this.#downloadOnce(url, destAbs, null);
    } catch (e) {
      // Windows 上部分站点（如 github.com）的证书链只认系统根 CA，Node bundled CA 认不到时
      // 自动加载系统根 CA 重试一次（信任系统信任存储，而非禁用校验）。
      if (this.#isCertError(e)) {
        const cas = await this.#systemRootCAs();
        if (cas && cas.length) {
          await this.#downloadOnce(url, destAbs, cas);
          return;
        }
      }
      throw e;
    }
  }

  async #downloadOnce(url, destAbs, extraCa) {
    await new Promise((resolve, reject) => {
      let u;
      try {
        u = new URL(url);
      } catch {
        return reject(new Error(`无效的下载地址：${url}`));
      }
      const lib = u.protocol === 'https:' ? https : u.protocol === 'http:' ? http : null;
      if (!lib) return reject(new Error(`仅支持 http/https：${url}`));
      const options = { headers: { 'user-agent': 'dspack/0.1.0' } };
      if (extraCa) options.ca = extraCa;
      const req = lib.get(url, options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return resolve(this.#downloadOnce(new URL(res.headers.location, u).href, destAbs, extraCa));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`下载失败：HTTP ${res.statusCode}`));
        }
        const out = fs.createWriteStream(destAbs);
        res.pipe(out);
        out.on('finish', () => out.close(() => resolve()));
        out.on('error', reject);
      });
      req.on('error', reject);
      req.setTimeout(30_000, () => req.destroy(new Error('下载超时（30s）')));
    });
  }

  #isCertError(e) {
    const m = String(e?.code ?? '') + ' ' + String(e?.message ?? '');
    return /UNABLE_TO_VERIFY|SELF_SIGNED|CERT_HAS_EXPIRED|UNABLE_TO_GET_ISSUER|verify the first certificate|ERR_TLS_CERT/i.test(m);
  }

  async #systemRootCAs() {
    if (this.#rootCAs !== undefined) return this.#rootCAs;
    this.#rootCAs = null;
    if (process.platform !== 'win32') return this.#rootCAs;
    try {
      const script = "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; Get-ChildItem Cert:\\LocalMachine\\Root, Cert:\\CurrentUser\\Root | ForEach-Object { '-----BEGIN CERTIFICATE-----'; [System.Convert]::ToBase64String($_.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert), 'InsertLineBreaks'); '-----END CERTIFICATE-----' }";
      const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
        encoding: 'utf8', timeout: 15000, windowsHide: true, maxBuffer: 16 * 1024 * 1024,
      });
      const cas = [...String(r.stdout ?? '').matchAll(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g)].map((m) => m[0]);
      if (cas.length) this.#rootCAs = cas;
    } catch {
      this.#rootCAs = null;
    }
    return this.#rootCAs;
  }

  async move(from, to) {
    await fsp.mkdir(path.dirname(to), { recursive: true });
    await fsp.rename(from, to);
  }
}