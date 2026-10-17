'use strict';
// Deterministic frame recorder for the documentation media.
//
// JavaScript time runs on Playwright's fake clock; CSS animations run on a frozen document timeline
// that is sought frame by frame. Every frame is therefore the product's exact state at an exact
// virtual time — a render, not a screen recording — and a slow machine produces the same frames as a
// fast one. External requests are blocked; the product is served from dist/ on loopback.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.AIRA_PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '../..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.txt': 'text/plain' };

function serve(dir) {
  const server = http.createServer((request, response) => {
    try {
      let file = path.resolve(dir, '.' + decodeURIComponent(new URL(request.url, 'http://x').pathname));
      if (!file.startsWith(dir)) throw new Error('outside');
      if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      response.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
      response.end(fs.readFileSync(file));
    } catch { response.writeHead(404).end(); }
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// Seek every running CSS animation by the same virtual delta. Animations created later start
// from their own current time, so entrance transitions still play in order.
const STEP_CSS = `
  window.__captureTime = 0; window.__captureSeen = new Map();
  window.__captureStep = function (dt) {
    window.__captureTime += dt;
    for (const animation of document.getAnimations()) {
      let seen = window.__captureSeen.get(animation);
      if (!seen) { seen = { base: animation.currentTime || 0, at: window.__captureTime - dt }; window.__captureSeen.set(animation, seen); }
      try { animation.currentTime = seen.base + (window.__captureTime - seen.at); } catch (_) {}
    }
  };`;

async function open(options = {}) {
  const dist = path.join(root, 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('Run `npm run build` first.');
  const server = await serve(dist);
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, ...(process.env.AIRA_BROWSER_PATH ? { executablePath: process.env.AIRA_BROWSER_PATH } : {}) });
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1560, height: 1040 },
    deviceScaleFactor: options.dpr || 2,
    colorScheme: options.scheme || 'light',
    timezoneId: options.timezone || 'Europe/London',
    locale: 'zh-CN'
  });
  await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
  // A visitor who has already left full screen once: no first-click full screen, no hint in the frame.
  await context.addInitScript(() => { try { sessionStorage.setItem('lucent:immersive:declined', '1'); } catch (_) {} });
  if (options.storage) {
    // Seed a saved localStorage once, before the product's first script runs.
    await context.addInitScript(storage => {
      if (sessionStorage.getItem('__captureSeeded')) return;
      for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
      sessionStorage.setItem('__captureSeeded', '1');
    }, options.storage);
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const clock = options.clock !== false;
  if (clock) await page.clock.install({ time: options.time || new Date('2026-10-17T19:42:00+01:00') });
  await page.goto(base + (options.path || '/'));
  if (clock) {
    await page.clock.runFor(1500);
    // Pause, or time keeps flowing while a slow screenshot is taken.
    await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 5);
  }
  await page.waitForSelector(options.ready || '#engineChips .chip');
  const cdp = await context.newCDPSession(page);
  await cdp.send('Animation.enable');

  async function freezeCss() {
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });
    await page.evaluate(STEP_CSS);
  }
  // Advance virtual time in small sub-steps (the physics sees ordinary frames), then step CSS.
  async function advance(ms, sub = 16) {
    for (let left = ms; left > 0; left -= sub) await page.clock.runFor(Math.min(sub, left));
    await page.evaluate(ms => window.__captureStep && window.__captureStep(ms), ms);
  }
  async function record(dir, { frames, fps = 25, clip, before }) {
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < frames; i++) {
      if (before) await before(i);
      await page.screenshot({ path: path.join(dir, String(i).padStart(4, '0') + '.png'), clip, animations: 'allow', caret: 'hide' });
      await advance(1000 / fps);
    }
  }
  async function close() { await browser.close(); server.close(); }
  return { page, context, base, errors, freezeCss, advance, record, close };
}

module.exports = { open, root };
