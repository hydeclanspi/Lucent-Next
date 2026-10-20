/* Lucent · 灵感台 — immersive full screen for the web edition · hydeclanspi
 *
 * On the tablet Lucent fills the whole screen. A desktop browser wraps it in tabs, an
 * address bar and a dock, so on large screens the web edition goes full screen on the
 * first real click or tap anywhere. (No browser lets a page do that before a gesture.)
 *
 *   - The click still does its own job first; full screen follows it.
 *   - Esc leaves; the next click (anywhere but the prompt) goes full screen again. A page cannot know
 *     whether it was just opened or reopened, so every click out of full screen asks for it.
 *   - F toggles full screen at any time (not while typing).
 *   - Installed as an app, Lucent already opens full screen, so nothing is armed.
 *   - Out of full screen, a pill says full screen is best and offers a button for it (× hides it for the visit).
 *   - In full screen, a line in the lower left says this is the web demo; the flagship is the tablet's touch.
 *   - <html data-immersive="full"> while in full screen (or installed): Aira's toolbar is drawn only then.
 *
 * Web-only. The native Aira package never loads this file.
 */
(function () {
  "use strict";
  var root = document.documentElement;
  function installed() {
    return !!window.matchMedia && ["fullscreen", "standalone", "minimal-ui"].some(function (mode) {
      return window.matchMedia("(display-mode: " + mode + ")").matches;
    });
  }
  if (installed()) root.dataset.immersive = "full";
  var request = root.requestFullscreen || root.webkitRequestFullscreen;
  var exit = document.exitFullscreen || document.webkitExitFullscreen;
  var enabled = document.fullscreenEnabled || document.webkitFullscreenEnabled;
  if (!request || !exit || !enabled || window.self !== window.top) return;

  // OFF is for automated captures and tests only: no full screen on click, no prompt, no note.
  var OFF = "lucent:immersive:off";
  var HIDDEN = "lucent:immersive:prompt-hidden";
  var LARGE = 900;
  var leaving = false, seen = false, hint = null, note = null, fading = null, fadeTimer = 0; // seen: in full screen at some point, not yet seen leaving
  var declinedNow = (function () { try { return sessionStorage.getItem(OFF) === "1"; } catch (_) { return false; } })();

  function active() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  function declined() { return declinedNow; } // only the automation opt-out
  function hidden() { try { return sessionStorage.getItem(HIDDEN) === "1"; } catch (_) { return false; } }
  function decline() {} // leaving is never remembered: the next click asks again
  function armed() { return window.innerWidth >= LARGE && !installed() && !declined() && !active(); }
  function typing(target) {
    return !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
  }

  function settle(result) { if (result && typeof result.catch === "function") result.catch(function () {}); }
  function enter() {
    if (active()) return;
    try {
      var result = request.call(root, { navigationUI: "hide" });
      if (result && typeof result.then === "function") result.then(function () { seen = true; }, function () {});
      else seen = true;
    } catch (_) {}
  }
  function leave() {
    if (!active()) return;
    leaving = true;
    try { settle(exit.call(document)); } catch (_) { leaving = false; }
  }
  // Full screen ended. Leaving that we did not ask for (Esc, the browser's own control) is a choice to respect.
  function left() {
    if (!leaving) decline();
    leaving = false; seen = false;
  }

  // The prompt stays while the page is out of full screen on a large screen; the note shows while it is in.
  var ICON = {
    expand: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/></svg>',
    close: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M2 2l8 8M10 2 2 10"/></svg>'
  };
  function buildHint() {
    var node = document.createElement("div");
    node.className = "lx-immersive-hint";
    node.setAttribute("role", "region");
    node.setAttribute("aria-label", "全屏提示");
    node.innerHTML = '<span class="lx-immersive-main">全屏效果最佳</span>' +
      '<button type="button" class="lx-immersive-go">' + ICON.expand + '进入全屏</button>' +
      '<span class="lx-immersive-keys"><kbd>F</kbd> 切换 · <kbd>Esc</kbd> 退出</span>' +
      '<button type="button" class="lx-immersive-close" aria-label="本次访问不再提示">' + ICON.close + '</button>';
    node.querySelector(".lx-immersive-go").addEventListener("click", function () { enter(); });
    node.querySelector(".lx-immersive-close").addEventListener("click", function () {
      try { sessionStorage.setItem(HIDDEN, "1"); } catch (_) {}
      sync();
    });
    return node;
  }
  function sync() {
    if (declinedNow) return; // automation: no prompt, no note, and data-immersive is the capture's to set
    var wide = window.innerWidth >= LARGE, full = !!active() || installed();
    if (full) root.dataset.immersive = "full"; else delete root.dataset.immersive;
    var showHint = wide && !full && !hidden();
    if (showHint && !hint) {
      // A prompt still fading out comes back as it is: there is never more than one.
      if (fading) { clearTimeout(fadeTimer); hint = fading; fading = null; }
      else { hint = buildHint(); document.body.appendChild(hint); }
      requestAnimationFrame(function () { if (hint) hint.classList.add("is-visible"); });
    } else if (!showHint && hint) {
      fading = hint; hint = null;
      fading.classList.remove("is-visible");
      fadeTimer = setTimeout(function () { if (fading) { fading.remove(); fading = null; } }, 420);
    }
    if (!note) {
      note = document.createElement("p");
      note.className = "lx-demo-note";
      note.textContent = "仅为 Web 端 demo 模拟，旗舰最佳效果为 Pad 端的触屏体验";
      document.body.appendChild(note);
    }
    note.classList.toggle("is-visible", wide && full);
  }

  // Capture phase, so a control that stops propagation still counts as the first gesture.
  // Only trusted events: the showcase links press buttons programmatically.
  window.addEventListener("click", function (event) {
    if (!event.isTrusted) return;
    if (event.target && event.target.closest && event.target.closest(".lx-immersive-hint")) return; // its own buttons decide
    if (seen && !active()) { left(); return; } // the exit event may not have arrived yet
    if (armed()) enter();
  }, true);

  window.addEventListener("keydown", function (event) {
    if (!event.isTrusted || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    if ((event.key !== "f" && event.key !== "F") || typing(event.target)) return;
    if (document.querySelector(".ab-overlay, .edit-root:not([hidden])")) return;
    event.preventDefault();
    if (active()) leave(); else enter();
  });

  function changed() {
    if (active()) seen = true;
    else if (seen) left();
    sync();
  }
  document.addEventListener("fullscreenchange", changed);
  document.addEventListener("webkitfullscreenchange", changed);

  window.addEventListener("resize", sync);
  if (document.readyState === "complete") setTimeout(sync, 900);
  else window.addEventListener("load", function () { setTimeout(sync, 900); }, { once: true });
})();
