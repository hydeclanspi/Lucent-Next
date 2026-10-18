'use strict';
// 念起，光行 — every frame of every shipped search motion is a pure function of progress.
// A recording 2D context replays each renderer across the whole timeline.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/assets/search-motion-renderers.js'), 'utf8');
const sandbox = { window: {}, Math, Array, Object, Number, String };
vm.runInNewContext(source, sandbox);
const renderers = sandbox.window.AiraMotionRenderers;
const SHIPPED = ['beam', 'prism', 'shutter', 'filament', 'thread', 'orbit'];
const STEPS = 1200;

function recorder() {
  const calls = [];
  let depth = 0, maxDepth = 0;
  const numeric = [];
  const ctx = {
    font: '', fillStyle: '', strokeStyle: '', globalAlpha: 1, lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', textAlign: 'start', textBaseline: 'alphabetic',
    measureText: text => ({ width: Array.from(String(text)).length * 13 })
  };
  for (const name of ['translate', 'rotate', 'scale', 'transform', 'setTransform', 'moveTo', 'lineTo', 'arc', 'ellipse', 'rect', 'fillText', 'beginPath', 'stroke', 'fill', 'clip', 'clearRect']) {
    ctx[name] = (...args) => {
      for (const value of args) if (typeof value === 'number') numeric.push(value);
      calls.push(name + '(' + args.map(v => typeof v === 'number' ? v.toFixed(6) : String(v)).join(',') + ')@' + ctx.globalAlpha.toFixed(6));
    };
  }
  ctx.save = () => { depth++; maxDepth = Math.max(maxDepth, depth); calls.push('save'); };
  ctx.restore = () => { depth--; calls.push('restore'); };
  return { ctx, calls, numeric, depth: () => depth };
}

function state(text, dark) {
  const glyphs = []; let x = 40;
  for (const char of Array.from(text)) { glyphs.push({ char, x, width: 13 }); x += 13; }
  return { w: 640, h: 160, x: 40, y: 88, tx: 600, ty: 80, text, font: '400 16px sans-serif', fontSize: 16,
    ink: dark ? '#f2f2f2' : '#202428', accent: dark ? '#d2b18a' : '#95734e', light: dark ? '#fff3dc' : '#9b7b52', dark, glyphs,
    textWidth: glyphs.length * 13 };
}

const SAMPLES = [['灵感与犀利并存', false], ['A thought, in flight', true], ['念起 🙂 light', false]];

test('all six shipped motions are registered', () => {
  for (const id of SHIPPED) assert.equal(typeof renderers[id], 'function', id);
});

test(`every renderer stays finite, balanced and deterministic across ${SHIPPED.length * SAMPLES.length * (STEPS + 1)} progress states`, () => {
  for (const id of SHIPPED) {
    for (const [text, dark] of SAMPLES) {
      for (let i = 0; i <= STEPS; i++) {
        const t = i / STEPS;
        const first = recorder(), second = recorder();
        renderers[id](first.ctx, state(text, dark), t);
        renderers[id](second.ctx, state(text, dark), t);
        assert.equal(first.depth(), 0, `${id} save/restore balanced at t=${t}`);
        assert.ok(first.numeric.every(Number.isFinite), `${id} finite coordinates at t=${t}`);
        assert.deepEqual(first.calls, second.calls, `${id} is a pure function of progress at t=${t}`);
      }
    }
  }
});

test('frame 0 shows the typed words; the final frame hands over a clean canvas', () => {
  for (const id of SHIPPED) {
    const start = recorder();
    renderers[id](start.ctx, state('灵感与犀利并存', false), 0);
    const glyphs = start.calls.filter(call => call.startsWith('fillText('));
    assert.ok(glyphs.length >= 1, `${id} starts from the user's own text`);
    const end = recorder();
    renderers[id](end.ctx, state('灵感与犀利并存', false), 1);
    assert.deepEqual(end.calls, [], `${id} leaves nothing behind at t = 1`);
  }
});

test('burst mode (held Enter) draws only light paths, never letters', () => {
  for (const id of SHIPPED) {
    for (let i = 1; i < 40; i++) {
      const r = recorder(), s = state('灵感与犀利并存', false);
      s.burst = true;
      renderers[id](r.ctx, s, i / 40);
      assert.ok(!r.calls.some(call => call.startsWith('fillText(')), `${id} keeps text out of rapid fire`);
    }
  }
});
