'use strict';
// Re-shoot the documentation media from the real product.
//
//   npm run build
//   node scripts/capture/scenes.cjs lueurs motion random simulation focus glass week chronicle atelier
//
// Each scene drives the product through its own controls under a fake clock and writes PNG frames
// and stills to verification/capture/ (ignored by git). `week` runs the product for a simulated
// week and saves its localStorage; `chronicle` photographs the panels from that saved week.
// CAPTURE_QUICK=1 shortens every scene for a smoke test. Encoding is described in docs/MAINTAINING.md.
const fs = require('node:fs');
const path = require('node:path');
const { open, root } = require('./recorder.cjs');

const OUT = path.join(root, 'verification/capture');
const QUICK = process.env.CAPTURE_QUICK === '1';
const frames = n => (QUICK ? Math.min(n, 4) : n);
const out = (...parts) => { const file = path.join(OUT, ...parts); fs.mkdirSync(path.dirname(file), { recursive: true }); return file; };

const lueurCount = page => page.evaluate(() => document.querySelectorAll('.interaction-item').length);
async function summon(page, n, wait) {
  for (let guard = 0; (await lueurCount(page)) < n && guard < 80; guard++) {
    await page.locator('#btnInteraction').click();
    await wait();
  }
}
// The FSD button cycles off → cruise → boosted → off.
async function drive(page, mode, wait) {
  for (let guard = 0; guard < 4; guard++) {
    const state = await page.evaluate(() => {
      const button = document.getElementById('btnAutoDrive');
      return button.getAttribute('aria-pressed') !== 'true' ? 'off' : button.classList.contains('is-rage') ? 'rage' : 'on';
    });
    if (state === mode) return;
    await page.evaluate(() => { const button = document.getElementById('btnAutoDrive'); button.hidden = false; button.click(); });
    await wait();
  }
}
const longPress = (page, id) => page.evaluate(id => document.getElementById(id).dispatchEvent(
  new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true })), id);

// Nine residents with room to breathe: an airy constellation across the open space, in 1560×1040
// layout pixels. Every neighbour sits a little beyond the 150 px encounter circle.
const CONSTELLATION = [[152, 262], [286, 170], [420, 286], [562, 172], [700, 284], [842, 170], [980, 280], [1120, 172], [474, 452]];
const lensCenters = page => page.evaluate(() => Array.from(document.querySelectorAll('.interaction-item'), item => {
  const box = item.getBoundingClientRect();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}));
async function dragLens(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.clock.runFor(48);
  for (let k = 1; k <= 24; k++) {
    const t = 1 - Math.pow(1 - k / 24, 3); // ease out: arrive slowly, so the release carries no fling
    await page.mouse.move(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    await page.clock.runFor(16);
  }
  await page.clock.runFor(120); // held still for more than 80 ms: the lens is set down at rest
  await page.mouse.up();
  await page.clock.runFor(60);
}
// Arrange the Lueurs by hand: each one is dragged — a real pointer gesture, as a visitor would —
// to a point of the constellation, snapped to the engine's own safe sites for the current layout.
async function spread(page, points = CONSTELLATION) {
  const goals = await page.evaluate(points => {
    const api = window.AiraInteraction._test;
    const exclude = '.topbar, .hero .avatar, .hero .name, .hero .meta, .hero .signature, .hero .badges, .hero .tags, .card, #btnHistory';
    const rects = Array.from(document.querySelectorAll(exclude), node => node.getBoundingClientRect()).filter(box => box.width > 0 && box.height > 0);
    const sites = api.safeSites(api.makeGeometry(document.documentElement.clientWidth, window.innerHeight, rects));
    return points.map(([x, y]) => sites.reduce((a, b) => Math.hypot(a.x - x, a.y - y) <= Math.hypot(b.x - x, b.y - y) ? a : b));
  }, points);
  for (let pass = 0; pass < 3; pass++) {
    const lenses = (await lensCenters(page)).map((p, i) => ({ ...p, i }));
    // Pair lenses and goals greedily by the shortest remaining distance, then move left to right.
    const pairs = [], free = lenses.slice(), open = goals.slice();
    while (free.length && open.length) {
      let best = null;
      for (const lens of free) for (const goal of open) {
        const d = Math.hypot(lens.x - goal.x, lens.y - goal.y);
        if (!best || d < best.d) best = { lens, goal, d };
      }
      pairs.push(best);
      free.splice(free.indexOf(best.lens), 1); open.splice(open.indexOf(best.goal), 1);
    }
    pairs.sort((a, b) => a.goal.x - b.goal.x);
    let moved = 0;
    for (const { lens, goal } of pairs) {
      const now = (await lensCenters(page))[lens.i];
      if (Math.hypot(now.x - goal.x, now.y - goal.y) > 14) { await dragLens(page, now, goal); moved++; }
    }
    if (!moved) break;
  }
  // Put the hand away: no lens keeps focus, so no identity number lingers on screen.
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
}

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const scenes = {
  // The README hero (a full-page still) and the Lueurs in motion: nine residents spread by hand,
  // Drive off, drifting and meeting on their own — 20 s of life, sampled at 12.5 fps to play as a
  // 10 s, 2× time-lapse at 25 fps.
  async lueurs() {
    const r = await open({ dpr: 2, seed: 7, time: new Date('2026-10-17T19:42:00+01:00') });
    const { page } = r;
    await summon(page, 9, () => page.clock.runFor(250));
    await drive(page, 'off', () => page.clock.runFor(200));
    await page.clock.runFor(1200);
    await spread(page);
    await page.mouse.move(1500, 1000);
    await r.freezeCss();
    await r.advance(400);
    await page.screenshot({ path: out('hero.png') });
    await r.record(path.join(OUT, 'lueurs'), { frames: frames(250), fps: 12.5, clip: { x: 110, y: 112, width: 1080, height: 428 } });
    return r;
  },

  // The six search motions, one after another, at the panel's 0.35× slow preview.
  async motion() {
    const r = await open({ dpr: 2 });
    const { page } = r;
    await page.locator('#btnSearchMotion').click();
    await r.advance(1500);
    await page.locator('.sm-speed button[data-rate="0.35"]').click();
    await r.advance(2000);
    await r.freezeCss();
    const box = await page.locator('.sm-preview').boundingBox();
    const clip = { x: Math.round(box.x - 12), y: Math.round(box.y - 10), width: Math.round(box.width + 24), height: Math.round(box.height + 20) };
    const durations = { beam: 360, prism: 400, shutter: 320, filament: 460, thread: 440, orbit: 480 };
    let frame = 0;
    for (const [id, ms] of Object.entries(durations)) {
      if (await page.locator(`.sm-radio[value="${id}"]`).isChecked()) await page.locator('.sm-replay').click();
      else await page.locator('.sm-choice').filter({ has: page.locator(`input[value="${id}"]`) }).click();
      const count = frames(Math.ceil((ms / 0.35 + 420) / 40));
      for (let i = 0; i < count; i++) {
        await page.screenshot({ path: out('motion', String(frame++).padStart(4, '0') + '.png'), clip });
        await r.advance(40);
      }
    }
    return r;
  },

  // Random off for 0.6 s, then on: the opening choreography and the waves that follow.
  async random() {
    const r = await open({ dpr: 2 });
    const { page } = r;
    await page.locator('#btnSearchMotion').click();
    await r.advance(1500);
    await r.freezeCss();
    const box = await page.locator('.sm-collection').boundingBox();
    const clip = { x: Math.round(box.x - 16), y: Math.round(box.y - 12), width: Math.round(box.width + 32), height: Math.round(box.height + 24) };
    await r.record(path.join(OUT, 'random'), { frames: frames(165), fps: 25, clip, before: async i => { if (i === Math.min(15, frames(165) - 1)) await page.locator('.sm-random').click(); } });
    return r;
  },

  // The main card in both home materials, and a 4× macro of its upper-left rim.
  async glass() {
    const r = await open({ dpr: 2 });
    const { page } = r;
    await r.advance(1000);
    const card = await page.locator('.page > .card').boundingBox();
    const clip = { x: card.x - 24, y: card.y - 24, width: card.width + 48, height: card.height + 48 };
    for (const material of ['warm', 'classic']) {
      await page.evaluate(material => { document.documentElement.dataset.homeGlass = material; }, material);
      await r.advance(400);
      await page.screenshot({ path: out('glass-' + material + '.png'), clip });
    }
    await r.close();
    const macro = await open({ dpr: 4 });
    await macro.advance(1000);
    await macro.page.evaluate(() => { document.documentElement.dataset.homeGlass = 'warm'; });
    await macro.page.mouse.move(1500, 1020);
    await macro.advance(700);
    await macro.page.screenshot({ path: out('glass-macro.png'), clip: { x: card.x - 18, y: card.y - 18, width: 430, height: 230 } });
    return macro;
  },

  // One simulated week: Lueurs summoned day by day, Drive in cruise and boosted sessions, a few
  // hand drags and arrow-key nudges. Only time is simulated; every record comes from the product.
  async week() {
    const rand = prng(20261017);
    const start = new Date('2026-10-11T08:40:00+01:00');
    const r = await open({ dpr: 1, time: start });
    const { page } = r;
    const run = async ms => { for (let left = ms; left > 0; left -= 20000) await page.clock.runFor(Math.min(20000, left)); };
    async function drag() {
      const centers = await page.evaluate(() => Array.from(document.querySelectorAll('.interaction-item'), item => {
        const box = item.getBoundingClientRect();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      }));
      if (!centers.length) return;
      const p = centers[Math.floor(rand() * centers.length)], angle = rand() * Math.PI * 2, length = 80 + rand() * 260;
      await page.mouse.move(p.x, p.y); await page.mouse.down(); await run(40);
      for (let k = 1; k <= 28; k++) { // a slightly curved stroke, the way a finger moves
        const t = k / 28, bend = Math.sin(Math.PI * t) * 40 * (rand() < 0.5 ? -1 : 1);
        await page.mouse.move(p.x + Math.cos(angle) * length * t - Math.sin(angle) * bend, p.y + Math.sin(angle) * length * t + Math.cos(angle) * bend);
        await run(16);
      }
      await page.mouse.up(); await run(300);
    }
    async function nudge() {
      const n = await lueurCount(page); if (!n) return;
      await page.evaluate(i => document.querySelectorAll('.interaction-item')[i].focus(), Math.floor(rand() * n));
      const key = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'][Math.floor(rand() * 4)];
      for (let i = 0; i < 4; i++) { await page.keyboard.press(key); await run(60); }
      await page.evaluate(() => document.activeElement && document.activeElement.blur()); await run(200);
    }
    const plan = [
      [6, [[4, 'on'], [3, 'rage']]], [8, [[5, 'on'], [2, 'off']]], [10, [[4, 'rage'], [4, 'on']]], [12, [[3, 'on'], [5, 'rage']]],
      [12, [[6, 'on'], [2, 'rage']]], [14, [[4, 'rage'], [4, 'on']]], [16, [[5, 'on'], [6, 'rage']]]
    ].slice(0, QUICK ? 1 : 7);
    for (let day = 0; day < plan.length; day++) {
      if (day > 0) {
        const now = await page.evaluate(() => Date.now());
        const next = start.getTime() + day * 86400000 + Math.round(rand() * 90) * 60000;
        if (next > now) await page.clock.fastForward(next - now);
        await run(2000);
      }
      await summon(page, plan[day][0], () => run(300));
      for (let s = 0; s < plan[day][1].length; s++) {
        if (s > 0) { await page.clock.fastForward((5 + Math.round(rand() * 6)) * 3600000); await run(2000); }
        const [minutes, mode] = plan[day][1][s];
        await drive(page, mode, () => run(200));
        for (let slice = 0; slice < (QUICK ? 1 : minutes * 2); slice++) {
          await run(30000);
          if (rand() < 0.42) await drag();
          if (rand() < 0.12) await nudge();
        }
      }
      console.log('  day', day + 1, 'done');
    }
    await drive(page, 'on', () => run(200));
    await run(5000);
    const finalTime = await page.evaluate(() => Date.now());
    const storage = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])));
    fs.writeFileSync(out('week-storage.json'), JSON.stringify({ finalTime, storage }));
    return r;
  },

  // History statistics and the field chronicle after the simulated week; the most active resident is picked.
  async chronicle() {
    const week = JSON.parse(fs.readFileSync(path.join(OUT, 'week-storage.json'), 'utf8'));
    const r = await open({ dpr: 2, viewport: { width: 1560, height: 2400 }, time: new Date(week.finalTime + 45000), storage: week.storage });
    const { page } = r;
    await r.advance(800);
    await longPress(page, 'btnInteraction');
    await r.advance(1200);
    await page.evaluate(() => document.getElementById('btnInteractionStats').click());
    for (let i = 0; i < 10; i++) await r.advance(200);
    await page.evaluate(() => {
      const chips = Array.from(document.querySelectorAll('.stats-roster-chip'));
      const pick = chips.find(chip => chip.classList.contains('is-tone-3')) || chips[0];
      pick.click(); pick.blur();
    });
    for (let i = 0; i < 6; i++) await r.advance(200);
    await page.mouse.move(5, 2390);
    await r.advance(400);
    await page.screenshot({ path: out('chronicle-sheet.png'), clip: await page.locator('#sheet').boundingBox() });
    return r;
  },

  // Focus mode: both sections folded, the card sinks to the visual centre and search takes the stage.
  async focus() {
    const r = await open({ dpr: 2, seed: 11, time: new Date('2026-10-17T21:06:00+01:00') });
    const { page } = r;
    await summon(page, 9, () => page.clock.runFor(250));
    await drive(page, 'off', () => page.clock.runFor(200));
    // Fold whichever sections are open (the factory layout already folds 直达).
    for (const id of ['btnFoldShortcuts', 'btnFoldEntries']) {
      if (await page.locator('#' + id).getAttribute('aria-expanded') === 'true') await page.locator('#' + id).click();
    }
    await page.waitForFunction(() => document.documentElement.dataset.focus === 'on');
    for (let i = 0; i < 6; i++) await page.clock.runFor(250);
    await spread(page);
    await page.mouse.move(1540, 1030);
    await r.freezeCss();
    await r.advance(1200);
    await page.screenshot({ path: out('focus.png') });
    return r;
  },

  // Simulated launch from the search field itself: the first shot flies out and back, then Enter is held for bursts.
  async simulation() {
    const r = await open({ dpr: 2, time: new Date('2026-10-17T21:12:00+01:00') });
    const { page } = r;
    await page.locator('#btnSearchMotion').click();
    await r.advance(1200);
    await page.locator('.sm-simulation').click();
    await page.locator('.sm-random').click(); // every shot a different gesture
    await r.advance(300);
    await page.locator('.sm-done').click();
    await r.advance(900);
    await page.locator('#searchInput').click();
    await page.keyboard.type('念起，光行');
    await r.advance(400);
    await r.freezeCss();
    const clip = { x: 620, y: 296, width: 730, height: 180 };
    await r.record(path.join(OUT, 'simulation'), { frames: frames(190), fps: 25, clip, before: async i => {
      if (i === 8) await page.keyboard.press('Enter');
      if (i === 70) await page.keyboard.down('Enter');
      if (i === 150) await page.keyboard.up('Enter');
    } });
    return r;
  },

  // The motion atelier, full page at 1440 px.
  async atelier() {
    const r = await open({ dpr: 2, viewport: { width: 1440, height: 900 }, path: '/atelier/', clock: false, ready: 'h1' });
    await r.page.waitForTimeout(2500);
    await r.page.screenshot({ path: out('atelier.png'), fullPage: true });
    return r;
  }
};

(async () => {
  const names = process.argv.slice(2);
  const unknown = names.filter(name => !scenes[name]);
  if (!names.length || unknown.length) {
    console.error('Usage: node scripts/capture/scenes.cjs ' + Object.keys(scenes).join(' | ') + (unknown.length ? '\nUnknown: ' + unknown.join(', ') : ''));
    process.exit(2);
  }
  for (const name of names) {
    const started = Date.now();
    console.log(name + '…');
    const r = await scenes[name]();
    if (r.errors.length) { console.error('  page errors:', r.errors); process.exitCode = 1; }
    await r.close();
    console.log('  ' + name + ' done in ' + Math.round((Date.now() - started) / 1000) + ' s');
  }
})().catch(error => { console.error(error); process.exit(1); });
