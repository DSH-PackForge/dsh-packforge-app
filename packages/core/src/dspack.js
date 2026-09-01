// .dspack 容器（pack-structure v2，见 DSH-PackForge/specs/pack-structure/v2.md）。
// = 8 字节 DSPK 头（"DSPK" + uint32 LE containerVersion=2）+ 标准 ZIP 负载。
import { zipSync, unzipSync } from 'fflate';

export const DSPK_MAGIC = 'DSPK';
export const DSPK_HEADER_SIZE = 8;
/** 容器格式版本（对应 pack-structure v2）。 */
export const DSPK_CONTAINER_VERSION = 2;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** 生成 8 字节头。 */
export function encodeHeader(version = DSPK_CONTAINER_VERSION) {
  const b = new Uint8Array(DSPK_HEADER_SIZE);
  for (let i = 0; i < 4; i++) b[i] = DSPK_MAGIC.charCodeAt(i);
  new DataView(b.buffer).setUint32(4, version, true);
  return b;
}

/** 解析 8 字节头 → { magic, version }；不足 8 字节或非 DSPK 时返回 null。 */
export function decodeHeader(header) {
  if (!header || header.length < DSPK_HEADER_SIZE) return null;
  const b = header.subarray(0, DSPK_HEADER_SIZE);
  const magic = decoder.decode(b.subarray(0, 4));
  const version = new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(4, true);
  return { magic, version };
}

/**
 * 打包：entries 为 { rel: Uint8Array }（rel 用 '/' 分隔）→ 头 + ZIP 全量字节。
 * 整包 sha256 应覆盖「头 + ZIP」全部字节（规范 pack-structure v2 §2.2）。
 */
export function buildDspack(entries) {
  const zip = zipSync(entries);
  const head = encodeHeader();
  const out = new Uint8Array(head.length + zip.length);
  out.set(head, 0);
  out.set(zip, head.length);
  return out;
}

/**
 * 解包：校验头（DSPK + version=2）→ 剥离 8 字节 → 解 ZIP。
 * @returns {{ entries: Record<string, Uint8Array>, version: number }}
 */
export function parseDspack(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < DSPK_HEADER_SIZE) {
    throw new Error('不是有效的 .dspack 文件（长度不足）');
  }
  const info = decodeHeader(bytes);
  if (!info || info.magic !== DSPK_MAGIC) {
    throw new Error('不是 .dspack 文件（缺少 DSPK 头，可能被改后缀或已损坏）');
  }
  if (info.version !== DSPK_CONTAINER_VERSION) {
    throw new Error(`不支持该 .dspack 容器版本：${info.version}（本工具支持 ${DSPK_CONTAINER_VERSION}）`);
  }
  const entries = unzipSync(bytes.subarray(DSPK_HEADER_SIZE));
  return { entries, version: info.version };
}

/** 文本 → UTF-8 字节（不落盘用）。 */
export function encodeText(s) {
  return encoder.encode(s);
}

/** UTF-8 字节 → 文本。 */
export function decodeText(u8) {
  return decoder.decode(u8);
}