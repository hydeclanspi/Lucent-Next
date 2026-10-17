# Static deployment

Run `npm run build`; publish `dist/`. The homepage does not need a server-side runtime, environment variables, or API credentials. Build and serve use only Node.js standard libraries.

For a private review, keep both repository and preview access restricted. A private repository does not automatically make a hosted website private. Choose the host's own access control before sharing a preview.

For GitHub Pages after deciding to publish, enable Pages for the repository and use a static deployment of `dist/` (or a branch containing its contents). Public availability and private-repository support depend on the account's current GitHub plan. The build uses relative URLs and can run under `/airhome-personal/`.

The original native ZIP is stored in `native/` in the repository. It is not part of the web build. README screenshots and development files are also excluded from `dist/`.

## Checks

```sh
npm run check
npm test
npm install
npx playwright install chromium
npm run test:browser
```

Playwright is a development dependency only. `AIRA_PLAYWRIGHT_MODULE` may point to an existing Playwright module for local testing; `AIRA_BROWSER_CHANNEL=chrome` selects an installed Chrome browser. Neither is needed by visitors or production builds.

Local development defaults to loopback on port 4173. Set `PORT` if needed. Browser preferences belong to the current origin, so changing host or port creates a separate preference space.
