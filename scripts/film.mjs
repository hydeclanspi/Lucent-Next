// Render the concept film (demo/film/) to video, one exact frame at a time.
//
//   npm run build
//   AIRA_BROWSER_PATH=/path/to/chromium node scripts/film.mjs                       # demo/media/lucent-film.mp4, 1080p60
//   node scripts/film.mjs --preview                                                # half size, 24 fps, quick
//   node scripts/film.mjs --from 20 --to 32 --out verification/film/launch.mp4    # a part
//
// The page is never played: every frame is window.__film.seek(t) followed by a screenshot, piped
// straight into ffmpeg (libx264). A slow machine renders the same film as a fast one; --workers sets
// how many pages render in parallel (default 2).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.AIRA_PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const args = process.argv.slice(2);
const option = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : fallback; };
const preview = args.includes('--preview');
const fps = Number(option('fps', preview ? 24 : 60));
const scale = preview ? 0.5 : Number(option('scale', 1));
const crf = option('crf', preview ? '26' : '21');
const out = path.resolve(root, option('out', preview ? 'verification/film/preview.mp4' : 'demo/media/lucent-film.mp4'));

if (!fs.existsSync(path.join(dist, 'film', 'index.html'))) throw new Error('Run `npm run build` first.');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((request, response) => {
  try {
    let file = path.resolve(dist, '.' + decodeURIComponent(new URL(request.url, 'http://x').pathname));
    if (!file.startsWith(dist)) throw new Error('outside');
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    response.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    response.end(fs.readFileSync(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

const browser = await chromium.launch({ headless: true, ...(process.env.AIRA_BROWSER_PATH ? { executablePath: process.env.AIRA_BROWSER_PATH } : {}) });
const errors = [];
async function openFilm() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => errors.push('failed: ' + request.url()));
  await page.goto(`http://127.0.0.1:${server.address().port}/film/?capture`);
  await page.waitForFunction(() => window.__film);
  await page.evaluate(() => window.__film.ready);
  return page;
}
// Several pages render interleaved frames; a reorder buffer feeds ffmpeg strictly in order.
const pages = [];
for (let w = 0; w < Number(option('workers', 2)); w++) pages.push(await openFilm());
const duration = await pages[0].evaluate(() => window.__film.duration);
const from = Number(option('from', 0)), to = Math.min(duration, Number(option('to', duration)));
const frames = Math.round((to - from) * fps);

fs.mkdirSync(path.dirname(out), { recursive: true });
const ffmpeg = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-',
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
  '-c:v', 'libx264', '-preset', preview ? 'veryfast' : 'slow', '-crf', crf, '-tune', 'film', '-profile:v', 'high',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const finished = new Promise((resolve, reject) => ffmpeg.on('close', code => code === 0 ? resolve() : reject(new Error('ffmpeg exited with ' + code))));

const started = Date.now();
const ready = new Map();
let next = 0, written = 0, flushing = Promise.resolve();
function flush() {
  flushing = flushing.then(async () => {
    while (ready.has(written)) {
      const frame = ready.get(written);
      ready.delete(written);
      if (written % (fps * 5) === 0) console.log(`  ${(from + written / fps).toFixed(1)} s  (${Math.round((Date.now() - started) / 1000)} s elapsed)`);
      written++;
      if (!ffmpeg.stdin.write(frame)) await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
    }
  });
  return flushing;
}
await Promise.all(pages.map(async page => {
  while (next < frames) {
    const i = next++;
    await page.evaluate(t => window.__film.seek(t), from + i / fps);
    // JPEG at quality 94: the film grain makes PNG several times slower, for no visible gain after H.264.
    ready.set(i, await page.screenshot({ type: 'jpeg', quality: 94 }));
    while (ready.size > 24) await flush();
    flush();
  }
}));
await flush();
ffmpeg.stdin.end();
await finished;
await browser.close();
server.close();
if (errors.length) { console.error('page errors:', errors); process.exitCode = 1; }
console.log(`Rendered ${path.relative(root, out)} — ${frames} frames at ${fps} fps, ${(fs.statSync(out).size / 1048576).toFixed(1)} MB`);
