(function () {
  "use strict";

  var root = document.documentElement;
  var api = function () { return window.AiraHome || null; };

  var DEFAULT_PROFILE = {
    name: "无名氏",
    meta: "18 · 上海",
    sign: "把今天过成想要的样子。",
    tags: ["学生", "技术宅", "乐观", "完美主义"]
  };

  var DEMO_ENGINES = [
    { id: "baidu", name: "百度", kind: "built_in", icon: "" },
    { id: "bing", name: "Bing", kind: "built_in", icon: "" },
    { id: "google", name: "Google", kind: "built_in", icon: "" },
    { id: "doubao", name: "豆包", kind: "custom", icon: "" }
  ];

  // 仅浏览器预览使用的占位数据：不带真实链接，包内不出现任何外部地址
  var DEMO_SHORTCUTS = [
    { id: "demo-bilibili", kind: "web", iconId: "", title: "哔哩哔哩", url: "", position: 0, icon: "", iconRendering: "" },
    { id: "demo-zhihu", kind: "web", iconId: "", title: "知乎", url: "", position: 1, icon: "", iconRendering: "" },
    { id: "demo-douban", kind: "web", iconId: "", title: "豆瓣", url: "", position: 2, icon: "", iconRendering: "" },
    { id: "demo-github", kind: "web", iconId: "", title: "GitHub", url: "", position: 3, icon: "", iconRendering: "" },
    { id: "demo-youtube", kind: "web", iconId: "", title: "YouTube", url: "", position: 4, icon: "", iconRendering: "" },
    { id: "demo-weibo", kind: "web", iconId: "", title: "微博", url: "", position: 5, icon: "", iconRendering: "" }
  ];

  var ENTRIES = [
    { key: "bookmarks", label: "书签", hint: "收藏的网页", method: "openBookmarks", entry: "bookmarks", icon: "M7 4h10v16l-5-3.6L7 20z" },
    { key: "downloads", label: "下载管理", hint: "下载与文件", method: "openDownloads", entry: "downloads", icon: "M12 4v10M8 10.5l4 4 4-4M5 19h14" },
    { key: "savedPages", label: "我的网页", hint: "已保存的页面", method: "openSavedPages", entry: "savedPages", icon: "M6 3.5h7.5L18 8v12.5H6zM13.5 3.5V8H18" },
    { key: "tabs", label: "标签后台", hint: "打开的标签页", method: "openTabs", entry: "tabs", icon: "M3.5 7h13v12.5h-13zM8 4.5h9.5A2.5 2.5 0 0 1 20 7v9.5" },
    { key: "searchSettings", label: "搜索设置", hint: "引擎与智能回退", method: "openSearchSettings", entry: "searchSettings", icon: "M11 4.6a6.4 6.4 0 1 0 0 12.8 6.4 6.4 0 0 0 0-12.8zM15.8 15.8 20.5 20.5" },
    { key: "userScripts", label: "用户脚本", hint: "自定义网页脚本", method: "openUserScripts", entry: "userScripts", icon: "M9 8l-4 4 4 4M15 8l4 4-4 4" },
    { key: "settings", label: "设置", hint: "Aira 设置中心", method: "openSettings", entry: "settings", icon: "M12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4zM12 2.8v2.4M12 18.8v2.4M4.6 7.2l2 1.2M17.4 15.6l2 1.2M4.6 16.8l2-1.2M17.4 8.4l2-1.2" }
  ];

  var ICONS = {
    open: "M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4",
    copy: "M9 9h11v11H9zM15 5.5A2.5 2.5 0 0 0 12.5 3h-6A2.5 2.5 0 0 0 4 5.5v6A2.5 2.5 0 0 0 6.5 14",
    edit: "M4 20h4L20 8l-4-4L4 16zM14.5 5.5 18.5 9.5",
    up: "M12 19V5M6 11l6-6 6 6",
    down: "M12 5v14M6 13l6 6 6-6",
    top: "M5 4h14M12 20V9M7 14l5-5 5 5",
    bottom: "M5 20h14M12 4v11M7 10l5 5 5-5",
    trash: "M4 7h16M9.5 7V4.5h5V7M6.5 7l1 12.5h9L17.5 7",
    sort: "M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3",
    plus: "M12 5v14M5 12h14",
    refresh: "M20 12a8 8 0 1 1-2.4-5.7M20 4v4.6h-4.6",
    star: "M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.6l-5.1 2.7 1-5.7-4.1-4 5.7-.8z",
    sun: "M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6zM12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M5.5 18.5l1.6-1.6M16.9 7.1l1.6-1.6",
    moon: "M20 14.6A8.6 8.6 0 0 1 9.4 4a8.6 8.6 0 1 0 10.6 10.6z",
    shield: "M12 3.4 19 6v5.4c0 4.3-2.9 7.7-7 9.2-4.1-1.5-7-4.9-7-9.2V6z",
    hand: "M9 11.5V5.6a1.5 1.5 0 0 1 3 0v5.4M12 10.8V4.9a1.5 1.5 0 0 1 3 0v6.3M15 11.5V7.2a1.5 1.5 0 0 1 3 0v8.3a5.5 5.5 0 0 1-5.5 5.5H11a5 5 0 0 1-4.2-2.3L4.3 14.2a1.6 1.6 0 0 1 2.7-1.7l2 2.9",
    picture: "M4.5 5.5h15v13h-15zM4.8 15.4l4.5-4.3 3.3 3.1 2.7-2.6 4.2 4M9.6 9.7a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5z"
  };

  var state = {
    profile: {
      name: DEFAULT_PROFILE.name,
      meta: DEFAULT_PROFILE.meta,
      sign: DEFAULT_PROFILE.sign,
      tags: DEFAULT_PROFILE.tags.slice()
    },
    engines: [],
    selectedEngineId: "",
    shortcuts: [],
    iconPrefs: {},
    theme: { mode: "system", effectiveMode: "light" },
    privacy: { isPrivate: false },
    editing: false,
    motion: null,
    gripLabel: "",
    demo: false
  };

  var el = {};
  var iconsBound = false;
  var motionCallback = null;

  function $(id) { return document.getElementById(id); }

  function icon(path, opts) {
    var o = opts || {};
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", o.fill ? "currentColor" : "none");
    svg.setAttribute("stroke", o.fill ? "none" : "currentColor");
    svg.setAttribute("stroke-width", o.width || "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    var shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
    shape.setAttribute("d", path);
    svg.appendChild(shape);
    return svg;
  }

  var toastTimer = null;
  function toast(message) {
    if (!el.toast) return;
    el.toast.textContent = message;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.hidden = true; }, 2600);
  }

  function errorText(error) {
    var code = error && error.code;
    var map = {
      ENGINE_NOT_AVAILABLE: "这个搜索引擎当前不可用",
      SEARCH_ENGINE_UPDATE_UNAVAILABLE: "当前环境不支持切换搜索引擎",
      SEARCH_ENGINE_UPDATE_TIMEOUT: "切换引擎超时，请再试一次",
      INVALID_SHORTCUT_ORDER: "排序提交失败，列表不完整",
      SHORTCUT_REORDER_NOT_ALLOWED: "当前不允许保存排序",
      SHORTCUT_REORDER_UNAVAILABLE: "当前环境不支持保存排序"
    };
    if (code && map[code]) return map[code];
    if (code) return code;
    return (error && error.message) || "操作没有成功";
  }

  /* ---------- 存储 ---------- */

  function localGet(key, fallback) {
    try {
      var raw = window.localStorage.getItem("aira-profile-card:" + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function localSet(key, value) {
    try {
      window.localStorage.setItem("aira-profile-card:" + key, JSON.stringify(value));
    } catch (error) {
      /* 预览环境无法持久化时忽略 */
    }
  }

  function localRemove(key) {
    try { window.localStorage.removeItem("aira-profile-card:" + key); } catch (error) {}
  }

  function storageGet(key, fallback) {
    var a = api();
    if (a && a.storage && typeof a.storage.get === "function") {
      return a.storage.get(key, fallback).catch(function () { return localGet(key, fallback); });
    }
    return Promise.resolve(localGet(key, fallback));
  }

  function storageSet(key, value) {
    localSet(key, value);
    var a = api();
    if (a && a.storage && typeof a.storage.set === "function") {
      return a.storage.set(key, value);
    }
    return Promise.resolve();
  }

  function storageRemove(key) {
    localRemove(key);
    var a = api();
    if (a && a.storage && typeof a.storage.remove === "function") {
      return a.storage.remove(key);
    }
    return Promise.resolve();
  }

  /* ---------- 名片资料 ---------- */

  function applyProfile() {
    el.profileName.textContent = state.profile.name || DEFAULT_PROFILE.name;
    el.profileMeta.textContent = state.profile.meta || "";
    el.profileSign.textContent = state.profile.sign || "";
    el.profileMeta.hidden = !state.profile.meta;

    el.tags.textContent = "";
    (state.profile.tags || []).forEach(function (text) {
      var tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = text;
      el.tags.appendChild(tag);
    });
    var add = document.createElement("button");
    add.type = "button";
    add.className = "tag ghost";
    add.textContent = "＋ 标签";
    add.addEventListener("click", openProfileEditor);
    el.tags.appendChild(add);

    document.title = (state.profile.name || "名片") + " · 主页";
  }

  function loadProfile() {
    return storageGet("profile", null).then(function (saved) {
      if (saved && typeof saved === "object") {
        state.profile = {
          name: String(saved.name || DEFAULT_PROFILE.name),
          meta: String(saved.meta || ""),
          sign: String(saved.sign || ""),
          tags: Array.isArray(saved.tags) ? saved.tags.slice(0, 12).map(String) : DEFAULT_PROFILE.tags.slice(),
          level: typeof saved.level === "number" ? saved.level : null,
          gripText: typeof saved.gripText === "string" ? saved.gripText : ""
        };
      }
      applyProfile();
    }).catch(function () {
      applyProfile();
    });
  }

  /* ---------- 主题与配色 ---------- */

  function applyPalette(palette) {
    var colors = (palette && palette.colors) || null;
    if (!colors) return;
    var map = {
      "--aira-accent": colors.accent,
      "--aira-on-accent": colors.onAccent,
      "--aira-page-background": colors.pageBackground,
      "--aira-surface-background": colors.surfaceBackground,
      "--aira-control-background": colors.controlBackground,
      "--aira-text-primary": colors.textPrimary,
      "--aira-text-secondary": colors.textSecondary,
      "--aira-divider": colors.divider,
      "--aira-outline": colors.outline
    };
    Object.keys(map).forEach(function (key) {
      if (map[key]) root.style.setProperty(key, map[key]);
    });
    if (palette.id) root.dataset.themePalette = palette.id;
  }

  function applyTheme(theme) {
    if (theme) {
      state.theme = {
        mode: theme.mode || state.theme.mode,
        effectiveMode: theme.effectiveMode || state.theme.effectiveMode
      };
      applyPalette(theme.palette);
    }
    root.dataset.theme = state.theme.effectiveMode === "dark" ? "dark" : "light";
    renderBadges();
  }

  function applySystemThemeGuess() {
    if (api()) return;
    state.theme.effectiveMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    state.theme.mode = "system";
    applyTheme();
  }

  /* ---------- 隐私模式 ---------- */

  function applyPrivacy(privacy) {
    var isPrivate = !!(privacy && privacy.isPrivate);
    state.privacy.isPrivate = isPrivate;
    root.dataset.privacy = isPrivate ? "private" : "regular";
    el.statusText.textContent = isPrivate ? "隐私浏览中" : "普通模式";
    el.privacyLabel.textContent = isPrivate ? "退出隐私" : "隐私模式";
  }

  /* ---------- 设备环境 ---------- */

  function applyEnvironment(environment) {
    var env = environment || {};
    var viewport = env.viewport || {};
    root.dataset.formFactor = env.formFactor || "unknown";
    root.dataset.shellFamily = env.shellFamily || "phone";
    if (viewport.orientation) root.dataset.orientation = viewport.orientation;
  }

  /* ---------- 徽章 ---------- */

  function renderBadges() {
    if (!el.badges) return;
    el.badges.textContent = "";

    var level = typeof state.profile.level === "number"
      ? state.profile.level
      : Math.min(9, 1 + Math.floor(state.shortcuts.length / 8));
    var lv = document.createElement("span");
    lv.className = "badge lv";
    lv.appendChild(icon(ICONS.star, { fill: true }));
    var lvText = document.createElement("strong");
    lvText.textContent = "Lv." + level;
    lv.appendChild(lvText);
    lv.title = "长按编辑等级";
    el.badges.appendChild(lv);

    var themeBadge = document.createElement("span");
    themeBadge.className = "badge";
    themeBadge.appendChild(icon(state.theme.effectiveMode === "dark" ? ICONS.moon : ICONS.sun));
    var themeText = document.createElement("strong");
    themeText.textContent = state.theme.mode === "system"
      ? (state.theme.effectiveMode === "dark" ? "跟随系统 · 深色" : "跟随系统 · 浅色")
      : (state.theme.effectiveMode === "dark" ? "深色模式" : "浅色模式");
    themeBadge.appendChild(themeText);
    el.badges.appendChild(themeBadge);

    var customGrip = String(state.profile.gripText || "").trim();
    if (state.motion || customGrip) {
      var gripBadge = document.createElement("span");
      var gripLive = !customGrip && state.gripLabel && state.gripLabel !== "握姿待命";
      gripBadge.className = "badge" + (gripLive ? " live" : "");
      // 🧊：新定制冰块（包内 assets/icon-ice.svg，内嵌位图快照），不走系统表情字体
      var cube = document.createElement("span");
      cube.className = "ice-cube";
      var cubeImg = document.createElement("img");
      cubeImg.alt = "";
      cubeImg.src = "./assets/icon-ice.svg";
      cubeImg.addEventListener("error", function () {
        if (cubeImg.dataset.fallback === "png") {
          cubeImg.remove();
          cube.textContent = "🧊";
          return;
        }
        cubeImg.dataset.fallback = "png";
        cubeImg.src = "./assets/icon-ice.png";
      });
      cube.appendChild(cubeImg);
      gripBadge.appendChild(cube);
      var gripText = document.createElement("strong");
      gripText.textContent = customGrip || state.gripLabel || "握姿待命";
      gripBadge.appendChild(gripText);
      el.badges.appendChild(gripBadge);
    }
  }

  /* ---------- 快捷方式 ---------- */

  /* ---------- 快捷方式图标：自动 / 装框 / 首字母牌 ---------- */

  var ICON_MODES = [
    { id: "auto", label: "自动" },
    { id: "frame", label: "装框" },
    { id: "letter", label: "首字母" }
  ];

  var LETTER_COLORS = [
    { name: "跟随图标色", value: "" },
    { name: "冰蓝", value: "#3F6EA8" },
    { name: "靛", value: "#4B5AA6" },
    { name: "苔绿", value: "#3F7358" },
    { name: "琥珀", value: "#A9752F" },
    { name: "绯", value: "#A84F4A" },
    { name: "紫", value: "#6A4F9C" },
    { name: "墨", value: "#2F3844" }
  ];

  function iconKey(item) {
    if (!item) return "";
    if (item.kind === "system") return "sys:" + String(item.iconId || item.id || "");
    return String(item.url || item.id || "");
  }

  function iconPrefOf(item) {
    var pref = state.iconPrefs[iconKey(item)];
    return pref && typeof pref === "object" ? pref : null;
  }

  function letterText(item) {
    var text = String(item.title || item.url || "?").trim();
    return text.slice(0, 1) || "?";
  }

  function inkFor(tint) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(tint || "").trim());
    if (!m) return "";
    var v = m[1];
    if (v.length === 3) v = v.charAt(0) + v.charAt(0) + v.charAt(1) + v.charAt(1) + v.charAt(2) + v.charAt(2);
    var r = parseInt(v.slice(0, 2), 16);
    var g = parseInt(v.slice(2, 4), 16);
    var b = parseInt(v.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62
      ? "rgba(20, 28, 40, 0.88)"
      : "rgba(255, 255, 255, 0.96)";
  }

  function paintSource(container, item) {
    var a = api();
    if (a && typeof a.renderShortcutIcon === "function") {
      try {
        if (a.renderShortcutIcon(container, item)) return true;
      } catch (error) {
        /* 交给下面的回退 */
      }
      container.textContent = "";
      container.style.background = "";
    }
    if (item.iconRendering === "image" && item.icon) {
      var img = document.createElement("img");
      img.alt = "";
      img.src = item.icon;
      img.addEventListener("error", function () {
        img.remove();
        if (!container.firstChild) {
          container.classList.add("lettered");
          container.textContent = letterText(item);
        }
      });
      container.appendChild(img);
      return true;
    }
    return false;
  }

  function paintIcon(container, item, mode, tint) {
    container.textContent = "";
    container.style.color = "";
    container.style.background = "";
    container.classList.remove("framed", "lettered");

    var color = String(tint || "").trim();

    if (mode === "letter") {
      container.classList.add("lettered");
      if (color) {
        container.style.background = color;
        container.style.color = inkFor(color);
      }
      container.textContent = letterText(item);
      return;
    }

    if (mode === "frame") {
      var plate = document.createElement("span");
      plate.className = "plate";
      if (paintSource(plate, item)) {
        container.classList.add("framed");
        container.appendChild(plate);
        return;
      }
      container.classList.add("lettered");
      container.textContent = letterText(item);
      return;
    }

    if (!paintSource(container, item)) {
      container.classList.add("lettered");
      container.textContent = letterText(item);
    }
  }

  function renderShortcutIcon(container, item) {
    var pref = iconPrefOf(item);
    var mode = pref && pref.mode ? pref.mode : "auto";
    var tint = pref && pref.color ? pref.color : "";
    if (mode === "letter" && !tint) tint = String(item.iconColor || "").trim();
    paintIcon(container, item, mode, tint);
  }

  function setIconPref(item, patch) {
    var key = iconKey(item);
    if (!key) {
      toast("这条快捷方式没有可用的标识，无法单独记图标");
      return;
    }
    var next = {};
    var current = state.iconPrefs[key];
    if (current && typeof current === "object") {
      Object.keys(current).forEach(function (k) { next[k] = current[k]; });
    }
    Object.keys(patch || {}).forEach(function (k) { next[k] = patch[k]; });
    if (next.mode === "auto" && !next.color) delete state.iconPrefs[key];
    else state.iconPrefs[key] = next;
    storageSet("icons", state.iconPrefs).catch(function () {});
    renderShortcuts(state.shortcuts);
  }

  function loadIconPrefs() {
    storageGet("icons", null).then(function (saved) {
      if (saved && typeof saved === "object") state.iconPrefs = saved;
      renderShortcuts(state.shortcuts);
    }).catch(function () {});
  }

  function shortcutLetter(container, item) {
    container.textContent = letterText(item);
  }

  function renderShortcuts(items) {
    state.shortcuts = Array.isArray(items) ? items.slice() : [];
    var grid = el.shortcutGrid;
    grid.textContent = "";

    state.shortcuts.forEach(function (item) {
      var tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      tile.dataset.id = item.id || "";

      var box = document.createElement("span");
      box.className = "ticon";
      renderShortcutIcon(box, item);

      var label = document.createElement("span");
      label.className = "tlabel";
      label.textContent = item.title || item.url || "未命名";

      tile.appendChild(box);
      tile.appendChild(label);
      bindTile(tile, item);
      grid.appendChild(tile);
    });

    var addTile = document.createElement("button");
    addTile.type = "button";
    addTile.className = "tile add";
    addTile.dataset.role = "add";
    var addBox = document.createElement("span");
    addBox.className = "ticon";
    addBox.appendChild(icon(ICONS.plus, { width: "2" }));
    var addLabel = document.createElement("span");
    addLabel.className = "tlabel";
    addLabel.textContent = "添加";
    addTile.appendChild(addBox);
    addTile.appendChild(addLabel);
    addTile.addEventListener("click", function () {
      var a = api();
      if (a && typeof a.openShortcutPicker === "function") {
        a.openShortcutPicker();
      } else {
        toast("预览模式：在 Aira 里这里会打开快捷方式选择器");
      }
    });
    grid.appendChild(addTile);

    grid.classList.toggle("editing", state.editing);
    el.btnEditMode.classList.toggle("on", state.editing);
    el.btnEditMode.textContent = state.editing ? "完成" : "排序";
    renderBadges();
  }

  function bindTile(tile, item) {
    var timer = null;
    var moved = false;
    var fired = false;
    var dragging = false;
    var startX = 0;
    var startY = 0;
    var originX = 0;
    var originY = 0;

    function clearTimer() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }

    tile.addEventListener("pointerdown", function (event) {
      if (event.button && event.button !== 0) return;
      moved = false;
      fired = false;
      dragging = false;
      startX = originX = event.clientX;
      startY = originY = event.clientY;
      clearTimer();
      timer = setTimeout(function () {
        if (moved) return;
        if (state.editing) {
          startDrag(event);
        } else {
          fired = true;
          openIconEditor(item);
        }
      }, state.editing ? 240 : 430);
    });

    function startDrag(event) {
      if (dragging) return;
      dragging = true;
      tile.classList.add("dragging");
      state.dragId = item.id;
      if (tile.setPointerCapture) {
        try { tile.setPointerCapture(event.pointerId); } catch (error) {}
      }
    }

    tile.addEventListener("pointermove", function (event) {
      var dx = event.clientX - startX;
      var dy = event.clientY - startY;
      if (!dragging && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        moved = true;
        clearTimer();
        if (state.editing) startDrag(event);
      }
      if (!dragging) return;

      var ox = event.clientX - originX;
      var oy = event.clientY - originY;
      tile.style.transform = "translate(" + ox + "px," + oy + "px) scale(1.08)";

      var under = document.elementFromPoint(event.clientX, event.clientY);
      var target = under && under.closest ? under.closest(".tile") : null;
      if (target && target !== tile && target.dataset.role !== "add") {
        var children = Array.prototype.slice.call(el.shortcutGrid.children);
        var from = children.indexOf(tile);
        var to = children.indexOf(target);
        if (from > -1 && to > -1) {
          el.shortcutGrid.insertBefore(tile, from < to ? target.nextElementSibling : target);
          originX = event.clientX;
          originY = event.clientY;
          tile.style.transform = "scale(1.08)";
        }
      }
      var addTile = el.shortcutGrid.querySelector('.tile[data-role="add"]');
      if (addTile) el.shortcutGrid.appendChild(addTile);
      event.preventDefault();
    });

    function endPointer() {
      clearTimer();
      if (dragging) {
        dragging = false;
        tile.classList.remove("dragging");
        tile.style.transform = "";
        commitOrder();
      }
    }

    tile.addEventListener("pointerup", function () {
      var wasDragging = dragging;
      endPointer();
      if (!wasDragging && !fired && !moved) {
        if (state.editing) {
          openShortcutMenu(item);
        } else {
          openShortcut(item);
        }
      }
    });

    tile.addEventListener("pointercancel", endPointer);
    tile.addEventListener("pointerleave", clearTimer);
  }

  function commitOrder() {
    var ids = Array.prototype.slice.call(el.shortcutGrid.querySelectorAll('.tile[data-id]'))
      .map(function (tile) { return tile.dataset.id; })
      .filter(Boolean);
    var a = api();
    if (!a || typeof a.reorderShortcuts !== "function") {
      toast("预览模式：排序已生效，在 Aira 中会保存到系统");
      return;
    }
    a.reorderShortcuts(ids).catch(function (error) {
      toast(errorText(error));
    });
  }

  function openShortcut(item) {
    var a = api();
    if (a && typeof a.openShortcut === "function" && item.id) {
      a.openShortcut(item.id);
      return;
    }
    if (item.kind !== "system" && item.url && a && typeof a.openUrl === "function") {
      a.openUrl(item.url);
      return;
    }
    toast("预览模式：" + (item.title || item.url || "快捷方式") + " 会由 Aira 打开");
  }

  function openIconEditor(item) {
    var pref = iconPrefOf(item);
    var draft = {
      mode: pref && pref.mode ? pref.mode : "auto",
      color: pref && pref.color ? pref.color : ""
    };

    var body = document.createElement("div");
    body.className = "icon-editor";

    var opts = document.createElement("div");
    opts.className = "icon-opts";
    body.appendChild(opts);

    var colorRow = document.createElement("div");
    colorRow.className = "icon-color";
    var note = document.createElement("p");
    note.className = "icon-note";
    note.textContent = "首字母牌底色";
    var swatches = document.createElement("div");
    swatches.className = "swatches";
    colorRow.appendChild(note);
    colorRow.appendChild(swatches);
    body.appendChild(colorRow);

    function tintFor(mode) {
      if (mode !== "letter") return "";
      return draft.color || String(item.iconColor || "").trim();
    }

    function refresh() {
      opts.textContent = "";
      ICON_MODES.forEach(function (mode) {
        var card = document.createElement("button");
        card.type = "button";
        card.className = "icon-opt" + (draft.mode === mode.id ? " on" : "");
        var prev = document.createElement("span");
        prev.className = "ticon prev";
        paintIcon(prev, item, mode.id, tintFor(mode.id));
        var cap = document.createElement("span");
        cap.className = "cap";
        cap.textContent = mode.label;
        card.appendChild(prev);
        card.appendChild(cap);
        card.addEventListener("click", function () {
          draft.mode = mode.id;
          setIconPref(item, { mode: mode.id, color: mode.id === "letter" ? draft.color : "" });
          refresh();
        });
        opts.appendChild(card);
      });

      swatches.textContent = "";
      LETTER_COLORS.forEach(function (entry) {
        var swatch = document.createElement("button");
        swatch.type = "button";
        swatch.className = "swatch" + (draft.color === entry.value ? " on" : "");
        swatch.title = entry.name;
        if (entry.value) swatch.style.background = entry.value;
        else swatch.textContent = letterText(item);
        swatch.addEventListener("click", function () {
          draft.color = entry.value;
          draft.mode = "letter";
          setIconPref(item, { mode: "letter", color: entry.value });
          refresh();
        });
        swatches.appendChild(swatch);
      });

      colorRow.hidden = draft.mode !== "letter";
    }

    openSheet({
      title: "图标 · " + String(item.title || "未命名"),
      sub: "抓回来的原图、装进统一画框、或换成首字母牌 —— 这一格用哪种，你说了算。",
      content: body,
      buttons: [
        { label: "更多…", run: function () { openShortcutMenu(item); } },
        { label: "完成", variant: "primary", run: function () { closeSheet(); } }
      ]
    });
    refresh();
  }

  function openShortcutMenu(item) {
    var a = api();
    var isSystem = item.kind === "system";
    var actions = [
      {
        label: "打开",
        icon: ICONS.open,
        run: function () { openShortcut(item); closeSheet(); }
      }
    ];

    if (!isSystem && item.url) {
      actions.push({
        label: "复制链接",
        icon: ICONS.copy,
        run: function () {
          if (a && typeof a.copyShortcutUrl === "function") a.copyShortcutUrl(item.id);
          else toast("预览模式：这里会复制链接");
          closeSheet();
        }
      });
    }

    actions.push({
      label: "编辑",
      icon: ICONS.edit,
      run: function () {
        if (a && typeof a.editShortcut === "function") a.editShortcut(item.id);
        else toast("预览模式：这里会打开 Aira 编辑弹窗");
        closeSheet();
      }
    });

    [
      { label: "上移", icon: ICONS.up, method: "moveShortcutUp" },
      { label: "下移", icon: ICONS.down, method: "moveShortcutDown" },
      { label: "置顶", icon: ICONS.top, method: "moveShortcutToTop" },
      { label: "置底", icon: ICONS.bottom, method: "moveShortcutToBottom" }
    ].forEach(function (entry) {
      actions.push({
        label: entry.label,
        icon: entry.icon,
        run: function () {
          if (a && typeof a[entry.method] === "function") {
            a[entry.method](item.id).catch(function (error) { toast(errorText(error)); });
          } else {
            toast("预览模式：" + entry.label + " 由 Aira 执行");
          }
          closeSheet();
        }
      });
    });

    actions.push({
      label: state.editing ? "退出排序模式" : "进入排序模式",
      icon: ICONS.sort,
      run: function () {
        closeSheet();
        setEditing(!state.editing);
      }
    });

    actions.push({
      label: isSystem ? "删除（系统入口）" : "删除",
      icon: ICONS.trash,
      danger: true,
      run: function () {
        if (a && typeof a.confirmDeleteShortcut === "function") a.confirmDeleteShortcut(item.id);
        else toast("预览模式：这里会打开 Aira 删除确认");
        closeSheet();
      }
    });

    openSheet({
      title: item.title || item.url || "快捷方式",
      sub: isSystem ? "Aira 系统入口" : (item.url || ""),
      actions: actions
    });
  }

  function setEditing(next) {
    state.editing = !!next;
    el.shortcutGrid.classList.toggle("editing", state.editing);
    Array.prototype.forEach.call(el.shortcutGrid.children, function (tile) {
      if (tile.dataset.role === "add") return;
      tile.style.touchAction = state.editing ? "none" : "";
    });
    el.btnEditMode.classList.toggle("on", state.editing);
    el.btnEditMode.textContent = state.editing ? "完成" : "排序";
    if (state.editing) toast("拖动图标排序，完成后点“完成”保存");
  }

  function loadShortcuts() {
    var a = api();
    if (!a || typeof a.getShortcuts !== "function") {
      state.demo = true;
      renderShortcuts(DEMO_SHORTCUTS);
      return Promise.resolve();
    }
    return a.getShortcuts().then(function (items) {
      renderShortcuts(items);
    }).catch(function () {
      renderShortcuts([]);
    });
  }

  /* ---------- 搜索引擎 ---------- */

  function renderEngines(enginestate) {
    var next = enginestate || {};
    state.engines = Array.isArray(next.engines) ? next.engines : [];
    state.selectedEngineId = next.selectedEngineId || state.selectedEngineId || "";
    var chips = el.engineChips;
    chips.textContent = "";

    if (!state.engines.length) {
      var empty = document.createElement("span");
      empty.className = "chip";
      empty.textContent = "预览模式下没有读取到引擎";
      chips.appendChild(empty);
      return;
    }

    state.engines.forEach(function (engine) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (engine.id === state.selectedEngineId ? " active" : "");

      var box = document.createElement("span");
      box.className = "ci";
      if (engine.icon) {
        var img = document.createElement("img");
        img.alt = "";
        img.src = engine.icon;
        img.addEventListener("error", function () {
          img.remove();
          box.textContent = String(engine.name || "?").slice(0, 1);
        });
        box.appendChild(img);
      } else {
        box.textContent = String(engine.name || "?").slice(0, 1);
      }

      var name = document.createElement("span");
      name.textContent = engine.name || engine.id;

      chip.appendChild(box);
      chip.appendChild(name);
      chip.addEventListener("click", function () { selectEngine(engine.id); });
      chips.appendChild(chip);
    });
  }

  function loadEngines() {
    var a = api();
    if (!a || typeof a.getSearchEngineState !== "function") {
      renderEngines({ selectedEngineId: "baidu", selectionScope: "persistent", engines: DEMO_ENGINES });
      return Promise.resolve();
    }
    return a.getSearchEngineState().then(renderEngines).catch(function () {
      renderEngines({ engines: [] });
    });
  }

  function selectEngine(engineId) {
    var a = api();
    if (!a || typeof a.setSearchEngine !== "function") {
      state.selectedEngineId = engineId;
      renderEngines({ selectedEngineId: engineId, engines: state.engines });
      toast("预览模式：在 Aira 中会切换默认搜索引擎");
      return;
    }
    a.setSearchEngine(engineId).then(function (next) {
      renderEngines(next);
      var hit = state.engines.filter(function (item) { return item.id === engineId; })[0];
      toast("已切换到 " + ((hit && hit.name) || engineId));
    }).catch(function (error) {
      toast(errorText(error));
    });
  }

  /* ---------- 直达列表 ---------- */

  function renderEntries() {
    var rows = el.entryRows;
    rows.textContent = "";
    ENTRIES.forEach(function (entry) {
      var row = document.createElement("button");
      row.type = "button";
      row.className = "row";

      var box = document.createElement("span");
      box.className = "ricon rk-" + entry.key;
      box.appendChild(icon(entry.icon));

      var text = document.createElement("span");
      text.className = "rtext";
      var label = document.createElement("span");
      label.className = "rlabel";
      label.textContent = entry.label;
      var hint = document.createElement("span");
      hint.className = "rhint";
      hint.textContent = entry.hint;
      text.appendChild(label);
      text.appendChild(hint);

      var chev = icon("M9.5 6 15.5 12 9.5 18", { width: "2" });
      chev.setAttribute("class", "rchev");

      row.appendChild(box);
      row.appendChild(text);
      row.appendChild(chev);
      row.addEventListener("click", function () { openEntry(entry); });
      rows.appendChild(row);
    });
  }

  function openEntry(entry) {
    var a = api();
    if (!a) {
      toast("预览模式：" + entry.label + " 会在 Aira 中打开");
      return;
    }
    if (typeof a[entry.method] === "function") {
      a[entry.method]();
      return;
    }
    if (typeof a.openSystemEntry === "function") {
      a.openSystemEntry(entry.entry);
      return;
    }
    toast("当前 Aira 版本还不支持打开" + entry.label);
  }

  /* ---------- 折叠 ---------- */

  var FOLD_TARGETS = [
    { name: "shortcuts", block: "blockShortcuts", button: "btnFoldShortcuts" },
    { name: "entries", block: "blockEntries", button: "btnFoldEntries" }
  ];
  // 直达默认折叠：进场时把画面让给搜索框和照片
  var foldState = { shortcuts: false, entries: true };

  function applyFolds() {
    FOLD_TARGETS.forEach(function (target) {
      var block = $(target.block);
      var button = $(target.button);
      var collapsed = !!foldState[target.name];
      if (block) block.classList.toggle("collapsed", collapsed);
      if (button) button.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });
    if (foldState.shortcuts && foldState.entries) root.dataset.focus = "on";
    else delete root.dataset.focus;
  }

  function setFold(name, collapsed) {
    foldState[name] = !!collapsed;
    applyFolds();
    storageSet("folds", foldState).catch(function () {});
  }

  function initFolds() {
    FOLD_TARGETS.forEach(function (target) {
      var button = $(target.button);
      if (!button) return;
      button.addEventListener("click", function () {
        setFold(target.name, !foldState[target.name]);
      });
    });
    storageGet("folds", null).then(function (saved) {
      if (saved && typeof saved === "object") {
        if (typeof saved.shortcuts === "boolean") foldState.shortcuts = saved.shortcuts;
        if (typeof saved.entries === "boolean") foldState.entries = saved.entries;
      }
      applyFolds();
    }).catch(applyFolds);
  }

  initFolds();

  /* ---------- 名片编辑：左右双面板 ---------- */

  var editRoot = null;

  function openInfoSheet(title, sub, entries) {
    var a = api();
    var actions = entries.map(function (entry) {
      return {
        label: entry.label,
        icon: entry.icon,
        run: function () {
          if (a && typeof a[entry.method] === "function") a()[entry.method]();
          else toast("预览模式：" + entry.label);
          closeSheet();
        }
      };
    });
    openSheet({ title: title, sub: sub, actions: actions });
  }

  function openStatusSheet() {
    openInfoSheet(
      "浏览模式",
      "这枚胶囊显示的是 Aira 当前真实的浏览边界。主页读不到、也改不了它，只能帮你切换。",
      [
        { label: state.privacy.isPrivate ? "退出隐私模式" : "进入隐私模式", icon: ICONS.shield, method: "togglePrivateMode" },
        { label: "隐私与安全设置", icon: ICONS.edit, method: "openPrivacySecuritySettings" }
      ]
    );
  }

  function openThemeSheet() {
    openInfoSheet(
      "浅色 / 深色",
      "主题由 Aira 与系统决定，主页只跟随、不修改。要换就跳去设置里换。",
      [
        { label: "外观设置", icon: ICONS.sun, method: "openAppearanceSettings" },
        { label: "主题配色", icon: ICONS.moon, method: "openThemePaletteSettings" }
      ]
    );
  }

  function openGripSheet() {
    openInfoSheet(
      "智感握姿",
      "握姿要 Aira 在实验室开关打开后才提供，主页只接收左手 / 右手 / 双手 / 未握持这几个状态。",
      [
        { label: "打开实验室设置", icon: ICONS.hand, method: "openExperimentsSettings" }
      ]
    );
  }

  function buildEditRoot() {
    var root = document.createElement("div");
    root.className = "edit-root";
    root.hidden = true;

    var mask = document.createElement("div");
    mask.className = "edit-mask";

    var stage = document.createElement("div");
    stage.className = "edit-stage";

    root.appendChild(mask);
    root.appendChild(stage);
    document.body.appendChild(root);
    return { root: root, mask: mask, stage: stage };
  }

  function panelFooter(buttons) {
    var foot = document.createElement("div");
    foot.className = "sheet-actions";
    buttons.forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "btn" + (item.variant ? " " + item.variant : "");
      button.textContent = item.label;
      button.addEventListener("click", item.run);
      foot.appendChild(button);
    });
    return foot;
  }

  function openCardEditor() {
    if (!editRoot) editRoot = buildEditRoot();
    var stage = editRoot.stage;
    stage.textContent = "";

    var profile = state.profile;

    /* 左：名片 */
    var left = document.createElement("section");
    left.className = "edit-panel";
    var leftTitle = document.createElement("h3");
    leftTitle.textContent = "名片";
    left.appendChild(leftTitle);

    var name = field("名字", profile.name || "", "显示在名片上的名字");
    var meta = field("一行简介", profile.meta || "", "年龄 · 城市");
    var sign = field("签名", profile.sign || "", "一句话写你自己");
    left.appendChild(name.wrap);
    left.appendChild(meta.wrap);
    left.appendChild(sign.wrap);

    /* 右：标签与等级 */
    var right = document.createElement("section");
    right.className = "edit-panel";
    var rightTitle = document.createElement("h3");
    rightTitle.textContent = "标签与等级";
    right.appendChild(rightTitle);

    var tagHint = document.createElement("p");
    tagHint.className = "panel-hint";
    tagHint.textContent = "标签（点 × 删除，最多 12 个）";
    right.appendChild(tagHint);

    var draftTags = (profile.tags || []).slice();
    var tagList = document.createElement("div");
    tagList.className = "tag-edit";

    function renderTagList() {
      tagList.textContent = "";
      if (!draftTags.length) {
        var none = document.createElement("span");
        none.className = "panel-hint";
        none.textContent = "还没有标签";
        tagList.appendChild(none);
        return;
      }
      draftTags.forEach(function (text, index) {
        var chip = document.createElement("span");
        chip.className = "tag";
        chip.appendChild(document.createTextNode(text));
        var kill = document.createElement("button");
        kill.type = "button";
        kill.className = "tag-kill";
        kill.setAttribute("aria-label", "删除标签 " + text);
        kill.textContent = "×";
        kill.addEventListener("click", function () {
          draftTags.splice(index, 1);
          renderTagList();
        });
        chip.appendChild(kill);
        tagList.appendChild(chip);
      });
    }
    renderTagList();
    right.appendChild(tagList);

    var addRow = document.createElement("div");
    addRow.className = "tag-add";
    var addInput = document.createElement("input");
    addInput.type = "text";
    addInput.placeholder = "新标签";
    var addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "mini";
    addButton.textContent = "添加";
    addButton.addEventListener("click", function () {
      var text = addInput.value.trim();
      if (!text) return;
      if (draftTags.indexOf(text) >= 0) {
        addInput.value = "";
        return;
      }
      if (draftTags.length >= 12) {
        toast("最多 12 个标签");
        return;
      }
      draftTags.push(text);
      addInput.value = "";
      renderTagList();
    });
    addRow.appendChild(addInput);
    addRow.appendChild(addButton);
    right.appendChild(addRow);

    var level = field("等级", typeof profile.level === "number" ? String(profile.level) : "", "1 – 99；留空＝按快捷方式数量自动");
    right.appendChild(level.wrap);

    var grip = field("握姿标签", profile.gripText || "", "留空＝显示 Aira 的真实握姿；写了就顶替它");
    right.appendChild(grip.wrap);

    var infoHint = document.createElement("p");
    infoHint.className = "panel-hint";
    infoHint.textContent = "下面三项由 Aira 决定，主页只跟随";
    right.appendChild(infoHint);

    var infoRow = document.createElement("div");
    infoRow.className = "info-row";
    [
      { label: state.privacy.isPrivate ? "浏览模式 · 隐私中" : "浏览模式 · 普通", run: openStatusSheet },
      { label: "主题 · 跟随系统", run: openThemeSheet },
      { label: state.gripLabel ? "握姿 · " + state.gripLabel : "握姿", run: openGripSheet }
    ].forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "mini";
      button.textContent = item.label;
      button.addEventListener("click", item.run);
      infoRow.appendChild(button);
    });
    right.appendChild(infoRow);

    function persist(message) {
      storageSet("profile", state.profile).then(function () {
        toast(message);
      }).catch(function () {
        toast("保存失败，请再试一次");
      });
    }

    left.appendChild(panelFooter([
      {
        label: "恢复默认",
        run: function () {
          state.profile.name = DEFAULT_PROFILE.name;
          state.profile.meta = DEFAULT_PROFILE.meta;
          state.profile.sign = DEFAULT_PROFILE.sign;
          name.input.value = DEFAULT_PROFILE.name;
          meta.input.value = DEFAULT_PROFILE.meta;
          sign.input.value = DEFAULT_PROFILE.sign;
          applyProfile();
          persist("已恢复默认名片");
        }
      },
      {
        label: "保存",
        variant: "primary",
        run: function () {
          state.profile.name = name.input.value.trim() || DEFAULT_PROFILE.name;
          state.profile.meta = meta.input.value.trim();
          state.profile.sign = sign.input.value.trim();
          applyProfile();
          persist("名片已保存");
        }
      }
    ]));

    right.appendChild(panelFooter([
      {
        label: "关闭",
        run: closeCardEditor
      },
      {
        label: "保存",
        variant: "primary",
        run: function () {
          var raw = level.input.value.trim();
          if (!raw) {
            state.profile.level = null;
          } else {
            var next = parseInt(raw, 10);
            if (isNaN(next) || next < 1 || next > 99) {
              toast("等级请输入 1 到 99");
              return;
            }
            state.profile.level = next;
          }
          state.profile.tags = draftTags.slice();
          state.profile.gripText = grip.input.value.trim();
          applyProfile();
          renderBadges();
          persist("标签与等级已保存");
        }
      }
    ]));

    stage.appendChild(left);
    stage.appendChild(right);

    editRoot.mask.addEventListener("click", closeCardEditor);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && editRoot && !editRoot.root.hidden) closeCardEditor();
    });

    editRoot.root.hidden = false;
    setBackActive(true);
  }

  function closeCardEditor() {
    if (editRoot) editRoot.root.hidden = true;
    setBackActive(false);
  }

  /* ---------- 面板 ---------- */

  function setBackActive(active) {
    var a = api();
    if (a && typeof a.setBackHandlerActive === "function") {
      try { a.setBackHandlerActive(active); } catch (error) {}
    }
  }

  function openSheet(options) {
    var sheet = el.sheet;
    sheet.textContent = "";

    var title = document.createElement("h3");
    title.className = "sheet-title";
    title.textContent = options.title || "";
    sheet.appendChild(title);

    if (options.sub) {
      var sub = document.createElement("p");
      sub.className = "sheet-sub";
      sub.textContent = options.sub;
      sheet.appendChild(sub);
    }

    if (options.content) sheet.appendChild(options.content);

    if (options.actions && options.actions.length) {
      var list = document.createElement("div");
      list.className = "sheet-list";
      options.actions.forEach(function (action) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "act" + (action.danger ? " danger" : "");
        button.appendChild(icon(action.icon || ICONS.open));
        var label = document.createElement("span");
        label.className = "act-label";
        label.textContent = action.label;
        button.appendChild(label);
        if (action.disabled) button.disabled = true;
        button.addEventListener("click", function () { action.run(); });
        list.appendChild(button);
      });
      sheet.appendChild(list);
    }

    if (options.buttons && options.buttons.length) {
      var footer = document.createElement("div");
      footer.className = "sheet-actions";
      options.buttons.forEach(function (item) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "btn" + (item.variant ? " " + item.variant : "");
        button.textContent = item.label;
        button.addEventListener("click", function () { item.run(); });
        footer.appendChild(button);
      });
      sheet.appendChild(footer);
    }

    el.sheetRoot.hidden = false;
    setBackActive(true);
  }

  function closeSheet() {
    el.sheetRoot.hidden = true;
    setBackActive(false);
  }

  function field(labelText, value, placeholder) {
    var wrap = document.createElement("div");
    wrap.className = "field";
    var label = document.createElement("label");
    label.textContent = labelText;
    var input = document.createElement("input");
    input.type = "text";
    input.value = value || "";
    input.placeholder = placeholder || "";
    wrap.appendChild(label);
    wrap.appendChild(input);
    return { wrap: wrap, input: input };
  }

  function openProfileEditor() {
    openCardEditor();
  }

  /* ---------- 智感握姿 ---------- */

  function applyGrip(status) {
    var motion = state.motion;
    if (!motion) return;
    var map = motion.HoldingHandStatus || {};
    var label = "";
    if (status === map.LEFT_HAND_HELD) {
      label = "左手握持";
      root.dataset.smartGrip = "left";
    } else if (status === map.RIGHT_HAND_HELD) {
      label = "右手握持";
      root.dataset.smartGrip = "right";
    } else if (status === map.BOTH_HANDS_HELD) {
      label = "双手握持";
      root.dataset.smartGrip = "both";
    } else if (status === map.NOT_HELD) {
      label = "未握持";
      root.dataset.smartGrip = "default";
    } else {
      label = "握姿未知";
      root.dataset.smartGrip = "default";
    }
    state.gripLabel = label;
    renderBadges();
  }

  function bindMotion() {
    var a = api();
    var motion = a && a.motion;
    if (!motion) {
      state.motion = null;
      return;
    }
    if (state.motion === motion && motionCallback) return;
    state.motion = motion;
    motionCallback = function (status) { applyGrip(status); };
    try {
      motion.on("holdingHandChanged", motionCallback);
    } catch (error) {
      state.motion = null;
      motionCallback = null;
    }
  }

  function unbindMotion() {
    if (state.motion && motionCallback) {
      try { state.motion.off("holdingHandChanged", motionCallback); } catch (error) {}
    }
    motionCallback = null;
  }

  /* ---------- 时钟 ---------- */

  function greetingFor(hour) {
    if (hour < 5) return "夜深了，早点休息";
    if (hour < 9) return "早上好，新的一天";
    if (hour < 12) return "上午好，慢慢来";
    if (hour < 14) return "午后小憩一会儿";
    if (hour < 18) return "下午好，保持清醒";
    if (hour < 22) return "晚上好，辛苦了";
    return "夜深了，早点休息";
  }

  function tickClock() {
    var now = new Date();
    var pad = function (n) { return n < 10 ? "0" + n : String(n); };
    var days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    el.clockTime.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes());
    el.clockDate.textContent = (now.getMonth() + 1) + "月" + now.getDate() + "日 " + days[now.getDay()] +
      " · " + greetingFor(now.getHours());
  }

  /* ---------- 初始化 ---------- */

  function bindInteractions() {
    if (iconsBound) return;
    iconsBound = true;

    var a = function () { return api(); };

    function entryByKey(key) {
      for (var i = 0; i < ENTRIES.length; i++) {
        if (ENTRIES[i].key === key) return ENTRIES[i];
      }
      return null;
    }

    $("btnHistory").addEventListener("click", function () {
      if (a() && typeof a().openHistory === "function") a().openHistory();
      else toast("预览模式：这里会打开 Aira 历史记录");
    });

    $("btnScan").addEventListener("click", function () {
      if (a() && typeof a().scanQr === "function") a().scanQr();
      else toast("预览模式：这里会打开 Aira 扫一扫");
    });

    $("btnSettings").addEventListener("click", function () {
      var entry = entryByKey("settings");
      if (entry) openEntry(entry);
    });

    $("btnSearch").addEventListener("click", function () {
      if (a() && typeof a().openSearch === "function") a().openSearch();
      else toast("预览模式：这里会展开 Aira 系统搜索");
    });

    $("btnTabs").addEventListener("click", function () {
      if (a() && typeof a().openTabs === "function") a().openTabs();
      else toast("预览模式：这里会打开标签后台");
    });

    $("btnSystemSearch").addEventListener("click", function () {
      if (a() && typeof a().openSearch === "function") a().openSearch();
      else toast("预览模式：这里会展开 Aira 系统搜索");
    });

    $("btnPrivacy").addEventListener("click", function () {
      if (a() && typeof a().togglePrivateMode === "function") a().togglePrivateMode();
      else toast("预览模式：进入或退出隐私模式会由 Aira 确认");
    });

    $("btnEngineSettings").addEventListener("click", function () {
      var entry = entryByKey("searchSettings");
      if (entry) openEntry(entry);
    });
    $("btnEditProfile").addEventListener("click", openProfileEditor);

    $("btnEditMode").addEventListener("click", function () { setEditing(!state.editing); });

    $("searchForm").addEventListener("submit", function (event) {
      event.preventDefault();
      var value = $("searchInput").value.trim();
      if (!value) return;
      if (a() && typeof a().search === "function") {
        a().search(value);
        $("searchInput").blur();
      } else {
        toast("预览模式：会搜索「" + value + "」");
      }
    });

    el.sheetMask.addEventListener("click", closeSheet);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !el.sheetRoot.hidden) closeSheet();
    });

    window.addEventListener("aira-home-ready", init);
    window.addEventListener("aira-home-shortcuts-changed", function (event) {
      renderShortcuts(event.detail || []);
    });
    window.addEventListener("aira-home-search-engines-changed", function (event) {
      renderEngines(event.detail || {});
    });
    window.addEventListener("aira-home-theme-changed", function (event) {
      applyTheme(event.detail || {});
    });
    window.addEventListener("aira-home-privacy-mode-changed", function (event) {
      applyPrivacy(event.detail || {});
    });
    window.addEventListener("aira-home-environment-changed", function (event) {
      applyEnvironment(event.detail || {});
    });
    window.addEventListener("aira-home-back-requested", function () {
      closeSheet();
    });
    window.addEventListener("aira-home-icon-font-ready", function () {
      renderShortcuts(state.shortcuts);
    });
    window.addEventListener("pagehide", unbindMotion);

    if (window.matchMedia) {
      var query = window.matchMedia("(prefers-color-scheme: dark)");
      var onChange = function () {
        if (api()) return;
        applySystemThemeGuess();
      };
      if (query.addEventListener) query.addEventListener("change", onChange);
      else if (query.addListener) query.addListener(onChange);
    }
  }

  // 0＝还没初始化；1＝已按浏览器预览跑过；2＝已按 Aira 桥接跑过。
  // aira-home-ready 可能被反复派发（实测每秒几十次），所以这里只允许「预览 → 桥接」升级一次，
  // 之后重复的 ready 一律忽略；否则每次 ready 都会重跑整套加载，几秒内就能把渲染进程拖死。
  var initStage = 0;

  function init() {
    var a = api();
    var stage = a ? 2 : 1;
    if (initStage >= stage) return;
    initStage = stage;

    loadProfile();
    bindInteractions();
    renderEntries();
    bindMotion();
    applySystemThemeGuess();

    if (!a) {
      state.demo = true;
      loadEngines();
      loadShortcuts();
      loadIconPrefs();
      renderBadges();
      if (!window.__airaDemoNotice) {
        window.__airaDemoNotice = true;
        setTimeout(function () { toast("未检测到 AiraHome，当前为浏览器预览模式"); }, 600);
      }
      return;
    }

    state.demo = false;

    if (typeof a.getThemePalette === "function") {
      a.getThemePalette().then(function (palette) {
        applyTheme({ mode: state.theme.mode, effectiveMode: state.theme.effectiveMode, palette: palette });
      }).catch(function () {});
    } else if (typeof a.getTheme === "function") {
      a.getTheme().then(applyTheme).catch(function () {});
    }

    if (typeof a.getPrivacyMode === "function") {
      a.getPrivacyMode().then(applyPrivacy).catch(function () {});
    }
    if (typeof a.getEnvironment === "function") {
      a.getEnvironment().then(applyEnvironment).catch(function () {});
    }

    loadEngines();
    loadShortcuts();
    loadIconPrefs();
    renderBadges();
  }

  function boot() {
    el = {
      clockTime: $("clockTime"),
      clockDate: $("clockDate"),
      profileName: $("profileName"),
      profileMeta: $("profileMeta"),
      profileSign: $("profileSign"),
      tags: $("tags"),
      badges: $("badges"),
      statusText: $("statusText"),
      privacyLabel: $("privacyLabel"),
      shortcutGrid: $("shortcutGrid"),
      engineChips: $("engineChips"),
      entryRows: $("entryRows"),
      btnEditMode: $("btnEditMode"),
      sheetRoot: $("sheetRoot"),
      sheet: $("sheet"),
      sheetMask: $("sheetMask"),
      toast: $("toast")
    };

    tickClock();
    setInterval(tickClock, 20000);

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  boot();
})();
