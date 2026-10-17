# Maintaining Lucent

Product: **Lucent · 灵感台**. The floating-lens engine is **Lueurs** (小浮光, codename 代号：交互). Repository `lucent`, author **hydeclanspi**. The native package is the Aira (HarmonyOS) 5.0 build; this repository is its web edition.

## Where changes belong

| Path | Owns |
|---|---|
| `assets/app.js`, `app.css` | Profile card, search lifecycle, shortcuts, wallpaper, panels, backup and export, About |
| `assets/interaction.js`, `interaction.css` | The Lueurs engine: region geometry, motion, contacts, Drive (FSD), encounters, placement, identities. `_test` exports are used by the tests and the documentation figures |
| `assets/stats-store.js`, `field-store.js`, `stats-panel.js` | Aggregate statistics, the field chronicle, and the hand-written SVG charts |
| `assets/glass-material.{js,css}` | The glass material |
| `assets/search-motion*.{js,css}`, `search-simulation.{js,css}` | 念起，光行: renderers, player, panel, Random lasers, simulated launch |
| `web/browser-bridge.{js,css}` | The browser demonstration layer: host panels, history, theme palette, search URLs, shortcut fixtures |
| `web/showcase.js` | Deep links (`?lueurs=`, `?fsd=`, `?open=`) that press the product's own controls |
| `web/immersive.js` | Immersive full screen on large screens: the first real click, F to toggle, a respected exit |
| `web/manifest.webmanifest`, `web/icon-*.png` | Install as an app that opens full screen; the icon is rendered by `scripts/icon.mjs` from `scripts/icon/icon.html` |
| `web/og.jpg` | Social preview (1280×640): the mark and tagline set over the hero capture by `scripts/og.mjs` from `scripts/og/og.html` |
| `atelier/` | The sixteen-study motion atelier, a standalone page |
| `native/` | The original Aira 5.0 package, byte for byte; its SHA-256 is checked by `scripts/check.mjs` |
| `scripts/` | Build, preview, checks, documentation figures (`figures.mjs`) and media capture (`capture/`) |
| `docs/` | Deep documentation in Chinese, `docs/en/` in English, `docs/llms.txt` for crawlers |

`scripts/build.mjs` copies `index.html`, `assets/`, `web/` and `atelier/` into `dist/`; editing `dist/` directly is lost on the next build.

## Details that have caused mistakes

1. **Search dispatch belongs after the animation.** Enter and the arrow share one form submission. Clear the live and default input values, respect IME composition, prevent duplicates, and verify the return from a navigation.
2. **Blue comes from theme injection.** The original CSS has an orange fallback; the browser layer supplies `#0A59F7`. The warm name gradient and engine outlines are intentional.
3. **Wallpaper is not theme.** The Light/Dark wallpaper and the light/dark interface are independent. The London bitmap includes a device dock at its lower edge; the default framing sits above it. Do not rewrite the bitmaps.
4. **Three kinds of surface.** The profile editor is `.edit-root`, product sheets live in `#sheetRoot`, browser-layer panels are `.ab-overlay`. Tests must target the right one.
5. **Names and keys.** Display names are Lucent / 灵感台 / Lueurs. Storage keys keep the `aira-profile-card:` prefix and environment variables keep `AIRA_`: they are compatibility keys, not branding.
6. **Private browsing is a demonstration.** It only stops the local history record; it is not a real incognito mode, and the example history is not anyone's real history.
7. **Relative paths only.** The site must keep working under a repository subpath.
8. **Docs anchor to source lines.** `docs/*.md` and `docs/en/*.md` link to `assets/…#Lnn`. When code moves, search for `#L` and update both languages.
9. **Documented numbers are test-backed.** Changing an engine constant means updating the test that pins it, the figure that draws it, and both language versions of the docs.
10. **Short landscape screens.** On wide screens the card is centred vertically, so a short screen lifts it until the history tag meets the top bar. `guardCardClearance` in `app.js` lowers the card just enough to keep 16 px clear. Do not move the tag itself, and keep the tablet layout untouched (card top 303 px at 1560×1040): the browser suite checks both.
11. **Immersive full screen is web-only.** It is armed only on large screens and only by a real click; leaving full screen is respected for the rest of the visit (`sessionStorage`). The browser suite and the capture scripts start as a visitor who has already declined, so it never interferes with them; immersive mode has its own check.

## Documentation media

**Figures** are drawn from the engine's own functions, so they cannot drift from the code:

```sh
AIRA_BROWSER_PATH=/path/to/chromium node scripts/figures.mjs            # all nine
node scripts/figures.mjs architecture gestures                        # or some of them
```

They are written to `docs/images/figures/<name>.{zh,en}.png`. `architecture` is the layered product map; `gestures` annotates `docs/images/hero.jpg`, so re-render it after a new hero. The app icon and the social preview are rendered the same way: `node scripts/icon.mjs` and `node scripts/og.mjs` (the preview also follows a new hero).

**Screens and animations** are rendered, not screen-recorded: the product runs on a fake clock and a frozen CSS timeline, and every frame is its exact state at an exact virtual time ([`scripts/capture/recorder.cjs`](../scripts/capture/recorder.cjs)).

```sh
npm run build
node scripts/capture/scenes.cjs lueurs motion random simulation focus glass atelier   # a few minutes each
node scripts/capture/scenes.cjs week chronicle                       # a simulated week, then the panels
```

Frames and stills land in the ignored `verification/capture/`. `CAPTURE_QUICK=1` runs a short smoke version of every scene. To encode:

| Output | From |
|---|---|
| `hero.jpg` | `hero.png` resized to 1920×1280, JPEG quality 85 |
| `lueurs.webp`, `motion-six.webp`, `random-current.webp` | `ffmpeg -framerate 25 -i <scene>/%04d.png -vf scale=1200:-2:flags=lanczos -c:v libwebp_anim -q:v 90 -compression_level 6 -loop 0 <name>.webp` |
| `simulation.webp` | the first 180 frames of `simulation/`, 1200 px wide, WebP quality 90 |
| `focus.jpg` | `focus.png` resized to 1920×1280, JPEG quality 85 |
| `glass-macro.jpg` | `glass-macro.png` (rendered at 4×) |
| `glass-compare.jpg` | left half of `glass-warm.png`, right half of `glass-classic.png`, 1 px divider |
| `chronicle.jpg`, `roster.jpg` | the charts (top) and the terrain, drive log and roster (bottom) of `chronicle-sheet.png` |
| `atelier.jpg` | the first 1,198 CSS px of `atelier.png`, 1600 px wide |

The browser suite writes its own review captures to ignored `verification/screenshots/`; they are evidence for a run, not documentation.

## Work sequence

Inspect `git status` before editing. Make the smallest change that fits the requested behaviour, build, then run the relevant checks: `npm run check` and `npm test` always; `npm run test:browser` for bridge, navigation or persistence changes. The browser suite stubs external pages, so it never sends a query to a search provider.

Before a release run all four (check, unit tests, build, browser suite), review desktop and mobile in both themes, and keep [VERIFICATION.md](VERIFICATION.md) explicit about what was actually checked.

Before making the repository public, review the profile details and the artwork sources across the whole reachable history. No redistribution licence is granted for the artwork; see [ASSETS.md](ASSETS.md).
