import { isExcluded } from './security.js';

/**
 * 递归扫描 Profile 目录（主机无关版）：
 * - 跳过符号链接（防止逃出 Profile 目录 / 死循环）
 * - 命中安全规则的文件/目录记入 excluded
 * - 返回 { files: [{rel, abs, size}], excluded: [{rel, abs, reason}] }
 *   rel 一律用 '/' 分隔。
 *
 * @param {Host} host Host 实例
 * @param {string} profileDir Profile 目录绝对路径
 */
export async function scanProfile(host, profileDir) {
  const files = [];
  const excluded = [];
  await walk(host, profileDir, '', files, excluded);
  files.sort((a, b) => a.rel.localeCompare(b.rel));
  return { files, excluded };
}

async function walk(host, dir, rel, files, excluded) {
  let entries;
  try {
    entries = await host.readdir(dir);
  } catch {
    return; // 无权限等：跳过该目录
  }
  if (!Array.isArray(entries)) return;

  for (const entry of entries) {
    if (!entry || typeof entry.name !== 'string') continue;
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;

    if (entry.type === 'symlink') {
      excluded.push({ rel: relPath, abs: entry.abs, reason: 'symlink' });
      continue;
    }

    if (entry.type === 'dir') {
      if (isExcluded(relPath)) {
        excluded.push({ rel: relPath, abs: entry.abs, reason: 'deny' });
        continue;
      }
      await walk(host, entry.abs, relPath, files, excluded);
    } else if (entry.type === 'file') {
      if (isExcluded(relPath)) {
        excluded.push({ rel: relPath, abs: entry.abs, reason: 'deny' });
        continue;
      }
      let size = 0;
      try {
        const st = await host.stat(entry.abs);
        size = st && typeof st.size === 'number' ? st.size : 0;
      } catch {
        // 读不到大小（如权限问题）：记为 0
      }
      files.push({ rel: relPath, abs: entry.abs, size });
    }
  }
}