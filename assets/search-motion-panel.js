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
    var disposed = false;
    var active = null;
    var playbackRate = 1;
    var composing = false;
    var compositionEnd = 0;
    var listeners = [];
    var groupName = 'aira-search-motion-' + (++serial);
    container.textContent = '';
    var panel = document.createElement('section');
    panel.className = 'sm-panel';
    panel.innerHTML =
      '<header class="sm-heading"><div class="sm-heading-copy"><p class="sm-eyebrow">A THOUGHT, IN FLIGHT</p>' +
      '<div class="sm-title-row"><h2 class="sm-title">念起，光行</h2><button class="wp-random sm-toggle" type="button" aria-label="启用搜索动效"><span class="sm-toggle-label">开启搜索动效</span><i class="wp-track" aria-hidden="true"><i class="wp-knob"></i></i></button></div>' +
      '<p class="sm-subtitle">搜索动效</p></div>' +
      '<button class="sm-engine" type="button"><span class="sm-engine-label">搜索引擎设置</span>' + arrow + '</button></header>' +
      '<section class="sm-preview" aria-label="搜索动效预览"><div class="sm-preview-heading"><div class="sm-current"><span class="sm-current-number"></span><span class="sm-current-name"></span><span class="sm-current-latin" lang="en"></span></div><span class="sm-duration"></span></div>' +
      '<div class="sm-stage"><form class="search sm-search" autocomplete="off">' + searchIcon + '<input type="search" aria-label="输入文字预览搜索动效" placeholder="写下一个念头…" enterkeyhint="search" maxlength="160"><button class="search-go" type="submit" aria-label="播放动效预览">' + arrow + '</button></form></div>' +
      '<div class="sm-preview-bottom"><div class="sm-speed" role="group" aria-label="预览速度"><button type="button" data-rate="1" aria-pressed="true">1× 原速</button><button type="button" data-rate="0.35" aria-pressed="false">0.35× 慢放</button></div><p class="sm-hint" hidden></p><button class="sm-replay" type="button">' + replayIcon + '<span>再看一次</span></button></div></section>' +
      '<fieldset class="sm-collection"><legend><span>抵达的方式</span><span lang="en">SIX GESTURES</span></legend><div class="sm-grid"></div></fieldset>' +
      '<footer class="sm-footer"><p class="sm-selection" role="status" aria-live="polite"></p><button class="sm-done" type="button">完成' + arrow + '</button></footer>';
    container.appendChild(panel);
    var toggle = panel.querySelector('.sm-toggle');
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

    function current() {
      return studies.filter(function (study) { return study.id === selected; })[0];
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
      active = play({
        form: form, input: input, button: button, text: text, variant: selected, playbackRate: playbackRate,
        onFinish: function () { active = null; }
      });
    }

    function sync() {
      var study = current();
      toggle.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      toggle.setAttribute('aria-label', enabled ? '关闭搜索动效' : '开启搜索动效');
      panel.classList.toggle('sm-off', !enabled);
      number.textContent = study.number;
      name.textContent = study.name;
      latin.textContent = study.latin;
      duration.textContent = study.duration + ' ms';
      hint.textContent = enabled ? '输入文字，回车即见。' : '动效已关闭 · 搜索直接出发';
      status.textContent = enabled ? '已选 · ' + study.number + ' ' + study.name : '已关闭 · 保留你的心选';
      replay.disabled = !enabled;
      button.disabled = !enabled;
      choices.forEach(function (choice) { choice.checked = choice.value === selected; });
    }

    function change() {
      sync();
      if (typeof options.onChange === 'function') options.onChange({ enabled: enabled, variant: selected });
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
        selected = study.id;
        change();
        preview();
      });
    });

    listen(toggle, 'click', function () { enabled = !enabled; stop(); change(); if (enabled) preview(); });
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
      destroy: function () {
        disposed = true;
        stop();
        listeners.forEach(function (remove) { remove(); });
        listeners = [];
      }
    };
  }

  window.AiraSearchMotionPanel = { mount: mount };
})();
