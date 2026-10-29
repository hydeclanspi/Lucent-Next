# 本地文件架 · 打开一页

**从书架上取下一页，交给浏览器。在 Aira 里，这一步要过三道关：打包、宿主、长度。**

[English](en/local-shelf.md) · [返回 README](../README.md)

---

文件架在主页里就地预览一页 HTML：静态呈现，脚本与内嵌框架一律剥去（见[产品架构 · 本地文件架](architecture.md#本地文件架)）。要看完整的页面——脚本运行、黄框可以填写、可以打印成 PDF——就点「在新标签页打开」。这一篇只讲这一个动作：一页文件怎样从文件架走进一个新标签页，以及 6.0.1 为什么改了它的走法。

## 1. 三条路径

| 在哪里 | 页面 | 交给谁 | 地址 |
|---|---|---|---|
| Aira | 打包后 ≤ 约 1.43 MB | Aira 新开的标签页 | `data:text/html;charset=utf-8;base64,…` |
| Aira | 更大，但 gzip 之后放得下 | 同上 | 一页会自己展开的页面（§5） |
| Aira | 压缩后仍放不下 | 不打开；状态栏提示用「下载打包页」 | — |
| 电脑浏览器（网页版） | 打包后 ≤ 12 MB | 浏览器自己的新标签页 | `blob:` |

图片与 PDF 走同一条路：在 Aira 里交给 `data:` 地址，原文件至多约 1.43 MB，超出则提示用「下载」；在电脑浏览器里仍是 `blob:`。

## 2. 打包

文件架只读你挂载的文件夹，页面里的相对路径要在交出去之前兑现（[`packHtmlEntry`](../src/assets/local-shelf.js#L2736-L2907)）：

- 本地样式表换成内联 `<style>`，样式里的 `url()` 资源单个至多 4 MB；本地脚本、图片与媒体换成 `data:` 资源，单个至多 8 MB。
- `http`、`https` 与 `//` 开头的资源原样保留，计入「在线资源」：在线字体、CDN 上的库，打开后照常联网加载。
- 找不到的列为「缺失」；`<base>`、刷新跳转与内嵌框架去掉；`srcset` 不内联。
- 同一页打包一次后缓存，预览与打开共用。

打包超过 10 秒即取消，并提示改用「下载打包页」。

## 3. 宿主的规矩

灵感台在 Aira 里是一张导入的 ZIP 主页。主页里每一次新开窗口——`target="_blank"` 的链接、`window.open`——都由 Aira 接手：先拒掉网页自己的新窗口，再把目标地址交给它的 `openUrl`（[`handleWindowNewEvent`](https://github.com/mason173/Aira-browser/blob/5593ec02aa4fb7c12606f44651948ac1c46a06bb/AiraBrowser/entry/src/main/ets/core/customhome/CustomHomepageRuntimeCoordinator.ets#L865-L876)）。`openUrl` 只认五种地址（[L953-L971](https://github.com/mason173/Aira-browser/blob/5593ec02aa4fb7c12606f44651948ac1c46a06bb/AiraBrowser/entry/src/main/ets/core/customhome/CustomHomepageRuntimeCoordinator.ets#L953-L971)）：

| 地址 | 结果 |
|---|---|
| `http`、`https`、`file`、`data`、`about` | 新开标签页，由 Aira 自己加载 |
| `aira:` | Aira 的桥接动作；`AiraHome.openUrl(url)` 也是先拼成 `aira://open?url=…`，解出来再回到这张表 |
| 其他，包括 `blob:` | 一行提示：**暂不支持从主页打开此链接。** |

5.7.7 到 5.9.7 用一个标准的新标签链接打开 `blob:` 地址。链接本身能走到 Aira，但 `blob:` 不在表里，于是只换来那一行提示——状态栏写着「已交给 Aira 打开」，是因为链接这一步确实成功了，拦截发生在下一步。这和页面里有没有在线字体无关。

## 4. 交给 Aira 的是 `data:` 地址

6.0.1 起，文件架在 Aira 里（以 Aira 注入的 `window.AiraHome` 为准）把打包好的页面编成 base64，拼成 `data:` 地址，仍用同一个标准的新标签链接交出去（[`openHtmlEntry`](../src/assets/local-shelf.js#L2474-L2520)、[`airaHtmlUrl`](../src/assets/local-shelf.js#L2430-L2445)）。

- **它过得了宿主。** `data` 在表里。Aira 新开标签页后用 `controller.loadUrl` 加载（[`BrowserWebLoadCoordinator`](https://github.com/mason173/Aira-browser/blob/5593ec02aa4fb7c12606f44651948ac1c46a06bb/AiraBrowser/entry/src/main/ets/core/browser/BrowserWebLoadCoordinator.ets#L288)），这是浏览器发起的加载；Chromium 只拦网页自己发起的顶层 `data:` 跳转，不拦这一种。
- **为什么是 base64。** base64 恒为原文的 4/3。百分号编码对英文页面约 1.5 倍，对中文页面约 3 倍——一个汉字三个字节，每个字节写成三个字符。一份 25.4 KB 的英文提案页，base64 是 33.9 KB，百分号编码是 37.6 KB。
- **还走那条链接。** 5.9.7 的那一行提示本身就说明，这条链接能把地址送到 Aira 的 `openUrl`；6.0.1 只换了地址的种类。

## 5. 2 MiB 的天花板，和一页会自己展开的页面

Chromium 拒绝长于 2 MiB（2,097,152 个字符）的地址，加载直接中止。在 Chromium 153 中实测：

| 页面 | `data:` 地址 | 加载 |
|---|---|---|
| 1,530 KB | 1.99 MB | 正常 |
| 1,560 KB | 2.03 MB | `ERR_ABORTED` |

文件架把上限定在 2,000,000 个字符（`DATA_URL_LIMIT`），留出余量；换算成页面，打包后约 1.43 MB 以内直接打开。

再大的页面先用 `CompressionStream` 压成 gzip，装进一页很小的引导页（[`inflatingPageUrl`](../src/assets/local-shelf.js#L2413-L2428)）：

```html
<script type="application/octet-stream" id="lucent-packed">H4sIAAAA…</script>
<script>
  // atob → DecompressionStream('gzip') → document.open(); document.write(原页面); document.close();
</script>
```

- 数据块在前、脚本在后，脚本运行时数据已经就位。
- 外壳做百分号编码；base64 的字符在 `data:` 地址里本来就安全，原样放入，不再膨胀。
- `document.write` 把原页面整页写回：doctype、样式与脚本照旧，`DOMContentLoaded` 与 `load` 照常触发。
- 文字为主的页面通常能压到五分之一到十二分之一：一份 3.63 MB 的长文档，引导页地址只有 299 KB。已经压缩过的图片几乎压不动，内联图片多的页面仍可能放不下。
- 展开失败时，页面上写明原因，并请你回到文件架用「下载打包页」。

## 6. 打开之后，与原页面的差别

- **没有本地存储。** `data:` 页面的源是不透明的，`localStorage`、`sessionStorage`、IndexedDB 与 Cookie 都不可用；依赖它们记住状态的页面会少这部分功能。
- **地址栏里是一长串 `data:` 地址。**
- **相对链接不跳转。** 指向同一文件夹里其他页面的链接，打开后找不到对方——这一点在 `blob:` 时也一样。
- **在线资源照常。** 在线字体与 CDN 资源在有网络时照常加载；Google Fonts 对任何来源都放行。

## 7. 状态栏怎么说

| 情况 | 状态栏 |
|---|---|
| 直接打开 | 已交给 Aira 打开 · 打包后 25.4 KB · 内联 0 · 在线资源 1 个 |
| 压缩后打开 | 已交给 Aira 打开 · 打包后 3.63 MB · 内联 0 · 在线资源 1 个 · 压缩后 299.1 KB |
| 页面压缩后仍放不下 | 打包后 4.00 MB，压缩后仍超过 Aira 从主页打开的上限；请用“下载打包页” |
| 图片或 PDF 太大 | big.pdf 有 2.15 MB，超过 Aira 从主页打开的上限（约 1.4 MB）；请用“下载” |
| 打包超时 | 打包超过 10 秒，已取消；请用“下载打包页”保存 … |
| 电脑浏览器 | 已请求在新标签页打开 · 打包后 … |

页面有缺失的本地资源，或打包后超过约 1.5 MB 时，预览区顶部的小字会提示「打开被拦截时用“下载打包页”」。

## 8. 怎样验证的

在 Chromium 153 里模拟 Aira 的主页宿主：加载完整的 6.0.1 主页包，注入 `AiraHome`，用 CDP 的 `Page.windowOpen` 取得新窗口的目标地址（与 ArkWeb 的 `onWindowNew` 同一时机），按 §3 的表判定，放行的地址由宿主新开标签页加载。

| 文件 | 5.9.7 | 6.0.1 |
|---|---|---|
| 25.4 KB 的英文提案页（一个在线字体样式表、一段内联脚本） | `blob:` → 暂不支持从主页打开此链接 | `data:` 33.9 KB；标题、三页内容完整，黄框输入后脚本把它标为已填 |
| 3.63 MB 的长文档 | 同左 | 压缩后 299 KB；40,016 段文字齐全，`DOMContentLoaded` 与 `load` 均触发，脚本运行 |
| 4.00 MB、无法压缩的页面 | 同左 | 不打开，提示改用「下载打包页」 |
| 0.10 MB 的 PNG | 同左 | `data:` 解码后与原文件逐字节相同，图片 300 × 200 |
| 0.08 MB 的 PDF | 同左 | `data:` 解码后与原文件逐字节相同 |
| 2.15 MB 的 PDF | 同左 | 不打开，提示改用「下载」 |

同一套脚本在没有 `AiraHome` 的页面里跑一遍：仍是 `blob:`，页面与图片照常打开。

**没有覆盖的。** 在 MatePad 上重新导入 6.0.1 之后的实际打开；ArkWeb 能否直接显示 `data:` 形式的 PDF（无头 Chromium 没有 PDF 阅读器，只验证到字节一致）。

## 源码

| 位置 | 做什么 |
|---|---|
| [`DATA_URL_LIMIT`](../src/assets/local-shelf.js#L160) | 2,000,000 个字符 |
| [`openBlobUrl`](../src/assets/local-shelf.js#L2349-L2368) | 电脑浏览器：`blob:` 地址经新标签链接打开 |
| [`inAiraHome`](../src/assets/local-shelf.js#L2374-L2376) | 以 `window.AiraHome` 判断是否在 Aira 里 |
| [`clickNewTab`](../src/assets/local-shelf.js#L2389-L2401) | 标准的新标签链接：`target="_blank"`、`rel="noopener"` |
| [`canInflate`](../src/assets/local-shelf.js#L2403-L2406) | 有没有 `CompressionStream` |
| [`inflatingPageUrl`](../src/assets/local-shelf.js#L2413-L2428) | 引导页：数据块在前，解压与 `document.write` 在后 |
| [`airaHtmlUrl`](../src/assets/local-shelf.js#L2430-L2445) | 先试直接 base64，放不下再压缩，仍放不下返回空 |
| [`openDataEntry`](../src/assets/local-shelf.js#L2447-L2472) | 图片与 PDF |
| [`openHtmlEntry`](../src/assets/local-shelf.js#L2474-L2520) | HTML：打包、10 秒超时、按环境分路、状态栏 |
| [`packHtmlEntry`](../src/assets/local-shelf.js#L2736-L2907) | 打包 |
