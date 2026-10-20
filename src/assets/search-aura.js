/* 5.1 · 绢光与浮金
   「无限模拟发射循环」开启时（搜索框带 .search-simulation-enabled）：
   - 绢光：两段金色丝绢沿描边按弧长匀速绕行，十秒一圈，上下两沿一样走到；
   - 浮金：上沿金尘缓缓升起，下沿金尘轻轻沉落，平时同时在场 12–22 粒，每 4–7.65 秒重抽一次，略偏上沿，
     多半从丝绢正经过的地方扬起；每发射一次，金尘涨到当时的 1.25–1.6 倍，再慢慢回落。
   只读搜索框上已有的信号：search-motion-playing（飞行中）、search-simulation-burst（连发）、
   发射键上的 --search-arrival（光束抵达）。不改动发射逻辑。画布贴在搜索框身后（z-index: -1）。 */
(function () {
  'use strict';

  var form = document.getElementById('searchForm');
  var button = form && form.querySelector('.search-go');
  if (!form || !button) return;

  var LAP = 10;                 // 丝绢绕一圈的秒数
  var RIBBON = .42;             // 每段丝绢占周长的比例（共两段，相隔半圈）
  var MOTES = { floor: 12, idle: [12, 22], cap: 40, top: [.55, .68], reroll: [4, 7.65], surge: [1.25, 1.6], hold: 1.6 };
  var M = 36;                   // 画布向四周留出的余量，容纳光晕与金尘

  var PI = Math.PI, TAU = PI * 2;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function clamp(v, a, b) { if (a === undefined) a = 0; if (b === undefined) b = 1; return v < a ? a : v > b ? b : v; }
  function mix(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function mixRGB(a, b, t) { return [Math.round(mix(a[0], b[0], t)), Math.round(mix(a[1], b[1], t)), Math.round(mix(a[2], b[2], t))]; }
  function rgb(c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  /* 金色取自现有光束与「理」图标的香槟金一系：浅色玻璃上沉一点，深色玻璃上提亮并用加色混合。 */
  var PALETTES = {
    light: { dark: false, blend: 'source-over',
      rim: [190, 148, 88], core: [252, 230, 186], bloom: [226, 176, 100], aura: [218, 170, 100],
      pale: [244, 214, 156], rose: [214, 150, 120] },
    dark: { dark: true, blend: 'lighter',
      rim: [216, 186, 138], core: [255, 241, 214], bloom: [240, 198, 130], aura: [228, 184, 118],
      pale: [255, 232, 192], rose: [238, 176, 150] }
  };
  function palette() { return PALETTES[document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light']; }

  /* 圆角矩形按弧长参数化：顺时针，从左上圆角之后的上沿起点开始。返回 [x, y, 切线x, 切线y]。 */
  function RR(x, y, w, h, r) {
    var a = w - 2 * r, b = h - 2 * r, q = PI * r / 2, P = 2 * a + 2 * b + 4 * q;
    function at(s) {
      s = ((s % P) + P) % P;
      var t;
      if (s < a) return [x + r + s, y, 1, 0];
      s -= a;
      if (s < q) { t = s / r - PI / 2; return [x + w - r + r * Math.cos(t), y + r + r * Math.sin(t), -Math.sin(t), Math.cos(t)]; }
      s -= q;
      if (s < b) return [x + w, y + r + s, 0, 1];
      s -= b;
      if (s < q) { t = s / r; return [x + w - r + r * Math.cos(t), y + h - r + r * Math.sin(t), -Math.sin(t), Math.cos(t)]; }
      s -= q;
      if (s < a) return [x + w - r - s, y + h, -1, 0];
      s -= a;
      if (s < q) { t = PI / 2 + s / r; return [x + r + r * Math.cos(t), y + h - r + r * Math.sin(t), -Math.sin(t), Math.cos(t)]; }
      s -= q;
      if (s < b) return [x, y + h - r - s, 0, -1];
      s -= b;
      t = PI + s / r; return [x + r + r * Math.cos(t), y + r + r * Math.sin(t), -Math.sin(t), Math.cos(t)];
    }
    return { x: x, y: y, w: w, h: h, r: r, a: a, b: b, q: q, P: P, at: at };
  }
  function rrPath(c, g, keep) {
    var x = g.x, y = g.y, w = g.w, h = g.h, r = g.r;
    if (!keep) c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arc(x + w - r, y + r, r, -PI / 2, 0);
    c.lineTo(x + w, y + h - r); c.arc(x + w - r, y + h - r, r, 0, PI / 2);
    c.lineTo(x + r, y + h); c.arc(x + r, y + h - r, r, PI / 2, PI);
    c.lineTo(x, y + r); c.arc(x + r, y + r, r, PI, PI * 1.5); c.closePath();
  }

  /* ---------- 画布 ---------- */
  var canvas = document.createElement('canvas');
  canvas.className = 'search-aura';
  canvas.setAttribute('aria-hidden', 'true');
  form.insertBefore(canvas, form.firstChild);
  var c = canvas.getContext('2d');
  if (!c) { canvas.remove(); return; }
  var cw = 0, ch = 0, dpr = 1, rr = null, cache = {}, sprites = {};

  function measure() {
    var W = form.offsetWidth, H = form.offsetHeight;
    if (!W || !H) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cw = W + 2 * M; ch = H + 2 * M;
    canvas.style.left = -(M + form.clientLeft) + 'px'; canvas.style.top = -(M + form.clientTop) + 'px';
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    var r = parseFloat(getComputedStyle(form).borderTopLeftRadius) || 15;
    rr = RR(M + .5, M + .5, W - 1, H - 1, r - .5);
    cache = {};
  }
  function sprite(color, R) {
    var key = color.join(',') + '|' + R + '|' + dpr, cv = sprites[key];
    if (cv) return cv;
    cv = document.createElement('canvas');
    var n = Math.max(2, Math.ceil(R * 2 * dpr)); cv.width = cv.height = n;
    var g = cv.getContext('2d'), gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    gr.addColorStop(0, rgba(color, 1)); gr.addColorStop(.22, rgba(color, .72)); gr.addColorStop(.48, rgba(color, .3));
    gr.addColorStop(.74, rgba(color, .08)); gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr; g.fillRect(0, 0, n, n);
    return (sprites[key] = cv);
  }
  /* 贴着描边、只在框外的一圈柔光（深色时框内也透一点），缓存成层，之后只改透明度。 */
  function halo(color, blur, width, inside) {
    var key = color.join(',') + '|' + blur + '|' + width + '|' + (inside ? 1 : 0), cv = cache[key];
    if (cv) return cv;
    cv = document.createElement('canvas'); cv.width = canvas.width; cv.height = canvas.height;
    var g = cv.getContext('2d'), off = 5000;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.beginPath();
    if (inside) rrPath(g, rr, true); else { g.rect(0, 0, cw, ch); rrPath(g, rr, true); }
    g.clip('evenodd');
    g.shadowColor = rgba(color, 1); g.shadowBlur = blur * dpr; g.shadowOffsetX = off * dpr;
    g.translate(-off, 0); g.lineWidth = width; g.strokeStyle = '#000'; rrPath(g, rr); g.stroke();
    return (cache[key] = cv);
  }
  function drawHalo(color, blur, width, alpha, inside) {
    if (alpha < .003) return;
    c.globalAlpha = Math.min(1, alpha); c.drawImage(halo(color, blur, width, inside), 0, 0, cw, ch); c.globalAlpha = 1;
  }

  /* ---------- 状态 ---------- */
  var st = { on: false, vis: 0, playing: false, burst: false, burstLevel: 0, speed: 1, energy: 0,
    flow: Math.random(), push: 0, lastArrival: 0, fresh: 0,
    motes: [], target: MOTES.floor, pTop: .6, reroll: 0, pace: 0, surgeTarget: 0, surgeLeft: 0 };
  function roll() {
    st.target = Math.floor(rand(MOTES.idle[0], MOTES.idle[1] + 1));
    st.pTop = rand(MOTES.top[0], MOTES.top[1]);
    st.reroll = rand(MOTES.reroll[0], MOTES.reroll[1]);
  }

  // 发射反馈：以这一轮抽到的数为底乘 1.25–1.6，连发时每一发重新抽，不会层层叠加。
  function surge() {
    st.surgeTarget = Math.min(MOTES.cap, Math.round(st.target * rand(MOTES.surge[0], MOTES.surge[1])));
    st.surgeLeft = MOTES.hold;
  }

  /* ---------- 绢光 ---------- */
  // 某一点上丝绢的浓度 0–1，以及它在丝绢里的位置（-1 尾 → 1 头）。
  function silkAt(s, out) {
    var P = rr.P, half = RIBBON * P / 2, head = st.flow * P, best = 0, xb = 0;
    for (var k = 0; k < 2; k++) {
      var d = ((s - head - k * P / 2) % P + P * 1.5) % P - P / 2;
      var x = d / half, I = smooth(clamp((1 - Math.abs(x)) / .4));
      if (I > best) { best = I; xb = x; }
    }
    if (out) out.x = xb;
    return best;
  }
  var probe = { x: 0 };
  function silk(p, v) {
    var P = rr.P, n = Math.ceil(P / 4), e = 1 + st.energy * .4, far = sprite(p.aura, 12);
    c.lineCap = 'butt'; c.lineJoin = 'round';
    for (var i = 0; i < n; i++) {
      var s0 = i * P / n, s1 = (i + 1) * P / n, sm = (s0 + s1) / 2;
      var I = silkAt(sm, probe), u = clamp((probe.x + 1) / 2);
      var tone = u < .5 ? mixRGB(p.rose, p.rim, u * 2) : mixRGB(p.rim, p.pale, (u - .5) * 2);
      tone = mixRGB(p.rim, tone, I);
      var pa = rr.at(s0), pm = rr.at(sm), pb = rr.at(s1);
      c.beginPath(); c.moveTo(pa[0], pa[1]); c.lineTo(pm[0], pm[1]); c.lineTo(pb[0], pb[1]);
      if (I > .02) {
        // 贴身的暖光是一条宽而淡的线，连续不断；外层薄晕用重叠足够的光点。
        c.globalAlpha = Math.min(1, Math.pow(I, 1.4) * (p.dark ? .22 : .26) * v * e);
        c.strokeStyle = rgb(p.bloom); c.lineWidth = 2.94; c.stroke();
        var fa = Math.pow(I, 1.6) * .036 * v * e;
        if (fa > .003) { c.globalAlpha = fa; c.drawImage(far, pm[0] + pm[3] * 2.4 - 12, pm[1] - pm[2] * 2.4 - 12, 24, 24); }
      }
      c.globalAlpha = Math.min(1, mix(p.dark ? .24 : .32, p.dark ? .86 : .9, I) * v * e);
      c.strokeStyle = rgb(tone); c.lineWidth = 1.02; c.stroke();
    }
    c.globalAlpha = 1;
  }

  /* ---------- 浮金 ---------- */
  function edgeS(side, x) {
    var along = clamp(side > 0 ? x - (rr.x + rr.r) : (rr.x + rr.w - rr.r) - x, 0, rr.a);
    return side > 0 ? along : rr.a + rr.q + rr.b + rr.q + along;
  }
  function spawn(side, nearArrow) {
    if (st.motes.length >= MOTES.cap) return;
    var lo = rr.x + rr.r * .6, hi = rr.x + rr.w - rr.r * .6, x;
    if (nearArrow) x = rr.x + rr.w - 22 - Math.random() * 70;
    else {
      x = rand(lo, hi);
      // 多半从丝绢正经过的地方扬起：三取其亮。
      if (Math.random() < .6) for (var i = 0; i < 2; i++) { var y = rand(lo, hi); if (silkAt(edgeS(side, y)) > silkAt(edgeS(side, x))) x = y; }
    }
    var life = nearArrow ? rand(1.6, 2.4) : rand(2.4, 4.4);
    st.motes.push({
      side: side, x: x, y: side > 0 ? rr.y + Math.random() * 1.5 : rr.y + rr.h - Math.random() * 1.5,
      v: nearArrow ? rand(11, 17) : side > 0 ? rand(5, 8.5) : rand(3.5, 6.5),
      life: life, age: st.fresh > 0 && !nearArrow ? Math.random() * life * .45 : 0,
      r: rand(.55, 1.15), amp: rand(1.5, 4.5), w: rand(.8, 2.2), ph: Math.random() * TAU
    });
  }
  function motes(p, v, dt) {
    st.reroll -= dt; if (st.reroll <= 0) roll();
    st.fresh = Math.max(0, st.fresh - dt);
    st.surgeLeft = Math.max(0, st.surgeLeft - dt);
    var surging = st.surgeLeft > 0, target = surging ? Math.max(st.target, st.surgeTarget) : st.target;
    var topWant = Math.round(target * st.pTop), bottomWant = target - topWant, top = 0, bottom = 0, i;
    for (i = 0; i < st.motes.length; i++) { if (st.motes[i].side > 0) top++; else bottom++; }
    if (st.on) {
      // 下限：总数不低于 floor，缺多少立刻补多少。
      while (top + bottom < MOTES.floor) {
        if (top / Math.max(1, topWant) <= bottom / Math.max(1, bottomWant)) { spawn(1); top++; } else { spawn(-1); bottom++; }
      }
      // floor 之上：按节奏补到这一轮抽到的数。
      st.pace -= dt;
      if (st.pace <= 0) {
        if (top < topWant) spawn(1); else if (bottom < bottomWant) spawn(-1);
        st.pace = surging ? rand(.015, .04) : rand(.06, .16);
      }
    }
    var glow = sprite(p.bloom, 6);
    c.fillStyle = rgb(p.core);
    for (i = 0; i < st.motes.length; i++) {
      var m = st.motes[i];
      m.age += dt;
      var a = smooth(clamp(m.age / .4)) * (1 - smooth(clamp((m.age / m.life - .4) / .6))) * v;
      if (a < .004) continue;
      var x = m.x + Math.sin(m.age * m.w + m.ph) * m.amp, y = m.y - m.side * m.v * m.age;
      c.globalAlpha = Math.min(1, a * (p.dark ? .55 : .6)); c.drawImage(glow, x - 6, y - 6, 12, 12);
      c.globalAlpha = Math.min(1, a * .95); c.beginPath(); c.arc(x, y, m.r, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
    st.motes = st.motes.filter(function (m) { return m.age < m.life; });
  }

  /* ---------- 帧 ---------- */
  var raf = 0, last = -1;
  function frame(now) {
    // 首帧没有上一帧可比：按一帧算。rAF 的时间戳可能早于唤醒时刻，不能让 dt 落成 0。
    var dt = last < 0 ? 1 / 60 : Math.min(.05, Math.max(0, (now - last) / 1000));
    last = now;
    raf = draw(dt) ? requestAnimationFrame(frame) : 0;
  }
  function wake() { if (!raf) { last = -1; raf = requestAnimationFrame(frame); } }
  function draw(dt) {
    if (!rr) measure();
    if (!rr) return st.on;
    var still = reduce.matches, target = st.on ? 1 : 0;
    st.vis = still ? target : st.vis + (target - st.vis) * (1 - Math.exp(-dt / (st.on ? .3 : .16)));
    if (Math.abs(target - st.vis) < .002) st.vis = target;
    var arrival = st.playing ? (parseFloat(button.style.getPropertyValue('--search-arrival')) || 0) : 0;
    if (arrival > .3 && st.lastArrival <= .3) {
      st.energy = Math.min(1.6, st.energy + .75); st.push += .05;
      if (st.burst) { surge(); if (Math.random() < .5) spawn(1, true); }
    }
    st.lastArrival = arrival;
    st.energy *= Math.exp(-dt / .5);
    st.burstLevel += ((st.burst && st.playing ? 1 : 0) - st.burstLevel) * (1 - Math.exp(-dt / .45));
    st.speed = mix(1, 3, st.burstLevel);
    st.flow += dt * st.speed / LAP + st.push * 3 * dt;
    st.push *= Math.exp(-3 * dt);

    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height);
    if (st.vis <= 0) { st.motes.length = 0; return st.on; }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    var p = palette(), v = st.vis;
    c.globalCompositeOperation = p.blend;
    var level = v * .24 * (1 + st.energy * .4);
    drawHalo(p.aura, 5, 2, (p.dark ? .85 : .9) * level);
    drawHalo(p.aura, 16, 5, (p.dark ? .55 : .6) * level);
    if (p.dark) drawHalo(p.aura, 4, 1.5, .35 * level, true);
    silk(p, v);
    if (!still) motes(p, v, dt);
    c.globalCompositeOperation = 'source-over';
    return !still;
  }

  function sync() {
    var cl = form.classList, playing = cl.contains('search-motion-playing');
    var on = cl.contains('search-simulation-enabled');
    if (on && !st.on) { roll(); st.fresh = 1.2; st.motes.length = 0; }
    st.on = on;
    st.burst = cl.contains('search-simulation-burst');
    if (playing && !st.playing && st.on) { surge(); for (var i = 0; i < 3; i++) spawn(1, true); }
    st.playing = playing;
    wake();
  }

  measure();
  new MutationObserver(sync).observe(form, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(wake).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (window.ResizeObserver) new ResizeObserver(function () { measure(); wake(); }).observe(form);
  if (reduce.addEventListener) reduce.addEventListener('change', wake);
  sync();
})();
