// Render the app icon (web/icon-*.png) from scripts/icon/icon.html.
//   AIRA_BROWSER_PATH=/path/to/chromium node scripts/icon.mjs
// Sizes are downsampled by the browser from a 1024 px render, so every size stays crisp.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.AIRA_PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const source = 'file://' + path.join(root, 'scripts/icon/icon.html');
const browser = await chromium.launch({ headless: true, ...(process.env.AIRA_BROWSER_PATH ? { executablePath: process.env.AIRA_BROWSER_PATH } : {}) });
for (const size of [512, 192, 180, 32]) {
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: size / 1024 });
  await page.goto(source);
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(root, 'web', `icon-${size}.png`) });
  await page.close();
}
await browser.close();
console.log('Rendered web/icon-{512,192,180,32}.png');
