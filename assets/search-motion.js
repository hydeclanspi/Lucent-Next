(function () {
  'use strict';
  var durations = { beam: 360, prism: 400, shutter: 320, filament: 460, thread: 440, orbit: 480 };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function play(options) {
    var form = options.form, input = options.input, button = options.button;
    var canvas, ctx, frame = 0, timer = 0, finished = false;
    var wasReadOnly = input.readOnly;
    function clean() {
      cancelAnimationFrame(frame); clearTimeout(timer);
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', finish);
      form.classList.remove('search-motion-playing'); form.removeAttribute('aria-busy');
      input.readOnly = wasReadOnly; button.style.removeProperty('--search-arrival');
      if (canvas) canvas.remove();
    }
    function finish() {
      if (finished) return;
      finished = true; clean();
      if (options.onFinish) options.onFinish();
    }
    function cancel() { if (!finished) { finished = true; clean(); } }
    function onHidden() { if (document.hidden) finish(); }
    var control = { finish: finish, cancel: cancel };
    var renderer = window.AiraMotionRenderers && window.AiraMotionRenderers[options.variant];
    if (!renderer || reduce.matches || document.hidden) { finish(); return control; }
    try {
      var box = form.getBoundingClientRect(), field = input.getBoundingClientRect(), arrow = button.getBoundingClientRect();
      if (!box.width || !field.width) { finish(); return control; }
      canvas = document.createElement('canvas'); canvas.className = 'search-motion-canvas'; canvas.setAttribute('aria-hidden', 'true');
      var height = box.height + 108, dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(box.width * dpr); canvas.height = Math.round(height * dpr);
      canvas.style.height = height + 'px';
      ctx = canvas.getContext('2d');
      if (!ctx) { finish(); return control; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var style = getComputedStyle(input), fontSize = parseFloat(style.fontSize);
      var font = style.fontWeight + ' ' + fontSize + 'px ' + style.fontFamily;
      ctx.font = font;
      var text = String(options.text || ''), chars = Array.from(text);
      if (typeof Intl.Segmenter === 'function') chars = Array.from(new Intl.Segmenter('zh', { granularity: 'grapheme' }).segment(text), function (part) { return part.segment; });
      var cursor = field.left - box.left - input.scrollLeft, glyphs = [];
      var spacing = parseFloat(style.letterSpacing) || 0;
      chars.forEach(function (char) {
        var width = ctx.measureText(char).width;
        if (cursor + width > field.left - box.left && cursor < field.right - box.left) glyphs.push({ char: char, x: cursor, width: width });
        cursor += width + spacing;
      });
      var dark = document.documentElement.dataset.theme === 'dark';
      var state = { w: box.width, h: height, x: glyphs.length ? glyphs[0].x : field.left - box.left,
        y: field.top - box.top + 54 + field.height / 2 + fontSize * .35,
        tx: arrow.left - box.left + arrow.width / 2, ty: arrow.top - box.top + 54 + arrow.height / 2,
        text: glyphs.map(function (g) { return g.char; }).join(''), font: font, fontSize: fontSize,
        ink: style.color, accent: dark ? '#d2b18a' : '#95734e', light: dark ? '#fff3dc' : '#9b7b52', dark: dark, glyphs: glyphs,
        textWidth: glyphs.length ? glyphs[glyphs.length - 1].x + glyphs[glyphs.length - 1].width - glyphs[0].x : 0 };
      form.appendChild(canvas); form.classList.add('search-motion-playing'); form.setAttribute('aria-busy', 'true'); input.readOnly = true;
      var duration = durations[options.variant] / (options.playbackRate === .35 ? .35 : 1), started = performance.now();
      function draw(now) {
        if (finished) return;
        var p = Math.min(1, (now - started) / duration);
        try {
          ctx.clearRect(0, 0, state.w, state.h); renderer(ctx, state, p);
          button.style.setProperty('--search-arrival', String(Math.sin(Math.PI * Math.max(0, Math.min(1, (p - .7) / .3))) * .75));
        } catch (error) { finish(); return; }
        if (p >= 1) finish(); else frame = requestAnimationFrame(draw);
      }
      document.addEventListener('visibilitychange', onHidden);
      window.addEventListener('pagehide', finish);
      // Dispatch is once-only even if ArkWeb suspends frame callbacks during navigation.
      timer = setTimeout(finish, duration + 100);
      draw(started);
    } catch (error) { finish(); }
    return control;
  }
  window.AiraSearchMotion = { play: play };
})();
