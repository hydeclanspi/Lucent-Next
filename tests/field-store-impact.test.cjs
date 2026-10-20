'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create, _test: util } = require('../src/assets/field-store.js');
const legacy = require('../src/assets/field-store.js');
function memory(seed = {}) {
  const values = structuredClone(seed), writes = [];
  return { values, writes, async get(key, fallback) { return Object.hasOwn(values, key) ? structuredClone(values[key]) : fallback; }, async set(key, value) { writes.push(key); values[key] = structuredClone(value); } };
}
async function fixture(t, storage = memory()) {
  const store = create({ storage, now: () => Date.now(), offsetMinutes: 0 });
  t.after(() => store.destroy()); await store.ready;
  return { store, storage };
}
test('relative speed lands in the right bucket and keeps the strongest impact', async t => {
  const { store } = await fixture(t);
  store.record({ kind: 'contact', a: 3, b: 7, power: 5 });
  store.record({ kind: 'contact', a: 3, b: 7, power: 9.9 });
  store.record({ kind: 'contact', a: 4, b: 9, power: 10 });
  store.record({ kind: 'push', a: 4, b: 9, power: 44.5 });
  store.record({ kind: 'autoHit', a: 11, b: 2, power: 101 });
  const view = store.getView('7d');
  assert.deepEqual(view.impacts, [2, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
  assert.deepEqual(view.impactEdges, [10, 20, 25, 30, 36, 42, 50, 60, 75, 100, 140, 220, 420]);
  assert.deepEqual(view.impactPeak.slice(0, 3), [101, 11, 2]);
  assert.ok(view.impactPeak[3] > 0, 'the peak carries a timestamp');
});
test('only physical collisions count: encounters, relays and missing speeds stay out', async t => {
  const { store } = await fixture(t);
  store.record({ kind: 'bump', a: 3, b: 7, power: 90 });
  store.record({ kind: 'dodge', a: 3, b: 7, power: 90 });
  store.record({ kind: 'relay', a: 3, b: 7, power: 90 });
  store.record({ kind: 'contact', a: 3, b: 7 });
  store.record({ kind: 'autoHit', a: 3, b: 7, power: -4 });
  const view = store.getView('7d');
  assert.deepEqual(view.impacts, new Array(14).fill(0));
  assert.equal(view.impactPeak[0], 0);
});
test('a hand push records its speed and counts one Manual strike, nothing else', async t => {
  const { store } = await fixture(t);
  const before = store.getView('7d').profiles[6];
  store.record({ kind: 'push', a: 7, b: 12, power: 63 });
  const view = store.getView('7d');
  assert.deepEqual(view.impacts, [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]);
  assert.deepEqual(view.profiles[6], Object.assign({}, before, { manual: before.manual + 1 }), 'only Manual moves; bump / taken / dodge stay untouched');
  assert.equal(view.totals.manual, 1);
  assert.equal(view.pairs.length, 0, 'no pair record is created');
});
test('a thrown or nudged Lueur that strikes another counts as Manual too', async t => {
  const { store } = await fixture(t);
  store.record({ kind: 'manual', a: 7, b: 12, power: 30 });
  const view = store.getView('7d');
  assert.equal(view.profiles[6].manual, 1);
  assert.equal(view.profiles[11].taken, 0, 'the struck Lueur is not charged with a contact');
  assert.equal(view.impacts.reduce((sum, n) => sum + n, 0), 1, 'its speed joins the impact histogram');
});
test('the histogram survives a save/load round trip', async t => {
  const storage = memory();
  const first = await fixture(t, storage);
  first.store.record({ kind: 'contact', a: 5, b: 6, power: 42.4 });
  first.store.record({ kind: 'autoHit', a: 5, b: 6, power: 88 });
  await first.store.flush(); first.store.destroy();
  const { store } = await fixture(t, storage);
  const view = store.getView('7d');
  assert.equal(view.status, 'ready');
  assert.deepEqual(view.impacts, [0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0]);
  assert.deepEqual(view.impactPeak.slice(0, 3), [88, 5, 6]);
});
test('a 4.0.12 snapshot without the histogram still loads and starts counting', async t => {
  const values = {};
  const previous = legacy.create({ storage: { async get(key, fallback) { return Object.hasOwn(values, key) ? structuredClone(values[key]) : fallback; }, async set(key, value) { values[key] = structuredClone(value); } }, now: () => Date.now(), offsetMinutes: 0 });
  await previous.ready;
  previous.record({ kind: 'contact', a: 3, b: 7 });
  previous.record({ kind: 'bump', a: 3, b: 7 });
  await previous.flush(); previous.destroy();
  assert.ok(values['interaction.field.v1.a'], 'the legacy snapshot exists');
  const { store } = await fixture(t, memory(values));
  const view = store.getView('7d');
  assert.equal(view.status, 'ready');
  assert.deepEqual(view.impacts, new Array(14).fill(0));
  assert.equal(view.totals.contact, 1);
  store.record({ kind: 'contact', a: 3, b: 7, power: 30 });
  assert.deepEqual(store.getView('7d').impacts, [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  await store.flush();
  assert.equal(store.getView('7d').status, 'ready');
});
test('bucket edges are half-open and the last bucket is open ended', () => {
  assert.deepEqual(util.impactEdges, [10, 20, 25, 30, 36, 42, 50, 60, 75, 100, 140, 220, 420]);
  assert.equal(util.impactBucket(0), 0);
  assert.equal(util.impactBucket(9.9), 0);
  assert.equal(util.impactBucket(10), 1);
  assert.equal(util.impactBucket(19.9), 1);
  assert.equal(util.impactBucket(20), 2);
  assert.equal(util.impactBucket(41.9), 5);
  assert.equal(util.impactBucket(42), 6);
  assert.equal(util.impactBucket(219.9), 11);
  assert.equal(util.impactBucket(220), 12);
  assert.equal(util.impactBucket(419.9), 12);
  assert.equal(util.impactBucket(420), 13);
  assert.equal(util.impactBucket(640), 13);
});
