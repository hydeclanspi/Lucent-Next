/* Optional material feedback. No Aira bridge calls, persistence or physics. */
(function () {
  "use strict";
  var root = document.documentElement;
  var card = document.querySelector(".page > .card");
  var sheet = document.getElementById("sheet");
  var sheetRoot = document.getElementById("sheetRoot");
  var wallpaper = document.getElementById("btnWallpaper");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var hover = window.matchMedia("(hover: hover) and (pointer: fine)");
  var controllers = [];
  var observers = [];
  var frame = 0;
  var disposed = false;

  function active(controller) {
    return !disposed && !document.hidden && !reduce.matches &&
      (controller.node === card ? sheetRoot.hidden :
        !sheetRoot.hidden && sheet.classList.contains("interaction-sheet"));
  }

  function syncWallpaper() {
    root.dataset.betaWallpaper = wallpaper && wallpaper.classList.contains("yang") ? "light" : "dark";
  }

  function clear(controller) {
    controller.dirty = false;
    controller.pointer = null;
    controller.rect = null;
    if (controller.point) controller.point.classList.remove("is-lit");
  }

  function hideAll() {
    controllers.forEach(clear);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function ensure(controller) {
    if (controller.point && controller.point.parentNode.parentNode === controller.node) return;
    var skin = controller.node.querySelector(":scope > .beta-glass-sheen");
    if (!skin) {
      skin = document.createElement("span");
      skin.className = "beta-glass-sheen";
      skin.setAttribute("aria-hidden", "true");
      var point = document.createElement("span");
      point.className = "beta-glass-point";
      skin.appendChild(point);
      controller.node.appendChild(skin);
    }
    controller.point = skin.firstElementChild;
  }

  function flush() {
    frame = 0;
    controllers.forEach(function (controller) {
      if (!controller.dirty || !controller.point) return;
      controller.dirty = false;
      if (!active(controller)) { clear(controller); return; }
      controller.point.style.transform = "translate3d(" + controller.x.toFixed(1) + "px," + controller.y.toFixed(1) + "px,0)";
      controller.point.classList.add("is-lit");
    });
  }

  function track(controller, event) {
    if (!active(controller)) return;
    // The history label and journal sit outside the home card's visible surface.
    if (controller.node === card && event.target.closest("#btnHistory, #dailyLog")) { clear(controller); return; }
    if (event.pointerType !== "mouse" && controller.pointer !== event.pointerId) return;
    if (event.pointerType === "mouse" && !hover.matches && controller.pointer === null) return;
    if (!controller.rect) controller.rect = controller.node.getBoundingClientRect();
    var rect = controller.rect;
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) { clear(controller); return; }
    ensure(controller);
    controller.x = x - 182;
    controller.y = y + controller.node.scrollTop - 182;
    controller.dirty = true;
    if (!frame) frame = requestAnimationFrame(flush);
  }

  function bind(node) {
    if (!node) return;
    var controller = { node: node, point: null, rect: null, pointer: null, dirty: false, listeners: [] };
    controllers.push(controller);
    function on(name, fn) {
      node.addEventListener(name, fn, { passive: true });
      controller.listeners.push([name, fn]);
    }
    on("pointerenter", function (event) { controller.rect = null; track(controller, event); });
    on("pointermove", function (event) { track(controller, event); });
    on("pointerdown", function (event) { controller.pointer = event.pointerId; controller.rect = null; track(controller, event); });
    on("pointerleave", function () { clear(controller); });
    on("pointercancel", function () { clear(controller); });
    on("scroll", function () { clear(controller); });
  }

  function released() { hideAll(); }
  function syncSheet() {
    hideAll();
    // Original openSheet replaces children; restored parent panels may reuse them.
    if (!sheet.classList.contains("interaction-sheet")) return;
    var controller = controllers[1];
    if (controller && controller.point && !sheet.contains(controller.point)) controller.point = null;
  }
  function visibility() { if (document.hidden) hideAll(); }
  function pause() { hideAll(); }

  bind(card);
  bind(sheet);
  syncWallpaper();
  if (wallpaper) {
    var wallpaperObserver = new MutationObserver(syncWallpaper);
    wallpaperObserver.observe(wallpaper, { attributes: true, attributeFilter: ["class"] });
    observers.push(wallpaperObserver);
  }
  if (sheet && sheetRoot) {
    var sheetObserver = new MutationObserver(syncSheet);
    sheetObserver.observe(sheet, { attributes: true, attributeFilter: ["class"] });
    sheetObserver.observe(sheetRoot, { attributes: true, attributeFilter: ["hidden"] });
    observers.push(sheetObserver);
  }
  document.addEventListener("pointerup", released, { passive: true });
  document.addEventListener("pointercancel", released, { passive: true });
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("blur", pause);
  window.addEventListener("resize", pause, { passive: true });
  window.addEventListener("scroll", pause, { passive: true });
  if (reduce.addEventListener) reduce.addEventListener("change", pause);

  window.addEventListener("pagehide", function (event) {
    hideAll();
    if (event.persisted) return;
    disposed = true;
    observers.forEach(function (observer) { observer.disconnect(); });
    controllers.forEach(function (controller) {
      controller.listeners.forEach(function (pair) { controller.node.removeEventListener(pair[0], pair[1]); });
    });
    document.removeEventListener("pointerup", released);
    document.removeEventListener("pointercancel", released);
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("blur", pause);
    window.removeEventListener("resize", pause);
    window.removeEventListener("scroll", pause);
    if (reduce.removeEventListener) reduce.removeEventListener("change", pause);
  });
})();
