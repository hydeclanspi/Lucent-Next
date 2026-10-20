// Render the social preview (src/web/og.jpg) from design/brand/og.html over showcase/media/hero.jpg.
//   AIRA_BROWSER_PATH=/path/to/chromium node scripts/og.mjs
// The card is laid out at 1280×640, rendered at 2× and downsampled in the browser, so the type stays crisp.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.AIRA_PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const [width, height] = [1280, 640];

const browser = await chromium.launch({ headless: true, ...(process.env.AIRA_BROWSER_PATH ? { executablePath: process.env.AIRA_BROWSER_PATH } : {}) });
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
await page.goto('file://' + path.join(root, 'design/brand/og.html'));
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0));
const sharp = await page.screenshot();
const jpeg = await page.evaluate(async ({ png, width, height }) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + png;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.88).split(',')[1];
}, { png: sharp.toString('base64'), width, height });
await writeFile(path.join(root, 'src/web/og.jpg'), Buffer.from(jpeg, 'base64'));
await browser.close();
console.log('Rendered src/web/og.jpg');
