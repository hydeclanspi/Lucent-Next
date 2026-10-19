/* Aira / Search Motion Atelier — optical studies. No dependencies. */
(() => {
  'use strict';

  const PI = Math.PI;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const mix = (a, b, p) => a + (b - a) * p;
  const phase = (t, a, b) => clamp((t - a) / (b - a));
  const smooth = p => p * p * (3 - 2 * p);
  const out = p => 1 - Math.pow(1 - p, 3);
  const into = p => p * p * p;
  const envelope = (t, a = .03, b = .98) => Math.sin(PI * phase(t, a, b));
  const finish = t => 1 - smooth(phase(t, .84, 1));
  const colors = s => ({
    ink: s.ink || '#343a3e',
    accent: s.accent || (s.dark ? '#b9dcd9' : '#688e92'),
    light: s.light || (s.dark ? '#edf8f7' : '#91afb1'),
    ice: s.dark ? '#bddde9' : '#6b9cad',
    warm: s.dark ? '#e2d6bf' : '#a69a83',
    violet: s.dark ? '#c9c9e3' : '#9298ac'
  });

  function glyph(ctx, s, g, x, y, sx = 1, sy = 1, alpha = 1, rotation = 0, color) {
    if (s.burst || alpha <= .001 || sx <= 0 || sy <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(alpha);
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(sx, sy);
    ctx.font = s.font;
    ctx.fillStyle = color || s.ink;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillText(g.char, -g.width / 2, 0);
    ctx.restore();
  }

  function original(ctx, s) {
    ctx.font = s.font;
    ctx.fillStyle = s.ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    s.glyphs.forEach(g => ctx.fillText(g.char, g.x, s.y));
  }

  function line(ctx, points, color, width = 1, alpha = 1) {
    if (!points.length || alpha <= .001) return;
    ctx.save();
    ctx.globalAlpha = clamp(alpha);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach((v, i) => i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y));
    ctx.stroke();
    ctx.restore();
  }

  function segment(ctx, curve, start, end, color, width, alpha, count = 32) {
    if (end <= start) return;
    const points = [];
    for (let i = 0; i <= count; i++) points.push(curve(mix(start, end, i / count)));
    line(ctx, points, color, width, alpha);
  }

  function dot(ctx, x, y, radius, color, alpha = 1) {
    if (radius <= 0 || alpha <= .001) return;
    ctx.save();
    ctx.globalAlpha = clamp(alpha);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * PI);
    ctx.fill();
    ctx.restore();
  }

  function ellipse(ctx, x, y, rx, ry, color, alpha, start = 0, end = PI * 2, width = .7) {
    if (alpha <= .001 || rx <= 0 || ry <= 0) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = clamp(alpha);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, start, end);
    ctx.stroke();
    ctx.restore();
  }

  function beam(ctx, s, t) {
    const c = colors(s), squeeze = smooth(phase(t, .03, .43));
    const flight = into(phase(t, .28, .97));
    const baseline = mix(s.y, s.ty + .5, squeeze);
    const left = mix(s.x, s.tx, flight);
    const right = mix(Math.min(s.x + s.textWidth, s.tx - 12), s.tx, flight);
    s.glyphs.forEach(g => {
      const gx = mix(g.x + g.width / 2, s.tx, flight);
      glyph(ctx, s, g, gx, baseline, 1 - flight, Math.max(.025, 1 - squeeze),
        (1 - phase(t, .27, .49)) * finish(t));
    });
    const a = envelope(t, .14, 1);
    const streak = [{ x: left, y: baseline - 1 }, { x: right, y: baseline - 1 }];
    line(ctx, streak, c.accent, 4.2, a * .1);
    line(ctx, streak, c.light, 1.15, a * .8);
    line(ctx, streak, c.ink, .42, a * .28);
    const head = mix(right, s.tx, out(phase(t, .46, .95)));
    line(ctx, [{ x: right, y: baseline - 1 }, { x: head, y: s.ty }], c.accent, .7, a * .5);
    dot(ctx, head, s.ty, .8 + a * .4, c.light, a);
  }

  function prism(ctx, s, t) {
    const c = colors(s), settle = finish(t), split = envelope(t, .05, .86);
    const channels = [{ color: c.ice, sign: -1 }, { color: c.warm, sign: 1 }];
    const mid = Math.min(s.x + s.textWidth * .57, s.tx - 32);
    const focus = mix(mid, s.tx, into(phase(t, .12, .97)));
    const count = Math.max(1, s.glyphs.length - 1);
    s.glyphs.forEach((g, i) => {
      const p = smooth(phase(t, .06 + .12 * i / count, .93));
      const x0 = g.x + g.width / 2;
      const x = mix(x0, s.tx, p), y = mix(s.y, s.ty + 2, p);
      const spread = Math.sin(PI * p) * 3.7;
      channels.forEach(ch => glyph(ctx, s, g, x + ch.sign * spread * .38,
        y + ch.sign * spread, 1 - p * .95, 1 - p * .72,
        split * .24 * settle, -.08 * ch.sign * Math.sin(PI * p), ch.color));
      glyph(ctx, s, g, x, y, 1 - p * .95, 1 - p * .75,
        (1 - phase(p, .36, .9)) * settle);
    });
    const a = split * settle;
    const r = 13 * Math.sin(PI * phase(t, .08, 1));
    line(ctx, [{ x: focus - r * .5, y: s.ty - r }, { x: focus + r * .5, y: s.ty },
      { x: focus - r * .5, y: s.ty + r }], c.light, .65, a * .7);
    channels.forEach(ch => {
      const length = Math.min(72, (s.tx - s.x) * .25) * Math.sin(PI * phase(t, .1, 1));
      const curve = q => ({ x: mix(focus - length, focus, q),
        y: s.ty + ch.sign * 3.6 * Math.sin(PI * q) * split });
      segment(ctx, curve, 0, 1, ch.color, .8, a * .55);
    });
    dot(ctx, focus, s.ty, 1.1, c.light, a);
  }

  function filament(ctx, s, t) {
    const c = colors(s), n = Math.max(1, s.glyphs.length - 1);
    s.glyphs.forEach((g, i) => {
      const delay = .13 * i / n, p = phase(t, delay, .94 + delay * .35);
      const draw = smooth(phase(p, .02, .65)), end = out(phase(p, .28, 1));
      const x0 = g.x + g.width / 2;
      const rise = (i % 2 ? -1 : 1) * (4 + 5 * i / n);
      const curve = q => ({ x: mix(x0, s.tx, q),
        y: mix(s.y - s.fontSize * .34, s.ty, q) + rise * Math.sin(PI * q) });
      const letterP = smooth(phase(p, .03, .58));
      const at = curve(letterP * .25);
      glyph(ctx, s, g, mix(x0, at.x, letterP), mix(s.y, at.y, letterP),
        1 - letterP * .88, 1 - letterP * .91, 1 - letterP,
        (i % 2 ? 1 : -1) * letterP * .11);
      const a = envelope(p, .06, 1) * .6;
      segment(ctx, curve, end, draw, i % 3 === 0 ? c.warm : c.light,
        i % 3 === 0 ? .75 : .48, a);
      if (draw > end) {
        const tip = curve(draw);
        dot(ctx, tip.x, tip.y, .6, c.light, a);
      }
    });
  }

  function orbit(ctx, s, t) {
    const c = colors(s), count = Math.max(1, s.glyphs.length - 1);
    s.glyphs.forEach((g, i) => {
      const p = phase(t, .085 * i / count, .91 + .085 * i / count);
      const angle = PI * smooth(p);
      const x0 = g.x + g.width / 2, center = (x0 + s.tx) / 2;
      const radius = (s.tx - x0) / 2;
      const lane = i % 2 ? 1 : -1;
      const height = Math.min(18, 10 + (s.tx - x0) * .018);
      const curve = q => ({ x: center - radius * Math.cos(PI * q),
        y: mix(s.y, s.ty + 1, q) + lane * Math.sin(PI * q) * height });
      const q = smooth(p), at = curve(q);
      const scale = 1 - smooth(phase(p, .25, 1)) * .98;
      glyph(ctx, s, g, at.x, at.y, scale, Math.max(.08, scale),
        1 - phase(p, .6, .94), lane * .12 * Math.sin(angle));
      if (i % 3 === 0 || i === s.glyphs.length - 1) {
        const tail = Math.max(0, q - .18);
        const shift = q1 => { const pt = curve(q1); return { x: pt.x, y: pt.y - s.fontSize * .22 * (1 - q1) }; };
        segment(ctx, shift, tail, q, lane < 0 ? c.light : c.warm, .6,
          envelope(p) * .45);
      }
    });
  }

  const protect = render => (ctx, s, t) => {
      if (!ctx || !s || !s.glyphs || t >= 1) return;
      ctx.save();
      if (t <= 0) original(ctx, s);
      else render(ctx, s, clamp(t));
      ctx.restore();
  };
  window.AiraMotionRenderers = window.AiraMotionRenderers || {};
  Object.assign(window.AiraMotionRenderers, { beam: protect(beam), prism: protect(prism), filament: protect(filament), orbit: protect(orbit) });
})();

(function () {
  'use strict';

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const mix = (a, b, p) => a + (b - a) * p;
  const phase = (t, a, b) => clamp((t - a) / (b - a));
  const smooth = p => p * p * (3 - 2 * p);
  const cubic = p => p * p * p;
  const out = p => 1 - Math.pow(1 - p, 3);
  const pulse = p => Math.sin(Math.PI * clamp(p));

  function setup(ctx, s) {
    ctx.font = s.font && /\d(?:px|pt|em|rem)\b/.test(s.font)
      ? s.font : `${s.fontSize || 18}px ${s.font || 'sans-serif'}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  function glyphs(ctx, s) {
    if (s.glyphs && s.glyphs.length) return s.glyphs;
    let x = s.x;
    return Array.from(s.text || '').map(char => {
      const width = ctx.measureText(char).width;
      const glyph = { char, x, width };
      x += width;
      return glyph;
    });
  }

  function original(ctx, s) {
    ctx.fillStyle = s.ink;
    glyphs(ctx, s).forEach(g => ctx.fillText(g.char, g.x, s.y));
  }

  function withFrame(ctx, s, t, draw) {
    if (t >= 1 || t < 0) return;
    ctx.save();
    setup(ctx, s);
    if (t <= 0) original(ctx, s);
    else draw();
    ctx.restore();
  }

  function char(ctx, s, g, x, y, sx = 1, sy = sx, angle = 0, alpha = 1) {
    if (s.burst || alpha < .001 || sx <= 0 || sy <= 0) return;
    ctx.save();
    ctx.globalAlpha *= clamp(alpha);
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(sx, sy);
    ctx.fillStyle = s.ink;
    ctx.fillText(g.char, -g.width / 2, 0);
    ctx.restore();
  }

  function stroke(ctx, color, alpha, width, path) {
    if (alpha < .001) return;
    ctx.save();
    ctx.globalAlpha *= clamp(alpha);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    path();
    ctx.stroke();
    ctx.restore();
  }

  function glint(ctx, s, p, strength = 1) {
    const a = pulse(p) * strength;
    if (a < .001) return;
    stroke(ctx, s.accent || s.ink, a * .55, .8, () => {
      ctx.moveTo(s.tx - 3 - a * 7, s.ty);
      ctx.lineTo(s.tx + 2, s.ty);
    });
    stroke(ctx, s.light || s.ink, a * .65, .7, () => {
      ctx.moveTo(s.tx - 1, s.ty - a * 3.3);
      ctx.lineTo(s.tx - 1, s.ty + a * 3.3);
    });
  }

  function qpoint(a, b, c, p) {
    const n = 1 - p;
    return { x: n * n * a.x + 2 * n * p * b.x + p * p * c.x,
      y: n * n * a.y + 2 * n * p * b.y + p * p * c.y };
  }

  function qsegment(ctx, a, b, c, start, end, count = 22) {
    const first = qpoint(a, b, c, start);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i <= count; i++) {
      const p = qpoint(a, b, c, mix(start, end, i / count));
      ctx.lineTo(p.x, p.y);
    }
  }

  const renderers = {
    thread(ctx, s, t) {
      withFrame(ctx, s, t, () => {
        const gs = glyphs(ctx, s), n = Math.max(1, gs.length - 1);
        const fs = s.fontSize || 18;
        gs.forEach((g, i) => {
          const p = phase(t, (1 - i / n) * .1, .98);
          const flatten = smooth(phase(p, .025, .45));
          const flight = cubic(phase(p, .18, 1));
          const sx = mix(1, 1.1, flatten) * (1 - .84 * flight);
          const sy = mix(1, .026, flatten);
          const x = mix(g.x + g.width / 2, s.tx - 2, flight);
          const baseline = mix(s.y, s.ty, flatten);
          char(ctx, s, g, x, baseline, sx, sy, 0,
            1 - smooth(phase(p, .31, .63)));
          const a = { x: g.x + g.width / 2, y: s.ty };
          const b = { x: mix(a.x, s.tx, .56), y: s.ty - 8 - (i % 3) * 2 };
          const c = { x: s.tx - 2, y: s.ty };
          const head = out(phase(p, .20, 1));
          const segment = Math.min(.19, Math.max(.045, g.width * 1.2 / Math.max(50, c.x - a.x)));
          const tail = Math.max(0, head - segment * (1 - phase(p, .79, 1)));
          stroke(ctx, s.accent || s.ink,
            smooth(phase(p, .20, .46)) * (1 - smooth(phase(p, .84, 1))) * .64,
            .72, () => qsegment(ctx, a, b, c, tail, head));
          if (i % 3 === 0) {
            const point = qpoint(a, b, c, head);
            stroke(ctx, s.light || s.ink, pulse(p) * .2, .5, () => {
              ctx.moveTo(point.x - 3, point.y);
              ctx.lineTo(point.x, point.y);
            });
          }
        });
        glint(ctx, s, phase(t, .70, 1), .8);
      });
    },
    shutter(ctx, s, t) {
      withFrame(ctx, s, t, () => {
        const fs = s.fontSize || 18;
        const width = s.textWidth || ctx.measureText(s.text).width;
        const sliceHeight = fs * 1.35 / 3;
        const ys = [-fs * 1.15, -fs * 1.15 + sliceHeight, -fs * 1.15 + sliceHeight * 2];
        ys.forEach((sliceY, i) => {
          const p = phase(t, i * .035, .90 + i * .025);
          const travel = cubic(phase(p, .06, 1));
          const squeeze = smooth(phase(p, .18, .85));
          const sx = (1 + .13 * pulse(phase(p, 0, .55))) * (1 - .965 * travel);
          const sy = 1 - .93 * squeeze;
          const x = mix(s.x, s.tx - 2, travel);
          const y = mix(s.y, s.ty + fs * .25 * sy, squeeze);
          const alpha = 1 - smooth(phase(p, .76, 1));
          ctx.save();
          ctx.globalAlpha *= alpha;
          ctx.translate(x, y);
          ctx.transform(sx, 0, -.1 * pulse(p), sy, 0, 0);
          ctx.beginPath();
          ctx.rect(-1, sliceY, width + 2, sliceHeight + .4);
          ctx.clip();
          ctx.fillStyle = s.ink;
          if (!s.burst) ctx.fillText(s.text, 0, 0);
          ctx.restore();
          stroke(ctx, s.accent || s.ink, pulse(p) * .18, .55, () => {
            const edge = x + width * sx;
            ctx.moveTo(Math.max(s.x, edge - 8 - 13 * pulse(p)), s.ty + (i - 1) * 1.8);
            ctx.lineTo(edge, s.ty + (i - 1) * 1.8);
          });
        });
        glint(ctx, s, phase(t, .62, .99), .85);
      });
    },
  };
  Object.assign(window.AiraMotionRenderers, renderers);
})();
