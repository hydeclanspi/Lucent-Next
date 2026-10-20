<h1 align="center">演示入口 · Demos</h1>

<p align="center">
  灵感台的每一种打开方式，都在这一页。<br>
  Every way into Lucent, on one page.
</p>

<p align="center"><a href="../README.md">← 返回首页</a> &nbsp;·&nbsp; <a href="../README.en.md">← Back to the README</a></p>

## 在线体验 · Live

**[hydeclanspi.github.io/Lucent-Next](https://hydeclanspi.github.io/Lucent-Next/)**

为 HUAWEI MatePad Edge 设计，在那块屏幕上直接使用。在电脑上，全屏是对它的忠实模拟：第一次轻点即进入全屏，F 切换，Esc 退出；也可以把它安装为应用，以全屏启动。手机与小尺寸屏幕不在适配范围内，不建议使用。

Made for the HUAWEI MatePad Edge; use it there as it is. On a computer, full screen is a faithful simulation of that screen: the first tap goes full screen, F toggles it and Esc leaves; install it as an app and it opens full screen. Phones and small screens are outside its scope, and are not recommended.

## 概念影片 · The concept film

<p align="center"><a href="https://hydeclanspi.github.io/Lucent-Next/film/"><img src="media/film-poster-play.jpg" alt="概念影片的封面：四层分开，叠成一块屏幕，中央是播放键 · The cover of the concept film: four layers apart, one screen, with a play button" width="100%"></a></p>

**[在浏览器中观看 · Watch in the browser](https://hydeclanspi.github.io/Lucent-Next/film/)** &nbsp;·&nbsp; [MP4（2K，2560×1440，60 帧，有声 · 1440p, 60 fps, with sound）](media/lucent-film.mp4)

一分四十八秒，请开启声音；每一帧画面、每一个声音都由代码生成。网页版点「播放影片」开始：空格暂停，← / → 跳五秒，M 静音，R 从头播放，F 全屏；地址后加 `?t=42`，从第 42 秒开始。源码在 [film/](film/)；配乐由 `python3 scripts/film-score.py` 合成，渲染成视频用 `node scripts/film.mjs`。

One minute forty-eight seconds; turn the sound on. Every frame and every sound is made in code. In the browser, press Play: Space pauses, ← / → skip five seconds, M mutes, R replays, F goes full screen; add `?t=42` to start at 42 seconds. The source is in [film/](film/); `python3 scripts/film-score.py` composes the score, and `node scripts/film.mjs` renders the film to video.

## 实机 · On the device

<p align="center"><a href="https://hydeclanspi.github.io/Lucent-Next/device/"><img src="media/on-device.jpg" alt="实机演示：在 HUAWEI MatePad Edge 上拍摄，现已放映 · On the device: filmed on a HUAWEI MatePad Edge, now showing" width="100%"></a></p>

**[在浏览器中观看 · Watch in the browser](https://hydeclanspi.github.io/Lucent-Next/device/)** &nbsp;·&nbsp; [MP4（2K，2560×1440，60 帧，有声 · 1440p, 60 fps, with sound）](device/lucent-on-device.mp4)

四十六秒的实机录屏，安静的段落加速播放，右上角标着倍速；配乐取自概念影片的后半段。剪辑由 `scripts/device-edit.py` 完成。
Forty-six seconds recorded on the device; the quiet stretches run faster, each marked with its speed; the music is the second half of the film's score.

## 一键直达 · Deep links

在大屏上效果最好（≥ 900 px）。链接只会按下产品自己的按钮，参数生效后即从地址栏移除。
Best on a large screen (≥ 900 px). The links only press the product's own buttons, and the parameters leave the address bar once applied.

| 想看什么 · To see | 链接 · Link |
|---|---|
| 九枚浮光，增强驾驶 · Nine Lueurs with boosted Drive | [`?lueurs=9&fsd=rage`](https://hydeclanspi.github.io/Lucent-Next/?lueurs=9&fsd=rage) |
| 念起，光行，Random 开启 · 念起，光行 with Random on | [`?open=random`](https://hydeclanspi.github.io/Lucent-Next/?open=random) |
| 代号：交互 · The Interaction panel | [`?open=lueurs`](https://hydeclanspi.github.io/Lucent-Next/?open=lueurs) |
| 场志（先让浮光跑一会儿）· The chronicle (let the Lueurs run for a while first) | [`?lueurs=9&fsd=rage&open=chronicle`](https://hydeclanspi.github.io/Lucent-Next/?lueurs=9&fsd=rage&open=chronicle) |
| 壁纸与玻璃 · Wallpaper and glass | [`?open=glass`](https://hydeclanspi.github.io/Lucent-Next/?open=glass) |
| 关于与亲笔落款 · About and the signature | [`?open=about`](https://hydeclanspi.github.io/Lucent-Next/?open=about) |
| 备份与导出 · Backup and export | [`?open=backup`](https://hydeclanspi.github.io/Lucent-Next/?open=backup) |

## 十六款动效品鉴 · Sixteen motion studies

<p align="center"><a href="https://hydeclanspi.github.io/Lucent-Next/atelier/"><img src="media/atelier.jpg" alt="十六款搜索动效品鉴 · The sixteen search-motion studies" width="100%"></a></p>

**[hydeclanspi.github.io/Lucent-Next/atelier](https://hydeclanspi.github.io/Lucent-Next/atelier/)**：光的速度、字的秩序、材料的呼吸、浮光的灵性，四组十六款，可逐帧拖动、0.35× 慢看。源码在 [atelier/](atelier/)。

The speed of light, the order of letters, the breath of materials, the spirit of the Lueurs: sixteen studies in four sets, to scrub frame by frame or watch at 0.35×. The source is in [atelier/](atelier/).

## 演示素材 · Media

[media/](media/) 收着 README 与文档里的截图、动图与影片。它们都由脚本在伪时钟下逐帧渲染（`scripts/capture/`、`scripts/film.mjs`），任何机器上得到同样的画面；做法见[维护](../docs/MAINTAINING.md)。

[media/](media/) holds the screenshots, animations and film used in the README and the docs. Scripts render them frame by frame under a fake clock (`scripts/capture/`, `scripts/film.mjs`), so they come out the same on any machine; see [Maintaining](../docs/MAINTAINING.md).
