import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
let count = 0;
for (const dir of ['assets', 'web', 'scripts']) {
  for (const file of await readdir(path.join(root, dir))) {
    if (!/\.(?:js|mjs|cjs)$/.test(file)) continue;
    const result = spawnSync(process.execPath, ['--check', path.join(root, dir, file)], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
    count++;
  }
}
const manifest = JSON.parse(await readFile(path.join(root, 'aira-homepage.json'), 'utf8'));
if (manifest.version !== '5.0.0' || manifest.author !== 'hydeclanspi') throw new Error('Unexpected release identity');
console.log(`${count} scripts passed syntax checks; release identity verified.`);
