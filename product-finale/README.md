<h1 align="center">实机安装包 · Device packages</h1>

<p align="center">
  灵感台在 HUAWEI MatePad Edge 上的正式版本。导入 Aira，即刻可用。<br>
  Lucent as it ships to the HUAWEI MatePad Edge. Import a package into Aira, and it is ready.
</p>

<p align="center"><a href="../README.md">灵感台</a> &nbsp;·&nbsp; <a href="../README.en.md">Lucent</a> &nbsp;·&nbsp; <a href="../Live-web.md">在线体验 · Live</a></p>

---

| 版本 · Version | 文件 · File | 这一版 · In this release |
|---|---|---|
| **6.0.1** | [`lucent-6.0.1-aira.zip`](lucent-6.0.1-aira.zip) | 本地文件架在 Aira 里改用 `data:` 地址打开页面、图片与 PDF，不再被「暂不支持从主页打开此链接」拦下；打包后约 1.43 MB 以内直接打开，更大的页面 gzip 后自行展开，仍放不下时提示「下载打包页」<br>Inside Aira the local shelf now opens pages, images and PDFs as `data:` addresses instead of being stopped by 暂不支持从主页打开此链接; up to about 1.43 MB once packed a page opens directly, a larger one is gzipped and unpacks itself, and one that still does not fit points to 下载打包页 |
| **5.9.7** | [`lucent-5.9.7-aira.zip`](lucent-5.9.7-aira.zip) | 文件夹授权持久化：重开后自动恢复已挂载的默认文件夹，收藏可回到原根目录；「选择新路径」与「选择文件夹」换为影青液态釉，保留主操作层级<br>Persistent folder grants: the default folder returns after reopening, favourites can restore their original root, and the folder pickers use a translucent celadon glaze while remaining the primary actions |
| **5.9.4** | [`lucent-5.9.4-aira.zip`](lucent-5.9.4-aira.zip) | 本地文件架：挂载文件夹或单个文件，按类型筛选，最近路径，HTML、Markdown 与 PDF 就地预览、新标签页打开；星标收藏夹浮在液态青花玻璃上；入口移到快捷方式区，直达可排序；备份可导入；浮光出厂 6 枚、74 : 26、力度 13.7×<br>The local shelf: mount a folder or single files, filter by kind, recent folders, HTML, Markdown and PDF previewed in place or opened in a new tab; starred favourites floating on liquid porcelain glass; the shelf's entry among the shortcuts, and the direct entries in an order of your own; backup import; the Lueurs' factory baseline at six, 74 : 26, strength 13.7× |
| **5.1.3** | [`lucent-5.1.3-aira.zip`](lucent-5.1.3-aira.zip) | 发射循环开启即泛起绢光与浮金；名册记 Manual 出击；关于卡片新文案；折叠后的居中修正；包名 Lucent Next<br>Silk light and gold motes while the launch loop is on; Manual strikes in the roster; new About copy; the folded layout re-centred; the package named Lucent Next |
| **5.0.0** | [`lucent-5.0.0-aira.zip`](lucent-5.0.0-aira.zip) | 暖光液态清璃与经典磨砂；十六选六的搜索动效与 Random；模拟发射与持续光束<br>Warm Clear and Classic Frost glass; six search motions chosen from sixteen, with Random; simulated launch and sustained beams |

## 安装 · Install

1. 把 ZIP 存到 MatePad Edge 上。<br>Copy the ZIP to the MatePad Edge.
2. 在 Aira 中打开「自定义主页」，选择这个 ZIP。<br>In Aira, open 自定义主页 and choose the ZIP.
3. 导入之后，灵感台就是 Aira 的起始页。<br>From then on, Lucent is Aira's start page.

五个版本的包 `id` 相同：导入 6.0.1 会在原处更新已安装的 5.9.7、5.9.4、5.1.3 或 5.0，本机的设置、日志与场志全部保留。仓库根目录是网页版（`src/`），请导入这里的 ZIP。

All five packages share one `id`, so importing 6.0.1 updates 5.9.7, 5.9.4, 5.1.3 or 5.0 in place and keeps its settings, notes and chronicle. The repository itself is the web edition (`src/`); import a ZIP from here.

## 按交付原样保存 · Kept as shipped

五个 ZIP 都按交付时的字节原样保存，只改了外部文件名。包内的清单保留当时的写法：5.0 的内部名称是「名片 · Profile Card」，那是灵感台最初的名字；5.1.3、5.9.4、5.9.7 与 6.0.1 名为 Lucent Next。`npm run check` 会重新计算并核对下面五个摘要。

All five ZIPs are kept byte for byte as shipped; only their outer filenames changed. The manifests inside keep the words of their day: 5.0 calls itself 名片 · Profile Card, Lucent's first name, and 5.1.3, 5.9.4, 5.9.7 and 6.0.1 are Lucent Next. `npm run check` recomputes and verifies all five digests below.

| 文件 · File | SHA-256 |
|---|---|
| `lucent-6.0.1-aira.zip` | `50ecbf01b29a0bddc68c710f2a52ee1eee4925d0efbde04eb29c3a020f7c79cc` |
| `lucent-5.9.7-aira.zip` | `cb8df1636127810884d61f9974c40415c0319ab5852028188aaabf9184e754d4` |
| `lucent-5.9.4-aira.zip` | `3fcadcce5b5bbfa18d0f11b7c83f2721f45218e3af326be553610f419ba416ee` |
| `lucent-5.1.3-aira.zip` | `4094a37e93bdefec3fce240cbb4dce35f781048f49032f3322bd2228512a9dfd` |
| `lucent-5.0.0-aira.zip` | `cc1c59bd932d19ef188f6599f63fc955626a74c615e4bd800ea0d96bb58e7702` |
