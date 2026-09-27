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
    hand: "M9 11.5V5.6a1.5 1.5 0 0 1 3 0v5.4M12 10.8V4.9a1.5 1.5 0 0 1 3 0v6.3M15 11.5V7.2a1.5 1.5 0 0 1 3 0v8.3a5.5 5.5 0 0 1-5.5 5.5H11a5 5 0 0 1-4.2-2.3L4.3 14.2a1.6 1.6 0 0 1 2.7-1.7l2 2.9"
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
    renderBadges();
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
      // 🧊：内嵌 128px 表情快照的矢量包（不用系统表情字体，形状/配色与原图一致）
      var cube = document.createElement("span");
      cube.className = "ice-cube";
      cube.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">' +
        '<image href="data:image/png;base64,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" width="128" height="128"/>' +
        '</svg>';
      gripBadge.appendChild(cube.firstElementChild);
      var gripText = document.createElement("strong");
      gripText.textContent = customGrip || state.gripLabel || "握姿待命";
      gripBadge.appendChild(gripText);
      el.badges.appendChild(gripBadge);
    }
  }

  /* ---------- 快捷方式 ---------- */

  function shortcutLetter(container, item) {
    var text = String(item.title || item.url || "?").trim();
    container.textContent = text.slice(0, 1) || "?";
  }

  function renderShortcutIcon(container, item) {
    container.textContent = "";
    container.style.color = "";
    container.style.background = "";
    var a = api();
    if (a && typeof a.renderShortcutIcon === "function") {
      try {
        if (a.renderShortcutIcon(container, item)) return;
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
        shortcutLetter(container, item);
      });
      container.appendChild(img);
      return;
    }
    shortcutLetter(container, item);
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
          openShortcutMenu(item);
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

  function init() {
    var a = api();

    loadProfile();
    bindInteractions();
    renderEntries();
    bindMotion();
    applySystemThemeGuess();

    if (!a) {
      state.demo = true;
      loadEngines();
      loadShortcuts();
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
