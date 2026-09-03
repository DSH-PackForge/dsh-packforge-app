// 生成 DSH-PackForge 应用/文件图标（纯 Node，零依赖）。
// 产出：packages/gui/build/icon.ico（256/64/48/32/16，PNG 条目，Vista+ 安全）+ icon.png(256)。
// 占位图标：圆角渐变方块 + 三条「层栈」横条，可后续整体替换 build/icon.ico 而无需改配置。
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'packages', 'gui', 'build');
const SIZES = [256, 64, 48, 32, 16];

// ---- 调色 ----
const TOP = [79, 70, 229];      // indigo #4F46E5
const BOTTOM = [124, 58, 237];  // violet #7C3AED
const BORDER = [37, 30, 122];   // 深 indigo（描边）

function lerp(a, b, t) { return a + (b - a) * t; }

/** 圆角矩形内判断：距中心盒的带圆角距离 <= 0 */
function inRoundRect(x, y, cx, cy, hw, hh, r) {
  const dx = Math.abs(x - cx) - (hw - r);
  const dy = Math.abs(y - cy) - (hh - r);
  const ox = Math.max(dx, 0);
  const oy = Math.max(dy, 0);
  return Math.hypot(ox, oy) <= r && (dx <= 0 || dy <= 0 || Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) <= r);
}

/** 渲染单尺寸 RGBA（参数均按 0..1 归一化，再乘 size，保证各尺寸矢量一致） */
function render(size) {
  const px = new Uint8Array(size * size * 4);
  const M = 0.0625 * size;                 // 外边距
  const R = 0.20 * size;                   // 圆角
  const boxL = M, boxT = M, boxR = size - M, boxB = size - M;
  const cx = size / 2, cy = size / 2;

  // 层栈横条（归一化几何）
  const bars = [
    { y: 0.42, h: 0.16, a: 0.34 },
    { y: 0.60, h: 0.16, a: 0.55 },
    { y: 0.78, h: 0.16, a: 0.78 },
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const fx = x + 0.5, fy = y + 0.5;

      // 背景：圆角渐变方块
      if (!inRoundRect(fx, fy, cx, cy, cx - M, cy - M, R)) { continue; } // 透明

      const t = (fy - boxT) / (boxB - boxT);
      let r = lerp(TOP[0], BOTTOM[0], t);
      let g = lerp(TOP[1], BOTTOM[1], t);
      let b = lerp(TOP[2], BOTTOM[2], t);

      // 描边（贴边缘）
      const edge = Math.min(
        Math.abs(fx - boxL), Math.abs(fx - boxR), Math.abs(fy - boxT), Math.abs(fy - boxB),
      );
      if (edge < Math.max(1, size * 0.015)) {
        r = lerp(r, BORDER[0], 0.5); g = lerp(g, BORDER[1], 0.5); b = lerp(b, BORDER[2], 0.5);
      }

      // 层栈横条（白色，带 alpha）
      for (const bar of bars) {
        const by0 = bar.y * size, by1 = by0 + bar.h * size;
        const bw = 0.56 * size, bx0 = cx - bw / 2, bx1 = cx + bw / 2;
        const br = bar.h * size * 0.5;
        if (fy >= by0 && fy <= by1 && inRoundRect(fx, fy, cx, (by0 + by1) / 2, bw / 2, (by1 - by0) / 2, br)) {
          const a = bar.a;
          r = lerp(r, 255, a); g = lerp(g, 255, a); b = lerp(b, 255, a);
        }
      }

      px[i] = Math.round(r);
      px[i + 1] = Math.round(g);
      px[i + 2] = Math.round(b);
      px[i + 3] = 255;
    }
  }
  return px;
}

// ---- 最小 PNG 编码器 ----
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
  ihdr[9] = 6;   // color type RGBA
  // 每行前加 filter byte 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    raw.set(rgba.subarray(y * size * 4, (y + 1) * size * 4), y * (size * 4 + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** 组装 ICO：ICONDIR + 若干 ICONDIRENTRY + PNG 数据（PNG 条目，Vista+ 支持） */
function buildIco(pngs) {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);   // reserved
  header.writeUInt16LE(1, 2);   // type = icon
  header.writeUInt16LE(count, 4);

  const entries = [];
  let offset = 6 + 16 * count;
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size; // 0 表示 256
    e[1] = size >= 256 ? 0 : size;
    e[2] = 0;   // 调色板色数
    e[3] = 0;   // reserved
    e.writeUInt16LE(1, 4);    // planes
    e.writeUInt16LE(32, 6);   // bpp
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

// ---- 主流程 ----
mkdirSync(OUT_DIR, { recursive: true });

const pngs = [];
for (const size of SIZES) {
  const data = encodePng(render(size), size);
  pngs.push({ size, data });
  if (size === 256) {
    writeFileSync(path.join(OUT_DIR, 'icon.png'), data);
  }
}

writeFileSync(path.join(OUT_DIR, 'icon.ico'), buildIco(pngs));
console.log(`[gen-icon] wrote icon.ico (${SIZES.join('/')}) + icon.png -> ${OUT_DIR}`);
