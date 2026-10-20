<h1 align="center">设计 · Design</h1>

<p align="center">
  灵感台的设计源文件，和让它前后一致的那些约定。<br>
  Lucent's design sources, and the conventions that keep it one product.
</p>

<p align="center"><a href="../README.md">灵感台</a> &nbsp;·&nbsp; <a href="../README.en.md">Lucent</a> &nbsp;·&nbsp; <a href="../docs/glass.md">通透玻璃与设计语言</a> &nbsp;·&nbsp; <a href="../docs/en/glass.md">Lucent Glass and the design language</a></p>

---

## 源文件 · Sources

每一张图、每一个封面都由这里的 HTML 渲染出来；改源文件，再运行对应的脚本。

Every image and cover is rendered from the HTML here: change the source, then run its script.

| 源文件 · Source | 它是什么 · What it is | 渲染 · Rendered by | 产出 · Output |
|---|---|---|---|
| [`atelier/`](atelier/) | 十六款搜索动效品鉴 · The sixteen search-motion studies | 随站点发布 · published with the site | [/atelier/](https://hydeclanspi.github.io/Lucent-Next/atelier/) |
| [`brand/icon.html`](brand/icon.html) | 应用图标：前两枚浮光 · The app icon: the first two Lueurs | `node scripts/icon.mjs` | `src/web/icon-*.png` |
| [`brand/og.html`](brand/og.html) | 分享卡片 · The share card | `node scripts/og.mjs` | `src/web/og.jpg` |
| [`covers/film-play.html`](covers/film-play.html) | 影片封面与播放键 · The film's cover with a play button | `node scripts/film-media.mjs play` | `showcase/media/film-poster-play.jpg` |
| [`covers/on-device-cover.html`](covers/on-device-cover.html) | 实机演示的封面 · The on-device film's cover | `node scripts/film-media.mjs device-cover` | `showcase/media/on-device.jpg` |
| [`covers/on-device-frame.html`](covers/on-device-frame.html) | 实机演示的开场画面 · The frame the on-device film opens on | `node scripts/film-media.mjs device` | `verification/device/cover-2x.png`, for `scripts/device-edit.py` |
| [`figures/figures.html`](figures/figures.html) | 文档里的九张图，中英各一版 · The nine documentation figures, in both languages | `node scripts/figures.mjs` | `docs/figures/*.png` |

## 名字 · Names

| | 中文 | English |
|---|---|---|
| 产品 · Product | **灵感台** | **Lucent** · 全称 Lucent · 灵感台 |
| 定位 · Descriptor | 灵感工作室 | The inspiration studio |
| 标语 · Tagline | 由此出发，为光停留。 | Launch from here. Stay for the light. |
| 四个台 · The four 台 | 工作台 · 发射台 · 舞台 · 控制台 | Workbench · Launch pad · Stage · Console |
| 居民 · Residents | 浮光，引擎名「小浮光」 | Lueurs, the Lueurs engine |
| 搜索动效 · Search motion | 念起，光行 | A thought, in flight |
| 舞台上的光 · Light on the stage | 模拟发射 · 白金导流环与蓝白激光 · 绢光与浮金 | Simulated launch · platinum rings and blue-white lasers · silk light and gold motes |
| 玻璃 · Glass | 通透玻璃：暖光液态清璃 · 经典磨砂 | Lucent Glass: Warm Clear · Classic Frost |
| 记录 · Records | 场志 · 名册 · 日志 | The chronicle · the roster · the note |
| 自动驾驶 · Autonomy | Drive (FSD)，面板「代号：交互」 | Drive (FSD), in the Interaction panel |
| 架构 · Architecture | 场景 · 台面 · 系统 · 机制 · 像素；主权与可信 | Context · surface · systems · mechanisms · pixels; control and trust |
| 两个版本 · Editions | 网页版 · 实机安装包 | The web edition · the device packages |

六式保留品鉴时的编号：01 一线入光 Lightline · 03 微棱 Microprism · 04 快门 Shutter · 09 铂丝 Platinum filament · 10 穿针 Through the eye · 14 近轨 Near orbit。

The six motions keep their atelier numbers: 01 Lightline · 03 Microprism · 04 Shutter · 09 Platinum filament · 10 Through the eye · 14 Near orbit.

**灵感台是一个地方。** 称呼它，用灵感台、工作台，或者它的四个台；表面叫台面，搜索所在的那张卡片叫主卡片。宿主自己的功能照宿主的叫法写，例如 Aira 的「自定义主页」。存储键 `aira-profile-card:` 与环境变量 `AIRA_` 是兼容用的技术标识，不属于品牌。

**Lucent is a place.** Call it Lucent, the studio, or one of its four 台; its surface is the surface, and the card that holds search is the main card. The host's own features keep the host's names, such as Aira's 自定义主页. The storage prefix `aira-profile-card:` and the `AIRA_` environment variables are compatibility keys, outside the brand.

## 声音 · Voice

- **先说它是什么。** 从用的人出发，用平实的动词；讲故事用发布会的节奏，讲工程用准确的数字。<br>**Say what it is.** From the user's side, in plain verbs: a keynote's cadence for the story, exact numbers for the engineering.
- **正面陈述。** 直接写它是什么、做什么。<br>**State it positively.** Write what it is and what it does.
- **两种语言，各自地道。** 中文为主，英文对照；英文用英式拼写（colour、centre、honoured）。中文与拉丁字母、数字之间留一个空格；界面上的名字用「」。<br>**Two languages, each native.** Chinese first, English alongside, in British spelling (colour, centre, honoured). In Chinese, a space separates Latin letters and figures from the characters around them, and interface names sit in 「」.
- **数字照排版的规矩。** 范围用 en dash（320–480 ms），乘号用 ×（3120 × 2080），比例两侧留空（99 : 1）。<br>**Figures are typeset.** An en dash for ranges (320–480 ms), a true × for dimensions (3120 × 2080), spaced ratios (99 : 1).
- **不用 emoji。** 界面里的字形（如「✧ 理」）照屏幕上的样子引用。<br>**No emoji.** Glyphs from the interface, such as ✧ 理, are quoted as they appear on screen.

## 颜色 · Colour

颜色各司其职，不被挪作他用；完整的值见[通透玻璃与设计语言](../docs/glass.md#6-颜色)。

Every colour has one job; the full values are in [Lucent Glass and the design language](../docs/en/glass.md#6-colour).

| 颜色 · Colour | 值 · Value | 只用于 · Only for |
|---|---|---|
| 鸿蒙蓝 · HarmonyOS blue | `#0A59F7` | 唯一的主操作 · The single primary action |
| 暖金 · Warm gold | `#FF6A3C → #FFA14E → #FFD07A` | 身份：名字、头像光环、落款 · Identity: the name, the avatar ring, the signature |
| 冰蓝 · Ice blue | `#BCE5F8`；激光 `#69ACFF → #B4DDFF → #FFFFFF` | 环境、浮光与激光 · The environment, the Lueurs and the lasers |
| 铂金 · Platinum | `#EEECE3 → #D3C5A2 → #F0EEE6` | 只在 Random 开启时出现 · Random alone |
| 暖橙 · Warm orange | `#E8BE94` / `#865326` | 只属于增强驾驶 · Boosted Drive alone |

## 字体 · Type

- **产品**：界面、标题与诗意的名字用 HarmonyOS Sans，编号与读数用 Noto Sans Mono，与 MatePad Edge 一致；网页切片在 `src/fonts/`，由 `scripts/web-fonts.py` 生成。<br>**The product** sets its interface, titles and poetic names in HarmonyOS Sans and its figures in Noto Sans Mono, as on the MatePad Edge; the web slices in `src/fonts/` are made by `scripts/web-fonts.py`.
- **影片**：Noto Serif / Sans CJK SC、Inter 与 Cormorant Garamond 的子集，由 `scripts/film-fonts.py` 生成。<br>**The film** uses subsets of Noto Serif and Sans CJK SC, Inter and Cormorant Garamond, made by `scripts/film-fonts.py`.

## 版本与提交 · Releases and commits

版本号遵循 SemVer：实机安装包带着自己的版本号，网页版与 `package.json` 同步。提交与标签的写法见[维护](../docs/MAINTAINING.md#commits-and-releases)。

Versions follow SemVer: each device package carries its version, and the web edition follows `package.json`. Commits and tags are written as set out in [Maintaining](../docs/MAINTAINING.md#commits-and-releases).
