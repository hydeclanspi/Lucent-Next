/* 代号：交互 — local, gesture-driven wallpaper probability. No network or dependencies. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) root.AiraInteraction = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const REGION = [[98,140],[58,185],[36,275],[50,341],[90,351],[223,331],[289,336],[339,359],[368,401],[382,449],[408,495],[416,556],[417,588],[445,620],[487,645],[533,661],[562,651],[568,630],[558,588],[550,542],[547,453],[543,359],[548,328],[565,311],[602,300],[688,292],[817,285],[879,267],[908,230],[923,185],[920,170],[895,160],[853,156],[764,159],[669,163],[560,169],[465,172],[382,169],[288,165],[204,161],[167,159],[143,168]];
  const WEIGHTS = Object.freeze({ field: 0.62, distance: 0.20, rotation: 0.13, collision: 0.05 });
  const RADIUS = 11;
  const CLEARANCE = 30; // A 44px touch target plus 8px of space around existing UI.
  const STEP = 4;
  const MIN_WIDTH = 900;
  const EXCLUDE = '.topbar, .hero .avatar, .hero .name, .hero .meta, .hero .signature, .hero .badges, .hero .tags, .card, #btnHistory';
  let mounted = null;

  const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const copy = p => ({ x: p.x, y: p.y });
  const finiteProbability = p => Number.isFinite(p) ? clamp(p, 0, 1) : 0.5;

  function segmentDistance(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const length2 = dx * dx + dy * dy;
    const t = length2 ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / length2, 0, 1) : 0;
    return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
  }

  function inPolygon(p, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }

  function makeGeometry(width, height, rects) {
    const polygon = REGION.map(p => ({ x: p[0] * width / 1560, y: p[1] * height / 1040 }));
    const obstacles = rects.map(r => ({ left: r.left - CLEARANCE, right: r.right + CLEARANCE, top: r.top - CLEARANCE, bottom: r.bottom + CLEARANCE }));
    const bounds = { left: Math.min(...polygon.map(p => p.x)), right: Math.max(...polygon.map(p => p.x)), top: Math.min(...polygon.map(p => p.y)), bottom: Math.max(...polygon.map(p => p.y)) };
    const valid = p => {
      if (!inPolygon(p, polygon)) return false;
      if (obstacles.some(r => p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom)) return false;
      for (let i = 0; i < polygon.length; i++) {
        if (segmentDistance(p, polygon[i], polygon[(i + 1) % polygon.length]) < CLEARANCE) return false;
      }
      return true;
    };
    return { polygon, obstacles, bounds, valid, width, height, span: Math.max(120, bounds.right - bounds.left) };
  }

  // Spatial subdivision prevents both a fast drag and a delayed animation frame from tunnelling.
  function advance(p, target, geometry, visit) {
    const length = distance(p, target);
    if (!length) return;
    const count = Math.min(800, Math.ceil(length / STEP));
    const dx = (target.x - p.x) / count, dy = (target.y - p.y) / count;
    for (let i = 0; i < count; i++) {
      const candidate = { x: p.x + dx, y: p.y + dy };
      let next = candidate;
      if (!geometry.valid(next)) {
        // A tangential slide is less distracting than an elastic boundary bounce.
        const alongX = { x: p.x + dx, y: p.y };
        const alongY = { x: p.x, y: p.y + dy };
        next = geometry.valid(alongX) ? alongX : geometry.valid(alongY) ? alongY : p;
      }
      if (next === p || (visit && visit(next) === false)) continue;
      p.x = next.x; p.y = next.y;
    }
  }

  function potential(p, geometry) {
    const u = (p.x - geometry.bounds.left) / geometry.span;
    const v = (p.y - geometry.bounds.top) / Math.max(120, geometry.bounds.bottom - geometry.bounds.top);
    return 0.66 * (u - 0.5) - 0.25 * (v - 0.5)
      + 0.10 * Math.sin(2 * Math.PI * u + 1.1 * Math.sin(Math.PI * v))
      + 0.075 * Math.cos(2.8 * Math.PI * v - 0.5 * Math.PI * u);
  }

  function startModel(probability, active, other, geometry) {
    return { base: finiteProbability(probability), field: potential(active, geometry), separation: distance(active, other), otherField: potential(other, geometry), previousAngle: Math.atan2(active.y - other.y, active.x - other.x), angle: 0, geometry };
  }

  function sampleModel(model, active, other) {
    const angle = Math.atan2(active.y - other.y, active.x - other.x);
    const turn = angle - model.previousAngle;
    model.angle += Math.atan2(Math.sin(turn), Math.cos(turn));
    model.previousAngle = angle;
  }

  function modelProbability(model, active, other) {
    const g = model.geometry;
    const delta = WEIGHTS.field * (potential(active, g) - model.field)
      + WEIGHTS.distance * (distance(active, other) - model.separation) / g.span
      + WEIGHTS.rotation * clamp(model.angle / (Math.PI * 1.5), -2, 2)
      + WEIGHTS.collision * (potential(other, g) - model.otherField);
    // Keep endpoint settings continuous: dragging from a manual 0%/100% has no initial 5pp jump.
    const low = Math.min(0.05, model.base), high = Math.max(0.95, model.base);
    return clamp(model.base + clamp(delta, -0.35, 0.35), low, high);
  }

  function safeSites(geometry) {
    const sites = [], grid = new Map(), size = 20;
    const b = geometry.bounds;
    for (let y = Math.ceil(b.top / size); y * size <= b.bottom; y++) {
      for (let x = Math.ceil(b.left / size); x * size <= b.right; x++) {
        const p = { x: x * size, y: y * size, gx: x, gy: y };
        if (geometry.valid(p)) { sites.push(p); grid.set(x + ',' + y, p); }
      }
    }
    // Choose one connected chamber so resize recovery cannot strand the two objects apart.
    const seen = new Set(); let largest = [];
    for (const site of sites) {
      const key = site.gx + ',' + site.gy;
      if (seen.has(key)) continue;
      const component = [site]; seen.add(key);
      for (let i = 0; i < component.length; i++) {
        const p = component[i];
        for (const offset of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const nextKey = (p.gx + offset[0]) + ',' + (p.gy + offset[1]);
          const next = grid.get(nextKey);
          if (next && !seen.has(nextKey) && geometry.valid({ x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 })) {
            seen.add(nextKey); component.push(next);
          }
        }
      }
      if (component.length > largest.length) largest = component;
    }
    return largest;
  }

  function mount(options) {
    if (mounted) { mounted.refresh(); return mounted; }
    if (typeof document === 'undefined' || !document.body) return null;
    const opts = options || {};
    const getProbability = typeof opts.getProbability === 'function' ? opts.getProbability : () => 0.5;
    const setProbability = typeof opts.setProbability === 'function' ? opts.setProbability : () => {};
    const isReady = typeof opts.isReady === 'function' ? opts.isReady : () => true;
    const isPaused = typeof opts.isPaused === 'function' ? opts.isPaused : () => false;
    const field = document.createElement('div');
    field.id = 'interactionField'; field.className = 'interaction-field';
    field.setAttribute('role', 'group'); field.setAttribute('aria-label', '代号：交互');
    field.hidden = true;
    const bodies = [0, 1].map(index => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'interaction-item'; button.dataset.item = String(index);
      button.setAttribute('aria-label', '拖动' + (index ? '第二枚' : '第一枚') + '浮光调整随机壁纸概率，也可使用方向键');
      button.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown ArrowLeft ArrowRight');
      const lens = document.createElement('span'); lens.className = 'interaction-lens'; lens.setAttribute('aria-hidden', 'true');
      const glint = document.createElement('span'); glint.className = 'interaction-glint'; glint.setAttribute('aria-hidden', 'true');
      lens.appendChild(glint); button.appendChild(lens); field.appendChild(button);
      return { x: 0, y: 0, vx: index ? -4 : 5, vy: index ? 3 : -2, angle: Math.random() * Math.PI * 2, turn: 0, button, contactUntil: 0 };
    });
    document.body.appendChild(field);

    let destroyed = false, geometry = null, sites = [], available = false, paused = true;
    let frameId = 0, refreshId = 0, contactTimer = 0, previousTime = 0, lastPaint = 0, gesture = null, initialized = false, pageAway = false;
    const motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    const cleanups = [];
    const listen = (target, name, fn, settings) => { target.addEventListener(name, fn, settings); cleanups.push(() => target.removeEventListener(name, fn, settings)); };

    function emit(value, commit) {
      setProbability(finiteProbability(value), { source: 'interaction', commit: !!commit });
    }

    function paint(now) {
      bodies.forEach((body, index) => {
        body.button.style.transform = 'translate3d(' + (body.x - 22).toFixed(2) + 'px,' + (body.y - 22).toFixed(2) + 'px,0)';
        body.button.style.setProperty('--interaction-tilt', (index ? -16 : 13) + 'deg');
        body.button.classList.toggle('is-contact', body.contactUntil > now);
      });
    }

    function contact(now) {
      bodies.forEach(body => { body.contactUntil = now + 170; body.button.classList.add('is-contact'); });
      // Reduced-motion mode has no animation loop, so the brief highlight needs its own cleanup.
      if (!contactTimer) contactTimer = window.setTimeout(clearContact, 180);
    }

    function clearContact() {
      contactTimer = 0;
      if (destroyed) return;
      const now = performance.now();
      paint(now);
      const remaining = Math.max(...bodies.map(body => body.contactUntil - now));
      if (remaining > 0) contactTimer = window.setTimeout(clearContact, remaining + 10);
    }

    function moveBody(index, target, now, onStep) {
      const body = bodies[index], other = bodies[1 - index];
      const before = copy(body);
      advance(body, target, geometry, next => {
        const gap = distance(next, other);
        if (gap < RADIUS * 2) {
          let nx = (other.x - next.x) / (gap || 1), ny = (other.y - next.y) / (gap || 1);
          if (gap < 0.01) { nx = index ? -1 : 1; ny = 0; }
          const push = RADIUS * 2 - gap + 0.02;
          const pushed = copy(other);
          advance(pushed, { x: other.x + nx * push, y: other.y + ny * push }, geometry);
          // If the other lens is trapped at the edge, the active lens stops at contact.
          if (distance(next, pushed) < RADIUS * 2 - 0.01) return false;
          other.x = pushed.x; other.y = pushed.y;
          const relative = (body.vx - other.vx) * nx + (body.vy - other.vy) * ny;
          if (relative > 0) {
            const impulse = relative * 0.82;
            body.vx -= impulse * nx; body.vy -= impulse * ny;
            other.vx += impulse * nx; other.vy += impulse * ny;
          }
          contact(now);
        }
        if (onStep) onStep(next, other);
        return true;
      });
      return distance(before, body);
    }

    function finishGesture(commit) {
      if (!gesture) return;
      const current = gesture; gesture = null;
      const body = bodies[current.index];
      body.button.classList.remove('is-dragging');
      try { if (body.button.hasPointerCapture(current.pointerId)) body.button.releasePointerCapture(current.pointerId); } catch (_) {}
      // Cancellation, modal opening and visibility loss lock the last visible value.
      if (commit && current.started) emit(current.value, true);
      if (!current.started || motion.matches) { body.vx = 0; body.vy = 0; }
      paint(performance.now());
    }

    function canRun() { return !destroyed && available && !paused && !pageAway && !document.hidden; }
    function stopFrames() {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0; previousTime = 0; lastPaint = 0;
    }
    function requestFrame() {
      if (!frameId && canRun() && !motion.matches) frameId = requestAnimationFrame(tick);
    }

    function tick(now) {
      frameId = 0;
      if (!canRun()) return;
      if (!isReady() || isPaused()) { syncState(); return; }
      if (!previousTime) previousTime = now;
      if (now - lastPaint < (gesture ? 15 : 32)) { requestFrame(); return; }
      const dt = clamp((now - previousTime) / 1000, 0, 0.05);
      previousTime = now; lastPaint = now;
      // A held gesture only advances through user input. Waiting with a finger down never changes the ratio.
      if (!gesture) {
        bodies.forEach((body, index) => {
          body.turn = body.turn * Math.exp(-1.8 * dt) + (Math.random() - 0.5) * 1.6 * Math.sqrt(dt);
          body.angle += body.turn * dt;
          const pull = 1 - Math.exp(-1.3 * dt);
          body.vx += (Math.cos(body.angle) * 6 - body.vx) * pull;
          body.vy += (Math.sin(body.angle) * 4.5 - body.vy) * pull;
          const old = copy(body), target = { x: body.x + body.vx * dt, y: body.y + body.vy * dt };
          moveBody(index, target, now);
          if (Math.abs(body.x - target.x) > 0.1 || Math.abs(body.y - target.y) > 0.1) {
            if (Math.abs(body.x - old.x) < 0.1) body.vx *= -0.65;
            if (Math.abs(body.y - old.y) < 0.1) body.vy *= -0.65;
            body.angle = Math.atan2(body.vy, body.vx);
          }
        });
      }
      paint(now); requestFrame();
    }

    function syncState() {
      paused = !isReady() || isPaused() || pageAway || document.hidden;
      field.hidden = !available;
      field.classList.toggle('is-paused', paused);
      field.setAttribute('aria-hidden', paused || !available ? 'true' : 'false');
      bodies.forEach(body => { body.button.disabled = paused || !available; body.button.style.pointerEvents = paused || !available ? 'none' : 'auto'; });
      if (paused || !available) { finishGesture(true); stopFrames(); }
      else requestFrame();
    }

    function nearestSite(target, other) {
      let best = null, score = Infinity;
      for (const site of sites) {
        if (other && distance(site, other) < 60) continue;
        const d = distance(site, target);
        if (d < score) { best = site; score = d; }
      }
      return best;
    }

    function refresh() {
      if (destroyed) return;
      if (refreshId) cancelAnimationFrame(refreshId);
      refreshId = 0;
      const width = document.documentElement.clientWidth || window.innerWidth;
      const height = window.innerHeight || document.documentElement.clientHeight;
      const rects = Array.from(document.querySelectorAll(EXCLUDE)).map(node => node.getBoundingClientRect()).filter(rect => rect.width > 0 && rect.height > 0);
      const nextGeometry = makeGeometry(width, height, rects);
      const nextSites = width >= MIN_WIDTH && height >= 450 ? safeSites(nextGeometry) : [];
      const nextAvailable = nextSites.length >= 16;
      if (gesture && (!nextAvailable || !geometry || geometry.width !== width || geometry.height !== height || !nextGeometry.valid(bodies[0]) || !nextGeometry.valid(bodies[1]))) finishGesture(true);
      geometry = nextGeometry; sites = nextSites; available = nextAvailable;
      if (available) {
        bodies.forEach((body, index) => {
          if (!initialized || !geometry.valid(body) || (index && distance(body, bodies[0]) < RADIUS * 2)) {
            const wanted = initialized ? body : { x: (index ? 528 : 345) * width / 1560, y: (index ? 276 : 267) * height / 1040 };
            const site = nearestSite(wanted, index ? bodies[0] : null);
            if (!site) { available = false; return; }
            body.x = site.x; body.y = site.y;
          }
        });
        initialized = true;
      }
      paint(performance.now()); syncState();
    }

    function queueRefresh() { if (!destroyed && !refreshId) refreshId = requestAnimationFrame(refresh); }

    bodies.forEach((body, index) => {
      listen(body.button, 'pointerdown', event => {
        if (!canRun() || gesture || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault();
        // The invisible 44px targets overlap at contact: pick the nearest visible lens,
        // rather than letting DOM stacking make the first lens impossible to grab.
        const pointer = { x: event.clientX, y: event.clientY };
        const selectedIndex = distance(pointer, bodies[1 - index]) + 0.5 < distance(pointer, body) ? 1 - index : index;
        const selected = bodies[selectedIndex];
        selected.button.focus({ preventScroll: true });
        gesture = { index: selectedIndex, pointerId: event.pointerId, origin: pointer, offset: { x: selected.x - event.clientX, y: selected.y - event.clientY }, last: copy(selected), lastTime: performance.now(), started: false, value: finiteProbability(getProbability()), model: null };
        try { selected.button.setPointerCapture(event.pointerId); } catch (_) {}
      });
      listen(body.button, 'pointermove', event => {
        if (!gesture || gesture.index !== index || gesture.pointerId !== event.pointerId) return;
        if (!isReady() || isPaused() || !canRun()) { finishGesture(true); syncState(); return; }
        event.preventDefault();
        const current = gesture;
        if (!current.started) {
          if (Math.hypot(event.clientX - current.origin.x, event.clientY - current.origin.y) < 4) return;
          current.started = true;
          current.model = startModel(current.value, body, bodies[1 - index], geometry);
          body.button.classList.add('is-dragging');
        }
        const now = performance.now();
        const target = { x: clamp(event.clientX + current.offset.x, 0, geometry.width), y: clamp(event.clientY + current.offset.y, 0, geometry.height) };
        const moved = moveBody(index, target, now, (next, other) => sampleModel(current.model, next, other));
        const dt = Math.max(0.008, (now - current.lastTime) / 1000);
        if (moved > 0) {
          body.vx = clamp((body.x - current.last.x) / dt, -75, 75);
          body.vy = clamp((body.y - current.last.y) / dt, -75, 75);
          current.value = modelProbability(current.model, body, bodies[1 - index]);
          emit(current.value, false);
        }
        current.last = copy(body); current.lastTime = now;
        paint(now);
      });
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(body.button, name, event => {
        if (gesture && gesture.index === index && gesture.pointerId === event.pointerId) finishGesture(true);
      });
      listen(body.button, 'keydown', event => {
        if (!canRun() || gesture) return;
        const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
        if (!direction) return;
        event.preventDefault();
        const model = startModel(getProbability(), body, bodies[1 - index], geometry);
        const step = event.shiftKey ? 48 : 16;
        const moved = moveBody(index, { x: body.x + direction[0] * step, y: body.y + direction[1] * step }, performance.now(), (next, other) => sampleModel(model, next, other));
        body.vx = 0; body.vy = 0;
        if (moved) emit(modelProbability(model, body, bodies[1 - index]), true);
        paint(performance.now());
      });
      listen(body.button, 'contextmenu', event => event.preventDefault());
    });

    listen(window, 'resize', queueRefresh, { passive: true });
    listen(window, 'scroll', queueRefresh, { passive: true });
    listen(window, 'blur', () => { finishGesture(true); });
    listen(window, 'pagehide', () => { pageAway = true; syncState(); });
    listen(window, 'pageshow', () => { pageAway = false; refresh(); });
    listen(document, 'visibilitychange', () => { if (document.hidden) syncState(); else refresh(); });
    listen(document, 'animationend', event => { if (event.animationName === 'enter') queueRefresh(); });
    const motionChanged = () => { stopFrames(); bodies.forEach(b => { b.vx = 0; b.vy = 0; }); paint(performance.now()); syncState(); };
    if (motion.addEventListener) listen(motion, 'change', motionChanged);
    else if (motion.addListener) { motion.addListener(motionChanged); cleanups.push(() => motion.removeListener(motionChanged)); }

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(queueRefresh);
      document.querySelectorAll(EXCLUDE).forEach(node => observer.observe(node));
      cleanups.push(() => observer.disconnect());
    }
    if (typeof MutationObserver === 'function') {
      const observer = new MutationObserver(queueRefresh);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-focus'] });
      const sheet = document.getElementById('sheetRoot');
      if (sheet) observer.observe(sheet, { attributes: true, attributeFilter: ['hidden'] });
      cleanups.push(() => observer.disconnect());
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!destroyed) queueRefresh(); });

    const controller = {
      refresh,
      destroy() {
        if (destroyed) return;
        finishGesture(true); destroyed = true; stopFrames();
        if (refreshId) cancelAnimationFrame(refreshId);
        if (contactTimer) window.clearTimeout(contactTimer);
        cleanups.forEach(fn => fn()); field.remove();
        if (mounted === controller) mounted = null;
      }
    };
    mounted = controller; refresh();
    return controller;
  }

  return { mount, _test: { REGION, WEIGHTS, makeGeometry, inPolygon, segmentDistance, advance, potential, startModel, sampleModel, modelProbability, safeSites } };
});
