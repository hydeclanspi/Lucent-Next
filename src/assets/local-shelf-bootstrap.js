(function () {
  'use strict';

  var loaded = false;
  var loading = false;
  var attempts = 0;

  function openLoaded() {
    if (window.AiraLocalShelf && typeof window.AiraLocalShelf.open === 'function') {
      window.AiraLocalShelf.open();
      return;
    }
    attempts += 1;
    if (attempts < 20) {
      window.setTimeout(openLoaded, 40);
    }
  }

  function enterImmersive() {
    if (document.fullscreenElement || typeof document.documentElement.requestFullscreen !== "function") return;
    try {
      var task = document.documentElement.requestFullscreen({ navigationUI: "hide" });
      if (task && typeof task.catch === "function") task.catch(function () {});
    } catch (error) {}
  }

  function load(button) {
    if (loading || loaded) return;
    loading = true;
    button.setAttribute('aria-busy', 'true');
    var script = document.createElement('script');
    script.src = './assets/local-shelf.js';
    script.async = true;
    script.onload = function () {
      loaded = true;
      loading = false;
      button.setAttribute('aria-busy', 'false');
      openLoaded();
    };
    script.onerror = function () {
      loading = false;
      button.setAttribute('aria-busy', 'false');
      button.title = '本地文件架加载失败';
    };
    document.body.appendChild(script);
  }

  document.addEventListener('click', function (event) {
    var button = event.target && event.target.closest ? event.target.closest('#btnShelf') : null;
    if (!button) return;
    enterImmersive();
    if (loaded) {
      openLoaded();
      return;
    }
    event.preventDefault();
    load(button);
  }, true);
})();
