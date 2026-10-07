(function () {
  "use strict";

  var root = document.documentElement;
  var api = function () { return window.AiraHome || null; };

  var DEFAULT_PROFILE = {
    name: "无名氏",
    meta: "17 · 上海",
    level: 14,
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
    logs: [],
    signs: [],
    wallpaper: "dark",
    wallpaperBlur: {},
    wallpaperRolled: "",
    wallpaperProbability: { version: 1, light: 0.5, source: "default", updatedAt: 0 },
    wallpaperProbabilityReady: false,
    interactionCount: 2,
    interactionDefaultCount: 2,
    interactionSettingsReady: false,
    interactionDefaultSaving: false,
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
      : DEFAULT_PROFILE.level;
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

  var LETTER_AUTO = { name: "跟随图标色", value: "" };

  var LETTER_COLOR_GROUPS = [
    {
      label: "清新",
      colors: [
        ["雾蓝", "#E9F1F9"], ["冰蓝", "#DCEBF7"], ["天青", "#EAF4F8"],
        ["冰青", "#E2F2F0"], ["薄荷", "#E3F2E8"], ["芽绿", "#EFF6EC"],
        ["青瓷", "#E8F2DC"], ["月白", "#F1F2E4"], ["象牙", "#F6F1E4"],
        ["杏仁", "#F8EDE2"], ["藕粉", "#FAECE7"], ["樱粉", "#F8E8EF"],
        ["薰衣草", "#F1EAF7"], ["雾紫", "#EAECF9"], ["石灰", "#EEF1F3"],
        ["细沙", "#F4EEE9"]
      ]
    },
    {
      label: "沉静",
      colors: [
        ["深灰蓝", "#2F4858"], ["蓝", "#33658A"], ["青", "#3E7D86"],
        ["松绿", "#38686A"], ["苔绿", "#4A7054"], ["橄榄", "#5A6E4F"],
        ["卡其", "#7A6A53"], ["陶土", "#8C5A5A"], ["深绯", "#9A031E"],
        ["紫酒", "#5F0F40"], ["夜紫", "#4B3F72"], ["铁灰", "#444F5A"]
      ]
    }
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
    var autoRow = document.createElement("div");
    autoRow.className = "swatches auto-row";
    var groups = document.createElement("div");
    groups.className = "swatch-groups";
    colorRow.appendChild(note);
    colorRow.appendChild(autoRow);
    colorRow.appendChild(groups);
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

      autoRow.textContent = "";
      groups.textContent = "";

      function swatchButton(name, value) {
        var swatch = document.createElement("button");
        swatch.type = "button";
        swatch.className = "swatch" + (draft.color === value && draft.mode === "letter" ? " on" : "");
        swatch.title = name;
        if (value) swatch.style.background = value;
        else swatch.textContent = letterText(item);
        swatch.addEventListener("click", function () {
          draft.color = value;
          draft.mode = "letter";
          setIconPref(item, { mode: "letter", color: value });
          refresh();
        });
        return swatch;
      }

      autoRow.appendChild(swatchButton(LETTER_AUTO.name, LETTER_AUTO.value));

      LETTER_COLOR_GROUPS.forEach(function (group) {
        var box = document.createElement("div");
        box.className = "swatch-group";
        var label = document.createElement("p");
        label.className = "icon-note sub";
        label.textContent = group.label;
        var row = document.createElement("div");
        row.className = "swatches";
        group.colors.forEach(function (pair) {
          row.appendChild(swatchButton(pair[0], pair[1]));
        });
        box.appendChild(label);
        box.appendChild(row);
        groups.appendChild(box);
      });

      colorRow.hidden = draft.mode !== "letter";
    }

    openSheet({
      title: "图标 · " + String(item.title || "未命名"),
      sub: "抓回来的原图、装进统一画框、或换成首字母牌 —— 这一格用哪种，你说了算。",
      content: body,
      center: true,
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

    var signMore = document.createElement("div");
    signMore.className = "field-more";
    var signHistoryBtn = document.createElement("button");
    signHistoryBtn.type = "button";
    signHistoryBtn.className = "btn sm warm";
    signHistoryBtn.textContent = "历史签名";
    signHistoryBtn.addEventListener("click", function () { openSignHistory(); });
    signMore.appendChild(signHistoryBtn);
    left.appendChild(signMore);

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

    var level = field("等级", typeof profile.level === "number" ? String(profile.level) : "", "1 – 99；留空＝默认 Lv." + DEFAULT_PROFILE.level);
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
          recordSign(state.profile.sign);
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
    refreshInteraction();
  }

  function closeCardEditor() {
    if (editRoot) editRoot.root.hidden = true;
    setBackActive(false);
    refreshInteraction();
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
    $("btnInteraction").setAttribute("aria-expanded", options.interaction ? "true" : "false");
    sheet.classList.toggle("center", !!options.center);
    sheet.classList.toggle("wide", !!options.wide);
    sheet.classList.toggle("interaction-sheet", !!options.interaction);

    var title = document.createElement("h3");
    title.className = "sheet-title";
    title.textContent = options.title || "";
    if (options.interaction) {
      var heading = document.createElement("div");
      heading.className = "interaction-heading";
      var subtitle = document.createElement("div");
      subtitle.className = "interaction-subtitle";
      var motto = document.createElement("span");
      motto.textContent = "灵感与犀利并存";
      var identity = document.createElement("span");
      identity.textContent = "鸿蒙hydeclanspi灵感台";
      subtitle.appendChild(motto);
      subtitle.appendChild(identity);
      heading.appendChild(title);
      heading.appendChild(subtitle);
      sheet.appendChild(heading);
    } else sheet.appendChild(title);

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
        button.className = "btn" + (item.variant ? " " + item.variant : "") + (item.size === "sm" ? " sm" : "");
        button.textContent = item.label;
        button.addEventListener("click", function () { item.run(); });
        footer.appendChild(button);
      });
      sheet.appendChild(footer);
    }

    el.sheetRoot.hidden = false;
    setBackActive(true);
    refreshInteraction();
  }

  function closeSheet() {
    el.sheetRoot.hidden = true;
    $("btnInteraction").setAttribute("aria-expanded", "false");
    setBackActive(false);
    refreshInteraction();
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

  /* ---------- 日志（贴在主题卡片右下角的一句话） ---------- */

  var LOG_DEFAULT = "wilson vibes only.";
  var LOG_PAGE_SIZE = 5;
  var LOG_MAX = 200;

  function logDate(at) {
    var d = new Date(Number(at) || Date.now());
    var pad = function (n) { return n < 10 ? "0" + n : String(n); };
    return d.getFullYear() + "." + pad(d.getMonth() + 1) + "." + pad(d.getDate()) +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }

  function currentLogText() {
    return state.logs.length ? state.logs[0].text : LOG_DEFAULT;
  }

  function paintDailyLog() {
    if (el.dailyLog) el.dailyLog.textContent = currentLogText();
  }

  function loadLogs() {
    return storageGet("logs", null).then(function (saved) {
      if (Array.isArray(saved) && saved.length) {
        state.logs = saved.map(function (row) {
          return {
            text: String((row && row.text) || "").slice(0, 120),
            at: Number(row && row.at) || Date.now()
          };
        }).filter(function (row) { return row.text; });
      }
      // 一次性迁移：把旧的默认句换成新的默认句（只在它还是那一句时）
      if (state.logs.length && state.logs[0].text === "hydecaside vibes only.") {
        state.logs[0].text = LOG_DEFAULT;
        storageSet("logs", state.logs).catch(function () {});
      }
      if (!state.logs.length) {
        state.logs = [{ text: LOG_DEFAULT, at: Date.now() }];
        storageSet("logs", state.logs).catch(function () {});
      }
      paintDailyLog();
    }).catch(function () { paintDailyLog(); });
  }

  function pushLog(value) {
    var text = String(value || "").trim().slice(0, 120);
    if (!text) { toast("写点什么吧"); return false; }
    if (state.logs.length && state.logs[0].text === text) { toast("和上一句一样"); return false; }
    state.logs.unshift({ text: text, at: Date.now() });
    if (state.logs.length > LOG_MAX) state.logs.length = LOG_MAX;
    storageSet("logs", state.logs).catch(function () {});
    paintDailyLog();
    return true;
  }

  function removeLog(index) {
    if (index < 0 || index >= state.logs.length) return;
    state.logs.splice(index, 1);
    if (!state.logs.length) state.logs = [{ text: LOG_DEFAULT, at: Date.now() }];
    storageSet("logs", state.logs).catch(function () {});
    paintDailyLog();
  }

  function historyRow(row, onRemove, tag) {
    var wrap = document.createElement("div");
    wrap.className = "log-row";

    var inner = document.createElement("div");
    inner.className = "log-row-inner";

    var action = document.createElement("button");
    action.type = "button";
    action.className = "log-remove";
    action.textContent = "移除";

    var item = document.createElement("div");
    item.className = "log-item";
    var date = document.createElement("span");
    date.className = "log-date";
    date.textContent = logDate(row.at);
    var line = document.createElement("span");
    line.className = "log-line";
    var text = document.createElement("span");
    text.className = "log-text";
    text.textContent = row.text;
    line.appendChild(text);
    if (tag) {
      var badge = document.createElement("span");
      badge.className = "log-tag";
      badge.textContent = tag;
      line.appendChild(badge);
    }
    item.appendChild(date);
    item.appendChild(line);

    inner.appendChild(item);
    inner.appendChild(action);
    wrap.appendChild(inner);

    var REVEAL = 88;
    var dragging = false;
    var startX = 0;
    var dx = 0;

    function slide(value) {
      inner.style.transform = value ? "translateX(" + value + "px)" : "";
    }
    function close() { dx = 0; slide(0); }

    action.addEventListener("click", function () { onRemove(); });

    item.addEventListener("pointerdown", function (event) {
      if (event.button && event.button !== 0) return;
      dragging = true;
      dx = 0;
      startX = event.clientX;
      inner.style.transition = "none";
    });
    item.addEventListener("pointermove", function (event) {
      if (!dragging) return;
      dx = event.clientX - startX;
      if (dx > 0) dx = 0;
      if (dx < -REVEAL) dx = -REVEAL;
      slide(dx);
      if (dx < -4) event.preventDefault();
    });
    function end() {
      if (!dragging) return;
      dragging = false;
      inner.style.transition = "";
      if (dx < -44) slide(-REVEAL);
      else close();
    }
    item.addEventListener("pointerup", end);
    item.addEventListener("pointercancel", end);
    item.addEventListener("pointerleave", end);

    return wrap;
  }

  // 淡橙色「国中国」：列表 + 分页，日志和签名历史共用同一套
  function buildHistoryBlock(rows, remove, plain, tagFor) {
    var box = document.createElement("div");
    box.className = "log-history" + (plain ? " plain" : "");

    var brand = document.createElement("p");
    brand.className = "log-brand";
    brand.textContent = "历史记录";

    var list = document.createElement("div");
    list.className = "log-list";

    var pager = document.createElement("div");
    pager.className = "log-pager";

    box.appendChild(brand);
    box.appendChild(list);
    box.appendChild(pager);

    var page = 1;

    function pageButton(glyph, disabled, run) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "log-page-btn";
      button.textContent = glyph;
      button.disabled = !!disabled;
      button.addEventListener("click", run);
      return button;
    }

    function render() {
      var total = Math.max(1, Math.ceil(rows.length / LOG_PAGE_SIZE));
      if (page > total) page = total;
      if (page < 1) page = 1;
      var from = (page - 1) * LOG_PAGE_SIZE;

      list.textContent = "";
      var slice = rows.slice(from, from + LOG_PAGE_SIZE);
      if (!slice.length) {
        var empty = document.createElement("p");
        empty.className = "log-empty";
        empty.textContent = "还没有记录。";
        list.appendChild(empty);
      }
      slice.forEach(function (row, offset) {
        list.appendChild(historyRow(row, function () {
          remove(from + offset);
          render();
        }, tagFor ? tagFor(row) : ""));
      });

      pager.textContent = "";
      if (total > 1) {
        pager.appendChild(pageButton("‹", page <= 1, function () { page--; render(); }));
        var info = document.createElement("span");
        info.className = "log-pageinfo";
        info.textContent = page + " / " + total + " · " + rows.length + " 条";
        pager.appendChild(info);
        pager.appendChild(pageButton("›", page >= total, function () { page++; render(); }));
      }
    }

    render();
    return { node: box, render: render, first: function () { page = 1; } };
  }

  function openLogEditor() {
    var body = document.createElement("div");
    body.className = "log-editor";

    var field = document.createElement("div");
    field.className = "field";
    var label = document.createElement("label");
    label.textContent = "New.";
    var input = document.createElement("input");
    input.type = "text";
    input.maxLength = 120;
    input.value = currentLogText();
    input.placeholder = "写一句今天想留在主页上的话";
    field.appendChild(label);
    field.appendChild(input);

    var saveRow = document.createElement("div");
    saveRow.className = "log-save";
    var saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "btn primary";
    saveButton.textContent = "Done";
    saveRow.appendChild(saveButton);

    var block = buildHistoryBlock(state.logs, removeLog);
    var history = block.node;

    body.appendChild(field);
    body.appendChild(saveRow);
    body.appendChild(history);

    saveButton.addEventListener("click", function () {
      if (pushLog(input.value)) {
        input.value = currentLogText();
        input.blur();
        block.first();
        block.render();
      }
    });
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        saveButton.click();
      }
    });

    openSheet({
      title: "签名日志",
      content: body,
      center: true,
      buttons: [{ label: "完成", variant: "primary", size: "sm", run: function () { closeSheet(); } }]
    });
  }

  /* ---------- 签名历史（左侧个签的留档） ---------- */

  function loadSigns() {
    return storageGet("signs", null).then(function (saved) {
      state.signs = Array.isArray(saved) ? saved.map(function (row) {
        return {
          text: String((row && row.text) || "").slice(0, 120),
          at: Number(row && row.at) || Date.now()
        };
      }).filter(function (row) { return row.text; }) : [];
    }).catch(function () { state.signs = []; });
  }

  function recordSign(value) {
    var text = String(value || "").trim().slice(0, 120);
    if (!text) return;
    if (state.signs.length && state.signs[0].text === text) return;
    state.signs.unshift({ text: text, at: Date.now() });
    if (state.signs.length > LOG_MAX) state.signs.length = LOG_MAX;
    storageSet("signs", state.signs).catch(function () {});
  }

  function openSignHistory() {
    if (!state.signs.length && state.profile.sign) {
      state.signs = [{ text: String(state.profile.sign).slice(0, 120), at: Date.now() }];
      storageSet("signs", state.signs).catch(function () {});
    }

    var block = buildHistoryBlock(state.signs, function (index) {
      state.signs.splice(index, 1);
      storageSet("signs", state.signs).catch(function () {});
    }, true, function (row) {
      return row.text === DEFAULT_PROFILE.sign ? "[Default]" : "";
    });

    openSheet({
      title: "历史签名",
      content: block.node,
      center: true,
      buttons: [{ label: "完成", variant: "primary", size: "sm", run: function () { closeSheet(); } }]
    });
  }

  /* ---------- 壁纸（Light / Dark + 柔焦） ---------- */

  var WALLPAPERS = {
    light: { src: "./assets/wallpaper-yang.jpg", thumb: "./assets/wp-thumb-light.jpg", label: "Light", note: "伦敦夜景" },
    dark: { src: "./assets/wallpaper.jpg", thumb: "./assets/wp-thumb-dark.jpg", label: "Dark", note: "日漫黄昏" }
  };

  var WP_BLUR_DEFAULT = { light: 4, dark: 0 };
  var WP_BLUR_MAX = 20;
  var WP_BLUR_RATIO = 1.2;
  var WP_THUMB_SCALE = 0.25;

  var WP_MODES = ["dark", "light", "random"];
  var interactionController = null;
  var wallpaperLoadRevision = 0;
  var probabilityWriteQueue = Promise.resolve();

  function probabilityValue(value) {
    return typeof value === "number" && isFinite(value)
      ? Math.round(Math.max(0, Math.min(1, value)) * 100) / 100 : 0.5;
  }

  function syncProbabilityPanel() {
    var slider = $("wallpaperProbability");
    if (!slider) return;
    var light = Math.round(state.wallpaperProbability.light * 100);
    var dark = 100 - light;
    slider.value = String(light);
    slider.disabled = !state.wallpaperProbabilityReady;
    slider.setAttribute("aria-valuetext", "Light " + light + "%，Dark " + dark + "%");
    slider.style.setProperty("--probability-light", light + "%");
    $("wallpaperProbabilityValue").textContent = "Light " + light + "% · Dark " + dark + "%";
    $("wallpaperInteractionNote").textContent = "代号：交互 功能当前获得的下一次随机概率为 " + light + ":" + dark;
    var source = state.wallpaperProbability.source === "interaction" ? "交互生成"
      : state.wallpaperProbability.source === "manual" ? "手动设置" : "初始比例";
    $("wallpaperProbabilityStatus").textContent = !state.wallpaperProbabilityReady ? "正在读取比例…"
      : source + " · " + (wpMode() === "random" ? "下次随机生效" : "开启随机后生效");
  }

  function setWallpaperProbability(value, options) {
    if (!state.wallpaperProbabilityReady) return;
    var opts = options || {};
    state.wallpaperProbability = {
      version: 1,
      light: probabilityValue(value),
      source: opts.source === "interaction" ? "interaction" : "manual",
      updatedAt: Date.now()
    };
    syncProbabilityPanel();
    if (!opts.commit) return;
    var snapshot = Object.assign({}, state.wallpaperProbability);
    localSet("wallpaperProbability", snapshot);
    var nativeStorage = api() && api().storage;
    // Native writes are serialized; an older slow write cannot overwrite a newer gesture.
    // Save the preview backup immediately; queued older native writes must not rewind it.
    probabilityWriteQueue = probabilityWriteQueue.then(function () {
      if (nativeStorage && typeof nativeStorage.set === "function") {
        return nativeStorage.set("wallpaperProbability", snapshot);
      }
    }).catch(function () {
      toast("随机比例尚未保存成功，请再调整一次");
    });
  }

  function refreshInteraction() {
    if (interactionController) interactionController.refresh();
  }

  function mountInteraction() {
    if (interactionController || !window.AiraInteraction) return;
    interactionController = window.AiraInteraction.mount({
      count: state.interactionCount,
      getProbability: function () { return state.wallpaperProbability.light; },
      setProbability: setWallpaperProbability,
      isReady: function () { return state.wallpaperProbabilityReady && state.interactionSettingsReady; },
      isPaused: function () {
        return !el.sheetRoot.hidden || !!(editRoot && !editRoot.root.hidden);
      }
    });
  }

  function wpMode() {
    var value = state.wallpaper;
    if (value === "yin") value = "dark";
    if (value === "yang") value = "light";
    return WP_MODES.indexOf(value) >= 0 ? value : "dark";
  }

  function wpRoll() {
    return Math.random() < state.wallpaperProbability.light ? "light" : "dark";
  }

  function wpSide() {
    var mode = wpMode();
    if (mode === "random") return state.wallpaperRolled === "light" ? "light" : "dark";
    return mode;
  }

  function wpBlurPercent(side) {
    var value = state.wallpaperBlur[side];
    return typeof value === "number" ? value : WP_BLUR_DEFAULT[side];
  }

  function wpBlurPx(side) {
    return Math.round(wpBlurPercent(side) * WP_BLUR_RATIO * 10) / 10;
  }

  function applyWallpaper() {
    var side = wpSide();
    var url = 'url("' + WALLPAPERS[side].src + '")';
    try {
      document.body.style.backgroundImage = url;
      if (el.wpImg) el.wpImg.style.backgroundImage = url;
    } catch (error) {
      /* 忽略 */
    }
    try {
      document.documentElement.style.setProperty("--wp-blur", wpBlurPx(side) + "px");
    } catch (error) {
      /* 忽略 */
    }
    if (el.wallpaperBtn) {
      var mode = wpMode();
      var label = mode === "random"
        ? "壁纸：随机（这次抽到 " + (side === "light" ? "Light" : "Dark") + "）"
        : (side === "light" ? "壁纸：Light" : "壁纸：Dark");
      el.wallpaperBtn.classList.toggle("yang", side === "light");
      el.wallpaperBtn.classList.toggle("random", mode === "random");
      el.wallpaperBtn.setAttribute("aria-pressed", mode === "random" ? "mixed" : "false");
      el.wallpaperBtn.title = label + "（点一下切换 · 长按细调）";
    }
    syncProbabilityPanel();
  }

  function saveWallpaper() {
    storageSet("wallpaper", state.wallpaper).catch(function () {});
    storageSet("wallpaperBlur", state.wallpaperBlur).catch(function () {});
  }

  function loadWallpaper() {
    var revision = ++wallpaperLoadRevision;
    state.wallpaperProbabilityReady = false;
    state.interactionSettingsReady = false;
    syncInteractionPanel();
    syncProbabilityPanel();
    refreshInteraction();
    return Promise.all([
      storageGet("wallpaper", null),
      storageGet("wallpaperBlur", null),
      storageGet("wallpaperProbability", null),
      storageGet("interactionSettings", null)
    ]).then(function (settings) {
      if (revision !== wallpaperLoadRevision) return;
      var saved = settings[0];
      var savedBlur = settings[1];
      var savedProbability = settings[2];
      state.interactionDefaultCount = interactionCountValue(settings[3] && settings[3].defaultCount);
      state.interactionCount = state.interactionDefaultCount;
      if (interactionController) interactionController.setCount(state.interactionCount);
      state.wallpaperProbability = {
        version: 1,
        light: probabilityValue(savedProbability && savedProbability.light),
        source: savedProbability && (savedProbability.source === "manual" || savedProbability.source === "interaction")
          ? savedProbability.source : "default",
        updatedAt: savedProbability && typeof savedProbability.updatedAt === "number" ? savedProbability.updatedAt : 0
      };
      if (saved === "yin") saved = "dark";
      if (saved === "yang") saved = "light";
      if (saved === "light" || saved === "dark" || saved === "random") state.wallpaper = saved;
      // Restore the actual probability before the first draw, including delayed native storage.
      if (wpMode() === "random") state.wallpaperRolled = wpRoll();
      if (savedBlur && typeof savedBlur === "object") {
        ["light", "dark"].forEach(function (side) {
          if (typeof savedBlur[side] === "number") state.wallpaperBlur[side] = savedBlur[side];
        });
      }
      // 一次性迁移：Light 的旧默认 5% → 新默认 4%
      if (state.wallpaperBlur.light === 5) {
        state.wallpaperBlur.light = WP_BLUR_DEFAULT.light;
        storageSet("wallpaperBlur", state.wallpaperBlur).catch(function () {});
      }
      state.wallpaperProbabilityReady = true;
      state.interactionSettingsReady = true;
      syncInteractionPanel();
      applyWallpaper();
      refreshInteraction();
    }).catch(function () {
      if (revision !== wallpaperLoadRevision) return;
      state.wallpaperProbabilityReady = true;
      state.interactionSettingsReady = true;
      syncInteractionPanel();
      applyWallpaper();
      refreshInteraction();
    });
  }

  /* ---------- 代号：交互 ---------- */

  function interactionCountValue(value) {
    return typeof value === "number" && isFinite(value) ? Math.max(0, Math.min(49, Math.round(value))) : 2;
  }

  function syncInteractionPanel() {
    var button = $("btnInteraction");
    var enabled = state.interactionSettingsReady && state.interactionCount > 0;
    button.classList.toggle("is-enabled", enabled);
    button.title = "代号：交互 · " + state.interactionCount + " 枚浮光";
    var slider = $("interactionCount");
    if (!slider) return;
    slider.value = String(state.interactionCount);
    slider.disabled = !state.interactionSettingsReady;
    slider.setAttribute("aria-valuetext", state.interactionCount + " 枚浮光");
    $("interactionCountValue").textContent = state.interactionCount + " 枚";
    $("interactionDefaultValue").textContent = "当前默认值：" + state.interactionDefaultCount;
    var save = $("interactionSaveDefault");
    save.hidden = state.interactionCount === state.interactionDefaultCount && !state.interactionDefaultSaving;
    save.disabled = !state.interactionSettingsReady || state.interactionDefaultSaving;
    save.textContent = state.interactionDefaultSaving ? "保存中…" : "设为默认";
    $("interactionCountHint").textContent = !state.interactionSettingsReady ? "正在读取默认数量…"
      : state.interactionCount === 0 ? "浮光已收起。仍可在这里调整随机比例。" : "即时调整本次数量；设为默认后，下次进入主页沿用。";
  }

  function saveInteractionDefault() {
    if (!state.interactionSettingsReady || state.interactionDefaultSaving) return;
    var count = state.interactionCount;
    state.interactionDefaultSaving = true;
    syncInteractionPanel();
    storageSet("interactionSettings", { version: 1, defaultCount: count }).then(function () {
      state.interactionDefaultCount = count;
      toast("默认数量已设为 " + count);
    }).catch(function () {
      toast("默认数量尚未保存成功，请重试");
    }).then(function () {
      state.interactionDefaultSaving = false;
      syncInteractionPanel();
    });
  }

  function buildProbabilityBlock() {
    var probabilityBlock = document.createElement("section");
    probabilityBlock.className = "wp-probability";
    var probabilityHead = document.createElement("div");
    probabilityHead.className = "wp-probability-head";
    var probabilityLabel = document.createElement("label");
    probabilityLabel.htmlFor = "wallpaperProbability";
    probabilityLabel.textContent = "随机比例";
    var probabilityValueLabel = document.createElement("span");
    probabilityValueLabel.id = "wallpaperProbabilityValue";
    probabilityHead.appendChild(probabilityLabel);
    probabilityHead.appendChild(probabilityValueLabel);
    var probabilityTrack = document.createElement("div");
    probabilityTrack.className = "wp-probability-track";
    var darkLabel = document.createElement("span");
    darkLabel.textContent = "Dark";
    var probabilityRange = document.createElement("input");
    probabilityRange.id = "wallpaperProbability";
    probabilityRange.className = "wp-range wp-probability-range";
    probabilityRange.type = "range";
    probabilityRange.min = "0";
    probabilityRange.max = "100";
    probabilityRange.step = "1";
    var lightLabel = document.createElement("span");
    lightLabel.textContent = "Light";
    probabilityTrack.appendChild(darkLabel);
    probabilityTrack.appendChild(probabilityRange);
    probabilityTrack.appendChild(lightLabel);
    var probabilityStatus = document.createElement("p");
    probabilityStatus.id = "wallpaperProbabilityStatus";
    probabilityStatus.className = "wp-probability-status";
    var probabilityNote = document.createElement("p");
    probabilityNote.id = "wallpaperInteractionNote";
    probabilityNote.className = "wp-interaction-note";
    probabilityBlock.appendChild(probabilityHead);
    probabilityBlock.appendChild(probabilityTrack);
    probabilityBlock.appendChild(probabilityStatus);
    probabilityBlock.appendChild(probabilityNote);
    probabilityRange.addEventListener("input", function () {
      setWallpaperProbability(Number(probabilityRange.value) / 100, { source: "manual", commit: false });
    });
    probabilityRange.addEventListener("change", function () {
      setWallpaperProbability(Number(probabilityRange.value) / 100, { source: "manual", commit: true });
    });

    return probabilityBlock;
  }

  function openInteractionPanel() {
    var body = document.createElement("div");
    body.className = "interaction-panel";
    var countBlock = document.createElement("section");
    countBlock.className = "interaction-count";
    var head = document.createElement("div");
    head.className = "wp-probability-head";
    var label = document.createElement("label");
    label.htmlFor = "interactionCount";
    label.textContent = "浮光数量";
    var defaultValue = document.createElement("span");
    defaultValue.id = "interactionDefaultValue";
    head.appendChild(label); head.appendChild(defaultValue);
    var track = document.createElement("div");
    track.className = "interaction-count-track";
    var slider = document.createElement("input");
    slider.id = "interactionCount";
    slider.className = "wp-range";
    slider.type = "range"; slider.min = "0"; slider.max = "49"; slider.step = "1";
    var value = document.createElement("output");
    value.id = "interactionCountValue";
    value.htmlFor = "interactionCount";
    var save = document.createElement("button");
    save.id = "interactionSaveDefault";
    save.className = "btn sm interaction-save";
    save.type = "button"; save.hidden = true;
    save.textContent = "设为默认";
    save.addEventListener("click", saveInteractionDefault);
    track.appendChild(slider); track.appendChild(value); track.appendChild(save);
    var ends = document.createElement("div");
    ends.className = "interaction-count-ends";
    var zero = document.createElement("span"), max = document.createElement("span");
    zero.textContent = "0"; max.textContent = "49";
    ends.appendChild(zero); ends.appendChild(max);
    var hint = document.createElement("p");
    hint.id = "interactionCountHint";
    hint.className = "interaction-count-hint";
    countBlock.appendChild(head); countBlock.appendChild(track); countBlock.appendChild(ends); countBlock.appendChild(hint);
    slider.addEventListener("input", function () {
      if (!state.interactionSettingsReady) return;
      state.interactionCount = interactionCountValue(Number(slider.value));
      if (interactionController) interactionController.setCount(state.interactionCount);
      syncInteractionPanel();
    });
    body.appendChild(countBlock);
    body.appendChild(buildProbabilityBlock());

    var explanation = document.createElement("details");
    explanation.className = "interaction-algorithm";
    var summary = document.createElement("summary");
    summary.textContent = "黑箱里，灵感怎样发生";
    explanation.appendChild(summary);
    var copy = document.createElement("div");
    copy.className = "interaction-algorithm-copy";
    [
      ["一张看不见的地形", "拖动浮光，在隐形势场中改变 Light / Dark 的倾向。方向是主线，局部的弯曲与起伏带来一点难以预料。"],
      ["距离、绕行与碰撞", "每次拖动会选定最近的一枚作为参照：拉开、聚拢、顺逆绕行，以及对方被推动的位移，都参与比例变化。多枚浮光彼此碰撞；只有一枚时，由势场决定。"],
      ["轻拨之后，安静落定", "比例从当前设置出发，随手势变化，松手时保存。自然游动与松手后的惯性只负责氛围；手动滑轨与拖动共用同一个比例。"],
      ["一点可知的黑箱", "势场、距离、旋转、连带位移的系数为 62 / 20 / 13 / 5。它把动作映射为抽签权重，不是训练模型，也不猜测心情。68:32 表示下一次随机时 Light / Dark 的机会；有限次结果不必恰好符合这个比例。"]
    ].forEach(function (entry) {
      var paragraph = document.createElement("p"), title = document.createElement("b");
      title.textContent = entry[0];
      paragraph.appendChild(title);
      paragraph.appendChild(document.createTextNode(entry[1]));
      copy.appendChild(paragraph);
    });
    explanation.appendChild(copy); body.appendChild(explanation);
    openSheet({ title: "代号：交互", content: body, center: true, wide: true, interaction: true,
      buttons: [{ label: "完成", variant: "primary", size: "sm", run: function () { closeSheet(); } }] });
    $("btnInteraction").setAttribute("aria-expanded", "true");
    syncInteractionPanel(); syncProbabilityPanel();
  }

  function openWallpaperPanel() {
    var body = document.createElement("div");
    body.className = "wp-panel";

    var picks = document.createElement("div");
    picks.className = "wp-picks";

    var blurRow = document.createElement("div");
    blurRow.className = "wp-blurrow";
    var blurLabel = document.createElement("span");
    blurLabel.className = "wp-label";
    blurLabel.textContent = "柔焦";
    var range = document.createElement("input");
    range.type = "range";
    range.className = "wp-range";
    range.min = "0";
    range.max = String(WP_BLUR_MAX);
    range.step = "1";
    var value = document.createElement("span");
    value.className = "wp-value";
    blurRow.appendChild(blurLabel);
    blurRow.appendChild(range);
    blurRow.appendChild(value);

    var modeNote = document.createElement("p");
    modeNote.className = "wp-mode-note";

    var randomSwitch = document.createElement("button");
    randomSwitch.type = "button";
    randomSwitch.className = "wp-random";
    randomSwitch.setAttribute("aria-label", "随机壁纸开关");
    var randomText = document.createElement("span");
    randomText.textContent = "随机";
    var track = document.createElement("i");
    track.className = "wp-track";
    var knob = document.createElement("i");
    knob.className = "wp-knob";
    track.appendChild(knob);
    randomSwitch.appendChild(randomText);
    randomSwitch.appendChild(track);

    body.appendChild(randomSwitch);
    body.appendChild(modeNote);
    body.appendChild(picks);
    body.appendChild(blurRow);

    var thumbs = {};

    function paintThumbs() {
      ["light", "dark"].forEach(function (side) {
        var node = thumbs[side];
        if (node) node.style.filter = "blur(" + (wpBlurPercent(side) * WP_BLUR_RATIO * WP_THUMB_SCALE).toFixed(2) + "px)";
      });
    }

    function syncRandom() {
      var on = wpMode() === "random";
      randomSwitch.setAttribute("aria-pressed", on ? "true" : "false");
      randomSwitch.classList.toggle("lower", on);
    }

    randomSwitch.addEventListener("click", function () {
      if (wpMode() === "random") {
        state.wallpaper = wpSide();
        state.wallpaperRolled = state.wallpaper;
      } else {
        // 在面板里开启随机时，保持当前这张不动（避免背景在眼前反复换）；
        // 下次进入主页才重新掷。
        var keep = wpSide();
        state.wallpaper = "random";
        state.wallpaperRolled = keep;
      }
      applyWallpaper();
      saveWallpaper();
      refresh();
      syncBlur();
      syncRandom();
    });

    function syncBlur() {
      var percent = wpBlurPercent(wpSide());
      range.value = String(percent);
      value.textContent = percent + "%";
    }

    function refresh() {
      picks.textContent = "";
      ["light", "dark"].forEach(function (side) {
        var item = WALLPAPERS[side];
        var card = document.createElement("button");
        card.type = "button";
        card.className = "wp-pick" + (wpSide() === side ? " on" : "");
        var img = document.createElement("img");
        img.className = "wp-thumb";
        img.alt = "";
        img.src = item.thumb;
        thumbs[side] = img;
        var cap = document.createElement("span");
        cap.className = "cap";
        var name = document.createElement("b");
        name.textContent = item.label;
        var note = document.createElement("span");
        note.textContent = item.note;
        cap.appendChild(name);
        cap.appendChild(note);
        card.appendChild(img);
        card.appendChild(cap);
        card.addEventListener("click", function () {
          state.wallpaper = side;
          state.wallpaperRolled = side;
          applyWallpaper();
          saveWallpaper();
          refresh();
          syncBlur();
        });
        picks.appendChild(card);
      });
      paintThumbs();
      syncRandom();
      modeNote.hidden = wpMode() !== "random";
      modeNote.textContent = "随机模式 · 这次抽到 " + (wpSide() === "light" ? "Light" : "Dark");
    }

    range.addEventListener("input", function () {
      state.wallpaperBlur[wpSide()] = Number(range.value) || 0;
      value.textContent = state.wallpaperBlur[wpSide()] + "%";
      applyWallpaper();
      paintThumbs();
    });
    range.addEventListener("change", saveWallpaper);

    openSheet({
      title: "壁纸",
      content: body,
      center: true,
      wide: true,
      buttons: [{ label: "完成", variant: "primary", size: "sm", run: function () { closeSheet(); } }]
    });
    refresh();
    syncBlur();
    syncRandom();
  }

  function bindWallpaper() {
    var node = el.wallpaperBtn;
    if (!node) return;
    var timer = null;
    var fired = false;

    node.addEventListener("pointerdown", function (event) {
      if (event.button && event.button !== 0) return;
      fired = false;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        fired = true;
        openWallpaperPanel();
      }, 480);
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach(function (name) {
      node.addEventListener(name, function () {
        if (timer) { clearTimeout(timer); timer = null; }
      });
    });

    node.addEventListener("click", function (event) {
      if (fired) {
        fired = false;
        event.preventDefault();
        return;
      }
      if (!event.detail) {
        openWallpaperPanel();
        return;
      }
      if (!state.wallpaperProbabilityReady) return;
      var next = WP_MODES[(WP_MODES.indexOf(wpMode()) + 1) % WP_MODES.length];
      state.wallpaper = next;
      if (next === "random") state.wallpaperRolled = wpRoll();
      applyWallpaper();
      saveWallpaper();
    });
  }

  function bindDailyLog() {
    var node = el.dailyLog;
    if (!node) return;
    var timer = null;
    var fired = false;

    node.addEventListener("pointerdown", function (event) {
      if (event.button && event.button !== 0) return;
      fired = false;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        fired = true;
        openLogEditor();
      }, 480);
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach(function (name) {
      node.addEventListener(name, function () {
        if (timer) { clearTimeout(timer); timer = null; }
      });
    });

    node.addEventListener("click", function (event) {
      if (fired) {
        fired = false;
        event.preventDefault();
        return;
      }
      if (!event.detail) openLogEditor();
    });
  }

  function bindInteractions() {
    if (iconsBound) return;
    iconsBound = true;

    bindDailyLog();
    bindWallpaper();
    mountInteraction();

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

    $("btnInteraction").addEventListener("click", openInteractionPanel);

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
      loadLogs();
      loadSigns();
      loadWallpaper();
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
    loadLogs();
    loadSigns();
    loadWallpaper();
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
      toast: $("toast"),
      dailyLog: $("dailyLog"),
      wallpaperBtn: $("btnWallpaper"),
      wpImg: $("wpImg")
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
