// 构建 CLI 单文件 `dspack.exe`（Node SEA，免 Node 环境）。
// 流程：esbuild 打 CJS bundle → node --experimental-sea-config 出 blob → 复制 node.exe → postject 注入。
// 产出：packages/gui/build/sea/dspack.exe
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'packages', 'gui', 'build', 'sea');
const BUNDLE = path.join(OUT, 'dspack.cjs');
const BLOB = path.join(OUT, 'sea-prep.blob');
const EXE = path.join(OUT, 'dspack.exe');
const SENTINEL = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

mkdirSync(OUT, { recursive: true });

// 1) esbuild 打包（node:* 自动 external，fflate 与 workspace 包内联）
await build({
  entryPoints: [path.join(__dirname, 'sea-entry.js')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  outfile: BUNDLE,
  logLevel: 'warning',
});
console.log('[build-cli] esbuild bundle ->', BUNDLE);

// 2) 生成 SEA blob
const seaConfigPath = path.join(OUT, 'sea-config.json');
writeFileSync(
  seaConfigPath,
  JSON.stringify({ main: BUNDLE, output: BLOB, disableExperimentalSEAWarning: true }, null, 2),
);
execFileSync(process.execPath, ['--experimental-sea-config', seaConfigPath], { stdio: 'inherit' });

// 3) 复制 node.exe 作为宿主
copyFileSync(process.execPath, EXE);

// 4) postject 注入 blob（npx 拉取 postject；--build-sea 在本 Node 版本不可用，走此回退路径）
try {
  execFileSync(
    'npx',
    ['--yes', 'postject', EXE, 'NODE_SEA_BLOB', BLOB, '--sentinel-fuse', SENTINEL],
    { stdio: 'inherit', cwd: ROOT, shell: process.platform === 'win32' },
  );
} catch (e) {
  console.error('[build-cli] postject 注入失败（可能缺网络下载 postject）:', e.message);
  process.exit(1);
}

// 清理中间产物
rmSync(BLOB, { force: true });
rmSync(seaConfigPath, { force: true });

if (!existsSync(EXE)) {
  console.error('[build-cli] 未产出 dspack.exe');
  process.exit(1);
}
console.log('[build-cli] wrote', EXE);
