# Assets and attribution

**Lucent · 灵感台** — product, interface and visual design by **hydeclanspi**. An independent personal project, not affiliated with Aira, Huawei or HarmonyOS.

## Bundled artwork

The product ships these bitmaps: the avatar; the London night wallpaper (Light); the anime-style dusk illustration (Dark) and its wider source crop; the dusk thumbnail; the handwritten signatures (light and dark); the About preview image; the ice icon. The motion atelier embeds the same dusk illustration.

The author holds the rights to the London night photograph and the dusk illustration. For the other bitmaps, the original licences were not part of the supplied material and no licence is asserted over them. **No licence is granted for redistribution** of any bundled bitmap.

## Made for this repository

- Interface symbols and icons — the planet, the FSD lettermark, the six motion glyphs, the badge cap — are vector paths drawn in code.
- The figures in `docs/figures/` are rendered by `scripts/figures.mjs` from the engine's own functions.
- The screenshots and animations in `demo/media/` are rendered from the product itself (`scripts/capture/`); the social image `src/web/og.jpg` sets the name and tagline over that hero capture (`scripts/og.mjs`).
- The app icon (`src/web/icon-*.png`) draws the first two Lueurs with the product's own lens styling over a plain gradient (`scripts/icon/icon.html`); it uses no bundled artwork.
- The concept film (`demo/film/`) is drawn entirely in code — WebGL shaders for the skies and the light, Canvas for the beams, the arc and the world beyond the slit, CSS and SVG for the interface and the type. Its dusk skies are painted procedurally, the windows beyond the slit are generic scenes drawn from shapes in code, and its avatar is a gradient. Its wallpaper passage shows two of the bundled wallpapers, the London night photograph and the dusk illustration, beside a third painted in code. Its score (`score.webm`, `score.m4a`) is synthesized by `scripts/film-score.py` (the package `scripts/score/`) from oscillators, filters, noise and physical models; it uses no samples or recordings. The MP4 in `demo/media/` is rendered from that page by `scripts/film.mjs`.

## Names and fonts

Search-provider and product names in the shortcuts identify their destinations; no endorsement is implied. The two demo shortcuts carry their sites' own icons, bundled so the page makes no request for them: `src/web/shortcuts/kimi.png` is kimi.com's app icon (`pwa-192.png`), and `src/web/shortcuts/apple.svg` redraws apple.com's favicon — a white disc with a grey rim — around the mark from apple.com's navigation bar. Kimi is a trademark of Moonshot AI; Apple and the Apple logo are trademarks of Apple Inc. In the README stills, the social image and the product's own preview (`src/assets/about-preview.jpg`), only those two shortcuts were replaced; every other pixel is as it was rendered or recorded. HarmonyOS Sans is referenced as a system font preference; no font file of it is bundled. Aira and HarmonyOS are trademarks of their owners; HUAWEI and MatePad are trademarks of Huawei. The README and the film name the HUAWEI MatePad Edge as the device Lucent was designed for, and imply no endorsement.

The concept film bundles subsets of Noto Serif CJK SC and Noto Sans CJK SC (Adobe), Inter (The Inter Project Authors) and Cormorant Garamond Light and Light Italic (The Cormorant Project Authors), all under the SIL Open Font License 1.1 with no Reserved Font Name; the licence is in [`demo/film/fonts/OFL.txt`](../demo/film/fonts/OFL.txt). `scripts/film-fonts.py` makes the Noto and Inter subsets from the characters the film sets; Cormorant ships as the Latin subset published by @fontsource.

## Personal content

The profile, signature text, tags, level, location and daily note are the author's own defaults from the 5.0 package, and all of them are editable in the interface. The demonstration history is labelled example data, not a copy of anyone's browsing history.

## Design references

[HarmonyOS design overview](https://developer.huawei.com/consumer/cn/design/) and [design resources](https://developer.huawei.com/consumer/cn/design/resource/). No downloadable Huawei design asset was copied into this repository.

## Code

All rights reserved. The source is published for reading and evaluation; it is not offered under an open-source licence.
