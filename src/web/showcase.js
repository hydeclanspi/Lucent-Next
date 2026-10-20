/* Lucent · 灵感台 — showcase links for the web demo · hydeclanspi
 * Web-only. The device packages never load this file.
 *
 *   ?lueurs=16             summon up to 16 Lueurs (0–49), exactly as tapping the planet would
 *   ?fsd=on | ?fsd=rage    start Drive (FSD) in cruise or boosted mode
 *   ?open=motion           念起，光行 — the search-motion panel
 *   ?open=random           the same panel with Random on (platinum conduits and blue-white lasers)
 *   ?open=lueurs           代号：交互 — the Lueurs panel
 *   ?open=chronicle        场志 — history and the field chronicle
 *   ?open=about | glass | backup
 *
 * Every step goes through the product's own controls (a click, or the Shift+Enter
 * keyboard equivalent of a long press). Nothing is written that a visitor could not
 * have done by hand, and the parameters are removed from the address bar once applied.
 */
(function () {
  "use strict";
  var params = new URLSearchParams(window.location.search);
  var count = parseInt(params.get("lueurs"), 10);
  var fsd = params.get("fsd");
  var target = params.get("open");
  if (!(count >= 0) && !fsd && !target) return;
  try { history.replaceState(history.state, "", window.location.pathname + window.location.hash); } catch (_) {}

  function $(id) { return document.getElementById(id); }
  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function until(test, timeout) {
    var end = Date.now() + (timeout || 6000);
    return new Promise(function (resolve) {
      (function poll() {
        var ok = false;
        try { ok = !!test(); } catch (_) {}
        if (ok || Date.now() > end) resolve(ok); else setTimeout(poll, 60);
      })();
    });
  }
  function lueurs() { return document.querySelectorAll(".interaction-item").length; }
  function pressAndHold(node) {
    // Shift+Enter is the product's keyboard equivalent of a long press.
    if (node) node.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true, cancelable: true }));
  }
  function sheetOpen() { var root = $("sheetRoot"); return root && !root.hidden; }

  async function summon(n) {
    var planet = $("btnInteraction");
    n = Math.max(0, Math.min(49, n));
    if (!planet || lueurs() >= n) return;
    for (var guard = 0; lueurs() < n && guard < 160; guard++) {
      var before = lueurs();
      planet.click();
      await until(function () { return lueurs() > before; }, 450);
    }
  }

  async function drive(mode) {
    var button = $("btnAutoDrive"), field = $("interactionField");
    if (!button || !field) return;
    // The field becomes visible once every Lueur has a seat in the drawn region.
    if (!(await until(function () { return !field.hidden && lueurs() > 0; }, 8000))) return;
    await wait(400);
    if (button.getAttribute("aria-pressed") !== "true") button.click();
    if (mode === "rage") {
      await until(function () { return button.getAttribute("aria-pressed") === "true"; }, 1500);
      if (!button.classList.contains("is-rage")) button.click();
    }
  }

  async function reveal(name) {
    if (name === "motion" || name === "random") {
      var entry = $("btnSearchMotion");
      if (!entry) return;
      entry.click();
      if (name === "random" && await until(function () { return document.querySelector(".sm-random"); }, 3000)) {
        var random = document.querySelector(".sm-random");
        if (random.getAttribute("aria-pressed") !== "true") random.click();
      }
    } else if (name === "lueurs" || name === "chronicle") {
      pressAndHold($("btnInteraction"));
      if (name === "chronicle" && await until(function () { return $("btnInteractionStats"); }, 3000)) $("btnInteractionStats").click();
    } else if (name === "about") {
      pressAndHold($("btnSettings"));
    } else if (name === "backup") {
      pressAndHold($("btnScan"));
    } else if (name === "glass") {
      var wallpaper = $("btnWallpaper");
      if (wallpaper) wallpaper.click();
    }
  }

  async function run() {
    // Wait for Lucent to finish its first render: engines, shortcuts, and stored preferences.
    await until(function () { return document.querySelectorAll("#engineChips .chip").length > 0; }, 10000);
    await wait(700);
    if (count >= 0) await summon(count);
    if (fsd === "on" || fsd === "1" || fsd === "rage") await drive(fsd === "rage" ? "rage" : "on");
    if (target && !sheetOpen()) await reveal(target);
  }

  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
})();
