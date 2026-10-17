import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
let count = 0;
for (const dir of ['assets', 'web', 'scripts', 'tests']) {
  for (const file of await readdir(path.join(root, dir))) {
    if (!/\.(?:js|mjs|cjs)$/.test(file)) continue;
    const result = spawnSync(process.execPath, ['--check', path.join(root, dir, file)], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
    count++;
  }
}

const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
if (pkg.name !== 'lucent' || pkg.version !== '5.0.0' || pkg.author !== 'hydeclanspi') throw new Error('Unexpected release identity');

// The original HarmonyOS package is kept byte-for-byte; its digest is documented in native/README.md.
const NATIVE = 'native/lucent-5.0.0-aira.zip';
const digest = createHash('sha256').update(await readFile(path.join(root, NATIVE))).digest('hex');
const documented = await readFile(path.join(root, 'native/README.md'), 'utf8');
if (!documented.includes(digest)) throw new Error(`${NATIVE} does not match the documented SHA-256`);

console.log(`${count} scripts passed syntax checks; release identity and native package digest verified.`);
