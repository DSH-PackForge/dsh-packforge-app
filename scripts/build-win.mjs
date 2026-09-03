// 一键出 Windows 安装包：图标 → CLI(SEA) → 预览 DLL → electron-builder dist。
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const node = process.execPath; // 用完整 node 路径，避免 Windows 下 PATHEXT 解析问题

const steps = [
  [['scripts/build-icons.mjs'], '转换图标 PNG -> ICO'],
  [['scripts/build-cli.mjs'], '构建 CLI 单文件 exe (SEA)'],
  [['scripts/copy-preview.mjs'], '拷贝预览 DLL'],
];

for (const [args, label] of steps) {
  console.log(`\n=== [${label}] node ${args.join(' ')} ===`);
  const r = spawnSync(node, args, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`[build-win] 步骤失败：${label}`);
    process.exit(r.status ?? 1);
  }
}

console.log('\n=== [electron-builder] pnpm --filter gui dist ===');
const r = spawnSync('pnpm', ['--filter', 'gui', 'dist'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(r.status ?? 0);
