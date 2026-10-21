(function () {
  'use strict';

  var button = document.getElementById('btnShelf');
  if (!button) return;

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

  function load() {
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
      button.title = '本地书架加载失败';
    };
    document.body.appendChild(script);
  }

  button.addEventListener('click', function (event) {
    if (loaded) {
      openLoaded();
      return;
    }
    event.preventDefault();
    load();
  });
})();
