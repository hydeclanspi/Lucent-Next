'use strict';
// Lueurs (小浮光) engine invariants. These tests call the engine's own pure functions;
// nothing here re-implements the physics.
const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../assets/interaction.js');
const T = api._test;

// Obstacle rectangles measured from the live page at 1560×1040 (top bar, profile, main card, history label).
const RECTS = [
  { left: 160, top: 0, right: 1400, bottom: 76 }, { left: 200, top: 359, right: 304, bottom: 463 },
  { left: 200, top: 479, right: 436, bottom: 523 }, { left: 200, top: 535, right: 358, bottom: 560 },
  { left: 200, top: 574, right: 431, bottom: 601 }, { left: 200, top: 616, right: 477, bottom: 641 },
  { left: 200, top: 653, right: 520, bottom: 679 }, { left: 604, top: 303, right: 1360, bottom: 736 },
  { left: 1168, top: 201, right: 1301, bottom: 244 }
];
const geometry = T.makeGeometry(1560, 1040, RECTS);
const sites = T.safeSites(geometry);

// Small deterministic PRNG so failures are reproducible.
function prng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const momentum = (...bodies) => bodies.reduce((p, b) => ({ x: p.x + b.vx, y: p.y + b.vy }), { x: 0, y: 0 });
const close = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

test('free collisions conserve momentum and reverse the normal velocity by the restitution', () => {
  const rand = prng(7);
  for (let i = 0; i < 2000; i++) {
    const angle = rand() * Math.PI * 2, nx = Math.cos(angle), ny = Math.sin(angle);
    const a = { vx: (rand() - .5) * 300, vy: (rand() - .5) * 300 }, b = { vx: (rand() - .5) * 300, vy: (rand() - .5) * 300 };
    const before = momentum(a, b), approach = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    T.resolveImpact(a, b, nx, ny, false, 12);
    const after = momentum(a, b), relative = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    assert.ok(close(before.x, after.x) && close(before.y, after.y), 'momentum is conserved');
    if (approach > 0) assert.ok(close(relative, -T.RESTITUTION * approach), 'normal velocity reverses by e = 0.64');
    else assert.ok(close(relative, approach), 'separating pairs are left alone');
  }
});

test('a held lens is kinematic: it pushes with the chosen strength and never recoils', () => {
  const held = { vx: 40, vy: 0 }, other = { vx: 0, vy: 0 };
  T.resolveImpact(held, other, 1, 0, true, 3);
  assert.deepEqual(held, { vx: 40, vy: 0 });
  assert.ok(close(other.vx, 40 * (1 + T.RESTITUTION) * 3));
});

test('natural contacts top up only slow encounters, to a strength- and crowd-dependent separation', () => {
  for (const [neighbors, share] of [[2, .30], [3, .36], [4, .42], [7, .42]]) assert.ok(close(T.naturalResponse(12, neighbors).share, share));
  // A slow touch is lifted to exactly the target separating speed; momentum stays balanced.
  const a = { vx: 2, vy: 0 }, b = { vx: 0, vy: 0 }, before = momentum(a, b);
  assert.equal(T.resolveNaturalImpact(a, b, 1, 0, 12, 2, true), true);
  assert.ok(close(b.vx - a.vx, T.naturalResponse(12, 2).separation));
  assert.ok(close(momentum(a, b).x, before.x));
  // A fast chain is never multiplied: no extra energy once already separating faster than the target.
  const c = { vx: 300, vy: 0 }, d = { vx: 0, vy: 0 };
  assert.equal(T.resolveNaturalImpact(c, d, 1, 0, 12, 2, true), false);
});

test('an FSD strike conserves momentum and its motor impulse is bounded', () => {
  for (const closing of [10, 80, 240, 600]) {
    const driver = { vx: closing, vy: 0 }, target = { vx: 0, vy: 0 }, before = momentum(driver, target);
    T.resolveAutoImpact(driver, target, 1, 0, 24);
    const motor = Math.min(T.AUTO.kickLimit, closing * 23 * .4);
    assert.ok(close(momentum(driver, target).x, before.x) || Math.hypot(target.vx, target.vy) >= T.MAX_IMPACT_SPEED - 1e-9);
    assert.ok(target.vx <= closing * (1 + T.RESTITUTION) * .5 + motor + 1e-9);
  }
});

test('speeds are capped at 640 px/s and non-finite velocities are zeroed', () => {
  const fast = { vx: 3000, vy: 4000 };
  T.limitVelocity(fast);
  assert.ok(close(Math.hypot(fast.vx, fast.vy), T.MAX_IMPACT_SPEED));
  assert.ok(close(fast.vy / fast.vx, 4 / 3), 'direction is preserved');
  const broken = { vx: NaN, vy: 1 };
  T.limitVelocity(broken);
  assert.deepEqual(broken, { vx: 0, vy: 0 });
});

test('sub-stepped motion never tunnels: every step is ≤ 4 px and every position stays inside the region', () => {
  const rand = prng(11);
  for (let i = 0; i < 300; i++) {
    const start = sites[Math.floor(rand() * sites.length)];
    const body = { x: start.x, y: start.y };
    const target = { x: rand() * 1560, y: rand() * 1040 };
    let previous = { x: body.x, y: body.y };
    T.advance(body, target, geometry, next => {
      assert.ok(Math.hypot(next.x - previous.x, next.y - previous.y) <= 4 + 1e-9, 'step length');
      assert.ok(geometry.valid(next), 'never enters an excluded area');
      previous = next;
      return true;
    });
    assert.ok(geometry.valid(body));
  }
});

test('the hand-drawn region resolves to one connected chamber of safe sites', () => {
  assert.ok(sites.length >= 300, `found ${sites.length} sites`);
  assert.ok(sites.every(site => geometry.valid(site)));
  const key = s => s.gx + ',' + s.gy, byKey = new Map(sites.map(s => [key(s), s]));
  const seen = new Set([key(sites[0])]), queue = [sites[0]];
  while (queue.length) {
    const s = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = byKey.get((s.gx + dx) + ',' + (s.gy + dy));
      if (n && !seen.has(key(n)) && geometry.valid({ x: (s.x + n.x) / 2, y: (s.y + n.y) / 2 })) { seen.add(key(n)); queue.push(n); }
    }
  }
  assert.equal(seen.size, sites.length);
});

test('FSD routes are breadth-first paths whose every leg has line of sight', () => {
  const navigation = T.navigationGrid(sites, geometry), rand = prng(23);
  for (let i = 0; i < 120; i++) {
    const a = sites[Math.floor(rand() * sites.length)], b = sites[Math.floor(rand() * sites.length)];
    const path = T.routeBetween(a, b, navigation);
    assert.ok(path.length > 0, 'a path exists inside one chamber');
    let from = a;
    for (const waypoint of path) { assert.ok(T.clearRoute(from, waypoint, geometry), 'visible leg'); from = waypoint; }
    assert.deepEqual(path[path.length - 1], { x: b.x, y: b.y });
  }
});

test('the probability model starts continuous, stays bounded and integrates the true winding angle', () => {
  const other = { x: 700, y: 200 }, start = { x: 760, y: 200 };
  for (const base of [0, .05, .5, .95, 1]) {
    const model = T.startModel(base, start, other, geometry);
    assert.equal(T.modelProbability(model, start, other), base, 'no jump before the hand moves');
  }
  const model = T.startModel(.5, start, other, geometry);
  for (let k = 1; k <= 360; k++) {
    const a = k * Math.PI / 180;
    T.sampleModel(model, { x: other.x + 60 * Math.cos(a), y: other.y + 60 * Math.sin(a) }, other);
  }
  assert.ok(close(model.angle, 2 * Math.PI, 1e-9), 'one orbit accumulates exactly 2π');
  const far = T.modelProbability(T.startModel(.5, sites[0], other, geometry), sites[sites.length - 1], other);
  assert.ok(far >= .15 && far <= .85, 'a single gesture moves the ratio by at most ±0.35');
});

test('the invisible terrain leans one way but stays smooth', () => {
  let left = 0, right = 0, n = 0, steepest = 0;
  for (const s of sites) {
    const u = (s.x - geometry.bounds.left) / geometry.span;
    if (u < .2) { left += T.potential(s, geometry); n++; }
    if (u > .8) right += T.potential(s, geometry);
    const dx = T.potential({ x: s.x + 1, y: s.y }, geometry) - T.potential(s, geometry);
    const dy = T.potential({ x: s.x, y: s.y + 1 }, geometry) - T.potential(s, geometry);
    steepest = Math.max(steepest, Math.hypot(dx, dy));
  }
  assert.ok(right > left, 'the main slope runs left to right');
  // Analytic bound of the field's gradient is ≈ 0.0027 per pixel: a 100 px drag moves the terrain term by < 0.3.
  assert.ok(steepest < .003, `no cliff: steepest step ${steepest.toFixed(5)} per pixel`);
});

test('placement — "落子与星座" — punishes deserts and crowding, not distance for its own sake', () => {
  const placed = [{ x: 288, y: 168 }, { x: 264, y: 168 }, { x: 288, y: 192 }];
  const weights = T.placementWeights(sites, placed, 1, null, sites);
  assert.ok(weights.every(w => Number.isFinite(w) && w > 0), 'every legal site keeps a chance');
  const best = Math.max(...weights);
  const nearest = sites.map((s, i) => ({ w: weights[i], d: Math.min(...placed.map(p => Math.hypot(p.x - s.x, p.y - s.y))) }));
  assert.ok(nearest.filter(o => o.d < 40).every(o => o.w < best * .01), 'piling onto a cluster is a weak bet');
  const desertFill = sites.map((s, i) => ({ s, w: weights[i] })).filter(o => o.s.x > 600 && o.s.x < 900);
  assert.ok(Math.max(...desertFill.map(o => o.w)) === best, 'the strongest pull is toward the largest desert');
  // With nothing placed, the upper band earns a plateau bonus over the sunken channel.
  const empty = T.placementWeights(sites, [], 1, null, sites);
  assert.ok(Math.max(...empty) / Math.min(...empty) > 1.9);
});

test('driver line-ups: at least one in five, at most half; boost triples and may take the field', () => {
  for (let n = 1; n <= 49; n++) {
    const normal = T.autoBounds(n), rage = T.rageBounds(n);
    assert.equal(normal.lower, Math.max(1, Math.ceil(n / 5)));
    assert.equal(normal.upper, Math.max(normal.lower, Math.floor(n / 2)));
    assert.equal(rage.lower, Math.min(n, normal.lower * 3));
    assert.equal(rage.upper, n);
  }
  assert.deepEqual(T.autoBounds(10), { lower: 2, upper: 5 });
  assert.deepEqual(T.rageBounds(10), { lower: 6, upper: 10 });
});

test('slider curves: fine control where people actually stay', () => {
  const { count, motion, collision } = api;
  for (let n = 0; n <= 49; n++) assert.equal(count.fromSlider(count.toSlider(n)), n);
  assert.equal(count.fromSlider(500), 8, 'the middle of the track is 8 lenses, not 24');
  assert.deepEqual([motion.fromSlider(0), motion.fromSlider(600), motion.fromSlider(1200)], [.25, 2, 16]);
  assert.deepEqual([collision.fromSlider(0), collision.fromSlider(1000)], [1, 24]);
  // Random strength is log-uniform: each multiplicative band gets equal room.
  assert.deepEqual([collision.draw(24, 0), collision.draw(12, .5), collision.draw(24, 1)], [1, 3.5, 24]);
});
