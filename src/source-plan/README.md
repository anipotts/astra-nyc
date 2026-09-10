# Original-source PDF preview

Mount a publisher PDF as a rendered canvas inside the existing native Plans modal. This displays original source artwork, not extracted or invented apartment geometry. No publisher file is stored in Git, public assets, or persistent application storage.

```js
import { mountSourcePlan } from './source-plan/index.js';
const sourceViewer = mountSourcePlan(container);
await sourceViewer.update({ sourceUrl: listing.planUrl, title: listing.name, active: true });
sourceViewer.setActive(false); // cancel pending download/render on modal close
// Call update again on reopening. Do not empty the mounted container every render.
sourceViewer.destroy(); // remove DOM/listeners/resize observer and release PDF worker
```

The container needs a bounded height. The module owns its scroll area and consumes shared UI classes/tokens. Initial display fits the page; zoom is bounded from 0.6 to 2.0 and either canvas dimension is capped at 2400 pixels. Previous/Next controls expose up to three pages. Canvas has an accessible source/page label; it is not a selectable text-layer viewer. Publisher link is always available for accessibility, original full-size viewing and unsupported sources. No animation is introduced.

Direction registers the exported middleware once in both Vite server configurations:

```js
import { createSourcePlanMiddleware } from './server/source-plan.js';
const sourcePlan = createSourcePlanMiddleware();
// configureServer(server) and configurePreviewServer(server):
server.middlewares.use(sourcePlan);
```

`POST /api/plans/source` accepts exactly `{sourceUrl}` from the same localhost origin and returns original PDF bytes. The default allowlist is exact published PDF plan URLs already in `listings` or `nycListings`; generic citation acceptance is not download authorization. It reuses `normalizeSourceUrl`, validates each of at most two redirects, restricts redirects to PDF paths on the same publisher host, sends no credentials, and caps downloads at 4 MB / 15 seconds. Streamed bytes, declared length, MIME and PDF signature are checked. At most two requests run concurrently. Browser cancellation aborts the publisher fetch. Responses are no-store with source URL, acquisition time and SHA-256 headers. No server cache, disk copy, API key, provider account or model call is involved.

The client independently checks byte limits/signature, refuses more than three pages, disables PDF evaluation, renders without interactive annotations, and caps decoded images. The overall load/render deadline is 30 seconds. Failed/unsupported documents retain an error and publisher link. The PDF parser runs in a local bundled worker; it does not depend on browser PDF plugins, a remote CDN or publisher CORS. PDF.js and worker code load only for source viewing. Source changes invalidate prior downloads/renders; closing the modal clears preview state and cancels work.

## Dependency attribution (direction should add to shared DEPENDENCIES.md)

| Package | Exact installed version | License | Source / purpose |
| --- | --- | --- | --- |
| pdfjs-dist | 6.3.289 | Apache-2.0 | https://www.npmjs.com/package/pdfjs-dist ; Mozilla PDF.js, https://github.com/mozilla/pdf.js ; browser PDF parsing and canvas rendering with bundled worker |
| @napi-rs/canvas | 1.0.9 | MIT | https://www.npmjs.com/package/@napi-rs/canvas ; optional PDF.js Node canvas dependency installed by npm, not imported by this browser viewer |
| @napi-rs/canvas-darwin-arm64 | 1.0.9 | MIT | https://www.npmjs.com/package/@napi-rs/canvas-darwin-arm64 ; optional local native backend, not browser-bundled |

The PDF.js Apache license is retained in `PDFJS_LICENSE.txt`. The package lock includes other platform-specific optional binaries, which were not installed here. No new dependency source is original event code. Official documentation consulted: https://mozilla.github.io/pdf.js/examples/ and https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html . The implementation was written for this task; no example application was imported.

## Independent checks

```sh
node --test tests/source-plan.test.js
node scripts/source-plan/serve.mjs --build
node scripts/source-plan/serve.mjs
# temporary QA only: http://127.0.0.1:5181/scripts/source-plan/harness.html
# stop immediately after checking; participant preview remains canonical 5174
```

Seven focused tests cover catalog enforcement, redirect restrictions/count, type/signature and declared/streamed size rejection, acquisition provenance, abort propagation, same-origin middleware, binary response and client page/byte limits. The isolated production build includes the renderer and emitted PDF worker; the shared main build does not yet import this unmounted module.

Browser verification on September 10, 2026: the actual approved MiMA PDF rendered visibly with a page count and source receipt; fit/zoom and keyboard activation worked. Unsupported-source errors retained their publisher link. Rapid Charles-to-MiMA switching followed by pause cleared canvas to width zero; resume displayed MiMA, with no prior-home canvas. Desktop layout was checked at tab-scoped 1144x853 and 723x856. No global browser viewport or Direction QA tab was changed. Screenshots are private under `/tmp/source-plan-qa/`. No source artwork is included in the commit.

Final verification: all 185 tests in this worktree passed; shared app build and isolated source-viewer build passed. Final exact-size PNG receipts: `/tmp/source-plan-qa/mima-1144x853.png`, `/tmp/source-plan-qa/mima-723x856.png`, `/tmp/source-plan-qa/error-723x856.png`. Browser console had no warnings/errors. The temporary QA tab was closed and its tab-scoped emulation cleared; the temporary 5181 server was stopped. Canonical 5174 was not touched. Full native-modal integration remains Direction's final check.
