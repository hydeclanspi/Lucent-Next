/* airhome (personal) browser demonstration bridge · hydeclanspi
 * Optional web-only adapter. It never assigns window.AiraHome.
 * Native packages omit this file. Callers prefer AiraHome over AiraBrowserBridge.
 */
(function () {
  "use strict";
  if (window.AiraHome || window.AiraBrowserBridge) return;

  var PREFIX = "airhome-personal:browser:v1:";
  var HOME_PREFIX = "aira-profile-card:";
  var active = true;
  var privateMode = false;
  var privateEngine = "";
  var backActive = false;
  var overlay = null, dialog = null, body = null, feedback = null;
  var returnFocus = null, inertNodes = [], overflowBefore = "";
  var listeners = [];
  var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var SVG_NS = "http://www.w3.org/2000/svg";

  function copy(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
  function read(key, fallback) {
    try { var raw = localStorage.getItem(PREFIX + key); return raw === null ? copy(fallback) : JSON.parse(raw); }
    catch (_) { return copy(fallback); }
  }
  function write(key, value) { localStorage.setItem(PREFIX + key, JSON.stringify(value)); }
  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    listeners.push(function () { target.removeEventListener(type, handler, options); });
  }
  function emit(type, detail) {
    if (isActive()) window.dispatchEvent(new CustomEvent(type, { detail: copy(detail) }));
  }
  function isActive() {
    if (active && window.AiraHome) deactivate();
    return active;
  }
  function error(message, code) { var err = new Error(message); err.code = code || "BROWSER_DEMO_ERROR"; return err; }
  function promise(run) { return Promise.resolve().then(run); }
  function defer(run) { Promise.resolve().then(function () { if (isActive()) run(); }); }
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(text, run, kind) {
    var node = el("button", "ab-btn" + (kind ? " ab-" + kind : ""), text);
    node.type = "button";
    node.addEventListener("click", function () { try { run(); } catch (err) { notify(err.message); } });
    return node;
  }
  var paths = {
    close: "M6 6l12 12M18 6 6 18", search: "M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15M16 16l5 5",
    history: "M4 8a8 8 0 1 1-1 7M4 3v5h5M12 7v5l3 2", arrow: "M5 12h14M13 6l6 6-6 6",
    bookmarks: "M3 5c3-1 6-1 9 1v14c-3-2-6-2-9-1V5zm9 1c3-2 6-2 9-1v14c-3-1-6-1-9 1",
    tabs: "M7 3h14v14M3 7h14v14H3z", download: "M12 3v12M7 10l5 5 5-5M4 17v4h16v-4",
    page: "M5 3h9l5 5v13H5zM14 3v5h5M8 13h8M8 17h6", shield: "M12 3 20 6v6c0 5-8 9-8 9s-8-4-8-9V6z",
    settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2",
    scan: "M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6M5 12h14", code: "M8 6l-6 6 6 6M16 6l6 6-6 6M14 3l-4 18"
  };
  function icon(name) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.6"); svg.setAttribute("stroke-linecap", "round"); svg.setAttribute("stroke-linejoin", "round");
    var path = document.createElementNS(SVG_NS, "path"); path.setAttribute("d", paths[name] || paths.page); svg.appendChild(path); return svg;
  }
  function svgUrl(markup) { return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup); }
  // Small locally drawn marks; no favicon service, font download or remote image request.
  var engineIcons = {
    baidu: svgUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><g fill="#346afa"><ellipse cx="10" cy="13" rx="4" ry="6" transform="rotate(-25 10 13)"/><ellipse cx="20" cy="8" rx="4" ry="6"/><ellipse cx="30" cy="13" rx="4" ry="6" transform="rotate(25 30 13)"/><path d="M8 30c0-6 7-13 12-13s12 7 12 13c0 8-8 6-12 6s-12 2-12-6"/></g><text x="20" y="32" text-anchor="middle" font-family="Arial" font-size="14" fill="white" font-weight="bold">du</text></svg>'),
    google: svgUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="M33 10A16 16 0 0 0 8 10" fill="none" stroke="#ea4335" stroke-width="7"/><path d="M8 10A16 16 0 0 0 8 30" fill="none" stroke="#fbbc05" stroke-width="7"/><path d="M8 30A16 16 0 0 0 31 31" fill="none" stroke="#34a853" stroke-width="7"/><path d="M31 31c4-4 5-8 4-12H20" fill="none" stroke="#4285f4" stroke-width="7"/></svg>'),
    bing: svgUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="M9 3l9 4v22l11-6-8-4 3-8 12 7v10L15 39l-6-5z" fill="#40b8ef"/><path d="m18 29 11-6-8-4 3-8 12 7v10L15 39l-6-5z" fill="#38a3d7" opacity=".5"/></svg>'),
    hydeclanspi: svgUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect x="3" y="3" width="34" height="34" rx="10" fill="#d8d8d6"/><text x="20" y="30" text-anchor="middle" font-family="Arial" font-size="29" fill="#8a8d91">h</text></svg>')
  };
  var engines = [
    { id: "baidu", name: "Baidu", kind: "built_in", icon: engineIcons.baidu },
    { id: "google", name: "Google", kind: "built_in", icon: engineIcons.google },
    { id: "bing", name: "Bing", kind: "built_in", icon: engineIcons.bing },
    { id: "hydeclanspi", name: "hydeclanspi", kind: "custom", icon: engineIcons.hydeclanspi }
  ];
  var initialShortcuts = [
    { id: "demo-bookmarks", kind: "system", iconId: "browser.shortcut.bookmarks", title: "书签", url: "", position: 0, icon: "", iconRendering: "" },
    { id: "demo-moodle", kind: "web", iconId: "", title: "Moodle", url: "https://moodle.ucl.ac.uk/", position: 1, icon: "", iconRendering: "", demoMark: "ucl" },
    { id: "demo-claude", kind: "web", iconId: "", title: "Claude Code", url: "https://claude.ai/code", position: 2, icon: "", iconRendering: "", demoMark: "claude" }
  ];
  var shortcuts = read("shortcuts", initialShortcuts);
  if (!Array.isArray(shortcuts)) shortcuts = copy(initialShortcuts);
  var selectedEngine = read("engine", "google");
  if (!engines.some(function (item) { return item.id === selectedEngine; })) selectedEngine = "google";
  var themeMode = read("theme", "light");
  if (["light", "dark", "system"].indexOf(themeMode) < 0) themeMode = "light";
  var tabs = [{ id: "home", title: "airhome (personal)", url: "", home: true }];
  var examples = [
    { title: "HarmonyOS · 设计与开发", url: "https://developer.huawei.com/consumer/cn/", tag: "示例" },
    { title: "GitHub · 灵感从这里开始", url: "https://github.com/", tag: "示例" },
    { title: "UCL Moodle", url: "https://moodle.ucl.ac.uk/", tag: "示例" }
  ];

  function notify(message) {
    if (feedback) { feedback.textContent = message; feedback.hidden = false; }
  }
  function focusables() {
    return dialog ? Array.from(dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')).filter(function (node) { return !node.hidden && node.getClientRects().length; }) : [];
  }
  function close() {
    if (!overlay) return;
    overlay.remove(); overlay = dialog = body = feedback = null;
    inertNodes.forEach(function (item) { item.node.inert = item.was; }); inertNodes = [];
    document.body.style.overflow = overflowBefore;
    var target = returnFocus; returnFocus = null;
    if (target && target.isConnected && !target.closest("[hidden]")) target.focus({ preventScroll: true });
    else { var fallback = document.getElementById("btnSearch"); if (fallback) fallback.focus({ preventScroll: true }); }
  }
  function show(title, subtitle, symbol, build) {
    if (!isActive()) return;
    if (!overlay) {
      returnFocus = document.activeElement;
      overflowBefore = document.body.style.overflow; document.body.style.overflow = "hidden";
      overlay = el("div", "ab-overlay");
      overlay.addEventListener("click", function (event) { if (event.target === overlay) { event.stopPropagation(); close(); } });
      document.body.appendChild(overlay);
      Array.from(document.body.children).forEach(function (node) {
        if (node !== overlay && node.tagName !== "SCRIPT") { inertNodes.push({ node: node, was: node.inert }); node.inert = true; }
      });
    }
    overlay.textContent = "";
    dialog = el("section", "ab-dialog"); dialog.setAttribute("role", "dialog"); dialog.setAttribute("aria-modal", "true"); dialog.setAttribute("aria-labelledby", "ab-title"); dialog.setAttribute("aria-describedby", "ab-subtitle"); dialog.tabIndex = -1;
    var header = el("header", "ab-header");
    var mark = el("span", "ab-mark"); mark.appendChild(icon(symbol));
    var headings = el("div", "ab-headings"); headings.appendChild(el("span", "ab-eyebrow", "AIRHOME (PERSONAL) / 浏览器演示"));
    var h = el("h2", "", title); h.id = "ab-title"; headings.appendChild(h);
    var sub = el("p", "ab-subtitle", subtitle); sub.id = "ab-subtitle"; headings.appendChild(sub);
    var exit = button("", close, "icon"); exit.setAttribute("aria-label", "关闭"); exit.appendChild(icon("close"));
    header.append(mark, headings, exit); dialog.appendChild(header);
    body = el("div", "ab-body"); dialog.appendChild(body);
    feedback = el("p", "ab-feedback"); feedback.setAttribute("role", "status"); feedback.hidden = true; dialog.appendChild(feedback);
    overlay.appendChild(dialog); build(body);
    requestAnimationFrame(function () {
      if (!dialog) return;
      var input = dialog.querySelector("[data-autofocus]");
      (input || dialog).focus({ preventScroll: true });
    });
  }
  function note(parent, text) { parent.appendChild(el("p", "ab-note", text)); }
  function section(parent, text, count) {
    var head = el("div", "ab-section");
    head.appendChild(el("h3", "ab-section-title", text));
    if (count !== undefined) head.appendChild(el("span", "ab-count", String(count)));
    head.appendChild(el("span", "ab-section-rule"));
    parent.appendChild(head);
  }
  function emptyState(parent, title, detail) {
    var box = el("div", "ab-empty");
    var orb = el("span", "ab-empty-orb"); orb.setAttribute("aria-hidden", "true"); orb.appendChild(el("i"));
    var copy = el("span", "ab-empty-copy"); copy.appendChild(el("strong", "", title)); copy.appendChild(el("p", "", detail));
    box.append(orb, copy); parent.appendChild(box);
  }
  function actions(parent, nodes) { var row = el("div", "ab-actions"); nodes.forEach(function (node) { row.appendChild(node); }); parent.appendChild(row); }
  function field(parent, title, value, hint, multiline) {
    var label = el("label", "ab-field"); label.appendChild(el("span", "ab-field-label", title));
    var input = el(multiline ? "textarea" : "input", "ab-input"); if (!multiline) input.type = "text";
    input.value = value || ""; input.spellcheck = false; if (hint) input.placeholder = hint;
    label.appendChild(input); parent.appendChild(label); return input;
  }
  function row(parent, title, detail, run, symbol, tag) {
    var node = el(run ? "button" : "div", "ab-row"); if (run) { node.type = "button"; node.addEventListener("click", run); }
    var badge = el("span", "ab-row-icon"); badge.appendChild(icon(symbol || "page"));
    var text = el("span", "ab-row-text"); text.appendChild(el("strong", "", title)); if (detail) text.appendChild(el("span", "", detail));
    node.append(badge, text); if (tag) node.appendChild(el("span", "ab-tag", tag));
    if (run) { var arrow = icon("arrow"); arrow.setAttribute("class", "ab-row-arrow"); node.appendChild(arrow); }
    parent.appendChild(node); return node;
  }
  function safeUrl(value) {
    var raw = String(value || "").trim();
    if (!raw || /[\u0000-\u0020\u007f]/.test(raw)) throw error("请输入完整的 http 或 https 网页地址。");
    var parsed; try { parsed = new URL(raw); } catch (_) { throw error("请输入完整的 http 或 https 网页地址。"); }
    if (["http:", "https:"].indexOf(parsed.protocol) < 0 || parsed.username || parsed.password) throw error("仅支持不含账号信息的 http 或 https 网页地址。");
    return parsed.href;
  }
  function historyItems() { var value = read("history", []); return Array.isArray(value) ? value : []; }
  function recordOpen(url, title) {
    if (privateMode) return;
    var items = historyItems(); items.unshift({ title: title || new URL(url).hostname, url: url, at: Date.now() });
    try { write("history", items.slice(0, 80)); } catch (_) { notify("网页可正常打开；本地记录未能保存。"); }
    tabs.push({ id: "tab-" + Date.now() + "-" + Math.random().toString(16).slice(2), title: title || new URL(url).hostname, url: url });
    emit("aira-home-tabs-changed", { count: tabs.length });
  }
  function openTarget(value, title) {
    var url;
    try { url = safeUrl(value); } catch (err) { show("无法打开这个地址", "检查地址后再试一次。", "shield", function (content) { note(content, err.message); actions(content, [button("返回", close)]); }); return; }
    recordOpen(url, title);
    close();
    window.location.assign(url);
  }

  function engineState() { return { selectedEngineId: privateMode ? (privateEngine || selectedEngine) : selectedEngine, selectionScope: privateMode ? "session" : "persistent", engines: copy(engines) }; }
  function customTemplate() { return String(read("customTemplate", "") || ""); }
  function validateTemplate(value) {
    if (!/\{query\}/.test(value)) throw error("请在搜索词的位置使用 {query}。");
    safeUrl(value.replace(/\{query\}/g, "aira")); return value;
  }
  function search(query, options) {
    var text = String(query || "").trim(); if (!text) { openSearch(); return; }
    if (/^[a-z][a-z0-9+.-]*:/i.test(text)) { openTarget(text, text); return; }
    if (/^(localhost(?::\d+)?|(?:[a-z0-9-]+\.)+[a-z]{2,})(?:[/:?#]|$)/i.test(text) && !/\s/.test(text)) { openTarget("https://" + text, text); return; }
    var id = options && options.engineId || engineState().selectedEngineId;
    var templates = { baidu: "https://www.baidu.com/s?wd={query}", google: "https://www.google.com/search?q={query}", bing: "https://www.bing.com/search?q={query}", hydeclanspi: customTemplate() };
    if (!templates[id]) { openEngineEditor(text); return; }
    var url; try { url = validateTemplate(templates[id]).replace(/\{query\}/g, encodeURIComponent(text)); } catch (_) { openEngineEditor(text); return; }
    var name = engines.find(function (item) { return item.id === id; }); openTarget(url, (name ? name.name : "搜索") + " · " + text);
  }
  function openSearch() {
    show("搜索", "输入关键词或网址，沿着灵感继续。", "search", function (content) {
      var form = el("form", "ab-form"); content.appendChild(form);
      var input = field(form, "关键词或网址", "", "搜索或输入网址"); input.setAttribute("data-autofocus", ""); input.autocomplete = "off";
      var current = engines.find(function (item) { return item.id === engineState().selectedEngineId; });
      note(form, "当前引擎 · " + current.name);
            var cleanSubmit = el("button", "ab-btn ab-primary", "继续"); cleanSubmit.type = "submit";
      actions(form, [button("搜索设置", openSearchSettings), cleanSubmit]);
      form.addEventListener("submit", function (event) { event.preventDefault(); if (input.value.trim()) search(input.value); });
    });
  }
  function setEngine(id) {
    return promise(function () {
      if (!engines.some(function (item) { return item.id === id; })) throw error("这个搜索引擎当前不可用", "ENGINE_NOT_AVAILABLE");
      if (id === "hydeclanspi" && !customTemplate()) { defer(openEngineEditor); return engineState(); }
      if (privateMode) privateEngine = id; else { write("engine", id); selectedEngine = id; }
      var result = engineState(); emit("aira-home-search-engines-changed", result); return result;
    });
  }
  function openEngineEditor(pendingQuery) {
    show("hydeclanspi", "为这个自定义入口设置一个搜索网址。", "search", function (content) {
      note(content, "用自己喜欢的搜索服务，为这个入口赋予个性。");
      var template = field(content, "搜索 URL 模板", customTemplate(), "https://example.com/search?q={query}");
      var form = el("form", "ab-form"); content.appendChild(form); form.appendChild(template.parentElement);
      note(form, "用 {query} 标记搜索词的位置，仅支持 http 或 https。");
      var save = el("button", "ab-btn ab-primary", "保存并选用"); save.type = "submit";
      actions(form, [button("返回搜索设置", openSearchSettings), save]);
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        try { write("customTemplate", validateTemplate(template.value.trim())); }
        catch (err) { notify(err.message); return; }
        setEngine("hydeclanspi").then(function () { if (pendingQuery) search(pendingQuery, { engineId: "hydeclanspi" }); else openSearchSettings(); }).catch(function (err) { notify(err.message); });
      });
    });
  }
  function openSearchSettings() {
    show("搜索设置", "选择下一次探索的起点。", "search", function (content) {
      var selected = engineState().selectedEngineId;
      engines.forEach(function (engine) {
        var detail = engine.id === "hydeclanspi" ? (customTemplate() ? "自定义模板已配置" : "未配置 · 点击设置 URL 模板") : "公共搜索引擎";
        row(content, engine.name, detail, function () { setEngine(engine.id).then(function () { if (engine.id !== "hydeclanspi" || customTemplate()) openSearchSettings(); }).catch(function (err) { notify(err.message); }); }, "search", selected === engine.id ? "已选" : "");
      });
      actions(content, [button("编辑自定义模板", function () { openEngineEditor(); }), button("完成", close)]);
      note(content, privateMode ? "引擎选择仅用于当前演示隐私会话。" : "偏好保存在当前浏览器中。");
    });
  }
  function openHistory() {
    show("历史记录", "回到灵感经过的地方。", "history", function (content) {
      var items = historyItems();
      section(content, "本演示中的打开请求", items.length);
      if (!items.length) emptyState(content, "还没有留下足迹", "从这里打开的网页，会安静地排在这里。");
      items.forEach(function (item) { row(content, item.title, new Date(item.at).toLocaleString("zh-CN") + " · " + item.url, function () { openTarget(item.url, item.title); }, "history"); });
      if (items.length) actions(content, [button("清空演示记录", function () { confirmAction("清空记录", "只删除这个演示保存的打开请求。", function () { write("history", []); openHistory(); }); })]);
      section(content, "界面示例", examples.slice(0, 2).length);
      examples.slice(0, 2).forEach(function (item) { row(content, item.title, item.url, function () { openTarget(item.url, item.title); }, "history", "样例"); });
      note(content, "样例不代表任何人的访问历史。本页面无法读取真实浏览器历史。");
    });
  }
  function openBookmarks() {
    show("书签", "留住值得再次打开的页面。", "bookmarks", function (content) {
      note(content, "以下是公开网页样例。你添加的收藏只保存在当前浏览器的演示中。");
      var items = read("bookmarks", examples); if (!Array.isArray(items)) items = copy(examples);
      items.forEach(function (item, index) {
        var wrap = el("div", "ab-managed-row"); content.appendChild(wrap);
        row(wrap, item.title, item.url, function () { openTarget(item.url, item.title); }, "bookmarks", item.tag || "");
        var remove = button("移除", function () { var next = items.slice(); next.splice(index, 1); write("bookmarks", next); openBookmarks(); }, "quiet"); remove.setAttribute("aria-label", "移除书签 " + item.title); wrap.appendChild(remove);
      });
      actions(content, [button("添加书签", function () { editLink("添加书签", null, function (item) { var next = items.slice(); next.push(item); write("bookmarks", next); openBookmarks(); }); }, "primary")]);
    });
  }
  function openTabs() {
    show("全部标签", "用一个轻盈的视图，安放正在进行的探索。", "tabs", function (content) {
      note(content, "这里管理演示标签，不会读取或关闭浏览器的真实标签页。");
      tabs.forEach(function (item) {
        var wrap = el("div", "ab-managed-row"); content.appendChild(wrap);
        row(wrap, item.title, item.home ? "此刻 · airhome (personal)" : item.url, item.home ? close : function () { openTarget(item.url, item.title); }, "tabs", item.home ? "当前" : "演示");
        if (!item.home) { var remove = button("关闭", function () { tabs = tabs.filter(function (tab) { return tab.id !== item.id; }); emit("aira-home-tabs-changed", { count: tabs.length }); openTabs(); }, "quiet"); remove.setAttribute("aria-label", "关闭演示标签 " + item.title); wrap.appendChild(remove); }
      });
      actions(content, [button("新建演示标签", openSearch, "primary")]);
    });
  }
  function saveJson() {
    var snapshot = { format: "aira-home-browser-demo", exportedAt: new Date().toISOString(), theme: themeMode, shortcuts: copy(shortcuts), engine: selectedEngine, customTemplate: customTemplate(), bookmarks: read("bookmarks", examples) };
    var blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob), anchor = el("a"); anchor.href = url; anchor.download = "airhome-personal-browser-preferences.json";
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    notify("已请求下载当前浏览器的演示偏好。");
  }
  function openDownloads() {
    show("下载管理", "需要的内容，妥帖地留在手边。", "download", function (content) {
      row(content, "airhome-personal-5.0.0.zip", "完成状态展示 · 示例文件，没有实际下载", null, "download", "样例");
      section(content, "可用操作");
      row(content, "导出演示偏好", "将主题、快捷方式与引擎设置保存为本地 JSON", saveJson, "download");
      note(content, "网页无法读取浏览器下载列表。Aira 原生环境会打开真实下载管理。");
    });
  }
  function openSavedPages() {
    show("我的网页", "一些值得停留的片刻。", "page", function (content) {
      row(content, "airhome (personal) · 设计手记", "示例收藏页 · 展示本产品的设计取舍", function () {
        show("设计手记", "airhome (personal) · hydeclanspi", "page", function (inner) {
          section(inner, "让日常入口成为自己的空间"); note(inner, "以个人名片、搜索与快捷方式构成平衡布局。用暖光、细边和通透材质承载内容，让常用操作保持清晰。");
          section(inner, "把细节交给交互"); note(inner, "六款搜索动效、壁纸取景、长按设置与浮光交互，在反复迭代中逐渐形成现在的模样。");
          actions(inner, [button("返回我的网页", openSavedPages)]);
        });
      }, "page", "样例");
      note(content, "这是本地演示内容，没有读取或离线保存外部网页。");
    });
  }
  function confirmAction(title, description, run) {
    show(title, description, "shield", function (content) { actions(content, [button("取消", close), button("确认", run, "primary")]); });
  }
  function togglePrivacy() {
    show(privateMode ? "退出演示隐私模式" : "进入演示隐私模式", "让这一段探索，轻一点。", "shield", function (content) {
      note(content, "此开关仅暂停本演示的打开请求记录，并让搜索引擎选择暂存于本页会话。它不会开启浏览器无痕模式，也不会隐藏外部网站或浏览器产生的记录。");
      actions(content, [button("取消", close), button(privateMode ? "退出演示隐私" : "进入演示隐私", function () {
        privateMode = !privateMode; privateEngine = ""; emit("aira-home-privacy-mode-changed", privacyState()); emit("aira-home-search-engines-changed", engineState()); close();
      }, "primary")]);
    });
  }
  function privacyState() { return { privacyMode: privateMode ? "private" : "regular", isPrivate: privateMode }; }
  function palette() {
    var dark = effectiveTheme() === "dark";
    return { id: "harmony-blue", title: "鸿蒙蓝 · 浏览器演示", colors: {
      accent: "#0a59f7", onAccent: "#ffffff", pageBackground: dark ? "#111827" : "#f3f5f8",
      surfaceBackground: dark ? "#202938" : "#ffffff", controlBackground: dark ? "#344052" : "#edf1f7",
      textPrimary: dark ? "#f3f6ff" : "#18253a", textSecondary: dark ? "#bac6da" : "#5c697e", divider: dark ? "#49546a" : "#d8dee8", outline: dark ? "#64718b" : "#b8c3d3"
    } };
  }
  function effectiveTheme() { return themeMode === "system" ? (media && media.matches ? "dark" : "light") : themeMode; }
  function theme() { return { mode: themeMode, effectiveMode: effectiveTheme(), palette: palette() }; }
  function openSettings() {
    show("设置", "属于这一方空间的偏好。", "settings", function (content) {
      section(content, "外观");
      var group = el("div", "ab-segment"); group.setAttribute("role", "group"); group.setAttribute("aria-label", "外观主题"); content.appendChild(group);
      [["light", "浅色"], ["dark", "深色"], ["system", "跟随系统"]].forEach(function (item) {
        var choice = button(item[1], function () { write("theme", item[0]); themeMode = item[0]; emit("aira-home-theme-changed", theme()); openSettings(); });
        choice.setAttribute("aria-pressed", String(themeMode === item[0])); group.appendChild(choice);
      });
      section(content, "浏览偏好");
      row(content, "搜索引擎", "选择默认引擎与自定义模板", openSearchSettings, "search");
      row(content, "快捷方式", "添加、编辑与管理常用入口", openShortcutManager, "bookmarks");
      row(content, "演示隐私模式", privateMode ? "已开启 · 暂停打开请求记录" : "已关闭", togglePrivacy, "shield");
      row(content, "导出演示偏好", "保存在本地的 JSON 文件", saveJson, "download");
      note(content, "浏览器演示在本地保存偏好。主页原有的名片、材质、壁纸与交互设置保持独立；长按太阳图标可查看关于。");
    });
  }
  function scanQr() {
    show("扫一扫", "扫描界面的交互演示。", "scan", function (content) {
      var stage = el("div", "ab-scan-stage"); stage.appendChild(icon("scan")); stage.appendChild(el("span", "", "把灵感放进取景框")); content.appendChild(stage);
      note(content, "演示不调用摄像头。你可以体验示例识别结果，或手动输入二维码内容。");
      var input = field(content, "二维码内容", "", "网址或关键词");
      actions(content, [button("体验示例结果", function () { openTarget("https://developer.huawei.com/consumer/cn/", "示例识别 · HarmonyOS"); }), button("打开输入内容", function () { if (input.value.trim()) search(input.value); else notify("先输入一段内容。"); }, "primary")]);
    });
  }
  function userScripts() {
    show("用户脚本", "给网页一点自己的习惯。", "code", function (content) {
      row(content, "阅读留白", "视觉示例条目 · 本演示不会执行或注入脚本", null, "code", "样例");
      var enabled = read("sampleScript", false);
      var toggle = button(enabled ? "关闭示例开关" : "开启示例开关", function () { write("sampleScript", !enabled); userScripts(); }); toggle.setAttribute("aria-pressed", String(enabled));
      actions(content, [toggle]); note(content, "真实的用户脚本管理由 Aira 提供。此处保存开关状态，用于展示交互反馈。");
    });
  }
  function normalizeOrder(items) { return items.map(function (item, index) { var next = copy(item); next.position = index; return next; }); }
  function saveShortcuts(items) { var next = normalizeOrder(items); write("shortcuts", next); shortcuts = next; emit("aira-home-shortcuts-changed", shortcuts); }
  function shortcut(id) { var item = shortcuts.find(function (entry) { return entry.id === id; }); if (!item) throw error("这个快捷方式已不存在。"); return item; }
  function editLink(title, item, save) {
    show(title, "把常用地址，放在顺手的位置。", "bookmarks", function (content) {
      var form = el("form", "ab-form"); content.appendChild(form);
      var name = field(form, "名称", item && item.title, "为这个入口起个名字"); name.maxLength = 80; name.setAttribute("data-autofocus", "");
      var url = item && item.kind === "system" ? null : field(form, "网址", item && item.url, "https://example.com");
      if (url) { url.type = "url"; url.required = true; url.maxLength = 4096; }
      else note(form, "系统书签入口只修改显示名称。");
      var submit = el("button", "ab-btn ab-primary", "保存"); submit.type = "submit";
      actions(form, [button("取消", close), submit]);
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        try { var next = copy(item || {}); next.title = name.value.trim() || "未命名"; if (url) next.url = safeUrl(url.value); save(next); }
        catch (err) { notify(err.message); }
      });
    });
  }
  function addShortcut() {
    editLink("添加快捷方式", null, function (item) {
      if (shortcuts.length >= 40) throw error("演示最多保留 40 个快捷方式。");
      item.id = "web-" + Date.now() + "-" + Math.random().toString(16).slice(2); item.kind = "web"; item.iconId = ""; item.icon = ""; item.iconRendering = "";
      saveShortcuts(shortcuts.concat([item])); close();
    });
  }
  function editShortcut(id) {
    var current = shortcut(id);
    editLink("编辑快捷方式", current, function (next) { saveShortcuts(shortcuts.map(function (item) { return item.id === id ? next : item; })); close(); });
  }
  function openShortcutManager() {
    show("快捷方式", "顺着自己的习惯，排列日常。", "bookmarks", function (content) {
      shortcuts.forEach(function (item) {
        row(content, item.title, item.kind === "system" ? "系统入口 · 书签" : item.url, function () { editShortcut(item.id); }, "bookmarks");
      });
      note(content, "主页点击「排序」可拖动排列，长按图标可编辑图标样式与管理入口。Moodle 与 Claude Code 使用公开示例地址，可自由编辑。");
      actions(content, [button("添加网页", addShortcut, "primary"), button("添加书签入口", function () { var item = copy(initialShortcuts[0]); item.id += "-" + Date.now(); saveShortcuts(shortcuts.concat([item])); openShortcutManager(); })]);
    });
  }
  function reorder(ids) {
    return promise(function () {
      if (!Array.isArray(ids) || ids.length !== shortcuts.length || new Set(ids).size !== ids.length || ids.some(function (id) { return !shortcuts.some(function (item) { return item.id === id; }); })) throw error("排序提交失败，列表不完整", "INVALID_SHORTCUT_ORDER");
      saveShortcuts(ids.map(shortcut));
    });
  }
  function move(id, to) {
    return promise(function () { var item = shortcut(id), next = shortcuts.filter(function (entry) { return entry.id !== id; }); next.splice(Math.max(0, Math.min(next.length, to)), 0, item); saveShortcuts(next); });
  }
  function remove(id) { return promise(function () { shortcut(id); saveShortcuts(shortcuts.filter(function (entry) { return entry.id !== id; })); }); }
  function removeConfirm(id) {
    var item = shortcut(id);
    confirmAction("移除「" + item.title + "」", "仅移除当前演示里的快捷方式。", function () { remove(id).then(close).catch(function (err) { notify(err.message); }); });
  }
  function openShortcut(id) {
    var item = shortcut(id);
    if (item.kind === "system") openBookmarks(); else openTarget(item.url, item.title);
  }
  function copyShortcut(id) {
    var item = shortcut(id);
    if (!item.url) return;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(item.url).catch(function () { copyFallback(item.url); });
    else copyFallback(item.url);
  }
  function copyFallback(url) { show("复制链接", "选中下面的地址即可复制。", "page", function (content) { var input = field(content, "网址", url); input.readOnly = true; input.setAttribute("data-autofocus", ""); input.addEventListener("focus", function () { input.select(); }); }); }
  function renderShortcutIcon(container, item) {
    if (item.kind === "system") { container.appendChild(icon("bookmarks")); return true; }
    if (item.demoMark === "ucl") { var logo = el("span", "ab-ucl-mark", "UCL"); logo.setAttribute("aria-hidden", "true"); container.appendChild(logo); return true; }
    if (item.demoMark === "claude") {
      var mark = el("span", "ab-claude-mark");
      var svg = document.createElementNS(SVG_NS, "svg"); svg.setAttribute("viewBox", "0 0 40 40"); svg.setAttribute("aria-hidden", "true");
      for (var i = 0; i < 12; i++) { var ray = document.createElementNS(SVG_NS, "path"); ray.setAttribute("d", "M20 6v28"); ray.setAttribute("stroke", "#fff5e7"); ray.setAttribute("stroke-width", "1.8"); ray.setAttribute("transform", "rotate(" + (i * 15) + " 20 20)"); svg.appendChild(ray); }
      mark.appendChild(svg); container.appendChild(mark); return true;
    }
    return false;
  }
  function environment() { var w = window.innerWidth, h = window.innerHeight; return { formFactor: w >= 900 ? "tablet" : "phone", shellFamily: w >= 900 ? "large_screen" : "phone", viewport: { width: w, height: h, orientation: w === h ? "square" : w > h ? "landscape" : "portrait" } }; }
  var systemEntries = { bookmarks: openBookmarks, history: openHistory, tabs: openTabs, downloads: openDownloads, savedpages: openSavedPages, searchsettings: openSearchSettings, userscripts: userScripts, settings: openSettings, appearancesettings: openSettings, themepalettesettings: openSettings, privacysecuritysettings: togglePrivacy };
  function openSystemEntry(name) { var key = String(name || "").replace(/[-_\s]/g, "").toLowerCase(); (systemEntries[key] || openSettings)(); }
  function nativeMethod(name, fallback) { return function () { var args = arguments; if (window.AiraHome && typeof window.AiraHome[name] === "function") return window.AiraHome[name].apply(window.AiraHome, args); if (isActive()) return fallback.apply(null, args); }; }
  function uiMethod(name, fn) { return nativeMethod(name, function () { var args = arguments; defer(function () { fn.apply(null, args); }); }); }

  var bridge = {
    __isBrowserDemo: true,
    storage: {
      get: function (key, fallback) { return promise(function () {
        var raw = localStorage.getItem(HOME_PREFIX + key);
        // Restore the supplied reference's London wallpaper for a new browser demo.
        if (raw === null && key === "wallpaper") return "light";
        // The supplied London image includes a device dock near its bottom.
        // Frame the city above it; preserve the original bitmap and crop controls.
        if (raw === null && key === "wallpaperCrop") return { light: { x: 0, y: 0, w: 3120, h: 1760 } };
        return raw === null ? copy(fallback) : JSON.parse(raw);
      }); },
      set: function (key, value) { return promise(function () { localStorage.setItem(HOME_PREFIX + key, JSON.stringify(value)); }); },
      remove: function (key) { return promise(function () { localStorage.removeItem(HOME_PREFIX + key); }); },
      clear: function () { return promise(function () { Object.keys(localStorage).filter(function (key) { return key.indexOf(HOME_PREFIX) === 0; }).forEach(function (key) { localStorage.removeItem(key); }); }); }
    },
    getTheme: function () { return Promise.resolve(theme()); }, getThemePalette: function () { return Promise.resolve(palette()); }, refreshTheme: function () { return Promise.resolve(theme()); },
    getEnvironment: function () { return Promise.resolve(environment()); }, getTabCount: function () { return Promise.resolve(tabs.length); },
    getPrivacyMode: function () { return Promise.resolve(privacyState()); }, refreshPrivacyMode: function () { return Promise.resolve(privacyState()); }, isPrivateMode: function () { return Promise.resolve(privateMode); },
    getShortcuts: function () { return Promise.resolve(copy(shortcuts)); }, refreshShortcuts: function () { return Promise.resolve(copy(shortcuts)); },
    getSearchEngineState: function () { return Promise.resolve(engineState()); }, setSearchEngine: setEngine,
    prepareIconFont: function () { return Promise.resolve(false); }, renderShortcutIcon: renderShortcutIcon,
    openHistory: uiMethod("openHistory", openHistory), openSearch: uiMethod("openSearch", openSearch), search: nativeMethod("search", search), openUrl: uiMethod("openUrl", openTarget),
    openBookmarks: uiMethod("openBookmarks", openBookmarks), openTabs: uiMethod("openTabs", openTabs), openDownloads: uiMethod("openDownloads", openDownloads),
    openSavedPages: uiMethod("openSavedPages", openSavedPages), openOfflinePages: uiMethod("openOfflinePages", openSavedPages), openSettings: uiMethod("openSettings", openSettings),
    openSearchSettings: uiMethod("openSearchSettings", openSearchSettings), openUserScripts: uiMethod("openUserScripts", userScripts), openSystemEntry: uiMethod("openSystemEntry", openSystemEntry),
    togglePrivateMode: uiMethod("togglePrivateMode", togglePrivacy), scanQr: uiMethod("scanQr", scanQr), openToolbar: uiMethod("openToolbar", openSettings),
    openShortcutPicker: uiMethod("openShortcutPicker", openShortcutManager), openShortcut: uiMethod("openShortcut", openShortcut), editShortcut: uiMethod("editShortcut", editShortcut),
    copyShortcutUrl: uiMethod("copyShortcutUrl", copyShortcut), confirmDeleteShortcut: uiMethod("confirmDeleteShortcut", removeConfirm),
    reorderShortcuts: reorder, removeShortcut: remove, deleteShortcut: remove,
    moveShortcutUp: function (id) { return move(id, shortcuts.findIndex(function (item) { return item.id === id; }) - 1); },
    moveShortcutDown: function (id) { return move(id, shortcuts.findIndex(function (item) { return item.id === id; }) + 1); },
    moveShortcutToTop: function (id) { return move(id, 0); }, moveShortcutToBottom: function (id) { return move(id, shortcuts.length - 1); },
    setBackHandlerActive: function (value) { backActive = !!value; }
  };
  ["openGeneralSettings", "openAppearanceSettings", "openThemePaletteSettings", "openCustomHomepageSettings", "openPrivacySecuritySettings", "openAboutSettings", "openSync", "openAiraPro", "openMembership", "openNovelBookshelf"].forEach(function (name) { bridge[name] = uiMethod(name, openSettings); });
  window.AiraBrowserBridge = bridge;
  document.documentElement.dataset.browserDemo = "true";

  listen(document, "keydown", function (event) {
    if (!isActive()) return;
    if (overlay) {
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); close(); return; }
      if (event.key === "Tab") {
        var nodes = focusables(), first = nodes[0], last = nodes[nodes.length - 1];
        if (!first) { event.preventDefault(); dialog.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) { event.preventDefault(); first.focus(); }
      }
    } else if (event.key === "Escape" && backActive) { backActive = false; emit("aira-home-back-requested"); }
  }, true);
  listen(window, "resize", function () { emit("aira-home-environment-changed", environment()); });
  if (media && media.addEventListener) listen(media, "change", function () { if (themeMode === "system") emit("aira-home-theme-changed", theme()); });
  listen(window, "storage", function (event) {
    if (!isActive() || !event.key || event.key.indexOf(PREFIX) !== 0) return;
    if (event.key === PREFIX + "shortcuts") { var value = read("shortcuts", initialShortcuts); if (Array.isArray(value)) { shortcuts = value; emit("aira-home-shortcuts-changed", shortcuts); } }
    if (event.key === PREFIX + "engine") { var id = read("engine", "google"); if (engines.some(function (item) { return item.id === id; })) { selectedEngine = id; emit("aira-home-search-engines-changed", engineState()); } }
    if (event.key === PREFIX + "theme") { var mode = read("theme", "light"); if (["light", "dark", "system"].indexOf(mode) >= 0) { themeMode = mode; emit("aira-home-theme-changed", theme()); } }
  });
  function deactivate() { if (!active) return; active = false; close(); listeners.splice(0).forEach(function (off) { off(); }); delete document.documentElement.dataset.browserDemo; }
  listen(window, "aira-home-ready", function () { if (window.AiraHome) deactivate(); });
})();
