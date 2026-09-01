import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NodeHost } from '@dsh-packforge/host-node';
import { readMarketIndex } from '@dsh-packforge/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.join(__dirname, '..', 'market', 'index.json'),
  path.join(__dirname, '..', '..', 'market', 'index.json'),
  path.join(__dirname, '..', '..', '..', '..', 'dsh-pack-market', 'index', 'index.json'),
];
const found = candidates.find((c) => fs.existsSync(c));
console.log('resolveMarketIndex →', found ?? '(未找到)');
if (found) {
  const host = new NodeHost();
  const r = await readMarketIndex(host, found);
  console.log('packs:', r.packs.length, '→', r.packs.map((p) => `${p.name}@${p.version} [${p.format}]`).join(', '));
}