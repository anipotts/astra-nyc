# Commute view integration

Independent event implementation; direction owns mounting and integration. No shared files, package manifests, lockfiles or private configuration changed.

## Mounting

```js
import { mountCommuteView } from './commute-view/index.js';
import { createCommuteMapLayer } from './commute-view/map-layer.js';
const routeLayer = createCommuteMapLayer(map, {
  padding: { left: 345, top: 75, right: 50, bottom: 65 },
});
const commute = mountCommuteView(container, { routeLayer });
commute.update({
  selectedListing, // id, name, mapAddress, location
  resolvedLocation, // existing validateLocation shape, or null
  priorities, // existing shared priorities; this module never overwrites them
  active: mode === 'commute',
});
// On tab changes use update({ active: false }); aborts/discards pending client
// work, stops camera, clears route. Reactivation requires explicit Preview.
// On teardown:
commute.destroy();
routeLayer.destroy();
```

Expose the map-layer adapter through the existing neighborhood wrapper, or implement this small callback object there:

- `setRoute(route | null)`: set/clear route GeoJSON; no camera effect.
- `highlight(step | null)`: show provider segment geometry and maneuver point; no provider or camera request.
- `fit({ bounds, duration })`: local bounds fit, maximum 650 ms, zero with reduced motion.
- `stop()`: interrupt current camera animation.

`createCommuteMapLayer` adds two GeoJSON sources/four layers, uses map coordinates directly, and reapplies after `style.load`. The existing neighborhood wrapper already stops camera movement on pointer/wheel/keyboard input. The layer is intentionally legible above building massing; it is a ground route diagram, not an elevated physical path. Supply shell-aware padding. The view does not own or destroy the host map.

Callbacks `onModeChange(mode)` and `onDestinationChange({ text, location })` are optional. The module owns visit-local destination/mode; it consumes shared priorities without introducing storage, auth or onboarding. Existing priorities persist browser-wide unchanged. No automatic alternative-mode requests, nearby detours or model calls.

Register localhost middleware alongside location middleware in both dev and preview:

```js
import { createCommuteMiddleware } from './server/commute-view/provider.js';
const commuteMiddleware = createCommuteMiddleware();
server.middlewares.use(commuteMiddleware);
```

The default `/api/location` middleware resolves explicitly submitted custom public destinations and requires a matching candidate choice. 3 World Trade Center is a finite reviewed public demo point. Ordinary typing, mode changes and camera motion make no provider request. Static hosting without these APIs keeps external directions usable.

## Provider and dependency receipt

No npm dependency changes. Reuses repository-pinned MapLibre GL JS 6.9.0 (BSD-3-Clause), Vite 8.3.0 (MIT), platform fetch and Node standard library. Dependency licenses/sources already recorded in DEPENDENCIES.md; direction may append this provider entry there.

- FOSSGIS routing: https://routing.openstreetmap.de/about.html
- Official profile configuration: https://github.com/fossgis-routing-server/osrm-frontend/blob/master/src/leaflet_options.js
- API schema: https://project-osrm.org/docs/v5.24.0/api/
- Service policy: https://fossgis.de/arbeitsgruppen/osm-server/nutzungsbedingungen/
- Road data license: OpenStreetMap ODbL, https://www.openstreetmap.org/copyright
- Required data correction link: https://www.openstreetmap.org/fixthemap
- Destination: https://www.openstreetmap.org/way/166839381, Nominatim lookup observed 2026-09-10T18:41:10Z; approximate building point (-74.0116426, 40.711006), not a surveyed entrance.

Separate `routed-foot`, `routed-bike`, `routed-car` graphs; walking never uses the car graph. Transit is explicitly external because this adapter has no schedule/itinerary source. FOSSGIS about page reports OSRM 5.27.1; actual server binary version is not independently verified. No API key, account, paid API, Astra inference or billing mutation. The community service is suitable only for this bounded low-volume local demo, not a promised commercial routing backend. Provider policy disallows high traffic, bulk download and commercial use where the service is substantial. Production use needs an appropriate provider/deployment and reachable operator contact. `ELSEWHERE_ROUTER_URL` can replace the server-configured compatible HTTPS root; clients cannot choose upstream URLs.

Each explicit request returns at most one route, with full geometry, steps, duration/distance, mode, original acquisition time and any road-data version. Labels distinguish live lookup from a 30-minute cache replay. No traffic, waits, departure schedules, route safety/accessibility guarantees or verified doorstep connection. Snapping is limited to 250 m at each end and offsets are disclosed. Routes may legitimately leave the regional map bounds to reach crossings; no false local clip or straight line fallback.

One filesystem lock across local user processes serializes provider traffic; a shared timestamp enforces at least 1.1 seconds after completion, and 429/503 Retry-After is respected. Maximum four pending unique requests, 12-second provider timeout, 4 MB bounded response, 64-entry process-memory provider cache, identical in-process request coalescing. Client cache holds 32 routes. Client abort/discard prevents stale display; a started shared provider fetch can finish and populate cache after a client abort, within its timeout. Cache is memory only and not preserved across server restarts. No automatic retries. Public location coordinates go to FOSSGIS; custom public address text goes to the existing Nominatim service on explicit submission.

## Local QA

```sh
npm ci
node scripts/commute-view/serve.mjs
# http://127.0.0.1:5182/scripts/commute-view/harness.html
npm test
npm run build
```

Harness is separate from participant preview and uses public source-backed 95 Wall Street and Zephyr Lofts. An unresolved option tests failure behavior; it does not invent a pin/route. No synthetic network responses are used by the UI. Stop the harness after checks. Synthetic route payloads exist only in node regression tests.

The standalone harness uses the default OpenFreeMap style; production continues to use the existing reviewed neighborhood style and its source disclosure. Shared UI classes/tokens have scoped fallbacks: 22px heading, 36px destination, 40px primary, compact 300px panel in the harness.

## Verification receipt — September 10, 2026

132/132 repository tests passed (123 existing + 9 new), existing production build passed with its existing chunk-size warning. New tests cover explicit profiles, malformed evidence, missing/unresolved locations, source snapping bounds, stale success after abort, cache/mode isolation, transit no-call, retry, provider coalescing, origin checks and map reduced motion/cleanup. Module browser compilation and live rendering also passed in the isolated harness.

Three actual public route acquisitions, all 95 Wall Street → 3 WTC:

| Mode | Acquired UTC | Distance | Provider duration | Segments | Provider acquisition latency |
|---|---|---:|---:|---:|---:|
| Walk | 18:47:48.926 | 978.2 m | 782.6 s | 13 | 994 ms |
| Bike | 18:50:46.535 | 1011.5 m | 365.7 s | 9 | 479 ms |
| Drive | 18:51:03.849 | 1185.7 m | 193.9 s | 7 | 341 ms |

These are isolated observations, not expected latency or commute-time promises. Cached replay preserved the original timestamps. The service charged no API credits; no paid provider or model calls occurred. One public Nominatim demo-destination lookup also occurred, at 18:41:10 UTC.

Actual in-app browser checks: both requested desktop sizes; live and cached route labels; walking/bike/drive and explicit transit unavailability; Next and keyboard ArrowRight scrubbing; persistent geospatial path after zoom and pan; custom destination edits clear prior metrics/path; unresolved listing state clears route; reduced-motion emulation; browser offline source failure with external directions retained. Automated tests cover late-response races and reduced-motion zero-duration contract. Custom destination candidate success uses the existing location service and was not additionally live-geocoded during this bounded pass. Production shell mounting remains direction's acceptance step.

Private screenshots (outside Git): `/tmp/elsewhere-commute-qa/desktop-1144.png`, `/tmp/elsewhere-commute-qa/desktop-723.png`.
