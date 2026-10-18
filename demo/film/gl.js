/* Lucent · 灵感台 — concept film · the light engine (WebGL 2)
 *
 * Two canvases. The world canvas paints the space behind everything — night, pearl, aurora and
 * dawn — plus god rays, stage lights, the warp of a launch and a white flash. The particle canvas
 * draws glints in front: dust, the sparks of a ring being drawn, glints that gather into a word.
 * Every frame is a function of the state passed to render(): nothing is stepped or remembered.
 */
(function () {
  'use strict';

  var QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  var WORLD_VS = '#version 300 es\nin vec2 p; out vec2 vUv; void main(){ vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }';
  var WORLD_FS = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 vUv; out vec4 o;',
    'uniform float uT; uniform vec2 uRes; uniform vec4 uWorld; uniform vec3 uRays; uniform vec4 uWarp; uniform vec2 uSpot; uniform float uFlash; uniform float uVoid;',
    'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }',
    'float fbm(vec2 p){ float s = 0., a = .5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 5; i++) { s += a * noise(p); p = m * p; a *= .5; } return s; }',
    'vec3 night(vec2 uv, vec2 p){',
    '  vec3 c = mix(vec3(.010, .014, .028), vec3(.028, .05, .105), smoothstep(-.7, .9, p.y + .25 * p.x));',
    '  float n = fbm(p * 1.25 + vec2(uT * .012, 0.));',
    '  c += vec3(.018, .034, .08) * smoothstep(.45, .9, n);',
    '  c += vec3(.03, .06, .14) * exp(-pow((uv.y - .16) * 3.4, 2.));',
    '  return c; }',
    'vec3 pearl(vec2 uv, vec2 p){',
    '  vec3 base = mix(vec3(.885, .905, .945), vec3(.978, .984, .997), smoothstep(-.1, 1.05, uv.y));',
    '  vec2 q = vec2(fbm(p * .62 + uT * .02), fbm(p * .62 + vec2(4.1, 1.7) - uT * .016));',
    '  float f = fbm(p * .58 + 1.7 * q + vec2(uT * .012, 0.));',
    '  vec3 tint = mix(vec3(.66, .80, 1.), vec3(1., .86, .72), smoothstep(.28, .74, f));',
    '  tint = mix(tint, vec3(1., .76, .86), smoothstep(.48, .82, q.x) * .8);',
    '  tint = mix(tint, vec3(.78, .76, 1.), smoothstep(.5, .86, q.y) * .75);',
    '  vec3 c = mix(base, tint, .58);',
    '  float sheen = sin((p.x * 1.4 + p.y * .9) * 3.2 + f * 6. + uT * .25) * .5 + .5;',
    '  return c + vec3(1., .98, .96) * pow(sheen, 6.) * .05; }',
    'vec3 aurora(vec2 uv, vec2 p){',
    '  vec2 q = vec2(fbm(p * 1.15 + uT * .05), fbm(p * 1.15 + vec2(5.2, 1.3) - uT * .04));',
    '  vec2 r = vec2(fbm(p + 2. * q + vec2(1.7, 9.2) + uT * .03), fbm(p + 2. * q + vec2(8.3, 2.8) - uT * .025));',
    '  float f = fbm(p * .95 + 2.2 * r);',
    '  vec3 c = mix(vec3(.07, .04, .32), vec3(.22, .18, .98), smoothstep(.12, .52, f));',
    '  c = mix(c, vec3(.0, .66, 1.), smoothstep(.46, .78, r.x) * .85);',
    '  c = mix(c, vec3(1., .28, .78), smoothstep(.56, .92, q.y) * .78);',
    '  c = mix(c, vec3(1., .68, .30), smoothstep(.72, 1., r.y) * .5);',
    '  return c * (.78 + .42 * f); }',
    'vec3 dawn(vec2 uv, vec2 p){',
    '  vec3 c = mix(vec3(.94, .56, .46), vec3(.30, .30, .66), smoothstep(.0, .34, uv.y));',
    '  c = mix(c, vec3(.045, .065, .18), smoothstep(.34, 1.0, uv.y));',
    '  c += vec3(1., .80, .66) * exp(-pow((uv.y - .03) * 7., 2.)) * .3;',
    '  float n = fbm(p * 1.4 + vec2(uT * .02, 0.));',
    '  return c * (.9 + .16 * n); }',
    'float rays(vec2 p, vec2 o){',
    '  vec2 d = p - o; float r = length(d); vec2 a = d / max(r, 1e-4);',
    '  float n = fbm(a * 2.6 + vec2(uT * .06, -uT * .04));',
    '  return pow(smoothstep(.38, .92, n), 2.2) * exp(-r * 1.05) * smoothstep(0., .04, r); }',
    'float warp(vec2 p, vec2 c, float travel){',
    '  vec2 d = p - c; float r = length(d); float a = atan(d.y, d.x) / 6.28318 + .5;',
    '  float lanes = 180.; float k = floor(a * lanes); float lane = fract(a * lanes);',
    '  float h = hash(vec2(k, 3.7)), h2 = hash(vec2(k, 9.1));',
    '  float head = fract(h * 7.3 + travel * (.55 + .9 * h2)) * 1.6;',
    '  float len = .12 + .35 * h2;',
    '  float seg = smoothstep(head - len, head, r) * (1. - smoothstep(head, head + .015, r));',
    '  float thin = pow(1. - abs(lane - .5) * 2., 10.);',
    '  return thin * seg * step(.45, h) * smoothstep(.03, .25, r) * (.5 + r); }',
    'float spots(vec2 uv, float sway){',
    '  float s = 0.;',
    '  for (int i = 0; i < 4; i++) { float fi = float(i);',
    '    vec2 o = vec2(.16 + .227 * fi, 1.06);',
    '    float ang = (fi - 1.5) * .2 + sin(uT * .8 + fi * 1.9) * .14 * sway;',
    '    vec2 dir = vec2(sin(ang), -cos(ang)); vec2 d = uv - o;',
    '    float along = dot(d, dir); float across = abs(d.x * dir.y - d.y * dir.x);',
    '    s += smoothstep(.012 + along * .15, 0., across) * smoothstep(0., .08, along) * exp(-along * 1.1); }',
    '  return s * (.55 + .45 * fbm(uv * vec2(3., 1.4) + vec2(uT * .06, 0.))); }',
    'void main(){',
    '  vec2 uv = vUv; vec2 asp = vec2(uRes.x / uRes.y, 1.); vec2 p = (uv - .5) * asp;',
    '  vec3 c = vec3(0.);',
    '  if (uWorld.x > .001) c += uWorld.x * night(uv, p);',
    '  if (uWorld.y > .001) c += uWorld.y * pearl(uv, p);',
    '  if (uWorld.z > .001) c += uWorld.z * aurora(uv, p);',
    '  if (uWorld.w > .001) c += uWorld.w * dawn(uv, p);',
    '  c *= 1. - uVoid;',
    '  if (uRays.x > .001) { vec2 ro = (vec2(uRays.y, 1. - uRays.z) - .5) * asp; vec3 rc = mix(mix(vec3(.72, .84, 1.), vec3(1., .99, .96), uWorld.y), vec3(1., .84, .7), uWorld.w); c += uRays.x * rays(p, ro) * rc; }',
    '  if (uWarp.x > .001) { vec2 wc = (vec2(uWarp.y, 1. - uWarp.z) - .5) * asp; c += uWarp.x * warp(p, wc, uWarp.w) * vec3(.82, .92, 1.) * 2.4; }',
    '  if (uSpot.x > .001) c += uSpot.x * spots(uv, uSpot.y) * vec3(.66, .8, 1.) * .6;',
    '  c = mix(c, vec3(1.), clamp(uFlash, 0., 1.));',
    '  c += (hash(gl_FragCoord.xy + fract(uT)) - .5) / 255.;',
    '  o = vec4(c, 1.); }'
  ].join('\n');

  // Particles: positions are computed in the vertex shader from per-particle seeds and the time.
  var POINT_VS = [
    '#version 300 es',
    'precision highp float;',
    'in vec4 aSeed; in vec2 aTarget;',
    'uniform float uT; uniform vec2 uRes; uniform int uSys; uniform vec4 uA; uniform vec4 uB; uniform vec4 uC;',
    'out float vAlpha; out vec3 vColor;',
    'const float TAU = 6.28318530718;',
    'float ease(float x){ x = clamp(x, 0., 1.); return x < .5 ? 4. * x * x * x : 1. - pow(-2. * x + 2., 3.) / 2.; }',
    'void main(){',
    '  vec2 pos = vec2(-100.); float size = 2.; vAlpha = 0.; vColor = vec3(1.);',
    '  if (uSys == 0) {', // dust: uA = (alpha, push time, push strength, centre y); uB.xy = push centre
    '    vec2 base = aSeed.xy * uRes;',
    '    base += vec2(sin(uT * (.08 + .1 * aSeed.z) + aSeed.w * TAU), cos(uT * (.06 + .08 * aSeed.w) + aSeed.z * TAU)) * 26.;',
    '    vec2 d = base - uB.xy; float r = length(d);',
    '    float age = uT - uA.y; float wave = age > 0. ? exp(-pow((r - age * 900.) / 140., 2.)) * exp(-age * 1.4) : 0.;',
    '    pos = base + normalize(d + 1e-3) * wave * uA.z;',
    '    size = 1.4 + 2.8 * aSeed.z * aSeed.z;',
    '    vAlpha = uA.x * (.25 + .75 * aSeed.w) * (.6 + .4 * sin(uT * (1. + 2. * aSeed.z) + aSeed.x * 40.)) + wave * .6 * uA.x;',
    '    vColor = mix(vec3(.72, .84, 1.), vec3(1.), aSeed.z);',
    '  } else if (uSys == 1) {', // sparks shed by the ring: uA = (t0, t1, cx, cy); uB = (radius, alpha, life, -)
    '    float te = mix(uA.x, uA.y, aSeed.x); float age = uT - te;',
    '    if (age > 0. && age < uB.z) {',
    '      float a = -TAU / 4. + TAU * ease(aSeed.x);',
    '      vec2 head = uA.zw + uB.x * vec2(cos(a), sin(a));',
    '      vec2 tangent = vec2(-sin(a), cos(a)); vec2 normal = vec2(cos(a), sin(a));',
    '      vec2 vel = -tangent * (40. + 120. * aSeed.y) + normal * (aSeed.z - .35) * 140.;',
    '      pos = head + vel * age + vec2(0., 60.) * age * age;',
    '      float k = age / uB.z; vAlpha = uB.y * (1. - k) * (1. - k); size = 1.5 + 3.5 * aSeed.w * (1. - k);',
    '      vColor = mix(vec3(.8, .9, 1.), vec3(1.), aSeed.w);',
    '    }',
    '  } else if (uSys == 2) {', // gathering into a word: uA = (t0, span, alpha, swirl); targets in aTarget
    '    float start = uA.x + aSeed.x * uA.y * .55; float k = ease((uT - start) / (uA.y * .6));',
    '    vec2 from = vec2(.5, .5) * uRes + (aSeed.yz - .5) * uRes * vec2(1.25, 1.35);',
    '    float sw = (1. - k) * uA.w; vec2 mid = mix(from, aTarget, k);',
    '    pos = mid + vec2(sin(aSeed.w * TAU + uT * 2.), cos(aSeed.w * TAU + uT * 1.7)) * 80. * sw;',
    '    float fade = 1. - smoothstep(.0, 1., (uT - (uA.x + uA.y)) / .8);',
    '    vAlpha = uA.z * smoothstep(0., .25, uT - start + .25) * fade * (.75 + .5 * aSeed.w) * (1. + .8 * (1. - k));',
    '    size = mix(3.6 + 4.4 * aSeed.w, 2.3 + 1.5 * aSeed.w, k);',
    '    vColor = mix(vec3(.85, .92, 1.), vec3(1., .93, .78), aSeed.y);',
    '  } else if (uSys == 3) {', // a swarm of residents: uA = (t0, alpha, cx, cy); uB = (rx, ry, settle, -)
    '    float a = aSeed.x * TAU + (uT - uA.x) * (.5 + .9 * aSeed.y) * (aSeed.z > .5 ? 1. : -1.);',
    '    float rad = .35 + .65 * aSeed.w;',
    '    vec2 orbit = uA.zw + vec2(cos(a) * uB.x, sin(a) * uB.y) * rad;',
    '    pos = mix(orbit, aTarget, ease(uB.z * (.7 + .3 * aSeed.y)));',
    '    vAlpha = uA.y * (.75 + .6 * aSeed.y) * (.8 + .2 * sin(uT * 3. + aSeed.x * 20.)); size = 5. + 7. * aSeed.w;',
    '    vColor = mix(vec3(.82, .93, 1.), vec3(1., .9, .78), step(.8, aSeed.z));',
    '  }',
    '  gl_Position = vec4(pos / uRes * 2. - 1., 0., 1.); gl_Position.y = -gl_Position.y;',
    '  gl_PointSize = size * uC.x;',
    '}'
  ].join('\n');
  var POINT_FS = [
    '#version 300 es',
    'precision highp float;',
    'in float vAlpha; in vec3 vColor; out vec4 o;',
    'void main(){ vec2 d = gl_PointCoord - .5; float r = length(d) * 2.;',
    '  float a = exp(-r * r * 4.) + .6 * exp(-r * r * 26.); a *= vAlpha; if (a < .002) discard;',
    '  o = vec4(vColor * a, a); }'
  ].join('\n');

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  function uniforms(gl, p, names) { var u = {}; names.forEach(function (n) { u[n] = gl.getUniformLocation(p, n); }); return u; }

  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s + 0x6D2B79F5) >>> 0; var x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  }

  function create(worldCanvas, fxCanvas) {
    var g = worldCanvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true, alpha: false });
    var f = fxCanvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: true, alpha: true });
    if (!g || !f) return null;

    var wp = program(g, WORLD_VS, WORLD_FS);
    var wu = uniforms(g, wp, ['uT', 'uRes', 'uWorld', 'uRays', 'uWarp', 'uSpot', 'uFlash', 'uVoid']);
    var wb = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, wb); g.bufferData(g.ARRAY_BUFFER, QUAD, g.STATIC_DRAW);
    var wl = g.getAttribLocation(wp, 'p');

    var pp = program(f, POINT_VS, POINT_FS);
    var pu = uniforms(f, pp, ['uT', 'uRes', 'uSys', 'uA', 'uB', 'uC']);
    var systems = {};
    function system(name, count, seed, targets) {
      var r = rng(seed), data = new Float32Array(count * 6);
      for (var i = 0; i < count; i++) {
        data[i * 6] = r(); data[i * 6 + 1] = r(); data[i * 6 + 2] = r(); data[i * 6 + 3] = r();
        var tg = targets ? targets[i % targets.length] : [0, 0];
        data[i * 6 + 4] = tg[0]; data[i * 6 + 5] = tg[1];
      }
      var vao = f.createVertexArray(); f.bindVertexArray(vao);
      var buf = f.createBuffer(); f.bindBuffer(f.ARRAY_BUFFER, buf); f.bufferData(f.ARRAY_BUFFER, data, f.STATIC_DRAW);
      var ls = f.getAttribLocation(pp, 'aSeed'), lt = f.getAttribLocation(pp, 'aTarget');
      f.enableVertexAttribArray(ls); f.vertexAttribPointer(ls, 4, f.FLOAT, false, 24, 0);
      f.enableVertexAttribArray(lt); f.vertexAttribPointer(lt, 2, f.FLOAT, false, 24, 16);
      f.bindVertexArray(null);
      systems[name] = { vao: vao, count: count };
    }

    return {
      system: system,
      render: function (s) {
        // World
        g.viewport(0, 0, worldCanvas.width, worldCanvas.height);
        g.useProgram(wp);
        g.bindBuffer(g.ARRAY_BUFFER, wb); g.enableVertexAttribArray(wl); g.vertexAttribPointer(wl, 2, g.FLOAT, false, 0, 0);
        g.uniform1f(wu.uT, s.t); g.uniform2f(wu.uRes, worldCanvas.width, worldCanvas.height);
        g.uniform4fv(wu.uWorld, s.world); g.uniform3fv(wu.uRays, s.rays); g.uniform4fv(wu.uWarp, s.warp);
        g.uniform2fv(wu.uSpot, s.spot); g.uniform1f(wu.uFlash, s.flash); g.uniform1f(wu.uVoid, s.void || 0);
        g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
        // Particles
        f.viewport(0, 0, fxCanvas.width, fxCanvas.height);
        f.clearColor(0, 0, 0, 0); f.clear(f.COLOR_BUFFER_BIT);
        f.useProgram(pp); f.enable(f.BLEND); f.blendFunc(f.ONE, f.ONE);
        f.uniform1f(pu.uT, s.t); f.uniform2f(pu.uRes, 1920, 1080);
        f.uniform4f(pu.uC, fxCanvas.width / 1920, 0, 0, 0);
        (s.particles || []).forEach(function (p) {
          var sys = systems[p.name];
          if (!sys || !(p.alpha > 0.001)) return;
          f.uniform1i(pu.uSys, p.sys); f.uniform4fv(pu.uA, p.a); f.uniform4fv(pu.uB, p.b || [0, 0, 0, 0]);
          f.bindVertexArray(sys.vao); f.drawArrays(f.POINTS, 0, p.count || sys.count);
        });
        f.bindVertexArray(null);
      }
    };
  }

  window.FilmGL = { create: create };
})();
