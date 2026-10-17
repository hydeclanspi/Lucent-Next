'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create, _test: util } = require('../assets/stats-store.js');
const HOUR = 3600000, DAY = 24 * HOUR, start = Date.UTC(2026, 9, 8, 9);
function memory(seed = {}) {
  const values = structuredClone(seed), writes = [];
  return { values, writes, async get(key, fallback) { return Object.hasOwn(values, key) ? structuredClone(values[key]) : fallback; }, async set(key, value) { writes.push(key); values[key] = structuredClone(value); } };
}
async function fixture(t, settings = {}) {
  let time = settings.time || start;
  const storage = settings.storage || memory();
  const store = create({ storage, now: () => time, offsetMinutes: settings.offset || 0 });
  t.after(() => store.destroy()); await store.ready;
  return { store, storage, setTime(next) { time = next; } };
}
test('only aggregate buckets persist; endpoints and source counts remain exact', async t => {
  const { store, storage } = await fixture(t);
  store.record({ source: 'drag', light: 0 }); store.record({ source: 'manual', light: 1 }); store.record({ source: 'add' });
  await store.flush();
  const v = store.getView('today');
  assert.equal(v.totals.n, 2); assert.equal(v.totals.mean, 50); assert.equal(v.totals.hist[0], 1); assert.equal(v.totals.hist[19], 1); assert.equal(v.totals.add, 1);
  const data = Object.values(storage.values).sort((a, b) => b.data.rev - a.data.rev)[0].data;
  assert.deepEqual(Object.keys(data), ['v', 'rev', 'offset', 'coverageStart', 'watermark', 'rows']);
  assert.equal(data.rows.length, 1); assert.deepEqual(Object.keys(data.rows[0]), ['u', 't', 'c']);
  assert.equal(data.rows[0].t % HOUR, 0); util.decode(util.encode(data));
});
test('rollups preserve weighted probability, min/max, bins and every activity', async t => {
  const { store, setTime } = await fixture(t);
  for (let i = 0; i < 9; i++) store.record({ source: 'drag', light: .2 });
  setTime(start + HOUR); store.record({ source: 'keyboard', light: 1 });
  setTime(start + 12 * DAY); store.record({ source: 'add' });
  setTime(start + 440 * DAY); store.record({ source: 'manual', light: .8 });
  await store.flush();
  const v = store.getView('all');
  assert.equal(v.totals.n, 11); assert.equal(v.totals.sum, 360); assert.equal(v.totals.mean, 360 / 11);
  assert.equal(v.totals.min, 20); assert.equal(v.totals.max, 100); assert.equal(v.totals.hist[4], 9); assert.equal(v.totals.add, 1);
});
test('restart restores data; empty periods and pre-coverage buckets are distinct', async t => {
  const { store, storage } = await fixture(t);
  store.record({ source: 'drag', light: .65 }); await store.flush();
  const next = await fixture(t, { storage, time: start + 2 * HOUR });
  const v = next.store.getView('today');
  assert.equal(v.totals.n, 1); assert.equal(v.buckets[8].observed, false); assert.equal(v.buckets[10].observed, true); assert.equal(v.buckets[10].mean, null); assert.equal(v.buckets[10].drag, 0);
});
test('native JSON key reordering does not falsely corrupt the checksum', async t => {
  const { store, storage } = await fixture(t); store.record({ source: 'drag', light: .5 }); await store.flush();
  function reorder(value) { if (Array.isArray(value)) return value.map(reorder); if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).reverse().map(k => [k, reorder(value[k])])); return value; }
  Object.keys(storage.values).forEach(key => { storage.values[key] = reorder(storage.values[key]); });
  const next = await fixture(t, { storage }); assert.equal(next.store.getView('all').totals.n, 1); assert.equal(next.store.getView('all').status, 'ready');
});
test('pending operations across an hour survive delayed initialization once', async t => {
  const base = memory(); let unblock;
  const gate = new Promise(resolve => { unblock = resolve; }); let time = start;
  const store = create({ storage: { get: async (...args) => { await gate; return base.get(...args); }, set: base.set.bind(base) }, now: () => time, offsetMinutes: 0 }); t.after(() => store.destroy());
  store.record({ source: 'drag', light: .2 }); time += HOUR; store.record({ source: 'drag', light: .8 });
  unblock(); await store.ready; await store.flush();
  assert.equal(store.getView('today').buckets[9].n, 1); assert.equal(store.getView('today').buckets[10].n, 1); assert.equal(store.getView('all').totals.n, 2);
});
test('native read failure does not overwrite existing history; retry merges pending', async t => {
  const base = memory(); let failed = true;
  const { store } = await fixture(t, { storage: { get: (...args) => failed ? Promise.reject(Error('offline')) : base.get(...args), set: base.set.bind(base) } });
  store.record({ source: 'drag', light: .7 }); await store.flush();
  assert.equal(store.getView('today').status, 'error'); assert.equal(base.writes.length, 0);
  failed = false; await store.retry(); assert.equal(store.getView('all').totals.n, 1); assert.ok(base.writes.length);
});
test('failed save keeps successful snapshot; retry cannot double count', async t => {
  const base = memory(); let failed = false;
  const { store } = await fixture(t, { storage: { get: base.get.bind(base), set: (...args) => failed ? Promise.reject(Error('quota')) : base.set(...args) } });
  store.record({ source: 'drag', light: .4 }); await store.flush();
  const before = structuredClone(base.values); failed = true;
  store.record({ source: 'manual', light: .6 }); assert.equal(await store.flush(), false); assert.deepEqual(base.values, before); assert.equal(store.getView('all').status, 'error');
  failed = false; await store.retry(); await store.retry(); assert.equal(store.getView('all').totals.n, 2);
});
test('two slots recover the last valid snapshot and report lost newest data', async t => {
  const { store, storage } = await fixture(t);
  store.record({ source: 'drag', light: .3 }); await store.flush(); store.record({ source: 'drag', light: .7 }); await store.flush();
  const newest = Object.keys(storage.values).sort((a, b) => storage.values[b].data.rev - storage.values[a].data.rev)[0]; storage.values[newest].checksum = 'broken';
  const restored = await fixture(t, { storage });
  assert.equal(restored.store.getView('all').totals.n, 1); assert.equal(restored.store.getView('all').status, 'recovered');
});
test('both corrupted snapshots never become an empty writable history', async t => {
  const storage = memory({ [util.keys[0]]: { checksum: 'invalid' }, [util.keys[1]]: '{oops' });
  const { store } = await fixture(t, { storage }); store.record({ source: 'drag', light: .6 }); await store.flush();
  assert.equal(storage.writes.length, 0); assert.equal(store.getView('all').status, 'error');
});
test('serialized asynchronous saves preserve operations made during a write', async t => {
  const base = memory(); let release, blocked = true;
  const gate = new Promise(resolve => { release = resolve; });
  const { store } = await fixture(t, { storage: { get: base.get.bind(base), set: async (...args) => { if (blocked) await gate; return base.set(...args); } } });
  store.record({ source: 'drag', light: .1 }); const saving = store.flush(); await Promise.resolve();
  store.record({ source: 'manual', light: .9 }); blocked = false; release(); await saving;
  const next = await fixture(t, { storage: base }); assert.equal(next.store.getView('all').totals.n, 2); assert.equal(next.store.getView('all').totals.mean, 50);
});
test('fixed half-hour timezone and backward clock do not overlap rolled-up buckets', async t => {
  const { store, storage, setTime } = await fixture(t, { offset: 330 });
  store.record({ source: 'drag', light: .3 }); setTime(start + 500 * DAY); store.record({ source: 'drag', light: .7 });
  setTime(start); store.record({ source: 'drag', light: .5 }); await store.flush();
  const restored = await fixture(t, { storage, offset: -60, time: start + 500 * DAY });
  assert.equal(restored.store.getView('all').offsetMinutes, 330); assert.equal(restored.store.getView('all').totals.n, 3);
});
test('drilldown uses retained resolution and never invents fine history', async t => {
  const { store, setTime } = await fixture(t);
  store.record({ source: 'drag', light: .4 });
  let v = store.getView({ start: start - 9 * HOUR, end: start + 15 * HOUR }); assert.equal(v.granularity, 'hour'); assert.equal(v.totals.n, 1);
  setTime(start + 400 * DAY); store.record({ source: 'drag', light: .6 });
  v = store.getView({ start: start - 9 * HOUR, end: start + 15 * HOUR }); assert.equal(v.granularity, 'month'); assert.equal(v.totals.n, 1);
});
test('decades of daily use retain totals within the aggregate byte budget', async t => {
  const { store, storage, setTime } = await fixture(t);
  for (let i = 0; i < 365 * 15; i++) { setTime(start + i * DAY); store.record({ source: 'drag', light: (i % 101) / 100 }); }
  await store.flush();
  assert.equal(store.getView('all').totals.n, 365 * 15);
  Object.values(storage.values).forEach(snapshot => { assert.ok(util.bytes(snapshot) <= util.limit); util.decode(snapshot); });
  assert.ok(Object.values(storage.values).reduce((sum, v) => sum + util.bytes(v), 0) <= 320 * 1024);
});
test('extreme forward clock change keeps all totals visible with bounded time-axis points', async t => {
  const { store, setTime } = await fixture(t); store.record({ source: 'drag', light: .25 });
  setTime(Date.UTC(9999, 0, 1)); store.record({ source: 'drag', light: .75 });
  const v = store.getView('all'); assert.equal(v.totals.n, 2); assert.ok(v.buckets.length <= 240); assert.ok(v.intervalYears > 1);
});
