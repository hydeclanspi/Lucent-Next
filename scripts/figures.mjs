// Renders the documentation figures in scripts/figures/figures.html to PNG.
// The maps are computed in the page by the engine's own functions (assets/interaction.js).
//
//   npm install && AIRA_BROWSER_PATH=/path/to/chrome node scripts/figures.mjs
import http from 'node:http';
import { readFile, mkdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.AIRA_PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'docs/images/figures');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png' };

const server = http.createServer(async (req, res) => {
  try {
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(root) || !(await stat(file)).isFile()) throw new Error('missing');
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/scripts/figures/figures.html`;
const browser = await chromium.launch({ headless: true, ...(process.env.AIRA_BROWSER_PATH ? { executablePath: process.env.AIRA_BROWSER_PATH } : {}) });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
await mkdir(out, { recursive: true });
const only = process.argv.slice(2);
for (const fig of ['architecture', 'region', 'potential', 'placement', 'speeds', 'fsd', 'glass', 'storage', 'gestures']) {
  if (only.length && !only.includes(fig)) continue;
  for (const lang of ['zh', 'en']) {
    await page.goto(`${base}?fig=${fig}&lang=${lang}`);
    await page.waitForFunction(() => document.body.dataset.ready === '1');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => Array.from(document.images).every(image => image.complete && image.naturalWidth > 0));
    const file = path.join(out, `${fig}.${lang}.png`);
    await page.locator('#figure').screenshot({ path: file });
    console.log('wrote', path.relative(root, file));
  }
}
await browser.close();
server.close();
