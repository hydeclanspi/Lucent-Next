# Working on airhome (personal)

This is a static web product. Keep the personal card, content, selected search motions, and visual relationships intentional. Product identity is **airhome (personal)**, repository slug `airhome-personal`, author **hydeclanspi**.

## Where changes belong

- `assets/app.js` coordinates the original homepage, settings, search lifecycle, statistics and interactions.
- `assets/interaction.js`, `stats-store.js` and `field-store.js` contain the interaction and persistence systems.
- `web/browser-bridge.js` supplies the browser panels, theme palette, search URLs and editable shortcut fixtures. It is separate from the original native archive.
- `web/browser-bridge.css` owns the added panels and narrow responsive overrides.
- `scripts/build.mjs` copies `index.html`, `assets/` and `web/` into `dist/`. Editing `dist/` directly will be lost on the next build.
- `native/` contains the original Aira 5.0 ZIP; do not silently replace it with a web bundle.

## Details that have caused mistakes

1. **Search dispatch belongs after the animation.** Both Enter and the arrow use the same form submission. Clear live and default input values, handle IME, prevent duplicates, and verify returning from a navigation. Same-tab `location.assign()` works after the animation without popup permissions.
2. **Blue comes from theme injection.** The original CSS had an orange fallback. The browser adapter supplies `#0a59f7`; warm profile gradients and engine outlines remain intentional.
3. **Wallpaper is not theme.** Light/dark wallpaper choice and light/dark interface theme are independent. The London bitmap includes a device dock at its lower edge; the web default uses a crop above it. Keep the bitmap unchanged unless an asset change is requested.
4. **Profile editor and general panels differ.** The profile editor is `.edit-root`; the original utility sheet is `#sheetRoot`; web host panels are `.ab-overlay`. Tests must target the right surface.
5. **Version labels serve different purposes.** The package is 5.0.0. The original in-product About card retains 4.7.3. Old storage prefixes are intentional compatibility keys, not display branding.
6. **Private storage is scoped.** Demonstration privacy stops only local navigation recording. Do not suggest that it enables real browser incognito or that example history represents actual visits.
7. **Use relative paths.** Keep the product usable under a repository subpath. Never add machine-specific imports to tests; use the optional `AIRA_PLAYWRIGHT_MODULE` environment variable for a locally installed test runtime.

## Work sequence

Inspect `git status` before editing. Make the smallest change that fits the requested behavior, build, then run relevant checks. For bridge, navigation or persistence changes, run `npm run test:browser`; for pure copy/style changes, inspect the affected view. The browser suite uses fake external responses, so it does not send private queries to search engines. It writes review screenshots to ignored `verification/screenshots/`; set `AIRA_UPDATE_DOCS_IMAGES=1` only when deliberately refreshing the committed images in `docs/images/`.

Run `npm run check`, `npm test`, `npm run build` and the browser suite before a full release. Review desktop/mobile and both themes. Keep the public verification report explicit about what was actually checked. Update this document after a discovered integration pitfall, and leave a concise checkpoint before interrupting longer work.

Before making the repository public, review profile details and bundled artwork sources across the reachable history. The project currently grants no general artwork redistribution license.
