/* v4.7.3: decoration-only controls and event-driven material feedback.
   The caller owns persistence and classic/warm selection. No permanent animation. */
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
  var keys = ["transparency", "blur", "warmth", "edge", "color", "touch"];
  var settings = { home: normalize(), sheets: normalize() };

  function normalize(source) {
    var result = {};
    keys.forEach(function (key) {
      var value = source && source[key];
      result[key] = typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? value : 50;
    });
    return result;
  }

  function snapshot() {
    return { home: Object.assign({}, settings.home), sheets: Object.assign({}, settings.sheets) };
  }

  function tinted(rgb, warmth) {
    if (warmth === 50) return rgb.join(", ");
    var neutral = Math.round((rgb[0] + rgb[1] + rgb[2]) / 3);
    var amount = Math.abs(warmth - 50) / 50;
    var end = warmth < 50 ? [neutral, neutral, neutral] : [Math.min(255, rgb[0] + 2), Math.max(0, rgb[1] - 1), Math.max(0, rgb[2] - 6)];
    return rgb.map(function (value, i) { return Math.round(value + (end[i] - value) * amount); }).join(", ");
  }

  function renderSettings() {
    var dark = root.getAttribute("data-theme") === "dark";
    var lightWallpaper = root.dataset.betaWallpaper === "light";
    [card, sheet].forEach(function (node, index) {
      if (!node) return;
      var values = settings[index ? "sheets" : "home"];
      function set(name, value) { node.style.setProperty("--beta-" + name, String(value)); }
      set("alpha", (1.55 - values.transparency * .011).toFixed(3));
      set("blur", ((index ? 26 : 18) * (.4 + values.blur * .012)).toFixed(3) + "px");
      set("edge", (.2 + values.edge * .016).toFixed(3));
      set("touch", (values.touch / 50).toFixed(3));
      var baseSaturation = dark ? (index ? 122 : 124) : (index ? 124 : 132);
      set("saturation", (100 + (baseSaturation - 100) * values.color / 50).toFixed(3) + "%");
      var palette = dark ? (index ? [[26,26,28], [26,26,28], [64,61,60], [26,26,29], [46,44,47]] : [[28,28,29], [28,28,29], [65,63,62], [27,27,29], [48,47,49]]) :
        (index ? [[253,251,248], [249,247,243], [255,254,252], [247,244,239], [243,241,237]] : [[248,247,244], [248,247,244], [255,255,255], [246,244,240], [239,237,233]]);
      ["face", "face-end", "tone-a", "tone-b", "tone-c"].forEach(function (name, i) { set(name, tinted(palette[i], values.warmth)); });
      set("warm", tinted(lightWallpaper ? [250,232,213] : [250,231,209], values.warmth));
      set("cool", tinted(lightWallpaper ? [222,221,226] : [220,222,224], values.warmth));
    });
  }

  window.AiraGlassMaterial = {
    apply: function (next) {
      next = next || {};
      settings = { home: normalize(next.home), sheets: normalize(next.sheets) };
      renderSettings();
      hideAll();
      return snapshot();
    },
    get settings() { return snapshot(); }
  };

  function enabled(controller) {
    return root.getAttribute(controller.node === card ? "data-home-glass" : "data-sheet-glass") === "warm";
  }

  function active(controller) {
    return !disposed && enabled(controller) && settings[controller.node === card ? "home" : "sheets"].touch > 0 && !document.hidden && !reduce.matches &&
      (controller.node === card ? !sheetRoot || sheetRoot.hidden : sheetRoot && !sheetRoot.hidden);
  }

  function syncWallpaper() {
    root.dataset.betaWallpaper = wallpaper && wallpaper.classList.contains("yang") ? "light" : "dark";
    renderSettings();
  }

  function clear(controller) {
    controller.dirty = false;
    controller.pointer = null;
    controller.rect = null;
    if (controller.point) controller.point.classList.remove("is-lit");
    if (controller.node === sheet) controller.node.style.setProperty("--beta-touch-lit", "0");
  }

  function hideAll() {
    controllers.forEach(clear);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function ensure(controller) {
    if (controller.node === sheet) return;
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
      if (!controller.dirty || (!controller.point && controller.node !== sheet)) return;
      controller.dirty = false;
      if (!active(controller)) { clear(controller); return; }
      if (controller.node === sheet) {
        // A background has no layout box and cannot enlarge the scrollable area.
        controller.node.style.setProperty("--beta-touch-x", controller.x.toFixed(1) + "px");
        controller.node.style.setProperty("--beta-touch-y", controller.y.toFixed(1) + "px");
        controller.node.style.setProperty("--beta-touch-lit", "1");
      } else {
        controller.point.style.transform = "translate3d(" + controller.x.toFixed(1) + "px," + controller.y.toFixed(1) + "px,0)";
        controller.point.classList.add("is-lit");
      }
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
    controller.x = controller.node === sheet ? x : x - 182;
    controller.y = controller.node === sheet ? y : y - 182;
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
    renderSettings();
    hideAll();
    controllers.forEach(function (controller) {
      // openSheet replaces children; returning from a child panel can restore an older skin.
      var skins = controller.node.querySelectorAll(":scope > .beta-glass-sheen");
      controller.point = null;
      skins.forEach(function (skin) {
        var point = skin.querySelector(".beta-glass-point");
        if (point) point.classList.remove("is-lit");
        if (!enabled(controller) || controller.node === sheet) skin.remove();
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
