/* Field chronicle: numbered lenses, their relationships, drive time and residency heat.
   Same integrity discipline as the probability store; separate keys and budget. */
(function (root, factory) {
  var exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  else root.AiraFieldStore = exported;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  var DAY = 86400000, LIMIT = 96 * 1024, EVENT_CAP = 200, GRID_W = 26, GRID_H = 12;
  var KEYS = ['interaction.field.v1.a', 'interaction.field.v1.b'];
  var KINDS = { contact: 1, bump: 1, dodge: 1, charge: 1, miss: 1, autoHit: 1, relay: 1, pilot: 1, push: 1, manual: 1 };
  // 相对碰撞速度的分档（像素/秒）：开口向上的曲线——底部一档宽、高频段 5 一档、往上逐步放大、顶端开口。
  var IMPACT_EDGES = [10, 20, 25, 30, 36, 42, 50, 60, 75, 100, 140, 220, 420], IMPACT_BUCKETS = IMPACT_EDGES.length + 1;
  function blank() {
    return { v: 1, rev: 0, offset: 0, profiles: {}, pairs: {}, events: [], drive: {}, social: {}, residency: { d: {}, m: {} },
      impacts: new Array(IMPACT_BUCKETS).fill(0), impactPeak: [0, 0, 0, 0] };
  }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
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
    if (data.v !== 1 || !Number.isSafeInteger(data.rev) || data.rev < 0 || typeof data.profiles !== 'object' || typeof data.pairs !== 'object'
      || !Array.isArray(data.events) || typeof data.drive !== 'object' || typeof data.social !== 'object'
      || !data.residency || typeof data.residency.d !== 'object' || typeof data.residency.m !== 'object') throw new Error('Invalid header');
    return copy(data);
  }
  function dayKey(time, offset) { return Math.floor((time + offset * 60000) / DAY); }
  function monthKey(time, offset) { var d = new Date(time + offset * 60000); return d.getUTCFullYear() * 12 + d.getUTCMonth(); }
  function prune(data) {
    var dayKeys = Object.keys(data.drive).map(Number).sort(function (a, b) { return a - b; });
    if (dayKeys.length > 450) dayKeys.slice(0, dayKeys.length - 450).forEach(function (key) { delete data.drive[key]; delete data.social[key]; });
    var resDays = Object.keys(data.residency.d).map(Number).sort(function (a, b) { return a - b; });
    if (resDays.length > 40) resDays.slice(0, resDays.length - 40).forEach(function (key) { delete data.residency.d[key]; });
    var resMonths = Object.keys(data.residency.m).map(Number).sort(function (a, b) { return a - b; });
    if (resMonths.length > 18) resMonths.slice(0, resMonths.length - 18).forEach(function (key) { delete data.residency.m[key]; });
    if (data.events.length > EVENT_CAP) data.events = data.events.slice(data.events.length - EVENT_CAP);
  }
  // 把任意形状的驻留数组重采样到当前网格：形状一致就原样返回，否则按比例摊开，
  // 宁可承认"旧热区只保留大致分布"，也不写出越界的空洞。
  function currentGrid(values) {
    if (Array.isArray(values) && values.length === GRID_W * GRID_H) return values;
    var source = Array.isArray(values) ? values : [], out = new Array(GRID_W * GRID_H).fill(0);
    for (var i = 0; i < out.length; i++) {
      var from = Math.floor(i * source.length / out.length);
      var to = Math.max(from + 1, Math.floor((i + 1) * source.length / out.length));
      var sum = 0, cells = 0;
      for (var j = from; j < to && j < source.length; j++) if (Number.isFinite(source[j])) { sum += source[j]; cells++; }
      out[i] = cells ? Math.round(sum / cells) : 0;
    }
    return out;
  }
  function impactBucket(power) {
    for (var i = 0; i < IMPACT_EDGES.length; i++) if (power < IMPACT_EDGES[i]) return i;
    return IMPACT_BUCKETS - 1;
  }
  // 4.0.13–4.0.15 用的是这 7 条边界（8 档，像素/秒）。老快照按区间重叠摊进当前档位，
  // 而不是整张清零：清零会让整段历史静默消失，峰值却还留着，面板上看起来自相矛盾。
  var LEGACY_IMPACT_EDGES = [10, 20, 30, 45, 60, 80, 100];
  function uniformEdges(count) {
    var edges = [];
    for (var i = 1; i < count; i++) edges.push(i / count);
    return edges;
  }
  function isImpactCounts(values) {
    return Array.isArray(values) && values.length > 0 && values.every(function (n) { return Number.isSafeInteger(n) && n >= 0; });
  }
  // 把 values 按区间重叠摊到 targetEdges 定义的档位上；两边的最后一段都视为无上界。
  function redistributeCounts(values, sourceEdges, targetEdges) {
    var out = new Array(targetEdges.length + 1).fill(0);
    values.forEach(function (count, index) {
      if (!count) return;
      var low = index === 0 ? 0 : sourceEdges[index - 1];
      var high = index < sourceEdges.length ? sourceEdges[index] : Infinity;
      if (!Number.isFinite(high)) {
        var merged = false;
        for (var t = 0; t < out.length && !merged; t++) if ((t === 0 ? 0 : targetEdges[t - 1]) === low) { out[t] += count; merged = true; }
        if (!merged) out[out.length - 1] += count;
        return;
      }
      var span = high - low;
      for (var j = 0; j < out.length; j++) {
        var floorEdge = j === 0 ? 0 : targetEdges[j - 1];
        var ceilEdge = j < targetEdges.length ? targetEdges[j] : Infinity;
        var overlap = Math.min(high, ceilEdge) - Math.max(low, floorEdge);
        if (overlap > 0) out[j] += count * overlap / span;
      }
    });
    var target = Math.round(out.reduce(function (a, b) { return a + b; }, 0));
    var rounded = out.map(function (n) { return Math.floor(n); });
    // 最大余额法补足差额：小数部分大的先补，保证总量与摊开的比例都说得通。
    var order = out.map(function (n, i) { return { index: i, fraction: n - Math.floor(n) }; })
      .sort(function (a, b) { return b.fraction - a.fraction || a.index - b.index; });
    var short = target - rounded.reduce(function (a, b) { return a + b; }, 0);
    for (var k = 0; k < short && k < order.length; k++) rounded[order[k].index] += 1;
    return rounded;
  }
  // 旧快照没有这两项，读回来时补成空表；档位定义变过时把旧分布重投影进来。返回是否改写过。
  function normalizeImpact(data) {
    var values = isImpactCounts(data.impacts) ? data.impacts : null, migrated = false;
    if (values && values.length === IMPACT_BUCKETS) data.impacts = values.slice();
    else if (values) {
      data.impacts = redistributeCounts(values, values.length === LEGACY_IMPACT_EDGES.length + 1 ? LEGACY_IMPACT_EDGES : uniformEdges(values.length), IMPACT_EDGES);
      migrated = true;
    } else data.impacts = new Array(IMPACT_BUCKETS).fill(0);
    var peak = Array.isArray(data.impactPeak) ? data.impactPeak : [];
    data.impactPeak = [Number.isFinite(peak[0]) && peak[0] >= 0 ? peak[0] : 0, Number.isInteger(peak[1]) ? peak[1] : 0,
      Number.isInteger(peak[2]) ? peak[2] : 0, Number.isFinite(peak[3]) ? peak[3] : 0];
    return migrated;
  }
  function quantize(data) {
    var snap = copy(data);
    Object.keys(snap.profiles).forEach(function (id) { snap.profiles[id] = snap.profiles[id].map(function (n) { return Math.min(65535, Math.round(n)); }); });
    Object.keys(snap.pairs).forEach(function (key) { snap.pairs[key] = snap.pairs[key].map(function (n) { return Math.min(65535, Math.round(n)); }); });
    ['d', 'm'].forEach(function (scope) {
      Object.keys(snap.residency[scope]).forEach(function (key) {
        snap.residency[scope][key] = snap.residency[scope][key].map(function (n) { return Math.min(255, Math.round(n / 4)); });
      });
    });
    Object.keys(snap.drive).forEach(function (key) { snap.drive[key] = snap.drive[key].map(function (n) { return Math.min(65535, Math.round(n)); }); });
    snap.impacts = snap.impacts.map(function (n) { return Math.min(65535, Math.round(n)); });
    snap.impactPeak = [Math.round(snap.impactPeak[0] * 10) / 10, snap.impactPeak[1], snap.impactPeak[2], Math.round(snap.impactPeak[3])];
    return snap;
  }
  function create(options) {
    options = options || {};
    var storage = options.storage, now = options.now || Date.now;
    var offset = Number.isInteger(options.offsetMinutes) ? options.offsetMinutes : -new Date().getTimezoneOffset();
    var data = blank(); data.offset = offset;
    var status = 'loading', message = '', loaded = false, dirty = false, activeSlot = -1;
    var listeners = new Set(), timer = null, running = null, reading = null, recoveryNotice = false;
    function notify() { listeners.forEach(function (fn) { try { fn(); } catch (_) {} }); }
    function fail(text) { status = 'error'; message = text; notify(); }
    function schedule() { if (!timer) timer = setTimeout(function () { timer = null; flush().catch(function () {}); }, 400); }
    async function load() {
      if (reading) return reading;
      status = 'loading'; message = ''; notify();
      reading = (async function () {
        var values = await Promise.allSettled(KEYS.map(function (key) { return Promise.resolve().then(function () { return storage.get(key, null); }); }));
        if (values.some(function (r) { return r.status === 'rejected'; })) { fail('场志读取失败，已保留原数据；请重试。'); return; }
        var candidates = [], corrupt = 0;
        values.forEach(function (result, i) { try { var item = decode(result.value); if (item) candidates.push({ data: item, slot: i }); } catch (_) { corrupt++; } });
        if (!candidates.length && corrupt) { fail('场志快照校验失败，尚未覆盖原数据。'); return; }
        if (candidates.length) {
          candidates.sort(function (a, b) { return b.data.rev - a.data.rev; });
          data = candidates[0].data; activeSlot = candidates[0].slot;
          if (normalizeImpact(data)) dirty = true;   // 迁移过的分布尽快落盘，别再被旧形状盖回来
        } else dirty = true;
        loaded = true; recoveryNotice = corrupt > 0;
        status = recoveryNotice ? 'recovered' : 'ready';
        message = recoveryNotice ? '已从有效备份恢复；受损快照中的最新变化可能缺失。' : '';
        notify();
        if (dirty) schedule();
      })().catch(function () { fail('场志读取失败，已保留原数据；请重试。'); }).finally(function () { reading = null; });
      return reading;
    }
    async function flush() {
      if (timer) { clearTimeout(timer); timer = null; }
      if (!loaded) { if (reading) await reading; if (!loaded) return false; }
      if (running) return running;
      if (!dirty) return true;
      running = (async function () {
        var snap = quantize(data); prune(snap); snap.rev = data.rev + 1;
        if (bytes(encode(snap)) > LIMIT) { fail('场志空间暂不足，部分数据尚未保存。'); return false; }
        status = 'saving'; message = ''; notify();
        var slot = activeSlot === 0 ? 1 : 0;
        try { await storage.set(KEYS[slot], encode(snap)); }
        catch (_) { fail('部分场志尚未保存，已保留上次成功快照；请重试。'); return false; }
        activeSlot = slot; data.rev = snap.rev; dirty = false;
        status = recoveryNotice ? 'recovered' : 'ready';
        message = recoveryNotice ? '已从有效备份恢复；受损快照中的最新变化可能缺失。' : '';
        notify(); return true;
      })().finally(function () { running = null; });
      return running;
    }
    function profile(id) {
      if (!data.profiles[id]) data.profiles[id] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      return data.profiles[id];
    }
    function pairKey(a, b) { return a < b ? a + ',' + b : b + ',' + a; }
    function pairOf(a, b) {
      var key = pairKey(a, b);
      if (!data.pairs[key]) data.pairs[key] = [0, 0, 0, 0, 0, 0];
      return { row: data.pairs[key], ordered: key === a + ',' + b };
    }
    function socialRow() {
      var key = dayKey(now(), data.offset);
      if (!data.social[key]) data.social[key] = [0, 0, 0, 0];
      return data.social[key];
    }
    function record(event) {
      if (!event || !KINDS[event.kind] || !Number.isInteger(event.a)) return;
      var a = event.a, b = Number.isInteger(event.b) ? event.b : 0, kind = event.kind;
      var pa = profile(a);
      // [ap, min, hit, miss, bump, taken, dodge, pilot, relayIn, relayOut, manual]（manual 自 5.1.3 起记，旧档案按 0 读）
      if (kind === 'contact') { pa[4]++;
          if (b) { var p0 = profile(b); p0[5]++; var pr0 = pairOf(a, b); pr0.row[0]++; }
        }
      else if (kind === 'bump') { pa[4]++;
          if (b) { var p1 = profile(b); p1[5]++; var pr1 = pairOf(a, b); pr1.row[pr1.ordered ? 1 : 2]++; }
          socialRow()[1]++;
        }
      else if (kind === 'dodge') { pa[6]++;
          if (b) { var pr2 = pairOf(a, b); pr2.row[pr2.ordered ? 3 : 4]++; }
          socialRow()[2]++;
        }
      else if (kind === 'charge') { /* counted at read time as hit + miss */ }
      else if (kind === 'miss') { pa[3]++; }
      else if (kind === 'autoHit') { pa[2]++;
          if (b) { var pr3 = pairOf(a, b); pr3.row[0]++; }
          socialRow()[3]++;
        }
      else if (kind === 'relay') { pa[8]++; if (b) profile(b)[9]++; }
      else if (kind === 'pilot') { pa[7]++; }
      else if (kind === 'push' || kind === 'manual') { pa[10] = (pa[10] || 0) + 1; }  // 我操控的出击：拖着推挤或甩出撞上
      if (kind === 'contact') socialRow()[0]++;
      // 只有物理碰撞记相对速度：自然碰撞（contact）、FSD 冲撞（autoHit）与手拨推挤（push）
      if ((kind === 'contact' || kind === 'autoHit' || kind === 'push' || kind === 'manual') && Number.isFinite(event.power) && event.power >= 0) {
        data.impacts[impactBucket(event.power)]++;
        if (event.power > data.impactPeak[0]) data.impactPeak = [event.power, a, b, now()];
      }
      data.events.push([now(), kind, a, b]);
      if (data.events.length > EVENT_CAP) data.events.shift();
      dirty = true; notify(); schedule();
    }
    function recordSummon(ids) {
      if (!Array.isArray(ids)) return;
      ids.forEach(function (id) { if (Number.isInteger(id) && id > 0) profile(id)[0]++; });
      dirty = true; schedule();
    }
    function recordAppearance(ids, seconds) {
      if (!Array.isArray(ids) || !(seconds > 0)) return;
      ids.forEach(function (id) { if (Number.isInteger(id) && id > 0) profile(id)[1] += seconds; });
      dirty = true; schedule();
    }
    function recordDrive(blueSeconds, rageSeconds) {
      if (!(blueSeconds >= 0) || !(rageSeconds >= 0) || !(blueSeconds + rageSeconds > 0)) return;
      var key = dayKey(now(), data.offset);
      if (!data.drive[key]) data.drive[key] = [0, 0];
      data.drive[key][0] += blueSeconds; data.drive[key][1] += rageSeconds;
      dirty = true; schedule();
    }
    function recordResidency(snapshot, seconds) {
      if (!Array.isArray(snapshot) || !(seconds > 0)) return;
      var w = typeof options.width === 'function' ? options.width() : (options.width || 1560);
      var h = typeof options.height === 'function' ? options.height() : (options.height || 1040);
      var dk = dayKey(now(), data.offset), mk = monthKey(now(), data.offset);
      // 网格尺寸在版本间变过时，旧的驻留数组要先按比例重采样到当前网格；
      // 直接往越界下标上累加会写出空洞与 NaN，落盘后静默变成 0。
      data.residency.d[dk] = currentGrid(data.residency.d[dk]);
      data.residency.m[mk] = currentGrid(data.residency.m[mk]);
      snapshot.forEach(function (item) {
        if (!item || !Number.isFinite(item.x) || !Number.isFinite(item.y)) return;
        var gx = Math.max(0, Math.min(GRID_W - 1, Math.floor(item.x / w * GRID_W)));
        var gy = Math.max(0, Math.min(GRID_H - 1, Math.floor(item.y / h * GRID_H)));
        data.residency.d[dk][gy * GRID_W + gx] += seconds;
        data.residency.m[mk][gy * GRID_W + gx] += seconds;
      });
      dirty = true; schedule();
    }
    function recordNear(pairsList, seconds) {
      if (!Array.isArray(pairsList) || !(seconds > 0)) return;
      pairsList.forEach(function (pair) {
        if (!Array.isArray(pair) || pair.length !== 2) return;
        pairOf(pair[0], pair[1]).row[5] += seconds / 60;
      });
      dirty = true; schedule();
    }
    function rangeDays(range) {
      var viewTime = now(), finish = dayKey(viewTime, data.offset) + 1;
      var start = range === 'today' ? finish - 1 : range === '30d' ? finish - 30 : range === '1y' ? finish - 365 : range === 'all' ? finish - 450 * 12 : finish - 7;
      return [start, finish];
    }
    function getView(range) {
      var span = rangeDays(range), start = span[0], finish = span[1];
      var social = [], drive = [];
      for (var key = start; key < finish; key++) {
        var s = data.social[key] || [0, 0, 0, 0], d = data.drive[key] || [0, 0];
        social.push({ day: key, contact: s[0], bump: s[1], dodge: s[2], autoHit: s[3] });
        drive.push({ day: key, blue: d[0], rage: d[1] });
      }
      var months = finish - start > 45;
      var grid = new Array(GRID_W * GRID_H).fill(0);
      if (months) {
        Object.keys(data.residency.m).forEach(function (mk) {
          var firstDay = dayKey(Date.UTC(Math.floor(mk / 12), mk % 12, 1), data.offset);
          if (firstDay >= start && firstDay < finish) data.residency.m[mk].forEach(function (n, i) { grid[i] += n; });
        });
      } else {
        for (var dk2 = start; dk2 < finish; dk2++) if (data.residency.d[dk2]) data.residency.d[dk2].forEach(function (n, i) { grid[i] += n; });
      }
      var profiles = [];
      for (var id = 1; id <= 49; id++) {
        var p = data.profiles[id] || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        profiles.push({ id: id, appearances: p[0], minutes: Math.round(p[1] / 60), hit: p[2], miss: p[3], bump: p[4], taken: p[5], dodge: p[6], pilot: p[7], relayIn: p[8], relayOut: p[9], manual: p[10] || 0 });
      }
      var pairs = Object.keys(data.pairs).map(function (key) {
        var rc = data.pairs[key], ids = key.split(',').map(Number);
        return { a: ids[0], b: ids[1], contact: rc[0], hitAB: rc[1], hitBA: rc[2], dodgeAB: rc[3], dodgeBA: rc[4], nearMinutes: Math.round(rc[5]) };
      }).filter(function (pair) { return pair.contact + pair.nearMinutes > 0; })
        .sort(function (x, y) { return (y.contact * 3 + y.nearMinutes) - (x.contact * 3 + x.nearMinutes); });
      var totals = { blue: 0, rage: 0, hit: 0, miss: 0, manual: 0, contact: 0, bump: 0, dodge: 0, autoHit: 0, relay: 0, pilot: 0 };
      profiles.forEach(function (p) { totals.hit += p.hit; totals.miss += p.miss; totals.manual += p.manual; totals.relay += p.relayIn; totals.pilot += p.pilot; });
      social.forEach(function (day) { totals.contact += day.contact; totals.bump += day.bump; totals.dodge += day.dodge; totals.autoHit += day.autoHit; });
      drive.forEach(function (day) { totals.blue += day.blue; totals.rage += day.rage; });
      return { status: status, message: message, range: range || '7d', grid: grid, gridW: GRID_W, gridH: GRID_H,
        social: social, drive: drive, profiles: profiles, pairs: pairs.slice(0, 300), events: data.events.slice(-60).reverse(),
        impacts: data.impacts.slice(), impactPeak: data.impactPeak.slice(), impactEdges: IMPACT_EDGES.slice(),
        totals: totals, coverageStart: data.events.length ? data.events[0][0] : null };
    }
    var controller = { record: record, recordSummon: recordSummon, recordAppearance: recordAppearance, recordDrive: recordDrive, recordResidency: recordResidency, recordNear: recordNear,
      getView: getView, flush: flush,
      // 只读副本：备份与导出专用，不改动内部状态，也不触发写入。
      snapshot: function () { return { data: copy(data), status: status, message: message, loaded: loaded }; },
      subscribe: function (fn) { listeners.add(fn); return function () { listeners.delete(fn); }; },
      retry: async function () { if (!loaded) await load(); return flush(); },
      destroy: function () { if (timer) clearTimeout(timer); listeners.clear(); },
      ready: null };
    controller.ready = load();
    return controller;
  }
  return { create: create, _test: { encode: encode, decode: decode, bytes: bytes, prune: prune, quantize: quantize, blank: blank, normalizeImpact: normalizeImpact,
    impactBucket: impactBucket, impactEdges: IMPACT_EDGES, keys: KEYS, limit: LIMIT, gridW: GRID_W, gridH: GRID_H } };
});
