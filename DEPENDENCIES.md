# Dependencies and attribution

## Current integrated application

The sections below record additions across the event; statements about earlier experiments describe their state at that milestone. The integrated app now uses OpenFreeMap/OpenStreetMap map tiles, official NYC building data, Nominatim address lookup, FOSSGIS/OSRM routes, transient original publisher PDF previews, and bounded OpenAI listing discovery/evidence services. Source data and hosted services are external contributions, separate from the original application code. The event-created landing illustration is bundled as decorative artwork. Listing photos, remote map tiles and publisher PDFs are not bundled. Original project code has no selected license grant.

Nominatim is used for bounded address lookup after selection, without autocomplete. See the [OSMF policy](https://operations.osmfoundation.org/policies/nominatim/) and server/location.js for identifying requests, shared throttling and caching. This supersedes the earlier evaluation-only note below. The current default ten-case NYC source catalog is in src/nyc-listings.js, with original links, evidence scope and dates; the older src/listings.js research remains available separately.

Direct dependencies: Three.js0.186.0 (MIT), MapLibre GL JS6.9.0 (BSD-3-Clause), PDF.js/pdfjs-dist6.3.289 (Apache-2.0) and Vite8.3.0 (MIT). Versions are pinned in package.json and package-lock.json. Vite and its dependency tree are build tools.

Official documentation consulted during this event: [Three.js](https://threejs.org/docs/) and [Vite](https://vite.dev/guide/). No example app or pre-event project code was imported.

## Installed packages

License identifiers checked against installed package manifests. Full shipped license notices are retained in THIRD_PARTY_NOTICES.md. Platform-specific optional packages for other machines are recorded by the lockfile but not installed here; re-check notices if distributing those binaries.

| Package | Version | License | Role |
| --- | --- | --- | --- |
| @mapbox/jsonlint-lines-primitives | 2.0.3 | MIT | Runtime dependency |
| @mapbox/point-geometry | 1.1.0 | ISC | Runtime dependency |
| @mapbox/tiny-sdf | 2.2.0 | BSD-2-Clause | Runtime dependency |
| @mapbox/unitbezier | 1.0.0 | BSD-2-Clause | Runtime dependency |
| @mapbox/vector-tile | 3.0.0 | BSD-3-Clause | Runtime dependency |
| @maplibre/geojson-vt | 6.1.1 | ISC | Runtime dependency |
| @maplibre/maplibre-gl-style-spec | 26.4.2 | ISC | Runtime dependency |
| @maplibre/mlt | 1.2.1 | (MIT OR Apache-2.0) | Runtime dependency |
| @maplibre/vt-pbf | 4.3.2 | MIT | Runtime dependency |
| @napi-rs/canvas | 1.0.9 | MIT | Optional PDF.js Node canvas dependency; not imported by the browser viewer |
| @napi-rs/canvas-darwin-arm64 | 1.0.9 | MIT | Optional local native canvas backend; not browser-bundled |
| @oxc-project/types | 0.149.0 | MIT | Build tooling |
| @rolldown/binding-darwin-arm64 | 1.2.8 | MIT | Build tooling |
| @rolldown/pluginutils | 1.0.1 | MIT | Build tooling |
| @types/geojson | 7946.0.16 | MIT | Runtime dependency |
| bidi-js | 1.1.0 | MIT | Runtime dependency |
| detect-libc | 2.1.2 | Apache-2.0 | Build tooling |
| earcut | 3.2.3 | ISC | Runtime dependency |
| fdir | 6.5.0 | MIT | Build tooling |
| fsevents | 2.3.3 | MIT | Build tooling |
| gl-matrix | 3.4.4 | MIT | Runtime dependency |
| json-stringify-pretty-compact | 4.0.0 | MIT | Runtime dependency |
| kdbush | 4.1.0 | ISC | Runtime dependency |
| lightningcss | 1.33.0 | MPL-2.0 | Build tooling |
| lightningcss-darwin-arm64 | 1.33.0 | MPL-2.0 | Build tooling |
| maplibre-gl | 6.9.0 | BSD-3-Clause | Runtime dependency |
| minimist | 1.2.8 | MIT | Runtime dependency |
| murmurhash-js | 1.0.0 | MIT | Runtime dependency |
| nanoid | 3.3.18 | MIT | Build tooling |
| pbf | 5.1.2 | BSD-3-Clause | Runtime dependency |
| pdfjs-dist | 6.3.289 | Apache-2.0 | Original PDF parsing and canvas rendering with a bundled worker |
| picocolors | 1.1.1 | ISC | Build tooling |
| picomatch | 4.0.7 | MIT | Build tooling |
| postcss | 8.5.28 | MIT | Build tooling |
| potpack | 2.1.0 | ISC | Runtime dependency |
| protocol-buffers-schema | 3.6.1 | MIT | Runtime dependency |
| quickselect | 3.0.0 | ISC | Runtime dependency |
| require-from-string | 2.0.2 | MIT | Runtime dependency |
| resolve-protobuf-schema | 2.1.0 | MIT | Runtime dependency |
| rolldown | 1.2.8 | MIT | Build tooling |
| source-map-js | 1.2.1 | BSD-3-Clause | Build tooling |
| three | 0.186.0 | MIT | Runtime dependency |
| tinyglobby | 0.2.17 | MIT | Build tooling |
| tinyqueue | 3.0.0 | ISC | Runtime dependency |
| vite | 8.3.0 | MIT | Build tooling |

## Original work and tooling

The HTML, CSS, scene construction, synthetic world data, interactions, and tests in this repository were authored in this event task. See BUILD_LOG.md for boundaries and actual milestones.

The generated design concept is a separate event-created reference, not a runtime image, listing photo, or verified reconstruction. The rendered product uses original procedural geometry. No third-party photos, textures, map tiles, floor plans or page copies are bundled; selected public listing facts are separately attributed below.

Codex/Astra assisted development. The running product optionally calls the OpenAI Responses API for bounded scene edits, with validated results and an application cache. Real listing retrieval and reconstruction are not connected. OpenAI services are governed by provider terms, not the application's dependency licenses.

Playwright 1.63.0 (Apache-2.0) and Prettier 3.9.6 (MIT) were installed as external local QA/formatting tools outside this repository. Their code is not bundled in the app. The recording uses locally installed Chromium and ffmpeg; their artifacts are not runtime application dependencies.

No license has yet been selected for the original project code. A public repository alone is not an open-source license grant.

## Public listing sources

Facts only from [95 Wall Street #2308](https://streeteasy.com/building/95-wall-street-new_york/2308) and [Zephyr Lofts #501](https://streeteasy.com/building/zephyr-lofts/501), checked September 10, 2026 during development. These external listing records are not original project work or open-source dependencies. Listing photography and page content remain under their owners’ rights; no images, floor plans, or page copies are bundled. The original scene code is illustrative and does not reproduce a verified floor plan.

## Geographic experiment

MapLibre GL JS 6.9.0 is BSD-3-Clause. OpenFreeMap hosting is free with no API key or registration and no SLA. OpenFreeMap project code is MIT; OpenStreetMap data is ODbL, and [OpenMapTiles code is BSD-3-Clause with design/cartography CC-BY 4.0](https://github.com/openmaptiles/openmaptiles/blob/master/LICENSE.md). Keep the map attribution visible, including in recordings. No map tiles are bundled or bulk-downloaded. Opening the map sends tile requests to OpenFreeMap/its CDN; no device location is requested.

Reviewed current official [MapLibre setup](https://maplibre.org/maplibre-gl-js/docs/), [OpenFreeMap guide](https://openfreemap.org/quick_start/), [terms](https://openfreemap.org/tos/), [privacy](https://openfreemap.org/privacy/), and [attribution](https://openfreemap.org/#attribution). Service is provided as-is; accuracy, availability, and current building heights are not guaranteed. The one supported pin uses rounded coordinates linked by the public listing, not a surveyed entrance. No routing service is adopted.

## Event-created branding and additional source references

The original SVG home-to-home mark and PNG favicon exports were created during this event from the participant's approved event-generated raster reference. They are original project assets, not third-party icons. The wordmark uses the existing system font stack; no font files are bundled, remotely loaded, or claimed to match the unidentified generated typeface. No new runtime dependency was introduced for branding or Plans.

Additional facts-only references: [Journal Square Urby #409](https://www.urby.com/location/journal-square/availability/unit-409-1-5031127) and [#1504](https://www.urby.com/location/journal-square/availability/unit-1504-0-5031283), checked September 10, 2026. Official plan links are outbound references only. No plans or photos were copied, traced, or bundled. Usable scale and permission for reproduction have not been established. The official [Urby terms](https://www.urby.com/terms-of-service) were reviewed; these records stay evidence only.

## Personal previews and current interface

Green-seat and black-shelf geometry was authored during the event from participant-supplied appearance references. Personal photographs and their backgrounds are not included. Product identity and real dimensions remain unknown; preview bounds are hypothetical defaults. Direct controls, shared command validation, empty entry and the Plans modal add no dependencies. Active branding uses versioned PNG exports from the approved event-created raster, replacing the earlier approximate SVG in the header and favicon. Planning drawings make no NCS or ISO compliance claim.

## Bounded address-to-listing discovery

The existing OpenAI Responses API now uses its web_search tool for explicit address or public-listing-link submissions, following the official [web search guide](https://developers.openai.com/api/docs/guides/tools-web-search). This hosted service has provider pricing and data terms; no SDK package or new runtime dependency was installed. Candidate URLs are attributed in the interface and limited to existing public residential source domains. Source pages/photos are not copied or bundled. Public Nominatim was evaluated but not adopted: its [usage policy](https://operations.osmfoundation.org/policies/nominatim/) prohibits autocomplete and limits usage. No geocoding requests were made.

## Interior evidence assessment and header treatment

The existing OpenAI service now provides bounded source-text evidence assessments on the same listing domains, additionally allowing Apartment Finder and Redfin. No original images are inspected, copied or bundled by this adapter. The subject hierarchy and capability checks are original event code; search classifications are proposed model observations. No plan, scan, exterior-tile or reconstruction dependency was adopted. The header icon is recolored with a local CSS/SVG filter; approved source PNGs and favicons are unchanged.

## Landing asset tooling and original artwork

Existing local cwebp1.6.0 (libwebp, BSD-3-Clause; [upstream source](https://github.com/webmproject/libwebp)) compressed the supplied current-event hero toWebP at quality86. License verified from installed COPYING. This is an offline asset utility, not an added runtime or npm dependency. The original generated illustration is separately described in `public/hudson-daylight-illustration.provenance.json`; it is decorative artwork, not a sourced geographic dataset.

## Integrated commute and view modules — September 10, 2026

No new npm dependencies. Inside uses the existing DOM/SVG renderer; Commute uses existing MapLibre GL6.9.0 with GeoJSON line/point layers. Shared controls use the original event-created CSS token system.

The automatic lookup for resolved routes uses the [FOSSGIS routing service](https://routing.openstreetmap.de/about.html) and its separately deployed OSRM foot, bike and car profiles ([published configuration](https://github.com/fossgis-routing-server/osrm-frontend/blob/master/src/leaflet_options.js), [OSRM API](https://project-osrm.org/docs/v5.24.0/api/)). This is a hosted community service, not a pinned npm package; upstream deployed revision is not supplied by the response. Respect the [FOSSGIS usage conditions](https://fossgis.de/arbeitsgruppen/osm-server/nutzungsbedingungen/). Route data derives from OpenStreetMap under ODbL; attribution and a map-correction link remain visible. Requests are bounded, coalesced and cached for30minutes with a shared cross-process gate. No traffic, transit itinerary or schedule inference is added.

The finite 3WorldTradeCenter destination uses a public approximate point from [OpenStreetMap way166839381](https://www.openstreetmap.org/way/166839381), reviewed during the event. It is not an entrance survey. Source locations and provider acquisition timestamps remain inspectable. No source artwork or user photos are bundled by these modules.

## Official NYC building data — September 10, 2026

The runtime now queries the [NYC OTI BUILDING public layer](https://services6.arcgis.com/yG5s3afENB5iO9fj/arcgis/rest/services/BUILDING_view/FeatureServer/0), following the city's [building-footprint metadata](https://github.com/CityOfNewYork/nyc-geo-metadata/blob/main/Metadata/Metadata_BuildingFootprints.md). This is a hosted dataset without a pinned release; acquisition and per-feature edit dates are retained. It is governed by [NYC Open Data terms](https://opendata.cityofnewyork.us/overview/#termsofuse), not an assumed software or CC0 license. Source attribution remains on the map and in recordings. Queries are bounded to a400m radius with2,000features maximum and no pagination or bulk download. Data is cached in memory for30minutes. No new package, credential or imagery provider is needed.

Roof heights are feet above ground, converted to metres with0.3048. Missing heights remain flat; placeholder outlines are excluded. This improves source grounding without establishing roof shapes, facades, interiors, surveyed dimensions or current construction conditions.

The official [Architectural visualization with Astra](https://developers.openai.com/blog/architectural-visualization-with-astra) example informed the plan-first, structured-model and render/inspect workflow. No example scene code or imagined house was imported. Its conceptual visualization workflow does not establish professional plan compliance or exact-address reconstruction.

## Original publisher plan viewer — September 10, 2026

[Mozilla PDF.js](https://github.com/mozilla/pdf.js) is installed as pinned [pdfjs-dist6.3.289](https://www.npmjs.com/package/pdfjs-dist); its Apache-2.0 license is retained at src/source-plan/PDFJS_LICENSE.txt. Official [examples](https://mozilla.github.io/pdf.js/examples/) and [API documentation](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html) were consulted; no example app was imported. Library code loads on source viewing and the worker is served locally. Optional Node canvas packages listed above are npm dependencies, not browser imports. Platform-specific packages recorded in the lockfile but not installed here need their notices checked if distributed.

Approved publisher PDFs are transient original-source previews: bounded retrieval, no persistent storage or bundled artwork, retained publisher link and acquisition metadata. This grants no redistribution rights or professional certification. A tighter SVG viewport around the already approved raster mark enlarges its header/favicon presentation; the original artwork bytes remain unchanged.
