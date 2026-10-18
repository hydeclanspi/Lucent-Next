/* Lucent · 灵感台 — concept film · hydeclanspi
 *
 * One timeline. render(t) sets every element, every light and every glint from the time t alone, so
 * the film plays, scrubs, pauses on any frame, and renders to video frame by frame (scripts/film.mjs)
 * with the same result on any machine. Randomness comes from fixed seeds.
 *
 * Back to front: the world (WebGL, gl.js: night, pearl, aurora and dawn, with rays, warp and stage
 * lights), the place (one 1560 × 1040 screen in DOM, seen through a camera), light (Canvas 2D),
 * type (DOM), glints (WebGL points).
 *
 *   ?capture   no controls; window.__film = { duration, ready, seek(t) } for the renderer
 *   ?t=42      start at 42 s
 */
(function () {
  'use strict';

  // ---------- scene marks, in seconds ----------
  var M = {
    photon: 1.0, draw0: 1.35, draw1: 3.05, press1: 4.2, home: 4.45, press2: 6.9, morph: 9.6, flash: 11.6,
    bench: 16.0, explode: 18.0, implode: 21.5,
    launch: 22.8, type: 23.9, fly: 25.6, warp: 26.15, back: 28.5, rehearse: 29.2, burst: 31.0,
    sheet: 32.2, lasers: 33.6, show: 35.8, console: 38.2, knobs: 39.6,
    montage: 45.2, getit: 47.6, four: 48.8, merge: 49.7, lock: 50.2, dark: 53.8,
    cut: 56.1, pen: 56.4, lueurs: 57.2, swarm: 58.4, meet: 61.4, stars: 62.4, hold: 64.0,
    device: 66.8, specs: 68.2, tag: 74.2, flash2: 76.2, end: 81.6
  };
  var DURATION = M.end;
  var params = new URLSearchParams(window.location.search);
  var CAPTURE = params.has('capture');
  if (CAPTURE) document.documentElement.classList.add('capture');

  // ---------- small maths ----------
  function clamp(v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return v < a ? a : v > b ? b : v; }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function seg(t, a, b) { return clamp((t - a) / (b - a)); }
  var E = {
    linear: function (p) { return p; },
    inOut: function (p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; },
    out: function (p) { return 1 - Math.pow(1 - p, 3); },
    out5: function (p) { return 1 - Math.pow(1 - p, 5); },
    in: function (p) { return p * p * p; },
    in2: function (p) { return p * p; },
    sine: function (p) { return 0.5 - 0.5 * Math.cos(Math.PI * p); },
    back: function (p) { var c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); }
  };
  // Keyframes: [[time, value | [values], ease?], ...] — the ease belongs to the segment that ends at that key.
  function key(t, frames) {
    if (t <= frames[0][0]) return frames[0][1];
    for (var i = 1; i < frames.length; i++) {
      var f1 = frames[i];
      if (t <= f1[0]) {
        var f0 = frames[i - 1];
        var p = (E[f1[2] || 'inOut'])(f1[0] === f0[0] ? 1 : (t - f0[0]) / (f1[0] - f0[0]));
        if (Array.isArray(f0[1])) return f0[1].map(function (a, k) { return lerp(a, f1[1][k], p); });
        return lerp(f0[1], f1[1], p);
      }
    }
    return frames[frames.length - 1][1];
  }
  function env(t, a, b, fi, fo) { return Math.min(E.sine(seg(t, a, a + (fi || 0.6))), 1 - E.sine(seg(t, b - (fo || 0.6), b))); }
  function pulse(t, a, b) { var p = seg(t, a, b); return p > 0 && p < 1 ? Math.sin(Math.PI * p) : 0; }
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var x = s;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, parent, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html !== undefined) node.innerHTML = html;
    if (parent) parent.appendChild(node);
    return node;
  }
  function px(n) { return n.toFixed(2) + 'px'; }
  function f3(n) { return n.toFixed(3); }
  function blurOf(k) { return k > 0.002 ? 'blur(' + k.toFixed(2) + 'px)' : 'none'; }
  var DEG = Math.PI / 180, TAU = Math.PI * 2;

  // ---------- elements ----------
  var stage = $('stage'), camera = $('camera'), device = $('device'), bezel = $('bezel'), screen = $('screen');
  var innerSky = $('innerSky'), glare = $('glare'), backdrop = $('backdrop'), screenDim = $('screenDim');
  var halo = $('halo'), bloom = $('bloom'), scrim = $('scrim'), black = $('black'), vignette = $('vignette');
  var light = $('light'), lctx = light.getContext('2d');
  var ring = $('ring'), ringGlow = $('ringGlow'), press = $('press');
  var hmCall = $('hmCall'), hmH = $('hmH'), hmMe = $('hmMe'), hmEn = $('hmEn');
  var cardGlass = $('cardGlass'), card = $('card'), typed = $('typed'), ph = $('ph'), caret = $('caret'), go = $('go');
  var motionSheet = $('motionSheet'), randomToggle = $('randomToggle');
  var aurora = $('aurora'), glassPanel = $('glassPanel'), specimen = $('specimen'), orbs = $('orbs'), octx = orbs.getContext('2d');
  var penPath = $('penPath'), lueursLayer = $('lueurs');
  var wordsLayer = $('words'), capLayer = $('captions');
  var montage = $('montage'), mWord = $('mWord'), mLatin = $('mLatin'), getit = $('getit');
  var specsBox = $('specs'), giantWord = $('giantWord');
  var worldCanvas = $('world'), fxCanvas = $('fx');

  // ---------- the light engine ----------
  var G = null;
  try { G = window.FilmGL ? window.FilmGL.create(worldCanvas, fxCanvas) : null; } catch (error) { G = null; }
  var flat = G ? null : worldCanvas.getContext('2d');
  if (G) { G.system('dust', 900, 3); G.system('sparks', 360, 5); }

  // ---------- the place: a camera over one 1560 × 1040 screen ----------
  var SCX = 780, SCY = 520;
  function at(x, y, s, X, Y) { return [(X === undefined ? 960 : X) + (SCX - x) * s, (Y === undefined ? 470 : Y) + (SCY - y) * s, s]; }
  var OVER = [960, 470, 0.62];
  var SWARM_CAM = at(650, 300, 1.42, 960, 450);
  var CAMERA = [
    [0, OVER], [M.explode, OVER],
    [M.explode + 1.5, [960, 540, 0.48]],
    [M.implode, [960, 540, 0.48], 'sine'],
    [M.implode + 1.0, [960, 470, 0.66]],
    [M.launch + 0.5, at(984, 356, 2.25, 960, 400)],
    [M.warp, at(990, 356, 2.32, 960, 400), 'sine'],
    [M.warp + 0.6, at(1307, 356, 10, 960, 470), 'in'],
    [M.back, at(1307, 356, 10, 960, 470)],
    [M.back + 0.65, at(984, 356, 2.25, 960, 400), 'out'],
    [M.rehearse + 1.2, at(990, 356, 2.18, 960, 400), 'sine'],
    [M.burst + 1.1, at(984, 356, 2.22, 960, 400), 'sine'],
    [M.sheet + 1.2, at(780, 528, 1.36, 960, 468)],
    [M.show, at(780, 528, 1.41, 960, 468), 'sine'],
    [M.show + 1.4, [960, 470, 0.6]],
    [M.console, [960, 470, 0.6], 'sine'],
    [M.console + 0.6, [960, 470, 0.5], 'in'],
    [M.cut - 0.01, [960, 470, 0.5]],
    [M.cut, at(378, 238, 2.6, 960, 470), 'linear'],
    [M.lueurs + 0.3, at(378, 238, 2.72, 960, 470), 'sine'],
    [M.swarm - 0.2, SWARM_CAM],
    [M.device, at(650, 300, 1.48, 960, 450), 'sine'],
    [M.device + 1.6, [690, 470, 0.5]],
    [M.tag, [690, 470, 0.52], 'sine'],
    [M.tag + 0.8, [690, 430, 0.46], 'in'],
    [DURATION, [690, 430, 0.46]]
  ];
  // The device in space: [rotateX, rotateY, rotateZ], and how far its four layers stand apart.
  var ROT = [
    [0, [0, 0, 0]], [M.explode, [0, 0, 0]],
    [M.explode + 1.5, [54, 0, -32]],
    [M.implode, [54, 0, -37], 'sine'],
    [M.implode + 1.1, [0, 0, 0]],
    [M.device, [0, 0, 0]],
    [M.device + 1.8, [5, -15, 0]],
    [M.tag, [3, -9, 0], 'sine'],
    [DURATION, [3, -9, 0]]
  ];
  var SPREAD = [[0, 0], [M.explode + 0.4, 0], [M.explode + 1.8, 1], [M.implode, 1], [M.implode + 0.9, 0]];
  var LAYERS = [$('lySky'), $('lyGlass'), $('ui'), $('lyTop'), $('lyLueurs')], LAYER_Z = [0, 1, 2, 2, 3], GAP = 170;
  var cam = { s: 1, tx: 0, ty: 0 }, rot = { ax: 0, ay: 0, az: 0 };
  function toStage(x, y) { return [cam.tx + x * cam.s, cam.ty + y * cam.s]; }
  // A point on the screen, on a layer lifted by z, as the camera sees it (the same maths as the CSS transforms).
  function project(x, y, z) {
    var X = x - SCX, Y = y - SCY;
    var a = rot.az * DEG, x1 = X * Math.cos(a) - Y * Math.sin(a), y1 = X * Math.sin(a) + Y * Math.cos(a), z1 = z;
    var b = rot.ay * DEG, x2 = x1 * Math.cos(b) + z1 * Math.sin(b), z2 = -x1 * Math.sin(b) + z1 * Math.cos(b);
    var c = rot.ax * DEG, y3 = y1 * Math.cos(c) - z2 * Math.sin(c), z3 = y1 * Math.sin(c) + z2 * Math.cos(c);
    var k = 3000 / (3000 - z3);
    return toStage(SCX + x2 * k, SCY + y3 * k);
  }

  // ---------- the base, assembled by a passing line of light ----------
  var ui = $('ui');
  function q(sel) { return ui.querySelector(sel); }
  function list(sel) { return Array.prototype.slice.call(ui.querySelectorAll(sel)); }
  var chips = list('.chip'), tiles = list('.tile'), secs = list('.sec');
  var SPOTLIT = chips.concat(tiles, secs, [q('.history'), q('.note')]);
  var SCAN = [M.bench + 0.05, M.bench + 1.75];
  function scanX(t) { return lerp(-60, 1620, E.inOut(seg(t, SCAN[0], SCAN[1]))); }
  var cardStart = SCAN[0];
  var ASSEMBLY = list('#ui > *').concat([$('search')], secs, chips, tiles).map(function (node) {
    var x = 0, n = node;
    while (n && n !== ui) { x += n.offsetLeft; n = n.offsetParent === ui || (n.offsetParent && ui.contains(n.offsetParent)) ? n.offsetParent : null; }
    // The moment the line reaches the element's left edge (the inverse of the line's ease).
    var p = clamp((x + 80) / 1680), u = p < 0.5 ? Math.cbrt(p / 4) : 1 - Math.cbrt(2 * (1 - p)) / 2;
    var start = lerp(SCAN[0], SCAN[1], u);
    if (node.classList.contains('history')) node.dataset.base = 'skewX(-14deg)';
    if (node === card) cardStart = start;
    return [node, start];
  });

  // ---------- words ----------
  var CAPTIONS = [
    { a: 1.5, b: 4.0, top: 650, zh: '曾经，屏幕下方有一颗按键。', en: 'There was once a button below the screen.' },
    { a: 7.15, b: 9.2, top: 650, zh: '按下它，走得再远，也能回到起点。', en: 'Press it, and however far you had gone, you were back where you began.' },
    { a: 9.55, b: 11.5, top: 846, size: 'l', zh: 'Home，是一个承诺：', sub: '总有一个地方，等你回来。', en: 'Home was a promise: there is always a place that waits for you.' },
    { a: 12.2, b: 15.7, top: 846, ink: true, size: 'l', zh: '今天，我们把这个承诺，做成了一个地方。', en: 'Today, we have made that promise into a place.' },
    { a: 16.4, b: 18.2, top: 846, ink: true, title: '一张工作台。', sub: '时钟、搜索、快捷方式，各就各位。', en: 'A workbench. Clock, search and shortcuts, each in its place.' },
    { a: 18.8, b: 21.3, top: 900, ink: true, zh: '壁纸、玻璃、界面、居民：四层，叠成一块屏幕。', en: 'Wallpaper, glass, interface, residents: four layers, one screen.' },
    { a: 23.2, b: 26.0, top: 862, title: '一座发射台。', sub: '写下的字化作一道光，光一到，搜索就出发。', en: 'A launch pad. Your words become light, and the search lifts off when it lands.' },
    { a: 26.9, b: 28.35, top: 470, size: 'l', zh: '去往整个世界。', en: 'Out into the world.' },
    { a: 29.5, b: 32.9, top: 862, title: '一方舞台。', sub: '留在这里，光为你演一遍：首发回弹，按住连发。', en: 'A stage. Stay, and the light performs for you: it flies back, then fires again and again.' },
    { a: 34.0, b: 37.8, top: 880, zh: '白金导流环里，蓝白激光奔跑不息。', en: 'Through rings of platinum, blue-white lasers keep running.' },
    { a: 39.8, b: 44.9, top: 886, title: '一面控制台。', sub: '玻璃开放六项参数，每颗按钮都有长按。', en: 'A console. Six settings for the glass, and a long press under every button.' },
    { a: 48.95, b: 50.35, top: 820, zh: '它们，是同一个地方。', en: 'They are one place.' },
    { a: 54.3, b: 55.9, top: 500, size: 'l', zh: '还有一件事。', en: 'And one more thing.' },
    { a: 56.6, b: 58.6, top: 862, zh: '最初，留白里只有两枚玻璃。', en: 'It began with two small panes of glass in the open space.' },
    { a: 59.0, b: 61.3, top: 862, zh: '如今，四十九位居民，各有编号。', en: 'Now forty-nine residents live here, each with a number.' },
    { a: 61.6, b: 63.9, top: 862, zh: '它们相遇、追逐，连成星座。', en: 'They meet, they chase, they form constellations.' },
    { a: 64.2, b: 66.5, top: 862, zh: '每次回来，它们都在。', en: 'Whenever you come back, they are here.' },
    { a: 67.6, b: 73.8, top: 868, x: 690, ink: true, title: '为一块屏幕而生。', spec: 'HUAWEI MatePad Edge', en: 'Made for one screen.' }
  ];
  function revealSpan(cls, text, parent) {
    var wrap = el('span', 'reveal' + (cls ? ' ' + cls : ''), parent);
    el('span', 't', wrap).textContent = text;
    var g = el('span', 'g', wrap); g.textContent = text; g.setAttribute('aria-hidden', 'true');
    return wrap;
  }
  CAPTIONS.forEach(function (c) {
    c.el = el('div', 'cap' + (c.size ? ' ' + c.size : '') + (c.ink ? ' ink' : ''), capLayer);
    c.el.style.top = c.top + 'px';
    if (c.x) { c.el.style.left = (c.x - 960) + 'px'; }
    c.main = revealSpan(c.title ? 'title' : 'zh', c.title || c.zh, el('div', '', c.el));
    if (c.sub) c.subEl = revealSpan('', c.sub, el('span', 'sub', c.el));
    if (c.spec) c.subEl = revealSpan('', c.spec, el('span', 'spec', c.el));
    if (c.en) c.enEl = revealSpan('', c.en, el('span', 'en', c.el));
  });
  function renderCaption(c, t) {
    if (t < c.a - 0.02 || t > c.b + 0.02) { if (c.shown !== false) { c.el.style.visibility = 'hidden'; c.shown = false; } return; }
    c.shown = true;
    c.el.style.visibility = 'visible';
    var out = E.sine(seg(t, c.b - 0.6, c.b));
    c.main.style.setProperty('--p', E.out(seg(t, c.a, c.a + 1.05)).toFixed(4));
    if (c.subEl) c.subEl.style.setProperty('--p', E.out(seg(t, c.a + 0.32, c.a + 1.37)).toFixed(4));
    if (c.enEl) c.enEl.style.setProperty('--p', E.out(seg(t, c.a + 0.5, c.a + 1.55)).toFixed(4));
    c.el.style.opacity = f3(1 - out);
    c.el.style.filter = blurOf(out * 7);
    c.el.style.transform = 'translateY(' + (-out * 10).toFixed(2) + 'px)';
  }

  // ---------- H◯me 键: the button becomes the o of its own name ----------
  var RING = { x: 960, y: 470, r: 88 };
  var HOME = { size: 330, stem: 6, hx: 0, mx: 0, kx: 0, top: 0, ktop: 0, shift: 0 };
  var hmKey = $('hmKey');
  function baselineOf(node) {
    var probe = el('i', '', node);
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    var y = probe.offsetTop;
    node.removeChild(probe);
    return y;
  }
  function layoutHome() {
    var c = document.createElement('canvas').getContext('2d');
    c.font = '200 330px "Film Latin"';
    var mo = c.measureText('o');
    var inkH = (mo.actualBoundingBoxAscent + mo.actualBoundingBoxDescent) || 180;
    var size = 330 * (2 * RING.r + 3) / inkH;   // the o is exactly as tall as the ring
    c.font = '200 ' + size.toFixed(2) + 'px "Film Latin"';
    mo = c.measureText('o');
    var ml = c.measureText('l'), mH = c.measureText('H');
    var oMid = (mo.actualBoundingBoxRight - mo.actualBoundingBoxLeft) / 2;   // the o's ink centre, from its origin
    var oRise = (mo.actualBoundingBoxAscent - mo.actualBoundingBoxDescent) / 2; // ... and above the baseline
    var capH = mH.actualBoundingBoxAscent || size * 0.73;
    var advH = c.measureText('Ho').width - mo.width, homeW = c.measureText('Home').width, meW = c.measureText('me').width;
    HOME.size = size;
    HOME.stem = Math.max(2.6, (ml.actualBoundingBoxRight + ml.actualBoundingBoxLeft) || 6);
    // 键, in the thin sans, as tall as the capital H, one word space after "me"
    c.font = '100 100px "Film Sans"';
    var mk = c.measureText('键');
    var ksize = 100 * capH / ((mk.actualBoundingBoxAscent + mk.actualBoundingBoxDescent) || 88);
    c.font = '100 ' + ksize.toFixed(2) + 'px "Film Sans"';
    mk = c.measureText('键');
    var gap = size * 0.16, width = homeW + gap + mk.width;
    var x0 = 960 - width / 2, base = RING.y + oRise;
    // The whole name is centred, so the ring slides to where its o belongs.
    HOME.shift = x0 + advH + oMid - RING.x;
    HOME.hx = x0; HOME.mx = x0 + homeW - meW; HOME.kx = x0 + homeW + gap;
    [hmH, hmMe].forEach(function (node) { node.style.fontSize = size.toFixed(2) + 'px'; });
    hmKey.style.fontSize = ksize.toFixed(2) + 'px';
    HOME.top = base - baselineOf(hmH);
    HOME.ktop = base - mk.actualBoundingBoxDescent - baselineOf(hmKey);
    hmH.style.left = px(HOME.hx); hmMe.style.left = px(HOME.mx); hmKey.style.left = px(HOME.kx);
    hmH.style.top = px(HOME.top); hmMe.style.top = px(HOME.top); hmKey.style.top = px(HOME.ktop);
    hmCall.style.left = '960px'; hmCall.style.top = px(base - capH - 100);
    hmEn.style.left = '960px'; hmEn.style.top = px(base + 64);
  }

  // ---------- the exploded view ----------
  var LABELS = Array.prototype.slice.call(document.querySelectorAll('.xl'));
  // Where each label points: [x, y on the screen, layer]
  var ANCHORS = [[1530, 860, 0], [1356, 640, 1], [1340, 54, 2], [1120, 172, 3]];

  // ---------- the stage: 念起，光行 with Random on ----------
  var STUDIES = [
    ['01', '一线入光', 'Lightline', '<path d="M7 27h44m-28-3h22m-22 6h22"/><path class="b" d="M51 27h16m-5-4 5 4-5 4"/>'],
    ['03', '微棱', 'Microprism', '<path d="m9 27 27-8 25 8-25 8Z"/><path class="b" d="M9 27h54m-26-8v16"/>'],
    ['04', '快门', 'Shutter', '<path d="M11 23h30m-30 8h30m5-13v18m5-14v10"/><path class="b" d="M51 27h16m-5-4 5 4-5 4"/>'],
    ['09', '铂丝', 'Platinum filament', '<path d="M7 18c30 0 23 21 56 9M7 27c27-15 33 16 56 0M7 36c26 0 30-18 56-9"/><path class="b" d="M63 27h5"/>'],
    ['10', '穿针', 'Through the eye', '<path d="M7 32c19 0 23-20 38-9s17 7 22 4"/><ellipse class="b" cx="55" cy="27" rx="3" ry="10"/>'],
    ['14', '近轨', 'Near orbit', '<path d="M8 27c18-18 42-18 57 0M8 27c18 18 42 18 57 0"/><path class="b" d="M8 27h5m47 0h7"/>']
  ];
  STUDIES.forEach(function (s, i) {
    var c = el('div', 'mcard', motionSheet);
    c.style.left = (24 + (i % 3) * 270) + 'px';
    c.style.top = (86 + Math.floor(i / 3) * 190) + 'px';
    c.innerHTML = '<svg viewBox="0 0 74 54">' + s[3] + '</svg><span class="n">' + s[0] + '</span><span class="t">' + s[1] + '</span><span class="l">' + s[2] + '</span>';
  });
  // Lanes are the gaps between the cards, in screen coordinates.
  var LANES = {
    H: { a: [384, 557], b: [1176, 557], base: 0.68 },
    V1: { a: [645, 376], b: [645, 738], base: 0.84 },
    V2: { a: [915, 376], b: [915, 738], base: 0.84 }
  };
  // Random's schedule: speeds from a normal N(0.70, 0.10²) redrawn beyond ±3σ, lanes drawn without
  // replacement, waves of one, two or three at 73% / 20% / 7%, an opening of three at once.
  var SHOTS = (function () {
    var r = rng(9);
    function speed() { var z; do { z = Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(2 * Math.PI * r()); } while (Math.abs(z) > 3); return 0.7 + 0.1 * z; }
    var shots = [], t = M.lasers;
    function shot(lane, t0, rev) { var s = speed(); shots.push({ lane: lane, t0: t0, rev: rev, dur: LANES[lane].base / s }); }
    shot('H', t, false); shot('V1', t, false); shot('V2', t, true);
    while (t < M.console - 1.4) {
      var longest = shots.filter(function (s) { return s.t0 === t; }).reduce(function (m, s) { return Math.max(m, s.dur); }, 0);
      t = t + longest + 0.18 + r() * 0.45;
      var wave = r(), count = wave < 0.07 ? 3 : wave < 0.27 ? 2 : 1;
      var pool = [['H', 0.7], ['V1', 0.15], ['V2', 0.15]];
      for (var k = 0; k < count && pool.length; k++) {
        var total = pool.reduce(function (m, p) { return m + p[1]; }, 0), pick = r() * total, j = 0;
        while (j < pool.length - 1 && pick >= pool[j][1]) { pick -= pool[j][1]; j++; }
        var lane = pool.splice(j, 1)[0][0];
        shot(lane, t, r() < (lane === 'H' ? 0.5 : 4 / 30));
      }
    }
    return shots;
  })();

  // ---------- the console: Lucent Glass over an aurora ----------
  var KNOBS = [['通透度', 50, 84], ['玻璃柔焦', 50, 22], ['暖意', 50, 74], ['边缘光泽', 50, 92], ['环境色彩', 50, 72], ['触光强度', 50, 96]];
  KNOBS.forEach(function (k, i) {
    var row = el('div', 'gp-row', glassPanel);
    row.style.top = (214 + i * 72) + 'px';
    row.innerHTML = '<span class="k">' + k[0] + '</span><span class="v">' + k[1] + '</span><span class="track"><span class="fill"></span><span class="dot"></span></span>';
    k.value = row.querySelector('.v'); k.track = row.querySelector('.track'); k.dot = row.querySelector('.dot');
  });
  // Crisp orbs drift behind the glass, so every setting shows on what lies beneath it.
  var ORBS = [
    { c: [255, 92, 200], r: 150, x: 1190, y: 300, ax: 150, ay: 80, w: 0.31, p: 0.4 },
    { c: [70, 215, 255], r: 118, x: 1500, y: 650, ax: 110, ay: 110, w: 0.27, p: 2.1 },
    { c: [255, 176, 90], r: 92, x: 1330, y: 480, ax: 210, ay: 150, w: 0.37, p: 4.0 },
    { c: [160, 120, 255], r: 170, x: 520, y: 250, ax: 140, ay: 70, w: 0.22, p: 1.2 },
    { c: [255, 120, 150], r: 112, x: 770, y: 730, ax: 130, ay: 60, w: 0.29, p: 3.3 },
    { c: [110, 240, 215], r: 82, x: 370, y: 640, ax: 90, ay: 110, w: 0.41, p: 5.1 }
  ];
  function drawOrbs(t) {
    octx.clearRect(0, 0, 1920, 1080);
    ORBS.forEach(function (o) {
      var x = o.x + o.ax * Math.sin(o.w * t + o.p), y = o.y + o.ay * Math.cos(o.w * 0.8 * t + o.p * 1.3);
      var g = octx.createLinearGradient(x - o.r, y - o.r, x + o.r, y + o.r);
      g.addColorStop(0, 'rgba(' + o.c.map(function (v) { return Math.min(255, v + 70); }).join(',') + ',0.98)');
      g.addColorStop(1, 'rgba(' + o.c.map(function (v) { return Math.round(v * 0.7); }).join(',') + ',0.9)');
      octx.fillStyle = g; octx.beginPath(); octx.arc(x, y, o.r, 0, TAU); octx.fill();
    });
  }
  function knobStart(i) { return M.knobs + i * 0.72; }
  function knobValue(i, t) { var k = KNOBS[i], a = knobStart(i); return lerp(k[1], k[2], E.inOut(seg(t, a, a + 0.85))); }

  // ---------- one place, four names ----------
  var CUTS = [['工作台', 'Workbench', 'pearl'], ['发射台', 'Launch pad', 'warp'], ['舞台', 'Stage', 'spots'], ['控制台', 'Console', 'aurora']];
  var CUT = 0.3;
  function cutIndex(t) { var i = Math.floor((t - M.montage) / CUT); return t >= M.montage && i < 8 ? i : -1; }
  var w4 = Array.prototype.slice.call(document.querySelectorAll('.w4'));
  var lkLing = $('lkLing'), lkTai = $('lkTai'), lkMark = $('lkMark'), lkKicker = $('lkKicker');
  var tg1 = $('tg1'), tg2 = $('tg2'), tgEn = $('tgEn'), tagline = $('tagline'), endmark = $('endmark');
  var GATHER = { t0: M.lock + 0.15, span: 1.5 };
  // The glyphs of 灵感, sampled where the lockup sets them, so the glints can gather into them.
  function sampleLockup() {
    if (!G) return;
    var c = document.createElement('canvas'); c.width = 1920; c.height = 1080;
    var x = c.getContext('2d');
    x.font = '300 150px "Film Serif"'; x.fillStyle = '#fff';
    x.fillText('灵感', lkLing.offsetLeft, lkLing.offsetTop + baselineOf(lkLing));
    var data = x.getImageData(600, 300, 500, 300).data, pts = [];
    for (var yy = 0; yy < 300; yy += 2) for (var xx = 0; xx < 500; xx += 2) if (data[(yy * 500 + xx) * 4 + 3] > 110) pts.push([600 + xx, 300 + yy]);
    var r = rng(77);
    for (var i = pts.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), tmp = pts[i]; pts[i] = pts[j]; pts[j] = tmp; }
    pts = pts.slice(0, 2600);
    if (pts.length) G.system('gather', pts.length, 11, pts);
  }

  // ---------- residents ----------
  var L0 = M.lueurs;
  var LUEURS = [
    { id: '01', base: [286, 170], from: [342, 214], in: L0 },
    { id: '02', base: [420, 286], from: [414, 262], in: L0 + 0.3, warm: true },
    { id: '23', base: [152, 262], in: M.swarm + 2.0 },
    { id: '31', base: [562, 172], in: M.swarm + 2.08 },
    { id: '07', base: [700, 284], in: M.swarm + 2.16, warm: true },
    { id: '45', base: [842, 170], in: M.swarm + 2.24 },
    { id: '14', base: [980, 280], in: M.swarm + 2.32 },
    { id: '38', base: [1120, 172], in: M.swarm + 2.4 },
    { id: '19', base: [474, 452], in: M.swarm + 2.48 }
  ];
  var capGlyph = '<svg viewBox="0 0 10 10"><path d="M1.5 6.5c1-3.5 6-4.5 7-1M6.8 3.6l1.9 1.9"/></svg>';
  var drift = rng(14);
  LUEURS.forEach(function (lu) {
    lu.node = el('div', 'lu' + (lu.warm ? ' warm' : ''), lueursLayer);
    el('span', 'lu-lens', lu.node);
    lu.glint = el('span', 'lu-glint', lu.node);
    lu.idNode = el('span', 'lu-id', lu.node, lu.id + capGlyph);
    lu.w1 = 2 * Math.PI / (6.5 + drift() * 4); lu.w2 = 2 * Math.PI / (7.5 + drift() * 4);
    lu.p1 = drift() * 6.28; lu.p2 = drift() * 6.28; lu.amp = 8 + drift() * 6;
  });
  var touch = el('div', 'touch', lueursLayer);
  var ENC = (function () {
    var a = LUEURS[3].base, b = LUEURS[4].base, dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
    return { ux: dx / d, uy: dy / d, reach: d - 24, hit: M.meet + 0.9 };
  })();
  function lueurPosition(i, t) {
    var lu = LUEURS[i];
    var x = lu.base[0], y = lu.base[1];
    if (lu.from) { var g = E.inOut(seg(t, L0 + 0.85, L0 + 2.05)); x = lerp(lu.from[0], x, g); y = lerp(lu.from[1], y, g); }
    var live = seg(t, lu.in, lu.in + 1.2);
    x += live * lu.amp * Math.sin(lu.w1 * t + lu.p1);
    y += live * lu.amp * 0.62 * Math.sin(lu.w2 * t + lu.p2);
    if (i === 3) { // one meets another: it rams, then falls back
      var ram = ENC.reach * (E.in2(seg(t, M.meet, ENC.hit)) - 0.45 * E.out(seg(t, ENC.hit, ENC.hit + 1.2)));
      x += ENC.ux * ram; y += ENC.uy * ram;
    }
    if (i === 4) { var push = 46 * E.out(seg(t, ENC.hit, ENC.hit + 1.0)); x += ENC.ux * push; y += ENC.uy * push; }
    if (i === 6) { var held = E.inOut(seg(t, M.hold + 0.4, M.hold + 1.2)); x += 52 * held; y -= 34 * held; }
    return [x, y];
  }
  // Forty-nine glints swirl in, then settle into the nine who are here today.
  if (G) G.system('swarm', 49, 21, LUEURS.map(function (lu) { return [SWARM_CAM[0] + (lu.base[0] - SCX) * 1.42, SWARM_CAM[1] + (lu.base[1] - SCY) * 1.42]; }));
  var STAR_EDGES = [[2, 0], [0, 1], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [1, 8], [8, 4]];

  // The red pen circle from the very first sketch.
  (function () {
    var r = rng(5), pts = [], cx = 378, cy = 238, rx = 92, ry = 70, rt = -0.14, a0 = -2.5, a1 = a0 + Math.PI * 2 + 0.55;
    for (var k = 0; k <= 64; k++) {
      var a = lerp(a0, a1, k / 64), j = 1 + (r() - 0.5) * 0.035 + 0.025 * Math.sin(3 * a + 0.6) + 0.04 * (k / 64);
      var x = rx * j * Math.cos(a), y = ry * j * Math.sin(a);
      pts.push([cx + x * Math.cos(rt) - y * Math.sin(rt), cy + x * Math.sin(rt) + y * Math.cos(rt)]);
    }
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += ' Q' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1);
    }
    penPath.setAttribute('d', d);
  })();
  var penLength = penPath.getTotalLength();
  penPath.style.strokeDasharray = penLength.toFixed(1);

  // ---------- made for one screen ----------
  var SPECS = [
    { to: 14.2, fmt: function (v) { return v.toFixed(1) + '″'; }, label: '英寸 OLED' },
    { text: '3 : 2', label: '画幅' },
    { to: [3120, 2080], fmt: function (v) { return Math.round(v[0]) + ' × ' + Math.round(v[1]); }, label: '像素，与壁纸一一对应' },
    { to: 120, fmt: function (v) { return Math.round(v) + ' Hz'; }, label: '刷新率' }
  ];
  SPECS.forEach(function (s, i) {
    s.row = el('div', 'spec-row', specsBox);
    s.num = el('b', '', s.row); el('span', '', s.row).textContent = s.label;
    s.t0 = M.specs + i * 0.55;
  });

  // ---------- the sky, painted once ----------
  function glow(ctx, x, y, rx, ry, stops) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  (function paintSky() {
    var ctx = innerSky.getContext('2d'), w = innerSky.width, h = innerSky.height, r = rng(20261017);
    var g = ctx.createLinearGradient(0, 0, 0, h);
    [[0, '#0d2350'], [0.2, '#183870'], [0.38, '#30508c'], [0.5, '#5a6294'], [0.58, '#6a5a82'], [0.66, '#3a3756'], [0.78, '#1d2236'], [1, '#0e121c']]
      .forEach(function (s) { g.addColorStop(s[0], s[1]); });
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    glow(ctx, w * 0.08, h * 0.53, w * 0.62, h * 0.2, [[0, 'rgba(255,124,66,0.78)'], [0.42, 'rgba(255,150,92,0.3)'], [1, 'rgba(255,150,92,0)']]);
    glow(ctx, w * 0.3, h * 0.5, w * 0.6, h * 0.11, [[0, 'rgba(255,198,142,0.36)'], [1, 'rgba(255,198,142,0)']]);
    glow(ctx, w * 0.88, h * 0.06, w * 0.5, h * 0.36, [[0, 'rgba(92,146,255,0.32)'], [1, 'rgba(92,146,255,0)']]);
    glow(ctx, w * 0.62, h * 0.86, w * 0.7, h * 0.2, [[0, 'rgba(255,170,110,0.16)'], [1, 'rgba(255,170,110,0)']]);
    ctx.filter = 'blur(28px)';
    for (var i = 0; i < 18; i++) {
      var cx = r() * w, cy = h * (0.1 + r() * 0.42), rw = 160 + r() * 320, rh = 16 + r() * 38;
      ctx.fillStyle = 'rgba(' + (16 + r() * 12 | 0) + ',' + (26 + r() * 14 | 0) + ',' + (58 + r() * 20 | 0) + ',' + (0.22 + r() * 0.22).toFixed(2) + ')';
      ctx.beginPath(); ctx.ellipse(cx, cy, rw, rh, (r() - 0.5) * 0.12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.filter = 'blur(10px)';
    for (var c = 0; c < 26; c++) {
      var bx = r() * w, bw = 30 + r() * 90, bh = 40 + r() * 230;
      ctx.fillStyle = 'rgba(10,14,26,' + (0.18 + r() * 0.25).toFixed(2) + ')';
      ctx.fillRect(bx, h * 0.64 - bh * 0.4 + r() * 40, bw, bh + h * 0.4);
    }
    var palette = [[255, 186, 110], [255, 214, 150], [255, 240, 222], [164, 204, 255], [255, 156, 132]];
    ctx.filter = 'blur(1.4px)';
    for (var k = 0; k < 230; k++) {
      var p = palette[(r() * palette.length) | 0], x = w * (0.04 + 0.96 * Math.pow(r(), 0.85)), y = h * (0.58 + 0.42 * Math.pow(r(), 0.9)), rad = 1.5 + Math.pow(r(), 3) * 16;
      var a = rad > 9 ? 0.12 + r() * 0.16 : 0.32 + r() * 0.5;
      var gr = ctx.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(' + p + ',' + a.toFixed(2) + ')'); gr.addColorStop(0.7, 'rgba(' + p + ',' + (a * 0.55).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(' + p + ',0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    }
    ctx.filter = 'blur(8px)';
    for (var m = 0; m < 16; m++) {
      var q2 = palette[(r() * palette.length) | 0], mx = r() * w, my = h * (0.55 + r() * 0.45), mr = 34 + r() * 70;
      ctx.fillStyle = 'rgba(' + q2 + ',' + (0.05 + r() * 0.07).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.filter = 'none';
  })();

  // ---------- the world, frame by frame ----------
  var NIGHT = [1, 0, 0, 0], PEARL = [0, 1, 0, 0], AURORA = [0, 0, 1, 0], DAWN = [0, 0, 0, 1];
  var WORLD = [
    [0, NIGHT],
    [M.flash + 0.12, NIGHT], [M.flash + 0.13, PEARL, 'linear'],
    [M.warp + 0.4, PEARL], [M.warp + 0.41, NIGHT, 'linear'],
    [M.console, NIGHT], [M.console + 0.9, AURORA],
    [M.montage, AURORA],
    [M.lock, NIGHT, 'linear'], [M.lock + 1.1, DAWN],
    [M.dark + 0.3, DAWN], [M.dark + 0.31, NIGHT, 'linear'],
    [M.device - 0.2, NIGHT], [M.device + 1.1, PEARL],
    [M.tag + 0.1, PEARL], [M.tag + 0.9, NIGHT],
    [M.flash2 + 0.1, NIGHT], [M.flash2 + 0.11, PEARL, 'linear'],
    [DURATION, PEARL]
  ];
  var VOID = [[0, 1], [M.photon - 0.2, 1], [M.photon + 1.6, 0], [M.dark - 0.1, 0], [M.dark + 0.4, 1], [M.cut - 0.01, 1], [M.cut, 0, 'linear']];
  var BLOOM = [
    [0, 0], [M.flash - 0.14, 0], [M.flash + 0.06, 1, 'in2'], [M.flash + 0.2, 1], [M.flash + 1.2, 0, 'out'],
    [M.warp + 0.28, 0], [M.warp + 0.4, 0.55, 'in2'], [M.warp + 0.9, 0, 'out'],
    [M.back - 0.04, 0], [M.back + 0.06, 0.4], [M.back + 0.6, 0, 'out'],
    [M.flash2 - 0.14, 0], [M.flash2 + 0.05, 1, 'in2'], [M.flash2 + 0.2, 1], [M.flash2 + 1.3, 0, 'out'],
    [DURATION, 0]
  ];
  function worldState(t) {
    var w = key(t, WORLD), warp = [0, 0.5, 0.435, 0], spot = [0, 0], rays = [0, 0.5, 0.435];
    // The rush into the arrow, and back
    var ws = key(t, [[M.warp + 0.15, 0], [M.warp + 0.55, 1], [M.back - 0.1, 1], [M.back + 0.4, 0]]);
    if (ws > 0) warp = [ws, 0.5, 0.435, 0.9 * (t - M.warp) + 0.5 * Math.pow(Math.max(0, t - M.warp), 2)];
    // Stage lights
    var sp = env(t, M.show - 0.3, M.console + 0.4, 0.9, 0.6);
    if (sp > 0) spot = [1.25 * sp, 1];
    // Light pours out of the button on the second press; the name rises at dawn
    var rp = Math.max(1.1 * (1 - E.out(seg(t, M.press2, M.press2 + 1.9))) * (t > M.press2 ? 1 : 0), 0);
    if (rp > 0) rays = [rp, 0.5, 0.435];
    var rl = env(t, M.lock + 0.4, M.dark + 0.2, 1.2, 0.6);
    if (rl > 0) rays = [0.42 * rl, 0.5, 1.1];
    var rt = env(t, M.tag + 0.6, M.flash2 + 0.1, 0.8, 0.2);
    if (rt > 0) rays = [0.5 * rt, 0.5, 0.56];
    // One place, four names: the world cuts with every word
    var ci = cutIndex(t);
    if (ci >= 0) {
      var kind = CUTS[ci % 4][2];
      w = kind === 'pearl' ? PEARL : kind === 'aurora' ? AURORA : NIGHT;
      if (kind === 'warp') warp = [1, 0.5, 0.5, 2.2 + (t - M.montage) * 2.4];
      if (kind === 'spots') spot = [1.5, 1];
    } else if (t >= M.getit && t < M.lock) w = NIGHT;
    return { t: t, world: w, warp: warp, spot: spot, rays: rays, flash: 0, void: key(t, VOID) };
  }
  function particles(t, s) {
    var out = [], night = s.world[0] + s.world[2] * 0.8 + s.world[3] * 0.6;
    var dustA = night * (1 - s.void) * key(t, [[0, 0.5], [M.morph, 0.5], [M.flash, 0.25], [M.show - 0.4, 0.25], [M.show + 0.6, 0.7], [M.console + 1.2, 0.45], [M.montage, 0.4], [M.cut, 0.18], [M.device, 0.18], [M.tag, 0.45]]);
    var push = t >= M.press2 ? [M.press2, 260] : t >= M.press1 ? [M.press1, 150] : [-10, 0];
    if (cutIndex(t) >= 0) dustA = 0;
    out.push({ name: 'dust', sys: 0, alpha: dustA, a: [dustA, push[0], push[1], 0], b: [RING.x, RING.y, 0, 0] });
    if (t > M.draw0 && t < M.draw1 + 1.4) out.push({ name: 'sparks', sys: 1, alpha: 1, a: [M.draw0, M.draw1, RING.x, RING.y], b: [RING.r, 1, 1.3, 0] });
    if (t > GATHER.t0 - 0.1 && t < GATHER.t0 + GATHER.span + 1) out.push({ name: 'gather', sys: 2, alpha: 1, a: [GATHER.t0, GATHER.span, 1, 1] });
    var sw = env(t, M.swarm, M.swarm + 2.6, 0.4, 0.5);
    if (sw > 0) out.push({ name: 'swarm', sys: 3, alpha: sw, a: [M.swarm, sw, 940, 400], b: [760, 250, 1.45 * E.inOut(seg(t, M.swarm + 1.1, M.swarm + 2.1)), 0] });
    s.particles = out;
  }
  function paintFlat(s) {
    // Without WebGL: the same worlds as flat washes.
    if (!flat) return;
    var c = [s.world[0] * 8 + s.world[1] * 236 + s.world[2] * 70 + s.world[3] * 120, s.world[0] * 12 + s.world[1] * 240 + s.world[2] * 50 + s.world[3] * 110, s.world[0] * 26 + s.world[1] * 248 + s.world[2] * 200 + s.world[3] * 170];
    flat.fillStyle = 'rgb(' + c.map(function (v) { return Math.round(v * (1 - s.void)); }).join(',') + ')';
    flat.fillRect(0, 0, worldCanvas.width, worldCanvas.height);
  }

  // ---------- light ----------
  function beam(x0, y0, x1, y1, k, alpha) {
    // As in the product's Lightline: a glow, a core and an ink line, with a soft head.
    if (alpha <= 0) return;
    var c = lctx;
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    [[11, 'rgba(110,170,255,' + (0.1 * alpha) + ')'], [4.2, 'rgba(130,190,255,' + (0.34 * alpha) + ')'], [1.15, 'rgba(226,240,255,' + (0.95 * alpha) + ')'], [0.42, 'rgba(255,255,255,' + alpha + ')']].forEach(function (l) {
      c.strokeStyle = l[1]; c.lineWidth = l[0] * k; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    });
    var g = c.createRadialGradient(x1, y1, 0, x1, y1, 16 * k);
    g.addColorStop(0, 'rgba(255,255,255,' + (0.95 * alpha) + ')'); g.addColorStop(0.25, 'rgba(190,225,255,' + (0.45 * alpha) + ')'); g.addColorStop(1, 'rgba(120,180,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x1, y1, 16 * k, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  // A point of light with an anamorphic streak, as a lens sees it.
  function flare(x, y, a, s) {
    if (a <= 0.002) return;
    var c = lctx; s = s || 1;
    c.save(); c.globalCompositeOperation = 'lighter';
    var w = 560 * s, g = c.createLinearGradient(x - w, 0, x + w, 0);
    g.addColorStop(0, 'rgba(80,140,255,0)'); g.addColorStop(0.35, 'rgba(110,165,255,' + (0.18 * a) + ')'); g.addColorStop(0.5, 'rgba(220,236,255,' + (0.75 * a) + ')'); g.addColorStop(0.65, 'rgba(110,165,255,' + (0.18 * a) + ')'); g.addColorStop(1, 'rgba(80,140,255,0)');
    c.fillStyle = g; c.fillRect(x - w, y - 1.3 * s, 2 * w, 2.6 * s);
    var r = 80 * s, h = c.createRadialGradient(x, y, 0, x, y, r);
    h.addColorStop(0, 'rgba(255,255,255,' + a + ')'); h.addColorStop(0.1, 'rgba(225,238,255,' + (0.75 * a) + ')'); h.addColorStop(0.35, 'rgba(120,170,255,' + (0.16 * a) + ')'); h.addColorStop(1, 'rgba(90,140,255,0)');
    c.fillStyle = h; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  // A shockwave with chromatic fringes, from the press of a button.
  function shock(t, t0, power) {
    var p = seg(t, t0, t0 + 1.7);
    if (p <= 0 || p >= 1) return;
    var c = lctx, r = RING.r + 1150 * E.out(p), a = Math.pow(1 - p, 1.6) * power;
    c.save(); c.globalCompositeOperation = 'lighter';
    [['255,92,130', -8], ['120,255,200', 0], ['100,150,255', 8]].forEach(function (k) {
      c.strokeStyle = 'rgba(' + k[0] + ',' + f3(0.6 * a) + ')'; c.lineWidth = 1.5 + 6 * (1 - p);
      c.beginPath(); c.arc(RING.x, RING.y, Math.max(1, r + k[1] * (0.4 + 1.6 * p)), 0, TAU); c.stroke();
    });
    var g = c.createRadialGradient(RING.x, RING.y, Math.max(0, r - 220), RING.x, RING.y, r);
    g.addColorStop(0, 'rgba(150,190,255,0)'); g.addColorStop(1, 'rgba(170,205,255,' + f3(0.14 * a) + ')');
    c.fillStyle = g; c.beginPath(); c.arc(RING.x, RING.y, r, 0, TAU); c.fill();
    c.restore();
  }
  // The flight of one line of words from the field to the arrow, at progress p (0 → 1); reversible.
  var FIELD = { x0: 678, y: 362, xa: 1300, ya: 356 };
  function flight(p, width, alpha) {
    var head = toStage(lerp(FIELD.x0 + width, FIELD.xa, E.in(p)), lerp(FIELD.y, FIELD.ya, E.in(p)));
    var tp = clamp(p * 1.18 - 0.18), tail = toStage(lerp(FIELD.x0, FIELD.xa - 6, E.in(tp)), lerp(FIELD.y, FIELD.ya, E.in(tp)));
    beam(tail[0], tail[1], head[0], head[1], cam.s * 1.7, alpha);
  }
  function sweep(t, t0, strength, dur) {
    var p = seg(t, t0, t0 + (dur || 1.1));
    if (p <= 0 || p >= 1) return;
    var c = lctx, x = lerp(-700, 2600, E.sine(p)), a = Math.sin(Math.PI * p) * strength;
    c.save(); c.globalCompositeOperation = 'lighter'; c.translate(x, 540); c.rotate(-0.42);
    var g = c.createLinearGradient(-260, 0, 260, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(225,238,255,' + a + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(-260, -1400, 520, 2800); c.restore();
  }
  function streak(x, y, a, width) {
    if (a <= 0) return;
    var c = lctx;
    c.save(); c.globalCompositeOperation = 'lighter';
    var g = c.createLinearGradient(x - width / 2, 0, x + width / 2, 0);
    g.addColorStop(0, 'rgba(150,200,255,0)'); g.addColorStop(0.5, 'rgba(235,245,255,' + a + ')'); g.addColorStop(1, 'rgba(150,200,255,0)');
    c.fillStyle = g; c.fillRect(x - width / 2, y - 1.2, width, 2.4);
    var h = c.createRadialGradient(x, y, 0, x, y, 120);
    h.addColorStop(0, 'rgba(255,255,255,' + (a * 0.7) + ')'); h.addColorStop(1, 'rgba(170,210,255,0)');
    c.fillStyle = h; c.beginPath(); c.arc(x, y, 120, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function scanLine(t) {
    var a = env(t, SCAN[0], SCAN[1] + 0.25, 0.25, 0.45);
    if (a <= 0) return;
    var x = scanX(t), top = toStage(x, 0), bottom = toStage(x, 1040), w = 70 * cam.s;
    var c = lctx;
    c.save(); c.globalCompositeOperation = 'lighter';
    var g = c.createLinearGradient(top[0] - w, 0, top[0] + w * 0.25, 0);
    g.addColorStop(0, 'rgba(160,205,255,0)'); g.addColorStop(0.8, 'rgba(190,225,255,' + (0.2 * a) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(top[0] - w, top[1], w * 1.25, bottom[1] - top[1]);
    c.fillStyle = 'rgba(235,245,255,' + (0.8 * a) + ')'; c.fillRect(top[0] - 0.9, top[1] - 30, 1.8, bottom[1] - top[1] + 60);
    c.restore();
    flare(top[0], top[1] - 4, 0.55 * a, 0.55); flare(bottom[0], bottom[1] + 4, 0.55 * a, 0.55);
  }
  function lasers(t) {
    var on = env(t, M.lasers - 0.25, M.console + 0.3, 0.6, 0.6), tl = toStage(384, 376), br = toStage(1176, 738);
    if (on <= 0) return;
    lctx.save(); lctx.beginPath(); lctx.rect(tl[0] - 6, tl[1] - 6, br[0] - tl[0] + 12, br[1] - tl[1] + 12); lctx.clip();
    lctx.globalCompositeOperation = 'lighter';
    Object.keys(LANES).forEach(function (id, n) {
      var lane = LANES[id], a = toStage(lane.a[0], lane.a[1]), b = toStage(lane.b[0], lane.b[1]);
      var vert = lane.a[0] === lane.b[0], ox = vert ? 4 * cam.s : 0, oy = vert ? 0 : 4 * cam.s, la = on * env(t, M.lasers - 0.25 + n * 0.12, M.console + 0.3, 0.5, 0.1);
      lctx.setLineDash([5 * cam.s, 7 * cam.s]); lctx.lineDashOffset = -((t * 46 + n * 13) * cam.s);
      lctx.lineWidth = 1.3 * cam.s;
      [-1, 1].forEach(function (side) {
        var g = lctx.createLinearGradient(a[0], a[1], b[0], b[1]);
        g.addColorStop(0, 'rgba(180,149,96,' + (0.8 * la) + ')'); g.addColorStop(0.5, 'rgba(255,242,207,' + (0.95 * la) + ')'); g.addColorStop(1, 'rgba(255,255,255,' + (0.75 * la) + ')');
        lctx.strokeStyle = g; lctx.beginPath(); lctx.moveTo(a[0] + ox * side, a[1] + oy * side); lctx.lineTo(b[0] + ox * side, b[1] + oy * side); lctx.stroke();
      });
      lctx.setLineDash([]); lctx.lineWidth = 4 * cam.s; lctx.strokeStyle = 'rgba(150,200,255,' + (0.2 * la) + ')';
      lctx.beginPath(); lctx.moveTo(a[0], a[1]); lctx.lineTo(b[0], b[1]); lctx.stroke();
    });
    SHOTS.forEach(function (s) {
      var u = (t - s.t0) / s.dur;
      if (u <= 0 || u >= 1.25) return;
      var lane = LANES[s.lane], A = s.rev ? lane.b : lane.a, B = s.rev ? lane.a : lane.b;
      var len = Math.hypot(B[0] - A[0], B[1] - A[1]), body = 150, d = u * (len + body);
      var hx2 = A[0] + (B[0] - A[0]) * Math.min(d, len) / len, hy2 = A[1] + (B[1] - A[1]) * Math.min(d, len) / len;
      var tdist = Math.max(0, d - body), txx = A[0] + (B[0] - A[0]) * Math.min(tdist, len) / len, tyy = A[1] + (B[1] - A[1]) * Math.min(tdist, len) / len;
      var h1 = toStage(hx2, hy2), t1 = toStage(txx, tyy);
      if (Math.hypot(h1[0] - t1[0], h1[1] - t1[1]) < 0.5) return;
      var g = lctx.createLinearGradient(t1[0], t1[1], h1[0], h1[1]);
      g.addColorStop(0, 'rgba(105,172,255,0)'); g.addColorStop(0.55, 'rgba(105,172,255,' + (0.85 * on) + ')'); g.addColorStop(0.85, 'rgba(180,221,255,' + on + ')'); g.addColorStop(1, 'rgba(255,255,255,' + on + ')');
      lctx.strokeStyle = g; lctx.lineCap = 'round';
      lctx.lineWidth = 11 * cam.s; lctx.globalAlpha = 0.16; lctx.beginPath(); lctx.moveTo(t1[0], t1[1]); lctx.lineTo(h1[0], h1[1]); lctx.stroke();
      lctx.lineWidth = 3.2 * cam.s; lctx.globalAlpha = 1; lctx.beginPath(); lctx.moveTo(t1[0], t1[1]); lctx.lineTo(h1[0], h1[1]); lctx.stroke();
      if (d < len) {
        var hg = lctx.createRadialGradient(h1[0], h1[1], 0, h1[0], h1[1], 12 * cam.s);
        hg.addColorStop(0, 'rgba(255,255,255,' + (0.9 * on) + ')'); hg.addColorStop(1, 'rgba(105,172,255,0)');
        lctx.fillStyle = hg; lctx.beginPath(); lctx.arc(h1[0], h1[1], 12 * cam.s, 0, Math.PI * 2); lctx.fill();
      }
    });
    lctx.restore();
  }
  // Leader lines from each layer to its label, in ink.
  function leaders(t, spots) {
    lctx.save();
    spots.forEach(function (s) {
      if (s.a <= 0.002) return;
      lctx.strokeStyle = 'rgba(13,18,32,' + f3(0.5 * s.a) + ')'; lctx.lineWidth = 1.6;
      lctx.beginPath(); lctx.moveTo(s.from[0], s.from[1]); lctx.lineTo(s.to[0] - 18, s.to[1]); lctx.lineTo(s.to[0] - 4, s.to[1]); lctx.stroke();
      lctx.fillStyle = 'rgba(13,18,32,' + f3(0.14 * s.a) + ')'; lctx.beginPath(); lctx.arc(s.from[0], s.from[1], 12, 0, TAU); lctx.fill();
      lctx.fillStyle = 'rgba(13,18,32,' + f3(0.9 * s.a) + ')'; lctx.beginPath(); lctx.arc(s.from[0], s.from[1], 5.5, 0, TAU); lctx.fill();
    });
    lctx.restore();
  }
  function constellation(t) {
    var on = env(t, M.stars, M.hold + 0.6, 0.3, 0.9);
    if (on <= 0) return;
    var c = lctx;
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    STAR_EDGES.forEach(function (e, n) {
      var p = E.inOut(seg(t, M.stars + n * 0.11, M.stars + n * 0.11 + 0.42));
      if (p <= 0) return;
      var a = toStage.apply(null, lueurPosition(e[0], t)), b = toStage.apply(null, lueurPosition(e[1], t));
      var hx = lerp(a[0], b[0], p), hy = lerp(a[1], b[1], p);
      c.strokeStyle = 'rgba(205,230,255,' + f3(0.75 * on) + ')'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(hx, hy); c.stroke();
      c.strokeStyle = 'rgba(140,190,255,' + f3(0.22 * on) + ')'; c.lineWidth = 7;
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(hx, hy); c.stroke();
      if (p < 1) {
        var g = c.createRadialGradient(hx, hy, 0, hx, hy, 18);
        g.addColorStop(0, 'rgba(255,255,255,' + f3(0.9 * on) + ')'); g.addColorStop(1, 'rgba(150,200,255,0)');
        c.fillStyle = g; c.beginPath(); c.arc(hx, hy, 18, 0, TAU); c.fill();
      }
    });
    c.restore();
  }

  // ---------- one frame ----------
  function appear(node, t, t0, dur, dy, blur) {
    var p = E.out(seg(t, t0, t0 + (dur || 0.7)));
    node.style.opacity = f3(p);
    node.style.transform = (node.dataset.base || '') + ' translateY(' + ((1 - p) * (dy === undefined ? 14 : dy)).toFixed(2) + 'px)';
    if (blur) node.style.filter = blurOf((1 - p) * blur);
  }
  function show(node, on) { var v = on ? 'visible' : 'hidden'; if (node.style.visibility !== v) node.style.visibility = v; }

  function render(t) {
    t = clamp(t, 0, DURATION);
    var T = M.tag, D = M.device;

    // ---- camera and device ----
    var c = key(t, CAMERA);
    cam.s = c[2]; cam.tx = c[0] - SCX * c[2]; cam.ty = c[1] - SCY * c[2];
    camera.style.transform = 'translate(' + px(cam.tx) + ',' + px(cam.ty) + ') scale(' + cam.s.toFixed(5) + ')';
    var r3 = key(t, ROT); rot.ax = r3[0]; rot.ay = r3[1]; rot.az = r3[2];
    var spread = key(t, SPREAD);
    device.classList.toggle('space', spread > 0.001);
    device.style.transform = (rot.ax || rot.ay || rot.az) ? 'rotateX(' + rot.ax.toFixed(3) + 'deg) rotateY(' + rot.ay.toFixed(3) + 'deg) rotateZ(' + rot.az.toFixed(3) + 'deg)' : 'none';
    LAYERS.forEach(function (layer, i) {
      layer.style.transform = spread > 0.001 ? 'translateZ(' + (LAYER_Z[i] * GAP * spread).toFixed(2) + 'px)' : 'none';
      if (i) layer.style.setProperty('--frame', f3(0.9 * E.sine(seg(spread, 0.25, 1))));
    });
    var screenA = key(t, [[0, 0], [M.morph + 0.4, 0], [M.flash - 0.1, 1], [M.warp + 0.3, 1], [M.warp + 0.55, 0], [M.back, 0], [M.back + 0.25, 1], [M.console, 1], [M.console + 0.5, 0], [M.cut - 0.01, 0], [M.cut, 1, 'linear'], [T, 1], [T + 0.7, 0]]);
    show(camera, screenA > 0.001);
    screen.style.opacity = screenA < 0.999 ? f3(screenA) : '';
    bezel.style.opacity = f3(key(t, [[D + 0.2, 0], [D + 1.7, 1]]));
    halo.style.opacity = f3(key(t, [[D, 0], [D + 1.8, 0.9], [T, 0.9], [T + 0.7, 0]]));
    innerSky.style.transform = 'scale(' + (1.01 + 0.012 * Math.sin(t * 0.21)).toFixed(4) + ')';
    screenDim.style.opacity = f3(key(t, [[M.cut - 0.01, 0, 'linear'], [M.cut, 0.52, 'linear'], [M.cut + 3, 0.52], [M.cut + 4, 0.46], [D, 0.4], [D + 1.6, 0]]));
    backdrop.style.opacity = f3(0.5 * env(t, M.sheet + 0.2, M.console + 0.4, 0.8, 0.6));
    var gp = seg(t, M.flash + 0.3, M.flash + 1.9), gp2 = seg(t, D + 1.9, D + 3.8);
    glare.style.opacity = f3(Math.max(Math.sin(Math.PI * gp) * 0.8, Math.sin(Math.PI * gp2)));
    glare.style.transform = 'translateX(' + lerp(-55, 55, gp2 > 0 ? gp2 : gp).toFixed(2) + '%)';

    // ---- the base, assembled by the passing light ----
    ASSEMBLY.forEach(function (a) { appear(a[0], t, a[1], a[0] === card ? 0.95 : 0.7, a[0] === card ? 22 : 12, a[0] === card ? 8 : 0); });
    appear(cardGlass, t, cardStart, 0.95, 22, 0);
    var spot = 1 - 0.78 * env(t, M.type - 1.1, M.sheet + 1.0, 0.7, 0.8);
    if (spot < 1) SPOTLIT.forEach(function (node) { node.style.opacity = f3(parseFloat(node.style.opacity) * spot); });
    q('.avatar').style.setProperty('--spin', ((t * 360 / 14) % 360).toFixed(2) + 'deg');

    // ---- launch pad: typing, the flight, the arrow; then the stage: rehearsal and bursts ----
    var chars = '念起，光行', n = t < M.type ? 0 : Math.min(5, 1 + Math.floor((t - M.type) / 0.25));
    var R0 = M.rehearse;
    var rehearsalText = t >= R0 + 0.1 && t < M.sheet - 0.2;
    typed.textContent = rehearsalText ? chars : chars.slice(0, n);
    var squash = t < R0 ? E.in(seg(t, M.fly - 0.28, M.fly)) : E.in(seg(t, R0 + 0.5, R0 + 0.75)) * (1 - E.out(seg(t, R0 + 1.75, R0 + 2.0)));
    var textOn = t < R0 ? (t < M.fly + 0.02 ? 1 : 0) : (rehearsalText ? (t < R0 + 0.77 || t > R0 + 1.74 ? E.out(seg(t, R0 + 0.1, R0 + 0.35)) * (1 - E.out(seg(t, M.sheet - 0.6, M.sheet - 0.2))) : 0) : 0);
    typed.style.opacity = f3(textOn);
    typed.style.transform = 'scaleY(' + (1 - 0.94 * squash).toFixed(3) + ')';
    typed.style.filter = squash > 0.001 ? 'brightness(' + (1 + 2 * squash).toFixed(2) + ')' : 'none';
    ph.style.opacity = f3(t < M.type - 0.15 ? 1 : (t > R0 - 0.2 && t < R0 + 0.1) ? 0 : t > M.sheet - 0.2 ? E.out(seg(t, M.sheet - 0.2, M.sheet + 0.3)) : (t > M.back && t < R0 - 0.2 ? 1 : 0));
    var caretOn = t > M.type - 0.25 && t < M.fly - 0.3;
    caret.style.opacity = caretOn ? (Math.floor((t - M.type + 0.25) * 2.4) % 2 === 0 ? '1' : '0.15') : '0';
    caret.style.left = (47 + typed.offsetWidth + 2) + 'px';
    var hits = [M.fly + 0.52, M.burst + 0.3, M.burst + 0.65, M.burst + 1.0];
    var pul = hits.reduce(function (m, h, i) { return Math.max(m, pulse(t, h, h + (i ? 0.38 : 0.67)) * (i ? 0.7 : 1)); }, 0);
    go.style.transform = 'scale(' + (1 + 0.14 * pul).toFixed(3) + ')';
    go.style.boxShadow = '0 4px 14px rgba(10,89,247,.45), 0 0 ' + (34 * pul).toFixed(1) + 'px ' + (10 * pul).toFixed(1) + 'px rgba(64,140,255,' + f3(0.75 * pul) + ')';

    // ---- the stage sheet ----
    var ms = env(t, M.sheet + 0.75, M.console + 0.3, 0.6, 0.5);
    motionSheet.style.opacity = f3(ms);
    motionSheet.style.transform = 'translateY(' + ((1 - E.out(seg(t, M.sheet + 0.75, M.sheet + 1.4))) * 60).toFixed(2) + 'px)';
    randomToggle.style.setProperty('--on', f3(E.inOut(seg(t, M.lasers - 0.43, M.lasers - 0.1))));

    // ---- the console ----
    var au = env(t, M.console + 0.1, M.montage, 0.8, 0.01);
    show(aurora, au > 0.001);
    aurora.style.opacity = f3(au);
    var rise = E.out(seg(t, M.console + 0.3, M.console + 1.3));
    glassPanel.style.transform = 'translateY(' + ((1 - rise) * 90).toFixed(2) + 'px)';
    glassPanel.style.opacity = f3(rise);
    var sIn = E.out(seg(t, M.console + 0.6, M.console + 1.7));
    specimen.style.transform = 'rotate(' + (-12 + 4 * Math.sin((t - M.console) * 0.5)).toFixed(3) + 'deg) scale(' + (0.86 + 0.14 * sIn).toFixed(4) + ')';
    specimen.style.opacity = f3(sIn);
    var v = KNOBS.map(function (k, i) {
      var value = knobValue(i, t), a = knobStart(i);
      if (au > 0.001) {
        k.value.textContent = Math.round(value);
        k.track.style.setProperty('--v', value.toFixed(2) + '%');
        k.dot.style.setProperty('--live', f3(pulse(t, a - 0.05, a + 0.9)));
      }
      return value / 100;
    });
    var touchA = env(t, knobStart(5) + 0.2, M.montage, 0.5, 0.3);
    if (au > 0.001) {
      drawOrbs(t);
      specimen.style.setProperty('--sp-blur', (2 + 30 * v[1]).toFixed(2) + 'px');
      specimen.style.setProperty('--sp-sat', (60 + 190 * v[4]).toFixed(1) + '%');
      specimen.style.setProperty('--sp-fill', f3(0.04 + 0.34 * (1 - v[0])));
      specimen.style.setProperty('--sp-warm', f3(0.15 + 0.9 * (v[2] - 0.4)));
      specimen.style.setProperty('--sp-edge', f3(v[3]));
      specimen.style.setProperty('--sp-touch', f3(touchA * v[5]));
      specimen.style.setProperty('--sp-tx', (58 + 16 * Math.sin((t - 40) * 1.3)).toFixed(2) + '%');
      specimen.style.setProperty('--sp-ty', (36 + 12 * Math.cos((t - 40) * 1.1)).toFixed(2) + '%');
    }
    // The card on the device keeps the same six settings at their defaults.
    cardGlass.style.setProperty('--touch', '0');

    // ---- residents ----
    penPath.style.strokeDashoffset = ((1 - E.inOut(seg(t, M.pen, M.pen + 0.8))) * penLength).toFixed(1);
    penPath.style.opacity = f3(t < M.pen ? 0 : 1 - E.sine(seg(t, L0 + 0.9, L0 + 1.55)));
    var tease = spread; // a glimpse of the residents in the exploded view
    LUEURS.forEach(function (lu, i) {
      var pos, alpha;
      if (tease > 0.001 && t < M.cut) {
        pos = lu.base; alpha = 0.55 * tease;
        lu.node.style.opacity = f3(alpha);
        lu.node.style.transform = 'translate(' + px(pos[0]) + ',' + px(pos[1]) + ')';
        lu.idNode.style.opacity = '0'; lu.node.style.setProperty('--held', '0'); lu.glint.style.opacity = '0';
        return;
      }
      if (t < lu.in || t < M.cut || t > T + 0.8) { lu.node.style.opacity = '0'; return; }
      var pop = E.back(seg(t, lu.in, lu.in + 0.55));
      pos = lueurPosition(i, t);
      lu.node.style.opacity = f3(Math.min(1, seg(t, lu.in, lu.in + 0.3) * 1.2));
      lu.node.style.transform = 'translate(' + px(pos[0]) + ',' + px(pos[1]) + ') scale(' + f3(0.4 + 0.6 * pop) + ')';
      lu.idNode.style.opacity = f3(Math.max(env(t, lu.in + 0.12, lu.in + 1.35, 0.25, 0.4), i === 6 ? env(t, M.hold + 0.15, M.hold + 1.95, 0.3, 0.45) : 0));
      lu.node.style.setProperty('--held', f3(i === 6 ? env(t, M.hold + 0.05, M.hold + 1.5, 0.3, 0.35) : 0));
      var gl = (i === 3 || i === 4) ? seg(t, ENC.hit - 0.02, ENC.hit + 0.3) : 0;
      lu.glint.style.opacity = f3(gl > 0 && gl < 1 ? Math.sin(Math.PI * gl) : 0);
      lu.glint.style.transform = 'rotate(-35deg) scaleX(' + f3(0.35 + 0.85 * gl) + ')';
    });
    var hp = lueurPosition(6, t);
    touch.style.opacity = f3(env(t, M.hold, M.hold + 1.45, 0.3, 0.3));
    touch.style.transform = 'translate(' + px(hp[0]) + ',' + px(hp[1]) + ') scale(' + f3(0.8 + 0.2 * E.out(seg(t, M.hold, M.hold + 0.3))) + ')';

    // ---- H◯me 键 ----
    var slide = Math.min(E.inOut(seg(t, M.home - 0.05, M.home + 0.75)), 1 - E.inOut(seg(t, M.press2 - 0.62, M.press2 - 0.08)));
    var follow = HOME.shift * (slide - 1);
    var hmIn = E.out(seg(t, M.home + 0.15, M.home + 1.05)), keyIn = E.out(seg(t, M.home + 0.4, M.home + 1.25));
    var hmOut = E.sine(seg(t, M.press2 - 0.55, M.press2 - 0.05));
    var hmA = hmIn * (1 - hmOut);
    [hmH, hmMe, hmKey, hmCall, hmEn].forEach(function (node) { show(node, hmA > 0.001); });
    hmH.style.opacity = f3(hmA); hmMe.style.opacity = f3(hmA); hmKey.style.opacity = f3(keyIn * (1 - hmOut));
    hmH.style.transform = 'translateX(' + (follow - (1 - hmIn) * 70 - hmOut * 30).toFixed(2) + 'px)';
    hmMe.style.transform = 'translateX(' + (follow + (1 - hmIn) * 70 + hmOut * 30).toFixed(2) + 'px)';
    hmKey.style.transform = 'translateX(' + (follow + (1 - keyIn) * 110 + hmOut * 40).toFixed(2) + 'px)';
    hmH.style.filter = blurOf((1 - hmIn) * 14 + hmOut * 10); hmMe.style.filter = hmH.style.filter;
    hmKey.style.filter = blurOf((1 - keyIn) * 16 + hmOut * 10);
    var callIn = E.out(seg(t, M.home, M.home + 0.8));
    var ls = lerp(22, 8, callIn).toFixed(2) + 'px';
    hmCall.style.opacity = f3(callIn * (1 - hmOut)); hmCall.style.letterSpacing = ls; hmCall.style.paddingLeft = ls;
    hmCall.style.transform = 'translateX(-50%)';
    var enIn = E.out(seg(t, M.home + 0.8, M.home + 1.6));
    hmEn.style.opacity = f3(enIn * (1 - hmOut)); hmEn.style.transform = 'translate(-50%,' + ((1 - enIn) * 10).toFixed(2) + 'px)';

    // ---- one place, four names ----
    var ci = cutIndex(t);
    show(montage, ci >= 0);
    if (ci >= 0) {
      var cut = CUTS[ci % 4], ink = cut[2] === 'pearl', cp = (t - M.montage - ci * CUT) / CUT;
      if (mWord.textContent !== cut[0]) { mWord.textContent = cut[0]; mLatin.textContent = cut[1]; }
      montage.style.opacity = '1';
      montage.style.color = ink ? '#0d1220' : '#f4f6fa';
      montage.style.transform = 'scale(' + (1.08 - 0.08 * E.out5(clamp(cp))).toFixed(4) + ')';
      mWord.style.filter = blurOf(Math.max(0, 1 - cp * 6) * 10);
    }
    var gi = env(t, M.getit, M.four - 0.05, 0.25, 0.35);
    show(getit, gi > 0.001);
    getit.style.opacity = f3(gi);
    getit.style.letterSpacing = lerp(18, 10, E.out(seg(t, M.getit, M.getit + 1.0))).toFixed(2) + 'px';
    w4.forEach(function (node, i) {
      var a = M.four + i * 0.14, inP = E.out(seg(t, a, a + 0.45)), merge = E.inOut(seg(t, M.merge, M.lock));
      node.style.opacity = f3(t > M.lock + 0.01 ? 0 : inP);
      node.style.filter = blurOf((1 - inP) * 8);
      node.style.transform = 'translateX(' + ((1 - inP) * -40).toFixed(2) + 'px)';
      node.firstChild.style.opacity = f3(1 - merge);
      node.lastChild.style.transform = 'translateY(' + ((472 - (322 + i * 100)) * merge).toFixed(2) + 'px)';
    });
    var mv = E.inOut(seg(t, M.lock, M.lock + 0.8)), lockOut = 1 - E.sine(seg(t, M.dark - 0.5, M.dark + 0.1));
    lkTai.style.opacity = f3(t < M.lock ? 0 : lockOut);
    lkTai.style.transform = 'translate(' + px(lerp(984, 1035, mv)) + ',' + px(lerp(472, 395, mv)) + ') scale(' + lerp(76 / 150, 1, mv).toFixed(4) + ')';
    var lingIn = G ? E.sine(seg(t, GATHER.t0 + GATHER.span - 0.35, GATHER.t0 + GATHER.span + 0.45)) : E.out(seg(t, M.lock + 0.6, M.lock + 1.55));
    lkLing.style.opacity = f3(lingIn * lockOut);
    lkMark.style.opacity = f3(E.out(seg(t, M.lock + 1.45, M.lock + 2.25)) * lockOut);
    lkMark.style.letterSpacing = lerp(40, 22, E.out(seg(t, M.lock + 1.45, M.lock + 2.6))).toFixed(2) + 'px';
    var kick = E.out(seg(t, M.lock + 2.0, M.lock + 2.8));
    lkKicker.style.opacity = f3(kick * lockOut);
    lkKicker.style.transform = 'translateY(' + ((1 - kick) * 10).toFixed(2) + 'px)';

    // ---- made for one screen ----
    var specsOut = 1 - E.sine(seg(t, T - 0.3, T + 0.2));
    show(specsBox, t > M.specs - 0.1 && t < T + 0.3);
    SPECS.forEach(function (s) {
      var p = seg(t, s.t0, s.t0 + 0.36), slam = E.out5(p), count = E.out(seg(t, s.t0, s.t0 + 0.9));
      s.row.style.opacity = f3(Math.min(1, p * 2.5) * specsOut);
      s.row.style.transform = 'translateX(' + ((1 - slam) * 60).toFixed(2) + 'px) scale(' + (1.18 - 0.18 * slam).toFixed(4) + ')';
      s.row.style.filter = blurOf((1 - slam) * 12);
      var text = s.text || s.fmt(Array.isArray(s.to) ? s.to.map(function (v) { return v * count; }) : s.to * count);
      if (s.num.textContent !== text) s.num.textContent = text;
    });

    // ---- tagline and end mark ----
    var lit = t >= M.flash2 + 0.1;
    tagline.style.opacity = t > T + 0.5 ? '1' : '0';
    tagline.style.color = lit ? '#0d1220' : '#f4f6fa';
    var p1 = E.out(seg(t, T + 0.6, T + 1.5)), p2 = E.out(seg(t, M.flash2 + 0.15, M.flash2 + 1.0));
    tg1.style.opacity = f3(p1); tg1.style.filter = blurOf((1 - p1) * 10);
    tg2.style.opacity = f3(p2); tg2.style.filter = blurOf((1 - p2) * 10);
    tgEn.style.opacity = f3(E.out(seg(t, M.flash2 + 0.9, M.flash2 + 1.7)));
    endmark.style.color = '#0d1220';
    endmark.style.opacity = f3(E.out(seg(t, M.flash2 + 1.6, M.flash2 + 2.4)));
    wordsLayer.style.opacity = '1';

    // ---- overlays ----
    black.style.opacity = '0';
    bloom.style.opacity = f3(key(t, BLOOM));
    scrim.style.opacity = f3(key(t, [[M.launch - 0.2, 0], [M.launch + 0.6, 0.85], [M.warp + 0.3, 0.85], [M.warp + 0.6, 0.35], [M.back, 0.35], [M.back + 0.4, 0.85], [M.sheet - 0.6, 0.85], [M.sheet + 0.4, 0.72], [M.show, 0.72], [M.show + 1.0, 0.3], [M.console, 0.3], [M.console + 0.5, 0], [M.cut - 0.01, 0], [M.cut, 0.8, 'linear'], [D, 0.8], [D + 1, 0]]));

    // ---- the world ----
    var s = worldState(t);
    var pearlish = s.world[1];
    vignette.style.opacity = f3((1 - 0.7 * pearlish) * (1 - s.void * 0.5));
    stage.style.background = pearlish > 0.5 ? '#eef2f8' : '#04060c';

    // ---- the ring: a button called Home, then the place it became ----
    var draw = E.inOut(seg(t, M.draw0, M.draw1));
    var dip = function (t0) { var p = seg(t, t0, t0 + 0.75); return p <= 0 || p >= 1 ? 0 : (p < 0.4 ? Math.sin(Math.PI * p / 0.4) * 0.075 : -Math.sin(Math.PI * (p - 0.4) / 0.6) * 0.012); };
    var scale = 1 - dip(M.press1) - dip(M.press2);
    var morph = E.inOut(seg(t, M.morph, M.flash + 0.05));
    var R = RING.r, cx = RING.x + HOME.shift * slide, cy = RING.y;
    var rw = lerp(2 * R, 1560 * 0.62, morph) * scale, rh = lerp(2 * R, 1040 * 0.62, morph) * scale, rr = lerp(R, 30 * 0.62, morph) * scale;
    var ringA = t < M.draw0 ? 0 : key(t, [[M.draw0, 1], [M.flash, 1], [M.flash + 0.1, 0, 'linear']]);
    show(ring, ringA > 0.001); show(ringGlow, ringA > 0.001);
    if (ringA > 0.001) {
      [ring, ringGlow].forEach(function (node) {
        node.setAttribute('x', (cx - rw / 2).toFixed(2)); node.setAttribute('y', (cy - rh / 2).toFixed(2));
        node.setAttribute('width', rw.toFixed(2)); node.setAttribute('height', rh.toFixed(2));
        node.setAttribute('rx', rr.toFixed(2)); node.setAttribute('ry', rr.toFixed(2));
      });
      var perimeter = 2 * Math.PI * R;
      ring.style.strokeDasharray = draw < 1 ? perimeter.toFixed(1) : 'none';
      ring.style.strokeDashoffset = draw < 1 ? ((1 - draw) * perimeter).toFixed(1) : '0';
      ringGlow.style.strokeDasharray = ring.style.strokeDasharray; ringGlow.style.strokeDashoffset = ring.style.strokeDashoffset;
      // During the name, the ring takes the weight of the letters around it.
      var asO = env(t, M.home + 0.1, M.press2 - 0.1, 0.6, 0.5);
      ring.style.strokeWidth = lerp(2.6, HOME.stem, asO).toFixed(2);
      ring.style.opacity = f3(ringA);
      var breath = 0.32 + 0.12 * Math.sin(t * 2.1);
      ringGlow.style.opacity = f3(ringA * (draw < 1 ? 0.6 : breath + 0.5 * Math.max(pulse(t, M.press1, M.press1 + 0.75), pulse(t, M.press2, M.press2 + 0.75), Math.sin(Math.PI * morph))));
    }
    press.style.opacity = f3(Math.max(t > M.press1 + 0.05 ? 0.9 * (1 - E.out(seg(t, M.press1 + 0.05, M.press1 + 1.05))) : 0, t > M.press2 + 0.05 ? 0.9 * (1 - E.out(seg(t, M.press2 + 0.05, M.press2 + 1.05))) : 0));

    // ---- light ----
    lctx.clearRect(0, 0, 1920, 1080);
    // The first photon, and the head that draws the ring
    if (t > M.photon && t < M.draw1 + 0.8) {
      var ang = -Math.PI / 2 + draw * TAU, hx = cx + R * Math.cos(ang), hy = cy + R * Math.sin(ang);
      var born = E.out(seg(t, M.photon, M.photon + 0.35)), done = 1 - E.sine(seg(t, M.draw1, M.draw1 + 0.7));
      var sparkle = 1 + 0.6 * pulse(t, M.draw1 - 0.05, M.draw1 + 0.45);
      flare(hx, hy, born * done * 0.95, (0.55 + 0.25 * born) * sparkle);
    }
    shock(t, M.press1, 0.8);
    shock(t, M.press2, 1.15);
    shock(t, M.press2 + 0.16, 0.5);
    if (t > M.press1 && t < M.press1 + 0.6) flare(cx, cy, pulse(t, M.press1, M.press1 + 0.6) * 0.8, 1.3);
    if (t > M.press2 && t < M.press2 + 0.8) flare(cx, cy, pulse(t, M.press2, M.press2 + 0.8), 1.8);
    sweep(t, M.home + 0.75, 0.1, 1.2);
    // The base and the exploded view
    scanLine(t);
    if (spread > 0.001) {
      var spots = ANCHORS.map(function (an, i) {
        var a = env(t, M.explode + 1.4 + i * 0.16, M.implode + 0.15, 0.5, 0.45);
        return { a: a, from: project(an[0], an[1], LAYER_Z[[0, 1, 2, 4][an[2]]] * GAP * spread), i: i };
      });
      // A tidy column on the right; each label at the height of its layer, never crowding the next.
      var order = spots.slice().sort(function (p, q2) { return p.from[1] - q2.from[1]; }), y0 = -1e9;
      order.forEach(function (s0) { var y = Math.max(s0.from[1] - 10, y0 + 128); s0.to = [1450, y]; y0 = y; });
      spots.forEach(function (s0) {
        var node = LABELS[s0.i];
        node.style.opacity = f3(s0.a);
        node.style.transform = 'translate(' + px(1462 + (1 - s0.a) * 16) + ',' + px(s0.to[1] - 24) + ')';
      });
      leaders(t, spots);
    } else LABELS.forEach(function (node) { if (node.style.opacity !== '0') node.style.opacity = '0'; });
    // Launch pad
    var wordWidth = Math.max(typed.offsetWidth, 90);
    if (t > M.fly - 0.03 && t < M.fly + 0.62) flight(seg(t, M.fly, M.fly + 0.52), wordWidth, 1 - 0.85 * seg(t, M.fly + 0.5, M.fly + 0.62));
    if (t > M.fly + 0.5 && t < M.warp + 0.7) { var ga = toStage(1307, 356); flare(ga[0], ga[1], pulse(t, M.fly + 0.5, M.warp + 0.7), 1.2 + 2 * seg(t, M.warp, M.warp + 0.6)); }
    if (t > M.warp + 0.4 && t < M.back + 0.2) flare(960, 470, 0.5 * env(t, M.warp + 0.4, M.back + 0.2, 0.5, 0.3) * (0.85 + 0.15 * Math.sin(t * 9)), 1.6);
    if (t > R0 + 0.74 && t < R0 + 1.76) { // the rehearsal: out to the arrow and back, played in reverse
      var rp = t < R0 + 1.25 ? seg(t, R0 + 0.75, R0 + 1.25) : 1 - seg(t, R0 + 1.25, R0 + 1.75);
      flight(rp, wordWidth, 0.95);
    }
    [M.burst, M.burst + 0.35, M.burst + 0.7].forEach(function (b0) { // held Enter: light only, shot after shot
      if (t > b0 && t < b0 + 0.42) flight(seg(t, b0, b0 + 0.32), 70, 1 - 0.9 * seg(t, b0 + 0.3, b0 + 0.42));
    });
    if (t > M.lasers - 0.3 && t < M.console + 0.35) lasers(t);
    [M.flash + 0.9, M.launch + 0.1, M.sheet - 0.1].forEach(function (t0) { sweep(t, t0, 0.06); });
    sweep(t, M.console + 0.05, 0.22, 0.9);
    // One place, four names
    if (ci >= 0) { var cpp = (t - M.montage - ci * CUT) / CUT; streak(960, 540 + (ci % 2 ? 150 : -150), 0.5 * (1 - clamp(cpp * 3)), 1900); }
    if (t > M.merge + 0.2 && t < M.merge + 1.4) streak(1022, 510, 0.8 * pulse(t, M.merge + 0.25, M.merge + 1.3), 1600);
    sweep(t, M.lock + 2.2, 0.16, 1.3);
    // Residents
    constellation(t);
    if (t > ENC.hit - 0.05 && t < ENC.hit + 0.5) { // a contact, in light
      var cpa = lueurPosition(3, ENC.hit), cpb = lueurPosition(4, ENC.hit), mid = toStage((cpa[0] + cpb[0]) / 2, (cpa[1] + cpb[1]) / 2);
      flare(mid[0], mid[1], 0.8 * pulse(t, ENC.hit - 0.04, ENC.hit + 0.45), 0.6);
    }
    // The spec slam: each number lands with a flash of light
    SPECS.forEach(function (sp, i) { if (t > sp.t0 && t < sp.t0 + 0.5 && !lit) streak(1290, 300 + i * 150, 0.4 * pulse(t, sp.t0, sp.t0 + 0.5), 900); });
    // Under the last words, a line of light
    if (t > T + 0.9 && t < M.flash2 + 0.1) {
      var up = E.inOut(seg(t, T + 0.95, T + 1.9)), ua = 1 - seg(t, M.flash2 - 0.2, M.flash2 + 0.05);
      beam(lerp(450, 980, Math.max(0, up - 0.3) / 0.7 * 0.96), 668, lerp(450, 980, up), 668, 1.2, ua * 0.95);
      if (t > M.flash2 - 0.6) flare(980, 668, E.in2(seg(t, M.flash2 - 0.6, M.flash2)), 1 + 3 * E.in2(seg(t, M.flash2 - 0.6, M.flash2)));
    }

    // The ring returns, small and in ink: the place you come back to.
    var ringEnd = E.inOut(seg(t, M.flash2 + 1.9, M.flash2 + 2.9));
    if (ringEnd > 0) {
      lctx.save(); lctx.strokeStyle = 'rgba(13,18,32,0.8)'; lctx.lineWidth = 1.8; lctx.lineCap = 'round';
      lctx.beginPath(); lctx.arc(960, 772, 12, -Math.PI / 2, -Math.PI / 2 + TAU * ringEnd); lctx.stroke(); lctx.restore();
    }

    // ---- words ----
    CAPTIONS.forEach(function (capt) { renderCaption(capt, t); });

    // ---- the world and its glints ----
    if (G) { particles(t, s); G.render(s); } else paintFlat(s);
  }

  // ---------- fit to the window ----------
  function fit() {
    var w = window.innerWidth, h = window.innerHeight, s = Math.min(w / 1920, h / 1080);
    stage.style.transform = 'translate(' + px((w - 1920 * s) / 2) + ',' + px((h - 1080 * s) / 2) + ') scale(' + s.toFixed(5) + ')';
  }
  fit();
  window.addEventListener('resize', fit);

  var time = Math.max(0, Math.min(DURATION, parseFloat(params.get('t')) || 0));
  layoutHome();
  render(time);
  var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  var ready = fonts.then(function () {
    return document.fonts ? Promise.all(['300 150px "Film Serif"', '200 330px "Film Latin"', '100 240px "Film Sans"'].map(function (f) { return document.fonts.load(f, '灵感Home键'); })) : null;
  }).catch(function () {}).then(function () { layoutHome(); sampleLockup(); render(time); });

  if (CAPTURE) {
    window.__film = { duration: DURATION, ready: ready, seek: function (t) { time = t; render(t); } };
    return;
  }

  // ---------- player ----------
  var controls = $('controls'), title = $('title'), playBtn = $('play'), scrub = $('scrub'), clock = $('time');
  var playing = false, last = 0, idleTimer = 0, scrubbing = false;
  function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function sync() {
    controls.classList.toggle('playing', playing);
    if (!scrubbing) scrub.value = String(Math.round(time / DURATION * 1000));
    clock.textContent = fmt(time) + ' / ' + fmt(DURATION);
  }
  function wake() {
    controls.classList.remove('idle'); title.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { if (playing) { controls.classList.add('idle'); title.classList.add('idle'); } }, 2600);
  }
  function setPlaying(on) {
    if (on && time >= DURATION) time = 0;
    playing = on;
    last = 0; sync(); wake();
  }
  function tick(now) {
    if (playing) {
      if (last) time = Math.min(DURATION, time + (now - last) / 1000);
      last = now;
      render(time);
      if (time >= DURATION) { playing = false; wake(); }
      sync();
    } else last = 0;
    window.requestAnimationFrame(tick);
  }
  playBtn.addEventListener('click', function () { setPlaying(!playing); });
  $('replay').addEventListener('click', function () { time = 0; render(0); setPlaying(true); });
  $('full').addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
  });
  scrub.addEventListener('input', function () { scrubbing = true; time = Number(scrub.value) / 1000 * DURATION; render(time); sync(); });
  scrub.addEventListener('change', function () { scrubbing = false; });
  document.addEventListener('pointermove', wake);
  document.addEventListener('keydown', function (event) {
    if (event.target === scrub && /Arrow/.test(event.key)) return;
    if (event.key === ' ' || event.key === 'k') { event.preventDefault(); setPlaying(!playing); }
    else if (event.key === 'ArrowRight') { time = Math.min(DURATION, time + 5); render(time); sync(); wake(); }
    else if (event.key === 'ArrowLeft') { time = Math.max(0, time - 5); render(time); sync(); wake(); }
    else if (event.key === 'f' || event.key === 'F') $('full').click();
    else if (event.key === 'r' || event.key === 'R') $('replay').click();
  });
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  ready.then(function () { sync(); if (!reduced) setPlaying(true); else wake(); });
  window.requestAnimationFrame(tick);
})();
