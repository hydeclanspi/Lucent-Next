(function () {
  "use strict";

  var root = document.documentElement;
  var api = function () { return window.AiraHome || null; };

  var DEFAULT_PROFILE = {
    name: "hydeclanspi",
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
    interactionReadError: false,
    interactionDefaultSaving: false,
    interactionSaveStatus: "",
    defaultsBusy: false,
    defaultsStatus: "",
    collision: { version: 2, strength: 1, randomOnLaunch: false },
    collisionCurrent: 1,
    collisionReady: false,
    collisionReadError: false,
    collisionSaveStatus: "",
    naturalPace: 1,
    paceReady: false,
    paceReadError: false,
    paceSaveStatus: "",
    collisionDefault: { strength: 1, randomOnLaunch: false },
    paceDefault: 1,
    probabilityDefault: 0.5,
    probabilityDefaultReady: false,
    probabilityDefaultReadError: false,
    probabilityDefaultSaveStatus: "",
    factoryBusy: false,
    factoryStatus: "",
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

  var statsStore = null, statsController = null, statsParent = null, defaultsParent = null;

  function initStats() {
    if (!window.AiraStatsStore) return;
    var native = api(), previous = statsStore;
    if (previous) previous.flush().then(function () { previous.destroy(); });
    // Preview statistics stay separate. Native read errors must never look like an empty history.
    var storage = native && native.storage ? {
      get: function (key, fallback) { return native.storage.get(key, fallback); },
      set: function (key, value) { return native.storage.set(key, value); }
    } : {
      get: function (key, fallback) { return Promise.resolve().then(function () {
        var raw = window.localStorage.getItem('aira-profile-card:preview-stats:' + key);
        return raw == null ? fallback : JSON.parse(raw);
      }); },
      set: function (key, value) { return Promise.resolve().then(function () {
        window.localStorage.setItem('aira-profile-card:preview-stats:' + key, JSON.stringify(value));
      }); }
    };
    statsStore = window.AiraStatsStore.create({ storage: storage });
    if (statsController) { statsController.destroy(); statsController = window.AiraStatsPanel.mount(el.sheet, { store: statsStore, onBack: closeSheet }); }
  }

  function recordStats(event) { if (statsStore) statsStore.record(event); }

  function openStatsPanel() {
    if (!statsStore || !window.AiraStatsPanel) return;
    var parent = { nodes: Array.from(el.sheet.childNodes), classes: el.sheet.className, scroll: el.sheet.scrollTop, label: el.sheet.getAttribute('aria-label') };
    openSheet({ title: '历史统计', center: true, wide: true, stats: true });
    statsParent = parent;
    statsController = window.AiraStatsPanel.mount(el.sheet, { store: statsStore, onBack: closeSheet });
    el.sheet.querySelector('.stats-back').focus({ preventScroll: true });
  }

  function setBackActive(active) {
    var a = api();
    if (a && typeof a.setBackHandlerActive === "function") {
      try { a.setBackHandlerActive(active); } catch (error) {}
    }
  }

  function openSheet(options) {
    var sheet = el.sheet;
    if (statsController) { statsController.destroy(); statsController = null; }
    statsParent = null; defaultsParent = null;
    sheet.textContent = "";
    sheet.classList.toggle("stats-sheet", !!options.stats);
    sheet.classList.toggle("defaults-sheet", !!options.defaults);
    sheet.setAttribute("aria-label", options.title || "操作面板");
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
      var titleGroup = document.createElement("div");
      titleGroup.className = "interaction-title-group";
      var engineSubtitle = document.createElement("p");
      engineSubtitle.className = "wp-mode-note interaction-engine-subtitle";
      engineSubtitle.textContent = "beta v0.7 引擎 · 26-10";
      titleGroup.appendChild(title);
      titleGroup.appendChild(engineSubtitle);
      var subtitle = document.createElement("div");
      subtitle.className = "interaction-subtitle";
      var motto = document.createElement("span");
      motto.textContent = "灵感与犀利并存";
      var identity = document.createElement("span");
      identity.textContent = "鸿蒙hydeclanspi灵感台";
      subtitle.appendChild(motto);
      subtitle.appendChild(identity);
      heading.appendChild(titleGroup);
      heading.appendChild(subtitle);
      sheet.appendChild(heading);
      var toolbar = document.createElement("div");
      toolbar.className = "interaction-toolbar";
      var toolbarActions = document.createElement("div");
      toolbarActions.className = "interaction-toolbar-actions";
      var drive = document.createElement("button");
      drive.id = "btnPanelAutoDrive"; drive.type = "button";
      drive.className = "icon-btn auto-drive-button auto-drive-panel";
      drive.innerHTML = '<span class="auto-drive-mark fsd-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M6.2 19.2 V4.8 H13 M6.2 11.5 H11" stroke-width="1.7"/><path d="M18.9 5.3c-.5-.9-2-1-2.6-.2-.5.7 0 1.4 1.1 1.8 1.3.5 1.8 1.1 1.3 2-.6.9-2.2.8-2.8-.2" stroke-width="1.2"/><path d="M14.9 14.3v5m0-5h.9c1.8 0 2.9 1.1 2.9 2.5s-1.1 2.5-2.9 2.5h-.9" stroke-width="1.2"/><circle cx="13.6" cy="11.5" r="1.05" fill="currentColor" stroke="none"/></svg></span><span class="auto-drive-word" aria-hidden="true">Drive</span>';
      drive.addEventListener("click", toggleAutoDrive);
      toolbarActions.appendChild(drive);
      var statistics = document.createElement("button");
      statistics.id = "btnInteractionStats"; statistics.type = "button";
      statistics.className = "interaction-stats-launcher";
      statistics.setAttribute("aria-haspopup", "dialog");
      statistics.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5v15h16M7 14l4-5 4 3 5-7"/></svg><span>历史统计</span>';
      statistics.addEventListener("click", openStatsPanel);
      toolbarActions.appendChild(statistics);
      toolbar.appendChild(toolbarActions);
      var factoryBar = document.createElement("div"); factoryBar.className = "interaction-factory-bar";
      var defaults = document.createElement("button"); defaults.id = "interactionDefaults"; defaults.type = "button"; defaults.className = "btn sm"; defaults.textContent = "设默认值";
      defaults.setAttribute("aria-haspopup", "dialog"); defaults.addEventListener("click", openDefaultsPanel);
      factoryBar.appendChild(defaults);
      toolbar.appendChild(factoryBar);
      sheet.appendChild(toolbar);
    } else if (!options.stats && !options.defaults) sheet.appendChild(title);

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

    sheet.scrollTop = 0;
    el.sheetRoot.hidden = false;
    setBackActive(true);
    refreshInteraction();
  }

  function closeSheet() {
    if (statsParent || defaultsParent) {
      var isDefaults = !!defaultsParent, parent = defaultsParent || statsParent; statsParent = null; defaultsParent = null;
      if (statsController) { statsController.destroy(); statsController = null; }
      el.sheet.textContent = '';
      parent.nodes.forEach(function (node) { el.sheet.appendChild(node); });
      el.sheet.className = parent.classes; el.sheet.scrollTop = parent.scroll;
      el.sheet.setAttribute('aria-label', parent.label);
      $("btnInteraction").setAttribute('aria-expanded', 'true');
      syncInteractionPanel(); syncProbabilityPanel(); syncCollisionPanel(); syncPacePanel(); syncAutoDriveButton(); syncFactoryPanel();
      $(isDefaults ? "interactionDefaults" : "btnInteractionStats").focus({ preventScroll: true });
      return;
    }
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

  var BUNDLED_HISTORY = {
    logs: [{ bundledId: "31-log-1", text: "wilson vibes only.", at: new Date(2026, 8, 27, 9, 1, 17).getTime(), atLabel: "2026.09.27 09:01:17" }],
    signs: [
      { bundledId: "31-sign-1", text: "我真的是活着玩的。都别压力我。", at: new Date(2026, 8, 28, 11, 49, 36).getTime(), atLabel: "2026.09.28 11:49:36" },
      { bundledId: "31-sign-2", text: "把今天过成想要的样子。", at: new Date(2026, 8, 27, 8, 36, 30).getTime(), atLabel: "2026.09.27 08:36:30" }
    ]
  };
  var historyLoadRevisions = {};
  var historyWriteQueues = {};

  function persistHistory(key, rows) {
    var snapshot = rows.map(function (row) { return Object.assign({}, row); });
    var nativeStorage = api() && api().storage;
    localSet(key, snapshot);
    localSet(key + "BundleVersion", 31);
    // Migration and later deletion/edit writes share one ordered queue per collection.
    var queue = (historyWriteQueues[key] || Promise.resolve()).catch(function () {}).then(function () {
      if (nativeStorage && typeof nativeStorage.set === "function") {
        return nativeStorage.set(key, snapshot).then(function () { return nativeStorage.set(key + "BundleVersion", 31); });
      }
    });
    historyWriteQueues[key] = queue;
    return queue;
  }

  function loadBundledHistory(key) {
    var revision = (historyLoadRevisions[key] || 0) + 1;
    historyLoadRevisions[key] = revision;
    var seeds = BUNDLED_HISTORY[key];
    return Promise.all([storageGet(key, null), storageGet(key + "BundleVersion", 0)]).then(function (saved) {
      if (historyLoadRevisions[key] !== revision) return;
      var rows = Array.isArray(saved[0]) ? saved[0].map(function (row) {
        var result = { text: String((row && row.text) || "").slice(0, 120), at: Number(row && row.at) || Date.now() };
        var bundled = seeds.filter(function (seed) { return seed.bundledId === (row && row.bundledId); })[0];
        if (bundled) { result.bundledId = bundled.bundledId; result.atLabel = bundled.atLabel; }
        return result;
      }).filter(function (row) { return row.text; }) : [];
      if (key === "logs" && rows.length && rows[0].text === "hydecaside vibes only.") rows[0].text = LOG_DEFAULT;
      if (!(Number(saved[1]) >= 31)) {
        seeds.forEach(function (seed) {
          var match = rows.filter(function (row) {
            return row.bundledId === seed.bundledId || (row.text.replace(/\s/g, "") === seed.text.replace(/\s/g, "") && (row.atLabel || logDate(row.at)) === seed.atLabel);
          })[0];
          if (match) { match.bundledId = seed.bundledId; match.atLabel = seed.atLabel; }
          else rows.push(Object.assign({}, seed));
        });
        rows.sort(function (a, b) { return b.at - a.at; });
        persistHistory(key, rows).catch(function () {});
      }
      state[key] = rows;
    });
  }

  function loadLogs() {
    return loadBundledHistory("logs").then(paintDailyLog).catch(function () { paintDailyLog(); });
  }

  function pushLog(value) {
    var text = String(value || "").trim().slice(0, 120);
    if (!text) { toast("写点什么吧"); return false; }
    if (state.logs.length && state.logs[0].text === text) { toast("和上一句一样"); return false; }
    state.logs.unshift({ text: text, at: Date.now() });
    if (state.logs.length > LOG_MAX) state.logs.length = LOG_MAX;
    persistHistory("logs", state.logs).catch(function () {});
    paintDailyLog();
    return true;
  }

  function removeLog(index) {
    if (index < 0 || index >= state.logs.length) return;
    state.logs.splice(index, 1);
    if (!state.logs.length) state.logs = [{ text: LOG_DEFAULT, at: Date.now() }];
    persistHistory("logs", state.logs).catch(function () {});
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
    date.textContent = row.atLabel || logDate(row.at);
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
    return loadBundledHistory("signs").catch(function () {});
  }

  function recordSign(value) {
    var text = String(value || "").trim().slice(0, 120);
    if (!text) return;
    if (state.signs.length && state.signs[0].text === text) return;
    state.signs.unshift({ text: text, at: Date.now() });
    if (state.signs.length > LOG_MAX) state.signs.length = LOG_MAX;
    persistHistory("signs", state.signs).catch(function () {});
  }

  function openSignHistory() {
    if (!state.signs.length && state.profile.sign) {
      state.signs = [{ text: String(state.profile.sign).slice(0, 120), at: Date.now() }];
      persistHistory("signs", state.signs).catch(function () {});
    }

    var block = buildHistoryBlock(state.signs, function (index) {
      state.signs.splice(index, 1);
      persistHistory("signs", state.signs).catch(function () {});
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
    light: { src: "./assets/wallpaper-yang.jpg", thumb: "./assets/wallpaper-yang.jpg", label: "Light", note: "伦敦夜景" },
    dark: { src: "./assets/wallpaper.jpg", thumb: "./assets/wp-thumb-dark.jpg", label: "Dark", note: "日漫黄昏" }
  };

  var WP_BLUR_DEFAULT = { light: 4, dark: 0 };
  var WP_BLUR_MAX = 20;
  var WP_BLUR_RATIO = 1.2;
  var WP_THUMB_SCALE = 0.25;

  var WP_MODES = ["dark", "light", "random"];
  var interactionController = null;
  var autoDriveUI = { state: null, hideTimer: 0, fadeTimer: 0, pointerDown: false, keyboardFocus: false };
  var wallpaperLoadRevision = 0;
  var probabilityWriteQueue = Promise.resolve();

  function probabilityValue(value) {
    return typeof value === "number" && isFinite(value)
      ? Math.round(Math.max(0, Math.min(1, value)) * 100) / 100 : 0.5;
  }

  function syncProbabilityPanel() {
    syncDefaultsPanel();
    var slider = $("wallpaperProbability");
    if (!slider) return;
    var light = Math.round(state.wallpaperProbability.light * 100);
    var dark = 100 - light;
    slider.value = String(light);
    slider.disabled = !state.wallpaperProbabilityReady || !state.probabilityDefaultReady || state.probabilityDefaultReadError || state.factoryBusy;
    slider.setAttribute("aria-valuetext", "Light " + light + "%，Dark " + dark + "%");
    slider.style.setProperty("--probability-light", light + "%");
    $("wallpaperProbabilityValue").textContent = light + " : " + dark;
    $("wallpaperProbabilityValue").setAttribute("aria-label", "Light " + light + "%，Dark " + dark + "%");
    var interactionNote = $("wallpaperInteractionNote");
    interactionNote.textContent = "代号：交互 功能当前获得的下一次主图随机概率为 ";
    var noteRatio = document.createElement("b");
    noteRatio.textContent = light + " : " + dark;
    interactionNote.appendChild(noteRatio);
    var liveRatio = $("interactionAlgorithmRatio");
    if (liveRatio) liveRatio.textContent = light + ":" + dark;
    var source = state.wallpaperProbability.source === "interaction" ? "交互生成"
      : state.wallpaperProbability.source === "manual" ? "手动设置" : "初始比例";
    $("wallpaperProbabilityStatus").textContent = !state.wallpaperProbabilityReady ? "正在读取比例…"
      : state.probabilityDefaultReadError ? "默认比例暂未读出，请在「设默认值」中重试。"
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
    if (opts.source !== "interaction") recordStats({ source: "manual", light: state.wallpaperProbability.light });
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
    syncFactoryPanel();
  }

  function mountInteraction() {
    if (interactionController || !window.AiraInteraction) return;
    interactionController = window.AiraInteraction.mount({
      count: state.interactionCount,
      getProbability: function () { return state.wallpaperProbability.light; },
      setProbability: setWallpaperProbability,
      onActivity: recordStats,
      collisionStrength: state.collisionCurrent,
      naturalPace: state.naturalPace,
      onAutoDriveChange: syncAutoDriveButton,
      isReady: function () { return state.wallpaperProbabilityReady && state.interactionSettingsReady && state.collisionReady && state.paceReady && state.probabilityDefaultReady; },
      isPaused: function () {
        return !el.sheetRoot.hidden || !!(editRoot && !editRoot.root.hidden);
      }
    });
    syncAutoDriveButton();
  }

  function autoDriveState() {
    return interactionController && interactionController.getAutoDrive
      ? interactionController.getAutoDrive()
      : { enabled: false, rage: false, activeCount: 0, count: state.interactionCount, paused: true, unavailableReason: "not-ready" };
  }

  function clearAutoDriveTimers() {
    clearTimeout(autoDriveUI.hideTimer); clearTimeout(autoDriveUI.fadeTimer);
    autoDriveUI.hideTimer = 0; autoDriveUI.fadeTimer = 0;
  }

  function scheduleAutoDriveDismiss() {
    clearAutoDriveTimers();
    var button = $("btnAutoDrive");
    if (!button || button.hidden || autoDriveState().enabled || autoDriveUI.pointerDown || autoDriveUI.keyboardFocus) return;
    autoDriveUI.hideTimer = setTimeout(function () {
      autoDriveUI.hideTimer = 0;
      if (autoDriveState().enabled || autoDriveUI.pointerDown || autoDriveUI.keyboardFocus) return;
      button.classList.add("is-leaving");
      autoDriveUI.fadeTimer = setTimeout(function () {
        autoDriveUI.fadeTimer = 0;
        if (autoDriveState().enabled || autoDriveUI.pointerDown || autoDriveUI.keyboardFocus) return;
        if (document.activeElement === button) $("btnInteraction").focus({ preventScroll: true });
        button.hidden = true;
        button.classList.remove("is-leaving", "is-appearing");
      }, 240);
    }, 4250);
  }

  function revealAutoDrive() {
    var button = $("btnAutoDrive");
    if (!button) return;
    clearAutoDriveTimers();
    if (button.hidden) button.classList.add("is-appearing");
    button.hidden = false; button.classList.remove("is-leaving");
    syncAutoDriveButton();
    scheduleAutoDriveDismiss();
  }

  function syncAutoDriveButton(next) {
    var button = $("btnAutoDrive");
    if (!button) return;
    var mode = next || autoDriveState();
    var wasEnabled = autoDriveUI.state && autoDriveUI.state.enabled;
    autoDriveUI.state = mode;
    button.setAttribute("aria-pressed", mode.enabled ? "true" : "false");
    button.setAttribute("aria-disabled", !mode.enabled && !!mode.unavailableReason ? "true" : "false");
    button.classList.toggle("is-running", mode.enabled);
    button.classList.toggle("is-rage", !!mode.rage);
    button.classList.toggle("is-paused", mode.enabled && mode.paused);
    var label = !mode.enabled ? "开启自动驾驶"
      : mode.rage ? "自动驾驶增强 · " + mode.activeCount + " 枚主动浮光（再点关闭）" + (mode.paused ? " · 已暂停" : "")
      : "自动驾驶 · " + mode.activeCount + " 枚主动浮光（再点增强）" + (mode.paused ? " · 已暂停" : "");
    if (!mode.enabled && mode.unavailableReason) {
      label += " · " + ({ "empty": "请先添加浮光", "reduced-motion": "减少动态效果已开启", "layout": "当前布局没有足够的游动空间", "not-ready": "正在读取设置" }[mode.unavailableReason] || "暂不可用");
    }
    button.setAttribute("aria-label", label); button.title = label;
    var panelButton = $("btnPanelAutoDrive");
    if (panelButton) {
      panelButton.setAttribute("aria-pressed", String(mode.enabled));
      panelButton.setAttribute("aria-disabled", String(!mode.enabled && !!mode.unavailableReason));
      panelButton.setAttribute("aria-label", label); panelButton.title = label;
      panelButton.classList.toggle("is-running", mode.enabled);
      panelButton.classList.toggle("is-rage", !!mode.rage);
    }
    if (mode.enabled) {
      clearAutoDriveTimers(); button.hidden = false; button.classList.remove("is-leaving");
    } else if (wasEnabled) scheduleAutoDriveDismiss();
  }

  function toggleAutoDrive() {
      var current = autoDriveState();
      if (!current.enabled && current.unavailableReason) {
        toast(({ "empty": "先添加一枚浮光，再开启自动驾驶", "reduced-motion": "减少动态效果已开启，自动驾驶暂不可用", "layout": "当前布局没有足够的游动空间", "not-ready": "正在读取设置，请稍候" })[current.unavailableReason] || "自动驾驶暂不可用");
      } else if (interactionController && interactionController.setAutoDrive) {
        interactionController.setAutoDrive(!current.enabled ? true : current.rage ? false : "rage");
      }
      syncAutoDriveButton(); scheduleAutoDriveDismiss();
  }

  function bindAutoDrive() {
    var button = $("btnAutoDrive");
    button.addEventListener("pointerdown", function () {
      autoDriveUI.pointerDown = true; autoDriveUI.keyboardFocus = false;
      clearAutoDriveTimers(); button.classList.remove("is-leaving");
    });
    function release() {
      if (!autoDriveUI.pointerDown) return;
      autoDriveUI.pointerDown = false; scheduleAutoDriveDismiss();
    }
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    button.addEventListener("focus", function () {
      autoDriveUI.keyboardFocus = !autoDriveUI.pointerDown;
      clearAutoDriveTimers(); button.classList.remove("is-leaving");
    });
    button.addEventListener("blur", function () { autoDriveUI.keyboardFocus = false; scheduleAutoDriveDismiss(); });
    button.addEventListener("click", toggleAutoDrive);
    window.addEventListener("blur", release);
    window.addEventListener("pagehide", function () {
      clearAutoDriveTimers(); autoDriveUI.pointerDown = false; autoDriveUI.keyboardFocus = false;
      if (!autoDriveState().enabled) { button.hidden = true; button.classList.remove("is-leaving"); }
    });
    window.addEventListener("pageshow", function () { syncAutoDriveButton(); scheduleAutoDriveDismiss(); });
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
    state.interactionSettingsReady = false; state.interactionReadError = false;
    syncInteractionPanel();
    syncProbabilityPanel();
    refreshInteraction();
    return Promise.all([
      storageGet("wallpaper", null),
      storageGet("wallpaperBlur", null),
      storageGet("wallpaperProbability", null),
      readInteractionSetting("interactionSettings").catch(function () { state.interactionReadError = true; return null; })
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
      return loadProbabilityDefault().then(function () { if (revision !== wallpaperLoadRevision) return; if (wpMode() === "random") state.wallpaperRolled = wpRoll(); applyWallpaper(); refreshInteraction(); });
    }).catch(function () {
      if (revision !== wallpaperLoadRevision) return;
      state.wallpaperProbabilityReady = true;
      state.interactionSettingsReady = true;
      syncInteractionPanel();
      return loadProbabilityDefault().then(function () { applyWallpaper(); refreshInteraction(); });
    });
  }

  /* ---------- 代号：交互 ---------- */

  var FACTORY_INTERACTION = Object.freeze({ count: 2, light: 0.63, strength: 11.6, randomOnLaunch: false, pace: 2.41 });

  // Current values and startup defaults stay separate. These four groups share
  // the existing storage keys, so opening the manager never migrates or writes data.
  function defaultGroups() {
    return [
      { key: "count", name: "浮光数量", description: "进入主页时出现的浮光数量，0 枚可收起浮光。",
        current: state.interactionCount + " 枚", saved: state.interactionDefaultCount + " 枚",
        ready: state.interactionSettingsReady, error: state.interactionReadError, status: state.interactionSaveStatus,
        saveId: "interactionSaveDefault", save: saveInteractionDefault, retry: retryCountDefault },
      { key: "probability", name: "主图随机比例", description: "Light / Dark 的抽取权重，仅在主图随机模式下生效。",
        current: ratioLabel(state.wallpaperProbability.light), saved: ratioLabel(state.probabilityDefault),
        ready: state.probabilityDefaultReady && state.wallpaperProbabilityReady, error: state.probabilityDefaultReadError, status: state.probabilityDefaultSaveStatus,
        saveId: "probabilitySaveDefault", save: saveProbabilityDefault, retry: loadProbabilityDefault },
      { key: "collision", name: "碰撞力度", description: "保存力度与启动策略。启用随机时，每次启动或恢复此默认都会重新抽取力度。",
        current: collisionLabel(state.collisionCurrent), saved: collisionLabel(state.collisionDefault.strength),
        currentDetail: state.collision.randomOnLaunch ? "启动随机 · 1–24×" : "固定力度",
        savedDetail: state.collisionDefault.randomOnLaunch ? "启动随机 · 此值作固定备用" : "固定力度",
        ready: state.collisionReady, error: state.collisionReadError, status: state.collisionSaveStatus,
        saveId: "collisionSaveDefault", save: saveCollisionSettings, retry: loadCollisionSettings },
      { key: "pace", name: "自然 pace", description: "自然漂浮的节奏，0.25–16×；自动驾驶的追逐速率独立保持。",
        current: paceLabel(state.naturalPace), saved: paceLabel(state.paceDefault),
        ready: state.paceReady, error: state.paceReadError, status: state.paceSaveStatus,
        saveId: "paceSaveDefault", save: savePaceSettings, retry: loadPaceSettings }
    ];
  }
  function ratioLabel(light) { return Math.round(light * 100) + " : " + Math.round(100 - light * 100); }

  function openDefaultsPanel() {
    if (!state.defaultsBusy) state.defaultsStatus = "";
    var parent = { nodes: Array.from(el.sheet.childNodes), classes: el.sheet.className, scroll: el.sheet.scrollTop, label: el.sheet.getAttribute("aria-label") };
    var body = document.createElement("div"); body.className = "defaults-panel";
    var header = document.createElement("div"); header.className = "defaults-header";
    header.innerHTML = '<div class="defaults-heading"><button id="defaultsBack" class="defaults-back" type="button" aria-label="返回代号交互"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button><div><h3 class="defaults-title">设默认值</h3><p class="defaults-subtitle">把喜欢的状态，留给下一次。</p></div></div><div class="defaults-actions"><button id="defaultsFactory" class="btn sm defaults-factory" type="button">查询出厂值</button><button id="defaultsSaveAll" class="btn sm defaults-save-all" type="button">保存当前组合</button></div>';
    header.querySelector("#defaultsBack").addEventListener("click", closeSheet);
    header.querySelector("#defaultsFactory").addEventListener("click", restoreFactoryInteraction);
    header.querySelector("#defaultsSaveAll").addEventListener("click", function () { saveManagedDefaults(); });
    body.appendChild(header);
    var factoryNote = document.createElement("p"); factoryNote.id = "defaultsFactoryStatus"; factoryNote.className = "defaults-status"; factoryNote.setAttribute("role", "status"); factoryNote.hidden = true; body.appendChild(factoryNote);
    var note = document.createElement("p"); note.className = "defaults-intro";
    note.textContent = "逐项保存，或一次保存全部。恢复默认值仅应用你已保存的偏好。"; body.appendChild(note);
    var status = document.createElement("p"); status.id = "defaultsStatus"; status.className = "defaults-status"; status.setAttribute("role", "status"); body.appendChild(status);
    var list = document.createElement("div"); list.className = "defaults-list";
    defaultGroups().forEach(function (group) {
      var row = document.createElement("section"); row.className = "defaults-card"; row.dataset.defaultGroup = group.key;
      var title = document.createElement("h4"); title.id = "default-" + group.key + "-name"; title.textContent = group.name; row.appendChild(title);
      row.setAttribute("aria-labelledby", title.id);
      var description = document.createElement("p"); description.className = "defaults-description"; description.textContent = group.description; row.appendChild(description);
      var values = document.createElement("div"); values.className = "defaults-values";
      ["current", "saved"].forEach(function (kind) {
        var cell = document.createElement("div"); cell.className = "defaults-value-cell";
        var label = document.createElement("span"); label.className = "defaults-value-label"; label.textContent = kind === "current" ? "当前值" : "默认值";
        var value = document.createElement("output"); value.id = "default-" + group.key + "-" + kind; value.setAttribute("aria-label", group.name + " · " + label.textContent);
        var detail = document.createElement("small"); detail.id = value.id + "-detail";
        var button = document.createElement("button"); button.type = "button"; button.className = "btn sm defaults-action";
        button.id = kind === "current" ? group.saveId : "default-" + group.key + "-restore";
        button.textContent = kind === "current" ? "设为默认值" : "恢复默认值";
        button.setAttribute("aria-label", group.name + " · " + button.textContent);
        button.addEventListener("click", function () { if (kind === "current") saveManagedDefaults(group.key); else restoreManagedDefault(group.key); });
        cell.appendChild(label); cell.appendChild(value); cell.appendChild(detail); cell.appendChild(button); values.appendChild(cell);
      });
      row.appendChild(values);
      var feedback = document.createElement("div"); feedback.className = "defaults-feedback"; feedback.id = "default-" + group.key + "-feedback";
      var message = document.createElement("span"); message.setAttribute("role", "status"); feedback.appendChild(message);
      var retry = document.createElement("button"); retry.type = "button"; retry.className = "collision-retry"; retry.textContent = "重新读取";
      retry.addEventListener("click", function () { if (!state.defaultsBusy && !state.factoryBusy) group.retry(); }); feedback.appendChild(retry);
      row.appendChild(feedback); list.appendChild(row);
    });
    var autoCard = document.createElement("section"); autoCard.className = "defaults-card defaults-autodrive";
    autoCard.setAttribute("aria-labelledby", "default-autodrive-name");
    autoCard.innerHTML = '<div class="defaults-autodrive-head"><div class="defaults-autodrive-copy"><h4 id="default-autodrive-name">自动驾驶 (FSD)</h4><p class="defaults-description">进入主页时自动以淡蓝档开启，阵容仍会定时重抽；运行后再点一次 FSD 进入橙光增强。</p></div><button id="autoDriveLaunch" type="button" class="wp-random collision-random" aria-pressed="false"><span>默认开启</span><i class="wp-track" aria-hidden="true"><i class="wp-knob"></i></i></button></div><div class="defaults-feedback" id="default-autodrive-feedback" hidden><span role="status" id="autoDriveSaveNote"></span><button id="autoDriveRetry" type="button" class="collision-retry" hidden>重新读取</button></div>';
    autoCard.querySelector("#autoDriveLaunch").addEventListener("click", function () {
      if (!state.autoDriveReady || state.autoDriveReadError || state.factoryBusy) return;
      state.autoDriveLaunchOn = !state.autoDriveLaunchOn; saveAutoDriveSettings(); syncAutoDriveLaunch();
    });
    autoCard.querySelector("#autoDriveRetry").addEventListener("click", function () { if (!state.defaultsBusy && !state.factoryBusy) loadAutoDriveSettings(); });
    list.appendChild(autoCard);
    body.appendChild(list);
    openSheet({ title: "设默认值", content: body, center: true, wide: true, defaults: true });
    defaultsParent = parent;
    syncDefaultsPanel(); syncAutoDriveLaunch();
    $("defaultsBack").focus({ preventScroll: true });
  }

  function syncDefaultsPanel() {
    var all = $("defaultsSaveAll"); if (!all) return;
    var groups = defaultGroups(), busy = state.defaultsBusy || state.factoryBusy || groups.some(function (g) { return g.status === "saving"; });
    all.disabled = busy || groups.some(function (g) { return !g.ready || g.error; });
    all.textContent = state.defaultsBusy === "all" ? "正在保存…" : "保存当前组合";
    $("defaultsStatus").textContent = state.defaultsStatus;
    $("defaultsStatus").hidden = !state.defaultsStatus;
    groups.forEach(function (g) {
      $("default-" + g.key + "-current").textContent = g.ready ? g.current : "读取中…";
      $("default-" + g.key + "-saved").textContent = g.error ? "暂不可用" : g.ready ? g.saved : "读取中…";
      ["current", "saved"].forEach(function (kind) {
        var detail = $("default-" + g.key + "-" + kind + "-detail");
        detail.textContent = g.ready && !g.error ? g[kind + "Detail"] || "" : "";
        detail.hidden = !detail.textContent;
      });
      var save = $(g.saveId); save.disabled = busy || !g.ready || g.error;
      save.textContent = g.status === "saving" ? "保存中…" : "设为默认值";
      $("default-" + g.key + "-restore").disabled = busy || !g.ready || g.error;
      var feedback = $("default-" + g.key + "-feedback");
      var text = g.error ? "默认值暂未读出，原设置未被覆盖。" : g.status === "error" ? "未能保存，请再点「设为默认值」重试。" : g.status === "saved" ? "已保存，下次启动沿用。" : "";
      feedback.firstChild.textContent = text; feedback.hidden = !text;
      feedback.lastChild.hidden = !g.error; feedback.lastChild.disabled = busy;
    });
  }

  function saveManagedDefaults(key) {
    var groups = defaultGroups(), selected = key ? groups.filter(function (g) { return g.key === key; }) : groups;
    if (state.defaultsBusy || state.factoryBusy || groups.some(function (g) { return g.status === "saving"; }) || selected.some(function (g) { return !g.ready || g.error; })) return;
    state.defaultsBusy = key || "all"; state.defaultsStatus = ""; syncDefaultsPanel(); syncFactoryPanel();
    // Each saver captures its value synchronously before its queued write. Saving
    // never redraws the collision strength or changes the current session.
    Promise.all(selected.map(function (g) { return g.save(); })).then(function (saved) {
      var failed = selected.filter(function (_, index) { return !saved[index]; });
      state.defaultsStatus = failed.length ? "未保存：" + failed.map(function (g) { return g.name; }).join("、") + (failed.length < selected.length ? "。可重试，其余默认值已保存。" : "。请重试，原默认值未被覆盖。")
        : key ? selected[0].name + "的默认值已更新。" : "当前组合已保存，下次启动沿用。";
    }).catch(function () { state.defaultsStatus = "保存未完成，请检查各项状态后重试。"; }).then(function () {
      state.defaultsBusy = false; syncDefaultsPanel(); syncFactoryPanel();
    });
  }

  function restoreManagedDefault(key) {
    var groups = defaultGroups(), group = groups.find(function (g) { return g.key === key; });
    if (!group || !group.ready || group.error || state.defaultsBusy || state.factoryBusy || groups.some(function (g) { return g.status === "saving"; })) return;
    if (key === "count") {
      state.interactionCount = state.interactionDefaultCount;
      if (interactionController) interactionController.setCount(state.interactionCount);
      syncInteractionPanel();
    } else if (key === "probability") {
      state.wallpaperProbability = { version: 1, light: state.probabilityDefault, source: "default", updatedAt: 0 };
      syncProbabilityPanel();
    } else if (key === "collision") {
      state.collision = collisionAPI().normalize(state.collisionDefault); state.collisionCurrent = state.collision.strength;
      collisionSessionSample = null;
      if (state.collision.randomOnLaunch) rollCollisionForEntry(); else applyCollisionStrength();
    } else if (key === "pace") { state.naturalPace = state.paceDefault; applyPace(); }
    state.defaultsStatus = "已将" + group.name + "恢复为已保存的默认值。";
    syncDefaultsPanel(); syncAutoDriveButton();
  }

  function retryCountDefault() {
    state.interactionSettingsReady = false; state.interactionReadError = false; syncInteractionPanel(); refreshInteraction();
    return readInteractionSetting("interactionSettings").then(function (saved) {
      state.interactionDefaultCount = interactionCountValue(saved && saved.defaultCount);
      state.interactionCount = state.interactionDefaultCount;
      if (interactionController) interactionController.setCount(state.interactionCount);
    }).catch(function () { state.interactionReadError = true; }).then(function () {
      state.interactionSettingsReady = true; syncInteractionPanel(); refreshInteraction();
    });
  }
  function readInteractionSetting(key) {
    var a = api();
    return Promise.resolve().then(function () {
      if (a && a.storage) return a.storage.get(key, null);
      var raw = window.localStorage.getItem("aira-profile-card:" + key);
      return raw == null ? null : JSON.parse(raw);
    });
  }
  function writeInteractionSetting(key, value) {
    var a = api();
    return Promise.resolve().then(function () {
      if (a && a.storage) return a.storage.set(key, value);
      window.localStorage.setItem("aira-profile-card:" + key, JSON.stringify(value));
    });
  }
  var probabilityDefaultLoadRevision = 0, probabilityDefaultWriteRevision = 0, probabilityDefaultWriteQueue = Promise.resolve();
  function loadProbabilityDefault() {
    var revision = ++probabilityDefaultLoadRevision;
    state.probabilityDefaultReady = false; state.probabilityDefaultReadError = false;
    syncProbabilityPanel(); refreshInteraction();
    return readInteractionSetting("probabilityDefaults").then(function (saved) {
      if (revision !== probabilityDefaultLoadRevision) return;
      if (saved != null && (!Number.isFinite(saved.light) || saved.light < 0 || saved.light > 1)) throw new Error("Invalid probability default");
      // Preserve the pre-upgrade preference once. Future temporary gestures cannot replace this default.
      state.probabilityDefault = saved == null ? state.wallpaperProbability.light : probabilityValue(saved.light);
      state.wallpaperProbability.light = state.probabilityDefault;
      if (saved == null) return writeInteractionSetting("probabilityDefaults", { version: 1, light: state.probabilityDefault }).catch(function () {
        state.probabilityDefaultSaveStatus = "error";
      });
    }).catch(function () {
      if (revision === probabilityDefaultLoadRevision) state.probabilityDefaultReadError = true;
    }).then(function () {
      if (revision !== probabilityDefaultLoadRevision) return;
      state.probabilityDefaultReady = true; syncProbabilityPanel(); syncFactoryPanel(); refreshInteraction();
    });
  }
  function saveProbabilityDefault() {
    if (!state.probabilityDefaultReady || state.probabilityDefaultReadError) return Promise.resolve(false);
    var snapshot = { version: 1, light: state.wallpaperProbability.light }, revision = ++probabilityDefaultWriteRevision;
    state.probabilityDefaultSaveStatus = "saving"; syncProbabilityPanel();
    probabilityDefaultWriteQueue = probabilityDefaultWriteQueue.then(function () {
      return writeInteractionSetting("probabilityDefaults", snapshot);
    }).then(function () {
      state.probabilityDefault = snapshot.light;
      if (revision === probabilityDefaultWriteRevision) state.probabilityDefaultSaveStatus = "saved";
    }).catch(function () {
      if (revision === probabilityDefaultWriteRevision) state.probabilityDefaultSaveStatus = "error";
    }).then(function () { syncProbabilityPanel(); return state.probabilityDefaultSaveStatus !== "error"; });
    return probabilityDefaultWriteQueue;
  }
  var factoryStatusTimer = 0;
  function syncFactoryPanel() {
    syncDefaultsPanel();
    var status = $("defaultsFactoryStatus");
    if (status) {
      status.textContent = state.factoryStatus; status.hidden = !state.factoryStatus;
      clearTimeout(factoryStatusTimer); factoryStatusTimer = 0;
      if (state.factoryStatus && !state.factoryBusy) {
        factoryStatusTimer = setTimeout(function () {
          factoryStatusTimer = 0; state.factoryStatus = "";
          var note = $("defaultsFactoryStatus"); if (note) { note.textContent = ""; note.hidden = true; }
        }, 4600);
      }
    }
    var button = $("defaultsFactory"); if (!button) return;
    button.disabled = state.factoryBusy || state.defaultsBusy || !state.collisionReady || !state.paceReady || !state.probabilityDefaultReady || !state.interactionSettingsReady;
    button.textContent = state.factoryBusy ? "正在恢复…" : "查询出厂值";
  }
  function restoreFactoryInteraction() {
    if (state.factoryBusy || state.defaultsBusy) return;
    state.factoryBusy = true; state.factoryStatus = "";
    if (interactionController) interactionController.setAutoDrive(false);
    autoLaunchTried = true; // Launch-on is a startup policy; restoring it never restarts this session.
    state.autoDriveLaunchOn = true; state.autoDriveReadError = false;
    state.interactionCount = FACTORY_INTERACTION.count;
    if (interactionController) interactionController.setCount(state.interactionCount);
    state.wallpaperProbability = { version: 1, light: FACTORY_INTERACTION.light, source: "default", updatedAt: 0 };
    state.collision = collisionAPI().normalize(FACTORY_INTERACTION); state.collisionCurrent = FACTORY_INTERACTION.strength;
    state.naturalPace = FACTORY_INTERACTION.pace; collisionSessionSample = null;
    state.collisionReadError = false; state.paceReadError = false; state.probabilityDefaultReadError = false; state.interactionReadError = false;
    applyCollisionStrength(); applyPace(); syncInteractionPanel(); syncProbabilityPanel(); syncAutoDriveLaunch(); syncFactoryPanel();
    Promise.all([saveInteractionDefault(), saveProbabilityDefault(), saveCollisionSettings(), savePaceSettings(), saveAutoDriveSettings()]).then(function (saved) {
      state.factoryStatus = saved.every(Boolean) ? "已恢复出厂默认" : "本次已恢复，部分默认值尚未保存，请重试。";
    }).catch(function () { state.factoryStatus = "本次已恢复，部分默认值尚未保存，请重试。"; }).then(function () {
      state.factoryBusy = false; syncInteractionPanel(); syncProbabilityPanel(); syncCollisionPanel(); syncPacePanel(); syncAutoDriveLaunch(); syncFactoryPanel(); syncAutoDriveButton();
    });
  }

  var autoDriveWriteQueue = Promise.resolve(), autoLaunchTried = false;
  function syncAutoDriveLaunch() {
    var toggle = $("autoDriveLaunch");
    if (toggle) {
      toggle.setAttribute("aria-pressed", String(state.autoDriveLaunchOn === true));
      toggle.disabled = !state.autoDriveReady || state.autoDriveReadError || state.factoryBusy;
    }
    var note = $("autoDriveSaveNote");
    if (note) note.textContent = !state.autoDriveReady ? "正在读取自动驾驶设置…" : state.autoDriveReadError ? "自动驾驶设置暂未读出，未覆盖原设置。" : "";
    var retry = $("autoDriveRetry"); if (retry) retry.hidden = !state.autoDriveReadError;
    var feedback = $("default-autodrive-feedback");
    if (feedback) feedback.hidden = !((note && note.textContent) || (retry && !retry.hidden));
  }
  function maybeAutoLaunch() {
    if (autoLaunchTried || state.autoDriveLaunchOn !== true || state.autoDriveReadError) return;
    if (!interactionController || !state.paceReady || !state.collisionReady || !state.interactionSettingsReady || !state.wallpaperProbabilityReady || !state.probabilityDefaultReady) return;
    autoLaunchTried = true;
    // A refusal (layout not measured yet, small screen) re-arms the next scheduled attempt.
    if (!interactionController.setAutoDrive(true)) autoLaunchTried = false;
  }
  function loadAutoDriveSettings() {
    var a = api();
    state.autoDriveReady = false; state.autoDriveReadError = false; syncAutoDriveLaunch();
    return Promise.resolve().then(function () {
      if (a && a.storage) return a.storage.get("autoDriveSettings", null);
      var raw = window.localStorage.getItem("aira-profile-card:autoDriveSettings");
      return raw == null ? null : JSON.parse(raw);
    }).then(function (saved) {
      state.autoDriveLaunchOn = saved ? saved.launchOn === true : true;
      state.autoDriveReady = true; syncAutoDriveLaunch(); maybeAutoLaunch();
    }).catch(function () {
      state.autoDriveReady = true; state.autoDriveReadError = true; syncAutoDriveLaunch();
    });
  }
  function saveAutoDriveSettings() {
    if (!state.autoDriveReady || state.autoDriveReadError) return Promise.resolve(false);
    var snapshot = { version: 1, launchOn: state.autoDriveLaunchOn === true }, a = api();
    autoDriveWriteQueue = autoDriveWriteQueue.then(function () {
      if (a && a.storage) return a.storage.set("autoDriveSettings", snapshot);
      window.localStorage.setItem("aira-profile-card:autoDriveSettings", JSON.stringify(snapshot));
    }).then(function () { return true; }).catch(function () { return false; });
    return autoDriveWriteQueue;
  }

  var collisionLoadRevision = 0, collisionWriteRevision = 0;
  var collisionWriteQueue = Promise.resolve(), collisionSessionSample = null;

  function collisionAPI() { return window.AiraInteraction.collision; }
  function countAPI() { return window.AiraInteraction.count; }
  function collisionLabel(value) { return value.toFixed(1) + "×"; }

  function applyCollisionStrength() {
    if (interactionController) interactionController.setCollisionStrength(state.collisionCurrent);
    syncCollisionPanel();
  }

  function rollCollisionForEntry() {
    collisionSessionSample = null;
    if (state.collisionReady && state.collision.randomOnLaunch && !state.collisionReadError) {
      collisionSessionSample = Math.random();
      state.collisionCurrent = collisionAPI().draw(collisionAPI().max, collisionSessionSample);
      applyCollisionStrength();
    }
  }

  function loadCollisionSettings() {
    var revision = ++collisionLoadRevision, a = api();
    state.collisionReady = false; state.collisionReadError = false;
    syncCollisionPanel(); refreshInteraction();
    var read = Promise.resolve().then(function () {
      if (a && a.storage) return a.storage.get("collisionSettings", null);
      var raw = window.localStorage.getItem("aira-profile-card:collisionSettings");
      return raw == null ? null : JSON.parse(raw);
    });
    return read.then(function (saved) {
      if (revision !== collisionLoadRevision) return;
      state.collision = collisionAPI().normalize(saved);
      state.collisionDefault = collisionAPI().normalize(saved);
      if (state.collision.randomOnLaunch) {
        if (collisionSessionSample === null) collisionSessionSample = Math.random();
        state.collisionCurrent = collisionAPI().draw(collisionAPI().max, collisionSessionSample);
      } else state.collisionCurrent = state.collision.strength;
      state.collisionReady = true; state.collisionSaveStatus = "";
      applyCollisionStrength(); refreshInteraction();
    }).catch(function () {
      if (revision !== collisionLoadRevision) return;
      state.collisionReady = true; state.collisionReadError = true;
      applyCollisionStrength(); refreshInteraction();
    });
  }

  function saveCollisionSettings() {
    if (!state.collisionReady || state.collisionReadError) return;
    var snapshot = collisionAPI().normalize({ strength: state.collisionCurrent, randomOnLaunch: state.collision.randomOnLaunch }), revision = ++collisionWriteRevision, a = api();
    state.collisionSaveStatus = "saving"; syncCollisionPanel();
    collisionWriteQueue = collisionWriteQueue.then(function () {
      if (a && a.storage) return a.storage.set("collisionSettings", snapshot);
      window.localStorage.setItem("aira-profile-card:collisionSettings", JSON.stringify(snapshot));
    }).then(function () {
      state.collisionDefault = snapshot;
      if (revision === collisionWriteRevision) state.collisionSaveStatus = "saved";
    }).catch(function () {
      if (revision === collisionWriteRevision) state.collisionSaveStatus = "error";
    }).then(function () { syncCollisionPanel(); return state.collisionSaveStatus !== "error"; });
    return collisionWriteQueue;
  }

  function syncCollisionPanel() {
    syncDefaultsPanel();
    var slider = $("collisionStrength"); if (!slider) return;
    var settings = state.collision, available = state.collisionReady && !state.collisionReadError;
    slider.value = String(collisionAPI().toSlider(state.collisionCurrent));
    paintRangeFill(slider);
    slider.disabled = !available || state.factoryBusy;
    slider.setAttribute("aria-valuetext", collisionLabel(state.collisionCurrent));
    $("collisionStrengthValue").textContent = collisionLabel(state.collisionCurrent);
    $("collisionRandom").disabled = !available || state.factoryBusy;
    $("collisionRandom").setAttribute("aria-pressed", String(settings.randomOnLaunch));
    $("collisionHint").textContent = settings.randomOnLaunch
      ? "1–24×，每次启动重新抽取；也可手动调节。"
      : "自然碰撞更轻，拥挤时会顺势散开。";
    var note = $("collisionSaveNote");
    note.textContent = !state.collisionReady ? "正在读取碰撞设置…"
      : state.collisionReadError ? "碰撞设置暂未读出，未覆盖原设置。"
      : "";
    $("collisionRetry").hidden = !state.collisionReadError;
    note.parentElement.hidden = state.collisionReady && !state.collisionReadError;
  }

  function buildCollisionBlock() {
    var block = document.createElement("section"); block.className = "collision-panel";
    var head = document.createElement("div"); head.className = "wp-probability-head";
    var heading = document.createElement("label"); heading.className = "collision-title"; heading.htmlFor = "collisionStrength"; heading.textContent = "碰撞力度";
    var current = document.createElement("output"); current.id = "collisionStrengthValue"; current.htmlFor = "collisionStrength"; head.appendChild(heading); head.appendChild(current); block.appendChild(head);
    function rangeRow(id) {
      var wrap = document.createElement("div"); wrap.className = "collision-control";
      var row = document.createElement("div"); row.className = "collision-range-row";
      var range = document.createElement("input"); range.type = "range"; range.id = id; range.className = "wp-range collision-range";
      range.min = "0"; range.max = "1000"; range.step = "1";
      row.appendChild(range); wrap.appendChild(row);
      var ends = document.createElement("div"); ends.className = "collision-range-ends";
      var low = document.createElement("span"), high = document.createElement("span"); low.textContent = "1×"; high.textContent = "24×"; ends.appendChild(low); ends.appendChild(high); wrap.appendChild(ends);
      block.appendChild(wrap); return { wrap: wrap, range: range };
    }
    var manual = rangeRow("collisionStrength");
    manual.range.addEventListener("input", function () {
      if (!state.collisionReady || state.collisionReadError) return;
      state.collision.strength = collisionAPI().fromSlider(manual.range.value); state.collisionCurrent = state.collision.strength; applyCollisionStrength();
    });
    manual.range.addEventListener("change", function () { state.collisionSaveStatus = ""; syncCollisionPanel(); });
    var modeRow = document.createElement("div"); modeRow.className = "collision-mode-row";
    var random = document.createElement("button"); random.type = "button"; random.id = "collisionRandom"; random.className = "wp-random collision-random";
    var text = document.createElement("span"); text.textContent = "每次启动随机";
    var track = document.createElement("i"); track.className = "wp-track";
    var knob = document.createElement("i"); knob.className = "wp-knob"; track.appendChild(knob); track.setAttribute("aria-hidden", "true"); random.appendChild(text); random.appendChild(track); modeRow.appendChild(random);
    random.addEventListener("click", function () {
      state.collision.randomOnLaunch = !state.collision.randomOnLaunch;
      if (state.collision.randomOnLaunch) rollCollisionForEntry();
      else { collisionSessionSample = null; state.collision.strength = state.collisionCurrent; applyCollisionStrength(); }
      state.collisionSaveStatus = ""; syncCollisionPanel();
    });
    var hint = document.createElement("p"); hint.id = "collisionHint"; hint.className = "collision-hint";
    var foot = document.createElement("div"); foot.className = "collision-foot";
    foot.appendChild(hint); foot.appendChild(modeRow); block.appendChild(foot);
    var saveLine = document.createElement("div"); saveLine.className = "collision-save-line";
    var note = document.createElement("span"); note.id = "collisionSaveNote"; note.setAttribute("role", "status"); saveLine.appendChild(note);
    var retry = document.createElement("button"); retry.type = "button"; retry.id = "collisionRetry"; retry.textContent = "重试"; retry.className = "collision-retry";
    retry.addEventListener("click", loadCollisionSettings); saveLine.appendChild(retry); block.appendChild(saveLine);
    return block;
  }

  var paceLoadRevision = 0, paceWriteRevision = 0, paceWriteQueue = Promise.resolve();
  function paceAPI() { return window.AiraInteraction.motion; }
  function paceLabel(value) { return String(Math.round(value * 100) / 100) + "×"; }
  function applyPace() {
    if (interactionController) interactionController.setNaturalPace(state.naturalPace);
    syncPacePanel();
  }
  function loadPaceSettings() {
    var revision = ++paceLoadRevision, a = api();
    state.paceReady = false; state.paceReadError = false;
    syncPacePanel(); refreshInteraction();
    return Promise.resolve().then(function () {
      if (a && a.storage) return a.storage.get("motionSettings", null);
      var raw = window.localStorage.getItem("aira-profile-card:motionSettings");
      return raw == null ? null : JSON.parse(raw);
    }).then(function (saved) {
      if (revision !== paceLoadRevision) return;
      state.naturalPace = paceAPI().normalize(saved).pace; state.paceDefault = state.naturalPace;
      state.paceReady = true; state.paceSaveStatus = "";
      applyPace(); refreshInteraction();
    }).catch(function () {
      if (revision !== paceLoadRevision) return;
      state.paceReady = true; state.paceReadError = true;
      applyPace(); refreshInteraction();
    });
  }
  function savePaceSettings() {
    if (!state.paceReady || state.paceReadError) return;
    var snapshot = paceAPI().normalize({ pace: state.naturalPace }), revision = ++paceWriteRevision, a = api();
    state.paceSaveStatus = "saving"; syncPacePanel();
    paceWriteQueue = paceWriteQueue.then(function () {
      if (a && a.storage) return a.storage.set("motionSettings", snapshot);
      window.localStorage.setItem("aira-profile-card:motionSettings", JSON.stringify(snapshot));
    }).then(function () {
      state.paceDefault = snapshot.pace;
      if (revision === paceWriteRevision) state.paceSaveStatus = "saved";
    }).catch(function () {
      if (revision === paceWriteRevision) state.paceSaveStatus = "error";
    }).then(function () { syncPacePanel(); return state.paceSaveStatus !== "error"; });
    return paceWriteQueue;
  }
  function syncPacePanel() {
    syncDefaultsPanel();
    var range = $("naturalPace"); if (!range) return;
    var available = state.paceReady && !state.paceReadError;
    range.value = String(paceAPI().toSlider(state.naturalPace)); range.disabled = !available || state.factoryBusy;
    paintRangeFill(range);
    range.setAttribute("aria-valuetext", paceLabel(state.naturalPace));
    $("naturalPaceValue").textContent = paceLabel(state.naturalPace);
    $("paceSaveNote").textContent = !state.paceReady ? "正在读取运动设置…" : state.paceReadError ? "运动设置暂未读出，未覆盖原设置。" : "";
    $("paceRetry").hidden = !state.paceReadError;
    $("paceSaveNote").parentElement.hidden = state.paceReady && !state.paceReadError;
  }
  function buildPaceBlock() {
    var block = document.createElement("section"); block.className = "pace-panel collision-panel";
    block.innerHTML = '<div class="wp-probability-head"><label class="collision-title" for="naturalPace">自然 pace</label><output id="naturalPaceValue" for="naturalPace"></output></div><div class="collision-control"><input id="naturalPace" class="wp-range collision-range" type="range" min="0" max="1200" step="1"><div class="pace-range-ends"><span>0.25×</span><span>16×</span></div></div><div class="pace-description"><p class="collision-hint">1× 为原速率，自动驾驶的追逐节奏独立。</p></div><div class="collision-save-line"><span id="paceSaveNote" role="status"></span><button id="paceRetry" type="button" class="collision-retry">重试</button></div>';
    var range = block.querySelector("#naturalPace");
    range.addEventListener("input", function () {
      if (!state.paceReady || state.paceReadError) return;
      state.naturalPace = paceAPI().fromSlider(range.value); applyPace();
    });
    range.addEventListener("change", function () { state.paceSaveStatus = ""; syncPacePanel(); });
    block.querySelector("#paceRetry").addEventListener("click", loadPaceSettings);
    return block;
  }

  function interactionCountValue(value) {
    return typeof value === "number" && isFinite(value) ? Math.max(0, Math.min(49, Math.round(value))) : 2;
  }

  function paintRangeFill(range) {
    if (!range) return;
    var min = Number(range.min) || 0, max = Number(range.max);
    if (!(max > min)) return;
    var pct = ((Number(range.value) - min) / (max - min)) * 100;
    range.style.setProperty("--fill", Math.max(0, Math.min(100, pct)).toFixed(2) + "%");
  }

  function syncInteractionPanel(options) {
    syncDefaultsPanel();
    var button = $("btnInteraction");
    var enabled = state.interactionSettingsReady && state.interactionCount > 0;
    button.classList.toggle("is-enabled", enabled);
    button.title = "代号：交互 · " + state.interactionCount + " 枚浮光（单击添加并唤出自动驾驶 · 长按设置）";
    var slider = $("interactionCount");
    if (!slider) return;
    if (!options || !options.keepSlider) {
      slider.value = String(countAPI().toSlider(state.interactionCount));
      paintRangeFill(slider);
    }
    slider.disabled = !state.interactionSettingsReady || state.factoryBusy;
    slider.setAttribute("aria-valuetext", state.interactionCount + " 枚浮光");
    $("interactionCountValue").textContent = state.interactionCount + " 枚";
    $("interactionCountHint").textContent = !state.interactionSettingsReady ? "正在读取默认数量…"
      : state.interactionReadError ? "默认数量暂未读出，请在「设默认值」中重试。"
      : state.interactionCount === 0 ? "浮光已收起。仍可在这里调整随机比例。" : "轻点星球，也能添一枚浮光。";
  }

  var countWriteQueue = Promise.resolve();
  function saveInteractionDefault() {
    if (!state.interactionSettingsReady || state.interactionReadError) return Promise.resolve(false);
    var count = state.interactionCount, ok = false;
    state.interactionDefaultSaving = true; state.interactionSaveStatus = "saving"; syncInteractionPanel();
    countWriteQueue = countWriteQueue.then(function () { return writeInteractionSetting("interactionSettings", { version: 1, defaultCount: count }); }).then(function () {
      state.interactionDefaultCount = count; ok = true; state.interactionSaveStatus = "saved";
    }).catch(function () { state.interactionSaveStatus = "error"; }).then(function () {
      state.interactionDefaultSaving = false; syncInteractionPanel(); return ok;
    });
    return countWriteQueue;
  }

  function buildProbabilityBlock() {
    var probabilityBlock = document.createElement("section");
    probabilityBlock.className = "wp-probability";
    var probabilityHead = document.createElement("div");
    probabilityHead.className = "wp-probability-head";
    var probabilityLabel = document.createElement("label");
    probabilityLabel.htmlFor = "wallpaperProbability";
    probabilityLabel.textContent = "主图随机比例";
    var probabilityValueLabel = document.createElement("output");
    probabilityValueLabel.id = "wallpaperProbabilityValue"; probabilityValueLabel.htmlFor = "wallpaperProbability";
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
    probabilityTrack.appendChild(lightLabel);
    probabilityTrack.appendChild(probabilityRange);
    probabilityTrack.appendChild(darkLabel);
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
    head.appendChild(label);
    var track = document.createElement("div");
    track.className = "interaction-count-track";
    var slider = document.createElement("input");
    slider.id = "interactionCount";
    slider.className = "wp-range";
    slider.type = "range"; slider.min = "0"; slider.max = "1000"; slider.step = "1";
    var value = document.createElement("output");
    value.id = "interactionCountValue";
    value.htmlFor = "interactionCount";
    head.appendChild(value); track.appendChild(slider);
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
      state.interactionCount = interactionCountValue(countAPI().fromSlider(Number(slider.value)));
      if (interactionController) interactionController.setCount(state.interactionCount);
      paintRangeFill(slider);
      syncInteractionPanel({ keepSlider: true });
    });
    var controls = document.createElement("div"); controls.className = "interaction-controls";
    var probabilityBlock = buildProbabilityBlock();
    controls.appendChild(countBlock); controls.appendChild(probabilityBlock);
    controls.appendChild(buildCollisionBlock()); controls.appendChild(buildPaceBlock());
    body.appendChild(controls);
    // A single quiet live readout below the controls, separate from the sliders.
    var probabilityNote = probabilityBlock.querySelector("#wallpaperInteractionNote");
    body.appendChild(probabilityNote);

    var explanation = document.createElement("details");
    explanation.className = "interaction-algorithm";
    explanation.open = true;
    var summary = document.createElement("summary");
    summary.textContent = "黑箱里，灵感怎样发生";
    explanation.appendChild(summary);
    var copy = document.createElement("div");
    copy.className = "interaction-algorithm-copy";
    [
      ["一张看不见的地形", "拖动浮光，在隐形势场梯度中改变 Light / Dark 的倾向。方向是主线，局部的弯曲与起伏带来一点难以预料。"],
      ["距离、绕行与碰撞", "每次拖动会选定最近的一枚作为参照：拉开、聚拢、顺逆绕行，以及对方被推动的位移，都参与比例变化。多枚浮光彼此碰撞；只有一枚时，由势场决定。"],
      ["轻拨之后，安静落定", "比例从当前设置出发，随手势变化，松手时保存。自然游动与松手后的惯性只负责氛围；手动滑轨与拖动共用同一个比例。"],
      ["让浮光自己出发", "单击星球唤出 auto / drive，再轻点开启。部分浮光会追逐、冲撞，偶尔接力；碰撞沿用本次力度。再次轻点即可停下。自动驾驶不改变主图比例，也不计入手动交互次数。"],
      ["一点可知的黑箱", "势场、距离、旋转、连带位移的系数为 62 / 20 / 13 / 5。它把动作映射为抽签权重，不是训练模型，也不猜测心情。"]
    ].forEach(function (entry) {
      var paragraph = document.createElement("p"), title = document.createElement("b");
      title.textContent = entry[0];
      paragraph.appendChild(title);
      paragraph.appendChild(document.createTextNode(entry[1]));
      if (entry[0] === "一点可知的黑箱") {
        var liveRatio = document.createElement("span");
        liveRatio.id = "interactionAlgorithmRatio";
        paragraph.appendChild(liveRatio);
        paragraph.appendChild(document.createTextNode(" 表示下一次主图随机时 Light / Dark 的机会；有限次结果不必恰好符合这个比例。"));
      }
      copy.appendChild(paragraph);
    });
    explanation.appendChild(copy); body.appendChild(explanation);
    openSheet({ title: "代号：交互", content: body, center: true, wide: true, interaction: true,
      buttons: [{ label: "完成", variant: "primary", size: "sm", run: function () { closeSheet(); } }] });
    $("btnInteraction").setAttribute("aria-expanded", "true");
    syncInteractionPanel(); syncProbabilityPanel(); syncCollisionPanel(); syncPacePanel(); syncAutoDriveButton(); syncFactoryPanel();
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

  function bindInteractionLauncher() {
    var node = $("btnInteraction"), timer = null, start = null, suppressClick = false, longPressPoint = null;
    function clear() { if (timer) clearTimeout(timer); timer = null; }
    function cancel() { clear(); start = null; suppressClick = true; }
    function addItem() {
      if (!state.interactionSettingsReady) return;
      if (state.interactionCount >= 49) { toast("浮光已达上限 49 枚"); return; }
      state.interactionCount++;
      recordStats({ source: "add" });
      if (interactionController) interactionController.setCount(state.interactionCount);
      syncInteractionPanel();
    }
    // Touch WebViews may retarget the release's compatibility click to the new mask.
    // Consume only that continuation; the next real pointerdown immediately clears it.
    document.addEventListener("pointerdown", function () { longPressPoint = null; }, true);
    document.addEventListener("click", function (event) {
      if (longPressPoint && event.detail && Math.hypot(event.clientX - longPressPoint.x, event.clientY - longPressPoint.y) < 32) {
        longPressPoint = null; suppressClick = false;
        event.preventDefault(); event.stopImmediatePropagation();
      }
    }, true);
    node.addEventListener("pointerdown", function (event) {
      if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
      clear(); suppressClick = false;
      start = { x: event.clientX, y: event.clientY };
      timer = setTimeout(function () {
        timer = null; suppressClick = true; longPressPoint = start; start = null;
        openInteractionPanel();
      }, 480);
    });
    node.addEventListener("pointermove", function (event) {
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) cancel();
    });
    node.addEventListener("pointerup", function () { clear(); start = null; });
    node.addEventListener("pointercancel", cancel);
    node.addEventListener("pointerleave", function () { if (start) cancel(); });
    node.addEventListener("contextmenu", function (event) { event.preventDefault(); });
    node.addEventListener("click", function (event) {
      if (suppressClick && event.detail) { suppressClick = false; event.preventDefault(); return; }
      addItem();
      revealAutoDrive();
    });
    // Keyboard users can add with Enter/Space and open settings with Shift+Enter or the menu key.
    node.addEventListener("keydown", function (event) {
      if ((event.key === "Enter" && event.shiftKey) || event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
        event.preventDefault(); cancel(); openInteractionPanel();
      }
    });
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", function () { if (document.hidden) cancel(); });
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

    bindInteractionLauncher();
    bindAutoDrive();

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
      if (event.key === "Tab" && (statsParent || defaultsParent)) {
        var focusable = Array.from(el.sheet.querySelectorAll('button:not(:disabled), select')).filter(function (node) { return !node.hidden && node.getClientRects().length; });
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });

    function flushStatsAfterGesture() {
      Promise.resolve().then(function () { if (statsStore) statsStore.flush(); });
    }
    window.addEventListener('pagehide', flushStatsAfterGesture);
    document.addEventListener('visibilitychange', function () { if (document.hidden) flushStatsAfterGesture(); });

    window.addEventListener("aira-home-ready", init);
    window.addEventListener("pageshow", function (event) { if (event.persisted) rollCollisionForEntry(); });
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
    initStats();
    loadCollisionSettings();
    loadPaceSettings();
    loadAutoDriveSettings();
    [700, 1600, 3000].forEach(function (delay) { setTimeout(maybeAutoLaunch, delay); });

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
