<h1 align="center">实机安装包 · Device packages</h1>

<p align="center">
  灵感台在 HUAWEI MatePad Edge 上的正式版本。导入 Aira，即刻可用。<br>
  Lucent as it ships to the HUAWEI MatePad Edge. Import a package into Aira, and it is ready.
</p>

<p align="center"><a href="../README.md">灵感台</a> &nbsp;·&nbsp; <a href="../README.en.md">Lucent</a> &nbsp;·&nbsp; <a href="../Live-web.md">在线体验 · Live</a></p>

---

| 版本 · Version | 文件 · File | 这一版 · In this release |
|---|---|---|
| **5.1.3** | [`lucent-5.1.3-aira.zip`](lucent-5.1.3-aira.zip) | 发射循环开启即泛起绢光与浮金；名册记 Manual 出击；关于卡片新文案；折叠后的居中修正；包名 Lucent Next<br>Silk light and gold motes while the launch loop is on; Manual strikes in the roster; new About copy; the folded layout re-centred; the package named Lucent Next |
| **5.0.0** | [`lucent-5.0.0-aira.zip`](lucent-5.0.0-aira.zip) | 暖光液态清璃与经典磨砂；十六选六的搜索动效与 Random；模拟发射与持续光束<br>Warm Clear and Classic Frost glass; six search motions chosen from sixteen, with Random; simulated launch and sustained beams |

## 安装 · Install

1. 把 ZIP 存到 MatePad Edge 上。<br>Copy the ZIP to the MatePad Edge.
2. 在 Aira 中打开「自定义主页」，选择这个 ZIP。<br>In Aira, open 自定义主页 and choose the ZIP.
3. 导入之后，灵感台就是 Aira 的起始页。<br>From then on, Lucent is Aira's start page.

两个版本的包 `id` 相同：导入 5.1.3 会在原处更新 5.0，本机的设置、日志与场志全部保留。仓库根目录是网页版（`src/`），请导入这里的 ZIP。

Both packages share one `id`, so importing 5.1.3 updates 5.0 in place and keeps its settings, notes and chronicle. The repository itself is the web edition (`src/`); import a ZIP from here.

## 按交付原样保存 · Kept as shipped

两个 ZIP 都按交付时的字节原样保存，只改了外部文件名。包内的清单保留当时的写法：5.0 的内部名称是「名片 · Profile Card」，那是灵感台最初的名字；5.1.3 名为 Lucent Next。`npm run check` 会重新计算并核对下面两个摘要。

Both ZIPs are kept byte for byte as shipped; only their outer filenames changed. The manifests inside keep the words of their day: 5.0 calls itself 名片 · Profile Card, Lucent's first name, and 5.1.3 is Lucent Next. `npm run check` recomputes and verifies both digests below.

| 文件 · File | SHA-256 |
|---|---|
| `lucent-5.1.3-aira.zip` | `4094a37e93bdefec3fce240cbb4dce35f781048f49032f3322bd2228512a9dfd` |
| `lucent-5.0.0-aira.zip` | `cc1c59bd932d19ef188f6599f63fc955626a74c615e4bd800ea0d96bb58e7702` |
