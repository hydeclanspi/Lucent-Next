/* Lucent · 灵感台 — immersive full screen for the web edition · hydeclanspi
 *
 * On the tablet the base fills the whole screen. A desktop browser wraps it in tabs, an
 * address bar and a dock, so on large screens the web edition goes full screen on the
 * first real click or tap anywhere. (No browser lets a page do that before a gesture.)
 *
 *   - The click still does its own job first; full screen follows it.
 *   - Esc leaves. Once you leave, it does not come back by itself during this visit.
 *   - F toggles full screen at any time (not while typing).
 *   - Installed as an app, Lucent already opens full screen, so nothing is armed.
 *
 * Web-only. The native Aira package never loads this file.
 */
(function () {
  "use strict";
  var root = document.documentElement;
  var request = root.requestFullscreen || root.webkitRequestFullscreen;
  var exit = document.exitFullscreen || document.webkitExitFullscreen;
  var enabled = document.fullscreenEnabled || document.webkitFullscreenEnabled;
  if (!request || !exit || !enabled || window.self !== window.top) return;

  var DECLINED = "lucent:immersive:declined";
  var LARGE = 900;
  var leaving = false, seen = false, hint = null, hintTimer = 0; // seen: in full screen at some point, not yet seen leaving

  function active() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  function installed() {
    return !!window.matchMedia && ["fullscreen", "standalone", "minimal-ui"].some(function (mode) {
      return window.matchMedia("(display-mode: " + mode + ")").matches;
    });
  }
  function declined() { try { return sessionStorage.getItem(DECLINED) === "1"; } catch (_) { return false; } }
  function decline() { try { sessionStorage.setItem(DECLINED, "1"); } catch (_) {} }
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

  function dismissHint() {
    clearTimeout(hintTimer);
    if (!hint) return;
    var node = hint;
    hint = null;
    node.classList.remove("is-visible");
    setTimeout(function () { node.remove(); }, 420);
  }
  function showHint() {
    if (!armed() || hint) return;
    hint = document.createElement("div");
    hint.className = "lx-immersive-hint";
    hint.setAttribute("role", "status");
    hint.innerHTML = '<span class="lx-immersive-main">轻点任意处，进入全屏</span><span class="lx-immersive-keys"><kbd>F</kbd> 切换 · <kbd>Esc</kbd> 退出</span>';
    document.body.appendChild(hint);
    requestAnimationFrame(function () { if (hint) hint.classList.add("is-visible"); });
    hintTimer = setTimeout(dismissHint, 6500);
  }

  // Capture phase, so a control that stops propagation still counts as the first gesture.
  // Only trusted events: the showcase links press buttons programmatically.
  window.addEventListener("click", function (event) {
    if (!event.isTrusted) return;
    dismissHint();
    if (seen && !active()) { left(); return; } // the exit event may not have arrived yet
    if (armed()) enter();
  }, true);

  window.addEventListener("keydown", function (event) {
    if (!event.isTrusted || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    if ((event.key !== "f" && event.key !== "F") || typing(event.target)) return;
    if (document.querySelector(".ab-overlay, .edit-root:not([hidden])")) return;
    event.preventDefault();
    dismissHint();
    if (active()) leave(); else enter();
  });

  function changed() {
    if (active()) { seen = true; dismissHint(); return; }
    if (seen) left();
  }
  document.addEventListener("fullscreenchange", changed);
  document.addEventListener("webkitfullscreenchange", changed);

  if (document.readyState === "complete") setTimeout(showHint, 900);
  else window.addEventListener("load", function () { setTimeout(showHint, 900); }, { once: true });
})();
