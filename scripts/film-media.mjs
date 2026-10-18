// Media made from the concept film, for the README and the demo page:
//   demo/media/film-poster.jpg   the name at dawn, straight from the page
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

// The film's scene marks, read from the page itself, so the media follow the film when it is retimed.
const M = Object.fromEntries([...fs.readFileSync(path.join(root, 'demo/film/film.js'), 'utf8').match(/var M = \{([\s\S]*?)\};/)[1]
  .matchAll(/(\w+):\s*([\d.]+)/g)].map(([, name, t]) => [name, Number(t)]));
// Passages of the film for the teaser: [start, end] in seconds. Each joins the next with a 0.35 s cross-fade.
// The Home button seen from up close; the exploded view; the wave, the jump and the tunnel of windows; the stage
// lights; the console; the four pillars; the name at dawn.
const PASSAGES = [[M.home + 0.65, M.home + 2.35], [M.explode + 0.8, M.explode + 2.5], [M.rise - 0.05, M.jump + 0.9],
  [M.show - 0.2, M.show + 1.3], [M.console + 0.9, M.console + 2.4], [M.pillars + 0.1, M.pillars + 2.1], [M.lock + 0.4, M.lock + 2.7]];
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
  await page.evaluate((t) => window.__film.seek(t), M.lock + 2.6);
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
