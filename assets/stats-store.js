/* Local aggregate statistics. No event log, pointer coordinates or exact action timestamps. */
(function (root, factory) {
  var exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  else root.AiraStatsStore = exported;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  var HOUR = 3600000, DAY = HOUR * 24, LIMIT = 160 * 1024;
  var KEYS = ['interaction.stats.v1.a', 'interaction.stats.v1.b'];
  var SOURCES = { drag: 4, keyboard: 5, manual: 6, add: 7 };
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function blank() { return [0, 0, 101, -1, 0, 0, 0, 0].concat(Array(20).fill(0)); }
  function merge(a, b) {
    a[0] += b[0]; a[1] += b[1]; a[2] = Math.min(a[2], b[2]); a[3] = Math.max(a[3], b[3]);
    for (var i = 4; i < 28; i++) a[i] += b[i];
    return a;
  }
  function boundary(time, unit, offset) {
    var shifted = time + offset * 60000, date = new Date(shifted);
    if (unit === 'h') return Math.floor(shifted / HOUR) * HOUR - offset * 60000;
    if (unit === 'd') return Math.floor(shifted / DAY) * DAY - offset * 60000;
    return Date.UTC(date.getUTCFullYear(), unit === 'y' ? 0 : date.getUTCMonth(), 1) - offset * 60000;
  }
  function end(time, unit, offset) {
    if (unit === 'h') return time + HOUR;
    if (unit === 'd') return time + DAY;
    var date = new Date(time + offset * 60000);
    return Date.UTC(date.getUTCFullYear() + (unit === 'y' ? 1 : 0), date.getUTCMonth() + (unit === 'm' ? 1 : 0), 1) - offset * 60000;
  }
  function bytes(value) {
    var text = typeof value === 'string' ? value : JSON.stringify(value);
    return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(text).length : unescape(encodeURIComponent(text)).length;
  }
  function checksum(text) {
    var value = 2166136261;
    for (var i = 0; i < text.length; i++) { value ^= text.charCodeAt(i); value = Math.imul(value, 16777619); }
    return (value >>> 0).toString(16);
  }
  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(function (key) { return JSON.stringify(key) + ':' + canonical(value[key]); }).join(',') + '}';
    return JSON.stringify(value);
  }
  function encode(data) { return { version: 1, checksum: checksum(canonical(data)), data: data }; }
  function decode(value) {
    if (value == null) return null;
    if (typeof value === 'string') value = JSON.parse(value);
    if (!value || value.version !== 1 || !value.data || checksum(canonical(value.data)) !== value.checksum) throw new Error('Invalid snapshot');
    var data = value.data;
    if (data.v !== 1 || !Number.isSafeInteger(data.rev) || data.rev < 0 || !Number.isInteger(data.offset) || Math.abs(data.offset) > 840 || !Number.isFinite(data.coverageStart) || !Number.isFinite(data.watermark) || !Array.isArray(data.rows)) throw new Error('Invalid header');
    var lastEnd = -Infinity;
    data.rows.forEach(function (row) {
      if (!row || !['h', 'd', 'm', 'y'].includes(row.u) || !Number.isFinite(row.t) || boundary(row.t, row.u, data.offset) !== row.t || !Array.isArray(row.c) || row.c.length !== 28) throw new Error('Invalid bucket');
      if (row.t < lastEnd) throw new Error('Overlapping buckets');
      lastEnd = end(row.t, row.u, data.offset);
      row.c.forEach(function (n, i) { if (!Number.isSafeInteger(n) || (n < 0 && !(i === 3 && n === -1))) throw new Error('Invalid count'); });
      var c = row.c, n = c[0];
      if (c.slice(8).reduce(function (a, b) { return a + b; }, 0) !== n || c[4] + c[5] + c[6] !== n || c[1] > 100 * n || (n && (c[2] > c[3] || c[3] > 100 || c[1] < c[2] * n || c[1] > c[3] * n)) || (!n && (c[2] !== 101 || c[3] !== -1 || c[1] !== 0))) throw new Error('Invalid distribution');
    });
    return copy(data);
  }
  function publicCounts(c) {
    return { n: c[0], sum: c[1], min: c[0] ? c[2] : null, max: c[0] ? c[3] : null,
      mean: c[0] ? c[1] / c[0] : null, drag: c[4], keyboard: c[5], manual: c[6], add: c[7], hist: c.slice(8) };
  }
  function coalesce(rows) {
    var map = new Map();
    rows.forEach(function (row) {
      var key = row.u + row.t;
      if (map.has(key)) merge(map.get(key).c, row.c); else map.set(key, copy(row));
    });
    return Array.from(map.values()).sort(function (a, b) { return a.t - b.t; });
  }
  function compact(data, force) {
    var hourCut = boundary(data.watermark, 'd', data.offset) - 6 * DAY;
    var dayCut = boundary(data.watermark - 365 * DAY, 'm', data.offset);
    var monthCut = boundary(data.watermark - 3653 * DAY, 'y', data.offset);
    data.rows = coalesce(data.rows.map(function (row) {
      var unit = row.u;
      if (unit === 'h' && (row.t < hourCut || force >= 1)) unit = 'd';
      if (unit === 'd' && (row.t < dayCut || force >= 2)) unit = 'm';
      if (unit === 'm' && (row.t < monthCut || force >= 3)) unit = 'y';
      return { u: unit, t: boundary(row.t, unit, data.offset), c: row.c };
    }));
    // Backward clock changes can insert an hour into an already compacted period.
    var out = [];
    data.rows.forEach(function (row) {
      var previous = out[out.length - 1];
      if (previous && row.t < end(previous.t, previous.u, data.offset)) merge(previous.c, row.c);
      else out.push(row);
    });
    data.rows = out;
  }
  function create(options) {
    options = options || {};
    var storage = options.storage, now = options.now || Date.now;
    var offset = Number.isInteger(options.offsetMinutes) ? options.offsetMinutes : -new Date().getTimezoneOffset();
    var data = { v: 1, rev: 0, offset: offset, coverageStart: boundary(now(), 'h', offset), watermark: boundary(now(), 'h', offset), rows: [] };
    var status = 'loading', message = '', loaded = false, pending = [], dirty = false, activeSlot = -1;
    var listeners = new Set(), timer = null, running = null, reading = null, version = 0, recoveryNotice = false;
    function notify() { listeners.forEach(function (fn) { try { fn(); } catch (_) {} }); }
    function fail(text) { status = 'error'; message = text; notify(); }
    function insert(row) {
      data.coverageStart = Math.min(data.coverageStart, row.t);
      data.watermark = Math.max(data.watermark, row.t);
      var existing = data.rows.find(function (item) { return row.t >= item.t && row.t < end(item.t, item.u, data.offset); });
      if (existing) merge(existing.c, row.c); else data.rows.push(row);
    }
    function ingestPending() {
      pending.forEach(function (row) {
        // Only an hourly aggregate is buffered; no per-action timestamp is retained.
        insert({ u: 'h', t: boundary(row.t + HOUR / 2, 'h', data.offset), c: row.c });
      });
      if (pending.length) { dirty = true; pending = []; compact(data); }
    }
    function schedule() {
      if (!timer) timer = setTimeout(function () { timer = null; flush().catch(function () {}); }, 350);
    }
    async function load() {
      if (reading) return reading;
      status = 'loading'; message = ''; notify();
      reading = (async function () {
        var values = await Promise.allSettled(KEYS.map(function (key) { return Promise.resolve().then(function () { return storage.get(key, null); }); }));
        if (values.some(function (r) { return r.status === 'rejected'; })) { fail('历史读取失败，已保留原数据；请重试。'); return; }
        var candidates = [], corrupt = 0;
        values.forEach(function (result, i) { try { var item = decode(result.value); if (item) candidates.push({ data: item, slot: i }); } catch (_) { corrupt++; } });
        if (!candidates.length && corrupt) { fail('历史快照校验失败，尚未覆盖原数据。'); return; }
        if (candidates.length) {
          candidates.sort(function (a, b) { return b.data.rev - a.data.rev; });
          data = candidates[0].data; activeSlot = candidates[0].slot;
        } else { dirty = true; }
        loaded = true; recoveryNotice = corrupt > 0;
        ingestPending();
        data.watermark = Math.max(data.watermark, boundary(now(), 'h', data.offset));
        compact(data);
        status = recoveryNotice ? 'recovered' : 'ready';
        message = recoveryNotice ? '已从有效备份恢复；受损快照中的最新变化可能缺失。' : '';
        notify();
        if (dirty) schedule();
      })().catch(function () { fail('历史读取失败，已保留原数据；请重试。'); }).finally(function () { reading = null; });
      return reading;
    }
    function record(event) {
      if (!event || !Object.prototype.hasOwnProperty.call(SOURCES, event.source)) return;
      var c = blank(), source = SOURCES[event.source];
      if (source !== 7 && (typeof event.light !== 'number' || !Number.isFinite(event.light))) return;
      c[source] = 1;
      if (source !== 7) {
        var p = Math.round(Math.max(0, Math.min(1, event.light)) * 100);
        c[0] = 1; c[1] = p; c[2] = p; c[3] = p; c[8 + Math.min(19, Math.floor(p / 5))] = 1;
      }
      var row = { u: 'h', t: boundary(now(), 'h', loaded ? data.offset : offset), c: c };
      if (!loaded) { pending = coalesce(pending.concat([row])); return; }
      insert(row); compact(data); dirty = true; version++;
      notify(); schedule();
    }
    async function flush() {
      if (timer) { clearTimeout(timer); timer = null; }
      if (!loaded) { if (reading) await reading; if (!loaded) return false; }
      if (running) return running;
      if (!dirty) return true;
      running = (async function () {
        while (dirty) {
          var snap = copy(data), currentVersion = version;
          snap.rev = data.rev + 1;
          compact(snap);
          for (var force = 1; bytes(encode(snap)) > LIMIT && force <= 3; force++) compact(snap, force);
          if (bytes(encode(snap)) > LIMIT) { fail('统计空间暂不足，部分数据尚未保存。'); return false; }
          status = 'saving'; message = ''; notify();
          var slot = activeSlot === 0 ? 1 : 0;
          try { await storage.set(KEYS[slot], encode(snap)); }
          catch (_) { fail('部分统计尚未保存，已保留上次成功快照；请重试。'); return false; }
          activeSlot = slot; data.rev = snap.rev;
          if (version === currentVersion) { data = snap; dirty = false; }
        }
        status = recoveryNotice ? 'recovered' : 'ready';
        message = recoveryNotice ? '已从有效备份恢复；受损快照中的最新变化可能缺失。' : '';
        notify(); return true;
      })().finally(function () { running = null; });
      return running;
    }
    function getView(range) {
      var custom = range && typeof range === 'object' && Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start ? range : null;
      range = custom ? 'custom' : ['today', '7d', '30d', '1y', 'all'].includes(range) ? range : '7d';
      var viewTime = Math.max(now(), data.watermark), unit = range === 'today' || range === '7d' ? 'h' : range === 'all' ? 'm' : 'd';
      var finish = boundary(viewTime, 'd', data.offset) + DAY;
      var start = range === 'today' ? finish - DAY : range === '7d' ? finish - 7 * DAY : range === '30d' ? finish - 30 * DAY : range === '1y' ? finish - 365 * DAY : boundary(data.coverageStart, 'm', data.offset);
      if (custom) { start = custom.start; finish = custom.end; unit = finish - start <= 7 * DAY ? 'h' : finish - start <= 366 * DAY ? 'd' : 'm'; }
      var preferredUnit = unit;
      var rank = { h: 0, d: 1, m: 2, y: 3 };
      data.rows.forEach(function (row) { if (end(row.t, row.u, data.offset) > start && row.t < finish && rank[row.u] > rank[unit]) unit = row.u; });
      if (range === 'all' && (finish - start) / DAY > 365 * 12) unit = 'y';
      start = boundary(start, unit, data.offset); finish = end(boundary(finish - 1, unit, data.offset), unit, data.offset);
      var firstYear = new Date(start + data.offset * 60000).getUTCFullYear();
      var lastYear = new Date(finish + data.offset * 60000).getUTCFullYear();
      var yearStep = unit === 'y' ? Math.max(1, Math.ceil((lastYear - firstYear) / 240)) : 1;
      function chartStart(time) {
        if (unit !== 'y' || yearStep === 1) return boundary(time, unit, data.offset);
        var year = new Date(time + data.offset * 60000).getUTCFullYear();
        return Date.UTC(firstYear + Math.floor((year - firstYear) / yearStep) * yearStep, 0, 1) - data.offset * 60000;
      }
      function chartEnd(time) {
        if (unit !== 'y' || yearStep === 1) return end(time, unit, data.offset);
        return Date.UTC(new Date(time + data.offset * 60000).getUTCFullYear() + yearStep, 0, 1) - data.offset * 60000;
      }
      var buckets = [], lookup = new Map(), totals = blank();
      for (var time = start; time < finish && buckets.length < 1500; time = chartEnd(time)) {
        var bucket = { start: time, end: chartEnd(time), c: blank() };
        lookup.set(time, bucket); buckets.push(bucket);
      }
      data.rows.forEach(function (row) {
        var bucket = lookup.get(chartStart(row.t));
        if (bucket) { merge(bucket.c, row.c); merge(totals, row.c); }
      });
      return { status: status, message: message, offsetMinutes: data.offset, range: range,
        granularity: { h: 'hour', d: 'day', m: 'month', y: 'year' }[unit], intervalYears: yearStep, start: start, end: finish,
        buckets: buckets.map(function (b) { return Object.assign({ start: b.start, end: b.end, observed: loaded && b.end > data.coverageStart && b.start <= viewTime }, publicCounts(b.c)); }),
        totals: publicCounts(totals), coverageStart: data.coverageStart, compacted: unit !== preferredUnit };
    }
    var controller = { record: record, flush: flush, getView: getView,
      subscribe: function (fn) { listeners.add(fn); return function () { listeners.delete(fn); }; },
      retry: async function () { if (!loaded) await load(); return flush(); },
      destroy: function () { if (timer) clearTimeout(timer); listeners.clear(); },
      ready: null };
    controller.ready = load();
    return controller;
  }
  return { create: create, _test: { boundary: boundary, end: end, blank: blank, merge: merge, compact: compact, encode: encode, decode: decode, bytes: bytes, keys: KEYS, limit: LIMIT } };
});
