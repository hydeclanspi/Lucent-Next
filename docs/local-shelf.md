# 本地文件架 · 找到一页，打开一页

**先找到一页，再把它交给浏览器。找到，靠收藏与一条粘贴进来的路径；打开，在 Aira 里要过三道关：打包、宿主、长度。**

[English](en/local-shelf.md) · [返回 README](../README.md)

---

文件架在主页里就地预览一页 HTML：静态呈现，脚本与内嵌框架一律剥去（见[产品架构 · 本地文件架](architecture.md#本地文件架)）。要看完整的页面——脚本运行、黄框可以填写、可以打印成 PDF——就点「在新标签页打开」。§1–§8 讲这个动作：一页文件怎样从文件架走进一个新标签页，以及 6.0.1 为什么改了它的走法。§9–§11 讲在那之前的一步，6.0.2 起：从收藏回到一页，和把一个路径粘贴进搜索框直接定位。

## 1. 三条路径

| 在哪里 | 页面 | 交给谁 | 地址 |
|---|---|---|---|
| Aira | 打包后 ≤ 约 1.43 MB | Aira 新开的标签页 | `data:text/html;charset=utf-8;base64,…` |
| Aira | 更大，但 gzip 之后放得下 | 同上 | 一页会自己展开的页面（§5） |
| Aira | 压缩后仍放不下 | 不打开；状态栏提示用「下载打包页」 | — |
| 电脑浏览器（网页版） | 打包后 ≤ 12 MB | 浏览器自己的新标签页 | `blob:` |

图片与 PDF 走同一条路：在 Aira 里交给 `data:` 地址，原文件至多约 1.43 MB，超出则提示用「下载」；在电脑浏览器里仍是 `blob:`。

## 2. 打包

文件架只读你挂载的文件夹，页面里的相对路径要在交出去之前兑现（[`packHtmlEntry`](../src/assets/local-shelf.js#L3143-L3314)）：

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

6.0.1 起，文件架在 Aira 里（以 Aira 注入的 `window.AiraHome` 为准）把打包好的页面编成 base64，拼成 `data:` 地址，仍用同一个标准的新标签链接交出去（[`openHtmlEntry`](../src/assets/local-shelf.js#L2881-L2927)、[`airaHtmlUrl`](../src/assets/local-shelf.js#L2837-L2852)）。

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

再大的页面先用 `CompressionStream` 压成 gzip，装进一页很小的引导页（[`inflatingPageUrl`](../src/assets/local-shelf.js#L2820-L2835)）：

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

## 9. 从收藏回到一页

收藏只记四样：根文件夹的名字、从根往下的相对路径、文件名与类型（`{ root, path, name, kind }`）。系统的授权跟着文件夹句柄走，不跟着名字走：Aira 重开之后，存在 IndexedDB 里的旧句柄要重新授权才能读。

| 情况 | 6.0.2 之前 | 6.0.2 |
|---|---|---|
| 根文件夹正挂着 | 沿路径走到文件并选中 | 同左 |
| 根文件夹本次读过，句柄仍可读 | 状态栏一行「请先打开根文件夹…」，被收藏夹挡住，看上去没有反应 | 静默换挂到这个根，直接走到文件 |
| 句柄需要授权（例如 Aira 重开之后） | 同上 | 弹出小窗「授权「根」后打开」，写明根文件夹与完整路径；点「授权并打开」，系统文件夹窗口从这个根打开，选中后自动走到文件并选中，收藏夹收起 |
| 装着能记住授权的 Aira（`AiraHome.localFolders`） | 静默恢复 | 同左；恢复不成就落到上一行 |

- **选它的上层也行。** 在选中的文件夹里找同名的子文件夹，找到就挂它（[`pickedRoot`](../src/assets/local-shelf.js#L1206-L1210)）。
- **选错了，或取消了。** 小窗不关，写明选中的是哪个文件夹、该选哪个，或「已取消选择」。
- **没有 `showDirectoryPicker` 的环境**退回网页的文件夹选择，挂载之后同样接着打开收藏。
- **小窗挂在看得见的那一层。** 收藏夹开着就挂在收藏夹里，关着就挂在书架卡片上（[`presentFavoriteAuth`](../src/assets/local-shelf.js#L1182-L1187)）。
- **沿路径走**（[`revealRelative`](../src/assets/local-shelf.js#L1060-L1115)）只在每一级都存在时才落定；文件找到后，如果当前的搜索或类型筛选会把它藏起来，先清掉搜索、再切到「全部类型」，然后选中并滚到可见处。路径中途断了，仍是原来的「文件已移动或重命名」小窗。

## 10. 粘贴一个路径

搜索框写作「搜索当前文件夹 / 粘贴路径」，字号小一号（11 px）。粘贴进来的若是一个路径，它不再当作筛选词，而是在下面的列表里打开那个位置；手打一个路径再按回车也一样。有的输入法用候选栏粘贴，不发出 paste 事件：一次插入 8 个字符以上、又像路径时，按粘贴处理（[`onSearchPaste`](../src/assets/local-shelf.js#L1469-L1475)、[`onSearchKeydown`](../src/assets/local-shelf.js#L1477-L1482)、[`onSearchInput`](../src/assets/local-shelf.js#L3705-L3716)）。

**什么算路径**（[`looksLikePath`](../src/assets/local-shelf.js#L1288-L1295)）：以 `file:` 开头；或含 `/`、`\`，且至少两段，或以 `/`、`\`、`~` 开头。单个词、带空格的文件名照常筛选。

**怎样拆**（[`pathSegments`](../src/assets/local-shelf.js#L1301-L1321)）：`file://` 链接取路径部分并解码，HarmonyOS 的 `file://docs/storage/Users/currentUser/Documents/…` 也一样；前后的引号与尖括号去掉；`%20` 一类的编码解开；反斜杠当作斜杠；`.` 忽略，`..` 回退一级。

**怎样定位**（[`locatePastedPath`](../src/assets/local-shelf.js#L1352-L1406)）：

| 路径 | 结果 |
|---|---|
| 含当前挂载的根文件夹名 | 从最后一次出现的根名往下走 |
| 相对路径（不以 `/`、`~`、盘符或 `file:` 开头） | 先相对当前文件夹，再相对根 |
| 含另一个认识的根（默认路径、最近路径、收藏里出现过的根） | 本会话可读就静默换挂；否则弹授权小窗，选这个根或它的任一上层 |
| 一个都不认识 | 弹「授权它所在的文件夹」，选路径上的任一文件夹，从它往下走（[`authorizePastedPath`](../src/assets/local-shelf.js#L1423-L1467)） |

- 最后一段像文件名（1–8 位扩展名）就先当文件找，否则先当文件夹；找不到再换另一种。
- 文件在它的文件夹里选中，必要时清搜索、切到「全部类型」；文件夹直接进入。
- 找不到：列表停在路径上最近一层存在的文件夹，状态栏写「没有找到 …，已停在最近的一层」。
- 定位之后搜索框清空；找到的文件可以直接点星标收藏。

## 11. 这两处怎样验证的

在 Chromium 153 里用 OPFS（浏览器的私有文件系统）搭一棵真实的目录树——`Documents / For Cube- Workspace / 26 Q3 C.V. 工程 / LSF 2027 Partner Programme / v0.1`——系统文件夹窗口换成返回指定目录句柄的替身，「重开之后需要授权」用 `queryPermission` 返回 `prompt` 模拟。加载的是完整的 6.0.2 主页包。

| 场景 | 结果 |
|---|---|
| 粘贴 HarmonyOS 形式、百分号编码的 `file://` 链接，指向一份 HTML | 列表进到 v0.1，文件选中并预览，搜索框清空 |
| 粘贴带引号的绝对路径，指向文件夹 | 进到这个文件夹 |
| 粘贴相对当前文件夹的路径 | 进到 v0.1，Markdown 选中 |
| 粘贴 Windows 反斜杠路径，指向一份 PDF（筛选是默认的 MD + HTML） | 切到「全部类型」，PDF 选中 |
| 粘贴一份不存在的文件 | 停在最近存在的一层，状态栏说明 |
| 普通筛选词 | 照常筛选 |
| 手打路径再按回车 | 定位，搜索框清空 |
| 收藏的根本会话仍可读 | 不弹窗，直接打开收藏，收藏夹收起 |
| 收藏的根需要授权 | 弹窗写明根与完整路径；选错文件夹会提示并保留小窗；选它的上层 Documents，自动找到根并打开收藏；系统窗口从这个根打开 |
| 粘贴一个需要授权的已知根下的路径 | 弹窗；授权后换挂并选中文件 |
| 粘贴一个陌生根下的路径 | 弹「授权它所在的文件夹」 |
| 面包屑 | 当前层级的高亮框与前面的斜杠相距 11 px（1418 × 945） |

§8 里 6.0.1 的打开检查（直接打开、压缩打开、图片）在 6.0.2 包上重跑，结果不变。

**没有覆盖的。** MatePad 上 ArkWeb 真实的系统文件夹窗口：`startIn` 是否正好停在那个根，重开之后授权的真实状态；输入法候选栏粘贴是否发出 paste 事件。

## 源码

| 位置 | 做什么 |
|---|---|
| [`DATA_URL_LIMIT`](../src/assets/local-shelf.js#L168) | 2,000,000 个字符 |
| [`openBlobUrl`](../src/assets/local-shelf.js#L2756-L2775) | 电脑浏览器：`blob:` 地址经新标签链接打开 |
| [`inAiraHome`](../src/assets/local-shelf.js#L2781-L2783) | 以 `window.AiraHome` 判断是否在 Aira 里 |
| [`clickNewTab`](../src/assets/local-shelf.js#L2796-L2808) | 标准的新标签链接：`target="_blank"`、`rel="noopener"` |
| [`canInflate`](../src/assets/local-shelf.js#L2810-L2813) | 有没有 `CompressionStream` |
| [`inflatingPageUrl`](../src/assets/local-shelf.js#L2820-L2835) | 引导页：数据块在前，解压与 `document.write` 在后 |
| [`airaHtmlUrl`](../src/assets/local-shelf.js#L2837-L2852) | 先试直接 base64，放不下再压缩，仍放不下返回空 |
| [`openDataEntry`](../src/assets/local-shelf.js#L2854-L2879) | 图片与 PDF |
| [`openHtmlEntry`](../src/assets/local-shelf.js#L2881-L2927) | HTML：打包、10 秒超时、按环境分路、状态栏 |
| [`packHtmlEntry`](../src/assets/local-shelf.js#L3143-L3314) | 打包 |
| [`openFavorite`](../src/assets/local-shelf.js#L1016-L1054) | 收藏：根没挂着时分路——可读即换挂，否则弹授权小窗 |
| [`revealRelative`](../src/assets/local-shelf.js#L1060-L1115) | 从根沿相对路径走下去，全程存在才落定；选中文件，必要时放宽搜索与筛选 |
| [`knownRootHandle`](../src/assets/local-shelf.js#L1134-L1144) | 默认路径与最近路径里同名的句柄：静默换挂，也是系统窗口的起点 |
| [`openFavoriteRoot`](../src/assets/local-shelf.js#L1146-L1165) | 本会话可读就静默换挂 |
| [`showFavoriteAuth`](../src/assets/local-shelf.js#L1167-L1178)、[`presentFavoriteAuth`](../src/assets/local-shelf.js#L1182-L1187) | 授权小窗，挂在当前看得见的那一层 |
| [`pickedRoot`](../src/assets/local-shelf.js#L1206-L1210) | 选中的是根本身，或包含根的文件夹 |
| [`authorizeFavorite`](../src/assets/local-shelf.js#L1212-L1266) | 「授权并打开」：系统窗口、挂载、走到收藏 |
| [`looksLikePath`](../src/assets/local-shelf.js#L1288-L1295)、[`pathSegments`](../src/assets/local-shelf.js#L1301-L1321) | 什么算路径，怎样拆成段 |
| [`locatePastedPath`](../src/assets/local-shelf.js#L1352-L1406) | 粘贴路径的四种情况 |
| [`authorizePastedPath`](../src/assets/local-shelf.js#L1423-L1467) | 选路径上的任一文件夹，从它往下走 |
| [`onSearchPaste`](../src/assets/local-shelf.js#L1469-L1475)、[`onSearchKeydown`](../src/assets/local-shelf.js#L1477-L1482)、[`onSearchInput`](../src/assets/local-shelf.js#L3705-L3716) | 粘贴、回车，与输入法的整段插入 |
