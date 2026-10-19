# Deployment

Lucent is a static site. `npm run build` writes `dist/`; publish that folder anywhere. There is no server-side runtime, no environment variable and no API credential. Build and preview use only the Node.js standard library.

## GitHub Pages

[`.github/workflows/pages.yml`](../.github/workflows/pages.yml) deploys on every push to `main`: it runs `scripts/check.mjs`, builds `dist/`, uploads it as a Pages artifact and deploys it.

One-time setup in the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**. After the first successful run the site is served at `https://hydeclanspi.github.io/Lucent-Next/`.

Everything uses relative URLs, so the product works under the `/Lucent-Next/` subpath (the browser suite checks this). If the repository is renamed, update `homepage` in `package.json`, `SITE` in `scripts/build.mjs`, the canonical and Open Graph URLs in `src/index.html`, and the links in `README*.md` and `docs/llms.txt`.

## What the build contains

The repository layout and the published URLs are independent: the source lives in `src/` and the demos in `demo/`, but the site keeps the same addresses.

| Published at | From | Content |
|---|---|---|
| `/` | `src/` | The base (`index.html`, `assets/`, `web/`): its browser demonstration layer, immersive full screen, and the app manifest and icons (installable; opens full screen) |
| `/film/` | `demo/film/` | The concept film, drawn and scored in code, played in the browser |
| `/atelier/` | `demo/atelier/` | The sixteen-study search-motion atelier |
| `/llms.txt` | `docs/llms.txt` | A plain-text summary for language-model crawlers |
| `/robots.txt`, `/sitemap.xml`, `/.nojekyll` | generated | Written by `scripts/build.mjs` |

The native package (`native/`), the demo media (`demo/media/`), the documentation, tests and scripts are not part of the web build.

## Checks

```sh
npm run check                         # syntax, release identity, native package digest
npm test                              # unit tests
npm run build
npm install && npx playwright install chromium
npm run test:browser                  # browser flows
```

Playwright is a development dependency only. Optional variables for local runs: `AIRA_BROWSER_PATH` (an existing Chromium executable), `AIRA_BROWSER_CHANNEL=chrome` (an installed Chrome), `AIRA_PLAYWRIGHT_MODULE` (an existing Playwright module). None of them is needed by visitors or by the production build.

`npm start` serves `dist/` on loopback port 4173; set `PORT` to change it. Browser preferences belong to the origin, so a different host or port starts with a separate set of preferences.
