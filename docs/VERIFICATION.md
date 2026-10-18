# Verification

Web edition 5.0.0. Last full run: **2026-10-18**, Node.js 22.22, Chromium 141 (Playwright 1.62.1) on Linux.

| Check | Command | Result |
|---|---|---|
| Syntax and release identity | `npm run check` | 31 scripts pass `node --check`; package identity and the native package's SHA-256 verified |
| Unit tests | `npm test` | **41 passed** |
| Static build | `npm run build` | Passed |
| Browser flows | `npm run test:browser` | **18 passed**; no uncaught page exception in any tested flow |
| Viewports | (browser suite) | 1560×1040 (the tablet), 1429×763, 1366×768 and 1280×720 (short laptop screens), 1024×768, 390×844 |
| Repository subpath | (browser suite) | Assets and initialization under `/Lucent-Next/` |

## Unit tests

| File | Tests | What they pin down |
|---|:-:|---|
| [`lueurs-engine.test.cjs`](../tests/lueurs-engine.test.cjs) | 13 | Momentum conservation and restitution over 2,000 random collisions; a held lens never recoils; separation top-up only for slow natural contacts; bounded FSD impulse; speed cap; no tunnelling (every step ≤ 4 px, every position legal); one connected placement chamber; line of sight on 120 random routes; continuity and winding of the probability model; slope and smoothness of the potential; placement weights; driver line-up bounds; slider curves |
| [`motion-renderers.test.cjs`](../tests/motion-renderers.test.cjs) | 4 | The six search-motion renderers over 21,618 progress states: finite coordinates, balanced `save`/`restore`, identical commands on a second pass, original text at t = 0, an empty canvas at t = 1, burst mode drawing light only |
| [`stats-store.test.cjs`](../tests/stats-store.test.cjs) | 14 | Aggregates only; weighted merges; canonical checksums; no overwrite on read failure; retry without double counting; two-slot recovery; concurrent writes; time zones and clocks turned back; no invented precision; decades within budget |
| [`field-store-impact.test.cjs`](../tests/field-store-impact.test.cjs) | 6 | Strength bins and peak; only physical collisions counted; a hand's shove never written to a resident's file; round trip; old snapshots load |
| [`field-store-integrity.test.cjs`](../tests/field-store-integrity.test.cjs) | 4 | 8-bin → 14-bin migration preserving the total exactly; residency grid resampled before writing; damaged-slot fallback with a message; no empty write after a failed read |

## Browser flows

The suite ([`tests/browser.cjs`](../tests/browser.cjs)) covers the reference profile and defaults; the single blue primary action; zero external requests on load; the history panel's focus trap and focus return; theme persistence; adding, reordering and deleting shortcuts with validation; IME composition and blank input never navigating; Lightline playing before navigation; encoded Google queries and Bing routing; reduced motion; refusal of non-HTTP addresses; the privacy demonstration's boundary; custom search templates; every host entry panel; profile editing and motion preferences surviving a reload; the repository subpath; layouts within the viewport on desktop, tablet and phone; the history tag staying clear of the top bar on short laptop screens while the tablet layout stays untouched; immersive full screen on the first real click, a respected exit, and F as a toggle that still types normally in the search field; the concept film rendering chosen moments of its single timeline — the button opened into a circle of light and named as the Home button, the promise turned into a place, the way out into the golden world, the place named Lucent · 灵感台, the end mark in place, no question put to the audience, and the score offered in Opus and AAC; and no uncaught exceptions.

Outgoing provider pages are intercepted: the tests verify the real destination URL and the timing of navigation without sending a query to any search provider. They say nothing about Google's or Bing's own rendering, regional availability or uptime.

## What this does not cover

- **Feel on a touchscreen.** The tests prove the rules; the feel of the Lueurs under a finger was tuned on a device across 109 versions, and is not re-measured here.
- **The native package.** `native/lucent-5.0.0-aira.zip` is kept byte for byte and its digest is checked, but no new HarmonyOS import or on-device acceptance was performed for the web edition.
- **The film in real time.** The suite seeks the film to fixed moments. Smooth real-time playback in a browser depends on the viewer's graphics hardware; the MP4 in `demo/media/` is the reference render.
- **Other browsers.** This run used Chromium; the CI workflow runs the same suites on Linux for every push and pull request. See the repository's Actions page for its current status.

The browser suite writes review screenshots and a JSON result file to the ignored `verification/` folder.
