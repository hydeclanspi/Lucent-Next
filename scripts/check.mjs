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
if (pkg.name !== 'lucent' || pkg.version !== '6.0.3' || pkg.author !== 'hydeclanspi') throw new Error('Unexpected release identity');

// The device packages are kept byte for byte; their digests are documented in product-finale/README.md.
const documented = await readFile(path.join(root, 'product-finale/README.md'), 'utf8');
for (const PACKAGE of ['product-finale/lucent-5.0.0-aira.zip', 'product-finale/lucent-5.1.3-aira.zip', 'product-finale/lucent-5.9.4-aira.zip', 'product-finale/lucent-5.9.7-aira.zip', 'product-finale/lucent-6.0.1-aira.zip', 'product-finale/lucent-6.0.2-aira.zip', 'product-finale/lucent-6.0.3-aira.zip']) {
  const digest = createHash('sha256').update(await readFile(path.join(root, PACKAGE))).digest('hex');
  if (!documented.includes(digest)) throw new Error(`${PACKAGE} does not match the documented SHA-256`);
}

// Aira refuses to import a homepage package whose scripts contain any of these, comments
// included (CustomHomepageHtmlValidationService in mason173/Aira-browser). The scripts in
// src/assets are the ones the device packages share.
const AIRA_SCRIPT_RULES = [
  [/navigator\.serviceworker/i, 'a service worker'],
  [/serviceworker\s*\.\s*register/i, 'a service worker'],
  [/register\s*\(\s*["'][^"']*service-worker/i, 'a service worker'],
  [/\bfile:\/\//i, 'the text file://'],
  [/\b(?:window\.)?location\s*\.\s*(?:href|assign|replace)\b/i, 'location.href, assign or replace'],
  [/\bwindow\s*\.\s*open\s*\(/i, 'window.open('],
  [/\bfetch\s*\(/i, 'fetch('],
  [/\bXMLHttpRequest\b/i, 'XMLHttpRequest'],
  [/\bnavigator\s*\.\s*sendBeacon\b/i, 'navigator.sendBeacon'],
  [/\bWebSocket\s*\(/i, 'WebSocket('],
  [/\bEventSource\s*\(/i, 'EventSource(']
];
let shared = 0;
for (const file of await readdir(path.join(root, 'src/assets'))) {
  if (!/\.m?js$/.test(file)) continue;
  const text = await readFile(path.join(root, 'src/assets', file), 'utf8');
  for (const [rule, label] of AIRA_SCRIPT_RULES) {
    const match = text.match(rule);
    if (match) {
      const line = text.slice(0, match.index).split('\n').length;
      throw new Error(`src/assets/${file}:${line} contains ${label}; Aira would refuse to import the package`);
    }
  }
  shared++;
}

console.log(`${count} scripts passed syntax checks; release identity and device package digests verified; ${shared} shared scripts pass Aira's import rules.`);
