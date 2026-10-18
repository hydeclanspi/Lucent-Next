// Media made from the concept film, for the README and the demo page:
//   demo/media/film-poster.jpg   the name at dawn (57.6 s), straight from the page
//   demo/media/film-teaser.webp  seven passages of the rendered film, cross-faded, 1200 px wide
//   demo/media/on-device.jpg     the slot for the on-device recording (scripts/film-media/slot.html)
//
//   npm run build && node scripts/film.mjs          # first, the film itself
//   AIRA_BROWSER_PATH=/path/to/chromium node scripts/film-media.mjs [poster] [teaser] [slot]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.AIRA_PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const media = path.join(root, 'demo/media');
const wanted = process.argv.slice(2);
const want = (name) => !wanted.length || wanted.includes(name);
const launch = () => chromium.launch({ headless: true, ...(process.env.AIRA_BROWSER_PATH ? { executablePath: process.env.AIRA_BROWSER_PATH } : {}) });

// Passages of the film for the teaser: [start, end] in seconds. Each joins the next with a 0.35 s cross-fade.
const PASSAGES = [[4.5, 6.4], [11.6, 13.3], [18.7, 20.4], [26.7, 29.6], [39.4, 40.9], [48.5, 50.5], [55.4, 57.7]];
const FADE = 0.35;

if (want('poster')) {
  const dist = path.join(root, 'dist');
  const server = http.createServer((request, response) => {
    try {
      let file = path.resolve(dist, '.' + decodeURIComponent(new URL(request.url, 'http://x').pathname));
      if (!file.startsWith(dist)) throw new Error('outside');
      if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      response.setHeader('Content-Type', { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png' }[path.extname(file)] || 'application/octet-stream');
      response.end(fs.readFileSync(file));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/film/?capture`);
  await page.waitForFunction(() => window.__film);
  await page.evaluate(() => window.__film.ready);
  await page.evaluate(() => window.__film.seek(57.6));
  await page.screenshot({ path: path.join(media, 'film-poster.jpg'), type: 'jpeg', quality: 88 });
  await browser.close();
  server.close();
  console.log('Rendered demo/media/film-poster.jpg');
}

if (want('slot')) {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(root, 'scripts/film-media/slot.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(media, 'on-device.jpg'), type: 'jpeg', quality: 88 });
  await browser.close();
  console.log('Rendered demo/media/on-device.jpg');
}

if (want('teaser')) {
  const film = path.join(media, 'lucent-film.mp4');
  if (!fs.existsSync(film)) throw new Error('Render the film first: node scripts/film.mjs');
  // Each passage is its own seeked input, so ffmpeg never holds one part's frames while it decodes another.
  const inputs = PASSAGES.flatMap(([a, b]) => ['-ss', String(a), '-t', (b - a).toFixed(2), '-i', film]);
  const parts = PASSAGES.map((_, i) => `[${i}:v]setpts=PTS-STARTPTS,fps=20,scale=1200:-2:flags=lanczos,format=yuv420p[p${i}]`);
  let last = 'p0', offset = PASSAGES[0][1] - PASSAGES[0][0];
  for (let i = 1; i < PASSAGES.length; i++) {
    offset -= FADE;
    parts.push(`[${last}][p${i}]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(2)}[x${i}]`);
    last = `x${i}`;
    offset += PASSAGES[i][1] - PASSAGES[i][0];
  }
  const out = path.join(media, 'film-teaser.webp');
  const run = spawnSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', parts.join(';'), '-map', `[${last}]`,
    // Every frame is encoded whole (libwebp through the WebP muxer): the animated encoder's partial-frame updates
    // leave blocky patches on the film's smooth gradients.
    '-c:v', 'libwebp', '-quality', '80', '-compression_level', '4', '-loop', '0', '-an', out], { stdio: 'inherit' });
  if (run.status !== 0) throw new Error('ffmpeg failed');
  console.log(`Rendered demo/media/film-teaser.webp — ${offset.toFixed(1)} s, ${(fs.statSync(out).size / 1048576).toFixed(1)} MB`);
}
