'use strict';
// 场志 integrity: changing a definition (histogram bins, grid shape) must never lose history.
const test = require('node:test');
const assert = require('node:assert/strict');
const { create, _test: util } = require('../assets/field-store.js');

function memory(seed = {}) {
  const values = structuredClone(seed), writes = [];
  return { values, writes, async get(key, fallback) { return Object.hasOwn(values, key) ? structuredClone(values[key]) : fallback; }, async set(key, value) { writes.push(key); values[key] = structuredClone(value); } };
}
function snapshot(patch) {
  const data = Object.assign(util.blank(), { rev: 3 }, patch);
  return util.encode(data);
}
const DAY = 86400000;

test('an 8-bin legacy histogram is re-projected onto 14 bins with the total exactly preserved', async t => {
  // Legacy edges were [10, 20, 30, 45, 60, 80, 100] px/s.
  const legacy = [5, 3, 0, 7, 0, 2, 0, 1];
  const storage = memory({ [util.keys[0]]: snapshot({ impacts: legacy }) });
  const store = create({ storage, now: () => Date.now(), offsetMinutes: 0 });
  t.after(() => store.destroy());
  await store.ready;
  const impacts = store.getView('all').impacts;
  assert.equal(impacts.length, 14);
  assert.ok(impacts.every(n => Number.isInteger(n) && n >= 0));
  assert.equal(impacts.reduce((a, b) => a + b, 0), legacy.reduce((a, b) => a + b, 0), 'not one count is lost');
  // Identical intervals carry over untouched.
  assert.equal(impacts[0], 5, '[0, 10) → [0, 10)');
  assert.equal(impacts[1], 3, '[10, 20) → [10, 20)');
  // [30, 45) × 7 spreads by overlap: 6/15, 6/15, 3/15 → 2.8, 2.8, 1.4 → largest remainder → 3, 3, 1.
  assert.deepEqual([impacts[4], impacts[5], impacts[6]], [3, 3, 1]);
  // The open-ended legacy tail [100, ∞) lands in the new bucket that starts at 100.
  assert.equal(impacts[10], 1);
  await store.flush();
  assert.ok(storage.writes.length >= 1, 'the migrated shape is written back promptly');
});

test('a residency grid of an older shape is resampled before writing, never written out of bounds', async t => {
  const now = Date.UTC(2026, 9, 17, 12);
  const dayKey = Math.floor(now / DAY);
  const oldGrid = Array.from({ length: 100 }, (_, i) => (i % 7) * 4);
  const storage = memory({ [util.keys[0]]: snapshot({ residency: { d: { [dayKey]: oldGrid }, m: {} } }) });
  const store = create({ storage, now: () => now, offsetMinutes: 0, width: 1560, height: 1040 });
  t.after(() => store.destroy());
  await store.ready;
  store.recordResidency([{ x: 780, y: 200 }, { x: 1500, y: 1000 }], 4);
  const grid = store.getView('today').grid;
  assert.equal(grid.length, util.gridW * util.gridH);
  assert.ok(grid.every(Number.isFinite), 'no holes, no NaN');
  assert.ok(grid[Math.floor(200 / 1040 * 12) * 26 + Math.floor(780 / 1560 * 26)] >= 4, 'the new residency is where it belongs');
  await store.flush();
  const saved = util.decode(storage.values[util.keys[1]]);
  assert.ok(Object.values(saved.residency.d).every(row => row.length === 312 && row.every(Number.isFinite)));
});

test('a corrupt slot falls back to the other one and says so', async t => {
  const good = snapshot({ events: [[Date.now(), 'contact', 3, 7]] });
  const bad = structuredClone(good); bad.data.rev = 9; // newer, but its checksum no longer matches
  const store = create({ storage: memory({ [util.keys[0]]: good, [util.keys[1]]: bad }), now: () => Date.now(), offsetMinutes: 0 });
  t.after(() => store.destroy());
  await store.ready;
  const view = store.getView('7d');
  assert.equal(view.status, 'recovered');
  assert.match(view.message, /已从有效备份恢复/);
  assert.equal(view.events.length, 1);
});

test('a read failure never overwrites history with an empty chronicle', async t => {
  const storage = memory({ [util.keys[0]]: snapshot({ events: [[Date.now(), 'contact', 3, 7]] }) });
  storage.get = async () => { throw new Error('host storage unavailable'); };
  const store = create({ storage, now: () => Date.now(), offsetMinutes: 0 });
  t.after(() => store.destroy());
  await store.ready;
  store.record({ kind: 'contact', a: 1, b: 2, power: 12 });
  assert.equal(await store.flush(), false);
  assert.deepEqual(storage.writes, [], 'nothing was written');
  assert.equal(store.getView('7d').status, 'error');
});
