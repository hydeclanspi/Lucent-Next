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

  function enabled(controller) {
    return root.getAttribute(controller.node === card ? "data-home-glass" : "data-sheet-glass") === "warm";
  }

  function active(controller) {
    return !disposed && enabled(controller) && !document.hidden && !reduce.matches &&
      (controller.node === card ? !sheetRoot || sheetRoot.hidden : sheetRoot && !sheetRoot.hidden);
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
    if (controller.point && controller.point.parentNode && controller.point.parentNode.parentNode === controller.node) return;
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
  function syncSurfaces() {
    hideAll();
    controllers.forEach(function (controller) {
      // openSheet replaces children; returning from a child panel can restore an older skin.
      var skins = controller.node.querySelectorAll(":scope > .beta-glass-sheen");
      controller.point = null;
      skins.forEach(function (skin) {
        var point = skin.querySelector(".beta-glass-point");
        if (point) point.classList.remove("is-lit");
        if (!enabled(controller)) skin.remove();
        else if (point && !controller.point) controller.point = point;
        else skin.remove();
      });
    });
  }
  function syncSheet(records) {
    var changed = records.some(function (record) {
      if (record.type === "attributes") return true;
      // Adding our own skin must not cancel the first pointer frame.
      return Array.from(record.addedNodes).concat(Array.from(record.removedNodes)).some(function (node) {
        return node.nodeType !== 1 || !node.classList.contains("beta-glass-sheen");
      });
    });
    if (changed) syncSurfaces();
  }

  function visibility() { if (document.hidden) hideAll(); }
  function pause() { hideAll(); }

  bind(card);
  bind(sheet);
  syncWallpaper();
  syncSurfaces();
  var materialObserver = new MutationObserver(syncSurfaces);
  materialObserver.observe(root, { attributes: true, attributeFilter: ["data-home-glass", "data-sheet-glass", "data-theme", "data-beta-wallpaper"] });
  observers.push(materialObserver);
  if (wallpaper) {
    var wallpaperObserver = new MutationObserver(syncWallpaper);
    wallpaperObserver.observe(wallpaper, { attributes: true, attributeFilter: ["class"] });
    observers.push(wallpaperObserver);
  }
  if (sheet && sheetRoot) {
    var sheetObserver = new MutationObserver(syncSheet);
    sheetObserver.observe(sheet, { attributes: true, attributeFilter: ["class"], childList: true });
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
