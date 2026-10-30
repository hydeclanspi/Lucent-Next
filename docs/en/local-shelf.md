# The local shelf · finding a page, opening a page

**First find the page, then hand it to the browser. Finding takes a favourite or a pasted path; opening, inside Aira, has three gates: packing, the host and length. Markdown takes one step more: it is set as a page first.**

[中文](../local-shelf.md) · [Back to README](../../README.en.md)

---

The shelf previews an HTML page in place: statically, with scripts and embedded frames stripped (see [Architecture · the local shelf](architecture.md#the-local-shelf)). To see the whole page — scripts running, yellow fields to fill in, printing to PDF — you tap 在新标签页打开, open in a new tab. §1–§8 cover that action: how a file travels from the shelf into a new tab, and why 6.0.1 changed the way it travels. §9–§11 cover the step before it, from 6.0.2: getting back to a page from a favourite, and pasting a path into the search field to go straight to it. §12–§14 cover 6.0.4: Markdown opening in a new tab too, with the pictures it carries from the web.

## 1. Three paths

| Where | Page | Handed to | Address |
|---|---|---|---|
| Aira | up to about 1.43 MB once packed | a new tab opened by Aira | `data:text/html;charset=utf-8;base64,…` |
| Aira | larger, but fits once gzipped | the same | a page that unpacks itself (§5) |
| Aira | still too large compressed | nothing opens; the status line points to 下载打包页, download the packed page | — |
| A desktop browser (the web edition) | up to 12 MB once packed | the browser's own new tab | `blob:` |

Images and PDFs take the same road: inside Aira a `data:` address for files up to about 1.43 MB, and a prompt to 下载, download, beyond that; in a desktop browser, still `blob:`. Markdown is first set as an HTML page (§12), then follows the table.

## 2. Packing

The shelf reads only the folder you mounted, so the page's relative paths are settled before it leaves ([`packHtmlSource`](../../src/assets/local-shelf.js#L3384-L3548); a page set from Markdown goes through it too):

- Local stylesheets become inline `<style>`; the `url()` assets inside them are inlined up to 4 MB each. Local scripts, images and media become `data:` resources, up to 8 MB each.
- Resources starting with `http`, `https` or `//` stay as they are and are counted as 在线资源, online resources: web fonts and libraries on a CDN load over the network once the page opens.
- What cannot be found is listed as missing; `<base>`, refresh redirects and embedded frames are removed; `srcset` is not inlined.
- A page is packed once and cached, for the preview and for opening alike.

Packing that runs past 10 s is cancelled, with a pointer to 下载打包页.

## 3. The host's rule

Inside Aira, Lucent is an imported ZIP homepage. Every new window the homepage asks for — a `target="_blank"` link, `window.open` — is taken over by Aira: the page's own window is refused, and the target address goes to Aira's `openUrl` ([`handleWindowNewEvent`](https://github.com/mason173/Aira-browser/blob/5593ec02aa4fb7c12606f44651948ac1c46a06bb/AiraBrowser/entry/src/main/ets/core/customhome/CustomHomepageRuntimeCoordinator.ets#L865-L876)). `openUrl` accepts five kinds of address ([L953-L971](https://github.com/mason173/Aira-browser/blob/5593ec02aa4fb7c12606f44651948ac1c46a06bb/AiraBrowser/entry/src/main/ets/core/customhome/CustomHomepageRuntimeCoordinator.ets#L953-L971)):

| Address | Result |
|---|---|
| `http`, `https`, `file`, `data`, `about` | a new tab, loaded by Aira itself |
| `aira:` | one of Aira's bridge actions; `AiraHome.openUrl(url)` first becomes `aira://open?url=…`, and what it carries comes back to this table |
| anything else, `blob:` included | one line: **暂不支持从主页打开此链接** — opening this link from the homepage is not supported |

From 5.7.7 to 5.9.7, the shelf opened a `blob:` address through a standard new-tab link. The link reached Aira, but `blob:` is not in the table, so all it earned was that line. The status line said 已交给 Aira 打开, handed to Aira, because the link really had gone through; the refusal came one step later. Online fonts in the page had nothing to do with it.

## 4. Aira receives a `data:` address

From 6.0.1, inside Aira (detected by the `window.AiraHome` that Aira injects), the shelf encodes the packed page as base64 and hands over a `data:` address through the same standard new-tab link ([`openPackedEntry`](../../src/assets/local-shelf.js#L3108-L3154), [`airaHtmlUrl`](../../src/assets/local-shelf.js#L3050-L3065)).

- **It passes the host.** `data` is in the table. Aira opens a tab and loads the address with `controller.loadUrl` ([`BrowserWebLoadCoordinator`](https://github.com/mason173/Aira-browser/blob/5593ec02aa4fb7c12606f44651948ac1c46a06bb/AiraBrowser/entry/src/main/ets/core/browser/BrowserWebLoadCoordinator.ets#L288)): a load the browser starts. Chromium blocks only the top-level `data:` navigations a page starts on its own, not this kind.
- **Why base64.** Base64 is always 4/3 of the original. Percent-encoding is about 1.5× for an English page and about 3× for a Chinese one — three bytes per character, three characters per byte. A 25.4 KB English proposal is 33.9 KB in base64 and 37.6 KB percent-encoded.
- **The same link.** 5.9.7's one-line refusal is itself proof that this link carries an address all the way to Aira's `openUrl`; 6.0.1 changes only the kind of address.

## 5. The 2 MiB ceiling, and a page that unpacks itself

Chromium refuses any address longer than 2 MiB (2,097,152 characters) and aborts the load. Measured in Chromium 153:

| Page | `data:` address | Load |
|---|---|---|
| 1,530 KB | 1.99 MB | fine |
| 1,560 KB | 2.03 MB | `ERR_ABORTED` |

The shelf sets its limit at 2,000,000 characters (`DATA_URL_LIMIT`) to keep a margin; in page terms, anything up to about 1.43 MB once packed opens directly.

A larger page is first gzipped with `CompressionStream` and carried inside a very small page ([`inflatingPageUrl`](../../src/assets/local-shelf.js#L3033-L3048)):

```html
<script type="application/octet-stream" id="lucent-packed">H4sIAAAA…</script>
<script>
  // atob → DecompressionStream('gzip') → document.open(); document.write(the page); document.close();
</script>
```

- The data comes first and the script after it, so the data is in place when the script runs.
- The wrapper is percent-encoded; base64's characters are already safe inside a `data:` address, so the payload goes in as it is and does not grow again.
- `document.write` writes the whole page back: its doctype, styles and scripts as before, with `DOMContentLoaded` and `load` firing as usual.
- Pages that are mostly text usually shrink to between a fifth and a twelfth: a 3.63 MB long document becomes an address of 299 KB. Images are already compressed and barely shrink, so a page full of inlined images may still not fit.
- If unpacking fails, the page says why and sends you back to 下载打包页.

## 6. What changes once it is open

- **No local storage.** A `data:` page has an opaque origin, so `localStorage`, `sessionStorage`, IndexedDB and cookies are not available; a page that keeps its state in them loses that part.
- **The address bar shows a long `data:` address.**
- **Relative links go nowhere.** A link to another page in the same folder cannot find it once open — as it already was with `blob:`.
- **Online resources still load.** Web fonts and CDN resources load as usual when there is a network; Google Fonts serves them to any origin.

## 7. What the status line says

| Case | Status line |
|---|---|
| Opened directly | 已交给 Aira 打开 · 打包后 25.4 KB · 内联 0 · 在线资源 1 个 |
| Opened compressed | 已交给 Aira 打开 · 打包后 3.63 MB · 内联 0 · 在线资源 1 个 · 压缩后 299.1 KB |
| Too large even compressed | 打包后 4.00 MB，压缩后仍超过 Aira 从主页打开的上限；请用“下载打包页” |
| An image or PDF too large | big.pdf 有 2.15 MB，超过 Aira 从主页打开的上限（约 1.4 MB）；请用“下载” |
| Packing timed out | 打包超过 10 秒，已取消；请用“下载打包页”保存 … |
| A desktop browser | 已请求在新标签页打开 · 打包后 … |

When a page has missing local assets, or is larger than about 1.5 MB once packed, the small print at the top of the preview adds 打开被拦截时用“下载打包页”: if opening is blocked, download the packed page.

## 8. How it was checked

Aira's homepage host was simulated in Chromium 153: the full 6.0.1 homepage package loaded, `AiraHome` injected, the new window's target taken from the DevTools Protocol's `Page.windowOpen` (the moment ArkWeb raises `onWindowNew`), judged against the table in §3, and an accepted address loaded by the host in a new tab.

| File | 5.9.7 | 6.0.1 |
|---|---|---|
| A 25.4 KB English proposal (one online font stylesheet, one inline script) | `blob:` → 暂不支持从主页打开此链接 | `data:`, 33.9 KB; title and all three pages intact, and typing into a yellow field lets its script mark it filled |
| A 3.63 MB long document | as left | 299 KB compressed; all 40,016 paragraphs present, `DOMContentLoaded` and `load` fired, scripts ran |
| A 4.00 MB page that does not compress | as left | not opened; points to 下载打包页 |
| A 0.10 MB PNG | as left | the `data:` address decodes to the original byte for byte; the image is 300 × 200 |
| A 0.08 MB PDF | as left | the `data:` address decodes to the original byte for byte |
| A 2.15 MB PDF | as left | not opened; points to 下载 |

The same script run on a page without `AiraHome`: still `blob:`, and pages and images open as before.

**Not covered.** Opening after a fresh import of 6.0.1 on the MatePad; whether ArkWeb displays a PDF given as a `data:` address (headless Chromium has no PDF viewer, so only the bytes were checked).

## 9. Back to a page from a favourite

A favourite keeps four things: the root folder's name, the path below it, the file's name and its kind (`{ root, path, name, kind }`). Access belongs to a folder handle, not to a name: after Aira is reopened, the handle kept in IndexedDB has to be granted again before it can be read.

| Case | Before 6.0.2 | 6.0.2 |
|---|---|---|
| The root folder is mounted | Walk the path to the file and select it | the same |
| The root was read this session and its handle still reads | One status line, 请先打开根文件夹…, hidden behind the favourites: it looked as if nothing happened | The shelf switches to that root quietly and walks to the file |
| The handle needs a grant (after reopening Aira, say) | as above | A card, 授权「root」后打开, names the root folder and the full path; 授权并打开 opens the system folder window at that root, and once it is chosen the shelf walks to the file, selects it and puts the favourites away |
| An Aira that keeps folder grants (`AiraHome.localFolders`) | restored quietly | the same; if that fails, the row above |

- **A folder above it works too.** The shelf looks inside the chosen folder for a child of the root's name and mounts that ([`pickedRoot`](../../src/assets/local-shelf.js#L1207-L1211)).
- **The wrong folder, or none.** The card stays open and says which folder was chosen and which one is needed, or 已取消选择.
- **Without `showDirectoryPicker`**, the web folder picker is used, and the favourite opens once the folder is mounted.
- **The card shows on the surface in view:** inside the favourites when they are open, on the shelf card otherwise ([`presentFavoriteAuth`](../../src/assets/local-shelf.js#L1183-L1188)).
- **Walking the path** ([`revealRelative`](../../src/assets/local-shelf.js#L1061-L1116)) commits only when every folder on the way exists. When the file is found and the current search or filter would hide it, the search is cleared and the filter set to 全部类型 before it is selected and scrolled into view. A path that breaks halfway still brings up the 文件已移动或重命名 card.

## 10. Pasting a path

The search field now reads 搜索当前文件夹 / 粘贴路径, search this folder / paste a path, one size smaller (11 px). When what is pasted is a path, it is no longer a filter: the list below opens that place. A path typed and confirmed with Enter does the same. Some keyboards paste from their suggestion bar without a paste event, so inserting eight or more characters at once that look like a path counts as a paste ([`onSearchPaste`](../../src/assets/local-shelf.js#L1470-L1476), [`onSearchKeydown`](../../src/assets/local-shelf.js#L1478-L1483), [`onSearchInput`](../../src/assets/local-shelf.js#L3939-L3950)).

**What counts as a path** ([`looksLikePath`](../../src/assets/local-shelf.js#L1289-L1296)): anything starting with `file:`; or text with a `/` or `\` that has at least two parts or starts with `/`, `\` or `~`. A single word, or a file name with spaces, still filters.

**How it is split** ([`pathSegments`](../../src/assets/local-shelf.js#L1302-L1322)): a `file://` link gives its path, decoded, HarmonyOS's `file://docs/storage/Users/currentUser/Documents/…` included; quotes and angle brackets round it are dropped; escapes such as `%20` are decoded; backslashes count as slashes; `.` is skipped and `..` steps back.

**Where it leads** ([`locatePastedPath`](../../src/assets/local-shelf.js#L1353-L1407)):

| Path | Result |
|---|---|
| contains the mounted root's name | walk down from its last occurrence |
| relative (not starting with `/`, `~`, a drive letter or `file:`) | relative to the current folder first, then to the root |
| contains another known root (the default, a recent folder, or a favourite's root) | switch to it quietly if it still reads this session; otherwise the grant card, for that root or any folder above it |
| contains no known folder | 授权它所在的文件夹: choose any folder on the path, and the shelf walks down from it ([`authorizePastedPath`](../../src/assets/local-shelf.js#L1424-L1468)) |

- A last part that looks like a file name (an extension of one to eight characters) is tried as a file first, otherwise as a folder; then the other way round.
- A file is selected in its folder, with the search cleared and the filter widened if needed; a folder is entered.
- Not found: the list stops at the nearest folder on the path that exists, and the status line says 没有找到 …，已停在最近的一层.
- The search field is emptied afterwards; a file found this way can be starred on the spot.

## 11. How these were checked

In Chromium 153, a real folder tree was built in OPFS, the browser's private file system — `Documents / For Cube- Workspace / 26 Q3 C.V. 工程 / LSF 2027 Partner Programme / v0.1` — the system folder window replaced by a stand-in that returns a given folder handle, and "needs a grant after reopening" simulated by `queryPermission` answering `prompt`. The full 6.0.2 homepage package was loaded.

| Case | Result |
|---|---|
| A HarmonyOS-style, percent-encoded `file://` link to an HTML page | the list opens v0.1, the file is selected and previewed, the search field is empty |
| A quoted absolute path to a folder | that folder opens |
| A path relative to the current folder | v0.1 opens, the Markdown file selected |
| A Windows backslash path to a PDF (the filter at its default, MD + HTML) | the filter moves to 全部类型 and the PDF is selected |
| A file that does not exist | the list stops at the nearest folder that does, and says so |
| An ordinary filter word | filters as before |
| A path typed and confirmed with Enter | found; the search field is empty |
| A favourite whose root still reads this session | no card; the favourite opens and the favourites close |
| A favourite whose root needs a grant | the card names the root and the full path; a wrong folder is pointed out and the card stays; choosing Documents above it finds the root and opens the favourite; the system window starts at the root |
| A pasted path under a known root that needs a grant | the card; after the grant the shelf switches root and selects the file |
| A pasted path under an unknown root | 授权它所在的文件夹 |
| The breadcrumb | the current crumb's highlight stands 11 px from the slash before it (1418 × 945) |

6.0.1's opening checks in §8 (direct, compressed, an image) were run again on the 6.0.2 package, with the same results.

**Not covered.** ArkWeb's real system folder window on the MatePad: whether `startIn` lands on the root exactly, and the real state of a grant after reopening; and whether a keyboard's suggestion-bar paste raises a paste event.

## 12. Markdown opens in a new tab too

A browser does not set Markdown. Handed straight to a new tab in Chromium 153, a Markdown file looks the same as `text/markdown`, `text/x-markdown` or `text/plain`: the `#`, the table's pipes and the `**bold**` go into a `<pre>` as they are. So from 6.0.4 a Markdown file's preview has 在新标签页打开 too (the main button, at the right as for HTML), and the shelf sets the file as a page before handing it over ([`openMarkdownEntry`](../../src/assets/local-shelf.js#L3098-L3104)).

- **The same renderer.** It is the preview's ([`renderMarkdown`](../../src/assets/local-shelf.js#L2582-L2591)), so headings, lists and task lists, tables with their alignment, code blocks, quotes, links and images match the preview. The page has a reading sheet of its own: text at most 840 px wide, light or dark with the system, black on white with no footer when printed, the file name at the foot; the tab's title is the first top-level heading, or the file name ([`markdownPageHtml`](../../src/assets/local-shelf.js#L2833-L2842)).
- **Local images come along.** In a page, images with relative paths stay `<img>` and the packer of §2 inlines them; one that cannot be found becomes the preview's `<image 02>` mark ([`markMissingImages`](../../src/assets/local-shelf.js#L2845-L2861)). The preview itself still shows local images as marks.
- **Links inside the document land.** Headings carry ids — lower case, punctuation dropped, spaces as hyphens, a repeated heading given `-1`, `-2` — so a link such as `[§四](#四可读性)` finds its heading. A page opened from a `data:` or `blob:` address ignores `#` links in Chromium, which takes them for a new navigation, so the page carries a small script that scrolls instead ([`MD_PAGE_SCRIPT`](../../src/assets/local-shelf.js#L2811-L2825)).
- **Raw HTML in the file is shown as text and never runs.**
- **The path is HTML's.** `openMarkdownEntry` and `openHtmlEntry` share [`openPackedEntry`](../../src/assets/local-shelf.js#L3108-L3154): a `data:` address inside Aira, gzipped and unpacking itself when it does not fit (§5); `blob:` in a desktop browser. The status line says 排版, set, where HTML says 打包, packed, and the fallback is 下载.
- **Up to 8 MB** ([`MD_OPEN_LIMIT`](../../src/assets/local-shelf.js#L169)).

| Case | Status line |
|---|---|
| Opened directly | 已交给 Aira 打开 · 排版后 149.1 KB · 内联 1 · 缺失 img/missing.png |
| Opened compressed | 已交给 Aira 打开 · 排版后 2.72 MB · 内联 0 · 压缩后 247.1 KB |
| Over 8 MB | huge.md 有 9.00 MB，超过排版上限（8 MB）；请用“下载” |

## 13. Pictures from the web

In a clipped article, the pictures are mostly addresses on the web. Before 6.0.4 three things kept them from showing:

1. **Underscores.** Every WeChat image address has them (`mmbiz_jpg/…/640?wx_fmt=jpeg`). Italics were handled before images, so `_jpg/…?wx_` was read as italics and an `<em>` landed inside the address; the image server received `mmbiz%3Cem%3Ejpg/…`. Link and image addresses are now set aside whole before emphasis, balanced parentheses allowed; images are set before emphasis too, so alt text keeps its underscores; and, as in CommonMark, an underscore inside a word opens no emphasis ([`inlineMarkdown`](../../src/assets/local-shelf.js#L2467-L2549)).
2. **Cubox's proxy.** Cubox exports an image as its own proxy: `https://cubox.pro/c/filters:no_upscale()?imageUrl=<the original, encoded>&valid=false`. The old `imageUrl=` rewrite split that one image into two broken ones and a stray `)`. The original address is used now, with the proxy kept as a fallback ([`proxiedImageUrl`](../../src/assets/local-shelf.js#L2557-L2563)).
3. **The referrer.** WeChat's image server answers a foreign Referer with a placeholder, 此图片来自微信公众平台，未经允许不可引用 — this picture is from the WeChat platform and may not be used without permission. A `data:` page sends no Referer; the preview, carrying the homepage's address, and a desktop `blob:` page do. Remote images now carry `referrerpolicy="no-referrer"`, and the set page a `no-referrer` meta as well.

An image that fails to load tries its fallback (Cubox's proxy), and then becomes a mark such as `<image 07>`, in the preview and in the tab alike. An `&amp;` left in an address becomes `&`.

**What cannot be done.** These pictures are still addresses on the web, so reading needs a network. The shelf cannot take them into the page: homepage scripts may not go online (Aira's import rules, see [VERIFICATION](../VERIFICATION.md)), and a browser does not let a page read the pixels of another site's image.

## 14. How these were checked

The full 6.0.4 homepage package was loaded in Chromium 153 over a folder in OPFS:

- `storyboard.md`: a table, a task list, code, a quote, a local image, an image that does not exist, a link inside the document, a repeated heading and a raw `<script>`;
- `long.md`, 2.72 MB;
- `huge.md`, 9 MB;
- an HTML page with a local image.

Each was opened in the simulated Aira host (as in §8) and in an ordinary desktop browser. Pictures from the web were answered by two stand-in servers: WeChat's image server under its hotlink rule, the original with no Referer and the placeholder for a foreign one, and a 404 for an address carrying `FAIL404`; and Cubox's proxy, which always served the original.

| Case | Result |
|---|---|
| `storyboard.md`, Aira | `data:`, 198.8 KB; one table, three tasks, every heading with an id and the repeated one with `-1`; the local image inlined at 300 × 200 and the missing one shown as `<image 02>`; the `<script>` shown as text, the page's own script the only one; tapping `§四` scrolls to its heading |
| `long.md`, Aira | 247.1 KB compressed, unpacks itself, all 10,045 sections present |
| `huge.md` | not set; the status line points to 下载 |
| The same three, desktop browser | `blob:`, with the same results |
| HTML | packed to 142.6 KB, one asset inlined, as before |
| Pictures and links from the web: a WeChat address, a Cubox export, an address with `&amp;`, a failed original with a proxy, links and an autolink with underscores, a linked image, an image with a title, a failed image with no fallback | 6.0.4's first build: `<em>` inside the addresses, the placeholder in the preview under the homepage's Referer, and Cubox images split in two with a `)`. Now: the preview, the `data:` page and the `blob:` page send no Referer and all receive the originals; the failed original falls back to Cubox's proxy; the one with no fallback becomes `<image 07>`; `原文_link` and `_斜体_` each keep their meaning |

The checks of §8 and §11 were run again on the 6.0.4 package, with the same results.

**Not covered.** WeChat's real image server and Cubox's real proxy (out of the test machine's reach); opening on the MatePad.

## Source

| Where | What it does |
|---|---|
| [`DATA_URL_LIMIT`](../../src/assets/local-shelf.js#L168) | 2,000,000 characters |
| [`MD_OPEN_LIMIT`](../../src/assets/local-shelf.js#L169) | The most Markdown that is set as a page, 8 MB |
| [`openBlobUrl`](../../src/assets/local-shelf.js#L2969-L2988) | Desktop browsers: a `blob:` address through a new-tab link |
| [`inAiraHome`](../../src/assets/local-shelf.js#L2994-L2996) | Inside Aira or not, by `window.AiraHome` |
| [`clickNewTab`](../../src/assets/local-shelf.js#L3009-L3021) | The standard new-tab link: `target="_blank"`, `rel="noopener"` |
| [`canInflate`](../../src/assets/local-shelf.js#L3023-L3026) | Whether `CompressionStream` is there |
| [`inflatingPageUrl`](../../src/assets/local-shelf.js#L3033-L3048) | The small page: data first, then unpacking and `document.write` |
| [`airaHtmlUrl`](../../src/assets/local-shelf.js#L3050-L3065) | Plain base64 first, compressed if that does not fit, nothing if neither does |
| [`openDataEntry`](../../src/assets/local-shelf.js#L3067-L3092) | Images and PDFs |
| [`openPackedEntry`](../../src/assets/local-shelf.js#L3108-L3154) | Shared by HTML and Markdown: packing or setting, the 10 s timeout, the choice of path, the status line |
| [`openHtmlEntry`](../../src/assets/local-shelf.js#L3094-L3096), [`openMarkdownEntry`](../../src/assets/local-shelf.js#L3098-L3104) | Their verbs and fallbacks: 打包 / 下载打包页, 排版 / 下载 |
| [`packHtmlSource`](../../src/assets/local-shelf.js#L3384-L3548) | Packing: a page's relative assets brought in; [`packHtmlEntry`](../../src/assets/local-shelf.js#L3370-L3381) reads the file and caches |
| [`packMarkdownEntry`](../../src/assets/local-shelf.js#L2863-L2878) | Markdown: read, set as a page, packed, missing images marked |
| [`markdownPageHtml`](../../src/assets/local-shelf.js#L2833-L2842), [`MD_PAGE_CSS`](../../src/assets/local-shelf.js#L2779-L2806), [`MD_PAGE_SCRIPT`](../../src/assets/local-shelf.js#L2811-L2825) | The reading page's shell and sheet, and its script for in-page links and failed images |
| [`renderMarkdown`](../../src/assets/local-shelf.js#L2582-L2591), [`inlineMarkdown`](../../src/assets/local-shelf.js#L2467-L2549) | The renderer the preview and the page share; in a page, images stay `<img>` and headings carry ids |
| [`proxiedImageUrl`](../../src/assets/local-shelf.js#L2557-L2563) | The original address inside a Cubox proxy |
| [`openFavorite`](../../src/assets/local-shelf.js#L1017-L1055) | Favourites: with the root not mounted, switch quietly if it reads, otherwise the grant card |
| [`revealRelative`](../../src/assets/local-shelf.js#L1061-L1116) | Walk down from the root; commit only when every folder exists; select the file, widening the search and filter if needed |
| [`knownRootHandle`](../../src/assets/local-shelf.js#L1135-L1145) | A handle of the same name among the default and recent folders: for a quiet switch, and where the system window starts |
| [`openFavoriteRoot`](../../src/assets/local-shelf.js#L1147-L1166) | Switch quietly when the handle still reads |
| [`showFavoriteAuth`](../../src/assets/local-shelf.js#L1168-L1179), [`presentFavoriteAuth`](../../src/assets/local-shelf.js#L1183-L1188) | The grant card, on whichever surface is in view |
| [`pickedRoot`](../../src/assets/local-shelf.js#L1207-L1211) | The chosen folder is the root, or holds it |
| [`authorizeFavorite`](../../src/assets/local-shelf.js#L1213-L1267) | 授权并打开: the system window, mounting, walking to the favourite |
| [`looksLikePath`](../../src/assets/local-shelf.js#L1289-L1296), [`pathSegments`](../../src/assets/local-shelf.js#L1302-L1322) | What counts as a path, and how it is split |
| [`locatePastedPath`](../../src/assets/local-shelf.js#L1353-L1407) | The four cases of a pasted path |
| [`authorizePastedPath`](../../src/assets/local-shelf.js#L1424-L1468) | Choose any folder on the path and walk down from it |
| [`onSearchPaste`](../../src/assets/local-shelf.js#L1470-L1476), [`onSearchKeydown`](../../src/assets/local-shelf.js#L1478-L1483), [`onSearchInput`](../../src/assets/local-shelf.js#L3939-L3950) | Paste, Enter, and a keyboard's whole insertion |
