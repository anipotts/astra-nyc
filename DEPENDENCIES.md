# Dependencies and attribution

Direct dependencies: Three.js 0.186.0 (MIT), MapLibre GL JS 6.9.0 (BSD-3-Clause), Vite 8.3.0 (MIT). Versions are pinned in package.json and package-lock.json. The browser runtime uses Three.js; Vite and its dependency tree are build tools.

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

The generated design concept is a separate event-created reference, not a runtime image, listing photo, or verified reconstruction. The rendered product uses original procedural geometry. No third-party photos, textures, maps, listings, or datasets are bundled.

Codex/Astra assisted development. No model API calls occur in the running product. Runtime generation/editing and real listing retrieval are not connected. OpenAI services are governed by provider terms, not the application's dependency licenses.

Playwright 1.63.0 (Apache-2.0) and Prettier 3.9.6 (MIT) were installed as external local QA/formatting tools outside this repository. Their code is not bundled in the app. The recording uses locally installed Chromium and ffmpeg; their artifacts are not runtime application dependencies.

No license has yet been selected for the original project code. A public repository alone is not an open-source license grant.

## Public listing sources

Facts only from [95 Wall Street #2308](https://streeteasy.com/building/95-wall-street-new_york/2308) and [Zephyr Lofts #501](https://streeteasy.com/building/zephyr-lofts/501), checked September 10, 2026 during development. These external listing records are not original project work or open-source dependencies. Listing photography and page content remain under their owners’ rights; no images, floor plans, or page copies are bundled. The original scene code is illustrative and does not reproduce a verified floor plan.

## Geographic experiment

MapLibre GL JS 6.9.0 is BSD-3-Clause. OpenFreeMap hosting is free with no API key or registration and no SLA. OpenFreeMap project code is MIT; OpenStreetMap data is ODbL, and [OpenMapTiles code is BSD-3-Clause with design/cartography CC-BY 4.0](https://github.com/openmaptiles/openmaptiles/blob/master/LICENSE.md). Keep the map attribution visible, including in recordings. No map tiles are bundled or bulk-downloaded. Opening the map sends tile requests to OpenFreeMap/its CDN; no device location is requested.

Reviewed current official [MapLibre setup](https://maplibre.org/maplibre-gl-js/docs/), [OpenFreeMap guide](https://openfreemap.org/quick_start/), [terms](https://openfreemap.org/tos/), [privacy](https://openfreemap.org/privacy/), and [attribution](https://openfreemap.org/#attribution). Service is provided as-is; accuracy, availability, and current building heights are not guaranteed. The one supported pin uses rounded coordinates linked by the public listing, not a surveyed entrance. No routing service is adopted.
