// .dspack 容器 = 标准 ZIP（无自定义魔数头，压缩软件可直接打开）。
// 格式识别由根 manifest.json（manifestVersion=4）+ 布局（机器文件在根、用户文件在 overrides/）承担，
// 见 DSH-PackForge/specs/pack-structure/v2.md。
import { zipSync, unzipSync } from 'fflate';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * 打包：entries 为 { rel: Uint8Array }（rel 用 '/' 分隔）→ 标准 ZIP 字节。
 * 整包 sha256 覆盖全部 ZIP 字节。
 */
export function buildDspack(entries) {
  return zipSync(entries);
}

/**
 * 解包：标准 ZIP 字节 → entries。非 ZIP（或空内容）抛错。
 * @returns {{ entries: Record<string, Uint8Array> }}
 */
export function parseDspack(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
    throw new Error('不是有效的 .dspack 文件（空内容）');
  }
  try {
    return { entries: unzipSync(bytes) };
  } catch {
    throw new Error('不是有效的 .dspack 文件（无法按 ZIP 解压）');
  }
}

/** 文本 → UTF-8 字节（不落盘用）。 */
export function encodeText(s) {
  return encoder.encode(s);
}

/** UTF-8 字节 → 文本。 */
export function decodeText(u8) {
  return decoder.decode(u8);
}