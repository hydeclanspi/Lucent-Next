import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
let count = 0;
for (const dir of ['src/assets', 'src/web', 'showcase/film', 'scripts', 'scripts/capture', 'tests']) {
  const files = await readdir(path.join(root, dir)).catch(() => []);
  for (const file of files) {
    if (!/\.(?:js|mjs|cjs)$/.test(file)) continue;
    const result = spawnSync(process.execPath, ['--check', path.join(root, dir, file)], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
    count++;
  }
}

const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
if (pkg.name !== 'lucent' || pkg.version !== '6.0.1' || pkg.author !== 'hydeclanspi') throw new Error('Unexpected release identity');

// The device packages are kept byte for byte; their digests are documented in product-finale/README.md.
const documented = await readFile(path.join(root, 'product-finale/README.md'), 'utf8');
for (const PACKAGE of ['product-finale/lucent-5.0.0-aira.zip', 'product-finale/lucent-5.1.3-aira.zip', 'product-finale/lucent-5.9.4-aira.zip', 'product-finale/lucent-5.9.7-aira.zip', 'product-finale/lucent-6.0.1-aira.zip']) {
  const digest = createHash('sha256').update(await readFile(path.join(root, PACKAGE))).digest('hex');
  if (!documented.includes(digest)) throw new Error(`${PACKAGE} does not match the documented SHA-256`);
}

console.log(`${count} scripts passed syntax checks; release identity and device package digests verified.`);
