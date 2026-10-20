// Render the concept film (showcase/film/) to video, one exact frame at a time.
//
//   npm run build
//   AIRA_BROWSER_PATH=/path/to/chromium node scripts/film.mjs                       # Lucent-Film.mp4, 1440p60
//   node scripts/film.mjs --preview                                                # half size, 24 fps, quick
//   node scripts/film.mjs --from 20 --to 32 --out verification/film/launch.mp4    # a part
//
// The page is never played: every frame is window.__film.seek(t) followed by a screenshot, piped
// straight into ffmpeg (libx264), with the score (showcase/film/score.m4a, scripts/film-score.py) laid
// under it from the same moment; --mute leaves it out. A slow machine renders the same film as a fast
// one. --workers sets how many pages render in parallel (default 2); --scale the size, as a multiple of
// the page's 1920 × 1080 (default 4/3: 2560 × 1440); --recycle-at the share of memory in use at which
// every page is replaced by a fresh one (0.65 above 1080p, where a page that follows the camera into the
// screen holds on to memory for every scale it passes through).
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
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
const scale = preview ? 0.5 : Number(option('scale', 4 / 3));
const crf = option('crf', preview ? '26' : '23');
const out = path.resolve(root, option('out', preview ? 'verification/film/preview.mp4' : 'Lucent-Film.mp4'));

if (!fs.existsSync(path.join(dist, 'film', 'index.html'))) throw new Error('Run `npm run build` first.');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.m4a': 'audio/mp4', '.webm': 'audio/webm' };
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
  await page.goto(`http://127.0.0.1:${server.address().port}/film/?capture`, { timeout: 120000 });
  await page.waitForFunction(() => window.__film, null, { timeout: 120000 });
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
const score = path.join(dist, 'film', 'score.m4a');
const sound = fs.existsSync(score) && !args.includes('--mute');
const ffmpeg = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-',
  // The whole film takes the score's AAC as it is; a part is cut from it and encoded again.
  ...(sound ? ['-ss', String(from), '-t', String(frames / fps), '-i', score, '-map', '0:v', '-map', '1:a', ...(from === 0 ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-b:a', '256k'])] : []),
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
// The share of memory in use: of this process's cgroup when it has a limit (as in containers), else of the machine.
function memoryInUse() {
  try {
    const groups = fs.readFileSync('/proc/self/cgroup', 'utf8').split('\n');
    const v1 = groups.find(line => line.split(':')[1] === 'memory');
    const dir = v1 ? path.join('/sys/fs/cgroup/memory', v1.split(':')[2]) : path.join('/sys/fs/cgroup', groups.find(line => line.startsWith('0::')).slice(3));
    const read = name => fs.readFileSync(path.join(dir, name), 'utf8').trim();
    const used = Number(v1 ? read('memory.usage_in_bytes') : read('memory.current'));
    const limit = v1 ? Number(read('memory.limit_in_bytes')) : read('memory.max') === 'max' ? Infinity : Number(read('memory.max'));
    if (used > 0) return used / Math.min(limit, os.totalmem());
  } catch { /* no cgroup to read: fall back to the machine */ }
  return 1 - os.freemem() / os.totalmem();
}
// Above 1080p, a page that follows the camera into the screen holds on to memory for every scale it passes through.
// When memory runs high, every page finishes its frame and all are replaced together: a page that loads while
// another renders can wait on it for minutes. The film is a function of time alone, so a fresh page draws the
// next frame exactly as the old one would have.
const recycleAt = Number(option('recycle-at', scale > 1 ? 0.65 : 0));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let renewals = 0;
while (next < frames) {
  let full = false, drawn = 0;
  await Promise.all(pages.map(async page => {
    while (next < frames && !full) {
      const i = next++;
      await page.evaluate(t => window.__film.seek(t), from + i / fps);
      // JPEG at quality 94: the film grain makes PNG several times slower, for no visible gain after H.264.
      ready.set(i, await page.screenshot({ type: 'jpeg', quality: 94 }));
      // When this page runs ahead, wait for the frames before it without starving the event loop the others need.
      while (ready.size > 24) { await flush(); if (ready.size > 24) await pause(20); }
      flush();
      if (recycleAt && ++drawn >= 8 && memoryInUse() > recycleAt) full = true;
    }
  }));
  if (next < frames) {
    renewals++;
    await Promise.all(pages.map(async (page, w) => { page.removeAllListeners('requestfailed'); await page.close(); pages[w] = await openFilm(); }));
  }
}
await flush();
ffmpeg.stdin.end();
await finished;
await browser.close();
server.close();
if (errors.length) { console.error('page errors:', errors); process.exitCode = 1; }
console.log(`Rendered ${path.relative(root, out)} — ${frames} frames at ${fps} fps${sound ? ' with the score' : ''}, ${(fs.statSync(out).size / 1048576).toFixed(1)} MB${renewals ? `, pages renewed ${renewals} times` : ''}, ${Math.round((Date.now() - started) / 60000)} min`);
