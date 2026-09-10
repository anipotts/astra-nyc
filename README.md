# Elsewhere

See what life could be like in your next home

A local prototype for comparing the space, commute, and daily essentials around a possible home. Built during the Astra NYC hackathon hosted by Cerebral Valley.

## Run locally

```sh
cd ~/Code/hackathons/astra-nyc
npm ci
npm run dev -- --port 5174
```

Open http://127.0.0.1:5174. This is the single participant preview, served from the canonical main checkout. Focused worktrees hand off tested commits for combined verification and main integration; task-owned QA servers are temporary and stopped after checks. Tested with Node.js 25.8.2 and npm 11.11.1. WebGL is required. The server binds to localhost.

```sh
npm test
npm run build
```

## What works

- Start with an NYC address, building name or listing URL. The default catalog contains ten researched NYC cases: specific units, shared floor-plan types and one building-only source. Those scopes and dated availability remain distinct. Root reload opens the landing screen; recent searches reopen a selected source. Five cases have reviewed approximate map points; other addresses are resolved on selection, with ambiguous matches requiring a choice. Explicit online submissions run a bounded Astra search for up to three NYC source-linked candidates. Full listing-page import and floor-plan uploads are not implemented. Earlier Jersey City research remains in the repository and regression suite, outside the default NYC catalog.
- Use a compact, full-viewport interface with one mode selector. The document does not scroll; places and accuracy details can be collapsed.
- Review dated source facts and unknowns. No dimensional interior or fit result is generated from reported square footage. A separately inspected nominal bedroom region is available for Charles & Co, with the unknown closet/entry, openings, ceiling and remaining apartment excluded. Linked Urby plan references have not established usable scale or authorization for reproduction.
- Assess interior evidence from the selected source. Astra returns dated references, proposed exact-unit/building/other-unit classifications, subject levels, conflicts and gaps. The report separates available references from unverified geometry. It does not generate an interior.
- Overview, Inside and Commute share a desktop left column: Elsewhere branding, view tabs, Plans and Your places. Inside shows the reviewed nominal 2D region when available, otherwise the real source link. Source details remain in a disclosure. The ten NYC cases appear in the selector. Choosing a reviewed example immediately focuses its bundled source-supported building location. Other selected addresses are looked up automatically; one exact numbered-street match can be selected automatically, while ambiguous results remain under Sources & details. The former Locate this listing overlay has been removed.
- Inside mounts a source-aware evidence explorer: pan/zoom, keyboard controls, dimension visibility, metres/feet and a separate object-footprint size reference. The archived Charles research has a reviewed nominal bedroom region; no NYC case has yet established a complete or walkable interior. Inspect this plan returns to a visible source review; Plans remains a shared native dialog with SVG and printable PDF output.
- Commute automatically requests real walking, cycling or driving routes when a resolved listing and destination are active. Selecting a travel mode updates the route in one action. Typing does not make requests; an unknown destination is looked up explicitly and selecting its match starts the route. Errors expose Retry. Route geometry stays attached to the map while zooming and panning; the segment slider highlights individual steps. Times are provider estimates without live traffic or departure schedules. Transit opens external Google Maps directions. Changing the listing, destination, mode or active view clears stale routes and aborts pending client requests. The default public destination is 3 World Trade Center. No current-home address is required.
- Your priorities remain in the sidebar across all views and listings. Choose up to three; selections persist in this browser across reloads, synchronize across tabs, and remain usable for the visit if storage is unavailable. No authentication is required. Sourced nearby businesses, personalized detours and account sync are not implemented.

## Preserved development fixtures

Synthetic apartments, invented journeys, furniture previews, canonical Plans, collision/clearance calculations, direct commands, Undo, persistence and exports remain internal regression fixtures. Normal navigation exposes no synthetic entry point or fallback rendering. Development browser tests can load fixtures explicitly through the development-only diagnostic hook. Existing recordings remain private artifacts of earlier scope. These fixtures do not demonstrate a real apartment reconstruction.

## What the demo does not establish

Public listing facts were researched during development on September 10, 2026 and bundled in src/listings.js. The NYC picker opens source snapshots from src/nyc-listings.js; it does not import arbitrary page contents or analyze photographs. Separately, submitted searches can discover candidate source links using Astra web search; their details and availability remain unverified. Source links open the original listing and gallery. Listing availability and prices can change. The interior and car-demo streets, routes, and example nearby places are synthetic. The separate geographic view uses live OpenFreeMap tiles sourced from OpenStreetMap; a chosen listing map pin is approximate. Earlier recordings contain an inferred studio sketch; the current interface no longer enables it from listing area. Synthetic scenes are not a verified reconstruction, furniture-fit guarantee, current-condition inspection, or solar study.

Astra assists development of the scene and app. The running product has an optional localhost-only Astra endpoint for validated scene edits across the two synthetic home previews. Earlier runtime evidence also includes an inferred studio that is now gated from the listing interface. Live gpt-6-astra bed resizing, sofa hiding, evening lighting, and cached replay were verified during the event. The client supplies the current model dimensions, lighting, bed size, and visibility state; the endpoint does not require a particular address or listing ID. The server reads OPENAI_API_KEY from the local environment or ignored .env.local; credentials are never bundled into the client. Local controls still work without credentials. The endpoint validates the returned edit, caches it in server memory, and leaves movement/rendering local. It does not launch runtime agents or reconstruct listing photos.

## Interface and geographic context

The interface uses the participant-approved home-to-home PNG artwork in forest green, with three desktop view tabs and the Your places list stacked below the brand. This project targets desktop only throughout its lifecycle. Plans remains a native modal with keyboard focus and Escape dismissal. View changes are immediate with cancellable 200ms decoration; map motions are bounded to 650ms and disabled with reduced motion. The map instance and camera persist between Overview and Commute. No model calls run on camera movement. The city layer is a pitched, neutral 3D rendering of available OpenStreetMap footprints and tile heights. The tile pipeline mixes recorded heights with storey-derived estimates and strips the distinction; the fixed 5m bucket is excluded conservatively, and missing heights remain flat. This is approximate untextured building massing, not photogrammetry, surveyed geometry or a reproduction of real facades. Sources & details contains the height method and coverage limits.

Address lookup starts after selecting a listing, never while typing. The localhost-only POST /api/location uses Nominatim, regional bounds, identifying User-Agent, a shared cross-process rate limit and 24-hour private temporary cache. A one-time bounded public-address preparation pass followed the service policy for small batches; no recurring or autocomplete batch runs are added. The service returns candidates without choosing for the user. The client can accept a unique exact numbered-street match; ambiguous matches remain reviewable under Sources & details. Known examples use a finite developer-reviewed point catalog with source URLs and observation dates, requiring no live geocoder call on selection. Source URLs, approximate precision and lookup time are shown under Sources & details. Set ELSEWHERE_GEOCODER_URL to a compatible alternative service; no key or new SDK is required for the default. Failed lookups leave the source review available without a guessed pin. Provider policies: https://operations.osmfoundation.org/policies/nominatim/. This flow has no bulk geocoding or nearby place crawling.

In-app route requests use the local POST /api/commute adapter and the separate FOSSGIS OSRM walking, cycling and driving profiles. A 30-minute bounded memory cache coalesces duplicate routes; a cross-process request gate limits calls. The adapter does not query while typing. Approximate endpoints snap to the network within 250 m; this does not verify an entrance or the connecting path. Community-server availability is not guaranteed. Transit and optional external directions use the Google Maps URL API (https://developers.google.com/maps/documentation/urls/get-started); only an explicit click opens Google Maps. See docs/commute-view.md for the service contract and limits.

## Address and listing discovery

Typing only searches bundled examples locally. Submit Search, Search online, or a supported unknown listing link to use OpenAI. The local endpoint accepts one query, allows three provider attempts per server start, and caches/coalesces equivalent queries for thirty minutes. Each request uses gpt-6-astra, low reasoning, at most two web-search tool calls and 2,048 output tokens. Results require a completed search receipt and supported HTTPS URLs present in actual tool sources/citations. Current domains: StreetEasy, Zillow, Realtor.com, Apartments.com, Urby, Apartment Finder and Redfin. Links are shown for source review; no page copies, photos, resident information or inferred room geometry are imported. The selected-listing geographic lookup described above uses Nominatim; listing discovery itself does not geocode or import imagery. Up to six recent search/known-listing entries are saved locally in this browser; provider search results remain in server memory; store:false is set for the Responses request. Provider data handling still applies.

Live search and a cached browser replay were verified during the event; this is discovery proof, not a verified current listing or floor plan.

## Interior evidence assessment

The separate evidence endpoint accepts a selected address and source page, with two provider attempts per server start, thirty-minute result caching/coalescing, a 45-second timeout, up to three web-search tool calls and 3,000 output tokens. Each returned source URL must appear in actual tool sources or citations. Hierarchy (neighborhood/site/building/shared space/floor/unit/room/object) is separate from whether a source matches the exact unit. Source publication labels are model-extracted text; collection time is recorded separately. Source counts are not independent corroboration.

A live report and cached browser replay were verified. The adapter examines search text and references, not original images or measured geometry. Application capability checks can identify available references and missing requirements; they cannot accept the model's claim as proof of scale, permission or rendering readiness. A separate trusted inspected-region adapter now accepts reviewed identity, printed measurements, extent and exclusions into canonical 2D. The bundled Charles & Co region is developer-reviewed source data, not autonomous reconstruction; the dimension-to-region correspondence remains a qualified interpretation. Completed reports remain visible after failed refreshes; timeout recovery of partial provider findings and durable background jobs are not implemented.

## Direct plan inspection and supported 2D

Open **Inspect a published plan** from a selected home and supply a direct PDF, PNG or JPEG link from a supported publisher. The local service retrieves at most 4 MB, checks every redirect (maximum two), validates file type/signature, then sends the media to the existing Astra connection. No media is written into the repository or returned to the client. Original artwork stays linked at its source; redistribution/derivative rights remain unresolved.

The endpoint makes at most two provider attempts per server session, with no automatic retries, a 20-second source-fetch timeout, 45-second provider timeout and 2,500 output tokens. Equivalent requests coalesce and replay for 30 minutes. Receipts separate original acquisition/provider stages, token caching and current-request local replay. Observations identify the requested unit versus a mapped unit group, readable printed dimensions, irregular boundaries, conflicts and missing evidence. They do not become accepted geometry automatically.

Live source-seeded inspection of Charles & Co and MiMA PDFs recovered the printed dimension pairs and unit groups, while identifying irregular boundaries and absent visible dates. This demonstrates media inspection, not autonomous address discovery, precise boundary extraction or a full interior reconstruction. Accepted geometry still requires independently reviewed correspondence between dimensions and boundaries. No source-derived ceiling heights or appearance textures are invented.

Plans can render/export a separately reviewed nominal Charles & Co main-bedroom region through the general acceptance adapter. The rectangular region is a developer-reviewed interpretation of the printed size and visible proportions; source dimension endpoints are not explicitly marked. It is not an unobstructed clear-floor rectangle or current-condition certification. Closets, entry recess, wall/opening geometry, fixtures and ceiling height remain absent. It cannot unlock Walk, furniture placement or clearance. The 2015 date comes from embedded artwork metadata, not a visibly printed date. Original plan reuse rights remain unresolved.

## Bounded evaluation

A dedicated local evaluation process shares one ceiling of **eight actual provider attempts across all stages**, including failed requests. UI reloads do not reset its budget. Do not restart it to reset the budget. Supply the existing ignored project env file through Node; do not copy credentials into another checkout:

```sh
node --env-file=/path/to/authorized/project/.env.local scripts/evaluation-server.mjs
```

Open http://127.0.0.1:5175. Read-only `/api/evaluation/status` reports attempts remaining without credentials. The normal local preview still uses port 5173 (or `npm run dev -- --port 5174` for an isolated checkout). A static build does not host the API.

Run a frozen, externally stored suite with private output:

```sh
node scripts/evaluate-evidence.mjs --suite /path/to/suite.json --output /tmp/evidence-run.json --base-url http://127.0.0.1:5175 --max-calls 4
```

Use `--holdouts` only after the first implementation pass. The harness distinguishes source-policy blocks, HTTP failures, source reports, local replay and untested geometry; it never scores `needs_review` alone as success. The first eight-case baseline produced two source reports, two failed requests and four source-policy blocks. The two direct media inspections are separate runs. These small counts do not establish market coverage, production latency or complete cost (failed source searches lack usage receipts in that baseline).

## Next integration, not implemented

Runtime inspection-to-reviewed-boundary extraction remains incomplete: printed room extents are not an automatic walkable polygon. Improve source coverage and failure receipts before further live evaluation. Preserve unknown portions and unit-to-building placement. No property-specific reconstruction rules.

Furniture evidence lookup should accept a photo, link, or description, use visual reasoning and bounded web search to find likely product variants and original specifications, and ask for confirmation when identity is ambiguous. No measurement form is required for previews. Automatic product search, matching, dimension recovery, and Astra manipulation of personal objects are not implemented. Single-image appearance alone does not establish real scale. Cache confirmed evidence per object; movement stays local.

Replace the bundled snapshots with a live, bounded listing importer. Use the participant's listing inputs to collect attributable photo evidence with source URLs and observation dates. Separate visible details from inferred geometry and unknown conditions. Generate a validated scene description and bounded edits, then render locally with Three.js. Verified driving routes, travel times, and filtered nearby-business details remain unimplemented. A photo cannot establish every issue or guarantee a listing's present condition.

## Build provenance

See [BUILD_LOG.md](BUILD_LOG.md) for the event boundary, actual milestones, verification, and remaining work. This task encountered earlier context during initial scaffolding; the log records that exposure. Timestamps alone are not proof of originality.

See [DEPENDENCIES.md](DEPENDENCIES.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for external dependencies and licenses. Private event details, credentials, and conversation exports are excluded from this repository.

## Runtime scope

The local Vite dev/preview endpoint accepts at most ten model attempts per server start, caps output at 2,048 tokens, and caches equivalent requests. Supported model edits are king/queen sizing of the existing bed, visibility of the bed/sofa/table group/all furnishings, and day/evening lighting. Each request applies one validated action; unsupported compound changes, arbitrary object creation, and individual-table targeting are not supported. Invalid responses or responses for a scene changed during the request leave the scene unchanged. Scene dimensions and state participate in cache identity. The original bed-only endpoint is retained for the baseline flow, while the composer uses /api/astra/scene-edit. The deployed static bundle alone does not include a hosted API. Do not expose the local development endpoint publicly.

## Continuous integration

GitHub Actions runs the stable `test-and-build` job on every push and pull request using Node 22, `npm ci`, `npm test` and `npm run build`. Provider branch protection and successful CI must be verified separately before integration; adding the workflow does not establish protection or deployment.

Close-up rendering now requests MSAA antialiasing, caps pixel density at 2, and uses map-anchored daylight so lighting remains stable when rotating. Focusing moves to the reviewed geographic point with a bounded camera transition. These changes improve presentation; they do not add missing roofs, facade textures or surveyed building heights.
