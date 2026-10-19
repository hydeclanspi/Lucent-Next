(function () {
  "use strict";

  var root = document.documentElement;
  var api = function () { return window.AiraHome || window.AiraBrowserBridge || null; };

  var DEFAULT_PROFILE = {
    name: "hydeclanspi",
    meta: "17 · 上海",
    level: 14,
    sign: "我真的是活着玩的。都别压力我。",
    tags: ["学生", "技术宅", "乐观", "完美主义"],
    gripText: "Harmony OS"
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

  // 「代号：交互」面板右上角的两行，同时作关于窗口左上角的标题
  var BRAND_MOTTO = "灵感与犀利并存";
  var BRAND_IDENTITY = "Lucent · 灵感台";

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
    spark: "M12 2Q13.2 9.9 22 12Q13.2 14.1 12 22Q10.8 14.1 2 12Q10.8 9.9 12 2Z",
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
      tags: DEFAULT_PROFILE.tags.slice(),
      gripText: DEFAULT_PROFILE.gripText
    },
    engines: [],
    selectedEngineId: "",
    shortcuts: [],
    iconPrefs: {},
    logs: [],
    signs: [],
    wallpaper: "dark",
    wallpaperBlur: {},
    wallpaperBrightness: {},
    wallpaperCrop: {},
    glassMaterial: { version: 1, home: "warm", sheets: "warm" },
    glassMaterialReady: false,
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

    document.title = "Lucent · 灵感台";
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

  function entryByKey(key) {
    for (var i = 0; i < ENTRIES.length; i++) {
      if (ENTRIES[i].key === key) return ENTRIES[i];
    }
    return null;
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
          if (a && typeof a[entry.method] === "function") a[entry.method]();
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
      "这里控制演示中的本地打开记录，不会开启浏览器无痕模式或隐藏外部网页记录。",
      [
        { label: state.privacy.isPrivate ? "退出隐私模式" : "进入隐私模式", icon: ICONS.shield, method: "togglePrivateMode" },
        { label: "隐私与安全设置", icon: ICONS.edit, method: "openPrivacySecuritySettings" }
      ]
    );
  }

  function openThemeSheet() {
    openInfoSheet(
      "浅色 / 深色",
      "为这一方空间选择浅色、深色，或跟随系统。外观设置会保存在当前浏览器中。",
      [
        { label: "外观设置", icon: ICONS.sun, method: "openAppearanceSettings" },
        { label: "主题配色", icon: ICONS.moon, method: "openThemePaletteSettings" }
      ]
    );
  }

  function openGripSheet() {
    openInfoSheet(
      "平台标签",
      "Harmony OS 是这张名片保留的平台标签，可以在编辑名片中修改。网页演示不读取设备握姿。",
      [
        { label: "浏览偏好", icon: ICONS.hand, method: "openSettings" }
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

  var statsStore = null, statsController = null, statsParent = null, defaultsParent = null, fieldStore = null;

  function fieldStorageBackend() {
    var native = api();
    return native && native.storage ? {
      get: function (key, fallback) { return native.storage.get(key, fallback); },
      set: function (key, value) { return native.storage.set(key, value); }
    } : {
      get: function (key, fallback) { return Promise.resolve().then(function () {
        var raw = window.localStorage.getItem('aira-profile-card:preview-field:' + key);
        return raw == null ? fallback : JSON.parse(raw);
      }); },
      set: function (key, value) { return Promise.resolve().then(function () {
        window.localStorage.setItem('aira-profile-card:preview-field:' + key, JSON.stringify(value));
      }); }
    };
  }
  function initField() {
    if (!window.AiraFieldStore) return;
    var previous = fieldStore;
    if (previous) previous.flush().then(function () { previous.destroy(); });
    fieldStore = window.AiraFieldStore.create({ storage: fieldStorageBackend(),
      width: function () { return window.innerWidth; }, height: function () { return window.innerHeight; } });
  }
  var fieldKnownIds = new Set();
  var idBadgeOn = true;
  function syncIdBadge() { root.setAttribute("data-id-badge", idBadgeOn ? "" : "off"); }
  function loadUiPrefs() {
    var a = api();
    return Promise.resolve().then(function () {
      if (a && a.storage) return a.storage.get("uiPrefs", null);
      var raw = window.localStorage.getItem("aira-profile-card:uiPrefs");
      return raw == null ? null : JSON.parse(raw);
    }).then(function (saved) {
      idBadgeOn = !saved || saved.idBadge !== false;
      syncIdBadge();
    }).catch(function () { syncIdBadge(); });
  }
  function setIdBadge(on) {
    idBadgeOn = on === true; syncIdBadge();
    writeInteractionSetting("uiPrefs", { version: 1, idBadge: idBadgeOn });
  }
  var idBadgeOption = { get: function () { return idBadgeOn; }, set: setIdBadge };
  function fieldPulse() {
    if (!fieldStore || !interactionController || !interactionController.fieldSnapshot) return;
    if (document.hidden) return;
    var snapshot = interactionController.fieldSnapshot(), ids = [], near = [];
    snapshot.forEach(function (item) {
      ids.push(item.id);
      if (!fieldKnownIds.has(item.id)) { fieldKnownIds.add(item.id); fieldStore.recordSummon([item.id]); }
    });
    for (var i = 0; i < snapshot.length; i++) for (var j = i + 1; j < snapshot.length; j++) {
      if (Math.hypot(snapshot[i].x - snapshot[j].x, snapshot[i].y - snapshot[j].y) < 92) near.push([snapshot[i].id, snapshot[j].id]);
    }
    fieldStore.recordAppearance(ids, 4);
    fieldStore.recordNear(near, 4);
    fieldStore.recordResidency(snapshot, 4);
    var mode = autoDriveState();
    fieldStore.recordDrive(mode.enabled && !mode.rage ? 4 : 0, mode.rage ? 4 : 0);
  }
  setInterval(fieldPulse, 4000);

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
    if (statsController) { statsController.destroy(); statsController = window.AiraStatsPanel.mount(el.sheet, { store: statsStore, field: fieldStore, onBack: closeSheet, idBadge: idBadgeOption,
      activeIds: function () { return interactionController && interactionController.fieldSnapshot ? interactionController.fieldSnapshot().map(function (item) { return item.id; }) : []; } }); }
  }

  function recordStats(event) { if (statsStore) statsStore.record(event); }

  function openStatsPanel() {
    if (!statsStore || !window.AiraStatsPanel) return;
    var parent = { nodes: Array.from(el.sheet.childNodes), classes: el.sheet.className, scroll: el.sheet.scrollTop, label: el.sheet.getAttribute('aria-label') };
    openSheet({ title: '历史统计', center: true, wide: true, stats: true });
    statsParent = parent;
    statsController = window.AiraStatsPanel.mount(el.sheet, { store: statsStore, field: fieldStore, onBack: closeSheet, idBadge: idBadgeOption,
      activeIds: function () { return interactionController && interactionController.fieldSnapshot ? interactionController.fieldSnapshot().map(function (item) { return item.id; }) : []; } });
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
    if (searchMotionPanel) { searchMotionPanel.destroy(); searchMotionPanel = null; }
    $("btnSearchMotion").setAttribute("aria-expanded", options.motion ? "true" : "false");
    sheet.classList.toggle("search-motion-sheet", !!options.motion);
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
    sheet.classList.toggle("about-sheet", !!options.about);
    sheet.classList.toggle("export-sheet", !!options.export);

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
      engineSubtitle.textContent = "Lueurs 引擎 · beta v0.7 · 26-10";
      titleGroup.appendChild(title);
      titleGroup.appendChild(engineSubtitle);
      var subtitle = document.createElement("div");
      subtitle.className = "interaction-subtitle";
      var motto = document.createElement("span");
      motto.textContent = BRAND_MOTTO;
      var identity = document.createElement("span");
      identity.textContent = BRAND_IDENTITY;
      subtitle.appendChild(motto);
      subtitle.appendChild(identity);
      heading.appendChild(titleGroup);
      heading.appendChild(subtitle);
      sheet.appendChild(heading);
      sheet.appendChild(buildInteractionToolbar());
    } else if (!options.stats && !options.defaults && !options.about && !options.export && !options.motion) sheet.appendChild(title);

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
    if (searchMotionPanel) { searchMotionPanel.destroy(); searchMotionPanel = null; $("btnSearchMotion").focus({ preventScroll: true }); }
    $("btnSearchMotion").setAttribute("aria-expanded", "false");
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

  /* ---------- 关于（长按右上角太阳图标） ---------- */

  var ABOUT_COPY = [
    "灵感台是一张属于你的主页：时钟与问候开场，个签替你自我介绍，日志记录每刻所念所想，搜索、快捷方式与直达各就各位，壁纸在明暗之间呼吸。",
    "四十九枚浮光在留白里安身，各自有名；它们相遇、碰撞、结伴巡游，故事都记进场志。不上传、不追踪，一切只留在悄然之间。"
  ];

  function openAboutSheet() {
    var body = document.createElement("div");
    body.className = "about-body";

    var heading = document.createElement("div");
    heading.className = "about-heading";
    var brand = document.createElement("h3");
    brand.className = "about-brand";
    brand.textContent = BRAND_IDENTITY;
    var motto = document.createElement("p");
    motto.className = "about-motto";
    motto.textContent = BRAND_MOTTO;
    heading.appendChild(brand);
    heading.appendChild(motto);

    var copy = document.createElement("div");
    copy.className = "about-copy";
    var kicker = document.createElement("h4");
    kicker.className = "about-kicker";
    kicker.textContent = "关于";
    copy.appendChild(kicker);
    ABOUT_COPY.forEach(function (line) {
      var paragraph = document.createElement("p");
      paragraph.textContent = line;
      copy.appendChild(paragraph);
    });

    var meta = document.createElement("div");
    meta.className = "about-meta";
    var version = document.createElement("p");
    version.className = "about-version";
    version.textContent = "Lucent v5.0 · 2026-10 构建";
    var build = document.createElement("p");
    build.className = "about-build";
    build.textContent = "鸿蒙 Aira 灵感台 · Lueurs 引擎 beta v0.7 · © 2026";
    meta.appendChild(version);
    meta.appendChild(build);

    var frame = document.createElement("figure");
    frame.className = "about-frame";
    var shot = document.createElement("img");
    shot.className = "about-shot";
    shot.src = "./assets/about-preview.jpg";
    shot.alt = "灵感台主页预览";
    shot.decoding = "async";
    frame.appendChild(shot);

    var sign = document.createElement("span");
    sign.className = "about-sign";
    sign.setAttribute("role", "img");
    sign.setAttribute("aria-label", "hydeclanspi 的签名");
    var signLight = document.createElement("img");
    signLight.className = "about-sign-light";
    signLight.src = "./assets/signature.png";
    signLight.alt = "";
    signLight.decoding = "async";
    var signDark = document.createElement("img");
    signDark.className = "about-sign-dark";
    signDark.src = "./assets/signature-dark.png";
    signDark.alt = "";
    signDark.decoding = "async";
    sign.appendChild(signLight);
    sign.appendChild(signDark);

    body.appendChild(heading);
    body.appendChild(copy);
    body.appendChild(meta);
    body.appendChild(frame);
    body.appendChild(sign);
    openSheet({ title: "关于", content: body, center: true, wide: true, about: true });
  }

  /* ---------- 备份与导出（长按右上角扫一扫） ---------- */

  // 备份文本：AIRAPC1:<D|R>:<载荷字符数>:<base64url>:<校验>；D = deflate-raw 压缩，R = 原样。
  // 分段再包一层：AIRAPC1:P:<i>/<N>:<整串校验>:<切片>；切片按序拼回，就是原始备份文本。
  var EXPORT_PREFIX = "AIRAPC1";
  var EXPORT_SEGMENT_CHARS = 4000;    // 每段字符数，对着聊天通道的单条上限取整
  var EXPORT_CHAT_CHARS = 4000;       // 聊天通道单条文本的经验上限
  var EXPORT_BIG_CHARS = 64 * 1024;   // 单次复制开始提示静默截断风险的体量
  var EXPORT_STORE_WAIT = 1600;       // 两个引擎就绪的等待上限，超时只降级，不失败

  var EXPORT_KEYS = ["profile", "icons", "folds", "wallpaper", "wallpaperBlur", "wallpaperBrightness", "wallpaperCrop", "glassMaterial", "wallpaperProbability",
    "probabilityDefaults", "interactionSettings", "collisionSettings", "motionSettings", "autoDriveSettings",
    "uiPrefs", "searchMotion", "logs", "signs", "logsBundleVersion", "signsBundleVersion"];
  var EXPORT_LABELS = {
    profile: "名片", icons: "图标偏好", folds: "折叠状态", wallpaper: "壁纸模式", wallpaperBlur: "壁纸模糊",
    wallpaperBrightness: "壁纸亮度", wallpaperCrop: "壁纸取景", glassMaterial: "玻璃材质",
    wallpaperProbability: "明暗比例", probabilityDefaults: "比例默认值", interactionSettings: "浮光数量",
    collisionSettings: "碰撞力度", motionSettings: "自然 pace", autoDriveSettings: "自动驾驶", uiPrefs: "编号徽章",
    searchMotion: "搜索动效", logs: "日志", signs: "签名历史", logsBundleVersion: "日志版本", signsBundleVersion: "签名版本"
  };

  var exportPack = null, exportNodes = null, exportBusy = false;

  function utf8Bytes(text) {
    if (typeof TextEncoder === "function") return new TextEncoder().encode(text);
    var escaped = unescape(encodeURIComponent(text)), out = new Uint8Array(escaped.length);
    for (var i = 0; i < escaped.length; i++) out[i] = escaped.charCodeAt(i) & 0xFF;
    return out;
  }

  function utf8Text(bytes) {
    if (typeof TextDecoder === "function") return new TextDecoder().decode(bytes);
    var binary = "";
    for (var i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return decodeURIComponent(escape(binary));
  }

  function hex8(value) { var text = (value >>> 0).toString(16); while (text.length < 8) text = "0" + text; return text; }

  function crc32(text) {
    var table = crc32.table;
    if (!table) {
      table = crc32.table = new Uint32Array(256);
      for (var i = 0; i < 256; i++) {
        var seed = i;
        for (var bit = 0; bit < 8; bit++) seed = seed & 1 ? (seed >>> 1) ^ 0xEDB88320 : seed >>> 1;
        table[i] = seed >>> 0;
      }
    }
    var bytes = utf8Bytes(text), value = 0xFFFFFFFF;
    for (var j = 0; j < bytes.length; j++) value = (value >>> 8) ^ table[(value ^ bytes[j]) & 0xFF];
    return hex8((value ^ 0xFFFFFFFF) >>> 0);
  }

  function base64UrlFromBytes(bytes) {
    var binary = "", step = 0x8000;
    for (var i = 0; i < bytes.length; i += step) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function bytesFromBase64Url(text) {
    var padded = text.replace(/-/g, "+").replace(/_/g, "/");
    while (padded.length % 4) padded += "=";
    var binary = atob(padded), out = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i) & 0xFF;
    return out;
  }

  function streamBytes(bytes, stream) {
    return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(function (buffer) {
      return new Uint8Array(buffer);
    }, function () { return null; });
  }

  function deflateRaw(bytes) {
    if (typeof CompressionStream !== "function") return Promise.resolve(null);
    return streamBytes(bytes, new CompressionStream("deflate-raw"));
  }

  function inflateRaw(bytes) {
    if (typeof DecompressionStream !== "function") return Promise.resolve(null);
    return streamBytes(bytes, new DecompressionStream("deflate-raw"));
  }

  function sizeText(bytes) { return bytes < 1024 ? bytes + " B" : (bytes / 1024).toFixed(1) + " KB"; }
  function charText(chars) { return chars < 10000 ? String(chars) : (chars / 1024).toFixed(1) + " K"; }

  function clipboardReport() {
    var clipboard = navigator.clipboard || {};
    return {
      write: typeof clipboard.writeText === "function",
      read: typeof clipboard.readText === "function",
      legacy: typeof document.execCommand === "function",
      compress: typeof CompressionStream === "function"
    };
  }

  // 兼容写入：部分 WebView 没有异步剪贴板接口，但 copy 事件仍然可用。
  function legacyCopy(text) {
    var area = document.createElement("textarea"), previous = document.activeElement, ok = false;
    area.value = text;
    area.setAttribute("readonly", "");
    area.setAttribute("aria-hidden", "true");
    area.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;";
    document.body.appendChild(area);
    try {
      area.focus({ preventScroll: true });
      area.select();
      area.setSelectionRange(0, area.value.length);
      ok = document.execCommand("copy") === true;
    } catch (error) { ok = false; }
    document.body.removeChild(area);
    if (previous && typeof previous.focus === "function") { try { previous.focus({ preventScroll: true }); } catch (error) {} }
    return ok;
  }

  function copyBlocked(error) {
    var failure = new Error("剪贴板写入被拒绝");
    failure.code = "CLIPBOARD_BLOCKED";
    failure.detail = (error && (error.name || error.message)) || "无返回";
    return failure;
  }

  function copyText(text) {
    var clipboard = navigator.clipboard;
    if (clipboard && typeof clipboard.writeText === "function") {
      return clipboard.writeText(text).then(function () { return "clipboard"; }, function (error) {
        return legacyCopy(text) ? "legacy" : Promise.reject(copyBlocked(error));
      });
    }
    return Promise.resolve().then(function () {
      if (legacyCopy(text)) return "legacy";
      throw copyBlocked(null);
    });
  }

  function readExportKey(key) {
    var a = api();
    if (a && a.storage && typeof a.storage.get === "function") {
      return a.storage.get(key, null).then(function (value) {
        return { value: value, failed: false };
      }, function () {
        return { value: localGet(key, null), failed: true };
      });
    }
    return Promise.resolve({ value: localGet(key, null), failed: false });
  }

  function settleStore(store) {
    if (!store || typeof store.snapshot !== "function") return Promise.resolve(null);
    return new Promise(function (resolve) {
      var timer = setTimeout(function () { resolve({ data: null, status: "timeout" }); }, EXPORT_STORE_WAIT);
      Promise.resolve(store.ready).then(function () {
        clearTimeout(timer);
        try { resolve(store.snapshot()); } catch (error) { resolve({ data: null, status: "error" }); }
      }, function () {
        clearTimeout(timer); resolve({ data: null, status: "error" });
      });
    });
  }

  function collectBackup() {
    var notes = [];
    var reads = EXPORT_KEYS.map(function (key) {
      return readExportKey(key).then(function (result) { return { key: key, value: result.value, failed: result.failed }; });
    });
    return Promise.all([Promise.all(reads), settleStore(fieldStore), settleStore(statsStore)]).then(function (results) {
      var list = results[0], field = results[1], stats = results[2];
      var keys = {}, missing = [];
      list.forEach(function (item) {
        if (item.failed) { missing.push(EXPORT_LABELS[item.key] || item.key); return; }
        if (item.value === null || item.value === undefined) return;
        keys[item.key] = item.value;
      });
      if (missing.length) notes.push("有 " + missing.length + " 项没有读到：" + missing.join("、") + "。这几项没有写进这次备份，原数据没有被改动。");
      var storeData = { field: null, stats: null };
      [["field", field, "场志"], ["stats", stats, "历史统计"]].forEach(function (entry) {
        var name = entry[0], settled = entry[1], label = entry[2];
        if (!settled) return;
        if (settled.status === "timeout") notes.push(label + "没有在预期时间内就绪，这次备份不含" + label + "；可以稍后点「重新整理」再试。");
        else if (settled.status === "error" || !settled.data) notes.push(label + "暂时读不出来（原数据未受影响），这次备份不含" + label + "。");
        else storeData[name] = settled.data;
      });
      var payload = {
        format: "aira-profile-card",
        formatVersion: 1,
        kind: "backup",
        exportedAt: new Date().toISOString(),
        timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
        homepage: { id: "com.example.aira-profile-card", version: "5.0.0" },
        summary: {
          keys: Object.keys(keys).length,
          logs: Array.isArray(keys.logs) ? keys.logs.length : 0,
          signs: Array.isArray(keys.signs) ? keys.signs.length : 0,
          fieldProfiles: storeData.field ? Object.keys(storeData.field.profiles || {}).length : 0,
          fieldPairs: storeData.field ? Object.keys(storeData.field.pairs || {}).length : 0,
          fieldEvents: storeData.field && Array.isArray(storeData.field.events) ? storeData.field.events.length : 0,
          statsRows: storeData.stats && Array.isArray(storeData.stats.rows) ? storeData.stats.rows.length : 0
        },
        notes: notes,
        data: { keys: keys, field: storeData.field, stats: storeData.stats }
      };
      return { payload: payload, notes: notes };
    });
  }

  function encodeBackup(json) {
    return deflateRaw(utf8Bytes(json)).then(function (deflated) {
      var mode = deflated ? "D" : "R";
      var body = deflated || utf8Bytes(json);
      var base = base64UrlFromBytes(body);
      return { text: EXPORT_PREFIX + ":" + mode + ":" + base.length + ":" + base + ":" + crc32(base), mode: mode, jsonBytes: utf8Bytes(json).length };
    });
  }

  // 打包后立刻按同一份格式回读一遍：宁可拒绝复制，也不交出一份坏数据。
  function verifyBackup(backup, json) {
    return Promise.resolve().then(function () {
      var parts = backup.text.split(":");
      if (parts.length < 5 || parts[0] !== EXPORT_PREFIX) throw new Error("格式头不对");
      if (Number(parts[2]) !== parts[3].length) throw new Error("长度对不上");
      if (crc32(parts[3]) !== parts[4]) throw new Error("校验对不上");
      var body = bytesFromBase64Url(parts[3]);
      if (parts[1] !== "D") {
        if (utf8Text(body) !== json) throw new Error("回读内容不一致");
        return true;
      }
      return inflateRaw(body).then(function (output) {
        if (!output) return true;   // 这台机器读不回压缩流时，只保留长度与校验两道关
        if (utf8Text(output) !== json) throw new Error("回读内容不一致");
        return true;
      });
    });
  }

  function chunkBackup(text) {
    var chunks = [], total = Math.max(1, Math.ceil(text.length / EXPORT_SEGMENT_CHARS)), digest = crc32(text);
    for (var i = 0; i < total; i++) {
      chunks.push(EXPORT_PREFIX + ":P:" + (i + 1) + "/" + total + ":" + digest + ":" + text.slice(i * EXPORT_SEGMENT_CHARS, (i + 1) * EXPORT_SEGMENT_CHARS));
    }
    return chunks;
  }

  function exportRows(pack) {
    var data = pack.payload.data, keys = data.keys || {}, preference = {}, history = {};
    EXPORT_KEYS.forEach(function (key) {
      if (!(key in keys)) return;
      if (key === "logs" || key === "signs" || key === "logsBundleVersion" || key === "signsBundleVersion") history[key] = keys[key];
      else preference[key] = keys[key];
    });
    function bytesOf(value) { return value === null || value === undefined ? 0 : utf8Bytes(JSON.stringify(value)).length; }
    var rows = [{ label: "全部数据", value: sizeText(pack.jsonBytes) + " → 备份文本 " + charText(pack.backup.text.length) + " 字" }];
    rows.push({ label: "名片与偏好", value: Object.keys(preference).length + " 项 · " + sizeText(bytesOf(preference)) });
    rows.push({ label: "日志 / 签名", value: (pack.payload.summary.logs + " + " + pack.payload.summary.signs) + " 条 · " + sizeText(bytesOf(history)) });
    rows.push({ label: "场志", value: data.field ? (pack.payload.summary.fieldProfiles + " 位 · " + pack.payload.summary.fieldPairs + " 对 · " + pack.payload.summary.fieldEvents + " 事件 · " + sizeText(bytesOf(data.field))) : "本次没有" });
    rows.push({ label: "历史统计", value: data.stats ? (pack.payload.summary.statsRows + " 行 · " + sizeText(bytesOf(data.stats))) : "本次没有" });
    return rows;
  }

  function sizeWarning(chars) {
    if (chars > EXPORT_BIG_CHARS) {
      return "这次备份有 " + charText(chars) + " 字，超过 64 K：部分系统在写入或粘贴时会静默截断。建议用下面的分段复制，或者粘到备忘录、邮件这类不限长度的应用里。备份文本自带长度与校验，粘贴后能立刻查出有没有被截断。";
    }
    if (chars > EXPORT_CHAT_CHARS) {
      return "这次备份有 " + charText(chars) + " 字，超过聊天应用的单条上限（约 4000 字）。发微信这类通道请用下面的分段复制；备忘录、邮件可以直接整段粘贴。";
    }
    return "";
  }

  function setExportStatus(text, tone) {
    if (!exportNodes) return;
    exportNodes.status.textContent = text || "";
    exportNodes.status.hidden = !text;
    exportNodes.status.classList.toggle("is-error", tone === "error");
    exportNodes.status.classList.toggle("is-note", tone === "note");
  }

  function setExportBusy(busy) {
    if (!exportNodes) return;
    exportNodes.body.classList.toggle("is-busy", busy);
    exportNodes.backupButton.disabled = busy || !exportPack;
    exportNodes.jsonButton.disabled = busy || !exportPack;
    if (exportNodes.retry) exportNodes.retry.hidden = !exportPack || !exportPack.broken;
  }

  function copyFromSheet(text, options) {
    copyText(text).then(function (method) {
      if (options && options.onSuccess) options.onSuccess();
      var tail = " · " + charText(text.length) + " 字";
      toast("已复制" + tail);
      setExportStatus(method === "legacy"
        ? "已用兼容方式写入剪贴板" + tail + "。若粘贴后发现内容不完整，请改用分段复制。"
        : "已写入系统剪贴板" + tail + "。去粘贴吧。", "ok");
    }).catch(function (error) {
      toast("复制没有成功");
      setExportStatus("剪贴板写入被拒绝了。这是这台机器的环境限制（例如把主页复制限制在应用内），和你的数据无关。可以：① 再点一次复制；② 改用下面的分段复制；③ 若一直失败，说明这台机器关闭了主页复制，请把这一行反馈给主页作者（" + (error && error.detail ? error.detail : error && error.code) + "）。", "error");
    });
  }

  function renderExport() {
    var pack = exportPack;
    if (!pack || !exportNodes) return;
    var nodes = exportNodes, warnings = pack.notes.slice();
    var over = sizeWarning(pack.backup.text.length);
    if (over) warnings.push(over);
    if (pack.backup.mode === "R") warnings.push("这台机器没有可用的压缩接口，备份文本改用未压缩编码，字符数偏多（大约 1.3 倍）。");

    nodes.summary.textContent = "";
    exportRows(pack).forEach(function (row) {
      var line = document.createElement("div");
      line.className = "export-row";
      var label = document.createElement("span");
      label.className = "export-row-label";
      label.textContent = row.label;
      var value = document.createElement("span");
      value.className = "export-row-value";
      value.textContent = row.value;
      line.appendChild(label);
      line.appendChild(value);
      nodes.summary.appendChild(line);
    });

    nodes.notes.textContent = "";
    nodes.notes.hidden = !warnings.length;
    warnings.forEach(function (text) {
      var item = document.createElement("p");
      item.className = "export-warning";
      item.textContent = text;
      nodes.notes.appendChild(item);
    });

    nodes.backupSize.textContent = charText(pack.backup.text.length) + " 字 · " + pack.chunks.length + " 段";
    nodes.backupButton.textContent = "复制备份文本";
    nodes.jsonSize.textContent = sizeText(utf8Bytes(pack.readable).length) + " · 未压缩";
    nodes.jsonButton.textContent = "复制可读 JSON";

    nodes.segmentNote.textContent = pack.chunks.length > 1
      ? "每段不超过 " + EXPORT_SEGMENT_CHARS + " 字，段头带编号与整串校验。挨个复制，粘到同一个地方；电脑端按段号重排后校验。"
      : "这次只需一段，直接用上面的备份文本即可。";
    nodes.segmentList.textContent = "";
    pack.chunks.forEach(function (chunk, index) {
      var row = document.createElement("div");
      row.className = "export-segment";
      var label = document.createElement("span");
      label.className = "export-segment-label";
      label.textContent = "第 " + (index + 1) + "/" + pack.chunks.length + " 段 · " + chunk.length + " 字";
      var button = document.createElement("button");
      button.type = "button";
      button.className = "btn sm export-copy";
      button.textContent = "复制";
      button.addEventListener("click", function () {
        copyFromSheet(chunk, { onSuccess: function () {
          row.classList.add("is-copied");
          button.textContent = "已复制";
        } });
      });
      row.appendChild(label);
      row.appendChild(button);
      nodes.segmentList.appendChild(row);
    });

    var report = clipboardReport();
    nodes.diag.textContent = "本机能力：剪贴板写入 " + (report.write ? "✓" : "✗")
      + " · 兼容写入 " + (report.legacy ? "✓" : "✗")
      + " · 压缩 " + (report.compress ? "✓" : "✗")
      + " · 剪贴板读取 " + (report.read ? "✓" : "✗");
    nodes.diagNote.textContent = report.write || report.legacy
      ? "剪贴板读取需要 Aira 授权，只影响以后把备份贴回来，不影响这次导出。"
      : "这台机器既没有异步剪贴板接口，也没有兼容写入接口，导出可能只能靠截屏。";

    if (!pack.payload.data.field || !pack.payload.data.stats) {
      nodes.segmentNote.textContent += " 这次备份不完整，先别用它覆盖任何旧备份。";
    }
    if (!warnings.length) setExportStatus("已整理完成。数据只写剪贴板，复制后请自行粘贴保存。", "note");
    else setExportStatus("已整理完成，但有几处要留意（见上方提示）。", "note");
  }

  function renderExportFailure(error) {
    if (!exportNodes) return;
    var nodes = exportNodes;
    nodes.summary.textContent = "";
    nodes.notes.hidden = true;
    nodes.segmentList.textContent = "";
    nodes.segmentNote.textContent = "";
    nodes.backupSize.textContent = "—";
    nodes.jsonSize.textContent = "—";
    nodes.backupButton.textContent = "复制备份文本";
    nodes.jsonButton.textContent = "复制可读 JSON";
    nodes.retry.hidden = false;
    setExportStatus(error && error.code === "SELF_CHECK"
      ? "打包自检没有通过（" + (error.detail || "回读不一致") + "）。为避免给你一份坏数据，这次没有写入剪贴板。请点「重新整理」再试一次。"
      : "打包没有完成（" + ((error && (error.message || error.detail)) || "未知原因") + "）。这次没有写入剪贴板。请点「重新整理」；若反复出现，请把这句反馈给主页作者。", "error");
  }

  function prepareExport() {
    if (exportBusy) return;
    exportBusy = true;
    exportPack = null;
    if (exportNodes) exportNodes.retry.hidden = true;
    setExportBusy(true);
    setExportStatus("正在整理数据…");
    collectBackup().then(function (result) {
      var json = JSON.stringify(result.payload);
      var readable = JSON.stringify(result.payload, null, 2);
      return encodeBackup(json).then(function (backup) {
        return verifyBackup(backup, json).then(function () {
          return { payload: result.payload, notes: result.notes, json: json, readable: readable, backup: backup, chunks: chunkBackup(backup.text), jsonBytes: utf8Bytes(json).length };
        });
      });
    }).then(function (pack) {
      exportPack = pack;
      exportBusy = false;
      if (pack.payload.summary.keys === 0 && !pack.payload.data.field && !pack.payload.data.stats) pack.notes.push("这台机器上还没有可以备份的内容，这份备份是空壳。");
      renderExport();
      setExportBusy(false);
    }).catch(function (error) {
      exportBusy = false;
      exportPack = null;
      if (error && error.message && error.message.indexOf("回读") >= 0) error.code = "SELF_CHECK";
      renderExportFailure(error);
      setExportBusy(false);
    });
  }

  function openExportSheet() {
    var body = document.createElement("div");
    body.className = "export-panel";

    var header = document.createElement("div");
    header.className = "export-header";
    var back = document.createElement("button");
    back.type = "button";
    back.className = "export-back";
    back.setAttribute("aria-label", "关闭备份与导出");
    back.appendChild(icon("m14 6-6 6 6 6"));
    var heading = document.createElement("div");
    heading.className = "export-heading";
    var title = document.createElement("h3");
    title.className = "export-title";
    title.textContent = "备份与导出";
    var subtitle = document.createElement("p");
    subtitle.className = "export-subtitle";
    subtitle.textContent = "离线打包，只写剪贴板；不上传、不追踪。";
    heading.appendChild(title);
    heading.appendChild(subtitle);
    header.appendChild(back);
    header.appendChild(heading);
    back.addEventListener("click", closeSheet);

    var intro = document.createElement("p");
    intro.className = "export-intro";
    intro.textContent = "把灵感台的全部数据整理成一段文本：名片与偏好、日志与签名、场志与历史统计。复制之后放在哪里，由你决定。";

    var status = document.createElement("p");
    status.className = "export-status";
    status.setAttribute("role", "status");
    var retry = document.createElement("button");
    retry.type = "button";
    retry.className = "btn sm export-retry";
    retry.textContent = "重新整理";
    retry.hidden = true;
    retry.addEventListener("click", prepareExport);
    var statusRow = document.createElement("div");
    statusRow.className = "export-status-row";
    statusRow.appendChild(status);
    statusRow.appendChild(retry);

    var summary = document.createElement("div");
    summary.className = "export-summary";

    var notes = document.createElement("div");
    notes.className = "export-notes";
    notes.hidden = true;

    function card(kind, label, note) {
      var section = document.createElement("section");
      section.className = "export-card export-" + kind;
      var head = document.createElement("div");
      head.className = "export-card-head";
      var name = document.createElement("h4");
      name.textContent = label;
      var size = document.createElement("span");
      size.className = "export-card-size";
      head.appendChild(name);
      head.appendChild(size);
      var description = document.createElement("p");
      description.className = "export-card-note";
      description.textContent = note;
      var button = document.createElement("button");
      button.type = "button";
      button.className = "btn sm export-copy";
      section.appendChild(head);
      section.appendChild(description);
      section.appendChild(button);
      return { section: section, size: size, button: button };
    }

    var backupCard = card("backup", "备份文本 · 推荐", "单行、压缩、带长度与校验；没有引号和换行，最扛复制，也方便以后贴回来。");
    var jsonCard = card("json", "可读 JSON", "缩进排版，适合直接看或写脚本；体积更大，个别编辑器会把直引号换成弯引号。");
    var segments = document.createElement("section");
    segments.className = "export-card export-segments";
    var segmentHead = document.createElement("div");
    segmentHead.className = "export-card-head";
    var segmentTitle = document.createElement("h4");
    segmentTitle.textContent = "分段复制";
    segmentHead.appendChild(segmentTitle);
    var segmentNote = document.createElement("p");
    segmentNote.className = "export-card-note";
    var segmentList = document.createElement("div");
    segmentList.className = "export-segment-list";
    segments.appendChild(segmentHead);
    segments.appendChild(segmentNote);
    segments.appendChild(segmentList);

    var diag = document.createElement("p");
    diag.className = "export-diag";
    var diagNote = document.createElement("p");
    diagNote.className = "export-diag-note";

    body.appendChild(header);
    body.appendChild(intro);
    body.appendChild(statusRow);
    body.appendChild(summary);
    body.appendChild(notes);
    body.appendChild(backupCard.section);
    body.appendChild(jsonCard.section);
    body.appendChild(segments);
    body.appendChild(diag);
    body.appendChild(diagNote);

    backupCard.button.addEventListener("click", function () {
      if (!exportPack) return;
      copyFromSheet(exportPack.backup.text);
    });
    jsonCard.button.addEventListener("click", function () {
      if (!exportPack) return;
      copyFromSheet(exportPack.readable);
    });

    exportNodes = {
      body: body, status: status, retry: retry, summary: summary, notes: notes,
      backupSize: backupCard.size, backupButton: backupCard.button,
      jsonSize: jsonCard.size, jsonButton: jsonCard.button,
      segmentNote: segmentNote, segmentList: segmentList,
      diag: diag, diagNote: diagNote
    };

    openSheet({ title: "备份与导出", content: body, center: true, wide: true, export: true });
    back.focus({ preventScroll: true });
    prepareExport();
  }

  // 长按扫一扫：单击不变（系统扫码），长按浮出备份与导出。
  // 与太阳图标同一套兜底：松手时的兼容点击会被吞掉，避免落到刚浮出的遮罩上。
  function bindScanLauncher() {
    var node = $("btnScan");
    if (!node) return;
    var timer = null, start = null, suppressClick = false, longPressPoint = null;
    function clear() { if (timer) clearTimeout(timer); timer = null; }
    function cancel() { clear(); start = null; suppressClick = true; }
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
        openExportSheet();
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
      var a = api();
      if (a && typeof a.scanQr === "function") a.scanQr();
      else toast("预览模式：这里会打开 Aira 扫一扫");
    });
    node.addEventListener("keydown", function (event) {
      if ((event.key === "Enter" && event.shiftKey) || event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
        event.preventDefault(); cancel(); openExportSheet();
      }
    });
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", function () { if (document.hidden) cancel(); });
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

  /* ---------- 壁纸（Light / Dark + 柔焦 + 亮度 + 取景） ---------- */

  var WALLPAPERS = {
    light: { src: "./assets/wallpaper-yang.jpg", thumb: "./assets/wallpaper-yang.jpg", label: "Light", note: "伦敦夜景" },
    dark: { src: "./assets/wallpaper.jpg", thumb: "./assets/wp-thumb-dark.jpg", label: "Dark", note: "日漫黄昏" }
  };

  /* 取景原图：两套壁纸各自的“原图”和出厂取景窗口。Dark 的原图比出厂窗口更大；
     Light 的原图就是壁纸本身。用户可在上面拖动取景框重新裁切。 */
  var WP_SOURCES = {
    light: { src: "./assets/wallpaper-yang.jpg", size: { w: 3120, h: 2080 }, window: { x: 0, y: 0, w: 3120, h: 2080 } },
    dark: { src: "./assets/wallpaper-dark-source.jpg", size: { w: 4096, h: 2048 }, window: { x: 382, y: 0, w: 3072, h: 2048 } }
  };
  var WP_CROP_SETTLE = 200;
  var WP_CROP_ANIM = 260;

  var WP_BLUR_DEFAULT = { light: 4, dark: 0 };
  var WP_BLUR_MAX = 20;
  var WP_BLUR_RATIO = 1.2;
  var WP_THUMB_SCALE = 0.25;

  var WP_BRIGHT_MIN = 50;
  var WP_BRIGHT_MAX = 100;
  /* 资源里已经烙进去的亮度：Dark 出厂压暗到 74%（原图 100% 为基准，出厂值即烙入值）。 */
  var WP_BRIGHT_BAKED = { light: 100, dark: 74 };
  var WP_BRIGHT_DEFAULT = WP_BRIGHT_BAKED;

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

  // 短横屏守卫：主卡片在宽屏下垂直居中，屏幕一矮，它就上移，浮在它右上方的
  // 历史记录标签会顶到顶栏。只把卡片下移到刚好留出间隙；平板与更高的屏幕不受影响。
  var CARD_CLEARANCE = 16;
  function guardCardClearance() {
    var root = document.documentElement;
    var card = document.querySelector(".page > .card"), bar = document.querySelector(".topbar"), tag = $("btnHistory");
    if (!card || !bar || !tag) return;
    var current = parseFloat(root.style.getPropertyValue("--card-drop")) || 0, drop = 0;
    var wide = !window.matchMedia || window.matchMedia("(min-width: 900px)").matches;
    if (wide && getComputedStyle(tag).position === "absolute") {
      var page = card.offsetParent;
      var cardTop = (page ? page.offsetTop : 0) + card.offsetTop - current;
      var floor = bar.offsetTop + bar.offsetHeight + CARD_CLEARANCE - tag.offsetTop;
      drop = Math.max(0, Math.ceil(floor - cardTop));
    }
    if (drop === current) return;
    if (drop) root.style.setProperty("--card-drop", drop + "px");
    else root.style.removeProperty("--card-drop");
    if (interactionController) interactionController.refresh();
  }

  function bindCardClearance() {
    var card = document.querySelector(".page > .card");
    var queued = 0;
    var queue = function () { if (!queued) queued = requestAnimationFrame(function () { queued = 0; guardCardClearance(); }); };
    guardCardClearance();
    window.addEventListener("resize", guardCardClearance, { passive: true });
    if (typeof ResizeObserver === "function" && card) new ResizeObserver(queue).observe(card);
    if (typeof MutationObserver === "function") new MutationObserver(queue).observe(document.documentElement, { attributes: true, attributeFilter: ["data-focus"] });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
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
      onFieldEvent: function (event) { if (fieldStore) fieldStore.record(event); },
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
      panelButton.setAttribute("aria-label", "Drive (FSD) · " + label); panelButton.title = "Drive (FSD) · " + label;
      panelButton.classList.toggle("is-running", mode.enabled);
      panelButton.classList.toggle("is-rage", !!mode.rage);
      panelButton.classList.toggle("is-paused", mode.enabled && mode.paused);
      var modeText = $("panelAutoDriveState");
      if (modeText) modeText.textContent = mode.enabled ? (mode.rage ? "增强" : "巡航") : mode.unavailableReason ? "不可用" : "关闭";
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

  function wpBrightPercent(side) {
    var value = state.wallpaperBrightness[side];
    if (typeof value !== "number") return WP_BRIGHT_DEFAULT[side];
    return Math.min(WP_BRIGHT_MAX, Math.max(WP_BRIGHT_MIN, value));
  }

  function wpBrightFactor(side) {
    return String(Math.round(wpBrightPercent(side) / WP_BRIGHT_BAKED[side] * 1000) / 1000);
  }

  function wpSource(side) {
    return WP_SOURCES[side] || WP_SOURCES.dark;
  }

  function normalizeCrop(side, value) {
    var bounds = wpSource(side).size;
    if (!value || typeof value !== "object") return null;
    var x = Number(value.x), y = Number(value.y), w = Number(value.w), h = Number(value.h);
    if (!isFinite(x) || !isFinite(y) || !isFinite(w) || !isFinite(h) || w < 8 || h < 8) return null;
    w = Math.min(w, bounds.w);
    h = Math.min(h, bounds.h);
    return {
      x: Math.round(Math.min(Math.max(x, 0), bounds.w - w)),
      y: Math.round(Math.min(Math.max(y, 0), bounds.h - h)),
      w: Math.round(w),
      h: Math.round(h)
    };
  }

  function wpCrop(side) {
    return normalizeCrop(side, state.wallpaperCrop && state.wallpaperCrop[side]);
  }

  /* 取景窗口在当前屏幕比例下实际可见的部分（取窗口内最大的同比例子矩形） */
  function wpVisibleRegion(win, aspect) {
    if (win.w / win.h <= aspect) {
      var tall = win.w / aspect;
      return { x: win.x, y: win.y + (win.h - tall) / 2, w: win.w, h: tall };
    }
    var wide = win.h * aspect;
    return { x: win.x + (win.w - wide) / 2, y: win.y, w: wide, h: win.h };
  }

  /* 把取景区域铺满某个显示盒的 background 几何（像素值，居中、cover） */
  function wpLayerBox(region, boxW, boxH, source) {
    var scale = Math.max(boxW / region.w, boxH / region.h);
    return {
      size: (source.w * scale).toFixed(1) + "px " + (source.h * scale).toFixed(1) + "px",
      position: (boxW / 2 - (region.x + region.w / 2) * scale).toFixed(1) + "px " +
        (boxH / 2 - (region.y + region.h / 2) * scale).toFixed(1) + "px"
    };
  }

  /* 同一取景区域铺进固定比例盒子（长宽都写成百分比，与盒子实际像素无关） */
  function wpThumbGeometry(region, aspect, source) {
    var k1 = Math.max(1 / region.w, 1 / (aspect * region.h));
    var k2 = Math.max(aspect / region.w, 1 / region.h);
    return {
      width: (source.w * k1 * 100).toFixed(2) + "%",
      height: (source.h * k2 * 100).toFixed(2) + "%",
      left: (50 - 100 * (region.x + region.w / 2) * k1).toFixed(2) + "%",
      top: (50 - 100 * (region.y + region.h / 2) * k2).toFixed(2) + "%"
    };
  }

  function wpViewport() {
    return {
      w: window.innerWidth || document.documentElement.clientWidth || 1,
      h: window.innerHeight || document.documentElement.clientHeight || 1
    };
  }

  function applyWallpaper() {
    var side = wpSide();
    var crop = wpCrop(side);
    var source = wpSource(side);
    var url = 'url("' + (crop ? source.src : WALLPAPERS[side].src) + '")';
    try {
      var view = wpViewport();
      document.body.style.backgroundImage = url;
      if (el.wpImg) el.wpImg.style.backgroundImage = url;
      if (crop) {
        var geo = wpLayerBox(crop, view.w, view.h, source.size);
        document.body.style.backgroundSize = geo.size;
        document.body.style.backgroundPosition = geo.position;
        if (el.wpImg) {
          /* 壁纸层比屏幕四边各大出一截（柔焦不露边），取景要按这一层自己的盒子铺：
             与不取景时的 cover 同一规则，中心对准屏幕中心，不会整体偏向左上。 */
          var layer = wpLayerBox(crop, el.wpImg.offsetWidth || view.w, el.wpImg.offsetHeight || view.h, source.size);
          el.wpImg.style.backgroundSize = layer.size;
          el.wpImg.style.backgroundPosition = layer.position;
        }
      } else {
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center center";
        if (el.wpImg) {
          el.wpImg.style.backgroundSize = "cover";
          el.wpImg.style.backgroundPosition = "center center";
        }
      }
    } catch (error) {
      /* 忽略 */
    }
    try {
      document.documentElement.style.setProperty("--wp-blur", wpBlurPx(side) + "px");
    } catch (error) {
      /* 忽略 */
    }
    try {
      document.documentElement.style.setProperty("--wp-bright", wpBrightFactor(side));
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
    storageSet("wallpaperBrightness", state.wallpaperBrightness).catch(function () {});
    storageSet("wallpaperCrop", state.wallpaperCrop).catch(function () {});
  }

  /* 取景按当前屏幕比例计算，转屏/改窗口后重铺一次 */
  var wallpaperResizeTimer = 0;
  window.addEventListener("resize", function () {
    if (!wpCrop(wpSide())) return;
    clearTimeout(wallpaperResizeTimer);
    wallpaperResizeTimer = setTimeout(applyWallpaper, 120);
  });

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
      readInteractionSetting("interactionSettings").catch(function () { state.interactionReadError = true; return null; }),
      storageGet("wallpaperBrightness", null),
      storageGet("wallpaperCrop", null)
    ]).then(function (settings) {
      if (revision !== wallpaperLoadRevision) return;
      var saved = settings[0];
      var savedBlur = settings[1];
      var savedProbability = settings[2];
      var savedBright = settings[4];
      var savedCrop = settings[5];
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
      if (savedBright && typeof savedBright === "object") {
        ["light", "dark"].forEach(function (side) {
          if (typeof savedBright[side] === "number") state.wallpaperBrightness[side] = savedBright[side];
        });
      }
      if (savedCrop && typeof savedCrop === "object") {
        ["light", "dark"].forEach(function (side) {
          var crop = normalizeCrop(side, savedCrop[side]);
          if (crop) state.wallpaperCrop[side] = crop;
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

  var FACTORY_INTERACTION = Object.freeze({ count: 2, light: 0.71, strength: 11.6, randomOnLaunch: false, pace: 2.41 });

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
    // The drive switch leads the manager list.
    list.prepend(autoCard);
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
    // Only the saved defaults take factory values; current live values and the running session stay untouched.
    state.autoDriveLaunchOn = true; state.autoDriveReadError = false;
    autoLaunchTried = true;
    state.interactionReadError = false; state.probabilityDefaultReadError = false; state.collisionReadError = false; state.paceReadError = false;
    syncInteractionPanel(); syncProbabilityPanel(); syncCollisionPanel(); syncPacePanel(); syncAutoDriveLaunch(); syncFactoryPanel();
    var a = api(), writes = [];
    var countSnapshot = { version: 1, defaultCount: FACTORY_INTERACTION.count };
    countWriteQueue = countWriteQueue.then(function () { return writeInteractionSetting("interactionSettings", countSnapshot); })
      .then(function () { state.interactionDefaultCount = countSnapshot.defaultCount; return true; })
      .catch(function () { return false; });
    writes.push(countWriteQueue);
    var probabilitySnapshot = { version: 1, light: FACTORY_INTERACTION.light };
    probabilityDefaultWriteQueue = probabilityDefaultWriteQueue.then(function () { return writeInteractionSetting("probabilityDefaults", probabilitySnapshot); })
      .then(function () { state.probabilityDefault = probabilitySnapshot.light; return true; })
      .catch(function () { return false; });
    writes.push(probabilityDefaultWriteQueue);
    var collisionSnapshot = collisionAPI().normalize({ strength: FACTORY_INTERACTION.strength, randomOnLaunch: FACTORY_INTERACTION.randomOnLaunch });
    collisionWriteQueue = collisionWriteQueue.then(function () {
      if (a && a.storage) return a.storage.set("collisionSettings", collisionSnapshot);
      window.localStorage.setItem("aira-profile-card:collisionSettings", JSON.stringify(collisionSnapshot));
    }).then(function () { state.collisionDefault = collisionSnapshot; return true; })
      .catch(function () { return false; });
    writes.push(collisionWriteQueue);
    var paceSnapshot = paceAPI().normalize({ pace: FACTORY_INTERACTION.pace });
    paceWriteQueue = paceWriteQueue.then(function () {
      if (a && a.storage) return a.storage.set("motionSettings", paceSnapshot);
      window.localStorage.setItem("aira-profile-card:motionSettings", JSON.stringify(paceSnapshot));
    }).then(function () { state.paceDefault = paceSnapshot.pace; return true; })
      .catch(function () { return false; });
    writes.push(paceWriteQueue);
    writes.push(saveAutoDriveSettings());
    Promise.all(writes).then(function (saved) {
      state.factoryStatus = saved.every(Boolean) ? "已填入出厂默认值" : "部分出厂值尚未保存，请重试。";
    }).catch(function () { state.factoryStatus = "部分出厂值尚未保存，请重试。"; }).then(function () {
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

  function buildInteractionToolbar() {
    var toolbar = document.createElement("div");
    toolbar.className = "interaction-toolbar";
    toolbar.setAttribute("role", "group");
    toolbar.setAttribute("aria-label", "交互工具");
    var drive = document.createElement("button");
    drive.id = "btnPanelAutoDrive"; drive.type = "button";
    drive.className = "interaction-utility-button interaction-drive";
    drive.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.25"/><path d="m4.2 8.7 5.7 2.5m9.9-2.5-5.7 2.5M12 14.25v6.25"/></svg><span>Drive (FSD)</span><span class="interaction-drive-state" aria-hidden="true"><i></i><span id="panelAutoDriveState">关闭</span></span>';
    drive.addEventListener("click", toggleAutoDrive);
    toolbar.appendChild(drive);

    var actions = document.createElement("div");
    actions.className = "interaction-toolbar-actions";
    var statistics = document.createElement("button");
    statistics.id = "btnInteractionStats"; statistics.type = "button";
    statistics.className = "interaction-utility-button";
    statistics.setAttribute("aria-haspopup", "dialog");
    statistics.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5v15h16M7 14l4-5 4 3 5-7"/></svg><span>历史统计</span>';
    statistics.addEventListener("click", openStatsPanel);
    actions.appendChild(statistics);
    var defaults = document.createElement("button");
    defaults.id = "interactionDefaults"; defaults.type = "button";
    defaults.className = "interaction-utility-button";
    defaults.setAttribute("aria-haspopup", "dialog");
    defaults.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 4h11v16l-5.5-3.5L6.5 20z"/></svg><span>设默认值</span>';
    defaults.addEventListener("click", openDefaultsPanel);
    actions.appendChild(defaults);
    toolbar.appendChild(actions);
    return toolbar;
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
      ["落子与星座", "开局时，浮光在最大的连通留白里逐枚决定落位。贴近可触发密友掌舵feature，渐渐离群的失意却也会因撑起一片天空而获得奖赏。聚落与探索交替抽签，于是每次抬眼，都是一盘新的星座，而不是一张匀布的棋盘。"],
      ["有记忆的航向", "无人拨动时，航向交给 Ornstein–Uhlenbeck 均值回归随机过程：方向有记忆、有惯性，转弯从容。速度向航向缓缓弛豫，遇墙轻轻折返；相撞时按散射算法的加权偏转角成本重选去向，拥挤处再添一笔分离补足——越拥挤，越倾向散开。"],
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

  // Independent material choices and tuning share one versioned native preference.
  var glassLoadRevision = 0;
  var glassSaveQueue = Promise.resolve();
  var GLASS_PARAMETERS = [
    ["transparency", "通透度", "调节玻璃本身的遮罩感"],
    ["blur", "玻璃柔焦", "调节透过玻璃的背景轮廓"],
    ["warmth", "暖意", "从中性清白到温暖的杏色受光"],
    ["edge", "边缘光泽", "调节亮边与厚度感"],
    ["color", "环境色彩", "调节透过玻璃的背景颜色浓度"],
    ["touch", "触光强度", "调节接触时的反光，零为关闭"]
  ];
  function glassTuning(value) {
    var result = {};
    GLASS_PARAMETERS.forEach(function (parameter) {
      var n = value && value[parameter[0]];
      result[parameter[0]] = typeof n === "number" && isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 50;
    });
    return result;
  }
  function normalizeGlassMaterial(saved) {
    saved = saved && typeof saved === "object" ? saved : {};
    var tuning = saved.tuning || {};
    return { version: 2, home: saved.home === "classic" ? "classic" : "warm", sheets: saved.sheets === "classic" ? "classic" : "warm",
      tuning: { home: glassTuning(tuning.home), sheets: glassTuning(tuning.sheets) } };
  }
  function applyGlassMaterial() {
    var settings = state.glassMaterial;
    if (!settings.tuning) settings = state.glassMaterial = normalizeGlassMaterial(settings);
    root.dataset.homeGlass = settings.home;
    root.dataset.sheetGlass = settings.sheets;
    if (window.AiraGlassMaterial) window.AiraGlassMaterial.apply(settings.tuning);
    document.querySelectorAll("button[data-glass-target]").forEach(function (button) {
      button.disabled = !state.glassMaterialReady;
      button.setAttribute("aria-pressed", String(settings[button.dataset.glassTarget] === button.dataset.glassValue));
    });
    document.querySelectorAll("[data-glass-tuning]").forEach(function (group) { group.hidden = settings[group.dataset.glassTuning] !== "warm"; });
    document.querySelectorAll("input[data-glass-tune]").forEach(function (input) {
      var value = settings.tuning[input.dataset.glassOwner][input.dataset.glassTune];
      input.disabled = !state.glassMaterialReady;
      input.value = String(value);
      input.setAttribute("aria-valuetext", value + " / 100");
      input.style.setProperty("--tune-p", value + "%");
      input.nextElementSibling.value = String(value);
    });
    document.querySelectorAll(".glass-reset").forEach(function (button) { button.disabled = !state.glassMaterialReady; });
  }
  function saveGlassMaterial() {
    var saved = normalizeGlassMaterial(state.glassMaterial);
    var attempt = glassSaveQueue.then(function () { return storageSet("glassMaterial", saved); });
    glassSaveQueue = attempt.catch(function () { toast("材质已预览，保存未成功，请稍后重试"); });
    return attempt.then(function () { return true; }, function () { return false; });
  }
  function loadGlassMaterial() {
    var revision = ++glassLoadRevision;
    state.glassMaterialReady = false;
    applyGlassMaterial();
    return storageGet("glassMaterial", null).then(function (saved) {
      if (revision !== glassLoadRevision) return;
      state.glassMaterial = normalizeGlassMaterial(saved);
      state.glassMaterialReady = true;
      applyGlassMaterial();
    }).catch(function () { if (revision === glassLoadRevision) { state.glassMaterialReady = true; applyGlassMaterial(); } });
  }
  function buildGlassMaterialSettings() {
    var section = document.createElement("section");
    section.className = "glass-material-section";
    var title = document.createElement("p");
    title.className = "wp-label glass-material-title";
    title.textContent = "玻璃材质";
    section.appendChild(title);
    var capsule = document.createElement("div");
    capsule.className = "interaction-toolbar glass-material-settings";
    [["home", "主页主面板", "进阶调节", "高级调节"], ["sheets", "进阶弹出窗口", "更多调节", "进阶调节"]].forEach(function (target) {
      var block = document.createElement("div");
      block.className = "glass-target-block";
      var row = document.createElement("div");
      row.className = "glass-material-row";
      row.setAttribute("role", "group");
      row.setAttribute("aria-label", target[1] + "玻璃材质");
      var label = document.createElement("span");
      label.className = "glass-material-label";
      label.textContent = target[1];
      row.appendChild(label);
      [["classic", "经典磨砂玻璃"], ["warm", "暖光液态清璃"]].forEach(function (choice) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "interaction-utility-button glass-material-choice";
        button.textContent = choice[1];
        button.dataset.glassTarget = target[0];
        button.dataset.glassValue = choice[0];
        button.disabled = !state.glassMaterialReady;
        button.setAttribute("aria-pressed", String(state.glassMaterial[target[0]] === choice[0]));
        button.addEventListener("click", function () {
          ++glassLoadRevision;
          state.glassMaterial[target[0]] = choice[0];
          applyGlassMaterial();
          saveGlassMaterial();
        });
        row.appendChild(button);
      });
      block.appendChild(row);
      var tuning = document.createElement("div");
      tuning.className = "glass-tuning";
      tuning.dataset.glassTuning = target[0];
      tuning.hidden = state.glassMaterial[target[0]] !== "warm";
      var more = document.createElement("details");
      more.className = "glass-more";
      var summary = document.createElement("summary");
      summary.textContent = target[2];
      more.appendChild(summary);
      var advanced = document.createElement("details");
      advanced.className = "glass-more glass-more-advanced";
      var advancedSummary = document.createElement("summary");
      advancedSummary.textContent = target[3];
      advanced.appendChild(advancedSummary);
      var footer = document.createElement("div");
      footer.className = "glass-tuning-footer";
      // 收起时只留一行标题，页脚跟着 details 一起进出；展开后与原来一致。
      footer.hidden = true;
      more.addEventListener("toggle", function () { footer.hidden = !more.open; });
      var save = document.createElement("button");
      save.type = "button"; save.className = "glass-reset glass-save"; save.textContent = "保存定制设计";
      save.disabled = !state.glassMaterialReady;
      save.setAttribute("aria-label", "保存" + target[1] + "定制设计");
      save.addEventListener("click", function () {
        saveGlassMaterial().then(function (ok) { if (ok) toast("定制设计已保存"); });
      });
      var reset = document.createElement("button");
      reset.type = "button"; reset.className = "glass-reset"; reset.textContent = "恢复推荐值";
      reset.setAttribute("aria-label", "恢复" + target[1] + "推荐值");
      reset.disabled = !state.glassMaterialReady;
      reset.addEventListener("click", function () {
        ++glassLoadRevision;
        state.glassMaterial.tuning[target[0]] = glassTuning(null);
        applyGlassMaterial(); saveGlassMaterial();
      });
      footer.appendChild(save); footer.appendChild(reset);
      GLASS_PARAMETERS.forEach(function (parameter, index) {
        var line = document.createElement("label");
        line.className = "glass-tune-row";
        var name = document.createElement("span");
        name.textContent = parameter[1];
        name.title = parameter[2];
        var input = document.createElement("input");
        input.type = "range"; input.min = "0"; input.max = "100"; input.step = "1";
        input.className = "wp-range glass-tune-range";
        input.dataset.glassOwner = target[0]; input.dataset.glassTune = parameter[0];
        input.setAttribute("aria-label", target[1] + " · " + parameter[1]);
        input.disabled = !state.glassMaterialReady;
        var output = document.createElement("output");
        input.value = String(state.glassMaterial.tuning[target[0]][parameter[0]]);
        output.value = input.value;
        input.addEventListener("input", function () {
          ++glassLoadRevision;
          state.glassMaterial.tuning[target[0]][parameter[0]] = Number(input.value);
          applyGlassMaterial();
        });
        input.addEventListener("change", saveGlassMaterial);
        line.appendChild(name); line.appendChild(input); line.appendChild(output);
        (index < 3 ? more : advanced).appendChild(line);
      });
      more.appendChild(advanced);
      tuning.appendChild(more);
      tuning.appendChild(footer);
      block.appendChild(tuning); capsule.appendChild(block);
    });
    section.appendChild(capsule);
    return section;
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
    var zoom = document.createElement("button");
    zoom.type = "button";
    zoom.className = "wp-zoom";
    zoom.appendChild(icon(ICONS.spark, { fill: true }));
    zoom.addEventListener("click", function () { openWallpaperCrop(wpSide()); });
    blurRow.appendChild(blurLabel);
    blurRow.appendChild(range);
    blurRow.appendChild(value);
    blurRow.appendChild(zoom);

    var brightRow = document.createElement("div");
    brightRow.className = "wp-brightrow";
    var brightLabel = document.createElement("span");
    brightLabel.className = "wp-label";
    brightLabel.textContent = "亮度";
    var brightRange = document.createElement("input");
    brightRange.type = "range";
    brightRange.className = "wp-range";
    brightRange.min = String(WP_BRIGHT_MIN);
    brightRange.max = String(WP_BRIGHT_MAX);
    brightRange.step = "1";
    var brightValue = document.createElement("span");
    brightValue.className = "wp-value";
    var brightReset = document.createElement("button");
    brightReset.type = "button";
    brightReset.className = "wp-default";
    brightReset.textContent = "默认";
    brightReset.setAttribute("aria-label", "亮度恢复默认");
    brightReset.addEventListener("click", function () {
      state.wallpaperBrightness[wpSide()] = WP_BRIGHT_DEFAULT[wpSide()];
      brightRange.value = String(wpBrightPercent(wpSide()));
      brightValue.textContent = wpBrightPercent(wpSide()) + "%";
      applyWallpaper();
      paintThumbs();
      saveWallpaper();
    });
    brightRow.appendChild(brightLabel);
    brightRow.appendChild(brightRange);
    brightRow.appendChild(brightValue);
    brightRow.appendChild(brightReset);

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
    body.appendChild(brightRow);
    body.appendChild(buildGlassMaterialSettings());

    var thumbs = {};

    function paintThumbs() {
      ["light", "dark"].forEach(function (side) {
        var node = thumbs[side];
        if (node) node.style.filter = "blur(" + (wpBlurPercent(side) * WP_BLUR_RATIO * WP_THUMB_SCALE).toFixed(2) + "px) brightness(" + wpBrightFactor(side) + ")";
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
      syncBright();
      syncRandom();
    });

    function syncBlur() {
      var percent = wpBlurPercent(wpSide());
      range.value = String(percent);
      value.textContent = percent + "%";
    }

    function syncBright() {
      var side = wpSide();
      var percent = wpBrightPercent(side);
      brightRange.value = String(percent);
      brightValue.textContent = percent + "%";
      // 亮度只服务 Dark：Light 选中时这条滑轨向左收起来，取景入口同时淡入一下
      var off = side !== "dark";
      brightRow.classList.toggle("off", off);
      brightRange.disabled = off;
      zoom.setAttribute("aria-label", "调整 " + (side === "light" ? "Light" : "Dark") + " 取景");
      zoom.title = "调整取景";
      zoom.classList.remove("just");
      void zoom.offsetWidth;
      zoom.classList.add("just");
    }

    function makeThumb(side, item) {
      var crop = wpCrop(side);
      if (!crop) {
        var img = document.createElement("img");
        img.className = "wp-thumb";
        img.alt = "";
        img.src = item.thumb;
        thumbs[side] = img;
        return img;
      }
      // 自定义取景：拿原图按取景几何铺进 3:2 的缩略图
      var source = wpSource(side);
      var view = document.createElement("span");
      view.className = "wp-thumb wp-thumb-view";
      var layer = document.createElement("img");
      layer.className = "wp-thumb-src";
      layer.alt = "";
      layer.src = source.src;
      var geo = wpThumbGeometry(crop, 3 / 2, source.size);
      layer.style.width = geo.width;
      layer.style.height = geo.height;
      layer.style.left = geo.left;
      layer.style.top = geo.top;
      view.appendChild(layer);
      thumbs[side] = view;
      return view;
    }

    function refresh() {
      picks.textContent = "";
      ["light", "dark"].forEach(function (side) {
        var item = WALLPAPERS[side];
        var card = document.createElement("div");
        card.className = "wp-pick" + (wpSide() === side ? " on" : "");
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("aria-label", item.label + " 壁纸");
        card.setAttribute("aria-pressed", wpSide() === side ? "true" : "false");
        var wrap = document.createElement("span");
        wrap.className = "wp-thumbwrap";
        wrap.appendChild(makeThumb(side, item));
        var cap = document.createElement("span");
        cap.className = "cap";
        var name = document.createElement("b");
        name.textContent = item.label;
        var note = document.createElement("span");
        note.textContent = item.note;
        cap.appendChild(name);
        cap.appendChild(note);
        card.appendChild(wrap);
        card.appendChild(cap);
        var pick = function () {
          state.wallpaper = side;
          state.wallpaperRolled = side;
          applyWallpaper();
          saveWallpaper();
          refresh();
          syncBlur();
          syncBright();
        };
        card.addEventListener("click", pick);
        card.addEventListener("keydown", function (event) {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          pick();
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

    brightRange.addEventListener("input", function () {
      state.wallpaperBrightness[wpSide()] = Number(brightRange.value) || WP_BRIGHT_DEFAULT[wpSide()];
      brightValue.textContent = state.wallpaperBrightness[wpSide()] + "%";
      applyWallpaper();
      paintThumbs();
    });
    brightRange.addEventListener("change", saveWallpaper);

    openSheet({
      title: "壁纸",
      content: body,
      center: true,
      wide: true,
      buttons: [{ label: "完成", variant: "primary", size: "sm", run: function () { closeSheet(); } }]
    });
    refresh();
    syncBlur();
    syncBright();
    syncRandom();
    applyGlassMaterial();
  }

  /* ---------- 壁纸取景（Light / Dark 裁切调整） ---------- */

  function openWallpaperCrop(side) {
    side = side === "light" ? "light" : "dark";
    var source = wpSource(side);
    var view = wpViewport();
    var aspect = view.w / view.h;
    var defaultRegion = clampRegion(wpVisibleRegion(source.window, aspect));
    var frame = clampRegion(wpVisibleRegion(wpCrop(side) || source.window, aspect));
    var position = { x: frame.x, y: frame.y };
    var settleTimer = 0, drag = null, stageBuilt = false;

    function clampRegion(region) {
      var w = Math.min(region.w, source.size.w);
      var h = Math.min(region.h, source.size.h);
      return {
        x: Math.min(Math.max(region.x, 0), source.size.w - w),
        y: Math.min(Math.max(region.y, 0), source.size.h - h),
        w: w,
        h: h
      };
    }

    var editor = document.createElement("div");
    editor.className = "crop-editor";

    var hint = document.createElement("p");
    hint.className = "crop-hint";
    hint.textContent = "拖动取景框选择画面范围，松手后下方给出预览效果。";

    var box = document.createElement("div");
    box.className = "crop-box";
    var photo = document.createElement("img");
    photo.className = "crop-photo";
    photo.alt = "";
    photo.src = source.src;
    photo.style.filter = "brightness(" + wpBrightFactor(side) + ")";
    var handle = document.createElement("div");
    handle.className = "crop-frame";
    handle.tabIndex = 0;
    handle.setAttribute("aria-label", "取景框，拖动或方向键移动");
    box.appendChild(photo);
    box.appendChild(handle);

    var previewLabel = document.createElement("p");
    previewLabel.className = "crop-preview-label";
    previewLabel.textContent = "预览 · 套上界面后";
    var preview = document.createElement("div");
    preview.className = "crop-preview";
    var previewLayer = document.createElement("div");
    previewLayer.className = "crop-preview-layer";
    previewLayer.style.filter = "brightness(" + wpBrightFactor(side) + ")";
    preview.appendChild(previewLayer);

    editor.appendChild(hint);
    editor.appendChild(box);
    editor.appendChild(previewLabel);
    editor.appendChild(preview);

    function boxScale() {
      return (box.clientWidth || 1) / source.size.w;
    }

    function paintFrame() {
      var scale = boxScale();
      handle.style.left = (position.x * scale).toFixed(1) + "px";
      handle.style.top = (position.y * scale).toFixed(1) + "px";
      handle.style.width = (frame.w * scale).toFixed(1) + "px";
      handle.style.height = (frame.h * scale).toFixed(1) + "px";
    }

    function currentRegion() {
      return {
        x: Math.round(position.x),
        y: Math.round(position.y),
        w: Math.round(frame.w),
        h: Math.round(frame.h)
      };
    }

    function buildStage(previewWidth, live) {
      var stage = document.createElement("div");
      stage.className = "crop-preview-stage";
      stage.style.width = live.w + "px";
      stage.style.height = live.h + "px";
      stage.style.transform = "scale(" + (previewWidth / live.w).toFixed(5) + ")";
      [".topbar", ".page"].forEach(function (selector) {
        var node = document.querySelector(selector);
        if (!node) return;
        var rect = node.getBoundingClientRect();
        var clone = node.cloneNode(true);
        clone.removeAttribute("id");
        Array.prototype.forEach.call(clone.querySelectorAll("[id]"), function (child) { child.removeAttribute("id"); });
        clone.setAttribute("aria-hidden", "true");
        if ("inert" in clone) clone.inert = true;
        clone.style.position = "absolute";
        clone.style.left = Math.round(rect.left) + "px";
        clone.style.top = Math.round(rect.top) + "px";
        clone.style.width = Math.round(rect.width) + "px";
        clone.style.height = Math.round(rect.height) + "px";
        clone.style.margin = "0";
        stage.appendChild(clone);
      });
      preview.appendChild(stage);
    }

    function layoutPreview() {
      var live = wpViewport();
      var liveAspect = live.w / live.h;
      var maxWidth = Math.max(220, Math.min(editor.clientWidth || live.w, 560));
      var maxHeight = Math.max(190, Math.min(280, Math.round(live.h * 0.3)));
      var width = Math.min(maxWidth, maxHeight * liveAspect);
      var height = width / liveAspect;
      preview.style.width = Math.round(width) + "px";
      preview.style.height = Math.round(height) + "px";
      var geo = wpLayerBox(currentRegion(), width, height, source.size);
      previewLayer.style.backgroundImage = 'url("' + source.src + '")';
      previewLayer.style.backgroundSize = geo.size;
      previewLayer.style.backgroundPosition = geo.position;
      if (!stageBuilt) { buildStage(width, live); stageBuilt = true; }
    }

    function armSettle() {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(layoutPreview, WP_CROP_SETTLE);
    }

    function moveBy(dx, dy) {
      position.x = Math.min(Math.max(position.x + dx, 0), source.size.w - frame.w);
      position.y = Math.min(Math.max(position.y + dy, 0), source.size.h - frame.h);
      paintFrame();
    }

    function resetToDefault() {
      position.x = defaultRegion.x;
      position.y = defaultRegion.y;
      paintFrame();
      layoutPreview();
    }

    function commit() {
      var region = currentRegion();
      var near = function (a, b) { return Math.abs(a - b) < 1.5; };
      var isDefault = near(region.x, defaultRegion.x) && near(region.y, defaultRegion.y) &&
        near(region.w, defaultRegion.w) && near(region.h, defaultRegion.h);
      if (!state.wallpaperCrop || typeof state.wallpaperCrop !== "object") state.wallpaperCrop = {};
      if (isDefault) delete state.wallpaperCrop[side];
      else state.wallpaperCrop[side] = normalizeCrop(side, region);
      applyWallpaper();
      saveWallpaper();
      openWallpaperPanel();
    }

    box.addEventListener("pointerdown", function (event) {
      if (event.button) return;
      event.preventDefault();
      try { handle.setPointerCapture(event.pointerId); } catch (error) { /* 忽略 */ }
      handle.classList.add("dragging");
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, fx: position.x, fy: position.y };
    });

    handle.addEventListener("pointermove", function (event) {
      if (!drag || event.pointerId !== drag.id) return;
      var scale = boxScale();
      position.x = drag.fx + (event.clientX - drag.x) / scale;
      position.y = drag.fy + (event.clientY - drag.y) / scale;
      position.x = Math.min(Math.max(position.x, 0), source.size.w - frame.w);
      position.y = Math.min(Math.max(position.y, 0), source.size.h - frame.h);
      paintFrame();
    });

    function endDrag(event) {
      if (!drag || (event && event.pointerId !== drag.id)) return;
      try { handle.releasePointerCapture(drag.id); } catch (error) { /* 忽略 */ }
      handle.classList.remove("dragging");
      drag = null;
      armSettle();
    }
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);

    handle.addEventListener("keydown", function (event) {
      var step = event.shiftKey ? 96 : 24;
      if (event.key === "ArrowLeft") moveBy(-step, 0);
      else if (event.key === "ArrowRight") moveBy(step, 0);
      else if (event.key === "ArrowUp") moveBy(0, -step);
      else if (event.key === "ArrowDown") moveBy(0, step);
      else return;
      event.preventDefault();
      armSettle();
    });

    var actions = document.createElement("div");
    actions.className = "crop-actions";
    var resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "btn sm";
    resetButton.textContent = "恢复默认";
    resetButton.addEventListener("click", resetToDefault);
    var commitButton = document.createElement("button");
    commitButton.type = "button";
    commitButton.className = "btn primary sm";
    commitButton.textContent = "完成";
    commitButton.addEventListener("click", commit);
    actions.appendChild(resetButton);
    actions.appendChild(commitButton);
    editor.appendChild(actions);

    openSheet({
      title: "调整取景",
      sub: (side === "light" ? "Light" : "Dark") + " 壁纸 · 拖动取景框选择画面位置",
      content: editor,
      center: true,
      wide: true
    });
    paintFrame();
    layoutPreview();
    requestAnimationFrame(paintFrame);
    photo.addEventListener("load", paintFrame);
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

  function bindSettingsLauncher() {
    var node = $("btnSettings");
    if (!node) return;
    var timer = null, start = null, suppressClick = false, longPressPoint = null;
    function clear() { if (timer) clearTimeout(timer); timer = null; }
    function cancel() { clear(); start = null; suppressClick = true; }
    // 与星球长按同一套兜底：部分触摸 WebView 会把松手时的兼容点击改派到刚浮出的遮罩上，
    // 只吞掉这一次延续；下一次真实 pointerdown 立即复位。
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
        openAboutSheet();
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
      var entry = entryByKey("settings");
      if (entry) openEntry(entry);
    });
    // 键盘：Enter / 空格照旧进设置中心，Shift+Enter 或菜单键等价于长按。
    node.addEventListener("keydown", function (event) {
      if ((event.key === "Enter" && event.shiftKey) || event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
        event.preventDefault(); cancel(); openAboutSheet();
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

  var searchMotionSettings = { enabled: true, variant: "beam", random: false };
  var searchSimulation = null;
  var searchMotionReady = false, searchMotionRevision = 0, searchMotionPanel = null;
  var searchMotionWriteQueue = Promise.resolve();
  var searchMotionLoad = Promise.resolve();
  function normalizedSearchMotion(value) {
    var ids = ["beam", "prism", "shutter", "filament", "thread", "orbit"];
    return { enabled: !value || value.enabled !== false, variant: value && ids.indexOf(value.variant) >= 0 ? value.variant : "beam", random: !!value && value.random === true };
  }
  function nextSearchVariant() {
    var ids = ["beam", "prism", "shutter", "filament", "thread", "orbit"];
    return searchMotionSettings.random ? ids[Math.floor(Math.random() * ids.length)] : searchMotionSettings.variant;
  }
  function loadSearchMotionSettings() {
    var revision = ++searchMotionRevision;
    searchMotionReady = false;
    searchMotionLoad = readInteractionSetting("searchMotion").then(function (value) {
      if (revision === searchMotionRevision) searchMotionSettings = normalizedSearchMotion(value);
    }).catch(function () {}).then(function () { searchMotionReady = true; });
  }
  // 动效面板右上角方块：跳 Aira 官方搜索设置，先收起面板再交还给宿主
  function openEngineSettings() {
    var entry = entryByKey("searchSettings");
    if (!entry) return;
    closeSheet();
    openEntry(entry);
  }

  function openSearchMotionPanel() {
    if (!window.AiraSearchMotionPanel) return;
    if (!searchMotionReady) { searchMotionLoad.then(openSearchMotionPanel); return; }
    // The default is available immediately; a deliberate selection wins over a late read.
    ++searchMotionRevision;
    openSheet({ title: "搜索动效", center: true, wide: true, motion: true });
    searchMotionPanel = window.AiraSearchMotionPanel.mount(el.sheet, {
      settings: searchMotionSettings, play: window.AiraSearchMotion.play, onClose: closeSheet,
      onEngineSettings: openEngineSettings,
      simulationEnabled: !!searchSimulation && searchSimulation.isEnabled(),
      onSimulationChange: function (enabled) { if (searchSimulation) searchSimulation.setEnabled(enabled); },
      onChange: function (next) {
        ++searchMotionRevision; searchMotionReady = true;
        searchMotionSettings = normalizedSearchMotion(next);
        var snapshot = Object.assign({}, searchMotionSettings);
        searchMotionWriteQueue = searchMotionWriteQueue.catch(function () {}).then(function () {
          return writeInteractionSetting("searchMotion", snapshot);
        }).catch(function () { toast("动效已应用，本次设置未能保存"); });
      }
    });
    el.sheet.querySelector(".sm-toggle").focus({ preventScroll: true });
  }

  function bindMainSearch() {
    var form = $("searchForm");
    var input = $("searchInput");
    var composing = false;
    var imeEnter = false;
    var imeEnterTimer = null;
    var resetOnReturn = false;
    var submitting = false;
    var nativeMotion = null, nativeDraft = "";
    if (window.AiraSearchSimulation) searchSimulation = window.AiraSearchSimulation.mount({
      form: form, input: input, button: $("btnSystemSearch"),
      getVariant: nextSearchVariant,
      onBeforeEnable: function () {
        if (nativeMotion) { nativeMotion.cancel(); nativeMotion = null; input.value = nativeDraft; }
        submitting = false; resetOnReturn = false;
      },
      onChange: function (enabled) {
        if (searchMotionPanel) searchMotionPanel.setSimulationEnabled(enabled);
      }
    });

    function clearInput() {
      // Clear both the live value and form default before native navigation can
      // suspend the WebView or capture its history snapshot.
      input.value = "";
      input.defaultValue = "";
      composing = false;
      input.blur();
    }

    input.addEventListener("input", function () {
      // A new draft belongs to the user; delayed lifecycle events must not erase it.
      resetOnReturn = false;
    });
    input.addEventListener("compositionstart", function () { composing = true; });
    input.addEventListener("compositionend", function () { composing = false; });
    input.addEventListener("keydown", function (event) {
      if ((event.key === "Enter" || event.keyCode === 13) &&
          (composing || event.isComposing || event.keyCode === 229)) {
        // Some IMEs end composition before the Enter default action submits.
        // Let the IME commit, but ignore a submit from this same key event.
        imeEnter = true;
        clearTimeout(imeEnterTimer);
        imeEnterTimer = setTimeout(function () { imeEnter = false; }, 0);
      }
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (composing || imeEnter || submitting) return;
      var draft = input.value;
      var query = draft.trim();
      if (!query) { input.focus(); return; }
      var a = api();
      if (a && typeof a.search !== "function") {
        toast("搜索接口暂不可用，请稍后重试");
        return;
      }
      submitting = true;
      nativeDraft = draft;
      var dispatched = false;
      function dispatchSearch() {
        if (dispatched) return;
        dispatched = true;
        nativeMotion = null;
        resetOnReturn = true;
        clearInput();
        try {
          if (a) a.search(query);
          else toast("预览模式：会搜索「" + query + "」");
        } catch (error) {
          resetOnReturn = false;
          input.value = draft;
          input.focus();
          toast("搜索未能发出，请重试");
        } finally { submitting = false; }
      }
      if (searchMotionReady && searchMotionSettings.enabled && window.AiraSearchMotion) {
        var motion = window.AiraSearchMotion.play({ form: form, input: input, button: $("btnSystemSearch"), text: draft,
          variant: nextSearchVariant(), onFinish: dispatchSearch });
        if (!dispatched) nativeMotion = motion;
        // play() can complete synchronously for reduced motion or unavailable Canvas.
        if (!dispatched) { input.value = ""; input.defaultValue = ""; }
      } else dispatchSearch();
    });

    window.addEventListener("pagehide", function () {
      if (resetOnReturn) clearInput();
    });
    window.addEventListener("pageshow", function () {
      if (!resetOnReturn) return;
      clearInput();
      resetOnReturn = false;
    });
    document.addEventListener("visibilitychange", function () {
      if (!resetOnReturn) return;
      clearInput();
      if (!document.hidden) resetOnReturn = false;
    });
  }

  function bindInteractions() {
    if (iconsBound) return;
    iconsBound = true;

    bindDailyLog();
    bindWallpaper();
    mountInteraction();

    var a = function () { return api(); };

    $("btnHistory").addEventListener("click", function () {
      if (a() && typeof a().openHistory === "function") a().openHistory();
      else toast("预览模式：这里会打开 Aira 历史记录");
    });

    bindInteractionLauncher();
    bindSettingsLauncher();
    bindAutoDrive();
    bindScanLauncher();

    $("btnSearch").addEventListener("click", function () {
      if (a() && typeof a().openSearch === "function") a().openSearch();
      else toast("预览模式：这里会展开 Aira 系统搜索");
    });

    $("btnTabs").addEventListener("click", function () {
      if (a() && typeof a().openTabs === "function") a().openTabs();
      else toast("预览模式：这里会打开标签后台");
    });

    bindMainSearch();
    $("btnSearchMotion").addEventListener("click", openSearchMotionPanel);

    $("btnPrivacy").addEventListener("click", function () {
      if (a() && typeof a().togglePrivateMode === "function") a().togglePrivateMode();
      else toast("预览模式：进入或退出隐私模式会由 Aira 确认");
    });

    $("btnEditProfile").addEventListener("click", openProfileEditor);

    $("btnEditMode").addEventListener("click", function () { setEditing(!state.editing); });

    el.sheetMask.addEventListener("click", closeSheet);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !el.sheetRoot.hidden) closeSheet();
      if (event.key === "Tab" && (statsParent || defaultsParent || (!el.sheetRoot.hidden && el.sheet.classList.contains("search-motion-sheet")))) {
        var focusable = Array.from(el.sheet.querySelectorAll('button:not(:disabled), select, input:not(:disabled), [tabindex="0"]')).filter(function (node) { return !node.hidden && node.getClientRects().length; });
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
    var stage = a && !a.__isBrowserDemo ? 2 : 1;
    if (initStage >= stage) return;
    initStage = stage;
    initStats();
    initField();
    loadUiPrefs();
    loadGlassMaterial();
    loadSearchMotionSettings();
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
    }
    if (typeof a.getTheme === "function") {
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
    bindCardClearance();

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  boot();
})();
