(function () {
  'use strict';

  var $ = function (id) {
    return document.getElementById(id);
  };

  var root = $('shelfRoot');
  var card = $('shelfCard');
  if (!root || !card) return;

  var refs = {
    mask: $('shelfMask'),
    close: $('shelfClose'),
    more: $('shelfMore'),
    menu: $('shelfMenu'),
    menuHidden: $('shelfMenuHidden'),
    menuClear: $('shelfMenuClear'),
    pick: $('shelfPick'),
    emptyPick: $('shelfEmptyPick'),
    defaultBtn: $('shelfDefault'),
    defaultLabel: $('shelfDefaultLabel'),
    refresh: $('shelfRefresh'),
    search: $('shelfSearch'),
    searchClear: $('shelfSearchClear'),
    viewList: $('shelfViewList'),
    viewGrid: $('shelfViewGrid'),
    summaryIcon: $('shelfSummaryIcon'),
    folderName: $('shelfFolderName'),
    folderPath: $('shelfFolderPath'),
    folderStats: $('shelfFolderStats'),
    defaultBadge: $('shelfDefaultBadge'),
    scanTime: $('shelfScanTime'),
    restore: $('shelfRestore'),
    breadcrumb: $('shelfBreadcrumb'),
    up: $('shelfUp'),
    crumbs: $('shelfCrumbs'),
    main: $('shelfMain'),
    listPane: $('shelfListPane'),
    listHead: $('shelfListHead'),
    rows: $('shelfRows'),
    empty: $('shelfEmpty'),
    previewPane: $('shelfPreviewPane'),
    previewName: $('shelfPreviewName'),
    previewActions: $('shelfPreviewActions'),
    previewBody: $('shelfPreviewBody'),
    previewEmpty: $('shelfPreviewEmpty'),
    previewHost: $('shelfPreviewHost'),
    status: $('shelfStatus'),
    count: $('shelfCount'),
    folderInput: $('shelfFolderInput')
  };

  var previewShadow = null;

  var state = {
    open: false,
    source: 'none',
    rootHandle: null,
    rootNode: null,
    rootName: '',
    currentHandle: null,
    currentNode: null,
    path: [],
    entries: [],
    filtered: [],
    selected: null,
    query: '',
    sortKey: 'name',
    sortDir: 'asc',
    view: 'list',
    showHidden: false,
    isDefault: false,
    defaultMeta: null,
    pendingDefaultHandle: null,
    restorePickPending: false,
    forceInputFallback: false,
    lastScan: 0,
    loadToken: 0,
    previewToken: 0,
    previewUrl: '',
    thumbUrls: [],
    fileMap: null,
    handleCache: new Map(),
    packedCache: new Map(),
    previewSource: false,
    renderLimit: 600
  };

  var DEFAULT_KEY = 'localShelf.default.v1';
  var UI_KEY = 'localShelf.ui.v1';
  var DB_NAME = 'lucent-local-shelf';
  var DB_STORE = 'handles';
  var TEXT_LIMIT = 256 * 1024;
  var IMAGE_LIMIT = 24 * 1024 * 1024;
  var MEDIA_LIMIT = 120 * 1024 * 1024;
  var ASSET_LIMIT = 8 * 1024 * 1024;
  var URL_WARN = 1800000;

  var ICON_PATHS = {
    folder: '<path d="M3.2 7a2.2 2.2 0 0 1 2.2-2.2h3.3l1.8 2h8.1A2.2 2.2 0 0 1 20.8 9v8.2a2.2 2.2 0 0 1-2.2 2.2H5.4a2.2 2.2 0 0 1-2.2-2.2z"/>',
    file: '<path d="M6.2 3.2h7.6l4 4v13.6H6.2z"/><path d="M13.8 3.2v4.2h4.2"/><path d="M9 12.2h6M9 15.4h4.6"/>',
    html: '<path d="M6.2 3.2h7.6l4 4v13.6H6.2z"/><path d="M13.8 3.2v4.2h4.2"/><path d="M9 13.5 7.8 14.9 9 16.3M15 13.5l1.2 1.4L15 16.3"/>',
    image: '<rect x="3.6" y="4.2" width="16.8" height="15.6" rx="2.4"/><circle cx="9" cy="9.2" r="1.6"/><path d="M5.4 17.2l4.4-4.3 3.1 3 2.1-2 3.6 3.3"/>',
    code: '<path d="M8.4 7.2 4.2 12l4.2 4.8M15.6 7.2 19.8 12l-4.2 4.8M13.4 5.4l-2.8 13.2"/>',
    text: '<path d="M6.2 3.2h7.6l4 4v13.6H6.2z"/><path d="M13.8 3.2v4.2h4.2"/><path d="M9 11.6h6M9 14.4h6M9 17.2h4"/>',
    pdf: '<path d="M6.2 3.2h7.6l4 4v13.6H6.2z"/><path d="M13.8 3.2v4.2h4.2"/><path d="M9 16.6v-4.2h1.4a1.3 1.3 0 0 1 0 2.6H9M13.3 12.4h1.1a2.1 2.1 0 0 1 0 4.2h-1.1z"/>',
    media: '<rect x="3.4" y="5" width="17.2" height="14" rx="2.6"/><path d="M10.2 9.2 15.4 12l-5.2 2.8z"/>',
    archive: '<path d="M4.2 7.6h15.6v12.2H4.2z"/><path d="M3.2 4.6h17.6v3H3.2zM10.2 12h3.6M10.2 15h3.6"/>',
    audio: '<path d="M9 17.2V7.4l8-1.8v9.6"/><circle cx="7.2" cy="17.6" r="2.1"/><circle cx="15.2" cy="15.6" r="2.1"/>',
    video: '<rect x="3.4" y="5" width="17.2" height="14" rx="2.6"/><path d="M10.2 9.2 15.4 12l-5.2 2.8z"/>'
  };

  var PREVIEW_CSS = [
    ':host{all:initial;display:block;width:100%;height:100%}',
    '.frame{width:100%;height:100%;overflow:auto;background:#fbfaf6;color:#1b1c20;',
    'font:13px/1.68 var(--sans);',
    'scrollbar-width:thin}',
    '.preview-note{position:sticky;top:0;z-index:3;padding:7px 12px;background:rgba(251,250,246,.94);',
    'border-bottom:1px solid rgba(0,0,0,.07);color:#7a7d84;font:10px/1.5 var(--mono);',
    'backdrop-filter:blur(10px)}',
    '.paper{box-sizing:border-box;min-height:100%;padding:18px 20px 30px;overflow-wrap:anywhere}',
    '.paper *,.paper *::before,.paper *::after{box-sizing:border-box}',
    '.paper img,.paper video,.paper svg,.paper canvas{max-width:100%;height:auto}',
    '.paper table{max-width:100%;border-collapse:collapse}',
    '.paper pre{white-space:pre-wrap;word-break:break-word}',
    '.paper a{color:#1d6d99}',
    '.paper h1,.paper h2,.paper h3{line-height:1.2;letter-spacing:-.02em}',
    '.paper blockquote{margin:1em 0;padding:.2em 0 .2em 1em;border-left:3px solid #d9b66d;color:#555}',
    '.stage{display:grid;place-items:center;width:100%;min-height:100%;padding:16px;',
    'background:radial-gradient(circle at 30% 20%,rgba(255,255,255,.08),transparent 55%),#0b1018}',
    '.stage img{max-width:100%;max-height:100%;object-fit:contain;border-radius:10px;',
    'box-shadow:0 18px 50px rgba(0,0,0,.42)}',
    '.stage video{max-width:100%;max-height:100%;border-radius:10px;background:#000}',
    '.audio-stage{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;height:100%;',
    'padding:24px;background:radial-gradient(circle at 50% 30%,rgba(255,255,255,.08),transparent 60%),#0b1018;color:#fff}',
    '.audio-stage .glyph{display:grid;place-items:center;width:76px;height:76px;border:1px solid rgba(255,255,255,.16);',
    'border-radius:24px;background:rgba(255,255,255,.06);color:#e7c987}',
    '.audio-stage audio{width:min(100%,420px)}',
    '.audio-stage .name{max-width:100%;color:rgba(255,255,255,.7);font-size:12px;overflow-wrap:anywhere;text-align:center}',
    '.image-meta{padding:0 14px 12px;color:#7a7d84;font:10px/1.5 var(--mono);text-align:center}',
    '.code{margin:0;padding:16px 18px;white-space:pre-wrap;word-break:break-word;',
    'font:11.5px/1.65 var(--mono);color:#1b1c20;background:#fbfaf6}',
    '.meta-card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:100%;',
    'padding:26px;text-align:center}',
    '.meta-card .glyph{display:grid;place-items:center;width:70px;height:70px;border:1px solid rgba(0,0,0,.08);',
    'border-radius:22px;background:rgba(231,201,135,.18);color:#8a6118}',
    '.meta-card strong{font-size:13px;font-weight:650;overflow-wrap:anywhere}',
    '.meta-card p{margin:0;color:#7a7d84;font-size:11px;line-height:1.7}',
    '.meta-card .meta-grid{display:grid;grid-template-columns:auto auto;gap:4px 14px;margin-top:2px;',
    'color:#666;font:10px/1.6 var(--mono);text-align:left}',
    '.folder-card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:100%;',
    'padding:28px;text-align:center}',
    '.folder-card .glyph{display:grid;place-items:center;width:82px;height:82px;border:1px solid rgba(0,0,0,.08);',
    'border-radius:26px;background:linear-gradient(145deg,rgba(231,201,135,.28),rgba(155,215,255,.14));color:#8a6118}',
    '.folder-card strong{font-size:14px;font-weight:650;overflow-wrap:anywhere}',
    '.folder-card p{margin:0;color:#7a7d84;font-size:11px;line-height:1.7}',
    '.folder-card button{min-height:38px;padding:0 16px;border:1px solid rgba(165,123,37,.3);border-radius:999px;',
    'background:rgba(231,201,135,.26);color:#7c5714;font:600 11px/1 inherit;cursor:pointer}',
    '.loading{display:flex;align-items:center;justify-content:center;gap:9px;min-height:100%;padding:24px;',
    'color:#7a7d84;font-size:11px;text-align:center}',
    '.loading .dot{width:7px;height:7px;border-radius:50%;background:#a57b25;animation:shelf-preview-pulse .9s ease-in-out infinite alternate}',
    '@keyframes shelf-preview-pulse{from{opacity:.35;transform:scale(.85)}to{opacity:1;transform:scale(1.2)}}',
    '@media (prefers-reduced-motion:reduce){.loading .dot{animation:none}}'
  ].join('');

  function setStatus(text, tone) {
    refs.status.textContent = text;
    refs.status.classList.toggle('is-good', tone === 'good');
    refs.status.classList.toggle('is-warn', tone === 'warn');
  }

  function pad2(value) {
    return value < 10 ? '0' + value : String(value);
  }

  function formatBytes(value) {
    var n = Number(value);
    if (!Number.isFinite(n) || n < 0) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(2) + ' MB';
    return (n / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  function formatTime(ms) {
    var d = new Date(ms);
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function formatDate(ms) {
    if (!ms) return '—';
    var d = new Date(ms);
    var now = new Date();
    if (d.toDateString() === now.toDateString()) return formatTime(ms);
    if (d.getFullYear() === now.getFullYear()) {
      return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    }
    return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
  }

  function fullDate(ms) {
    if (!ms) return '—';
    var d = new Date(ms);
    return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + formatTime(ms);
  }

  function extensionOf(name) {
    var value = String(name || '');
    var index = value.lastIndexOf('.');
    if (index <= 0 || index === value.length - 1) return '';
    return value.slice(index + 1).toLowerCase();
  }

  function kindOf(entry) {
    if (entry.kind === 'directory') return 'folder';
    var ext = entry.ext || extensionOf(entry.name);
    if (ext === 'html' || ext === 'htm' || ext === 'xhtml') return 'html';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'avif', 'ico'].indexOf(ext) >= 0) return 'image';
    if (['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'].indexOf(ext) >= 0) return 'audio';
    if (['mp4', 'webm', 'mov', 'mkv', 'avi'].indexOf(ext) >= 0) return 'video';
    if (ext === 'pdf') return 'pdf';
    if (['js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'css', 'scss', 'less', 'json', 'xml', 'yaml', 'yml', 'sql', 'sh', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h'].indexOf(ext) >= 0) return 'code';
    if (['txt', 'md', 'markdown', 'log', 'csv'].indexOf(ext) >= 0) return 'text';
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].indexOf(ext) >= 0) return 'archive';
    return 'file';
  }

  function isImageEntry(entry) {
    return entry.kind === 'file' && kindOf(entry) === 'image';
  }

  function isTextEntry(entry) {
    var kind = kindOf(entry);
    return kind === 'html' || kind === 'code' || kind === 'text';
  }

  function typeLabel(entry) {
    if (entry.kind === 'directory') return '文件夹';
    var ext = entry.ext || extensionOf(entry.name);
    if (ext) return ext.toUpperCase();
    var mime = String(entry.type || '');
    if (mime) return mime.split('/').pop().toUpperCase();
    return '文件';
  }

  function iconClass(entry) {
    if (entry.kind === 'directory') return 'is-folder';
    var kind = kindOf(entry);
    if (kind === 'html') return 'is-html';
    if (kind === 'image') return 'is-image';
    if (kind === 'code') return 'is-code';
    if (kind === 'audio' || kind === 'video') return 'is-media';
    return '';
  }

  function iconSvg(kind) {
    var paths = ICON_PATHS[kind] || ICON_PATHS.file;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function readText(file) {
    if (file && typeof file.text === 'function') return file.text();
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(reader.error || new Error('读取失败')); };
      reader.readAsText(file);
    });
  }

  function readDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(reader.error || new Error('读取失败')); };
      reader.readAsDataURL(file);
    });
  }

  function readSliceText(file, limit) {
    if (!file) return Promise.resolve('');
    if (file.size <= limit) return readText(file);
    var slice = file.slice(0, limit);
    return readText(slice).then(function (text) {
      return text + '\n\n… 仅预览前 ' + formatBytes(limit) + '，完整内容请下载或在新标签页打开。';
    });
  }

  function errorText(error) {
    if (!error) return '未知错误';
    return (error.name ? error.name + ': ' : '') + (error.message || String(error));
  }

  function revokeThumbUrls() {
    state.thumbUrls.forEach(function (url) {
      try { URL.revokeObjectURL(url); } catch (_error) {}
    });
    state.thumbUrls = [];
  }

  function revokePreviewUrl() {
    if (state.previewUrl) {
      try { URL.revokeObjectURL(state.previewUrl); } catch (_error) {}
      state.previewUrl = '';
    }
  }

  function downloadFile(file, name) {
    if (!file) {
      setStatus('这个文件没有可下载的内容', 'warn');
      return;
    }
    var url = URL.createObjectURL(file);
    var anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name || file.name || 'download';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    window.setTimeout(function () {
      try { URL.revokeObjectURL(url); } catch (_error) {}
      anchor.remove();
    }, 1200);
    setStatus('已请求下载 ' + (name || file.name), 'good');
  }

  function storeGet(key, fallback) {
    try {
      if (window.AiraHome && window.AiraHome.storage && typeof window.AiraHome.storage.get === 'function') {
        return window.AiraHome.storage.get(key, fallback).catch(function () { return fallback; });
      }
    } catch (_error) {}
    try {
      var raw = window.localStorage.getItem(key);
      return Promise.resolve(raw ? JSON.parse(raw) : fallback);
    } catch (_error) {
      return Promise.resolve(fallback);
    }
  }

  function storeSet(key, value) {
    try {
      if (window.AiraHome && window.AiraHome.storage && typeof window.AiraHome.storage.set === 'function') {
        return window.AiraHome.storage.set(key, value);
      }
    } catch (_error) {}
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return Promise.resolve();
    } catch (_error) {
      return Promise.reject(_error);
    }
  }

  function storeRemove(key) {
    try {
      if (window.AiraHome && window.AiraHome.storage && typeof window.AiraHome.storage.remove === 'function') {
        return window.AiraHome.storage.remove(key);
      }
    } catch (_error) {}
    try {
      window.localStorage.removeItem(key);
      return Promise.resolve();
    } catch (_error) {
      return Promise.resolve();
    }
  }

  function openDb() {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB 不可用'));
        return;
      }
      var request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('IndexedDB 打开失败')); };
    });
  }

  function idbSet(key, value) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction(DB_STORE, 'readwrite');
        transaction.objectStore(DB_STORE).put(value, key);
        transaction.oncomplete = function () { db.close(); resolve(); };
        transaction.onerror = function () { db.close(); reject(transaction.error || new Error('写入失败')); };
        transaction.onabort = function () { db.close(); reject(transaction.error || new Error('写入取消')); };
      });
    });
  }

  function idbGet(key) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction(DB_STORE, 'readonly');
        var request = transaction.objectStore(DB_STORE).get(key);
        request.onsuccess = function () { db.close(); resolve(request.result || null); };
        request.onerror = function () { db.close(); reject(request.error || new Error('读取失败')); };
      });
    });
  }

  function idbDelete(key) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction(DB_STORE, 'readwrite');
        transaction.objectStore(DB_STORE).delete(key);
        transaction.oncomplete = function () { db.close(); resolve(); };
        transaction.onerror = function () { db.close(); reject(transaction.error || new Error('删除失败')); };
      });
    });
  }

  function loadUi() {
    storeGet(UI_KEY, null).then(function (saved) {
      if (!saved || typeof saved !== 'object') return;
      if (saved.sortKey === 'name' || saved.sortKey === 'type' || saved.sortKey === 'time' || saved.sortKey === 'size') {
        state.sortKey = saved.sortKey;
      }
      if (saved.sortDir === 'asc' || saved.sortDir === 'desc') state.sortDir = saved.sortDir;
      if (saved.view === 'grid' || saved.view === 'list') state.view = saved.view;
      if (saved.showHidden === true) state.showHidden = true;
      applyView();
      updateSortHeaders();
    });
  }

  function saveUi() {
    storeSet(UI_KEY, {
      sortKey: state.sortKey,
      sortDir: state.sortDir,
      view: state.view,
      showHidden: state.showHidden
    }).catch(function () {});
  }

  function loadDefaultMeta() {
    return storeGet(DEFAULT_KEY, null).then(function (meta) {
      if (!meta || typeof meta !== 'object' || !meta.name) {
        state.defaultMeta = null;
        return;
      }
      state.defaultMeta = meta;
      if (!state.path.length) {
        refs.restore.hidden = false;
        refs.restore.textContent = meta.source === 'handle' ? '恢复默认路径' : '重新选择默认路径';
        updateSummary();
        updateToolbar();
      }
    });
  }

  function currentPathName(name) {
    return state.path.map(function (part) { return part.name; }).concat(name).join('/');
  }

  function visibleEntries() {
    var query = state.query.toLowerCase();
    return state.entries.filter(function (entry) {
      if (!state.showHidden && entry.name.charAt(0) === '.') return false;
      if (query && entry.name.toLowerCase().indexOf(query) < 0) return false;
      return true;
    });
  }

  function sortEntries(entries) {
    var direction = state.sortDir === 'asc' ? 1 : -1;
    return entries.slice().sort(function (a, b) {
      var groupA = a.kind === 'directory' ? 0 : 1;
      var groupB = b.kind === 'directory' ? 0 : 1;
      if (groupA !== groupB) return groupA - groupB;
      var result = 0;
      var nameCompare = function () {
        return a.name.localeCompare(b.name, 'zh-Hans-CN', { numeric: true, sensitivity: 'base' });
      };
      if (state.sortKey === 'name') {
        result = nameCompare();
      } else if (state.sortKey === 'type') {
        result = typeLabel(a).localeCompare(typeLabel(b), 'zh-Hans-CN', { numeric: true }) || nameCompare();
      } else if (state.sortKey === 'time') {
        result = (a.modified || 0) - (b.modified || 0) || nameCompare();
      } else if (state.sortKey === 'size') {
        result = (a.size || 0) - (b.size || 0) || nameCompare();
      }
      return result * direction;
    });
  }

  function setStatusTone(text, tone) {
    setStatus(text, tone);
  }

  function updateSummary() {
    var hasFolder = state.path.length > 0;
    if (!hasFolder) {
      refs.folderName.textContent = state.defaultMeta ? '尚未挂载' : '尚未选择文件夹';
      refs.folderPath.textContent = state.defaultMeta ?
        '上次使用：' + state.defaultMeta.name + ' · 点击恢复或选择新路径' :
        '选择一个本地文件夹，开始浏览 HTML、图片和文本。';
      refs.folderStats.textContent = state.defaultMeta ? '默认路径已记录' : '尚未挂载';
      refs.defaultBadge.hidden = true;
      refs.scanTime.textContent = '未扫描';
      refs.restore.hidden = !state.defaultMeta;
      refs.summaryIcon.classList.add('is-empty');
      return;
    }

    var folders = 0;
    var files = 0;
    var size = 0;
    state.entries.forEach(function (entry) {
      if (!state.showHidden && entry.name.charAt(0) === '.') return;
      if (entry.kind === 'directory') folders += 1;
      else {
        files += 1;
        size += entry.size || 0;
      }
    });
    refs.folderName.textContent = state.rootName || '本地文件夹';
    refs.folderPath.textContent = state.path.map(function (part) { return part.name; }).join(' / ');
    refs.folderStats.textContent = state.entries.length + ' 项 · ' + folders + ' 个文件夹 · ' +
      files + ' 个文件' + (files ? ' · ' + formatBytes(size) : '');
    refs.defaultBadge.hidden = !state.isDefault;
    refs.scanTime.textContent = state.lastScan ? '扫描于 ' + formatTime(state.lastScan) : '未扫描';
    refs.restore.hidden = true;
    refs.summaryIcon.classList.remove('is-empty');
  }

  function updateToolbar() {
    var hasFolder = state.path.length > 0;
    refs.defaultBtn.disabled = !hasFolder || state.isDefault;
    refs.defaultLabel.textContent = state.isDefault ? '已设为默认' : '设为默认路径';
    refs.defaultBtn.classList.toggle('is-default', state.isDefault);
    refs.refresh.disabled = !hasFolder;
    refs.menuClear.disabled = !state.defaultMeta;
  }

  function updateBreadcrumb() {
    refs.up.disabled = state.path.length <= 1;
    refs.crumbs.textContent = '';
    state.path.forEach(function (part, index) {
      if (index > 0) {
        var separator = document.createElement('span');
        separator.className = 'shelf-crumb-sep';
        separator.textContent = '/';
        refs.crumbs.appendChild(separator);
      }
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'shelf-crumb' + (index === state.path.length - 1 ? ' is-current' : '');
      button.textContent = part.name;
      button.title = part.name;
      button.addEventListener('click', function () { navigateTo(index); });
      refs.crumbs.appendChild(button);
    });
  }

  function updateSortHeaders() {
    var columns = refs.listHead.querySelectorAll('.shelf-col');
    Array.prototype.forEach.call(columns, function (column) {
      var key = column.getAttribute('data-sort');
      var active = key === state.sortKey;
      column.classList.toggle('is-active', active);
      column.setAttribute('aria-sort', active ? (state.sortDir === 'asc' ? 'ascending' : 'descending') : 'none');
      var arrow = column.querySelector('.shelf-sort');
      if (arrow) arrow.textContent = active ? (state.sortDir === 'asc' ? '↑' : '↓') : '↕';
    });
  }

  function applyView() {
    refs.listPane.classList.toggle('is-grid', state.view === 'grid');
    refs.viewList.classList.toggle('is-active', state.view === 'list');
    refs.viewGrid.classList.toggle('is-active', state.view === 'grid');
    refs.viewList.setAttribute('aria-pressed', state.view === 'list' ? 'true' : 'false');
    refs.viewGrid.setAttribute('aria-pressed', state.view === 'grid' ? 'true' : 'false');
  }

  function updateFooter() {
    var hasFolder = state.path.length > 0;
    if (!hasFolder) {
      refs.count.textContent = '0 项';
      return;
    }
    if (state.query) {
      refs.count.textContent = state.filtered.length + ' / ' + state.entries.length + ' 项';
    } else {
      refs.count.textContent = state.entries.length + ' 项';
    }
  }

  function updateAll() {
    var hasFolder = state.path.length > 0;
    refs.main.classList.toggle('is-empty', !hasFolder);
    refs.listHead.hidden = !hasFolder;
    refs.rows.hidden = !hasFolder;
    refs.empty.hidden = hasFolder;
    refs.breadcrumb.hidden = !hasFolder;
    refs.previewPane.hidden = !hasFolder;
    refs.previewEmpty.hidden = false;
    updateSummary();
    updateToolbar();
    updateBreadcrumb();
    updateSortHeaders();
    applyView();
    if (hasFolder) renderRows();
    else {
      refs.rows.textContent = '';
      state.filtered = [];
      clearPreview();
    }
    updateFooter();
  }

  function renderRowNote(text, loading) {
    refs.rows.textContent = '';
    var note = document.createElement('div');
    note.className = 'shelf-inline-note';
    if (loading) {
      var dot = document.createElement('span');
      dot.className = 'shelf-loading-dot';
      note.appendChild(dot);
    }
    note.appendChild(document.createTextNode(text));
    refs.rows.appendChild(note);
  }

  function renderRows() {
    revokeThumbUrls();
    refs.rows.textContent = '';
    if (state.loading) {
      renderRowNote('正在读取文件夹…', true);
      return;
    }
    if (!state.path.length) return;
    var list = sortEntries(visibleEntries());
    state.filtered = list;
    if (!state.entries.length) {
      renderRowNote('这个文件夹是空的。');
      updateFooter();
      return;
    }
    if (!list.length) {
      renderRowNote('没有匹配的文件。');
      updateFooter();
      return;
    }
    var shown = list.slice(0, state.renderLimit);
    var fragment = document.createDocumentFragment();
    shown.forEach(function (entry) {
      fragment.appendChild(buildRow(entry));
    });
    refs.rows.appendChild(fragment);
    if (list.length > shown.length) {
      var more = document.createElement('div');
      more.className = 'shelf-inline-note';
      more.textContent = '仅显示前 ' + shown.length + ' 项；请使用筛选或进入子文件夹查看其余内容。';
      refs.rows.appendChild(more);
    }
    updateFooter();
  }

  function buildRow(entry) {
    var row = document.createElement('button');
    row.type = 'button';
    row.className = 'shelf-row';
    row.setAttribute('role', 'listitem');
    row.setAttribute('data-path', entry.path || entry.name);
    if (state.selected && state.selected.path === entry.path) row.classList.add('is-selected');

    var nameCell = document.createElement('span');
    nameCell.className = 'shelf-row-name';
    var icon = document.createElement('span');
    icon.className = 'shelf-file-icon ' + iconClass(entry);
    icon.innerHTML = iconSvg(kindOf(entry));

    if (state.view === 'grid' && isImageEntry(entry) && entry.file && entry.size <= 8 * 1024 * 1024) {
      try {
        var thumbUrl = URL.createObjectURL(entry.file);
        state.thumbUrls.push(thumbUrl);
        icon.textContent = '';
        var image = document.createElement('img');
        image.src = thumbUrl;
        image.alt = '';
        image.loading = 'lazy';
        icon.appendChild(image);
      } catch (_error) {}
    }

    var title = document.createElement('span');
    title.className = 'shelf-row-title';
    title.textContent = entry.name;
    title.title = entry.name;
    nameCell.appendChild(icon);
    nameCell.appendChild(title);
    if (entry.kind === 'directory') {
      var chevron = document.createElement('span');
      chevron.className = 'shelf-row-chevron';
      chevron.textContent = '›';
      nameCell.appendChild(chevron);
    }

    var type = document.createElement('span');
    type.className = 'shelf-row-type';
    type.textContent = typeLabel(entry);
    var time = document.createElement('span');
    time.className = 'shelf-row-time';
    time.textContent = formatDate(entry.modified);
    time.title = fullDate(entry.modified);
    var size = document.createElement('span');
    size.className = 'shelf-row-size';
    size.textContent = entry.kind === 'directory' ? '—' : formatBytes(entry.size);

    row.appendChild(nameCell);
    row.appendChild(type);
    row.appendChild(time);
    row.appendChild(size);

    row.addEventListener('click', function () {
      if (entry.kind === 'directory') enterEntry(entry);
      else selectEntry(entry);
    });
    return row;
  }

  function syncSelection() {
    var rows = refs.rows.querySelectorAll('.shelf-row');
    Array.prototype.forEach.call(rows, function (row) {
      row.classList.toggle('is-selected', !!(state.selected && row.getAttribute('data-path') === state.selected.path));
    });
  }

  function selectEntry(entry) {
    if (!entry || entry.kind === 'directory') return;
    state.selected = entry;
    state.previewSource = false;
    syncSelection();
    renderPreview(entry);
  }

  function clearPreview() {
    state.previewToken += 1;
    revokePreviewUrl();
    refs.previewName.textContent = '未选择文件';
    refs.previewActions.textContent = '';
    refs.previewHost.hidden = true;
    refs.previewEmpty.hidden = false;
  }

  function ensurePreviewShadow() {
    if (previewShadow) return previewShadow;
    previewShadow = refs.previewHost.attachShadow({ mode: 'open' });
    previewShadow.addEventListener('click', function (event) {
      var path = event.composedPath ? event.composedPath() : [];
      for (var i = 0; i < path.length; i += 1) {
        var node = path[i];
        if (node && node.tagName === 'A') {
          event.preventDefault();
          setStatus('预览中的链接不会跳转；请用“在新标签页打开”查看完整页面', 'warn');
          return;
        }
      }
    });
    previewShadow.addEventListener('submit', function (event) {
      event.preventDefault();
      setStatus('预览中的表单不会提交', 'warn');
    });
    return previewShadow;
  }

  function previewFrame(inner, extraCss) {
    ensurePreviewShadow().innerHTML = '<style>' + PREVIEW_CSS + (extraCss || '') + '</style>' + inner;
  }

  function previewLoading(name) {
    previewFrame('<div class="loading"><span class="dot"></span><span>正在读取 ' + escapeHtml(name) + '…</span></div>');
  }

  function addPreviewAction(label, primary, handler) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'shelf-mini-btn' + (primary ? ' primary' : '');
    button.textContent = label;
    button.addEventListener('click', handler);
    refs.previewActions.appendChild(button);
    return button;
  }

  function renderPreview(entry) {
    if (!entry) {
      clearPreview();
      return;
    }
    state.previewToken += 1;
    var token = state.previewToken;
    revokePreviewUrl();
    refs.previewName.textContent = entry.name;
    refs.previewActions.textContent = '';
    refs.previewEmpty.hidden = true;
    refs.previewHost.hidden = false;

    if (entry.kind === 'directory') {
      renderFolderPreview(entry);
      return;
    }

    var kind = kindOf(entry);
    if (kind === 'html') {
      renderHtmlPreview(entry, token);
      return;
    }
    if (kind === 'image') {
      renderImagePreview(entry, token);
      return;
    }
    if (kind === 'audio' || kind === 'video') {
      renderMediaPreview(entry, token, kind);
      return;
    }
    if (kind === 'text' || kind === 'code') {
      renderTextPreview(entry, token);
      return;
    }
    renderGenericPreview(entry, token, kind);
  }

  function renderFolderPreview(entry) {
    var count = entry.node && entry.node.children ? entry.node.children.size : 0;
    var note = count ? count + ' 个直接子项' : '文件夹';
    previewFrame(
      '<div class="folder-card">' +
        '<div class="glyph">' + iconSvg('folder') + '</div>' +
        '<strong>' + escapeHtml(entry.name) + '</strong>' +
        '<p>' + escapeHtml(note) + ' · 只读挂载</p>' +
        '<button type="button" data-action="enter">进入文件夹</button>' +
      '</div>'
    );
    var button = ensurePreviewShadow().querySelector('[data-action="enter"]');
    if (button) button.addEventListener('click', function () { enterEntry(entry); });
    addPreviewAction('进入', true, function () { enterEntry(entry); });
  }

  function renderHtmlPreview(entry, token) {
    previewLoading(entry.name);
    addPreviewAction('在新标签页打开', true, function () { openHtmlEntry(entry); });
    addPreviewAction(state.previewSource ? '预览' : '源码', false, function () {
      state.previewSource = !state.previewSource;
      renderPreview(entry);
    });
    addPreviewAction('下载', false, function () { downloadFile(entry.file, entry.name); });

    if (state.previewSource) {
      readSliceText(entry.file, TEXT_LIMIT).then(function (text) {
        if (token !== state.previewToken) return;
        previewFrame('<pre class="code">' + escapeHtml(text) + '</pre>');
        setStatus('源码预览 · ' + entry.name);
      }).catch(function (error) {
        if (token !== state.previewToken) return;
        previewFrame('<div class="meta-card"><strong>读取失败</strong><p>' + escapeHtml(errorText(error)) + '</p></div>');
      });
      return;
    }

    packHtmlEntry(entry).then(function (result) {
      if (token !== state.previewToken) return;
      var body = sanitizeForPreview(result.html);
      var note = '静态预览 · 脚本未执行' + (result.inlined ? ' · 内联 ' + result.inlined + ' 个资源' : '') +
        (result.missing.length ? ' · 缺失 ' + result.missing.length + ' 个' : '');
      previewFrame(
        '<div class="frame">' +
          '<div class="preview-note">' + escapeHtml(note) + '</div>' +
          '<div class="paper">' + body + '</div>' +
        '</div>'
      );
      setStatus('预览 · ' + entry.name + (result.missing.length ? ' · ' + result.missing.length + ' 个资源缺失' : ''),
        result.missing.length ? 'warn' : 'good');
    }).catch(function (error) {
      if (token !== state.previewToken) return;
      previewFrame('<div class="meta-card"><div class="glyph">' + iconSvg('html') + '</div><strong>无法生成预览</strong><p>' + escapeHtml(errorText(error)) + '</p></div>');
      setStatus('HTML 预览失败：' + errorText(error), 'warn');
    });
  }

  function renderImagePreview(entry, token) {
    if (!entry.file) {
      renderGenericPreview(entry, token, 'image');
      return;
    }
    if (entry.size > IMAGE_LIMIT) {
      renderGenericPreview(entry, token, 'image');
      return;
    }
    var url = URL.createObjectURL(entry.file);
    state.previewUrl = url;
    previewFrame(
      '<div class="stage"><img src="' + url + '" alt=""></div>' +
      '<div class="image-meta">' + escapeHtml(entry.name) + ' · ' + formatBytes(entry.size) + '</div>'
    );
    var image = ensurePreviewShadow().querySelector('img');
    if (image) {
      image.addEventListener('load', function () {
        var meta = ensurePreviewShadow().querySelector('.image-meta');
        if (meta) meta.textContent = entry.name + ' · ' + image.naturalWidth + ' × ' + image.naturalHeight + ' · ' + formatBytes(entry.size);
      });
    }
    addPreviewAction('下载', true, function () { downloadFile(entry.file, entry.name); });
    if (entry.size <= 8 * 1024 * 1024) {
      addPreviewAction('在新标签页打开', false, function () { openDataEntry(entry, ''); });
    }
    setStatus('预览图片 · ' + entry.name);
  }

  function renderMediaPreview(entry, token, kind) {
    if (!entry.file) {
      renderGenericPreview(entry, token, kind);
      return;
    }
    if (entry.size > MEDIA_LIMIT) {
      renderGenericPreview(entry, token, kind);
      return;
    }
    var url = URL.createObjectURL(entry.file);
    state.previewUrl = url;
    if (kind === 'video') {
      previewFrame(
        '<div class="stage"><video controls playsinline preload="metadata" src="' + url + '"></video></div>'
      );
    } else {
      previewFrame(
        '<div class="audio-stage">' +
          '<div class="glyph">' + iconSvg('audio') + '</div>' +
          '<div class="name">' + escapeHtml(entry.name) + '</div>' +
          '<audio controls preload="metadata" src="' + url + '"></audio>' +
        '</div>'
      );
    }
    addPreviewAction('下载', true, function () { downloadFile(entry.file, entry.name); });
    setStatus('预览媒体 · ' + entry.name);
  }

  function renderTextPreview(entry, token) {
    if (!entry.file) {
      renderGenericPreview(entry, token, 'text');
      return;
    }
    previewLoading(entry.name);
    readSliceText(entry.file, TEXT_LIMIT).then(function (text) {
      if (token !== state.previewToken) return;
      previewFrame(
        '<div class="frame">' +
          '<div class="preview-note">' + escapeHtml(typeLabel(entry) + ' · ' + formatBytes(entry.size)) + '</div>' +
          '<pre class="code">' + escapeHtml(text) + '</pre>' +
        '</div>'
      );
      setStatus('预览文本 · ' + entry.name);
    }).catch(function (error) {
      if (token !== state.previewToken) return;
      previewFrame('<div class="meta-card"><strong>读取失败</strong><p>' + escapeHtml(errorText(error)) + '</p></div>');
    });
    addPreviewAction('下载', false, function () { downloadFile(entry.file, entry.name); });
  }

  function renderGenericPreview(entry, token, kind) {
    var icon = kind || kindOf(entry);
    var lines = [
      ['类型', typeLabel(entry)],
      ['大小', entry.kind === 'directory' ? '—' : formatBytes(entry.size)],
      ['修改', fullDate(entry.modified)]
    ];
    var metaHtml = lines.map(function (line) {
      return '<span>' + escapeHtml(line[0]) + '</span><span>' + escapeHtml(line[1]) + '</span>';
    }).join('');
    previewFrame(
      '<div class="meta-card">' +
        '<div class="glyph">' + iconSvg(icon) + '</div>' +
        '<strong>' + escapeHtml(entry.name) + '</strong>' +
        '<p>' + (entry.size > IMAGE_LIMIT || entry.size > MEDIA_LIMIT ? '文件较大，未在书架内预览。' : '这类文件暂时没有内嵌预览。') + '</p>' +
        '<div class="meta-grid">' + metaHtml + '</div>' +
      '</div>'
    );
    if (entry.file) {
      addPreviewAction('下载', true, function () { downloadFile(entry.file, entry.name); });
      if (kind === 'pdf' && entry.size <= 12 * 1024 * 1024) {
        addPreviewAction('在新标签页打开', false, function () { openDataEntry(entry, 'application/pdf'); });
      }
    }
    setStatus('文件 · ' + entry.name);
  }

  function openDataEntry(entry, mime) {
    if (!entry.file) return;
    setStatus('正在准备 ' + entry.name + '…');
    readDataUrl(entry.file).then(function (url) {
      if (mime) {
        var comma = url.indexOf(',');
        if (comma >= 0) url = 'data:' + mime + ';base64,' + url.slice(comma + 1);
      }
      if (url.length > 12 * 1024 * 1024) {
        setStatus('文件较大，建议直接下载', 'warn');
        return;
      }
      if (!window.AiraHome || typeof window.AiraHome.openUrl !== 'function') {
        setStatus('请在 Aira 中打开', 'warn');
        return;
      }
      window.AiraHome.openUrl(url);
      setStatus('已交给 Aira 打开 · ' + entry.name, 'good');
    }).catch(function (error) {
      setStatus('打开失败：' + errorText(error), 'warn');
    });
  }

  function openHtmlEntry(entry) {
    if (!entry || !entry.file) return;
    setStatus('正在打包 ' + entry.name + '…');
    packHtmlEntry(entry).then(function (result) {
      var url = 'data:text/' + 'html;charset=utf-8,' + encodeURIComponent(result.html);
      if (url.length > URL_WARN) {
        setStatus('页面较大（' + url.length.toLocaleString() + ' 字符），可能无法打开；建议下载', 'warn');
      }
      if (!window.AiraHome || typeof window.AiraHome.openUrl !== 'function') {
        setStatus('请在 Aira 中打开；桌面预览无法新建标签页', 'warn');
        return;
      }
      try {
        window.AiraHome.openUrl(url);
        setStatus('已交给 Aira 打开 · 内联 ' + result.inlined + ' 个资源' +
          (result.missing.length ? ' · 缺失 ' + result.missing.length + ' 个' : ''),
          result.missing.length ? 'warn' : 'good');
      } catch (error) {
        setStatus('打开失败：' + errorText(error), 'warn');
      }
    }).catch(function (error) {
      setStatus('打包失败：' + errorText(error), 'warn');
    });
  }

  function candidatePaths(ref, baseSegments) {
    var clean = String(ref || '').trim();
    if (!clean) return [];
    var lower = clean.toLowerCase();
    if (lower.charAt(0) === '#' ||
      lower.indexOf('data:') === 0 ||
      lower.indexOf('http:') === 0 ||
      lower.indexOf('https:') === 0 ||
      lower.indexOf('//') === 0 ||
      lower.indexOf('mailto:') === 0 ||
      lower.indexOf('tel:') === 0 ||
      lower.indexOf('java' + 'script:') === 0 ||
      lower.indexOf('about:') === 0 ||
      lower.indexOf('blob:') === 0) {
      return [];
    }
    clean = clean.split('?')[0].split('#')[0];
    try { clean = decodeURIComponent(clean); } catch (_error) {}
    var absolute = clean.charAt(0) === '/';
    var parts = clean.replace(/\\/g, '/').split('/');
    var segments = absolute ? [] : baseSegments.slice();
    parts.forEach(function (part) {
      if (!part || part === '.') return;
      if (part === '..') {
        segments.pop();
        return;
      }
      segments.push(part);
    });
    var candidates = [];
    function add(candidate) {
      if (!candidate.length) return;
      var key = candidate.join('/');
      for (var i = 0; i < candidates.length; i += 1) {
        if (candidates[i].join('/') === key) return;
      }
      candidates.push(candidate.slice());
    }
    add(segments);
    if (state.rootName) {
      add([state.rootName].concat(segments));
      if (segments[0] === state.rootName) add(segments.slice(1));
    }
    return candidates;
  }

  function getDirBySegments(segments) {
    if (!segments.length) return Promise.resolve(state.rootHandle);
    var key = segments.join('/');
    if (state.handleCache.has('dir:' + key)) return Promise.resolve(state.handleCache.get('dir:' + key));
    var parentPromise = getDirBySegments(segments.slice(0, -1));
    return parentPromise.then(function (parent) {
      return parent.getDirectoryHandle(segments[segments.length - 1]);
    }).then(function (dir) {
      state.handleCache.set('dir:' + key, dir);
      return dir;
    });
  }

  function getFileFromHandlePath(segments) {
    if (!segments.length) return Promise.resolve(null);
    var key = segments.join('/');
    if (state.handleCache.has('file:' + key)) return Promise.resolve(state.handleCache.get('file:' + key));
    var dirSegments = segments.slice(0, -1);
    return getDirBySegments(dirSegments).then(function (dir) {
      return dir.getFileHandle(segments[segments.length - 1]);
    }).then(function (fileHandle) {
      return fileHandle.getFile();
    }).then(function (file) {
      state.handleCache.set('file:' + key, file);
      return file;
    }).catch(function () {
      return null;
    });
  }

  function resolveAsset(ref, baseSegments) {
    var candidates = candidatePaths(ref, baseSegments);
    if (!candidates.length) return Promise.resolve(null);
    if (state.source === 'handle') {
      return candidates.reduce(function (chain, segments) {
        return chain.then(function (found) {
          if (found) return found;
          return getFileFromHandlePath(segments).then(function (file) {
            return file ? { path: segments.join('/'), file: file } : null;
          });
        });
      }, Promise.resolve(null));
    }
    for (var i = 0; i < candidates.length; i += 1) {
      var key = candidates[i].join('/');
      var file = state.fileMap && (state.fileMap.get(key) || state.fileMap.get(key.toLowerCase()));
      if (file) return Promise.resolve({ path: key, file: file });
    }
    return Promise.resolve(null);
  }

  function inlineCssUrls(css, baseSegments, ctx) {
    var source = String(css || '');
    if (!source || source.toLowerCase().indexOf('url(') < 0) return Promise.resolve(source);
    if (/@import/i.test(source)) ctx.warnings.push('CSS 里有 @import，未递归内联');
    var re = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
    var refs = [];
    var match;
    while ((match = re.exec(source)) !== null) {
      var ref = String(match[2] || '').trim();
      if (!ref) continue;
      var lower = ref.toLowerCase();
      if (lower.indexOf('data:') === 0 || lower.indexOf('http:') === 0 || lower.indexOf('https:') === 0 ||
        lower.indexOf('//') === 0 || lower.charAt(0) === '#' || refs.indexOf(ref) >= 0) {
        continue;
      }
      refs.push(ref);
    }
    if (!refs.length) return Promise.resolve(source);
    var replacements = new Map();
    return refs.reduce(function (chain, ref) {
      return chain.then(function () {
        return resolveAsset(ref, baseSegments).then(function (found) {
          if (!found) {
            ctx.missing.push(ref);
            return;
          }
          if (found.file.size > 4 * 1024 * 1024) {
            ctx.warnings.push(ref + ' 超过 4 MB，未内联');
            return;
          }
          return readDataUrl(found.file).then(function (data) {
            replacements.set(ref, data);
            ctx.inlined += 1;
          });
        });
      });
    }, Promise.resolve()).then(function () {
      return source.replace(re, function (full, quote, ref) {
        var data = replacements.get(String(ref || '').trim());
        return data ? 'url("' + data + '")' : full;
      });
    });
  }

  function sanitizeForPreview(html) {
    var doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    doc.querySelectorAll('script, iframe, object, embed, base, link[rel="stylesheet"], meta[http-equiv="refresh"]').forEach(function (node) {
      node.remove();
    });
    doc.querySelectorAll('*').forEach(function (node) {
      Array.prototype.slice.call(node.attributes).forEach(function (attr) {
        var name = attr.name.toLowerCase();
        var value = String(attr.value || '').trim().toLowerCase();
        if (name.indexOf('on') === 0 || value.indexOf('java' + 'script:') === 0) {
          node.removeAttribute(attr.name);
        }
      });
    });
    var styles = Array.prototype.map.call(doc.querySelectorAll('style'), function (node) {
      return node.textContent || '';
    }).join('\n');
    if (styles) {
      styles = styles.replace(/(^|})\s*body\b/gi, '$1 .paper');
    }
    return (styles ? '<style>' + styles + '</style>' : '') + (doc.body ? doc.body.innerHTML : '');
  }

  function packHtmlEntry(entry) {
    if (!entry || !entry.file) return Promise.reject(new Error('文件不可用'));
    var cacheKey = state.source + '|' + entry.path;
    if (state.packedCache.has(cacheKey)) return Promise.resolve(state.packedCache.get(cacheKey));
    var baseSegments = state.path.slice(1).map(function (part) { return part.name; });
    var ctx = { inlined: 0, missing: [], warnings: [] };

    return readText(entry.file).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('base').forEach(function (node) { node.remove(); });
      doc.querySelectorAll('meta[http-equiv]').forEach(function (node) {
        var value = String(node.getAttribute('http-equiv') || '').toLowerCase();
        if (value === 'refresh') node.remove();
        if (value === 'content-security-policy') ctx.warnings.push('页面带 CSP，内联资源可能被拦截');
      });
      var embedded = doc.querySelectorAll('iframe, object, embed');
      if (embedded.length) {
        embedded.forEach(function (node) { node.remove(); });
        ctx.warnings.push('移除了 ' + embedded.length + ' 个内嵌框架');
      }
      if (doc.querySelectorAll('[srcset]').length) ctx.warnings.push('srcset 未内联');

      var chain = Promise.resolve();

      doc.querySelectorAll('link[rel~="stylesheet"][href]').forEach(function (link) {
        chain = chain.then(function () {
          var ref = link.getAttribute('href');
          return resolveAsset(ref, baseSegments).then(function (found) {
            if (!found) {
              ctx.missing.push(ref);
              return;
            }
            return readText(found.file).then(function (css) {
              var cssDir = found.path.split('/').slice(0, -1);
              return inlineCssUrls(css, cssDir, ctx).then(function (rewritten) {
                var style = doc.createElement('style');
                style.textContent = rewritten;
                link.replaceWith(style);
                ctx.inlined += 1;
              });
            });
          });
        });
      });

      chain = chain.then(function () {
        var styles = Array.prototype.slice.call(doc.querySelectorAll('style'));
        return styles.reduce(function (inner, style) {
          return inner.then(function () {
            return inlineCssUrls(style.textContent || '', baseSegments, ctx).then(function (rewritten) {
              style.textContent = rewritten;
            });
          });
        }, Promise.resolve());
      });

      chain = chain.then(function () {
        var scripts = Array.prototype.slice.call(doc.querySelectorAll('script[src]'));
        return scripts.reduce(function (inner, script) {
          return inner.then(function () {
            var type = String(script.getAttribute('type') || '').toLowerCase();
            if (type && type !== 'module' && type !== 'text/javascript' && type !== 'application/javascript') {
              return;
            }
            var ref = script.getAttribute('src');
            return resolveAsset(ref, baseSegments).then(function (found) {
              if (!found) {
                ctx.missing.push(ref);
                return;
              }
              return readText(found.file).then(function (code) {
                if (type === 'module') ctx.warnings.push('模块脚本 ' + ref + ' 已内联，但相对 import 可能失效');
                script.removeAttribute('src');
                script.removeAttribute('async');
                script.removeAttribute('defer');
                script.removeAttribute('integrity');
                script.removeAttribute('crossorigin');
                script.textContent = code;
                ctx.inlined += 1;
              });
            });
          });
        }, Promise.resolve());
      });

      chain = chain.then(function () {
        var assets = [];
        doc.querySelectorAll('img[src], source[src], audio[src], video[src], link[rel~="icon"][href]').forEach(function (node) {
          assets.push({ node: node, attr: node.hasAttribute('src') ? 'src' : 'href' });
        });
        doc.querySelectorAll('video[poster]').forEach(function (node) {
          assets.push({ node: node, attr: 'poster' });
        });
        return assets.reduce(function (inner, item) {
          return inner.then(function () {
            var ref = item.node.getAttribute(item.attr);
            if (!ref) return;
            var lower = String(ref).toLowerCase();
            if (lower.indexOf('data:') === 0 || lower.indexOf('http:') === 0 || lower.indexOf('https:') === 0 || lower.indexOf('//') === 0) return;
            return resolveAsset(ref, baseSegments).then(function (found) {
              if (!found) {
                ctx.missing.push(ref);
                return;
              }
              if (found.file.size > ASSET_LIMIT) {
                ctx.warnings.push(ref + ' 超过 8 MB，未内联');
                return;
              }
              return readDataUrl(found.file).then(function (data) {
                item.node.setAttribute(item.attr, data);
                ctx.inlined += 1;
              });
            });
          });
        }, Promise.resolve());
      });

      chain = chain.then(function () {
        var styled = Array.prototype.slice.call(doc.querySelectorAll('[style]'));
        return styled.reduce(function (inner, node) {
          return inner.then(function () {
            return inlineCssUrls(node.getAttribute('style') || '', baseSegments, ctx).then(function (rewritten) {
              node.setAttribute('style', rewritten);
            });
          });
        }, Promise.resolve());
      });

      return chain.then(function () {
        var localLinks = Array.prototype.filter.call(doc.querySelectorAll('a[href]'), function (anchor) {
          var ref = String(anchor.getAttribute('href') || '');
          var lower = ref.toLowerCase();
          return ref && lower.charAt(0) !== '#' && lower.indexOf('http:') !== 0 && lower.indexOf('https:') !== 0 &&
            lower.indexOf('mailto:') !== 0 && lower.indexOf('tel:') !== 0 && lower.indexOf('data:') !== 0;
        });
        if (localLinks.length) ctx.warnings.push('有 ' + localLinks.length + ' 个站内链接，打包后可能无法跳转');
        var result = {
          html: '<!doctype html>\n' + doc.documentElement.outerHTML,
          inlined: ctx.inlined,
          missing: ctx.missing,
          warnings: ctx.warnings
        };
        state.packedCache.set(cacheKey, result);
        return result;
      });
    });
  }

  function pickFolder() {
    if (state.forceInputFallback || typeof window.showDirectoryPicker !== 'function') {
      setStatus('正在打开文件夹选择…');
      refs.folderInput.click();
      return;
    }
    setStatus('正在打开目录选择…');
    var picker;
    try {
      picker = window.showDirectoryPicker({ mode: 'read' });
    } catch (error) {
      picker = Promise.reject(error);
    }
    picker.then(function (handle) {
      return mountHandle(handle, false);
    }).catch(function (error) {
      if (error && error.name === 'AbortError') {
        setStatus('已取消选择', 'warn');
        return;
      }
      if (error && error.name === 'TypeError') {
        return window.showDirectoryPicker().then(function (handle) {
          return mountHandle(handle, false);
        }).catch(function (retryError) {
          if (retryError && retryError.name === 'AbortError') {
            setStatus('已取消选择', 'warn');
            return;
          }
          state.forceInputFallback = true;
          setStatus('目录句柄不可用，已切换为文件夹选择；请再点一次“选择新路径”', 'warn');
        });
      }
      if (error && (error.name === 'SecurityError' || error.name === 'NotSupportedError' || error.name === 'NotAllowedError')) {
        state.forceInputFallback = true;
        setStatus('目录句柄不可用，已切换为文件夹选择；请再点一次“选择新路径”', 'warn');
        return;
      }
      setStatus('打开目录失败：' + errorText(error), 'warn');
    });
  }

  function mountHandle(handle, restored) {
    if (!handle || handle.kind !== 'directory') {
      state.forceInputFallback = true;
      setStatus('没有拿到可用的文件夹，已切换为文件夹选择；请再点一次“选择新路径”', 'warn');
      return Promise.resolve();
    }
    state.source = 'handle';
    state.rootHandle = handle;
    state.rootNode = null;
    state.rootName = handle.name;
    state.currentHandle = handle;
    state.currentNode = null;
    state.path = [{ name: handle.name, handle: handle }];
    state.entries = [];
    state.selected = null;
    state.isDefault = !!restored;
    state.pendingDefaultHandle = null;
    state.handleCache.clear();
    state.packedCache.clear();
    state.query = '';
    refs.search.value = '';
    refs.searchClear.hidden = true;
    clearPreview();
    updateAll();
    return loadCurrentDirectory();
  }

  function mountInputFiles(files, folderName, restored) {
    if (!files || !files.length) {
      setStatus('没有收到文件', 'warn');
      return Promise.resolve();
    }
    var firstPath = files[0].webkitRelativePath || '';
    var detectedRoot = firstPath.indexOf('/') >= 0 ? firstPath.split('/')[0] : (folderName || '本地文件夹');
    var rootName = detectedRoot || '本地文件夹';
    var tree = { name: rootName, kind: 'directory', children: new Map() };
    var fileMap = new Map();

    files.forEach(function (file) {
      var rel = file.webkitRelativePath || file.name;
      var parts = rel.split('/').filter(Boolean);
      if (parts.length > 1 && parts[0] === rootName) parts = parts.slice(1);
      if (parts.length > 1 && parts[0] !== rootName && firstPath.indexOf('/') < 0) {
        // Flat multi-file selection: keep names as they are.
      }
      if (!parts.length) return;
      var key = parts.join('/');
      fileMap.set(key, file);
      fileMap.set(key.toLowerCase(), file);
      var node = tree;
      parts.forEach(function (part, index) {
        if (index === parts.length - 1) {
          node.children.set(part, { name: part, kind: 'file', file: file });
          return;
        }
        var child = node.children.get(part);
        if (!child) {
          child = { name: part, kind: 'directory', children: new Map() };
          node.children.set(part, child);
        }
        node = child;
      });
    });

    state.source = 'input';
    state.rootHandle = null;
    state.rootNode = tree;
    state.rootName = rootName;
    state.currentHandle = null;
    state.currentNode = tree;
    state.path = [{ name: rootName, node: tree }];
    state.entries = [];
    state.selected = null;
    state.isDefault = !!restored;
    state.pendingDefaultHandle = null;
    state.fileMap = fileMap;
    state.handleCache.clear();
    state.packedCache.clear();
    state.query = '';
    refs.search.value = '';
    refs.searchClear.hidden = true;
    clearPreview();
    updateAll();
    if (files.length > 3000) {
      setStatus('已加载 ' + files.length + ' 个文件；建议下次选择更小的项目文件夹', 'warn');
    }
    return loadCurrentDirectory().then(function () {
      if (files.length > 3000) {
        setStatus('已加载 ' + files.length + ' 个文件；当前只显示文件夹内容，建议选择更小的项目文件夹', 'warn');
      }
    });
  }

  function readInputDirectory(node) {
    var entries = [];
    if (!node || !node.children) return entries;
    node.children.forEach(function (child) {
      if (child.kind === 'directory') {
        entries.push({
          name: child.name,
          kind: 'directory',
          node: child,
          size: 0,
          modified: 0,
          type: '',
          ext: '',
          path: currentPathName(child.name)
        });
      } else {
        var file = child.file;
        entries.push({
          name: child.name,
          kind: 'file',
          file: file,
          size: file ? file.size : 0,
          modified: file ? file.lastModified : 0,
          type: file ? file.type : '',
          ext: extensionOf(child.name),
          path: currentPathName(child.name)
        });
      }
    });
    return entries;
  }

  function readHandleDirectory(dirHandle) {
    if (!dirHandle || typeof dirHandle.entries !== 'function') {
      return Promise.reject(new Error('目录句柄不支持 entries()'));
    }
    var entries = [];
    var iterator;
    try {
      iterator = dirHandle.entries();
    } catch (error) {
      return Promise.reject(error);
    }
    if (!iterator || typeof iterator.next !== 'function') {
      return Promise.reject(new Error('目录句柄返回格式不支持'));
    }
    function step() {
      return iterator.next().then(function (result) {
        if (result.done) return entries;
        var pair = result.value || [];
        var name = pair[0];
        var handle = pair[1];
        if (!name || !handle) return step();
        if (handle.kind === 'directory') {
          entries.push({
            name: name,
            kind: 'directory',
            handle: handle,
            size: 0,
            modified: 0,
            type: '',
            ext: '',
            path: currentPathName(name)
          });
          return step();
        }
        return handle.getFile().then(function (file) {
          entries.push({
            name: name,
            kind: 'file',
            handle: handle,
            file: file,
            size: file.size,
            modified: file.lastModified,
            type: file.type,
            ext: extensionOf(name),
            path: currentPathName(name)
          });
        }).catch(function () {
          entries.push({
            name: name,
            kind: 'file',
            handle: handle,
            file: null,
            size: 0,
            modified: 0,
            type: '',
            ext: extensionOf(name),
            path: currentPathName(name)
          });
        }).then(step);
      });
    }
    return step();
  }

  function loadCurrentDirectory() {
    if (!state.path.length) {
      updateAll();
      return Promise.resolve();
    }
    state.loadToken += 1;
    var token = state.loadToken;
    state.loading = true;
    state.selected = null;
    state.packedCache.clear();
    state.handleCache.delete('file:' + state.path.map(function (part) { return part.name; }).join('/'));
    clearPreview();
    renderRowNote('正在读取文件夹…', true);
    setStatus('正在读取 ' + state.path[state.path.length - 1].name + '…');
    var loader = state.source === 'handle' ?
      readHandleDirectory(state.currentHandle) :
      Promise.resolve(readInputDirectory(state.currentNode));
    return loader.then(function (entries) {
      if (token !== state.loadToken) return;
      state.entries = entries;
      state.lastScan = Date.now();
      state.loading = false;
      updateAll();
      setStatus('已挂载 ' + state.rootName + ' · ' + entries.length + ' 项', 'good');
    }).catch(function (error) {
      if (token !== state.loadToken) return;
      state.loading = false;
      state.entries = [];
      updateAll();
      if (state.source === 'handle') {
        state.forceInputFallback = true;
        setStatus('目录句柄读取失败，已切换为文件夹选择；请再点一次“选择新路径”', 'warn');
        renderRowNote('目录句柄读取失败。请再点一次“选择新路径”，这次会改用普通文件夹选择。');
      } else {
        setStatus('读取失败：' + errorText(error), 'warn');
        renderRowNote('读取失败。请重新选择文件夹，或再点一次“刷新”。');
      }
    });
  }

  function enterEntry(entry) {
    if (!entry || entry.kind !== 'directory') return;
    if (state.source === 'handle') {
      state.currentHandle = entry.handle;
      state.path.push({ name: entry.name, handle: entry.handle });
    } else {
      state.currentNode = entry.node;
      state.path.push({ name: entry.name, node: entry.node });
    }
    state.query = '';
    refs.search.value = '';
    refs.searchClear.hidden = true;
    loadCurrentDirectory();
  }

  function navigateTo(index) {
    if (index < 0 || index >= state.path.length) return;
    state.path = state.path.slice(0, index + 1);
    if (state.source === 'handle') {
      state.currentHandle = state.path[index].handle;
    } else {
      state.currentNode = state.path[index].node;
    }
    state.query = '';
    refs.search.value = '';
    refs.searchClear.hidden = true;
    loadCurrentDirectory();
  }

  function goUp() {
    if (state.path.length > 1) navigateTo(state.path.length - 2);
  }

  function refreshFolder() {
    if (!state.path.length) return;
    state.handleCache.clear();
    state.packedCache.clear();
    loadCurrentDirectory();
  }

  function onFolderInputChange() {
    var files = Array.prototype.slice.call(refs.folderInput.files || []);
    refs.folderInput.value = '';
    if (!files.length) {
      setStatus('没有收到文件', 'warn');
      return;
    }
    var folderName = files[0].webkitRelativePath ? files[0].webkitRelativePath.split('/')[0] : '本地文件夹';
    var restored = state.restorePickPending;
    state.restorePickPending = false;
    mountInputFiles(files, folderName, restored);
  }

  function onSearchInput() {
    state.query = String(refs.search.value || '').trim();
    refs.searchClear.hidden = !state.query;
    renderRows();
  }

  function clearSearch() {
    refs.search.value = '';
    state.query = '';
    refs.searchClear.hidden = true;
    renderRows();
    refs.search.focus();
  }

  function onHeaderClick(event) {
    var column = event.target.closest ? event.target.closest('.shelf-col') : null;
    if (!column) return;
    var key = column.getAttribute('data-sort');
    if (!key) return;
    if (state.sortKey === key) {
      state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortKey = key;
      state.sortDir = key === 'name' || key === 'type' ? 'asc' : 'desc';
    }
    updateSortHeaders();
    renderRows();
    saveUi();
    setStatus('已按' + (key === 'name' ? '名称' : key === 'type' ? '类型' : key === 'time' ? '时间' : '大小') +
      (state.sortDir === 'asc' ? '升序' : '降序') + '排列');
  }

  function setView(view) {
    if (view !== 'list' && view !== 'grid') return;
    state.view = view;
    applyView();
    renderRows();
    saveUi();
  }

  function toggleHidden() {
    state.showHidden = !state.showHidden;
    refs.menuHidden.setAttribute('aria-checked', state.showHidden ? 'true' : 'false');
    closeMenu();
    refreshFolder();
    saveUi();
    setStatus(state.showHidden ? '已显示隐藏文件' : '已隐藏隐藏文件');
  }

  function saveDefaultPath() {
    if (!state.path.length) {
      setStatus('先选择一个文件夹', 'warn');
      return;
    }
    var meta = {
      name: state.rootName,
      source: state.source,
      savedAt: Date.now(),
      itemCount: state.entries.length
    };
    var chain = storeSet(DEFAULT_KEY, meta);
    if (state.source === 'handle' && state.rootHandle) {
      chain = chain.then(function () { return idbSet('default', state.rootHandle); }).catch(function () {
        meta.source = 'input';
        return storeSet(DEFAULT_KEY, meta);
      });
    }
    chain.then(function () {
      state.defaultMeta = meta;
      state.isDefault = true;
      setStatus(meta.source === 'handle' ?
        '已设为默认路径 · 下次打开可直接恢复' :
        '已记录默认文件夹 · 下次需要重新选择（当前环境不保留文件夹授权）',
        meta.source === 'handle' ? 'good' : 'warn');
      updateSummary();
      updateToolbar();
    }).catch(function (error) {
      setStatus('保存默认路径失败：' + errorText(error), 'warn');
    });
  }

  function clearDefaultPath() {
    storeRemove(DEFAULT_KEY).catch(function () {});
    idbDelete('default').catch(function () {});
    state.defaultMeta = null;
    state.pendingDefaultHandle = null;
    state.isDefault = false;
    state.restorePickPending = false;
    refs.restore.hidden = true;
    closeMenu();
    updateSummary();
    updateToolbar();
    setStatus('已清除默认路径');
  }

  function ensureHandlePermission(handle, request) {
    if (!handle) return Promise.resolve(false);
    if (typeof handle.queryPermission !== 'function') return Promise.resolve(true);
    return handle.queryPermission({ mode: 'read' }).then(function (status) {
      if (status === 'granted') return true;
      if (request && status !== 'denied' && typeof handle.requestPermission === 'function') {
        return handle.requestPermission({ mode: 'read' }).then(function (next) {
          return next === 'granted';
        });
      }
      return false;
    }).catch(function () {
      return false;
    });
  }

  function restoreDefault() {
    if (state.path.length || !state.defaultMeta) return Promise.resolve();
    if (state.defaultMeta.source === 'input') {
      refs.restore.hidden = false;
      refs.restore.textContent = '重新选择默认路径';
      setStatus('上次使用：' + state.defaultMeta.name + '；点“恢复默认路径”重新选择', 'warn');
      updateSummary();
      return Promise.resolve();
    }
    return idbGet('default').then(function (handle) {
      if (!handle) {
        refs.restore.hidden = false;
        refs.restore.textContent = '恢复默认路径';
        setStatus('默认路径的文件夹句柄已不存在，请重新选择', 'warn');
        updateSummary();
        return;
      }
      return ensureHandlePermission(handle, false).then(function (granted) {
        if (granted) return mountHandle(handle, true);
        state.pendingDefaultHandle = handle;
        refs.restore.hidden = false;
        refs.restore.textContent = '恢复默认路径';
        setStatus('默认路径等待授权', 'warn');
        updateSummary();
        return undefined;
      });
    }).catch(function () {
      refs.restore.hidden = false;
      refs.restore.textContent = '恢复默认路径';
      setStatus('无法自动恢复默认路径，请重新选择', 'warn');
      updateSummary();
    });
  }

  function restoreDefaultFromGesture() {
    if (state.pendingDefaultHandle) {
      var handle = state.pendingDefaultHandle;
      ensureHandlePermission(handle, true).then(function (granted) {
        if (granted) {
          state.pendingDefaultHandle = null;
          mountHandle(handle, true);
        } else {
          setStatus('没有获得文件夹读取权限', 'warn');
        }
      });
      return;
    }
    if (state.defaultMeta && state.defaultMeta.source === 'input') {
      state.restorePickPending = true;
      pickFolder();
      return;
    }
    restoreDefault();
  }

  function toggleMenu() {
    var willOpen = refs.menu.hidden;
    refs.menu.hidden = !willOpen;
    refs.more.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    refs.menuClear.disabled = !state.defaultMeta;
    refs.menuHidden.setAttribute('aria-checked', state.showHidden ? 'true' : 'false');
  }

  function closeMenu() {
    refs.menu.hidden = true;
    refs.more.setAttribute('aria-expanded', 'false');
  }

  function openShelf() {
    if (state.open) return;
    state.open = true;
    root.hidden = false;
    document.documentElement.classList.add('shelf-open');
    document.body.classList.add('shelf-open');
    var launcher = $('btnShelf');
    if (launcher) launcher.setAttribute('aria-expanded', 'true');
    closeMenu();
    updateAll();
    if (state.path.length) {
      if (state.selected) renderPreview(state.selected);
    } else {
      restoreDefault();
    }
    setStatus('只读模式 · 文件不会离开这台设备');
    card.focus({ preventScroll: true });
  }

  function closeShelf() {
    if (!state.open) return;
    state.open = false;
    state.previewToken += 1;
    revokePreviewUrl();
    revokeThumbUrls();
    root.hidden = true;
    document.documentElement.classList.remove('shelf-open');
    document.body.classList.remove('shelf-open');
    var launcher = $('btnShelf');
    if (launcher) {
      launcher.setAttribute('aria-expanded', 'false');
      launcher.focus({ preventScroll: true });
    }
    closeMenu();
  }

  function onGlobalKeydown(event) {
    if (!state.open) return;
    if (event.key === 'Escape') {
      if (!refs.menu.hidden) {
        closeMenu();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      closeShelf();
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function trapFocus(event) {
    var focusables = Array.prototype.filter.call(
      card.querySelectorAll('button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"])'),
      function (node) { return node.offsetParent !== null; }
    );
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (event.shiftKey && (document.activeElement === first || !card.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !card.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  function bindEvents() {
    var launcher = $('btnShelf');
    if (launcher) launcher.addEventListener('click', openShelf);

    refs.close.addEventListener('click', closeShelf);
    refs.mask.addEventListener('click', closeShelf);
    refs.more.addEventListener('click', function (event) {
      event.stopPropagation();
      toggleMenu();
    });
    refs.menuHidden.addEventListener('click', toggleHidden);
    refs.menuClear.addEventListener('click', clearDefaultPath);

    refs.pick.addEventListener('click', pickFolder);
    refs.emptyPick.addEventListener('click', pickFolder);
    refs.restore.addEventListener('click', restoreDefaultFromGesture);
    refs.defaultBtn.addEventListener('click', saveDefaultPath);
    refs.refresh.addEventListener('click', refreshFolder);
    refs.search.addEventListener('input', onSearchInput);
    refs.searchClear.addEventListener('click', clearSearch);
    refs.listHead.addEventListener('click', onHeaderClick);
    refs.up.addEventListener('click', goUp);
    refs.viewList.addEventListener('click', function () { setView('list'); });
    refs.viewGrid.addEventListener('click', function () { setView('grid'); });
    refs.folderInput.addEventListener('change', onFolderInputChange);

    card.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if (!refs.menu.hidden) {
          closeMenu();
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        closeShelf();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key === 'Tab') trapFocus(event);
      event.stopPropagation();
    });

    card.addEventListener('pointerdown', function (event) {
      if (!refs.menu.hidden && !refs.menu.contains(event.target) && event.target !== refs.more) closeMenu();
      event.stopPropagation();
    });
    card.addEventListener('click', function (event) {
      event.stopPropagation();
    });

    document.addEventListener('keydown', onGlobalKeydown, true);
    document.addEventListener('pointerdown', function (event) {
      if (!state.open || refs.menu.hidden) return;
      if (!refs.menu.contains(event.target) && !refs.more.contains(event.target)) closeMenu();
    }, true);
  }

  bindEvents();
  applyView();
  updateSortHeaders();
  updateAll();
  loadDefaultMeta();

  var homeReadyHandled = false;
  window.addEventListener('aira-home-ready', function () {
    if (homeReadyHandled) return;
    homeReadyHandled = true;
    loadDefaultMeta();
  });

  window.AiraLocalShelf = {
    open: openShelf,
    close: closeShelf
  };
})();
