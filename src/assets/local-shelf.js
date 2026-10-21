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
    favoritesBtn: $('shelfFavorites'),
    favoritesPanel: $('shelfFavoritesPanel'),
    favoritesList: $('shelfFavoritesList'),
    favoritesClose: $('shelfFavoritesClose'),
    favoritesBack: $('shelfFavoritesBack'),
    favoritesPager: $('shelfFavoritesPager'),
    favPrev: $('shelfFavPrev'),
    favPage: $('shelfFavPage'),
    favNext: $('shelfFavNext'),
    missing: $('shelfFavoriteMissing'),
    missingName: $('shelfMissingName'),
    missingPath: $('shelfMissingPath'),
    missingCopy: $('shelfMissingCopy'),
    missingRemove: $('shelfMissingRemove'),
    missingClose: $('shelfMissingClose'),
    menu: $('shelfMenu'),
    menuHidden: $('shelfMenuHidden'),
    menuFiles: $('shelfMenuFiles'),
    menuClear: $('shelfMenuClear'),
    pick: $('shelfPick'),
    emptyPick: $('shelfEmptyPick'),
    emptyFiles: $('shelfEmptyFiles'),
    openFiles: $('shelfOpenFiles'),
    defaultBtn: $('shelfDefault'),
    defaultLabel: $('shelfDefaultLabel'),
    refresh: $('shelfRefresh'),
    search: $('shelfSearch'),
    searchClear: $('shelfSearchClear'),
    viewList: $('shelfViewList'),
    viewGrid: $('shelfViewGrid'),
    filter: $('shelfFilter'),
    filterLabel: $('shelfFilterLabel'),
    filterMenu: $('shelfFilterMenu'),
    keepFolders: $('shelfKeepFolders'),
    recent: $('shelfRecent'),
    recentLeft: $('shelfRecentLeft'),
    recentRight: $('shelfRecentRight'),
    summary: $('shelfSummary'),
    summaryIcon: $('shelfSummaryIcon'),
    folderName: $('shelfFolderName'),
    folderPath: $('shelfFolderPath'),
    folderStats: $('shelfFolderStats'),
    defaultBadge: $('shelfDefaultBadge'),
    scanTime: $('shelfScanTime'),
    reauth: $('shelfReauth'),
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
    rename: $('shelfRename'),
    renameSub: $('shelfRenameSub'),
    renameInput: $('shelfRenameInput'),
    renameReset: $('shelfRenameReset'),
    renameCancel: $('shelfRenameCancel'),
    renameSave: $('shelfRenameSave'),
    folderInput: $('shelfFolderInput'),
    fileInput: $('shelfFileInput')
  };

  var previewShadow = null;
  var renameTarget = null;
  var renameTimer = 0;

  var state = {
    open: false,
    source: 'none',
    flatFiles: false,
    rootHandle: null,
    rootNode: null,
    rootName: '',
    pendingRecentMeta: null,
    previewExpanded: false,
    favorites: [],
    favoritesFilter: 'all',
    favoritesSort: 'time',
    favoritesSortDir: 'desc',
    favoritesPage: 1,
    missingFav: null,
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
    filter: 'mdhtml',
    foldersCollapsed: false,
    keepFolders: true,
    recent: [],
    recentHandles: new Map(),
    recentReady: Promise.resolve(),
    recentLoaded: false,
    isDefault: false,
    defaultMeta: null,
    defaultHandle: null,
    pendingDefaultHandle: null,
    restorePickPending: false,
    forceInputFallback: false,
    needsReauth: false,
    reauthHandle: null,
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
  var RECENT_KEY = 'localShelf.recent.v1';
  var FAVORITES_KEY = 'localShelf.favorites.v1';
  var RECENT_LIMIT = 8;
  var RECENT_IDB_PREFIX = 'recent:';
  var DB_NAME = 'lucent-local-shelf';
  var DB_STORE = 'handles';
  var TEXT_LIMIT = 256 * 1024;
  var IMAGE_LIMIT = 24 * 1024 * 1024;
  var MEDIA_LIMIT = 120 * 1024 * 1024;
  var ASSET_LIMIT = 8 * 1024 * 1024;
  var URL_WARN = 1800000;
  var FILTER_LABELS = {
    all: '全部类型',
    mdhtml: 'MD + HTML',
    html: 'HTML',
    pdf: 'PDF',
    md: 'Markdown',
    image: '图片',
    text: '文本/代码',
    archive: '压缩包',
    media: '音视频'
  };
  var FILTER_ORDER = ['all', 'mdhtml', 'html', 'pdf', 'md', 'image', 'text', 'archive', 'media'];
  var WELL_KNOWN_DIRS = {
    documents: 'documents',
    downloads: 'downloads',
    desktop: 'desktop',
    pictures: 'pictures',
    music: 'music',
    videos: 'videos'
  };

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
    '.audio-stage .glyph svg{width:24px;height:24px}',
    '.audio-stage audio{width:min(100%,420px)}',
    '.audio-stage .name{max-width:100%;color:rgba(255,255,255,.7);font-size:12px;overflow-wrap:anywhere;text-align:center}',
    '.image-meta{padding:0 14px 12px;color:#7a7d84;font:10px/1.5 var(--mono);text-align:center}',
    '.code{margin:0;padding:16px 18px;white-space:pre-wrap;word-break:break-word;',
    'font:11.5px/1.65 var(--mono);color:#1b1c20;background:#fbfaf6}',
    '.meta-card{box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;min-height:100%;',
    'padding:28px;text-align:center;transform:translateY(-16px)}',
    '.meta-card .glyph{display:grid;place-items:center;width:48px;height:48px;border:1px solid rgba(0,0,0,.08);',
    'border-radius:15px;background:rgba(231,201,135,.18);color:#8a6118}',
    '.meta-card .glyph svg{width:22px;height:22px}',
    '.meta-card strong{font-size:14px;font-weight:650;overflow-wrap:anywhere}',
    '.meta-card p{margin:0;color:#7a7d84;font-size:11.5px;line-height:1.9}',
    '.meta-card .meta-grid{display:grid;grid-template-columns:auto auto;gap:8px 24px;margin-top:12px;',
    'color:#666;font:10.5px/1.9 var(--mono);text-align:left}',
    '.folder-card{box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:100%;',
    'padding:24px;text-align:center;transform:translateY(-16px)}',
    '.folder-card .glyph{display:grid;place-items:center;width:54px;height:54px;border:1px solid rgba(0,0,0,.08);',
    'border-radius:17px;background:linear-gradient(145deg,rgba(231,201,135,.28),rgba(155,215,255,.14));color:#8a6118}',
    '.folder-card .glyph svg{width:26px;height:26px}',
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

  function displayName(meta) {
    if (!meta) return '';
    var custom = typeof meta.customName === 'string' ? meta.customName.trim() : '';
    return custom || meta.name || '';
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
    if (ext === 'md' || ext === 'markdown') return 'md';
    if (['txt', 'log', 'csv'].indexOf(ext) >= 0) return 'text';
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].indexOf(ext) >= 0) return 'archive';
    return 'file';
  }

  var SORT_KIND_ORDER = ['folder', 'md', 'html', 'pdf', 'image', 'audio', 'video', 'archive', 'code', 'text', 'file'];

  function sortKindOf(fav) {
    if (fav.kind === 'directory') return 'folder';
    return kindOf({ kind: 'file', name: fav.name, ext: extensionOf(fav.name) });
  }

  function sortKindRank(fav) {
    var index = SORT_KIND_ORDER.indexOf(sortKindOf(fav));
    return index < 0 ? SORT_KIND_ORDER.length : index;
  }

  function filterKind(entry) {
    var ext = entry.ext || extensionOf(entry.name);
    if (ext === 'md' || ext === 'markdown') return 'md';
    var kind = kindOf(entry);
    if (kind === 'audio' || kind === 'video') return 'media';
    if (kind === 'text' || kind === 'code') return 'text';
    if (kind === 'file') return 'other';
    return kind;
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

  function shortPath(value, limit) {
    var text = String(value || '');
    var max = limit || 72;
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  }

  function isRemoteRef(ref) {
    var lower = String(ref || '').trim().toLowerCase();
    return lower.indexOf('http:') === 0 || lower.indexOf('https:') === 0 || lower.indexOf('//') === 0;
  }

  function addExternal(ctx, ref) {
    var value = String(ref || '').trim();
    if (!value) return;
    if (!ctx.external) ctx.external = [];
    if (ctx.external.indexOf(value) < 0) ctx.external.push(value);
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

  function downloadBlobHtml(html, name) {
    try {
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = name || 'packed.html';
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      window.setTimeout(function () {
        try { URL.revokeObjectURL(url); } catch (_error) {}
        anchor.remove();
      }, 1500);
      setStatus('已请求下载打包页 ' + anchor.download, 'good');
    } catch (error) {
      setStatus('下载打包页失败：' + errorText(error), 'warn');
    }
  }

  function packedFileName(name) {
    var base = String(name || 'page.html').replace(/\.html?$/i, '');
    return (base || 'page') + ' · 打包.html';
  }

  function downloadPackedEntry(entry) {
    if (!entry || !entry.file) return;
    setStatus('正在打包 ' + entry.name + '…');
    packHtmlEntry(entry).then(function (result) {
      downloadBlobHtml(result.html, packedFileName(entry.name));
      if (result.missing.length) {
        setStatus('已请求下载打包页 · 缺失 ' + result.missing.length + ' 个：' + shortPath(result.missing[0], 60), 'warn');
      }
    }).catch(function (error) {
      setStatus('打包失败：' + errorText(error), 'warn');
    });
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
      if (saved.sortKey === 'name' || saved.sortKey === 'type' || saved.sortKey === 'time' || saved.sortKey === 'size' || saved.sortKey === 'none') {
        state.sortKey = saved.sortKey;
      }
      if (saved.sortDir === 'asc' || saved.sortDir === 'desc') state.sortDir = saved.sortDir;
      if (saved.view === 'grid' || saved.view === 'list') state.view = saved.view;
      if (saved.showHidden === true) state.showHidden = true;
      if (FILTER_ORDER.indexOf(saved.filter) >= 0) state.filter = saved.filter;
      if (!saved.mdhtmlDefault) state.filter = 'mdhtml';
      if (saved.keepFolders === false) state.keepFolders = false;
      applyView();
      updateSortHeaders();
      renderFilter();
      if (state.path.length) renderRows();
    });
  }

  function saveUi() {
    storeSet(UI_KEY, {
      sortKey: state.sortKey,
      sortDir: state.sortDir,
      view: state.view,
      showHidden: state.showHidden,
      filter: state.filter,
      keepFolders: state.keepFolders,
      mdhtmlDefault: true
    }).catch(function () {});
  }

  function getRecentCapacity() {
    var width = window.innerWidth || document.documentElement.clientWidth || 0;
    if (width >= 1600) return 7;
    if (width >= 1200) return 5;
    if (width >= 700) return 3;
    return 1;
  }

  function makeRecentId() {
    return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function loadRecent() {
    var task = storeGet(RECENT_KEY, []).then(function (saved) {
      var list = Array.isArray(saved) ? saved.filter(function (meta) {
        return meta && typeof meta.id === 'string' && meta.id && typeof meta.name === 'string' && meta.name;
      }).slice(0, RECENT_LIMIT) : [];
      return Promise.all(list.map(function (meta) {
        if (meta.source !== 'handle') return { meta: meta, handle: null };
        return idbGet(RECENT_IDB_PREFIX + meta.id).then(function (handle) {
          return { meta: meta, handle: handle };
        }).catch(function () {
          return { meta: meta, handle: null };
        });
      })).then(function (items) {
        var valid = items.filter(function (item) {
          return item.meta.source !== 'handle' || item.handle;
        });
        state.recent = valid.map(function (item) { return item.meta; });
        state.recentHandles = new Map();
        valid.forEach(function (item) {
          if (item.handle) state.recentHandles.set(item.meta.id, item.handle);
        });
        state.recentLoaded = true;
        renderRecentStrip();
      });
    }).catch(function () {
      state.recentLoaded = true;
      renderRecentStrip();
    });
    state.recentReady = task;
    return task;
  }

  function rememberRecent(handle, name, source) {
    var run = function () {
      var now = Date.now();
      var dedupe = Promise.resolve(null);
      if (handle && typeof handle.isSameEntry === 'function') {
        dedupe = state.recent.reduce(function (chain, meta) {
          return chain.then(function (found) {
            if (found) return found;
            var existing = state.recentHandles.get(meta.id);
            if (!existing) return null;
            return existing.isSameEntry(handle).then(function (same) {
              return same ? meta : null;
            }).catch(function () {
              return null;
            });
          });
        }, Promise.resolve(null));
      } else if (source === 'handle') {
        dedupe = Promise.resolve(state.recent.find(function (meta) {
          return meta.source === 'handle' && meta.name === name;
        }) || null);
      } else {
        dedupe = Promise.resolve(state.recent.find(function (meta) {
          return meta.source === 'input' && meta.name === name;
        }) || null);
      }

      return dedupe.then(function (existing) {
        var entry = existing || {
          id: makeRecentId(),
          name: name,
          source: source,
          openedAt: 0
        };
        entry.name = name;
        entry.source = source;
        entry.openedAt = now;
        entry.scannedAt = now;

        var next = [entry].concat(state.recent.filter(function (item) {
          return item.id !== entry.id;
        })).slice(0, RECENT_LIMIT);
        var dropped = state.recent.filter(function (item) {
          return next.indexOf(item) < 0;
        });
        state.recent = next;
        if (handle) state.recentHandles.set(entry.id, handle);
        dropped.forEach(function (item) {
          state.recentHandles.delete(item.id);
          idbDelete(RECENT_IDB_PREFIX + item.id).catch(function () {});
        });

        var writes = [storeSet(RECENT_KEY, state.recent)];
        if (handle) writes.push(idbSet(RECENT_IDB_PREFIX + entry.id, handle).catch(function () {}));
        return Promise.all(writes).then(function () {
          renderRecentStrip();
        }).catch(function () {
          renderRecentStrip();
        });
      });
    };

    if (state.recentReady && typeof state.recentReady.then === 'function') {
      return state.recentReady.then(run);
    }
    return run();
  }

  function currentRecentMeta() {
    if (!state.path.length || !state.rootName) return null;
    for (var i = 0; i < state.recent.length; i += 1) {
      var meta = state.recent[i];
      if (meta.name === state.rootName && meta.source === state.source) return meta;
    }
    return null;
  }

  function restoreCurrentRecentOrder() {
    if (!state.path.length) return;
    var current = currentRecentMeta();
    if (!current || state.recent[0] === current) return;
    state.recent = [current].concat(state.recent.filter(function (item) { return item.id !== current.id; }));
    storeSet(RECENT_KEY, state.recent).catch(function () {});
    renderRecentStrip();
  }

  function relativeEntryPath(entry) {
    var full = entry.path || entry.name;
    var prefix = (state.rootName || '') + '/';
    return full.indexOf(prefix) === 0 ? full.slice(prefix.length) : entry.name;
  }

  function favoriteKey(fav) {
    return fav.root + '::' + fav.path;
  }

  function favoriteForEntry(entry) {
    if (!state.rootName) return null;
    var rel = relativeEntryPath(entry);
    for (var i = 0; i < state.favorites.length; i += 1) {
      if (state.favorites[i].root === state.rootName && state.favorites[i].path === rel) return state.favorites[i];
    }
    return null;
  }

  function loadFavorites() {
    return storeGet(FAVORITES_KEY, []).then(function (saved) {
      state.favorites = Array.isArray(saved) ? saved.filter(function (fav) {
        return fav && typeof fav.root === 'string' && fav.root && typeof fav.path === 'string' && fav.path && typeof fav.name === 'string' && fav.name;
      }).slice(0, 200) : [];
      syncFavoriteStars();
      if (!refs.favoritesPanel.hidden) renderFavoritesPanel();
    }).catch(function () {});
  }

  function saveFavorites() {
    return storeSet(FAVORITES_KEY, state.favorites).catch(function () {});
  }

  function syncFavoriteStars() {
    if (!refs.rows) return;
    Array.prototype.forEach.call(refs.rows.querySelectorAll('.shelf-row'), function (row) {
      var path = row.getAttribute('data-path');
      var star = row.querySelector('.shelf-row-star');
      if (!star || !path) return;
      var fav = state.favorites.some(function (item) {
        return item.root === state.rootName && (state.rootName + '/' + item.path) === path;
      });
      star.classList.toggle('is-fav', fav);
      star.setAttribute('aria-pressed', fav ? 'true' : 'false');
      star.setAttribute('aria-label', fav ? '取消收藏' : '收藏');
    });
  }

  function toggleFavorite(entry) {
    if (!entry || !state.rootName) return;
    var rel = relativeEntryPath(entry);
    var existing = state.favorites.filter(function (fav) {
      return fav.root === state.rootName && fav.path === rel;
    })[0];
    if (existing) {
      state.favorites = state.favorites.filter(function (fav) { return fav !== existing; });
      setStatus('已取消收藏 · ' + entry.name);
    } else {
      state.favorites.unshift({
        root: state.rootName,
        path: rel,
        name: entry.name,
        kind: entry.kind,
        addedAt: Date.now()
      });
      setStatus('已收藏 · ' + entry.name, 'good');
    }
    saveFavorites();
    syncFavoriteStars();
    if (!refs.favoritesPanel.hidden) renderFavoritesPanel();
  }

  function removeFavorite(fav) {
    state.favorites = state.favorites.filter(function (item) { return item !== fav; });
    saveFavorites();
    syncFavoriteStars();
    renderFavoritesPanel();
    setStatus('已取消收藏 · ' + fav.name);
  }

  function renderFavoritesPanel() {
    if (!refs.favoritesList) return;
    refs.favoritesList.textContent = '';
    var filter = state.favoritesFilter || 'all';
    Array.prototype.forEach.call(refs.favoritesPanel.querySelectorAll('[data-fav-filter]'), function (button) {
      var active = button.getAttribute('data-fav-filter') === filter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    var filtered = state.favorites.filter(function (fav) {
      return filter === 'all' || fav.kind === filter;
    });
    var sort = state.favoritesSort || 'time';
    var dir = state.favoritesSortDir === 'asc' ? 'asc' : 'desc';
    Array.prototype.forEach.call(refs.favoritesPanel.querySelectorAll('[data-fav-sort]'), function (button) {
      var active = button.getAttribute('data-fav-sort') === sort;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      var arrow = button.querySelector('.shelf-sort-arrow');
      if (arrow) arrow.textContent = active && dir === 'asc' ? '↑' : '↓';
    });
    var ordered = filtered.slice().sort(function (a, b) {
      if (sort === 'type') {
        var rankA = sortKindRank(a);
        var rankB = sortKindRank(b);
        if (rankA !== rankB) return dir === 'asc' ? rankA - rankB : rankB - rankA;
      }
      var timeA = a.addedAt || 0;
      var timeB = b.addedAt || 0;
      return dir === 'desc' ? timeB - timeA : timeA - timeB;
    });
    var width = refs.favoritesList.clientWidth || refs.favoritesPanel.clientWidth || 1000;
    var gap = 36;
    var minWidth = 140;
    var cols = Math.max(2, Math.min(6, Math.floor((width + gap) / (minWidth + gap))));
    refs.favoritesList.style.setProperty('--fav-cols', String(cols));
    var pageSize = cols * 2;
    var totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    var page = Math.min(Math.max(1, state.favoritesPage || 1), totalPages);
    state.favoritesPage = page;
    var list = ordered.slice((page - 1) * pageSize, page * pageSize);
    if (refs.favoritesPager) {
      refs.favoritesPager.hidden = false;
      if (refs.favPage) refs.favPage.textContent = page + ' / ' + totalPages;
      if (refs.favPrev) refs.favPrev.disabled = page <= 1;
      if (refs.favNext) refs.favNext.disabled = page >= totalPages;
    }
    if (!list.length) {
      var empty = document.createElement('div');
      empty.className = 'shelf-favorites-empty';
      empty.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.8l2.5 5.1 5.6.8-4.1 4 1 5.6-5-2.7-5 2.7 1-5.6-4.1-4 5.6-.8z"/></svg>' +
        '<strong>' + (state.favorites.length ? '这个分类还没有收藏' : '还没有收藏') + '</strong>' +
        '<span>' + (state.favorites.length ? '切回「全部」看看其他收藏。' : '在文件右侧点「星标」，就能把它留在这里。') + '</span>';
      refs.favoritesList.appendChild(empty);
      return;
    }
    var buildTile = function (fav) {
      var tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'shelf-fav-book';
      tile.title = fav.root + ' / ' + fav.path;
      var kind = fav.kind === 'directory' ? 'folder' : kindOf({ kind: 'file', name: fav.name, ext: extensionOf(fav.name) });
      var cover = document.createElement('span');
      cover.className = 'shelf-fav-cover kind-' + kind;
      var icon = document.createElement('span');
      icon.className = 'shelf-fav-icon';
      icon.innerHTML = iconSvg(kind);
      var type = document.createElement('span');
      type.className = 'shelf-fav-cover-type';
      type.textContent = fav.kind === 'directory' ? 'FOLDER' : ((extensionOf(fav.name) || 'FILE').toUpperCase());
      var remove = document.createElement('span');
      remove.className = 'shelf-fav-remove';
      remove.setAttribute('role', 'button');
      remove.setAttribute('tabindex', '0');
      remove.setAttribute('aria-label', '取消收藏');
      remove.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.8l2.5 5.1 5.6.8-4.1 4 1 5.6-5-2.7-5 2.7 1-5.6-4.1-4 5.6-.8z"/></svg>';
      remove.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        removeFavorite(fav);
      });
      remove.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          removeFavorite(fav);
        }
      });
      cover.appendChild(icon);
      cover.appendChild(type);
      cover.appendChild(remove);
      var info = document.createElement('span');
      info.className = 'shelf-fav-info';
      var title = document.createElement('span');
      title.className = 'shelf-fav-title';
      title.textContent = fav.name;
      var time = document.createElement('span');
      time.className = 'shelf-fav-time';
      time.textContent = fav.addedAt ? '收藏于 ' + formatDate(fav.addedAt) : '收藏时间未知';
      var path = document.createElement('span');
      path.className = 'shelf-fav-path';
      path.textContent = fav.root + ' / ' + fav.path;
      info.appendChild(title);
      info.appendChild(time);
      info.appendChild(path);
      tile.appendChild(cover);
      tile.appendChild(info);
      tile.addEventListener('click', function () { openFavorite(fav); });
      return tile;
    };
    for (var offset = 0; offset < list.length; offset += cols) {
      var row = document.createElement('div');
      row.className = 'shelf-favorites-row';
      var plank = document.createElement('span');
      plank.className = 'shelf-plank';
      plank.setAttribute('aria-hidden', 'true');
      row.appendChild(plank);
      list.slice(offset, offset + cols).forEach(function (fav) {
        row.appendChild(buildTile(fav));
      });
      refs.favoritesList.appendChild(row);
    }
  }

  function openFavoritesPanel() {
    state.favoritesPage = 1;
    card.classList.add('is-fav-mode');
    root.classList.add('is-fav-mode');
    refs.favoritesPanel.hidden = false;
    renderFavoritesPanel();
    window.setTimeout(function () { if (refs.favoritesClose) refs.favoritesClose.focus(); }, 30);
  }

  function closeFavoritesPanel() {
    if (!refs.missing.hidden) closeFavoriteMissing();
    refs.favoritesPanel.hidden = true;
    card.classList.remove('is-fav-mode');
    root.classList.remove('is-fav-mode');
    if (refs.favoritesBtn) refs.favoritesBtn.focus({ preventScroll: true });
  }

  function showFavoriteMissing(fav) {
    state.missingFav = fav;
    refs.missingName.textContent = fav.name;
    refs.missingPath.textContent = fav.root + ' / ' + fav.path;
    refs.missing.hidden = false;
    window.setTimeout(function () { refs.missingCopy.focus({ preventScroll: true }); }, 30);
  }

  function closeFavoriteMissing() {
    state.missingFav = null;
    refs.missing.hidden = true;
  }

  function openFavorite(fav) {
    if (!fav) return;
    if (!state.path.length || state.rootName !== fav.root) {
      setStatus('请先打开根文件夹「' + fav.root + '」再使用这个收藏', 'warn');
      return;
    }
    var segments = String(fav.path || fav.name).split('/').filter(Boolean);
    if (!segments.length) return;
    var parents = fav.kind === 'directory' ? segments : segments.slice(0, -1);
    var fail = function () { showFavoriteMissing(fav); };
    var finish = function () {
      if (fav.kind === 'file') {
        var target = state.entries.filter(function (entry) {
          return entry.name === fav.name && entry.kind === 'file';
        })[0];
        if (!target) { showFavoriteMissing(fav); return; }
        selectEntry(target);
      }
      closeFavoritesPanel();
    };
    if (state.source === 'handle') {
      if (!state.rootHandle) { fail(); return; }
      state.path = [{ name: state.rootName, handle: state.rootHandle }];
      state.currentHandle = state.rootHandle;
      var step = function (base, index) {
        if (index >= parents.length) return Promise.resolve();
        return base.getDirectoryHandle(parents[index]).then(function (next) {
          state.path.push({ name: parents[index], handle: next });
          state.currentHandle = next;
          return step(next, index + 1);
        });
      };
      step(state.rootHandle, 0).then(function () { return loadCurrentDirectory(); }).then(finish).catch(fail);
      return;
    }
    var node = state.rootNode;
    state.path = [{ name: state.rootName, node: node }];
    state.currentNode = node;
    for (var i = 0; i < parents.length; i += 1) {
      var child = node && node.children ? node.children.get(parents[i]) : null;
      if (!child || child.kind !== 'directory') { fail(); return; }
      node = child;
      state.path.push({ name: parents[i], node: node });
      state.currentNode = node;
    }
    loadCurrentDirectory().then(finish).catch(fail);
  }

  function bindRenamePress(node, getMeta) {
    if (!node) return;
    var startX = 0;
    var startY = 0;
    var fired = false;

    var clear = function () {
      if (renameTimer) {
        window.clearTimeout(renameTimer);
        renameTimer = 0;
      }
    };

    node.addEventListener('pointerdown', function (event) {
      if (event.button && event.button !== 0) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      var meta = getMeta();
      if (!meta) return;
      startX = event.clientX;
      startY = event.clientY;
      fired = false;
      clear();
      renameTimer = window.setTimeout(function () {
        renameTimer = 0;
        fired = true;
        openRename(meta);
      }, 480);
    });

    node.addEventListener('pointermove', function (event) {
      if (!renameTimer) return;
      if (Math.abs(event.clientX - startX) > 10 || Math.abs(event.clientY - startY) > 10) clear();
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (name) {
      node.addEventListener(name, clear);
    });

    node.addEventListener('contextmenu', function (event) {
      event.preventDefault();
    });

    node.addEventListener('click', function (event) {
      if (fired) {
        fired = false;
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
  }

  function buildRecentChip(meta) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'shelf-recent-chip';
    button.setAttribute('aria-label', '最近路径：' + displayName(meta));
    button.title = displayName(meta) + (meta.source === 'input' ? ' · 需要重新选择' : '') + ' · 长按可改名';
    var icon = document.createElement('span');
    icon.className = 'shelf-recent-chip-icon';
    icon.innerHTML = iconSvg('folder');
    var line = document.createElement('span');
    line.className = 'shelf-recent-chip-line';
    var name = document.createElement('span');
    name.className = 'shelf-recent-chip-name';
    name.textContent = displayName(meta);
    var badge = document.createElement('span');
    badge.className = 'shelf-recent-chip-badge';
    badge.textContent = '只读';
    var time = document.createElement('span');
    time.className = 'shelf-recent-chip-time';
    time.textContent = formatDate(meta.scannedAt || meta.openedAt);
    line.appendChild(name);
    line.appendChild(badge);
    button.appendChild(icon);
    button.appendChild(line);
    button.appendChild(time);
    button.addEventListener('click', function () {
      openRecent(meta);
    });
    bindRenamePress(button, function () { return meta; });
    return button;
  }

  function openRename(meta) {
    if (!meta) return;
    renameTarget = meta;
    refs.renameSub.textContent = '当前文件夹：' + meta.name + '。只改变这里的显示名，不会改动文件夹本身。';
    refs.renameInput.value = displayName(meta);
    refs.renameReset.hidden = !meta.customName;
    refs.rename.hidden = false;
    window.setTimeout(function () {
      refs.renameInput.focus();
      refs.renameInput.select();
    }, 30);
  }

  function closeRename() {
    renameTarget = null;
    refs.rename.hidden = true;
  }

  function saveRename(reset) {
    if (!renameTarget) return;
    var meta = renameTarget;
    var original = String(meta.name || '');
    var value = reset ? '' : String(refs.renameInput.value || '').trim().slice(0, 40);
    if (!reset && value && value !== original) meta.customName = value;
    else delete meta.customName;
    storeSet(RECENT_KEY, state.recent).catch(function () {});
    closeRename();
    renderRecentStrip();
    updateSummary();
    setStatus(meta.customName ? '已重命名为「' + meta.customName + '」' : '已恢复原名「' + original + '」');
  }

  function renderRecentStrip() {
    if (!refs.recentLeft || !refs.recentRight) return;
    refs.recentLeft.textContent = '';
    refs.recentRight.textContent = '';
    if (!state.open) return;

    var capacity = getRecentCapacity();
    var half = Math.min(Math.floor((capacity - 1) / 2), 2);
    var offset = (state.path.length || state.pendingRecentMeta) ? 1 : 0;
    for (var left = half; left >= 1; left -= 1) {
      var leftIndex = offset + (left - 1) * 2;
      if (state.recent[leftIndex]) {
        refs.recentLeft.appendChild(buildRecentChip(state.recent[leftIndex]));
      }
    }
    for (var right = 1; right <= half; right += 1) {
      var rightIndex = offset + (right - 1) * 2 + 1;
      if (state.recent[rightIndex]) {
        refs.recentRight.appendChild(buildRecentChip(state.recent[rightIndex]));
      }
    }
  }

  function openRecent(meta) {
    if (!meta) return;
    state.pendingRecentMeta = meta;
    state.recent = [meta].concat(state.recent.filter(function (item) { return item.id !== meta.id; }));
    storeSet(RECENT_KEY, state.recent).catch(function () {});
    renderRecentStrip();
    updateSummary();
    if (meta.source !== 'handle') {
      setStatus('正在为「' + displayName(meta) + '」打开文件夹选择…');
      pickFolder();
      return;
    }
    var handle = state.recentHandles.get(meta.id);
    if (!handle) {
      setStatus('这个最近路径的授权已失效，正在重新选择…', 'warn');
      pickFolder();
      return;
    }
    setStatus('正在打开 ' + displayName(meta) + '…');
    pickReplacementHandle(handle, false).then(function () {
      if (state.pendingRecentMeta === meta) {
        state.pendingRecentMeta = null;
        restoreCurrentRecentOrder();
        updateSummary();
      }
    });
  }

  function loadDefaultMeta() {
    return storeGet(DEFAULT_KEY, null).then(function (meta) {
      if (!meta || typeof meta !== 'object' || !meta.name) {
        state.defaultMeta = null;
        state.defaultHandle = null;
        return;
      }
      state.defaultMeta = meta;
      state.defaultHandle = null;
      if (meta.source === 'handle') {
        idbGet('default').then(function (handle) {
          if (handle && handle.kind === 'directory') state.defaultHandle = handle;
        }).catch(function () {});
      }
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
      if (state.filter === 'all') return true;
      if (entry.kind === 'directory') return state.keepFolders;
      if (state.filter === 'mdhtml') {
        var kind = filterKind(entry);
        return kind === 'html' || kind === 'md';
      }
      return filterKind(entry) === state.filter;
    });
  }

  function defaultSortDir(key) {
    return key === 'name' || key === 'type' ? 'asc' : 'desc';
  }

  function sortEntries(entries) {
    var key = state.sortKey;
    var direction = key === 'none' ? 1 : (state.sortDir === 'asc' ? 1 : -1);
    return entries.slice().sort(function (a, b) {
      var groupA = a.kind === 'directory' ? 0 : 1;
      var groupB = b.kind === 'directory' ? 0 : 1;
      if (groupA !== groupB) return groupA - groupB;
      var result = 0;
      var nameCompare = function () {
        return a.name.localeCompare(b.name, 'zh-Hans-CN', { numeric: true, sensitivity: 'base' });
      };
      if (key === 'none' || key === 'name') {
        result = nameCompare();
      } else if (key === 'type') {
        result = typeLabel(a).localeCompare(typeLabel(b), 'zh-Hans-CN', { numeric: true }) || nameCompare();
      } else if (key === 'time') {
        result = (a.modified || 0) - (b.modified || 0) || nameCompare();
      } else if (key === 'size') {
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
    var pending = state.pendingRecentMeta;
    if (pending) {
      refs.folderName.textContent = displayName(pending);
      refs.folderPath.textContent = '正在打开 · ' + pending.name;
      refs.folderStats.textContent = '正在读取文件夹…';
      refs.defaultBadge.hidden = !(state.defaultMeta && state.defaultMeta.name === pending.name);
      refs.scanTime.textContent = '正在打开';
      refs.reauth.hidden = true;
      refs.restore.hidden = true;
      refs.summaryIcon.classList.remove('is-empty');
      return;
    }
    if (!hasFolder) {
      var fallback = state.defaultMeta;
      var emptyTitle = refs.empty.querySelector('strong');
      var emptyText = refs.empty.querySelector('p');
      if (emptyTitle) emptyTitle.textContent = fallback ? '默认路径已记录' : '还没有挂载文件夹';
      if (emptyText) {
        emptyText.textContent = fallback ?
          '「' + fallback.name + '」会在打开时自动恢复；也可以选择其他文件夹或直接选文件。' :
          '选择一个本地文件夹，里面可以包含 HTML、图片、文本和子文件夹。';
      }
      refs.folderName.textContent = fallback ? fallback.name : '尚未选择文件夹';
      refs.folderPath.textContent = fallback ?
        '默认路径 · 打开书架时自动恢复' :
        '选择一个本地文件夹，开始浏览 HTML、图片和文本。';
      refs.folderStats.textContent = fallback ?
        '默认路径已记录' :
        '尚未挂载';
      refs.defaultBadge.hidden = !fallback;
      refs.scanTime.textContent = fallback ? '未打开' : '未扫描';
      refs.reauth.hidden = true;
      refs.restore.hidden = !fallback;
      refs.summaryIcon.classList.toggle('is-empty', !fallback);
      refs.folderName.title = fallback ? '默认路径：' + fallback.name : '';
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
    var rootMeta = currentRecentMeta();
    refs.folderName.textContent = (rootMeta ? displayName(rootMeta) : state.rootName) || '本地文件夹';
    refs.folderName.title = '长按可改名';
    refs.folderPath.textContent = state.path.map(function (part) { return part.name; }).join(' / ');
    refs.folderStats.textContent = state.entries.length + ' 项 · ' + folders + ' 个文件夹 · ' +
      files + ' 个文件' + (files ? ' · ' + formatBytes(size) : '');
    refs.defaultBadge.hidden = !state.isDefault;
    refs.reauth.hidden = !state.needsReauth;
    refs.scanTime.textContent = state.needsReauth ? '等待授权' : (state.lastScan ? '扫描于 ' + formatTime(state.lastScan) : '未扫描');
    refs.restore.hidden = true;
    refs.summaryIcon.classList.remove('is-empty');
  }

  function updateToolbar() {
    var hasFolder = state.path.length > 0;
    var hasDefault = !hasFolder && !!state.defaultMeta;
    refs.defaultBtn.disabled = !hasFolder || state.isDefault || state.flatFiles;
    refs.defaultLabel.textContent = state.flatFiles ? '文件模式' :
      (state.isDefault ? '已设为默认' : (hasDefault ? '默认路径已记录' : '设为默认路径'));
    refs.defaultBtn.classList.toggle('is-default', !state.flatFiles && (state.isDefault || hasDefault));
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

  var SORT_ICONS = {
    none: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.2h10M11 5.7l2.5 2.5-2.5 2.5"/><path d="M20.5 15.8h-10M13 13.3l-2.5 2.5 2.5 2.5"/></svg>',
    asc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5.5M7.8 9.7 12 5.5l4.2 4.2"/></svg>',
    desc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v13.5M7.8 14.3 12 18.5l4.2-4.2"/></svg>'
  };

  function updateSortHeaders() {
    var columns = refs.listHead.querySelectorAll('.shelf-col');
    Array.prototype.forEach.call(columns, function (column) {
      var key = column.getAttribute('data-sort');
      var active = key === state.sortKey;
      column.classList.toggle('is-active', active);
      column.setAttribute('aria-sort', active ? (state.sortDir === 'asc' ? 'ascending' : 'descending') : 'none');
      var arrow = column.querySelector('.shelf-sort');
      if (arrow) arrow.innerHTML = active ? (state.sortDir === 'asc' ? SORT_ICONS.asc : SORT_ICONS.desc) : SORT_ICONS.none;
    });
  }

  function applyView() {
    refs.listPane.classList.toggle('is-grid', state.view === 'grid');
    refs.viewList.classList.toggle('is-active', state.view === 'list');
    refs.viewGrid.classList.toggle('is-active', state.view === 'grid');
    refs.viewList.setAttribute('aria-pressed', state.view === 'list' ? 'true' : 'false');
    refs.viewGrid.setAttribute('aria-pressed', state.view === 'grid' ? 'true' : 'false');
  }

  function renderFilter() {
    refs.filterLabel.textContent = FILTER_LABELS[state.filter] || '全部类型';
    refs.filter.classList.toggle('is-active', state.filter !== 'all');
    var options = refs.filterMenu.querySelectorAll('.shelf-filter-option[data-filter]');
    Array.prototype.forEach.call(options, function (button) {
      button.setAttribute('aria-checked', button.getAttribute('data-filter') === state.filter ? 'true' : 'false');
    });
    refs.keepFolders.setAttribute('aria-checked', state.keepFolders ? 'true' : 'false');
    refs.filter.setAttribute('aria-expanded', refs.filterMenu.hidden ? 'false' : 'true');
  }

  function closeFilterMenu() {
    refs.filterMenu.hidden = true;
    refs.filter.setAttribute('aria-expanded', 'false');
  }

  function toggleFilterMenu() {
    var willOpen = refs.filterMenu.hidden;
    if (willOpen) closeMenu();
    refs.filterMenu.hidden = !willOpen;
    renderFilter();
  }

  function setFilter(value) {
    if (FILTER_ORDER.indexOf(value) < 0) return;
    state.filter = value;
    renderFilter();
    renderRows();
    updateFooter();
    saveUi();
    closeFilterMenu();
    if (value === 'all') {
      setStatus('已显示全部类型');
    } else {
      setStatus('仅显示 ' + FILTER_LABELS[value] + (state.keepFolders ? ' · 文件夹保留' : ' · 文件夹隐藏'));
    }
  }

  function toggleKeepFolders() {
    state.keepFolders = !state.keepFolders;
    renderFilter();
    renderRows();
    updateFooter();
    saveUi();
    setStatus(state.keepFolders ? '筛选时保留文件夹' : '筛选时隐藏文件夹');
  }

  function updateFooter() {
    var hasFolder = state.path.length > 0;
    if (!hasFolder) {
      refs.count.textContent = '0 项';
      return;
    }
    if (state.query || state.filter !== 'all') {
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
    refs.breadcrumb.hidden = !hasFolder || state.path.length <= 1;
    refs.previewPane.hidden = !hasFolder;
    refs.previewEmpty.hidden = false;
    updateSummary();
    renderRecentStrip();
    updateToolbar();
    updateBreadcrumb();
    updateSortHeaders();
    applyView();
    renderFilter();
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

  function renderAuthNote() {
    refs.rows.textContent = '';
    var wrap = document.createElement('div');
    wrap.className = 'shelf-auth-note';
    var icon = document.createElement('div');
    icon.className = 'shelf-auth-icon';
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M8.2 10.4V8a3.8 3.8 0 0 1 7.6 0v2.4"/><rect x="5.4" y="10.4" width="13.2" height="9.2" rx="2.4"/>' +
      '<path d="M12 13.8v2.6"/></svg>';
    var title = document.createElement('strong');
    title.textContent = '需要重新授权「' + state.rootName + '」';
    var desc = document.createElement('p');
    desc.textContent = '系统收回了这个文件夹的读取权限。点下面的按钮会直接打开系统文件夹窗口，选中「' + state.rootName + '」即可恢复，不用重新扫描文件。';
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'shelf-btn primary';
    button.textContent = '重新授权并打开';
    button.addEventListener('click', reauthorizeFolder);
    var feedback = document.createElement('span');
    feedback.className = 'shelf-auth-status';
    feedback.hidden = true;
    var alt = document.createElement('button');
    alt.type = 'button';
    alt.className = 'shelf-auth-alt';
    alt.textContent = '改用普通文件夹选择';
    alt.addEventListener('click', function () {
      state.forceInputFallback = true;
      pickFolder();
    });
    wrap.appendChild(icon);
    wrap.appendChild(title);
    wrap.appendChild(desc);
    wrap.appendChild(button);
    wrap.appendChild(feedback);
    wrap.appendChild(alt);
    refs.rows.appendChild(wrap);
  }

  function renderFolderGroup(count) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'shelf-folder-group' + (state.foldersCollapsed ? ' is-collapsed' : '');
    button.setAttribute('aria-expanded', state.foldersCollapsed ? 'false' : 'true');
    button.setAttribute('aria-label', state.foldersCollapsed ? '展开文件夹' : '折叠文件夹');
    button.title = state.foldersCollapsed ? '展开文件夹' : '折叠文件夹';
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 9.5 12 14.5 17 9.5"/></svg>' +
      '<span>文件夹</span><span class="shelf-folder-group-count">' + count + '</span>';
    button.addEventListener('click', function () {
      state.foldersCollapsed = !state.foldersCollapsed;
      renderRows();
    });
    refs.rows.appendChild(button);
  }

  function renderRows() {
    revokeThumbUrls();
    refs.rows.textContent = '';
    if (state.loading) {
      renderRowNote('正在读取文件夹…', true);
      return;
    }
    if (state.needsReauth) {
      renderAuthNote();
      updateFooter();
      return;
    }
    if (!state.path.length) return;
    var all = sortEntries(visibleEntries());
    var folderCount = all.filter(function (entry) { return entry.kind === 'directory'; }).length;
    var list = state.foldersCollapsed ? all.filter(function (entry) { return entry.kind !== 'directory'; }) : all;
    state.filtered = list;
    if (!state.entries.length) {
      renderRowNote('这个文件夹是空的。');
      updateFooter();
      return;
    }
    if (!all.length) {
      var message = state.filter !== 'all' ? '没有匹配的 ' + FILTER_LABELS[state.filter] + ' 文件。' : '没有匹配的文件。';
      renderRowNote(message);
      updateFooter();
      return;
    }
    if (folderCount) renderFolderGroup(folderCount);
    if (!list.length) {
      renderRowNote('文件夹已折叠，点上方「文件夹」展开。');
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
    var isFav = !!favoriteForEntry(entry);
    var starCell = document.createElement('span');
    starCell.className = 'shelf-row-star-cell';
    var star = document.createElement('span');
    star.className = 'shelf-row-star' + (isFav ? ' is-fav' : '');
    star.setAttribute('role', 'button');
    star.setAttribute('tabindex', '0');
    star.setAttribute('aria-label', isFav ? '取消收藏' : '收藏');
    star.setAttribute('aria-pressed', isFav ? 'true' : 'false');
    star.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.8l2.5 5.1 5.6.8-4.1 4 1 5.6-5-2.7-5 2.7 1-5.6-4.1-4 5.6-.8z"/></svg>';
    star.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      toggleFavorite(entry);
    });
    star.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(entry);
      }
    });
    starCell.appendChild(star);

    row.appendChild(nameCell);
    row.appendChild(type);
    row.appendChild(time);
    row.appendChild(starCell);
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

  function applyPreviewFocus() {
    if (!refs.main) return;
    refs.main.classList.toggle('is-preview-focus', !!state.previewExpanded);
  }

  function selectEntry(entry) {
    if (!entry || entry.kind === 'directory') return;
    state.selected = entry;
    state.previewSource = false;
    var kind = kindOf(entry);
    state.previewExpanded = ['html', 'md', 'image', 'audio', 'video', 'text', 'code'].indexOf(kind) >= 0;
    applyPreviewFocus();
    syncSelection();
    renderPreview(entry);
  }

  function clearPreview() {
    state.previewToken += 1;
    state.previewExpanded = false;
    applyPreviewFocus();
    revokePreviewUrl();
    refs.previewName.textContent = '未选择文件';
    refs.previewActions.textContent = '';
    refs.previewHost.hidden = true;
    refs.previewEmpty.hidden = false;
  }

  function copyTextToClipboard(text) {
    var fallback = function () {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try { document.execCommand('copy'); } catch (error) {}
      area.remove();
    };
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).catch(fallback);
    } else {
      fallback();
    }
  }

  var previewToastTimer = 0;

  function showPreviewToast(text) {
    var body = refs.previewBody;
    if (!body) return;
    var node = body.querySelector('.shelf-preview-toast');
    if (!node) {
      node = document.createElement('div');
      node.className = 'shelf-preview-toast';
      body.appendChild(node);
    }
    node.textContent = text;
    node.classList.add('is-visible');
    window.clearTimeout(previewToastTimer);
    previewToastTimer = window.setTimeout(function () {
      node.classList.remove('is-visible');
    }, 1800);
  }

  function toggleMarkdownImageLink(el) {
    var src = el.getAttribute('data-md-src') || '';
    if (!src) return;
    var next = el.nextElementSibling;
    if (next && next.classList && next.classList.contains('md-image-link')) {
      next.remove();
    } else {
      var link = document.createElement('span');
      link.className = 'md-image-link';
      link.textContent = src;
      link.title = src;
      if (el.parentNode) el.parentNode.insertBefore(link, el.nextSibling);
    }
    copyTextToClipboard(src);
    setStatus('图片链接已复制到剪贴板', 'good');
    showPreviewToast('图片链接已复制');
  }

  function ensurePreviewShadow() {
    if (previewShadow) return previewShadow;
    previewShadow = refs.previewHost.attachShadow({ mode: 'open' });
    previewShadow.addEventListener('click', function (event) {
      var image = event.target && event.target.closest ? event.target.closest('[data-md-src]') : null;
      if (image) {
        event.preventDefault();
        event.stopPropagation();
        toggleMarkdownImageLink(image);
        return;
      }
      var path = event.composedPath ? event.composedPath() : [];
      for (var i = 0; i < path.length; i += 1) {
        var node = path[i];
        if (node && (node.tagName === 'A' || node.tagName === 'AREA')) {
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
    if (label === '在新标签页打开') button.classList.add('is-newtab');
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
    if (kind === 'md') {
      renderMarkdownPreview(entry, token);
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
    addPreviewAction('下载原文件', false, function () { downloadFile(entry.file, entry.name); });
    addPreviewAction('下载打包页', false, function () { downloadPackedEntry(entry); });

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
      var body = sanitizeForPreview(result.html, result.missing);
      var missingText = result.missing.length ?
        ' · 缺失 ' + result.missing.length + '：' + result.missing.slice(0, 2).map(function (path) {
          return shortPath(path, 48);
        }).join(' · ') : '';
      var external = result.external || [];
      var externalText = external.length ?
        ' · 在线资源 ' + external.length + '：' + external.slice(0, 2).map(function (path) {
          return shortPath(path, 42);
        }).join(' · ') + '（未内联）' : '';
      var note = '静态预览 · 脚本未执行' + (result.inlined ? ' · 内联 ' + result.inlined + ' 个资源' : '') +
        missingText + externalText + (result.missing.length || result.html.length > 1200000 ?
          ' · 打开被拦截时用“下载打包页”' : '');
      previewFrame(
        '<div class="frame">' +
          '<div class="preview-note">' + escapeHtml(note) + '</div>' +
          '<div class="paper">' + body + '</div>' +
        '</div>'
      );
      var statusExtra = result.missing.length ?
        ' · 缺失 ' + shortPath(result.missing[0], 60) :
        (external.length ? ' · 在线资源 ' + external.length + ' 个未内联' : '');
      setStatus('预览 · ' + entry.name + statusExtra, result.missing.length ? 'warn' : 'good');
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

  var mdImageCounter = 0;

  function inlineMarkdown(text) {
    var codes = [];
    var breaks = [];
    var s = String(text || '').replace(/<br\s*\/?>/gi, function () {
      breaks.push('<br>');
      return '\u0001' + (breaks.length - 1) + '\u0001';
    });
    s = escapeHtml(s).replace(/`([^`]+)`/g, function (_, code) {
      codes.push('<code>' + code + '</code>');
      return '\u0000' + (codes.length - 1) + '\u0000';
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    s = s.replace(/&lt;((?:https?:|mailto:)[^&\s]+)&gt;/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (_, alt, url) {
      var clean = url.trim().replace(/^&lt;|&gt;$/g, '').trim();
      var title = '';
      var titleMatch = /^(\S+)\s+(?:&quot;|&#39;|["'])(.*?)(?:&quot;|&#39;|["'])$/.exec(clean);
      if (titleMatch) {
        clean = titleMatch[1];
        title = titleMatch[2];
      }
      mdImageCounter += 1;
      var label = mdImageCounter < 10 ? '0' + mdImageCounter : String(mdImageCounter);
      if (/^https?:\/\//i.test(clean)) {
        return '<img src="' + clean.replace(/"/g, '&quot;') + '" alt="' + alt + '"' +
          (title ? ' title="' + title.replace(/"/g, '&quot;') + '"' : '') +
          ' data-md-src="' + clean.replace(/"/g, '&quot;') + '" data-fallback="&lt;image ' + label + '&gt;" loading="lazy">';
      }
      return '<span class="md-image" data-md-src="' + clean.replace(/"/g, '&quot;') + '">&lt;image ' + label + '&gt;</span>';
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, url) {
      if (!/^(https?:|mailto:|#)/i.test(url)) return label;
      return '<a href="' + url.replace(/"/g, '&quot;') + '" target="_blank" rel="noopener">' + label + '</a>';
    });
    s = s.replace(/\u0001(\d+)\u0001/g, function (_, index) {
      return breaks[Number(index)] || '';
    });
    return s.replace(/\u0000(\d+)\u0000/g, function (_, index) {
      return codes[Number(index)] || '';
    });
  }

  function splitTableRow(line) {
    return String(line || '').trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (cell) {
      return cell.trim();
    });
  }

  function renderMarkdown(source) {
    mdImageCounter = 0;
    source = String(source || '');
    var fences = [];
    source = source.replace(/```[\s\S]*?```/g, function (block) {
      fences.push(block);
      return '\u0004' + (fences.length - 1) + '\u0004';
    });
    var references = {};
    source = source.replace(/^\[([^\]]+)\]:\s*(\S+)(?:\s+["'(].*)?$/gm, function (_, id, url) {
      references[id.trim().toLowerCase()] = url.trim();
      return '';
    });
    source = source.replace(/!\[([^\]]*)\]\[([^\]]*)\]/g, function (_, alt, id) {
      var key = (id || alt).trim().toLowerCase();
      return references[key] ? '![' + alt + '](' + references[key] + ')' : '';
    });
    source = source.replace(/<img\b[^>]*>/gi, function (tag) {
      var srcMatch = /src\s*=\s*["']([^"']+)["']/i.exec(tag);
      if (!srcMatch) return '';
      var altMatch = /alt\s*=\s*["']([^"']*)["']/i.exec(tag);
      return '![' + (altMatch ? altMatch[1] : '') + '](' + srcMatch[1] + ')';
    });
    source = source.replace(/imageUrl=([^\s<]+)/g, function (_, encoded) {
      var url = encoded;
      try { url = decodeURIComponent(encoded); } catch (error) {}
      return '![image](' + url + ')';
    });
    source = source.replace(/^(\s*)(https?:\/\/[^\s]+\.(?:png|jpe?g|gif|webp|svg|bmp|avif)(?:\?\S*)?)\s*$/gim, '$1![]($2)');
    source = source.replace(/(!\[[^\]]*\]\([^)]*\))\s*[?？]\s*/g, '$1\n');
    source = source.replace(/\s*[?？]\s*(?=!\[[^\]]*\]\()/g, '\n');
    source = source.replace(/^\s*[?？]\s*$/gm, '');
    source = source.replace(/\u0004(\d+)\u0004/g, function (_, index) {
      return fences[Number(index)] || '';
    });
    var lines = source.replace(/\r\n?/g, '\n').split('\n');
    var out = [];
    var paragraph = [];
    var quote = [];
    var listType = '';
    var listItems = [];

    function flushParagraph() {
      if (!paragraph.length) return;
      out.push('<p>' + inlineMarkdown(paragraph.join('<br>')) + '</p>');
      paragraph = [];
    }
    function flushQuote() {
      if (!quote.length) return;
      out.push('<blockquote>' + inlineMarkdown(quote.join('<br>')) + '</blockquote>');
      quote = [];
    }
    function flushList() {
      if (!listItems.length) return;
      out.push('<' + listType + '>' + listItems.map(function (item) {
        return '<li' + (item.checked !== null ? ' class="md-task"' : '') + '>' +
          (item.checked !== null ? '<span class="md-check">' + (item.checked ? '☑' : '☐') + '</span> ' : '') +
          inlineMarkdown(item.text) + '</li>';
      }).join('') + '</' + listType + '>');
      listItems = [];
      listType = '';
    }
    function flushAll() {
      flushParagraph();
      flushQuote();
      flushList();
    }

    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      if (/^```/.test(line)) {
        flushAll();
        var lang = line.slice(3).trim().replace(/[^a-zA-Z0-9_+-]/g, '');
        var code = [];
        i += 1;
        while (i < lines.length && !/^```/.test(lines[i])) {
          code.push(lines[i]);
          i += 1;
        }
        if (i < lines.length) i += 1;
        out.push('<pre><code' + (lang ? ' class="language-' + lang + '"' : '') + '>' + escapeHtml(code.join('\n')) + '</code></pre>');
        continue;
      }
      if (!line.trim()) {
        flushAll();
        i += 1;
        continue;
      }
      var heading = /^(#{1,6})\s+(.*)$/.exec(line);
      if (heading) {
        flushAll();
        var level = heading[1].length;
        out.push('<h' + level + '>' + inlineMarkdown(heading[2]) + '</h' + level + '>');
        i += 1;
        continue;
      }
      if (i + 1 < lines.length && /^=+\s*$/.test(lines[i + 1]) && !/^\s*([-*+]|\d+\.)\s/.test(line) && line.indexOf('|') < 0) {
        flushAll();
        out.push('<h1>' + inlineMarkdown(line) + '</h1>');
        i += 2;
        continue;
      }
      if (i + 1 < lines.length && /^-{2,}\s*$/.test(lines[i + 1]) && !/^\s*([-*+]|\d+\.)\s/.test(line) && line.indexOf('|') < 0) {
        flushAll();
        out.push('<h2>' + inlineMarkdown(line) + '</h2>');
        i += 2;
        continue;
      }
      if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
        flushAll();
        out.push('<hr>');
        i += 1;
        continue;
      }
      var quoteLine = /^>\s?(.*)$/.exec(line);
      if (quoteLine) {
        flushParagraph();
        flushList();
        quote.push(quoteLine[1]);
        i += 1;
        continue;
      }
      if (line.indexOf('|') >= 0 && i + 1 < lines.length &&
          /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1]) && lines[i + 1].indexOf('-') >= 0) {
        flushAll();
        var header = splitTableRow(line);
        var aligns = splitTableRow(lines[i + 1]).map(function (cell) {
          var left = cell.charAt(0) === ':';
          var right = cell.charAt(cell.length - 1) === ':';
          return left && right ? 'center' : (right ? 'right' : (left ? 'left' : ''));
        });
        i += 2;
        var rows = [];
        while (i < lines.length && lines[i].indexOf('|') >= 0 && lines[i].trim()) {
          rows.push(splitTableRow(lines[i]));
          i += 1;
        }
        var cellHtml = function (tag, cell, index) {
          var align = aligns[index] ? ' style="text-align:' + aligns[index] + '"' : '';
          return '<' + tag + align + '>' + inlineMarkdown(cell) + '</' + tag + '>';
        };
        out.push('<table><thead><tr>' + header.map(function (cell, index) {
          return cellHtml('th', cell, index);
        }).join('') + '</tr></thead><tbody>' + rows.map(function (row) {
          return '<tr>' + row.map(function (cell, index) { return cellHtml('td', cell, index); }).join('') + '</tr>';
        }).join('') + '</tbody></table>');
        continue;
      }
      var unordered = /^\s*[-*+]\s+(.*)$/.exec(line);
      var ordered = /^\s*\d+\.\s+(.*)$/.exec(line);
      if (unordered || ordered) {
        flushParagraph();
        flushQuote();
        var nextType = unordered ? 'ul' : 'ol';
        if (listType && listType !== nextType) flushList();
        listType = nextType;
        var itemText = (unordered || ordered)[1];
        var task = /^\[([ xX])\]\s+(.*)$/.exec(itemText);
        var checked = null;
        if (task) {
          checked = task[1].toLowerCase() === 'x';
          itemText = task[2];
        }
        listItems.push({ text: itemText, checked: checked });
        i += 1;
        continue;
      }
      flushQuote();
      flushList();
      paragraph.push(line);
      i += 1;
    }
    flushAll();
    return out.join('\n');
  }

  function renderMarkdownPreview(entry, token) {
    if (!entry.file) {
      renderGenericPreview(entry, token, 'md');
      return;
    }
    previewLoading(entry.name);
    readSliceText(entry.file, TEXT_LIMIT).then(function (text) {
      if (token !== state.previewToken) return;
      previewFrame(
        '<div class="frame"><div class="paper md">' + renderMarkdown(text) + '</div></div>',
        '.md{font-size:14px;line-height:1.8}.md h1{font-size:24px;margin:0 0 .7em}.md h2{font-size:19px;margin:1.5em 0 .6em}.md h3{font-size:16px;margin:1.2em 0 .5em}.md p{margin:.75em 0}.md ul,.md ol{margin:.7em 0;padding-left:1.5em}.md li{margin:.3em 0}.md code{background:#f1eee6;padding:.12em .35em;border-radius:4px;font:12.5px/1.5 var(--mono)}.md pre{background:#f6f3ea;padding:14px 16px;border-radius:10px;overflow:auto}.md pre code{background:none;padding:0}.md table{width:100%;margin:1.2em 0;border-collapse:collapse}.md th,.md td{border:1px solid #e5e0d4;padding:6px 10px;text-align:left}.md th{background:#f6f2e7}.md hr{border:0;border-top:1px solid #e5e0d4;margin:1.6em 0}.md blockquote{margin:1.2em 0;padding:.3em 0 .3em 1em;border-left:3px solid #d9b66d;color:#555}.md a{color:#1d6d99;text-decoration:none}.md a:hover{text-decoration:underline}.md .md-image{display:inline-block;margin:8px;padding:1px 7px;border:1px solid rgba(91,155,213,.38);border-radius:7px;color:#4d8fc7;background:rgba(91,155,213,.08);font:10.5px/1.5 var(--mono)}.md img{margin:8px}.md .md-image-link{display:inline-block;max-width:100%;margin:8px;padding:2px 8px;border:1px solid rgba(91,155,213,.3);border-radius:7px;background:rgba(91,155,213,.08);color:#3d7397;font:10.5px/1.5 var(--mono);vertical-align:middle;overflow-wrap:anywhere}.md li.md-task{list-style:none;margin-left:-1.1em}.md .md-check{color:#8a6118;font-weight:700;margin-right:4px}'
      );
      if (previewShadow) {
        Array.prototype.forEach.call(previewShadow.querySelectorAll('.md img'), function (img, index) {
          img.addEventListener('error', function () {
            if (img.getAttribute('data-failed')) return;
            img.setAttribute('data-failed', '1');
            var span = document.createElement('span');
            span.className = 'md-image';
            span.setAttribute('data-md-src', img.getAttribute('data-md-src') || img.getAttribute('src') || '');
            span.textContent = img.getAttribute('data-fallback') || '<image ' + (index < 9 ? '0' : '') + (index + 1) + '>';
            img.replaceWith(span);
          });
        });
      }
      setStatus('预览 Markdown · ' + entry.name);
    }).catch(function (error) {
      if (token !== state.previewToken) return;
      previewFrame('<div class="meta-card"><strong>读取失败</strong><p>' + escapeHtml(errorText(error)) + '</p></div>');
    });
    addPreviewAction('下载', false, function () { downloadFile(entry.file, entry.name); });
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

  function openBlobUrl(blob, name) {
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    try {
      anchor.click();
      setStatus('已请求在新标签页打开 · ' + name, 'good');
    } catch (error) {
      URL.revokeObjectURL(url);
      setStatus('打开失败：' + errorText(error) + '；请用“下载”保存', 'warn');
      return false;
    }
    window.setTimeout(function () { anchor.remove(); }, 1000);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 120000);
    return true;
  }

  function openDataEntry(entry, mime) {
    if (!entry.file) return;
    setStatus('正在准备 ' + entry.name + '…');
    var blob;
    try {
      blob = (!mime || entry.file.type === mime) ? entry.file : entry.file.slice(0, entry.file.size, mime);
    } catch (error) {
      blob = entry.file;
    }
    openBlobUrl(blob, entry.name);
  }

  function openHtmlEntry(entry) {
    if (!entry || !entry.file) return;
    setStatus('正在打包 ' + entry.name + '…');
    var settled = false;
    var timer = window.setTimeout(function () {
      if (settled) return;
      settled = true;
      setStatus('打包超过 10 秒，已取消；请用“下载打包页”保存 ' + entry.name, 'warn');
    }, 10000);
    packHtmlEntry(entry).then(function (result) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      var blob = new Blob([result.html], { type: 'text/html;charset=utf-8' });
      var external = result.external || [];
      var externalNote = external.length ? ' · 在线资源 ' + external.length + ' 个' : '';
      var missing = result.missing.length ? ' · 缺失 ' + shortPath(result.missing[0], 60) : '';
      if (blob.size > 12 * 1024 * 1024) {
        setStatus('打包后 ' + formatBytes(blob.size) + '，超过打开上限；请用“下载打包页”' + missing + externalNote, 'warn');
        return;
      }
      if (!openBlobUrl(blob, entry.name + ' · 打包页')) return;
      setStatus('已交给 Aira 打开 · 打包后 ' + formatBytes(blob.size) + ' · 内联 ' + result.inlined +
        (result.missing.length ? ' · 缺失 ' + shortPath(result.missing[0], 60) : externalNote),
        result.missing.length ? 'warn' : 'good');
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
      lower.indexOf('file:') === 0 ||
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
    var source = String(css || '').replace(/url\(\s*(['"]?)(file:[^'")]+)\1\s*\)/gi, function (_full, _quote, ref) {
      ctx.missing.push(ref);
      return 'url("")';
    });
    if (/@import/i.test(source)) {
      ctx.warnings.push('CSS 里有 @import，已移除');
      source = source.replace(/@import[^;]+;?/gi, '');
    }
    if (!source || source.toLowerCase().indexOf('url(') < 0) return Promise.resolve(source);
    var re = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
    var refs = [];
    var match;
    while ((match = re.exec(source)) !== null) {
      var ref = String(match[2] || '').trim();
      if (!ref) continue;
      var lower = ref.toLowerCase();
      if (lower.indexOf('data:') === 0 || lower.charAt(0) === '#' || refs.indexOf(ref) >= 0) {
        continue;
      }
      if (isRemoteRef(ref)) {
        addExternal(ctx, ref);
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

  function sanitizeForPreview(html, missing) {
    var missingSet = {};
    (missing || []).forEach(function (ref) {
      missingSet[String(ref || '').trim()] = true;
    });
    var doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    doc.querySelectorAll('script, svg script, iframe, object, embed, base, dialog, frame, frameset, fencedframe, link[rel="stylesheet"], meta[http-equiv], input[type="file"], template[shadowrootmode]').forEach(function (node) {
      node.remove();
    });
    doc.querySelectorAll('*').forEach(function (node) {
      Array.prototype.slice.call(node.attributes).forEach(function (attr) {
        var name = attr.name.toLowerCase();
        var value = String(attr.value || '').trim().toLowerCase();
        if (name.indexOf('on') === 0 ||
          name === 'popover' ||
          name === 'popovertarget' ||
          name === 'popovertargetaction' ||
          name === 'autofocus' ||
          name === 'autoplay' ||
          name === 'contenteditable' ||
          value.indexOf('java' + 'script:') === 0) {
          node.removeAttribute(attr.name);
          return;
        }
        if ((name === 'src' || name === 'href' || name === 'poster' || name === 'xlink:href') &&
          value.indexOf('file:') === 0) {
          node.removeAttribute(attr.name);
          return;
        }
        if (name === 'srcset' && value.indexOf('file:') >= 0) {
          node.removeAttribute(attr.name);
          return;
        }
        if (name === 'style' && value.indexOf('file:') >= 0) {
          node.setAttribute('style', String(attr.value || '').replace(/url\(\s*(['"]?)file:[^)]*\)/gi, 'url("")'));
        }
      });
    });
    doc.querySelectorAll('[src], [href], [poster]').forEach(function (node) {
      ['src', 'href', 'poster'].forEach(function (attr) {
        var value = String(node.getAttribute(attr) || '').trim();
        if (!value || !missingSet[value]) return;
        node.removeAttribute(attr);
        if (attr !== 'href' && /^(IMG|SOURCE|TRACK|VIDEO|AUDIO)$/i.test(node.tagName)) {
          node.remove();
        }
      });
    });
    var styles = Array.prototype.map.call(doc.querySelectorAll('style'), function (node) {
      return node.textContent || '';
    }).join('\n');
    if (styles) {
      styles = styles
        .replace(/@import[^;]+;?/gi, '')
        .replace(/url\(\s*(['"]?)file:[^)]*\)/gi, 'url("")')
        .replace(/:host-context\([^)]*\)/gi, '.paper')
        .replace(/:host(?:\([^)]*\))?/gi, '.paper')
        .replace(/::slotted\([^)]*\)/gi, '.paper')
        .replace(/(^|})\s*body\b/gi, '$1 .paper');
    }
    return (styles ? '<style>' + styles + '</style>' : '') + (doc.body ? doc.body.innerHTML : '');
  }

  function packHtmlEntry(entry) {
    if (!entry || !entry.file) return Promise.reject(new Error('文件不可用'));
    var cacheKey = state.source + '|' + entry.path;
    if (state.packedCache.has(cacheKey)) return Promise.resolve(state.packedCache.get(cacheKey));
    var baseSegments = state.path.slice(1).map(function (part) { return part.name; });
    var ctx = { inlined: 0, missing: [], external: [], warnings: [] };

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
          if (isRemoteRef(ref)) {
            addExternal(ctx, ref);
            return;
          }
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
            if (isRemoteRef(ref)) {
              addExternal(ctx, ref);
              return;
            }
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
            if (lower.indexOf('data:') === 0 || lower.indexOf('blob:') === 0) return;
            if (isRemoteRef(ref)) {
              addExternal(ctx, ref);
              return;
            }
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
        doc.querySelectorAll('[src], [href], [poster], [srcset]').forEach(function (node) {
          ['src', 'href', 'poster', 'srcset'].forEach(function (attr) {
            var value = String(node.getAttribute(attr) || '').trim();
            if (!value) return;
            var lower = value.toLowerCase();
            var blocked = attr === 'srcset' ? lower.indexOf('file:') >= 0 : lower.indexOf('file:') === 0;
            if (blocked) {
              node.removeAttribute(attr);
              ctx.missing.push(value);
            }
          });
        });
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
          external: ctx.external,
          warnings: ctx.warnings
        };
        state.packedCache.set(cacheKey, result);
        return result;
      });
    });
  }

  function defaultStartIn() {
    var pending = state.pendingRecentMeta;
    if (pending && pending.name && WELL_KNOWN_DIRS[String(pending.name).toLowerCase()]) {
      return WELL_KNOWN_DIRS[String(pending.name).toLowerCase()];
    }
    if (state.defaultHandle) return state.defaultHandle;
    var meta = state.defaultMeta;
    if (!meta || !meta.name) return null;
    return WELL_KNOWN_DIRS[String(meta.name).toLowerCase()] || null;
  }

  function pickFolder() {
    if (state.forceInputFallback || typeof window.showDirectoryPicker !== 'function') {
      setStatus('正在打开文件管理器…');
      refs.folderInput.click();
      return;
    }
    setStatus('正在打开目录选择…');
    var options = { mode: 'read' };
    var startIn = defaultStartIn();
    if (startIn) {
      options.id = 'lucent-local-shelf';
      options.startIn = startIn;
    }
    var picker;
    try {
      picker = window.showDirectoryPicker(options);
    } catch (error) {
      picker = Promise.reject(error);
    }
    picker.then(function (handle) {
      var restored = state.restorePickPending;
      state.restorePickPending = false;
      return mountHandle(handle, restored);
    }).catch(function (error) {
      state.restorePickPending = false;
      if (state.pendingRecentMeta) {
        state.pendingRecentMeta = null;
        restoreCurrentRecentOrder();
        updateSummary();
      }
      if (error && error.name === 'AbortError') {
        setStatus('已取消选择', 'warn');
        return;
      }
      setStatus('系统目录接口不可用：' + errorText(error) + '；文件可用“打开文件”直接选择', 'warn');
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
    state.pendingRecentMeta = null;
    state.isDefault = !!restored;
    state.flatFiles = false;
    state.needsReauth = false;
    state.reauthHandle = null;
    state.pendingDefaultHandle = null;
    state.handleCache.clear();
    state.packedCache.clear();
    state.query = '';
    refs.search.value = '';
    refs.searchClear.hidden = true;
    clearPreview();
    rememberRecent(handle, handle.name, 'handle');
    updateAll();
    return loadCurrentDirectory();
  }

  function mountInputFiles(files, folderName, restored, flat, autoOpen) {
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
    state.pendingRecentMeta = null;
    state.isDefault = !!restored;
    state.flatFiles = !!flat;
    state.needsReauth = false;
    state.reauthHandle = null;
    state.pendingDefaultHandle = null;
    state.fileMap = fileMap;
    state.handleCache.clear();
    state.packedCache.clear();
    state.query = '';
    refs.search.value = '';
    refs.searchClear.hidden = true;
    clearPreview();
    if (!flat) rememberRecent(null, rootName, 'input');
    updateAll();
    if (files.length > 3000) {
      setStatus('已加载 ' + files.length + ' 个文件；建议下次选择更小的项目文件夹', 'warn');
    }
    return loadCurrentDirectory().then(function () {
      if (files.length > 3000) {
        setStatus('已加载 ' + files.length + ' 个文件；当前只显示文件夹内容，建议选择更小的项目文件夹', 'warn');
      }
      if (autoOpen) {
        var first = state.entries.filter(function (entry) {
          return entry.kind === 'file' && (filterKind(entry) === 'html' || filterKind(entry) === 'md');
        })[0] || state.entries.filter(function (entry) { return entry.kind === 'file'; })[0];
        if (first) selectEntry(first);
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

  function loadCurrentDirectory(attempt) {
    attempt = attempt || 0;
    if (!state.path.length) {
      updateAll();
      return Promise.resolve();
    }
    state.loadToken += 1;
    var token = state.loadToken;
    state.loading = true;
    state.foldersCollapsed = false;
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
      if (state.path.length === 1) {
        var rootMeta = currentRecentMeta();
        if (rootMeta) {
          rootMeta.scannedAt = state.lastScan;
          storeSet(RECENT_KEY, state.recent).catch(function () {});
        }
      }
      state.loading = false;
      state.needsReauth = false;
      state.reauthHandle = null;
      updateAll();
      setStatus('已挂载 ' + state.rootName + ' · ' + entries.length + ' 项', 'good');
    }).catch(function (error) {
      if (token !== state.loadToken) return;
      if (state.source === 'handle' && !attempt) {
        state.loading = true;
        renderRowNote('正在重新连接文件夹…', true);
        window.setTimeout(function () {
          if (token === state.loadToken) loadCurrentDirectory(1);
        }, 350);
        return;
      }
      state.loading = false;
      state.entries = [];
      if (state.source === 'handle') {
        var permissionIssue = error && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
        state.needsReauth = true;
        state.reauthHandle = state.path[0] ? state.path[0].handle : state.rootHandle;
        updateAll();
        setStatus((permissionIssue ? '需要重新授权 ' : '文件夹连接已失效，点「重新授权并打开」恢复 ') + state.rootName, 'warn');
      } else {
        updateAll();
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
    if (state.needsReauth) {
      reauthorizeFolder();
      return;
    }
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

  function pickFiles() {
    closeMenu();
    setStatus('正在打开系统文件选择…');
    refs.fileInput.click();
  }

  function onFileInputChange() {
    var files = Array.prototype.slice.call(refs.fileInput.files || []);
    refs.fileInput.value = '';
    if (!files.length) {
      setStatus('没有收到文件', 'warn');
      return;
    }
    mountInputFiles(files, '已选文件', false, true, true);
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
    if (state.sortKey !== key) {
      state.sortKey = key;
      state.sortDir = defaultSortDir(key);
    } else if (state.sortDir === defaultSortDir(key)) {
      state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortKey = 'none';
      state.sortDir = 'asc';
    }
    updateSortHeaders();
    renderRows();
    saveUi();
    if (state.sortKey === 'none') {
      setStatus('已取消排序 · 默认名称顺序');
      return;
    }
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
    if (state.flatFiles) {
      setStatus('多文件模式不能设为默认路径；请用“选择新路径”挂载文件夹', 'warn');
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

  function adoptHandle(next, previous, restored) {
    if (!next) return Promise.resolve();
    var meta = currentRecentMeta();
    if (!meta) {
      var targetName = previous && previous.name ? previous.name : next.name;
      for (var i = 0; i < state.recent.length; i += 1) {
        if (state.recent[i].source === 'handle' && state.recent[i].name === targetName) {
          meta = state.recent[i];
          break;
        }
      }
    }
    if (meta && (!previous || next.name === meta.name)) {
      state.recentHandles.set(meta.id, next);
      idbSet(RECENT_IDB_PREFIX + meta.id, next).catch(function () {});
      storeSet(RECENT_KEY, state.recent).catch(function () {});
    }
    var keepsDefault = restored || state.isDefault ||
      !!(state.defaultMeta && state.defaultMeta.source === 'handle' && state.defaultMeta.name === next.name);
    if (keepsDefault) {
      idbSet('default', next).catch(function () {});
      state.defaultHandle = next;
      state.defaultMeta = state.defaultMeta || { name: next.name, itemCount: 0 };
      state.defaultMeta.name = next.name;
      state.defaultMeta.source = 'handle';
      state.defaultMeta.savedAt = Date.now();
      storeSet(DEFAULT_KEY, state.defaultMeta).catch(function () {});
    }
    return mountHandle(next, keepsDefault);
  }

  function setAuthFeedback(text, tone) {
    var note = refs.rows.querySelector('.shelf-auth-status');
    if (note) {
      note.textContent = text;
      note.hidden = !text;
      note.classList.toggle('is-warn', tone === 'warn');
    }
    if (text) setStatus(text, tone);
  }

  function setReauthBusy(busy) {
    refs.reauth.disabled = busy;
    refs.reauth.textContent = busy ? '正在打开系统窗口…' : '重新授权';
    var button = refs.rows.querySelector('.shelf-auth-note .shelf-btn.primary');
    if (button) {
      button.disabled = busy;
      button.textContent = busy ? '正在打开系统窗口…' : '重新授权并打开';
    }
  }

  function pickReplacementHandle(previous, restored, fallbackInput) {
    var name = previous && previous.name ? previous.name :
      (state.defaultMeta && state.defaultMeta.name ? state.defaultMeta.name : '这个文件夹');
    if (typeof window.showDirectoryPicker !== 'function') {
      state.restorePickPending = !!restored;
      setAuthFeedback('正在打开文件管理器，请选择「' + name + '」…');
      refs.folderInput.click();
      return Promise.resolve();
    }
    setReauthBusy(true);
    setAuthFeedback('正在打开系统文件夹窗口，请选择「' + name + '」…');
    var attempts = [];
    var startIn = previous || null;
    if (!startIn && state.defaultMeta && state.defaultMeta.name) {
      startIn = WELL_KNOWN_DIRS[String(state.defaultMeta.name).toLowerCase()] || null;
    }
    if (startIn) attempts.push({ id: 'lucent-local-shelf', mode: 'read', startIn: startIn });
    attempts.push({ mode: 'read' });
    attempts.push(null);
    var picker = null;
    var lastError = null;
    for (var i = 0; i < attempts.length; i += 1) {
      try {
        picker = attempts[i] ? window.showDirectoryPicker(attempts[i]) : window.showDirectoryPicker();
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!picker) {
      setReauthBusy(false);
      if (fallbackInput) {
        state.forceInputFallback = true;
        state.restorePickPending = true;
        setAuthFeedback('无法打开系统目录窗口，改用网页文件选择…', 'warn');
        refs.folderInput.click();
        return Promise.resolve();
      }
      setAuthFeedback('无法打开系统文件夹窗口：' + errorText(lastError), 'warn');
      return Promise.resolve();
    }
    return Promise.resolve(picker).then(function (next) {
      setReauthBusy(false);
      return adoptHandle(next, previous, restored);
    }).catch(function (error) {
      setReauthBusy(false);
      if (error && error.name === 'AbortError') {
        setAuthFeedback('已取消选择', 'warn');
        return;
      }
      if (fallbackInput) {
        state.forceInputFallback = true;
        state.restorePickPending = true;
        setAuthFeedback('目录接口不可用，改用网页文件选择…', 'warn');
        refs.folderInput.click();
        return;
      }
      setAuthFeedback('重新授权失败：' + errorText(error) + '；可点“改用普通文件夹选择”', 'warn');
    });
  }

  function reauthorizeFolder() {
    var handle = state.reauthHandle || (state.path[0] && state.path[0].handle);
    if (!handle) {
      pickFolder();
      return;
    }
    pickReplacementHandle(handle, state.isDefault);
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
    state.pendingRecentMeta = null;
    state.restorePickPending = true;
    pickFolder();
  }

  function toggleMenu() {
    var willOpen = refs.menu.hidden;
    if (willOpen) closeFilterMenu();
    refs.menu.hidden = !willOpen;
    refs.more.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    refs.menuClear.disabled = !state.defaultMeta;
    refs.menuHidden.setAttribute('aria-checked', state.showHidden ? 'true' : 'false');
  }

  function closeMenu() {
    refs.menu.hidden = true;
    refs.more.setAttribute('aria-expanded', 'false');
  }

  function enterImmersive() {
    if (document.fullscreenElement || typeof document.documentElement.requestFullscreen !== 'function') return;
    try {
      var task = document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      if (task && typeof task.catch === 'function') task.catch(function () {});
    } catch (error) {}
  }

  function exitImmersive() {
    if (!document.fullscreenElement || typeof document.exitFullscreen !== 'function') return;
    try {
      var task = document.exitFullscreen();
      if (task && typeof task.catch === 'function') task.catch(function () {});
    } catch (error) {}
  }

  function openShelf() {
    if (state.open) return;
    state.open = true;
    enterImmersive();
    state.forceInputFallback = false;
    root.hidden = false;
    document.documentElement.classList.add('shelf-open');
    document.body.classList.add('shelf-open');
    var launcher = $('btnShelf');
    if (launcher) launcher.setAttribute('aria-expanded', 'true');
    closeMenu();
    closeFilterMenu();
    updateAll();
    setStatus('只读模式 · 文件不会离开这台设备');
    if (state.path.length && state.selected) renderPreview(state.selected);
    card.focus({ preventScroll: true });
  }

  function closeShelf() {
    if (!state.open) return;
    if (!refs.favoritesPanel.hidden) closeFavoritesPanel();
    if (!refs.rename.hidden) closeRename();
    state.open = false;
    exitImmersive();
    state.pendingRecentMeta = null;
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
      if (!refs.missing.hidden) {
        closeFavoriteMissing();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (!refs.favoritesPanel.hidden) {
        closeFavoritesPanel();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (!refs.rename.hidden) {
        closeRename();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (!refs.filterMenu.hidden) {
        closeFilterMenu();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
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
    refs.menuFiles.addEventListener('click', pickFiles);
    refs.menuClear.addEventListener('click', clearDefaultPath);

    refs.renameSave.addEventListener('click', function () { saveRename(false); });
    refs.renameReset.addEventListener('click', function () { saveRename(true); });
    refs.renameCancel.addEventListener('click', closeRename);
    refs.rename.addEventListener('click', function (event) {
      if (event.target === refs.rename) closeRename();
    });
    refs.renameInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        saveRename(false);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRename();
      }
    });
    bindRenamePress(refs.folderName, currentRecentMeta);
    bindRenamePress(refs.summaryIcon, currentRecentMeta);

    refs.pick.addEventListener('click', pickFolder);
    refs.emptyPick.addEventListener('click', pickFolder);
    refs.emptyFiles.addEventListener('click', pickFiles);
    refs.openFiles.addEventListener('click', pickFiles);
    refs.restore.addEventListener('click', restoreDefaultFromGesture);
    refs.favoritesBtn.addEventListener('click', openFavoritesPanel);
    refs.favoritesClose.addEventListener('click', closeFavoritesPanel);
    refs.favoritesBack.addEventListener('click', closeFavoritesPanel);
    Array.prototype.forEach.call(refs.favoritesPanel.querySelectorAll('[data-fav-filter]'), function (button) {
      button.addEventListener('click', function () {
        state.favoritesFilter = button.getAttribute('data-fav-filter') || 'all';
        state.favoritesPage = 1;
        renderFavoritesPanel();
      });
    });
    Array.prototype.forEach.call(refs.favoritesPanel.querySelectorAll('[data-fav-sort]'), function (button) {
      button.addEventListener('click', function () {
        var kind = button.getAttribute('data-fav-sort') || 'time';
        if (state.favoritesSort === kind) {
          state.favoritesSortDir = state.favoritesSortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.favoritesSort = kind;
          state.favoritesSortDir = kind === 'time' ? 'desc' : 'asc';
        }
        state.favoritesPage = 1;
        renderFavoritesPanel();
      });
    });
    refs.favPrev.addEventListener('click', function () {
      if (state.favoritesPage <= 1) return;
      state.favoritesPage -= 1;
      renderFavoritesPanel();
    });
    refs.favNext.addEventListener('click', function () {
      state.favoritesPage += 1;
      renderFavoritesPanel();
    });
    refs.missingClose.addEventListener('click', closeFavoriteMissing);
    refs.missing.addEventListener('click', function (event) {
      if (event.target === refs.missing) closeFavoriteMissing();
    });
    refs.missingCopy.addEventListener('click', function () {
      if (!state.missingFav) return;
      copyTextToClipboard(state.missingFav.name);
      setStatus('原文件名已复制 · ' + state.missingFav.name, 'good');
      refs.missingCopy.textContent = '已复制';
      window.setTimeout(function () { refs.missingCopy.textContent = '复制原文件名'; }, 1500);
    });
    refs.missingRemove.addEventListener('click', function () {
      var fav = state.missingFav;
      if (!fav) return;
      closeFavoriteMissing();
      removeFavorite(fav);
    });
    refs.favoritesPanel.addEventListener('click', function (event) {
      if (event.target === refs.favoritesPanel) closeFavoritesPanel();
    });
    var lastSummaryPick = 0;
    var openSummaryPicker = function (event) {
      if (event && event.target && event.target.closest && event.target.closest('button')) return;
      if (event) event.stopPropagation();
      var now = Date.now();
      if (now - lastSummaryPick < 350) return;
      lastSummaryPick = now;
      pickFolder();
    };
    refs.summaryIcon.setAttribute('role', 'button');
    refs.summaryIcon.setAttribute('tabindex', '0');
    refs.summaryIcon.setAttribute('aria-label', '重新选择文件夹');
    refs.summary.addEventListener('click', openSummaryPicker);
    refs.summary.addEventListener('dblclick', openSummaryPicker);
    refs.summaryIcon.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openSummaryPicker(event);
      }
    });
    var emptyIcon = refs.empty.querySelector('.shelf-empty-icon');
    if (emptyIcon) {
      emptyIcon.setAttribute('role', 'button');
      emptyIcon.setAttribute('tabindex', '0');
      emptyIcon.setAttribute('aria-label', '打开文件夹选择');
      emptyIcon.addEventListener('click', openSummaryPicker);
      emptyIcon.addEventListener('dblclick', openSummaryPicker);
      emptyIcon.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openSummaryPicker(event);
        }
      });
    }

    refs.reauth.addEventListener('click', reauthorizeFolder);
    refs.defaultBtn.addEventListener('click', saveDefaultPath);
    refs.refresh.addEventListener('click', refreshFolder);
    refs.search.addEventListener('input', onSearchInput);
    refs.searchClear.addEventListener('click', clearSearch);
    refs.listHead.addEventListener('click', onHeaderClick);
    refs.up.addEventListener('click', goUp);
    refs.viewList.addEventListener('click', function () { setView('list'); });
    refs.viewGrid.addEventListener('click', function () { setView('grid'); });
    refs.filter.addEventListener('click', function (event) {
      event.stopPropagation();
      toggleFilterMenu();
    });
    refs.filterMenu.addEventListener('click', function (event) {
      event.stopPropagation();
    });
    var filterOptions = refs.filterMenu.querySelectorAll('.shelf-filter-option[data-filter]');
    Array.prototype.forEach.call(filterOptions, function (button) {
      button.addEventListener('click', function () {
        setFilter(button.getAttribute('data-filter'));
      });
    });
    refs.keepFolders.addEventListener('click', toggleKeepFolders);
    refs.folderInput.addEventListener('change', onFolderInputChange);
    refs.fileInput.addEventListener('change', onFileInputChange);

    card.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if (!refs.missing.hidden) {
          closeFavoriteMissing();
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (!refs.favoritesPanel.hidden) {
          closeFavoritesPanel();
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (!refs.rename.hidden) {
          closeRename();
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (!refs.filterMenu.hidden) {
          closeFilterMenu();
          event.preventDefault();
          event.stopPropagation();
          return;
        }
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
      if (!refs.menu.hidden && !refs.menu.contains(event.target) && !refs.more.contains(event.target)) closeMenu();
      if (!refs.filterMenu.hidden && !refs.filterMenu.contains(event.target) && !refs.filter.contains(event.target)) closeFilterMenu();
      event.stopPropagation();
    });
    card.addEventListener('click', function (event) {
      event.stopPropagation();
    });

    document.addEventListener('keydown', onGlobalKeydown, true);
    document.addEventListener('pointerdown', function (event) {
      if (!state.open) return;
      if (!refs.menu.hidden && !refs.menu.contains(event.target) && !refs.more.contains(event.target)) closeMenu();
      if (!refs.filterMenu.hidden && !refs.filterMenu.contains(event.target) && !refs.filter.contains(event.target)) closeFilterMenu();
    }, true);

    var favoritesResizeTimer = 0;
    window.addEventListener('resize', function () {
      if (refs.favoritesPanel.hidden) return;
      if (favoritesResizeTimer) window.clearTimeout(favoritesResizeTimer);
      favoritesResizeTimer = window.setTimeout(function () {
        favoritesResizeTimer = 0;
        renderFavoritesPanel();
      }, 160);
    });

    var recentResizeTimer = 0;
    window.addEventListener('resize', function () {
      if (!state.open) return;
      if (recentResizeTimer) window.clearTimeout(recentResizeTimer);
      recentResizeTimer = window.setTimeout(function () {
        recentResizeTimer = 0;
        renderRecentStrip();
      }, 150);
    });
  }

  bindEvents();
  loadUi();
  loadRecent();
  loadFavorites();
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
