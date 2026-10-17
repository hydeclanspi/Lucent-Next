# Verification

Web edition, 5.0.0. Local verification: **2026-10-17**, Chrome on macOS.

| Check | Result |
| --- | --- |
| JavaScript syntax and release identity | 14 scripts passed |
| Aggregate statistics and field-store tests | 20 passed |
| Static production build | Passed |
| Browser behavior groups | 15 passed; no uncaught page exceptions in tested flows |
| Desktop, tablet, mobile | 1560×1040, 1024×768, 390×844 checked |
| Project subpath | Assets and initialization checked under `/airhome-personal/` |

The browser suite covers profile defaults, the blue primary action, zero external requests on initial load, history-panel focus behavior, theme persistence, shortcut create/reorder/delete and validation, IME handling, blank search suppression, Lightline-before-navigation ordering, encoded Google queries, Bing routing, reduced motion, URL-scheme rejection, local privacy recording, custom search templates, host entry panels, profile editing, motion preference persistence, and responsive layout.

Outgoing provider pages are intercepted in tests. The tests verify the real destination URL and navigation timing, without sending test queries to a search provider. They do not validate Google's or Bing's rendering, regional availability, or uptime. Real use navigates directly to the selected provider in the current tab.

Screenshots are in `docs/images/`. Floating objects and the clock change naturally, so these are visual review evidence rather than pixel-perfect golden tests. The browser suite writes review captures to ignored `verification/screenshots/`; `docs/images/` is refreshed deliberately with `AIRA_UPDATE_DOCS_IMAGES=1`. A phone-specific correction keeps the history button from overlapping profile tags.

The original 5.0 ZIP is retained byte-for-byte. The native package and web product are separate artifacts; desktop browser results do not establish HarmonyOS import or hardware performance. No new native-device acceptance was performed for this web edition.

The GitHub workflow runs the same syntax, store, build and browser suites on Linux. See the repository's Actions results for its actual CI status; local results above are a separate record.
