/* An ephemeral playground. This controller has no bridge or storage access. */
(function () {
  'use strict';

  function mount(options) {
    var form = options.form, input = options.input, button = options.button;
    var enabled = false, first = true, running = false, active = null;
    var held = false, holding = false, pending = false, burstUntil = 0, lastRequest = -Infinity;
    var holdTimer = 0, revealTimer = 0, nextTimer = 0, generation = 0;
    var composing = false, imeBlocked = false, imeTimer = 0;
    var snapshot = null, roundTrip = false, laserText = '', cycleStarted = 0;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    function notify() {
      form.classList.toggle('search-simulation-enabled', enabled);
      if (options.onChange) options.onChange(enabled);
    }
    function generatedText() {
      var date = new Date();
      function pad(n) { return String(n).padStart(2, '0'); }
      return ['念起，光行', '当少爷好累', pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds()),
        'hydeclanspi 2019'][Math.floor(Math.random() * 4)];
    }
    function remember() {
      return { value: input.value, defaultValue: input.defaultValue, scrollLeft: input.scrollLeft,
        start: input.selectionStart, end: input.selectionEnd, direction: input.selectionDirection, readOnly: input.readOnly };
    }
    function restore() {
      if (!snapshot) return;
      input.value = snapshot.value; input.defaultValue = snapshot.defaultValue;
      if (snapshot.start !== null) {
        try { input.setSelectionRange(snapshot.start, snapshot.end, snapshot.direction); } catch (error) {}
      }
      input.scrollLeft = snapshot.scrollLeft;
    }
    function clearValue() { input.value = ''; input.defaultValue = ''; input.scrollLeft = 0; }
    function stopIntent() {
      held = false; holding = false; pending = false; burstUntil = 0; lastRequest = -Infinity;
      clearTimeout(holdTimer); clearTimeout(nextTimer); holdTimer = nextTimer = 0;
      if (!running) form.classList.remove('search-simulation-burst');
    }
    function cancel() {
      ++generation; stopIntent(); clearTimeout(revealTimer); revealTimer = 0;
      if (active) active.cancel();
      active = null;
      if (running && snapshot) {
        // A cancelled first flight returns the draft; a completed send stays sent.
        if (roundTrip || input.classList.contains('search-simulation-reveal')) restore();
        else clearValue();
        input.readOnly = snapshot.readOnly;
      }
      running = false; snapshot = null;
      input.classList.remove('search-simulation-reveal');
      form.classList.remove('search-simulation-burst');
      form.removeAttribute('aria-busy');
    }
    function setEnabled(value) {
      value = !!value;
      if (value === enabled) return;
      cancel();
      if (value && options.onBeforeEnable) options.onBeforeEnable();
      enabled = value; first = true; laserText = ''; notify();
    }
    function mayContinue() {
      return enabled && !document.hidden && !composing &&
        (document.activeElement === input || document.activeElement === button);
    }
    function finish(token) {
      if (token !== generation) return;
      active = null;
      if (roundTrip) restore(); else clearValue();
      input.readOnly = snapshot.readOnly;
      snapshot = null; running = false; first = false;
      form.removeAttribute('aria-busy');
      var queued = pending;
      pending = false;
      if (mayContinue() && (holding || queued || performance.now() < burstUntil)) {
        // Even synchronous reduced-motion / Canvas fallbacks have a bounded pace.
        nextTimer = setTimeout(function () {
          nextTimer = 0;
          if (mayContinue() && (holding || queued || performance.now() < burstUntil)) start(true);
          else form.classList.remove('search-simulation-burst');
        }, Math.max(24, 184 - (performance.now() - cycleStarted)));
      } else form.classList.remove('search-simulation-burst');
    }
    function start(burst) {
      if (!enabled || running || document.hidden || composing) return;
      clearTimeout(nextTimer); nextTimer = 0;
      burst = !!burst && !first && !!laserText;
      running = true; roundTrip = first; cycleStarted = performance.now();
      var token = ++generation;
      var generated = !burst && !input.value.trim();
      if (generated) { input.value = generatedText(); input.defaultValue = ''; }
      if (!burst) laserText = input.value;
      snapshot = remember();
      form.classList.toggle('search-simulation-burst', burst);
      form.setAttribute('aria-busy', 'true');
      input.readOnly = true;

      function fly() {
        revealTimer = 0;
        if (token !== generation || !enabled) return;
        input.classList.remove('search-simulation-reveal');
        // play owns readOnly during the flight; pass it the user's original state.
        input.readOnly = snapshot.readOnly;
        if (burst) clearValue();
        var completed = false;
        try {
          var control = window.AiraSearchMotion.play({ form: form, input: input, button: button,
            text: laserText, variant: options.getVariant(), roundTrip: roundTrip, burst: burst,
            onFinish: function () { completed = true; finish(token); } });
          if (!completed && token === generation) {
            active = control;
            // The Canvas owns the visible text until the reverse lands exactly home.
            clearValue();
          }
        } catch (error) { if (!completed) finish(token); }
      }
      if (generated && !reduce.matches) {
        input.classList.add('search-simulation-reveal');
        revealTimer = setTimeout(fly, 180);
      } else fly();
    }
    function request() {
      if (!enabled || document.hidden || composing || imeBlocked) return;
      var now = performance.now(), rapid = now - lastRequest < 300;
      lastRequest = now;
      if (running || nextTimer) {
        // One bit of demand replaces an unbounded queue. Never restart the reveal.
        pending = true;
        if (rapid) burstUntil = now + 300;
        return;
      }
      if (rapid) burstUntil = now + 300;
      start(rapid);
    }

    // Capture prevents both native dispatch and the ordinary empty-input shortcut.
    form.addEventListener('submit', function (event) {
      if (!enabled) return;
      event.preventDefault(); event.stopImmediatePropagation();
      request();
    }, true);
    form.addEventListener('keydown', function (event) {
      if (!enabled || (event.key !== 'Enter' && event.keyCode !== 13)) return;
      if (composing || event.isComposing || event.keyCode === 229) {
        imeBlocked = true; clearTimeout(imeTimer);
        imeTimer = setTimeout(function () { imeBlocked = false; }, 0);
        return;
      }
      event.preventDefault();
      if (imeBlocked) return;
      if (!held) {
        held = true;
        holdTimer = setTimeout(function () {
          holdTimer = 0;
          if (!held || !mayContinue()) return;
          holding = true; pending = false;
          if (!running && !nextTimer) start(true);
        }, 280);
      }
      if (event.repeat) {
        holding = true; pending = false;
        if (!running && !nextTimer) start(true);
      } else request();
    });
    window.addEventListener('keyup', function (event) {
      if (event.key !== 'Enter' && event.keyCode !== 13) return;
      var sustained = holding;
      held = false; holding = false; clearTimeout(holdTimer); holdTimer = 0;
      if (sustained) {
        pending = false; burstUntil = 0; lastRequest = -Infinity;
        clearTimeout(nextTimer); nextTimer = 0;
        if (!running) form.classList.remove('search-simulation-burst');
      }
    });
    input.addEventListener('compositionstart', function () { composing = true; stopIntent(); });
    input.addEventListener('compositionend', function () { composing = false; });
    input.addEventListener('input', function () { if (enabled && !running) stopIntent(); });
    form.addEventListener('focusout', function (event) { if (!form.contains(event.relatedTarget)) stopIntent(); });
    window.addEventListener('blur', function () { if (enabled) cancel(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden && enabled) cancel(); });
    // Returning through BFCache is a new homepage visit, so the mode expires too.
    window.addEventListener('pagehide', function () { setEnabled(false); });
    window.addEventListener('pageshow', function (event) { if (event.persisted) setEnabled(false); });
    notify();
    return { isEnabled: function () { return enabled; }, setEnabled: setEnabled };
  }
  window.AiraSearchSimulation = { mount: mount };
})();
