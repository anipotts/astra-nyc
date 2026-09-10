# Dependencies and attribution

Direct dependencies: Three.js 0.186.0 (MIT), Vite 8.3.0 (MIT). Versions are pinned in package.json and package-lock.json. The browser runtime uses Three.js; Vite and its dependency tree are build tools.

Official documentation consulted during this event: [Three.js](https://threejs.org/docs/) and [Vite](https://vite.dev/guide/). No example app or pre-event project code was imported.

## Installed packages

License identifiers checked against installed package manifests. Full shipped license notices are retained in THIRD_PARTY_NOTICES.md. Platform-specific optional packages for other machines are recorded by the lockfile but not installed here; re-check notices if distributing those binaries.

| Package | Version | License | Role |
| --- | --- | --- | --- |
| @oxc-project/types | 0.149.0 | MIT | Development/build tooling |
| @rolldown/binding-darwin-arm64 | 1.2.8 | MIT | Development/build tooling |
| @rolldown/pluginutils | 1.0.1 | MIT | Development/build tooling |
| detect-libc | 2.1.2 | Apache-2.0 | Development/build tooling |
| fdir | 6.5.0 | MIT | Development/build tooling |
| lightningcss | 1.33.0 | MPL-2.0 | Development/build tooling |
| lightningcss-darwin-arm64 | 1.33.0 | MPL-2.0 | Development/build tooling |
| nanoid | 3.3.18 | MIT | Development/build tooling |
| picocolors | 1.1.1 | ISC | Development/build tooling |
| picomatch | 4.0.7 | MIT | Development/build tooling |
| postcss | 8.5.28 | MIT | Development/build tooling |
| rolldown | 1.2.8 | MIT | Development/build tooling |
| source-map-js | 1.2.1 | BSD-3-Clause | Development/build tooling |
| three | 0.186.0 | MIT | Runtime renderer |
| tinyglobby | 0.2.17 | MIT | Development/build tooling |
| vite | 8.3.0 | MIT | Development/build tooling |

## Original work and tooling

The HTML, CSS, scene construction, synthetic world data, interactions, and tests in this repository were authored in this event task. See BUILD_LOG.md for boundaries and actual milestones.

The generated design concept is a separate event-created reference, not a runtime image, listing photo, or verified reconstruction. The rendered product uses original procedural geometry. No third-party photos, textures, maps, listings, or datasets are bundled.

Codex/Astra assisted development. No model API calls occur in the running product. Runtime generation/editing and real listing retrieval are not connected. OpenAI services are governed by provider terms, not the application's dependency licenses.

Playwright 1.63.0 (Apache-2.0) and Prettier 3.9.6 (MIT) were installed as external local QA/formatting tools outside this repository. Their code is not bundled in the app. The recording uses locally installed Chromium and ffmpeg; their artifacts are not runtime application dependencies.

No license has yet been selected for the original project code. A public repository alone is not an open-source license grant.
