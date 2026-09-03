// 把用户提供的 PNG 图标转成多尺寸 .ico（Windows 程序/文件关联图标）。
// 纯 Node 零依赖：PNG 解码（inflate + 反滤波）→ 双线性缩放 → PNG 重编码 → ICO 组装。
// 输入：icons/app.png（程序图标）、icons/file.png（.dspack 文件图标）
// 输出：packages/gui/build/icon.ico、packages/gui/build/file.ico（256/64/48/32/16）
import { deflateSync, inflateSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ICONS_DIR = path.join(ROOT, 'icons');
const OUT_DIR = path.join(ROOT, 'packages', 'gui', 'build');
const SIZES = [256, 64, 48, 32, 16];

// ---- PNG 解码（8-bit，非隔行；RGBA/RGB/灰度） ----
function decodePng(buf) {
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
    throw new Error('不是合法 PNG');
  }
  let off = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.slice(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(`不支持的位深 ${bitDepth}`);
  if (interlace !== 0) throw new Error('不支持隔行 PNG');

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rgba = Buffer.alloc(width * height * 4);

  const prevLine = Buffer.alloc(stride);
  const line = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const base = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const b = raw[base + x];
      const left = x >= channels ? line[x - channels] : 0;
      const up = prevLine[x];
      const upleft = x >= channels ? prevLine[x - channels] : 0;
      let v;
      switch (filter) {
        case 0: v = b; break;
        case 1: v = b + left; break;
        case 2: v = b + up; break;
        case 3: v = b + ((left + up) >> 1); break;
        case 4: v = b + paeth(left, up, upleft); break;
        default: throw new Error(`未知滤波类型 ${filter}`);
      }
      line[x] = v & 0xff;
    }
    const rowBase = y * width * 4;
    if (channels === 4) {
      line.copy(rgba, rowBase, 0, width * 4);
    } else if (channels === 3) {
      for (let x = 0; x < width; x++) {
        rgba[rowBase + x * 4] = line[x * 3];
        rgba[rowBase + x * 4 + 1] = line[x * 3 + 1];
        rgba[rowBase + x * 4 + 2] = line[x * 3 + 2];
        rgba[rowBase + x * 4 + 3] = 255;
      }
    } else if (channels === 2) {
      for (let x = 0; x < width; x++) {
        rgba[rowBase + x * 4] = line[x * 2];
        rgba[rowBase + x * 4 + 1] = line[x * 2];
        rgba[rowBase + x * 4 + 2] = line[x * 2];
        rgba[rowBase + x * 4 + 3] = line[x * 2 + 1];
      }
    } else {
      for (let x = 0; x < width; x++) {
        rgba[rowBase + x * 4] = line[x];
        rgba[rowBase + x * 4 + 1] = line[x];
        rgba[rowBase + x * 4 + 2] = line[x];
        rgba[rowBase + x * 4 + 3] = 255;
      }
    }
    line.copy(prevLine);
  }
  return { width, height, rgba };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// ---- 双线性缩放 ----
function resize(rgba, sw, sh, dw, dh) {
  const out = Buffer.alloc(dw * dh * 4);
  const sx = sw / dw, sy = sh / dh;
  for (let y = 0; y < dh; y++) {
    const gy = Math.max(0, (y + 0.5) * sy - 0.5);
    const y0 = Math.min(Math.floor(gy), sh - 1);
    const y1 = Math.min(y0 + 1, sh - 1);
    const ty = gy - y0;
    for (let x = 0; x < dw; x++) {
      const gx = Math.max(0, (x + 0.5) * sx - 0.5);
      const x0 = Math.min(Math.floor(gx), sw - 1);
      const x1 = Math.min(x0 + 1, sw - 1);
      const tx = gx - x0;
      const o = (y * dw + x) * 4;
      for (let c = 0; c < 4; c++) {
        const p00 = rgba[(y0 * sw + x0) * 4 + c];
        const p10 = rgba[(y0 * sw + x1) * 4 + c];
        const p01 = rgba[(y1 * sw + x0) * 4 + c];
        const p11 = rgba[(y1 * sw + x1) * 4 + c];
        const v = p00 * (1 - tx) * (1 - ty) + p10 * tx * (1 - ty) + p01 * (1 - tx) * ty + p11 * tx * ty;
        out[o + c] = Math.round(v);
      }
    }
  }
  return out;
}

// ---- PNG 编码 ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(rgba, size) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    raw.set(rgba.subarray(y * size * 4, (y + 1) * size * 4), y * (size * 4 + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---- ICO 组装（PNG 条目，Vista+） ----
function buildIco(pngs) {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const entries = [];
  let offset = 6 + 16 * count;
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e[2] = 0;
    e[3] = 0;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

// ---- 主流程 ----
mkdirSync(OUT_DIR, { recursive: true });
const jobs = [
  { src: 'app.png', out: 'icon.ico' },
  { src: 'file.png', out: 'file.ico' },
];

for (const job of jobs) {
  const srcPath = path.join(ICONS_DIR, job.src);
  if (!existsSync(srcPath)) {
    console.error(`[build-icons] 未找到 ${srcPath}，跳过`);
    continue;
  }
  const { width, height, rgba } = decodePng(readFileSync(srcPath));
  const pngs = SIZES.map((s) => ({ size: s, data: encodePng(resize(rgba, width, height, s, s), s) }));
  const outPath = path.join(OUT_DIR, job.out);
  writeFileSync(outPath, buildIco(pngs));
  console.log(`[build-icons] ${job.src} (${width}x${height}) -> ${job.out} (${SIZES.join('/')})`);
}
