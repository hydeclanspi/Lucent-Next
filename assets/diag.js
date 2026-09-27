/*
 * 运行日志（黑匣子）
 * 只在页面里做观察，不改主页行为：记录 JS 错误、Aira 事件、握姿回调频率、
 * 网格/徽章重绘次数、堆内存与节点数，每 5 秒落一次盘。
 * 若上一次会话没有正常收尾（没触发 pagehide），下次打开会在左上角回放最后几十条。
 */
(function () {
  var KEY = "diag";
  var MAX = 90;
  var HEARTBEAT = 5000;
  var SESSION = Date.now();
  var entries = [];
  var api = null;
  var clean = false;
  var counters = { grip: 0, grid: 0, badge: 0, ready: 0 };
  var overlay = null;
  var flushTimer = null;
  var wrapped = false;

  function storeGet() {
    if (api && api.storage && typeof api.storage.get === "function") {
      return api.storage.get(KEY, null);
    }
    try {
      var raw = window.localStorage.getItem("aira-diag");
      return Promise.resolve(raw ? JSON.parse(raw) : null);
    } catch (error) {
      return Promise.resolve(null);
    }
  }

  function storeSet(value) {
    if (api && api.storage && typeof api.storage.set === "function") {
      try { return api.storage.set(KEY, value); } catch (error) {}
    }
    try {
      window.localStorage.setItem("aira-diag", JSON.stringify(value));
    } catch (error) {}
    return null;
  }

  function heap() {
    try {
      return window.performance && performance.memory
        ? Math.round(performance.memory.usedJSHeapSize / 1048576)
        : -1;
    } catch (error) {
      return -1;
    }
  }

  function nodes() {
    try { return document.getElementsByTagName("*").length; } catch (error) { return -1; }
  }

  function push(kind, text) {
    entries.push([Date.now() - SESSION, kind, String(text).slice(0, 240)]);
    if (entries.length > MAX) entries.splice(0, entries.length - MAX);
    schedule();
  }

  function payload(flag) {
    return { ver: "2.4.1", session: SESSION, clean: !!flag, entries: entries };
  }

  function schedule() {
    if (flushTimer) return;
    flushTimer = setTimeout(function () {
      flushTimer = null;
      storeSet(payload(false));
    }, 1200);
  }

  function line(entry) {
    return (entry[0] / 1000).toFixed(1) + "s " + entry[1] + " " + entry[2];
  }

  function showOverlay(title, list) {
    if (overlay) overlay.remove();
    overlay = document.createElement("div");
    overlay.setAttribute("data-diag", "1");
    overlay.style.cssText = [
      "position:fixed", "left:10px", "top:10px", "z-index:2147483000",
      "max-width:min(560px,92vw)", "max-height:58vh", "overflow:auto",
      "padding:12px 14px", "border-radius:14px",
      "background:rgba(10,14,20,.9)", "color:#d8f2e4",
      "font:11px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace",
      "white-space:pre-wrap", "word-break:break-all",
      "box-shadow:0 18px 40px rgba(0,0,0,.45)", "backdrop-filter:blur(6px)"
    ].join(";");

    var head = document.createElement("div");
    head.textContent = title;
    head.style.cssText = "color:#9fe8c6;font-weight:700;margin-bottom:8px;letter-spacing:.3px";
    overlay.appendChild(head);

    var body = document.createElement("div");
    body.textContent = list.map(line).join("\n");
    overlay.appendChild(body);

    var bar = document.createElement("div");
    bar.style.cssText = "display:flex;gap:8px;margin-top:10px";
    [["知道了", function () { overlay.remove(); overlay = null; }],
     ["清掉旧日志", function () {
       storeSet(payload(true));
       if (overlay) { overlay.remove(); overlay = null; }
     }]].forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = item[0];
      button.style.cssText = "flex:1;min-height:34px;border-radius:10px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.1);color:#eaf7f1;font:12px inherit";
      button.addEventListener("click", item[1]);
      bar.appendChild(button);
    });
    overlay.appendChild(bar);
    document.body.appendChild(overlay);
  }

  function watchDom() {
    var grid = document.getElementById("shortcutGrid");
    var badges = document.getElementById("badges");
    if (!grid && !badges) return;
    var observer = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (!m.addedNodes.length) continue;
        if (m.target === grid) counters.grid++;
        else if (m.target === badges) counters.badge++;
      }
    });
    if (grid) observer.observe(grid, { childList: true });
    if (badges) observer.observe(badges, { childList: true });
  }

  function wrapMotion() {
    if (wrapped || !api || !api.motion || typeof api.motion.on !== "function") return;
    var original = api.motion.on;
    try {
      api.motion.on = function (name, callback) {
        return original.call(this, name, function (status) {
          counters.grip++;
          return callback(status);
        });
      };
      wrapped = true;
      push("bridge", "已接入握姿回调计数");
    } catch (error) {}
  }

  function poll() {
    api = window.AiraHome || api;
    wrapMotion();
    if (!document.querySelector("[data-diag-watch]")) {
      var marker = document.getElementById("shortcutGrid");
      if (marker) {
        marker.setAttribute("data-diag-watch", "1");
        watchDom();
      }
    }
  }

  function attach() {
    api = window.AiraHome || api;
    wrapMotion();
  }

  attach();

  // aira-home-ready 的监听顺序＝注册顺序：本文件先加载，所以会在主页 init 之前抢到，先把握姿回调包好
  window.addEventListener("aira-home-ready", attach);

  window.addEventListener("error", function (event) {
    push("err", (event.message || "?") + " @" + String(event.filename || "").split("/").pop() + ":" + event.lineno);
    if (!overlay) showOverlay("检测到 JS 错误（本会话）", entries.slice(-24));
  });

  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    var text = reason && (reason.code || reason.message) ? (reason.code || reason.message) : String(reason);
    push("rej", text);
    if (!overlay) showOverlay("检测到未处理的 Promise 拒绝（本会话）", entries.slice(-24));
  });

  document.addEventListener("visibilitychange", function () {
    push("vis", document.visibilityState);
  });

  ["shortcuts-changed", "theme-changed", "privacy-mode-changed",
   "environment-changed", "search-engines-changed", "back-requested"].forEach(function (name) {
    window.addEventListener("aira-home-" + name, function () { push("evt", name); });
  });

  window.addEventListener("aira-home-ready", function (event) {
    var detail = event && event.detail ? event.detail : {};
    counters.ready++;
    if (counters.ready === 1) push("ready", "apiVersion=" + (detail.apiVersion || "?"));
  });

  window.addEventListener("pagehide", function () {
    clean = true;
    storeSet(payload(true));
  });

  setTimeout(function () {
    poll();
    storeGet().then(function (prev) {
      if (!prev || !prev.entries || !prev.entries.length) return;
      if (prev.clean) {
        push("prev", "上次会话正常收尾");
        return;
      }
      push("prev", "上次会话没有正常收尾，回放如下");
      showOverlay("上次会话异常结束 · 最后 " + Math.min(prev.entries.length, 40) + " 条", prev.entries.slice(-40));
    }).catch(function () {}).then(function () {
      push("boot", "heap=" + heap() + "MB nodes=" + nodes());
    });
  }, 400);

  setTimeout(poll, 1200);
  setTimeout(poll, 2500);
  setInterval(poll, 4000);

  setInterval(function () {
    push("hb", "heap=" + heap() + "MB nodes=" + nodes() +
      " ready+" + counters.ready + " grip+" + counters.grip +
      " grid+" + counters.grid + " badge+" + counters.badge);
    counters.ready = 0;
    counters.grip = 0;
    counters.grid = 0;
    counters.badge = 0;
  }, HEARTBEAT);
})();
