// 把 dspack-preview 仓库编译出的原生预览 DLL 拷入 gui 构建资源目录，
// 作为 extraResources 的输入产物固化进本仓库。
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, '..', 'dspack-preview', 'src', 'DspackPreviewNative', 'DspackPreviewNative.dll');
const OUT_DIR = path.join(ROOT, 'packages', 'gui', 'build', 'dspack-preview');
const DST = path.join(OUT_DIR, 'DspackPreviewNative.dll');

if (!existsSync(SRC)) {
  console.error('[copy-preview] 未找到 DLL:', SRC);
  console.error('  请先在 dspack-preview 仓库执行 src\\DspackPreviewNative\\build-native.cmd 编译。');
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
copyFileSync(SRC, DST);
console.log('[copy-preview]', SRC, '->', DST);
