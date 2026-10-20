(function () {
  'use strict';

  var studies = [
    { id: 'beam', number: '01', name: '一线入光', latin: 'Lightline', duration: 360, copy: '字句成光，一线抵达。', shape: '<path d="M7 27h44m-28-3h22m-22 6h22"/><path class="sm-glyph-blue" d="M51 27h16m-5-4 5 4-5 4"/>' },
    { id: 'prism', number: '03', name: '微棱', latin: 'Microprism', duration: 400, copy: '冷暖微分，在终点合一。', shape: '<path d="m9 27 27-8 25 8-25 8Z"/><path class="sm-glyph-blue" d="M9 27h54m-26-8v16"/>' },
    { id: 'shutter', number: '04', name: '快门', latin: 'Shutter', duration: 320, copy: '一瞬曝光，利落出发。', shape: '<path d="M11 23h30m-30 8h30m5-13v18m5-14v10"/><path class="sm-glyph-blue" d="M51 27h16m-5-4 5 4-5 4"/>' },
    { id: 'filament', number: '09', name: '铂丝', latin: 'Platinum filament', duration: 460, copy: '纤细光丝，轻轻织入。', shape: '<path d="M7 18c30 0 23 21 56 9M7 27c27-15 33 16 56 0M7 36c26 0 30-18 56-9"/><path class="sm-glyph-blue" d="M63 27h5"/>' },
    { id: 'thread', number: '10', name: '穿针', latin: 'Through the eye', duration: 440, copy: '抽成一线，穿过微光。', shape: '<path d="M7 32c19 0 23-20 38-9s17 7 22 4"/><ellipse class="sm-glyph-blue" cx="55" cy="27" rx="3" ry="10"/>' },
    { id: 'orbit', number: '14', name: '近轨', latin: 'Near orbit', duration: 480, copy: '两道近弧，在箭头会合。', shape: '<path d="M8 27c18-18 42-18 57 0M8 27c18 18 42 18 57 0"/><path class="sm-glyph-blue" d="M8 27h5m47 0h7"/>' }
  ];
  var serial = 0;
  var arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
  var replayIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 8A8 8 0 1 1 4 15M4.5 3v5H10"/></svg>';
  var searchIcon = '<svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.4"/><path d="m15.3 15.3 5 5"/></svg>';

  function mount(container, options) {
    options = options || {};
    var initial = options.settings || {};
    var selected = studies.some(function (study) { return study.id === initial.variant; }) ? initial.variant : 'beam';
    var enabled = initial.enabled !== false;
    var random = initial.random === true;
    var previewVariant = selected;
    var simulationEnabled = options.simulationEnabled === true;
    var disposed = false;
    var active = null;
    var playbackRate = 1;
    var composing = false;
    var compositionEnd = 0;
    var listeners = [];
    var laserTimer = 0, ambientOn = false;
    var reduceAmbient = window.matchMedia('(prefers-reduced-motion: reduce)');
    var groupName = 'aira-search-motion-' + (++serial);
    container.textContent = '';
    var panel = document.createElement('section');
    panel.className = 'sm-panel';
    panel.innerHTML =
      '<header class="sm-heading"><div class="sm-heading-copy"><p class="sm-eyebrow">A THOUGHT, IN FLIGHT</p>' +
      '<div class="sm-title-row"><h2 class="sm-title">念起，光行</h2><button class="wp-random sm-toggle" type="button" aria-label="启用搜索动效"><span class="sm-toggle-label">开启搜索动效</span><i class="wp-track" aria-hidden="true"><i class="wp-knob"></i></i></button></div>' +
      '<p class="sm-subtitle">搜索动效</p></div>' +
      '<div class="sm-heading-actions"><button class="sm-engine" type="button"><span class="sm-engine-label">搜索引擎设置</span>' + arrow + '</button>' +
      '<button class="wp-random interaction-toolbar sm-simulation" type="button" aria-pressed="false"><svg class="sm-sim-hint" viewBox="0 0 34 42" fill="currentColor" aria-hidden="true" focusable="false"><path d="M17.68 5.08 L17.37 4.92 L17.03 4.80 L16.68 4.70 L16.32 4.61 L15.96 4.55 L15.59 4.50 L15.22 4.46 L14.84 4.44 L14.46 4.43 L14.08 4.44 L13.70 4.46 L13.31 4.50 L12.92 4.55 L12.53 4.61 L12.15 4.69 L11.76 4.78 L11.37 4.89 L10.99 5.01 L10.60 5.14 L10.22 5.29 L9.84 5.45 L9.47 5.63 L9.10 5.82 L8.73 6.02 L8.37 6.24 L8.01 6.47 L7.66 6.72 L7.32 6.98 L6.99 7.25 L6.66 7.54 L6.34 7.84 L6.03 8.16 L5.73 8.49 L5.44 8.83 L5.16 9.19 L4.90 9.57 L4.65 9.95 L4.41 10.35 L4.18 10.77 L3.97 11.19 L3.77 11.63 L3.60 12.09 L3.43 12.55 L3.29 13.03 L3.16 13.52 L3.06 14.02 L2.97 14.53 L2.90 15.06 L2.85 15.59 L2.84 16.11 L2.84 16.62 L2.87 17.14 L2.92 17.65 L2.99 18.15 L3.08 18.66 L3.20 19.15 L3.33 19.64 L3.49 20.13 L3.67 20.61 L3.86 21.08 L4.08 21.55 L4.31 22.00 L4.56 22.45 L4.84 22.89 L5.12 23.32 L5.43 23.74 L5.75 24.16 L6.09 24.56 L6.44 24.95 L6.81 25.33 L7.20 25.71 L7.60 26.07 L8.01 26.42 L8.44 26.76 L8.88 27.09 L9.34 27.41 L9.81 27.72 L10.29 28.02 L10.78 28.31 L11.29 28.58 L11.81 28.84 L12.34 29.09 L12.88 29.33 L13.44 29.56 L14.00 29.77 L14.58 29.97 L15.17 30.16 L15.76 30.33 L16.37 30.50 L16.99 30.64 L17.62 30.78 L18.26 30.90 L18.91 31.00 L19.57 31.10 L20.24 31.17 L20.92 31.23 L21.16 31.24 L21.39 31.25 L21.61 31.26 L21.83 31.26 L22.05 31.26 L22.27 31.27 L22.49 31.27 L22.70 31.27 L22.91 31.27 L23.12 31.27 L23.33 31.26 L23.54 31.26 L23.74 31.25 L23.94 31.24 L24.14 31.23 L24.34 31.22 L24.54 31.21 L24.73 31.19 L24.92 31.18 L25.11 31.16 L25.30 31.14 L25.48 31.11 L25.67 31.09 L25.85 31.06 L26.03 31.03 L26.21 31.00 L26.38 30.96 L26.55 30.92 L26.72 30.87 L26.89 30.84 L27.06 30.82 L27.23 30.81 L27.39 30.79 L27.56 30.77 L27.72 30.76 L27.88 30.74 L28.03 30.72 L28.19 30.69 L28.35 30.67 L28.50 30.65 L28.65 30.62 L28.80 30.60 L28.95 30.57 L29.09 30.54 L29.24 30.52 L29.38 30.49 L29.52 30.46 L29.66 30.43 L29.49 30.42 L29.34 30.32 L29.27 30.16 L29.28 29.99 L29.38 29.84 L29.53 29.71 L29.39 29.74 L29.26 29.76 L29.12 29.79 L28.98 29.81 L28.83 29.84 L28.69 29.86 L28.55 29.88 L28.40 29.91 L28.25 29.93 L28.10 29.95 L27.95 29.97 L27.79 29.99 L27.64 30.01 L27.48 30.02 L27.32 30.04 L27.16 30.05 L27.00 30.07 L26.83 30.08 L26.67 30.08 L26.49 30.04 L26.32 30.02 L26.15 30.00 L25.98 29.98 L25.80 29.96 L25.62 29.95 L25.45 29.93 L25.27 29.91 L25.08 29.89 L24.90 29.87 L24.72 29.85 L24.53 29.83 L24.34 29.81 L24.15 29.79 L23.96 29.77 L23.77 29.74 L23.57 29.72 L23.37 29.69 L23.18 29.67 L22.97 29.64 L22.77 29.61 L22.57 29.59 L22.36 29.56 L22.15 29.53 L21.94 29.50 L21.73 29.47 L21.52 29.43 L21.30 29.40 L21.10 29.37 L20.47 29.29 L19.85 29.19 L19.24 29.08 L18.64 28.96 L18.05 28.83 L17.48 28.68 L16.91 28.53 L16.36 28.36 L15.82 28.17 L15.29 27.98 L14.78 27.78 L14.27 27.57 L13.78 27.35 L13.30 27.11 L12.84 26.87 L12.39 26.62 L11.95 26.36 L11.52 26.09 L11.11 25.81 L10.70 25.53 L10.32 25.24 L9.94 24.94 L9.59 24.63 L9.24 24.32 L8.91 24.00 L8.59 23.67 L8.29 23.34 L8.00 23.00 L7.72 22.65 L7.46 22.30 L7.22 21.95 L6.99 21.59 L6.78 21.22 L6.58 20.85 L6.39 20.48 L6.22 20.10 L6.07 19.72 L5.93 19.33 L5.81 18.94 L5.70 18.55 L5.61 18.15 L5.54 17.76 L5.48 17.35 L5.44 16.95 L5.42 16.54 L5.41 16.13 L5.42 15.72 L5.45 15.31 L5.50 14.89 L5.56 14.48 L5.64 14.07 L5.73 13.67 L5.84 13.28 L5.96 12.91 L6.09 12.54 L6.23 12.18 L6.39 11.83 L6.55 11.49 L6.73 11.16 L6.92 10.84 L7.12 10.53 L7.33 10.23 L7.54 9.94 L7.77 9.65 L8.00 9.38 L8.25 9.12 L8.50 8.86 L8.76 8.62 L9.02 8.38 L9.29 8.16 L9.57 7.94 L9.86 7.74 L10.15 7.54 L10.44 7.36 L10.74 7.18 L11.05 7.01 L11.35 6.86 L11.66 6.71 L11.98 6.57 L12.30 6.45 L12.62 6.33 L12.94 6.23 L13.26 6.13 L13.59 6.04 L13.91 5.97 L14.24 5.90 L14.56 5.85 L14.89 5.81 L15.22 5.77 L15.54 5.75 L15.87 5.74 L16.19 5.73 L16.51 5.74 L16.84 5.76 L17.16 5.78 L17.50 5.78 L17.70 5.78 L17.88 5.68 L17.98 5.50 L17.98 5.30 L17.88 5.12Z"/><path d="M31.22 29.62 L31.01 29.28 L30.80 28.94 L30.56 28.61 L30.31 28.30 L30.04 28.00 L29.76 27.72 L29.47 27.45 L29.17 27.18 L28.88 26.92 L28.59 26.65 L28.30 26.38 L28.02 26.11 L27.74 25.84 L27.46 25.57 L27.16 25.32 L26.86 25.07 L26.54 24.84 L26.21 24.63 L25.87 24.43 L25.53 24.23 L25.19 24.04 L24.84 23.85 L24.50 23.66 L24.15 23.48 L24.02 23.43 L23.88 23.46 L23.78 23.55 L23.73 23.68 L23.76 23.82 L23.87 23.90 L24.14 24.18 L24.41 24.45 L24.68 24.72 L24.95 24.98 L25.22 25.24 L25.48 25.50 L25.73 25.77 L25.98 26.04 L26.22 26.32 L26.45 26.61 L26.68 26.90 L26.91 27.18 L27.13 27.47 L27.36 27.76 L27.59 28.04 L27.83 28.33 L28.06 28.61 L28.30 28.90 L28.53 29.19 L28.76 29.48 L28.98 29.79 L29.19 30.10 L29.40 30.42 L29.61 30.75 L29.44 30.28 L29.53 29.79 L29.85 29.41 L30.32 29.24 L30.81 29.33Z"/><path d="M29.52 29.94 L29.32 30.23 L29.13 30.53 L28.95 30.83 L28.77 31.15 L28.61 31.47 L28.46 31.80 L28.31 32.14 L28.15 32.48 L27.98 32.82 L27.80 33.15 L27.61 33.49 L27.41 33.82 L27.21 34.16 L27.02 34.50 L26.83 34.86 L26.66 35.23 L26.49 35.62 L26.33 36.01 L26.16 36.41 L25.99 36.81 L25.80 37.21 L25.59 37.60 L25.37 37.99 L25.15 38.39 L25.23 38.33 L25.32 38.32 L25.41 38.35 L25.47 38.43 L25.48 38.52 L25.53 38.67 L25.89 38.38 L26.23 38.06 L26.54 37.74 L26.83 37.41 L27.11 37.07 L27.38 36.73 L27.64 36.39 L27.89 36.05 L28.15 35.72 L28.40 35.39 L28.65 35.07 L28.91 34.75 L29.15 34.42 L29.39 34.10 L29.61 33.78 L29.82 33.45 L30.03 33.13 L30.22 32.80 L30.41 32.47 L30.60 32.15 L30.79 31.83 L30.98 31.52 L31.17 31.21 L31.35 30.90 L30.98 31.31 L30.44 31.48 L29.90 31.35 L29.49 30.98 L29.32 30.44Z"/><path d="M29.25 30.3a1.15 1.15 0 1 0 2.3 0a1.15 1.15 0 1 0 -2.3 0Z"/></svg><span>无限模拟发射循环</span><i class="wp-track" aria-hidden="true"><i class="wp-knob"></i></i></button></div></header>' +
      '<section class="sm-preview" aria-label="搜索动效预览"><div class="sm-preview-heading"><div class="sm-current"><span class="sm-current-number"></span><span class="sm-current-name"></span><span class="sm-current-latin" lang="en"></span></div><span class="sm-duration"></span></div>' +
      '<div class="sm-stage"><form class="search sm-search" autocomplete="off">' + searchIcon + '<input type="search" aria-label="输入文字预览搜索动效" placeholder="写下一个念头…" enterkeyhint="search" maxlength="160"><button class="search-go" type="submit" aria-label="播放动效预览">' + arrow + '</button></form></div>' +
      '<div class="sm-preview-bottom"><div class="sm-speed" role="group" aria-label="预览速度"><button type="button" data-rate="1" aria-pressed="true">1× 原速</button><button type="button" data-rate="0.35" aria-pressed="false">0.35× 慢放</button></div><p class="sm-hint" hidden></p><button class="sm-replay" type="button">' + replayIcon + '<span>再看一次</span></button></div></section>' +
      '<fieldset class="sm-collection"><legend><span>抵达的方式</span><span class="sm-collection-tools"><span lang="en">SIX GESTURES</span><button class="wp-random sm-random" type="button" aria-pressed="false" aria-label="随机选择搜索动效"><span lang="en">Random</span><i class="wp-track" aria-hidden="true"><i class="wp-knob"></i></i></button></span></legend><div class="sm-grid"></div></fieldset>' +
      '<footer class="sm-footer"><p class="sm-selection" role="status" aria-live="polite"></p><button class="sm-done" type="button">完成' + arrow + '</button></footer>';
    container.appendChild(panel);
    var toggle = panel.querySelector('.sm-toggle');
    var simulation = panel.querySelector('.sm-simulation');
    var randomToggle = panel.querySelector('.sm-random');
    var form = panel.querySelector('form');
    var input = form.querySelector('input');
    var button = form.querySelector('.search-go');
    var replay = panel.querySelector('.sm-replay');
    var grid = panel.querySelector('.sm-grid');
    var number = panel.querySelector('.sm-current-number');
    var name = panel.querySelector('.sm-current-name');
    var latin = panel.querySelector('.sm-current-latin');
    var duration = panel.querySelector('.sm-duration');
    var hint = panel.querySelector('.sm-hint');
    var status = panel.querySelector('.sm-selection');
    var choices = [];
    input.value = '灵感与犀利并存';

    function listen(node, event, handler) {
      node.addEventListener(event, handler);
      listeners.push(function () { node.removeEventListener(event, handler); });
    }

    function tideOrigin() {
      var right = Math.random() < .5;
      grid.style.setProperty('--sm-tide-origin', right ? '82%' : '18%');
      grid.style.setProperty('--sm-tide-drift', right ? '12%' : '-12%');
    }
    // Speed relative to 4.8.3: N(0.70, 0.10^2), truncated at +/-3 sigma.
    // About 68.5% in .60-.80, 27.2% in .50-.60 / .80-.90,
    // and 4.3% in .40-.50 / .90-1.00. Sample speed, not duration.
    function sampledLaserSpeed() {
      var z;
      do {
        z = Math.sqrt(-2 * Math.log(Math.max(Number.EPSILON, Math.random()))) * Math.cos(2 * Math.PI * Math.random());
      } while (Math.abs(z) > 3);
      return .70 + .10 * z;
    }
    function scheduleLaser(minDelay, opening) {
      clearTimeout(laserTimer);
      if (!ambientOn || disposed || reduceAmbient.matches || document.hidden) return;
      laserTimer = setTimeout(function () {
        if (!ambientOn || disposed || document.hidden) return;
        var cards = Array.from(grid.querySelectorAll('.sm-choice'));
        if (cards.length < 2) return;
        var area = grid.getBoundingClientRect();
        var rects = cards.map(function (card) { return card.getBoundingClientRect(); });
        var twoColumns = Math.abs(rects[0].top - rects[1].top) < 2;
        var rows = rects.filter(function (rect, index) { return !index || rect.top > rects[index - 1].top + 2; });
        var lanes = [];
        for (var row = 0; row < rows.length - 1; row++) {
          lanes.push({ vertical: false, position: (rows[row].bottom + rows[row + 1].top) / 2 - area.top,
            weight: (twoColumns ? .7 : 1) / (rows.length - 1) });
        }
        if (twoColumns) lanes.push({ vertical: true, position: (rects[0].right + rects[1].left) / 2 - area.left, weight: .3 });
        // The opening wave takes every standard lane at once: the centre runs
        // top to bottom, the second row runs right to left, and the first row
        // runs left to right. Later waves stay mutually exclusive: 73% single,
        // 20% double, 7% triple, and draw lanes without replacement so no pair
        // can oppose on one road.
        var wave = Math.random(), openingShots = null;
        var count = Math.min(lanes.length, wave < .07 ? 3 : wave < .27 ? 2 : 1);
        if (opening) {
          var horizontal = lanes.filter(function (lane) { return !lane.vertical; });
          var vertical = lanes.filter(function (lane) { return lane.vertical; })[0];
          openingShots = [];
          if (vertical) openingShots.push({ lane: vertical, reverse: false });
          if (horizontal[1]) openingShots.push({ lane: horizontal[1], reverse: true });
          if (horizontal[0]) openingShots.push({ lane: horizontal[0], reverse: false });
          if (!openingShots.length) openingShots.push({ lane: lanes[0], reverse: false });
          count = openingShots.length;
        }
        var fragment = document.createDocumentFragment(), longest = 0;
        for (var shot = 0; shot < count; shot++) {
          var lane, reverse;
          if (openingShots) {
            var planned = openingShots[shot];
            lane = lanes.splice(lanes.indexOf(planned.lane), 1)[0];
            reverse = planned.reverse;
          } else {
            var total = lanes.reduce(function (sum, lane) { return sum + lane.weight; }, 0);
            var choice = Math.random() * total, index = 0;
            while (index < lanes.length - 1 && choice >= lanes[index].weight) { choice -= lanes[index].weight; index++; }
            lane = lanes.splice(index, 1)[0];
            reverse = Math.random() < (lane.vertical ? 4 / 30 : .5);
          }
          var ray = document.createElement('span');
          ray.className = 'sm-gap-laser' + (lane.vertical ? ' sm-gap-laser-vertical' : '');
          ray.setAttribute('aria-hidden', 'true');
          var duration = Math.round((lane.vertical ? 840 : 680) / sampledLaserSpeed());
          longest = Math.max(longest, duration);
          ray.style.animationDuration = duration + 'ms';
          ray.style[lane.vertical ? 'left' : 'top'] = lane.position + 'px';
          ray.style.setProperty('--sm-ray-run', ((lane.vertical ? area.height : area.width) + 100) + 'px');
          if (reverse) ray.classList.add('sm-gap-laser-reverse');
          ray.addEventListener('animationend', function (event) { event.currentTarget.remove(); }, { once: true });
          fragment.appendChild(ray);
        }
        grid.appendChild(fragment);
        // Finish this wave before another can reuse any of its lanes.
        scheduleLaser(longest + 90);
      }, opening ? 275 : Math.max(1530 + Math.random() * 1640, minDelay || 0));
    }
    function syncAmbient() {
      if (ambientOn === random) return;
      ambientOn = random;
      clearTimeout(laserTimer);
      grid.querySelectorAll('.sm-gap-laser').forEach(function (ray) { ray.remove(); });
      if (random) { tideOrigin(); scheduleLaser(0, true); }
    }
    listen(grid, 'animationiteration', function (event) {
      if (event.animationName === 'sm-prismatic-tide') tideOrigin();
    });
    listen(document, 'visibilitychange', function () {
      clearTimeout(laserTimer);
      if (!document.hidden) scheduleLaser();
    });
    listen(reduceAmbient, 'change', function () { scheduleLaser(); });

    function current() {
      return studies.filter(function (study) { return study.id === (random ? previewVariant : selected); })[0];
    }

    function stop() {
      if (active && typeof active.cancel === 'function') active.cancel();
      active = null;
    }

    function preview() {
      stop();
      if (disposed || !enabled || composing || Date.now() - compositionEnd < 100) return;
      var play = options.play || (window.AiraSearchMotion && window.AiraSearchMotion.play);
      if (typeof play !== 'function') return;
      var text = input.value.trim();
      if (!text) { input.value = '灵感与犀利并存'; text = input.value; }
      previewVariant = random ? studies[Math.floor(Math.random() * studies.length)].id : selected;
      sync();
      active = play({
        form: form, input: input, button: button, text: text, variant: previewVariant, playbackRate: playbackRate,
        onFinish: function () { active = null; }
      });
    }

    function sync() {
      var study = current();
      toggle.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      toggle.setAttribute('aria-label', enabled ? '关闭搜索动效' : '开启搜索动效');
      panel.classList.toggle('sm-off', !enabled);
      syncAmbient();
      panel.classList.toggle('sm-random-on', random);
      randomToggle.setAttribute('aria-pressed', String(random));
      number.textContent = study.number;
      name.textContent = study.name;
      latin.textContent = study.latin;
      duration.textContent = study.duration + ' ms';
      hint.textContent = enabled ? '输入文字，回车即见。' : '动效已关闭 · 搜索直接出发';
      status.textContent = enabled ? (random ? 'Random · 六式随行 · 此刻 ' : '已选 · ') + study.number + ' ' + study.name : '已关闭 · 保留你的心选';
      simulation.setAttribute('aria-pressed', String(simulationEnabled));
      if (simulationEnabled) status.textContent = (random ? 'Random · ' : '') + '仅本次 · 首次回弹，长按 Enter 连发，丝绸绢光和浮金系统已激活';
      replay.disabled = !enabled;
      button.disabled = !enabled;
      choices.forEach(function (choice) { choice.checked = !random && choice.value === selected; });
    }

    function change() {
      sync();
      if (typeof options.onChange === 'function') options.onChange({ enabled: enabled, variant: selected, random: random });
    }

    studies.forEach(function (study) {
      var label = document.createElement('label');
      label.className = 'sm-choice';
      var radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = groupName;
      radio.value = study.id;
      radio.className = 'sm-radio';
      radio.setAttribute('aria-label', study.number + ' ' + study.name + (study.id === 'beam' ? '，默认方案' : ''));
      label.appendChild(radio);
      var content = document.createElement('span');
      content.className = 'sm-choice-content';
      content.innerHTML = '<span class="sm-choice-line"><span class="sm-choice-number">' + study.number + '</span><span class="sm-choice-name">' + study.name + '</span><span class="sm-choice-mark" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="m3 8 3 3 7-7"/></svg></span></span>' +
        '<span class="sm-choice-latin" lang="en">' + study.latin + '</span><svg class="sm-glyph" viewBox="0 0 76 54" aria-hidden="true">' + study.shape + '</svg><span class="sm-choice-description">' + study.copy + '</span>';
      label.appendChild(content);
      grid.appendChild(label);
      choices.push(radio);
      listen(radio, 'change', function () {
        if (!radio.checked) return;
        random = false;
        selected = study.id;
        change();
        preview();
      });
    });

    listen(toggle, 'click', function () { enabled = !enabled; stop(); change(); if (enabled) preview(); });
    listen(randomToggle, 'click', function () { random = !random; stop(); change(); if (enabled) preview(); });
    listen(simulation, 'click', function () {
      simulationEnabled = !simulationEnabled;
      sync();
      if (typeof options.onSimulationChange === 'function') options.onSimulationChange(simulationEnabled);
    });
    listen(panel.querySelector('.sm-engine'), 'click', function () {
      if (typeof options.onEngineSettings === 'function') options.onEngineSettings();
    });
    listen(replay, 'click', preview);
    Array.from(panel.querySelectorAll('.sm-speed button')).forEach(function (speed) {
      listen(speed, 'click', function () {
        playbackRate = Number(speed.dataset.rate);
        panel.querySelectorAll('.sm-speed button').forEach(function (item) { item.setAttribute('aria-pressed', String(item === speed)); });
        preview();
      });
    });
    listen(form, 'submit', function (event) { event.preventDefault(); preview(); });
    listen(input, 'compositionstart', function () { composing = true; stop(); });
    listen(input, 'compositionend', function () { composing = false; compositionEnd = Date.now(); });
    listen(input, 'keydown', function (event) {
      if (event.key === 'Enter' && (composing || event.isComposing || event.keyCode === 229 || Date.now() - compositionEnd < 100)) event.preventDefault();
    });
    listen(input, 'input', stop);
    listen(panel.querySelector('.sm-done'), 'click', function () { if (typeof options.onClose === 'function') options.onClose(); });
    sync();

    return {
      setSimulationEnabled: function (value) {
        if (disposed) return;
        simulationEnabled = value === true;
        sync();
      },
      destroy: function () {
        disposed = true;
        clearTimeout(laserTimer);
        stop();
        listeners.forEach(function (remove) { remove(); });
        listeners = [];
      }
    };
  }

  window.AiraSearchMotionPanel = { mount: mount };
})();
