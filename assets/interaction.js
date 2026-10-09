/* 代号：交互 — gesture-driven probability and optional autonomous glass motion. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) root.AiraInteraction = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const REGION = [[87.75,138.94],[115.38,124.31],[351.81,130.81],[633.75,126.75],[953.88,119.44],[1072.5,122.69],[1233.38,112.12],[1267.5,117.81],[1260.19,147.06],[1261.81,202.31],[1214.69,214.5],[1202.5,237.25],[1196.81,261.62],[1253.69,257.56],[1247.19,299.0],[1241.5,317.69],[1178.12,325.0],[1113.12,321.75],[626.44,321.75],[605.31,329.88],[591.5,347.75],[587.44,368.88],[584.19,637.81],[505.38,639.44],[414.38,637.0],[407.88,606.12],[406.25,554.12],[416.0,505.38],[337.19,498.06],[325.81,490.75],[323.38,343.69],[268.12,338.0],[209.62,343.69],[93.44,348.56],[87.75,270.56]];
  const WEIGHTS = Object.freeze({ field: 0.62, distance: 0.20, rotation: 0.13, collision: 0.05 });
  const MOTION = Object.freeze({ speedScale: 1.164, horizontal: 6 * 1.164, vertical: 4.5 * 1.164 });
  const RESTITUTION = 0.64;
  const COLLISION_MAX = 24;
  const MAX_IMPACT_SPEED = 640;
  // Mutable so tests can shorten the reshuffle cadence; the app never rewrites it.
  const AUTO = { cruiseMin: 5, cruiseMax: 8, burst: 1.7, kickLimit: 320, manualGrace: 1.25, replan: 0.75, reshuffle: 11.5 };
  const NATURAL = Object.freeze({ neighborRadius: 76, share: 0.30, densityStep: 0.06, cooldown: 0.28 });
  // Placement soft penalties: closeness is a weak nudge chance may tolerate, separation a
  // medium pull, and a desert left behind is the strong one. Per-arrival jitters and a
  // random anchor keep constellations from settling into a few formulaic shapes.
  const PLACEMENT = Object.freeze({ closePenalty: 0.8, farPenalty: 1.6, crowdPenalty: 0.9, voidPenalty: 1.8, nearBand: 60, farBand: 220, voidRadius: 220, voidSpan: 260, haloNear: 110, haloFar: 220, topBoost: 1.0 });
  const COUNT_MAX = 49, COUNT_CURVE = 2.6, COUNT_LOW_CURVE = 1.3, COUNT_MID = 8;
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

  function collisionStrength(value, fallback = 1) {
    return Number.isFinite(value) ? Math.round(clamp(value, 1, COLLISION_MAX) * 10) / 10 : fallback;
  }
  function collisionSettings(value) {
    const saved = value && typeof value === 'object' ? value : {};
    return { version: 2, strength: collisionStrength(saved.strength), randomOnLaunch: saved.randomOnLaunch === true };
  }
  function naturalPace(value) { return Number.isFinite(value) ? Math.round(clamp(value, 0.25, 16) * 100) / 100 : 1; }
  function naturalResponse(strength, neighbors) {
    const share = NATURAL.share + NATURAL.densityStep * clamp(neighbors - 2, 0, 2);
    return { share, separation: 14 + 7 * Math.max(1, collisionStrength(strength) * share) };
  }
  function resolveNaturalImpact(body, other, nx, ny, strength, neighbors, energized) {
    resolveImpact(body, other, nx, ny, false, strength);
    if (!energized) return false;
    const separating = (other.vx - body.vx) * nx + (other.vy - body.vy) * ny;
    const extra = Math.max(0, (naturalResponse(strength, neighbors).separation - separating) * 0.5);
    // Top up a slow encounter to a finite separating speed; never multiply a fast chain.
    body.vx -= extra * nx; body.vy -= extra * ny;
    other.vx += extra * nx; other.vy += extra * ny;
    limitVelocity(body); limitVelocity(other);
    return extra > 0;
  }
  function randomCollision(upper, sample) {
    // Equal room for each multiplicative range: soft encounters stay possible at high ceilings.
    const u = Number.isFinite(sample) ? clamp(sample, 0, 1) : Math.random();
    return collisionStrength(Math.pow(collisionStrength(upper, 12), u));
  }
  function limitVelocity(body) {
    const speed = Math.hypot(body.vx, body.vy);
    if (!Number.isFinite(speed)) { body.vx = 0; body.vy = 0; }
    else if (speed > MAX_IMPACT_SPEED) { body.vx *= MAX_IMPACT_SPEED / speed; body.vy *= MAX_IMPACT_SPEED / speed; }
  }
  function resolveImpact(body, other, nx, ny, held, strength) {
    const relative = (body.vx - other.vx) * nx + (body.vy - other.vy) * ny;
    if (relative <= 0) return;
    // Only an active push supplies extra energy. Free-to-free collisions transfer it once,
    // with the original restitution, instead of multiplying it at every link in a chain.
    const impulse = relative * (1 + RESTITUTION) * (held ? collisionStrength(strength) : 0.5);
    if (!held) { body.vx -= impulse * nx; body.vy -= impulse * ny; }
    other.vx += impulse * nx; other.vy += impulse * ny;
    limitVelocity(body); limitVelocity(other);
  }

  function autoBounds(count) {
    const n = Number.isFinite(count) ? clamp(Math.floor(count), 0, COUNT_MAX) : 0;
    const lower = n ? Math.max(1, Math.ceil(n / 5)) : 0;
    return { lower, upper: Math.max(lower, Math.floor(n / 2)) };
  }
  // Boosted mode triples a normal roll, taking the whole field when that overflows.
  function rageBounds(count) {
    const normal = autoBounds(count);
    if (!normal.lower) return normal;
    const n = clamp(Math.floor(count), 0, COUNT_MAX);
    return { lower: Math.min(n, normal.lower * 3), upper: n };
  }
  function placementWeights(candidates, placed, scale, mood, field) {
    const jitter = mood || { nearJitter: 1, farJitter: 1, voidJitter: 1, topJitter: 1 };
    const space = field || candidates;
    let voidNow = 0, topEdge = Infinity, bottomEdge = -Infinity;
    for (const spot of space) {
      const gap = placed.length ? Math.min(...placed.map(other => distance(spot, other))) : 0;
      if (gap > voidNow) voidNow = gap;
      if (spot.y < topEdge) topEdge = spot.y;
      if (spot.y > bottomEdge) bottomEdge = spot.y;
    }
    // A gentle pull toward the upper band; the sunken channel simply gets no bonus.
    const horizon = topEdge + (bottomEdge - topEdge) * 0.38;
    const topBias = PLACEMENT.topBoost * (jitter.topJitter || 1);
    const topFactor = site => site.y < horizon ? 1 + topBias * (horizon - site.y) / Math.max(1, horizon - topEdge) : 1;
    return candidates.map(site => {
      const gaps = placed.map(other => distance(site, other));
      if (!gaps.length) return topFactor(site);
      const nearest = Math.min(...gaps);
      const close = Math.max(0, PLACEMENT.nearBand * scale * jitter.nearJitter - nearest) / (30 * scale);
      const far = Math.max(0, nearest - PLACEMENT.farBand * scale * jitter.farJitter) / (80 * scale);
      const crowd = Math.max(0, gaps.filter(gap => gap < NATURAL.neighborRadius).length - 1);
      // The desert this choice would leave behind: the largest distance-to-nearest-lens remaining.
      let voidAfter = 0;
      for (const spot of space) {
        const d = Math.min(distance(spot, site), ...placed.map(other => distance(spot, other)));
        if (d > voidAfter) voidAfter = d;
      }
      const voidOver = Math.max(0, voidAfter - PLACEMENT.voidRadius * scale * jitter.voidJitter) / (PLACEMENT.voidSpan * scale);
      // Distance is a virtue when it shrinks the biggest desert: the far penalty yields.
      const fillsDesert = voidNow > PLACEMENT.voidRadius * scale && voidAfter < voidNow - 20 * scale;
      const farWeight = Math.exp(-PLACEMENT.farPenalty * far * (fillsDesert ? 0.15 : 1));
      return Math.exp(-PLACEMENT.closePenalty * close - PLACEMENT.crowdPenalty * crowd - PLACEMENT.voidPenalty * voidOver) * farWeight * topFactor(site);
    });
  }
  function pickSite(candidates, weights) {
    let total = 0;
    for (const weight of weights) total += weight;
    let ticket = Math.random() * total;
    for (let i = 0; i < candidates.length; i++) { ticket -= weights[i]; if (ticket <= 0) return candidates[i]; }
    return candidates[candidates.length - 1];
  }
  function resolveAutoImpact(body, other, nx, ny, strength) {
    const closing = (body.vx - other.vx) * nx + (body.vy - other.vy) * ny;
    if (closing <= 0) return;
    // Equal masses: the driver recoils as well. One charged strike has a bounded
    // motor impulse; subsequent free collisions only transfer existing momentum.
    const impulse = closing * (1 + RESTITUTION) * 0.5 + Math.min(AUTO.kickLimit, closing * (collisionStrength(strength) - 1) * 0.4);
    body.vx -= impulse * nx; body.vy -= impulse * ny;
    other.vx += impulse * nx; other.vy += impulse * ny;
    limitVelocity(body); limitVelocity(other);
  }

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
    return { base: finiteProbability(probability), field: potential(active, geometry), separation: other ? distance(active, other) : 0, otherField: other ? potential(other, geometry) : 0, previousAngle: other ? Math.atan2(active.y - other.y, active.x - other.x) : 0, angle: 0, geometry };
  }

  function sampleModel(model, active, other) {
    if (!other) return;
    const angle = Math.atan2(active.y - other.y, active.x - other.x);
    const turn = angle - model.previousAngle;
    model.angle += Math.atan2(Math.sin(turn), Math.cos(turn));
    model.previousAngle = angle;
  }

  function modelProbability(model, active, other) {
    const g = model.geometry;
    const delta = WEIGHTS.field * (potential(active, g) - model.field)
      + (other ? WEIGHTS.distance * (distance(active, other) - model.separation) / g.span : 0)
      + WEIGHTS.rotation * clamp(model.angle / (Math.PI * 1.5), -2, 2)
      + (other ? WEIGHTS.collision * (potential(other, g) - model.otherField) : 0);
    // Keep endpoint settings continuous: dragging from a manual 0%/100% has no initial 5pp jump.
    const low = Math.min(0.05, model.base), high = Math.max(0.95, model.base);
    return clamp(model.base + clamp(delta, -0.35, 0.35), low, high);
  }

  function safeSites(geometry) {
    const sites = [], grid = new Map(), size = RADIUS * 2 + 2;
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

  function clearRoute(a, b, geometry) {
    const steps = Math.max(1, Math.ceil(distance(a, b) / STEP));
    for (let i = 0; i <= steps; i++) {
      if (!geometry.valid({ x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps })) return false;
    }
    return true;
  }
  function navigationGrid(sites, geometry) {
    const nodes = sites.map((site, index) => ({ ...site, index, neighbors: [] }));
    const grid = new Map(nodes.map(node => [node.gx + ',' + node.gy, node]));
    for (const node of nodes) {
      for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const neighbor = grid.get((node.gx + dx) + ',' + (node.gy + dy));
        if (neighbor && clearRoute(node, neighbor, geometry)) node.neighbors.push(neighbor.index);
      }
    }
    return { nodes, geometry };
  }
  function routeBetween(start, goal, navigation) {
    const { nodes, geometry } = navigation;
    if (clearRoute(start, goal, geometry)) return [copy(goal)];
    function nearest(point) {
      const ordered = nodes.slice().sort((a, b) => distance(a, point) - distance(b, point));
      return ordered.find(node => clearRoute(point, node, geometry));
    }
    const first = nearest(start), last = nearest(goal);
    if (!first || !last) return [];
    const queue = [first.index], previous = new Map([[first.index, -1]]);
    for (let i = 0; i < queue.length && !previous.has(last.index); i++) {
      for (const next of nodes[queue[i]].neighbors) if (!previous.has(next)) { previous.set(next, queue[i]); queue.push(next); }
    }
    if (!previous.has(last.index)) return [];
    const path = [copy(goal)];
    for (let index = last.index; index !== -1; index = previous.get(index)) path.push(copy(nodes[index]));
    path.reverse();
    // Keep bends around exclusions, skipping only fully visible grid segments.
    const simplified = []; let from = start, index = 0;
    while (index < path.length) {
      let far = index;
      for (let j = index + 1; j < path.length; j++) { if (!clearRoute(from, path[j], geometry)) break; far = j; }
      simplified.push(path[far]); from = path[far]; index = far + 1;
    }
    return simplified;
  }

  function mount(options) {
    if (mounted) { mounted.refresh(); return mounted; }
    if (typeof document === 'undefined' || !document.body) return null;
    const opts = options || {};
    const getProbability = typeof opts.getProbability === 'function' ? opts.getProbability : () => 0.5;
    const setProbability = typeof opts.setProbability === 'function' ? opts.setProbability : () => {};
    const onActivity = typeof opts.onActivity === 'function' ? opts.onActivity : () => {};
    const onAutoDriveChange = typeof opts.onAutoDriveChange === 'function' ? opts.onAutoDriveChange : () => {};
    let impactStrength = collisionStrength(opts.collisionStrength);
    let pace = naturalPace(opts.naturalPace);
    const isReady = typeof opts.isReady === 'function' ? opts.isReady : () => true;
    const isPaused = typeof opts.isPaused === 'function' ? opts.isPaused : () => false;
    const field = document.createElement('div');
    field.id = 'interactionField'; field.className = 'interaction-field';
    field.setAttribute('role', 'group'); field.setAttribute('aria-label', '代号：交互');
    field.hidden = true;
    const bodies = [];
    document.body.appendChild(field);

    let destroyed = false, geometry = null, sites = [], available = false, paused = true, layoutReady = true;
    let frameId = 0, refreshId = 0, contactTimer = 0, settleTimer = 0, previousTime = 0, lastPaint = 0, gesture = null, pageAway = false;
    let keyboardActivity = null;
    let autoEnabled = false, autoRage = false, autoClock = 0, navigation = null, autoNotice = '', lastRelay = -10, relay = null, nextReshuffle = 0, lastReshuffle = -1;
    const chargedContacts = new Map();
    const naturalContacts = new Map();
    const motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    const cleanups = [];
    const listen = (target, name, fn, settings) => { target.addEventListener(name, fn, settings); cleanups.push(() => target.removeEventListener(name, fn, settings)); };

    function emit(value, commit) {
      setProbability(finiteProbability(value), { source: 'interaction', commit: !!commit });
    }

    function autoUnavailable() {
      if (!bodies.length) return 'empty';
      if (motion.matches) return 'reduced-motion';
      if (!isReady()) return 'not-ready';
      if (!layoutReady || !available) return 'layout';
      return '';
    }
    function getAutoDrive() {
      return { enabled: autoEnabled, rage: autoEnabled && autoRage, activeCount: bodies.filter(body => body.auto).length, count: bodies.length,
        paused: autoEnabled && (paused || !!autoUnavailable()), unavailableReason: autoUnavailable(),
        nextReshuffle: autoEnabled ? nextReshuffle : 0, lastReshuffle };
    }
    function notifyAuto() {
      const state = getAutoDrive(), next = JSON.stringify(state);
      if (next !== autoNotice) { autoNotice = next; onAutoDriveChange(state); }
    }
    function newDriver(body) {
      body.auto = { phase: 'roam', until: autoClock + 0.5 + Math.random(), nextPlan: 0, target: null, lastTarget: null,
        path: [], speed: AUTO.cruiseMin + Math.random() * (AUTO.cruiseMax - AUTO.cruiseMin), stuck: 0, nextSight: 0, aim: null };
    }
    function rollLineup() {
      const normal = autoBounds(bodies.length);
      const roll = normal.lower + Math.floor(Math.random() * (normal.upper - normal.lower + 1));
      return autoRage ? Math.min(bodies.length, roll * 3) : roll;
    }
    function placementScale() {
      return clamp(Math.min(geometry.width / 1560, geometry.height / 1040), 0.7, 1.3);
    }
    function reconcileDrivers(redraw) {
      if (!autoEnabled) return;
      const bounds = autoRage ? rageBounds(bodies.length) : autoBounds(bodies.length);
      if (!bounds.lower) { autoEnabled = false; autoRage = false; bodies.forEach(body => { body.auto = null; }); return; }
      const active = bodies.filter(body => body.auto);
      const desired = redraw ? rollLineup() : clamp(active.length, bounds.lower, bounds.upper);
      while (active.length > desired) active.splice(Math.floor(Math.random() * active.length), 1)[0].auto = null;
      const idle = bodies.filter(body => !body.auto);
      while (active.length < desired && idle.length) {
        const body = idle.splice(Math.floor(Math.random() * idle.length), 1)[0]; newDriver(body); active.push(body);
      }
      // A driverless close pair earns the wheel: one member takes over from a
      // driver that has no close partner of its own, keeping the lineup size.
      if (bodies.length > 1) {
        const range = PLACEMENT.nearBand * placementScale();
        const partnered = new Set();
        bodies.forEach((body, i) => {
          if (bodies.some((other, j) => j !== i && distance(body, other) < range)) partnered.add(i);
        });
        bodies.forEach((body, i) => {
          if (!partnered.has(i) || body.auto || isManual(body)) return;
          const partner = bodies.find((other, j) => j !== i && partnered.has(j) && distance(body, other) < range);
          if (!partner || partner.auto || isManual(partner)) return;
          const index = bodies.findIndex(candidate => candidate.auto && !partnered.has(bodies.indexOf(candidate)));
          if (index < 0) return;
          bodies[index].auto = null;
          newDriver(Math.random() < 0.5 ? body : partner);
        });
      }
    }
    function scheduleReshuffle() {
      nextReshuffle = autoClock + AUTO.reshuffle * (0.8 + Math.random() * 0.4);
    }
    function setAutoDrive(value) {
      const rage = value === 'rage';
      const enable = !!value;
      if (enable && autoUnavailable()) { notifyAuto(); return false; }
      if (enable === autoEnabled && rage === autoRage) return autoEnabled;
      autoEnabled = enable; autoRage = enable && rage; relay = null; chargedContacts.clear();
      if (enable) { if (!navigation) navigation = navigationGrid(sites, geometry); reconcileDrivers(true); scheduleReshuffle(); }
      else bodies.forEach(body => { body.auto = null; });
      paint(performance.now()); notifyAuto(); requestFrame();
      return autoEnabled;
    }
    function isManual(body) {
      return !!((gesture && gesture.index === body.index) || (keyboardActivity && keyboardActivity.index === body.index) || body.manualUntil > autoClock);
    }
    function releaseDriver(body) {
      body.manualUntil = autoClock + AUTO.manualGrace;
      if (body.auto) { body.auto.phase = 'coast'; body.auto.until = body.manualUntil; body.auto.path = []; body.auto.target = null; }
    }
    function planDriver(body, escape) {
      const driver = body.auto;
      if (!driver || !navigation || !navigation.nodes.length) return;
      let candidates = bodies.filter(other => other !== body && !isManual(other));
      if (candidates.length > 1) candidates = candidates.filter(other => other !== driver.lastTarget);
      let goal;
      if (escape || !candidates.length) {
        const nodes = navigation.nodes.filter(node => distance(node, body) > 65 && distance(node, body) < 240);
        goal = (nodes.length ? nodes : navigation.nodes)[Math.floor(Math.random() * (nodes.length || navigation.nodes.length))];
        driver.target = null;
      } else {
        // A few nearby possibilities keep encounters frequent without perfect homing.
        candidates.sort((a, b) => distance(a, body) - distance(b, body));
        driver.target = candidates[Math.floor(Math.random() * Math.min(4, candidates.length))];
        goal = driver.target;
      }
      driver.path = routeBetween(body, goal, navigation); driver.nextPlan = autoClock + AUTO.replan; driver.nextSight = 0;
      driver.phase = escape || !driver.target ? 'roam' : 'chase';
      driver.until = autoClock + (escape ? 1.2 : 2 + Math.random() * 1.5);
    }
    function coolDriver(body, other) {
      if (!body.auto) return;
      const driver = body.auto;
      driver.lastTarget = other; driver.target = null; driver.path = [];
      driver.phase = 'coast'; driver.until = autoClock + 0.9 + Math.random() * 0.9; driver.stuck = 0;
    }
    function automaticImpact(body, other, nx, ny) {
      const charged = candidate => candidate.auto && candidate.auto.phase === 'charge' && !isManual(candidate);
      const a = charged(body) && body.vx * nx + body.vy * ny > 8;
      const b = charged(other) && -(other.vx * nx + other.vy * ny) > 8;
      if (!a && !b) return false;
      const key = Math.min(body.index, other.index) + ':' + Math.max(body.index, other.index);
      if (chargedContacts.has(key)) {
        if (body.auto) coolDriver(body, other);
        if (other.auto) coolDriver(other, body);
        return false;
      }
      chargedContacts.set(key, [body, other]);
      resolveAutoImpact(body, other, nx, ny, impactStrength);
      // Consume both sides' charge now, before another body/substep can see contact.
      if (body.auto) coolDriver(body, other);
      if (other.auto) coolDriver(other, body);
      const source = a ? body : other, receiver = a ? other : body;
      if (!receiver.auto && !isManual(receiver) && autoClock - lastRelay > 6 && Math.random() < 0.18) relay = { source, receiver };
      return true;
    }
    function driveBody(body, dt) {
      const driver = body.auto;
      if (!driver || isManual(body)) return false;
      if (driver.phase === 'coast' && autoClock < driver.until) return false;
      if (driver.phase === 'coast' || !driver.path.length || autoClock >= driver.until) planDriver(body, false);
      if (driver.target && (!bodies.includes(driver.target) || isManual(driver.target))) planDriver(body, false);
      if (driver.target && autoClock >= driver.nextPlan) {
        driver.path = routeBetween(body, driver.target, navigation); driver.nextPlan = autoClock + AUTO.replan;
      }
      while (driver.path.length > 1 && distance(body, driver.path[0]) < 12) driver.path.shift();
      let goal = driver.path[0];
      if (!goal) { planDriver(body, true); goal = driver.path[0]; }
      if (!goal) return false;
      const target = driver.target;
      if (autoClock >= driver.nextSight) {
        driver.visible = !!target && distance(body, target) < 180 && clearRoute(body, target, geometry);
        driver.aim = target ? copy(target) : null;
        if (driver.visible) {
          const predicted = { x: target.x + target.vx * 0.18, y: target.y + target.vy * 0.18 };
          if (geometry.valid(predicted) && clearRoute(body, predicted, geometry)) driver.aim = predicted;
        }
        driver.nextSight = autoClock + 0.14;
      }
      const visible = target && driver.visible;
      if (visible && distance(body, target) < 160 && driver.phase === 'chase') {
        driver.phase = 'charge'; driver.until = autoClock + 1.8;
      }
      if (driver.phase === 'charge' && visible) {
        // Modest prediction and a tiny time-varying miss angle, never through walls.
        goal = driver.aim || target;
      }
      const desired = Math.atan2(goal.y - body.y, goal.x - body.x) + (driver.phase === 'charge' ? Math.sin(autoClock * 2.1 + body.index) * 0.035 : 0);
      const turn = Math.atan2(Math.sin(desired - body.angle), Math.cos(desired - body.angle));
      body.angle += clamp(turn, -3.4 * dt, 3.4 * dt);
      const speed = (MOTION.horizontal + MOTION.vertical) * 0.5 * driver.speed * (driver.phase === 'charge' ? AUTO.burst : 1);
      const pull = 1 - Math.exp(-2.6 * dt);
      body.vx += (Math.cos(body.angle) * speed - body.vx) * pull;
      body.vy += (Math.sin(body.angle) * speed - body.vy) * pull;
      limitVelocity(body);
      return true;
    }

    function scatterHeading(body, other, neighbors) {
      let awayX = 0, awayY = 0;
      for (const neighbor of neighbors) {
        if (neighbor === body) continue;
        const d = Math.max(1, distance(body, neighbor)), weight = Math.max(0, 1 - d / NATURAL.neighborRadius);
        awayX += (body.x - neighbor.x) / d * weight;
        awayY += (body.y - neighbor.y) / d * weight;
      }
      const speed = Math.hypot(body.vx, body.vy);
      const base = Math.atan2(body.vy + awayY * 12, body.vx + awayX * 12);
      let best = base, bestScore = -Infinity;
      for (const offset of [0, 0.6, -0.6, 1.2, -1.2, 2.1, -2.1, Math.PI]) {
        const angle = base + offset, point = { x: body.x + Math.cos(angle) * 24, y: body.y + Math.sin(angle) * 24 };
        if (!clearRoute(body, point, geometry)) continue;
        const clearance = Math.min(100, ...neighbors.filter(n => n !== body).map(n => distance(point, n)));
        const score = clearance - Math.abs(offset) * 7;
        if (score > bestScore) { bestScore = score; best = angle; }
      }
      body.angle = best; body.turn = 0; body.scatterUntil = autoClock + 0.7;
      // In groups, a small sideways bias follows the open lane without cancelling recoil.
      if (neighbors.length > 2 && speed < 140) {
        const tx = -(other.y - body.y), ty = other.x - body.x, length = Math.hypot(tx, ty) || 1;
        const lateral = clamp((Math.cos(best) * tx + Math.sin(best) * ty) / length, -1, 1) * Math.min(9, (neighbors.length - 2) * 3);
        body.vx += tx / length * lateral; body.vy += ty / length * lateral;
        limitVelocity(body);
      }
    }
    function naturalImpact(body, other, nx, ny) {
      const key = Math.min(body.index, other.index) + ':' + Math.max(body.index, other.index);
      const approach = (body.vx - other.vx) * nx + (body.vy - other.vy) * ny;
      const fresh = !naturalContacts.has(key);
      const energize = fresh && approach > -1 && !isManual(body) && !isManual(other)
        && !(body.naturalCooldown > autoClock) && !(other.naturalCooldown > autoClock);
      const neighbors = bodies.filter(candidate => candidate === body || candidate === other
        || Math.min(distance(candidate, body), distance(candidate, other)) < NATURAL.neighborRadius);
      const kicked = resolveNaturalImpact(body, other, nx, ny, impactStrength, neighbors.length, energize);
      if (kicked) {
        naturalContacts.set(key, [body, other]);
        body.naturalCooldown = other.naturalCooldown = autoClock + NATURAL.cooldown;
        scatterHeading(body, other, neighbors); scatterHeading(other, body, neighbors);
      }
    }

    function paint(now) {
      field.classList.toggle('is-rage', autoEnabled && autoRage);
      bodies.forEach((body, index) => {
        body.button.style.transform = 'translate3d(' + (body.x - 22).toFixed(2) + 'px,' + (body.y - 22).toFixed(2) + 'px,0)';
        body.button.style.setProperty('--interaction-tilt', (index ? -16 : 13) + 'deg');
        body.button.classList.toggle('is-contact', body.contactUntil > now);
        body.button.classList.toggle('is-auto-driver', !!body.auto);
        body.button.classList.toggle('is-auto-charging', !!body.auto && body.auto.phase === 'charge' && !isManual(body) && !paused);
      });
    }

    function contact(a, b, now) {
      [a, b].forEach(body => { body.contactUntil = now + 170; body.button.classList.add('is-contact'); });
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
      const body = bodies[index];
      const before = copy(body);
      let spentStep = false;
      advance(body, target, geometry, next => {
        if (spentStep) return false;
        for (const other of bodies) {
          if (other === body) continue;
          const gap = distance(next, other);
          if (gap < RADIUS * 2) {
            let nx = (other.x - next.x) / (gap || 1), ny = (other.y - next.y) / (gap || 1);
            if (gap < 0.01) { nx = index ? -1 : 1; ny = 0; }
            const relative = (body.vx - other.vx) * nx + (body.vy - other.vy) * ny;
            if ((gesture && gesture.index === other.index) || (autoEnabled && keyboardActivity && keyboardActivity.index === other.index)) {
              // The held lens is kinematic: a drifting lens bounces off it, never moves the finger.
              if (relative > 0) {
                body.vx -= (1 + RESTITUTION) * relative * nx;
                body.vy -= (1 + RESTITUTION) * relative * ny;
                limitVelocity(body);
              }
              if (autoEnabled && body.auto) coolDriver(body, other);
              contact(body, other, now);
              spentStep = true;
              return false;
            }
            const push = RADIUS * 2 - gap + 0.02;
            const pushed = copy(other);
            advance(pushed, { x: other.x + nx * push, y: other.y + ny * push }, geometry,
              candidate => bodies.every(third => third === body || third === other || distance(candidate, third) >= RADIUS * 2));
            // If the other lens is trapped at the edge, the active lens stops at contact.
            if (distance(next, pushed) < RADIUS * 2 - 0.01) {
              if (!(gesture && gesture.index === index)) {
                if (!(autoEnabled && relative > 0 && automaticImpact(body, other, nx, ny))) naturalImpact(body, other, nx, ny);
                contact(body, other, now); spentStep = true;
              }
              return false;
            }
            other.x = pushed.x; other.y = pushed.y;
            const held = gesture && gesture.index === index;
            if (held) resolveImpact(body, other, nx, ny, true, impactStrength);
            else if (!(autoEnabled && relative > 0 && automaticImpact(body, other, nx, ny))) naturalImpact(body, other, nx, ny);
            if (!held) spentStep = true;
            contact(body, other, now);
          }
        }
        if (onStep) onStep(next);
        return true;
      });
      return distance(before, body);
    }

    function finishKeyboard() {
      if (!keyboardActivity) return;
      const current = keyboardActivity; keyboardActivity = null;
      if (bodies[current.index]) releaseDriver(bodies[current.index]);
      onActivity({ source: 'keyboard', light: current.value });
    }

    function finishGesture(commit) {
      finishKeyboard();
      if (!gesture) return;
      const current = gesture; gesture = null;
      const body = bodies[current.index];
      releaseDriver(body);
      body.button.classList.remove('is-dragging');
      body.button.classList.remove('is-held');
      try { if (body.button.hasPointerCapture(current.pointerId)) body.button.releasePointerCapture(current.pointerId); } catch (_) {}
      // Cancellation, modal opening and visibility loss lock the last visible value.
      if (commit && current.started) emit(current.value, true);
      if (commit && current.moved) onActivity({ source: 'drag', light: current.value });
      if (!current.started || motion.matches || performance.now() - current.lastTime > 80) { body.vx = 0; body.vy = 0; }
      paint(performance.now());
    }

    function canRun() { return !destroyed && bodies.length > 0 && available && !paused && !pageAway && !document.hidden; }
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
      if (now - lastPaint < (gesture || autoEnabled ? 15 : 32)) { requestFrame(); return; }
      const dt = clamp((now - previousTime) / 1000, 0, 0.05);
      previousTime = now; lastPaint = now;
      autoClock += dt;
      if (autoEnabled && autoClock >= nextReshuffle) {
        lastReshuffle = autoClock;
        reconcileDrivers(true);
        scheduleReshuffle();
        notifyAuto();
      }
      for (const [key, pair] of naturalContacts) {
        if (distance(pair[0], pair[1]) > RADIUS * 2 + 6) naturalContacts.delete(key);
      }
      if (autoEnabled) for (const [key, pair] of chargedContacts) {
        // Cooling down alone cannot recharge a pair that is still pressed together.
        if (distance(pair[0], pair[1]) > RADIUS * 2 + 6) chargedContacts.delete(key);
      }
      // Only the grabbed lens is pinned. Its partner keeps drifting and spends collision
      // velocity immediately; animation frames never write wallpaper probability.
      if (gesture && now - gesture.lastTime > 80) {
        bodies[gesture.index].vx = 0; bodies[gesture.index].vy = 0;
      }
      bodies.forEach((body, index) => {
          if (gesture && gesture.index === index) {
            return;
          }
          if (autoEnabled && keyboardActivity && keyboardActivity.index === index) return;
          const driving = autoEnabled && driveBody(body, dt);
          if (!driving) {
          body.turn = body.turn * Math.exp(-1.8 * dt) + (Math.random() - 0.5) * 1.6 * Math.sqrt(dt);
          body.angle += body.turn * dt;
          const pull = 1 - Math.exp(-(body.scatterUntil > autoClock ? 0.7 : 1.3) * dt);
          const cruisePace = body.auto ? 1 : pace;
          body.vx += (Math.cos(body.angle) * MOTION.horizontal * cruisePace - body.vx) * pull;
          body.vy += (Math.sin(body.angle) * MOTION.vertical * cruisePace - body.vy) * pull;
          }
          const old = copy(body), target = { x: body.x + body.vx * dt, y: body.y + body.vy * dt };
          moveBody(index, target, now);
          if (!geometry.valid(target) && (Math.abs(body.x - target.x) > 0.1 || Math.abs(body.y - target.y) > 0.1)) {
            // A contact bounce has already changed velocity; do not reflect it a second time.
            if (Math.abs(body.x - old.x) < 0.1 && (target.x - old.x) * body.vx > 0) body.vx *= -0.65;
            if (Math.abs(body.y - old.y) < 0.1 && (target.y - old.y) * body.vy > 0) body.vy *= -0.65;
            body.angle = Math.atan2(body.vy, body.vx);
          }
          if (driving && body.auto) {
            body.auto.stuck = distance(old, body) < 0.3 ? body.auto.stuck + dt : Math.max(0, body.auto.stuck - dt * 0.5);
            if (body.auto.stuck > 0.65) {
              planDriver(body, true); body.auto.stuck = 0;
              const waypoint = body.auto.path[0];
              if (waypoint) body.angle = Math.atan2(waypoint.y - body.y, waypoint.x - body.x);
            }
          }
      });
      if (relay) {
        if (autoEnabled && bodies.includes(relay.source) && bodies.includes(relay.receiver) && relay.source.auto && !relay.receiver.auto && !isManual(relay.source) && !isManual(relay.receiver)) {
          relay.source.auto = null; newDriver(relay.receiver); coolDriver(relay.receiver, relay.source); lastRelay = autoClock;
        }
        relay = null;
      }
      paint(now); requestFrame();
    }

    function syncState() {
      paused = !layoutReady || !isReady() || isPaused() || pageAway || document.hidden;
      if (autoEnabled && (motion.matches || !bodies.length)) { autoEnabled = false; chargedContacts.clear(); relay = null; bodies.forEach(body => { body.auto = null; }); }
      field.hidden = !available || !bodies.length || !isReady() || !layoutReady || bodies.some(body => !body.positioned);
      field.classList.toggle('is-paused', paused);
      field.setAttribute('aria-hidden', paused || !available || !bodies.length ? 'true' : 'false');
      bodies.forEach(body => { body.button.disabled = paused || !available || !bodies.length; body.button.style.pointerEvents = paused || !available || !bodies.length ? 'none' : 'auto'; });
      if (paused || !available || !bodies.length) { finishGesture(true); stopFrames(); }
      else requestFrame();
      paint(performance.now()); notifyAuto();
    }

    function partnerOf(body) {
      let partner = null, nearest = Infinity;
      for (const other of bodies) {
        const d = distance(body, other);
        if (other !== body && d < nearest) { partner = other; nearest = d; }
      }
      return partner;
    }

    function placeBody(body, placed, preserve) {
      const candidates = sites.filter(site => placed.every(other => distance(site, other) >= RADIUS * 2 + 2));
      if (!candidates.length) return false;
      const scale = clamp(Math.min(geometry.width / 1560, geometry.height / 1040), 0.7, 1.3);
      if (preserve) {
        const site = candidates.reduce((a, b) => distance(a, body) < distance(b, body) ? a : b);
        body.x = site.x; body.y = site.y; body.positioned = true;
        return true;
      }
      if (!placed.length) {
        const site = candidates[Math.floor(Math.random() * candidates.length)];
        body.x = site.x; body.y = site.y; body.positioned = true;
        return true;
      }
      // Constellation mood: every arrival redraws its cluster bias, band jitters and anchor.
      // Sessions drift between clumpy and exploratory instead of repeating a few shapes.
      // The desert gates the dice: the larger the void, the rarer cluster draws become.
      let voidNow = 0;
      for (const spot of sites) {
        const gap = Math.min(...placed.map(other => distance(spot, other)));
        if (gap > voidNow) voidNow = gap;
      }
      const mood = { nearJitter: 0.85 + Math.random() * 0.3, farJitter: 0.85 + Math.random() * 0.45, voidJitter: 0.9 + Math.random() * 0.25, topJitter: 0.85 + Math.random() * 0.3 };
      const voidOver = Math.max(0, voidNow - PLACEMENT.voidRadius * scale * mood.voidJitter) / (PLACEMENT.voidSpan * scale);
      const clusterBias = (0.35 + Math.random() * 0.45) * clamp(1 - voidOver, 0.15, 1);
      // Lonely lenses attract company; crowded ones stop being anchors.
      const anchorWeights = placed.map(other => 1 / (1 + placed.filter(rest => rest !== other && distance(rest, other) < NATURAL.neighborRadius).length));
      const anchor = pickSite(placed, anchorWeights);
      let choices = candidates;
      if (Math.random() < clusterBias) {
        const halo = candidates.filter(site => {
          const d = distance(site, anchor);
          return d >= PLACEMENT.haloNear * scale * mood.nearJitter && d <= PLACEMENT.haloFar * scale * mood.farJitter;
        });
        if (halo.length) choices = halo;
      }
      const site = pickSite(choices, placementWeights(choices, placed, scale, mood, sites));
      body.x = site.x; body.y = site.y; body.positioned = true;
      return true;
    }

    function refresh() {
      if (destroyed) return;
      if (refreshId) cancelAnimationFrame(refreshId);
      refreshId = 0;
      // Enter animations transform the hero/card. Place the first pair only after those
      // rectangles settle, so obstacle recovery cannot collapse their starting distance.
      layoutReady = !document.getAnimations || !document.getAnimations().some(animation => animation.animationName === 'enter' && animation.playState !== 'finished');
      if (!layoutReady && !settleTimer) settleTimer = window.setTimeout(() => { settleTimer = 0; refresh(); }, 60);
      const width = document.documentElement.clientWidth || window.innerWidth;
      const height = window.innerHeight || document.documentElement.clientHeight;
      const rects = Array.from(document.querySelectorAll(EXCLUDE)).map(node => node.getBoundingClientRect()).filter(rect => rect.width > 0 && rect.height > 0);
      const nextGeometry = makeGeometry(width, height, rects);
      const nextSites = width >= MIN_WIDTH && height >= 450 ? safeSites(nextGeometry) : [];
      const nextAvailable = nextSites.length >= 16;
      if (gesture && (!nextAvailable || !geometry || geometry.width !== width || geometry.height !== height || bodies.some(body => !nextGeometry.valid(body)))) finishGesture(true);
      geometry = nextGeometry; sites = nextSites; available = nextAvailable;
      navigation = autoEnabled && available ? navigationGrid(sites, geometry) : null;
      bodies.forEach(body => { if (body.auto) { body.auto.path = []; body.auto.nextPlan = 0; body.auto.nextSight = 0; } });
      if (available && layoutReady && isReady()) {
        const placed = [];
        for (const body of bodies) {
          if (!body.positioned || !geometry.valid(body) || placed.some(other => distance(body, other) < RADIUS * 2)) {
            if (!placeBody(body, placed, body.positioned)) { available = false; break; }
          }
          placed.push(body);
        }
        // A denser count or resize can make earlier off-grid positions waste capacity.
        // Repack in the same chamber; sites themselves have a full 24px separation.
        if (!available && sites.length >= bodies.length) {
          available = true; placed.length = 0;
          for (const body of bodies) {
            if (!placeBody(body, placed, false)) { available = false; break; }
            placed.push(body);
          }
        }
      }
      paint(performance.now()); syncState();
    }

    function queueRefresh() { if (!destroyed && !refreshId) refreshId = requestAnimationFrame(refresh); }

    function bindBody(body, index) {
      const listen = (target, name, fn) => {
        target.addEventListener(name, fn);
        body.cleanups.push(() => target.removeEventListener(name, fn));
      };
      listen(body.button, 'pointerdown', event => {
        if (!canRun() || gesture || (event.pointerType === 'mouse' && event.button !== 0)) return;
        finishKeyboard();
        event.preventDefault();
        // The invisible 44px targets overlap at contact: pick the nearest visible lens,
        // rather than letting DOM stacking make the first lens impossible to grab.
        const pointer = { x: event.clientX, y: event.clientY };
        const selectedIndex = bodies.reduce((best, candidate) => distance(pointer, candidate) + 0.5 < distance(pointer, bodies[best]) ? candidate.index : best, index);
        const selected = bodies[selectedIndex];
        selected.vx = 0; selected.vy = 0;
        releaseDriver(selected);
        selected.button.classList.add('is-pointer-focused');
        selected.button.classList.add('is-held');
        selected.button.focus({ preventScroll: true });
        gesture = { index: selectedIndex, pointerId: event.pointerId, origin: pointer, offset: { x: selected.x - event.clientX, y: selected.y - event.clientY }, last: copy(selected), lastPointer: pointer, lastTime: performance.now(), started: false, value: finiteProbability(getProbability()), model: null };
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
          current.partner = partnerOf(body);
          current.model = startModel(current.value, body, current.partner, geometry);
          body.button.classList.add('is-dragging');
        }
        const now = performance.now();
        const dt = Math.max(0.008, (now - current.lastTime) / 1000);
        // Resolve contact with this event's velocity, not the preceding pointermove's velocity.
        body.vx = clamp((event.clientX - current.lastPointer.x) / dt, -75, 75);
        body.vy = clamp((event.clientY - current.lastPointer.y) / dt, -75, 75);
        const target = { x: clamp(event.clientX + current.offset.x, 0, geometry.width), y: clamp(event.clientY + current.offset.y, 0, geometry.height) };
        const moved = moveBody(index, target, now, next => sampleModel(current.model, next, current.partner));
        if (moved > 0) {
          current.moved = true;
          body.vx = clamp((body.x - current.last.x) / dt, -75, 75);
          body.vy = clamp((body.y - current.last.y) / dt, -75, 75);
          current.value = modelProbability(current.model, body, current.partner);
          emit(current.value, false);
        }
        current.last = copy(body); current.lastPointer = { x: event.clientX, y: event.clientY }; current.lastTime = now;
        paint(now);
      });
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(body.button, name, event => {
        if (gesture && gesture.index === index && gesture.pointerId === event.pointerId) finishGesture(true);
      });
      listen(body.button, 'keydown', event => {
        body.button.classList.remove('is-pointer-focused');
        if (!canRun() || gesture) return;
        const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
        if (!direction) return;
        event.preventDefault();
        releaseDriver(body);
        const partner = partnerOf(body);
        const model = startModel(getProbability(), body, partner, geometry);
        const step = event.shiftKey ? 48 : 16;
        const moved = moveBody(index, { x: body.x + direction[0] * step, y: body.y + direction[1] * step }, performance.now(), next => sampleModel(model, next, partner));
        body.vx = 0; body.vy = 0;
        if (moved) {
          const value = modelProbability(model, body, partner);
          emit(value, true);
          if (keyboardActivity && keyboardActivity.index !== index) finishKeyboard();
          if (!keyboardActivity) keyboardActivity = { index, value, keys: new Set() };
          keyboardActivity.value = value; keyboardActivity.keys.add(event.key);
        }
        paint(performance.now());
      });
      listen(body.button, 'keyup', event => {
        if (keyboardActivity) { keyboardActivity.keys.delete(event.key); if (!keyboardActivity.keys.size) finishKeyboard(); }
      });
      listen(body.button, 'blur', () => { finishKeyboard(); body.button.classList.remove('is-pointer-focused'); });
      listen(body.button, 'contextmenu', event => event.preventDefault());
    }

    function createBody(index) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'interaction-item'; button.dataset.item = String(index); button.dataset.tone = index % 2 ? 'warm' : 'cool';
      button.setAttribute('aria-label', '拖动第 ' + (index + 1) + ' 枚浮光调整随机壁纸概率，也可使用方向键');
      button.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown ArrowLeft ArrowRight');
      const lens = document.createElement('span'); lens.className = 'interaction-lens'; lens.setAttribute('aria-hidden', 'true');
      const glint = document.createElement('span'); glint.className = 'interaction-glint'; glint.setAttribute('aria-hidden', 'true');
      lens.appendChild(glint); button.appendChild(lens); field.appendChild(button);
      const body = { index, cleanups: [], positioned: false, x: 0, y: 0, vx: (index ? -4 : 5) * MOTION.speedScale, vy: (index ? 3 : -2) * MOTION.speedScale, angle: Math.random() * Math.PI * 2, turn: 0, button, contactUntil: 0, auto: null, manualUntil: 0 };
      bodies.push(body);
      bindBody(body, index);
    }

    function setCount(value) {
      const count = Number.isFinite(value) ? clamp(Math.round(value), 0, 49) : 2;
      if (count === bodies.length) return;
      finishGesture(true);
      chargedContacts.clear();
      naturalContacts.clear();
      while (bodies.length > count) {
        const body = bodies.pop();
        body.cleanups.forEach(fn => fn()); body.button.remove();
      }
      while (bodies.length < count) createBody(bodies.length);
      reconcileDrivers(false);
      refresh();
    }


    listen(window, 'resize', queueRefresh, { passive: true });
    listen(window, 'scroll', queueRefresh, { passive: true });
    listen(window, 'blur', () => { finishGesture(true); });
    listen(window, 'pagehide', () => { pageAway = true; syncState(); });
    listen(window, 'pageshow', event => {
      pageAway = false;
      if (event.persisted) bodies.forEach(body => { body.positioned = false; });
      refresh();
    });
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
      setCount,
      setAutoDrive,
      getAutoDrive,
      setCollisionStrength(value) { impactStrength = collisionStrength(value); },
      getCollisionStrength() { return impactStrength; },
      setNaturalPace(value) { pace = naturalPace(value); },
      getNaturalPace() { return pace; },
      destroy() {
        if (destroyed) return;
        finishGesture(true); destroyed = true; stopFrames();
        if (refreshId) cancelAnimationFrame(refreshId);
        if (contactTimer) window.clearTimeout(contactTimer);
        if (settleTimer) window.clearTimeout(settleTimer);
        bodies.forEach(body => body.cleanups.forEach(fn => fn()));
        cleanups.forEach(fn => fn()); field.remove();
        if (mounted === controller) mounted = null;
      }
    };
    mounted = controller; setCount(opts.count === undefined ? 2 : opts.count); refresh();
    return controller;
  }

  return { mount, motion: { normalize: saved => ({ version: 1, pace: naturalPace(saved && saved.pace) }),
    fromSlider: value => naturalPace(0.25 * Math.pow(64, clamp(Number(value) || 0, 0, 1200) / 1200)),
    toSlider: value => Math.round(Math.log(naturalPace(value) / 0.25) / Math.log(64) * 1200) },
    count: { max: COUNT_MAX, curve: COUNT_CURVE,
    fromSlider: value => { const t = clamp((Number(value) || 0) / 1000, 0, 1);
      return t <= 0.5 ? Math.round(COUNT_MID * Math.pow(t / 0.5, COUNT_LOW_CURVE)) : Math.round(COUNT_MAX * Math.pow(t, COUNT_CURVE)); },
    toSlider: value => { const c = clamp(Math.round(Number(value) || 0), 0, COUNT_MAX);
      return c <= COUNT_MID ? Math.round(500 * Math.pow(c / COUNT_MID, 1 / COUNT_LOW_CURVE)) : Math.round(1000 * Math.pow(c / COUNT_MAX, 1 / COUNT_CURVE)); } },
    autoDrive: { bounds: autoBounds, rageBounds, motion: AUTO }, collision: { max: COLLISION_MAX, normalize: collisionSettings, strength: collisionStrength, draw: randomCollision,
    fromSlider: value => collisionStrength(Math.pow(COLLISION_MAX, clamp(Number(value) || 0, 0, 1000) / 1000)),
    toSlider: value => Math.round(Math.log(collisionStrength(value)) / Math.log(COLLISION_MAX) * 1000) },
    _test: { REGION, WEIGHTS, MOTION, AUTO, NATURAL, PLACEMENT, naturalPace, naturalResponse, resolveNaturalImpact, RESTITUTION, MAX_IMPACT_SPEED, resolveImpact, resolveAutoImpact, autoBounds, rageBounds, placementWeights, pickSite, limitVelocity, makeGeometry, inPolygon, segmentDistance, advance, potential, startModel, sampleModel, modelProbability, safeSites, clearRoute, navigationGrid, routeBetween } };
});
