# The local shelf · opening a page

**Take a page off the shelf and hand it to the browser. Inside Aira that step has three gates: packing, the host and length.**

[中文](../local-shelf.md) · [Back to README](../../README.en.md)

---

The shelf previews an HTML page in place: statically, with scripts and embedded frames stripped (see [Architecture · the local shelf](architecture.md#the-local-shelf)). To see the whole page — scripts running, yellow fields to fill in, printing to PDF — you tap 在新标签页打开, open in a new tab. This page covers that one action: how a file travels from the shelf into a new tab, and why 6.0.1 changed the way it travels.

## 1. Three paths

| Where | Page | Handed to | Address |
|---|---|---|---|
| Aira | up to about 1.43 MB once packed | a new tab opened by Aira | `data:text/html;charset=utf-8;base64,…` |
| Aira | larger, but fits once gzipped | the same | a page that unpacks itself (§5) |
| Aira | still too large compressed | nothing opens; the status line points to 下载打包页, download the packed page | — |
| A desktop browser (the web edition) | up to 12 MB once packed | the browser's own new tab | `blob:` |

Images and PDFs take the same road: inside Aira a `data:` address for files up to about 1.43 MB, and a prompt to 下载, download, beyond that; in a desktop browser, still `blob:`.

## 2. Packing

The shelf reads only the folder you mounted, so the page's relative paths are settled before it leaves ([`packHtmlEntry`](../../src/assets/local-shelf.js#L2736-L2907)):

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

From 6.0.1, inside Aira (detected by the `window.AiraHome` that Aira injects), the shelf encodes the packed page as base64 and hands over a `data:` address through the same standard new-tab link ([`openHtmlEntry`](../../src/assets/local-shelf.js#L2474-L2520), [`airaHtmlUrl`](../../src/assets/local-shelf.js#L2430-L2445)).

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

A larger page is first gzipped with `CompressionStream` and carried inside a very small page ([`inflatingPageUrl`](../../src/assets/local-shelf.js#L2413-L2428)):

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

## Source

| Where | What it does |
|---|---|
| [`DATA_URL_LIMIT`](../../src/assets/local-shelf.js#L160) | 2,000,000 characters |
| [`openBlobUrl`](../../src/assets/local-shelf.js#L2349-L2368) | Desktop browsers: a `blob:` address through a new-tab link |
| [`inAiraHome`](../../src/assets/local-shelf.js#L2374-L2376) | Inside Aira or not, by `window.AiraHome` |
| [`clickNewTab`](../../src/assets/local-shelf.js#L2389-L2401) | The standard new-tab link: `target="_blank"`, `rel="noopener"` |
| [`canInflate`](../../src/assets/local-shelf.js#L2403-L2406) | Whether `CompressionStream` is there |
| [`inflatingPageUrl`](../../src/assets/local-shelf.js#L2413-L2428) | The small page: data first, then unpacking and `document.write` |
| [`airaHtmlUrl`](../../src/assets/local-shelf.js#L2430-L2445) | Plain base64 first, compressed if that does not fit, nothing if neither does |
| [`openDataEntry`](../../src/assets/local-shelf.js#L2447-L2472) | Images and PDFs |
| [`openHtmlEntry`](../../src/assets/local-shelf.js#L2474-L2520) | HTML: packing, the 10 s timeout, the choice of path, the status line |
| [`packHtmlEntry`](../../src/assets/local-shelf.js#L2736-L2907) | Packing |
