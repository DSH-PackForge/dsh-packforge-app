// SEA 入口：直接调 CLI 的 main()，避开 bin/dspack.js 的顶层 await，
// 保证能被 esbuild 打成 CJS（Node SEA 的 --experimental-sea-config 仅支持 CJS 入口）。
import { main } from '../packages/cli/src/cli.js';

main(process.argv.slice(2)).catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
