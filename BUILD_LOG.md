# Event build log

All times are America/New_York (EDT, UTC-04:00), September 10, 2026.

## Scope and provenance

The participant reports a permitted build window of 10:30 AM–5:30 PM. The guide has not been independently checked in this task.

The participant requires a fresh implementation: no importing, copying, adapting, or submitting their pre-event code, prototypes, planning documents, or saved planning prompts. Requirements for the product must be supplied here during the build window. Standard dependencies and official documentation are allowed and will be attributed separately.

Before this boundary was supplied, this task had earlier-context summaries in its context and searched a local memory index during repository scaffolding. That exposure is acknowledged; this is not a claim that the task never encountered earlier context. No further earlier-chat or hackathon-memory retrieval is permitted for this build. The initial commit contains only README.md, .gitignore, and AGENTS.md; it contains no product implementation.

Git timestamps document recorded activity, not proof of originality. Preserve ordinary history and record subsequent implementation and verification here.

## Demo definition

- User problem: people comparing homes cannot picture daily life well enough to decide which listings deserve an in-person visit.
- Core interaction: explore a home, preview the trip to work, then change the scene.
- Visible result for a 60-second demo: a traversable 3D home and illustrative commute, with a visible furniture or lighting change.
- Astra during development: assist with implementation, tests, debugging, and documentation under the fresh-build boundary; record actual work and verification.
- Astra inside the running product: undecided until the interaction is defined. No runtime model integration exists yet. Document the actual model and calls if added; distinguish live results from fixtures or mocks.

## Targets, not completion claims

| Time | Target |
| --- | --- |
| 12:00 PM | Working flow recorded |
| 1:00 PM | Complete one-minute recording |
| 3:30 PM | Feature freeze; fixes, verification, and submission preparation only |
| 5:00 PM | Submission ready |
| 5:30 PM | Reported build-window end |

## Activity

| Actual time | Milestone / observation | Verification |
| --- | --- | --- |
| 10:31:51 AM | Initial repository scaffold, commit d426e6e19758ec7648950ef20c5c0c99670645c8 | Git author and committer timestamps match. Three files: README.md, .gitignore, AGENTS.md. Initial commit hook reported no secret leaks. |
| 10:34:50 AM | Inspected starting state after receiving the fresh-build boundary; requested the participant's current idea before implementation | Current clock checked. Working tree clean; one commit; no application code or dependency manifests. |

## Built during this event

- Initial three-file repository scaffold.
- Fresh-build guidance, this provenance and milestone log, and an initial dependency ledger prepared after the scope instruction.
- Product implementation: starting a local browser prototype with synthetic homes and streets; actual listing reconstruction, geocoding, and live runtime Astra edits are not implemented.
- Runtime verification: completed for the local synthetic flow; see the 10:58:18 AM entry.
- Recording: a local working-flow screen capture has been created; presentation narration and real-data claims are not part of that capture.
- Submission: not sent.

### 10:43:32 AM — initial product scope

Current time checked. Defined the demo from the participant's newly supplied home-comparison idea. Chose Three.js and Vite for the first independent local interaction prototype, with no server or runtime model calls. Created a separate direction/schedule task and verified it is active. API access is unresolved; credential presence check returned absent without exposing values. A new generated UI concept was requested during this event; it is a design reference, not reconstruction evidence.

### 10:58:18 AM — local interaction verification completed

Browser plugin inspection verified home selection, furniture sizing, nearby category selection, and mode controls, with no captured page errors. A separate local Playwright/Chromium run verified actual keyboard movement, back-wall collision, exit through the front doorway, home switching, king-bed change, unfurnished/restored state, lighting/reset, commute play/pause/scrub-to-arrival, reduced-motion startup, and nearby categories. Desktop 1536×1024, tablet 768×1024, and mobile 390×844 were checked; no horizontal overflow or page errors were observed. Screenshots and verification JSON are kept outside the public repo.

The first external recording launch failed because the installed Playwright expected a different browser revision; the existing local Chromium was then selected. The sandbox blocked that browser's launch, and the native-approved retry succeeded. Browser remained the tool for in-app inspection; local Chromium supplies recording and repeatable input checks because Browser's exposed controls have no recording method.

### 11:00:20 AM — working-flow capture complete; documentation and formatting

Current clock checked. The local recording run completed successfully before noon. The screen capture was then encoded as a 60-second MP4. This is a silent working-flow capture, not proof of a real listing or a submitted presentation.

Implemented from the participant's new requirements: two synthetic home layouts, procedural furnishings, orbit and walk navigation, wall/furniture collision, a front doorway leading outside, a car following an illustrative road route, commute playback controls, queen/king bed footprints, unfurnished and lighting controls, and a Nearby view with eight example categories.

Applied the participant's feedback: removed the work-desk example; changed the heading/tagline to moving decisions before visiting; added moving-oriented controls, nearby essentials, and a clear explanation of what is currently verified. No backend photo retrieval, runtime model editing, listing issue detection, geographic routing, real nearby places, or runtime multi-agent execution has been built. These remain proposed integrations, not completed capabilities.

Dependencies: Three.js 0.186.0 (MIT), Vite 8.3.0 (MIT), exact versions locked. Installed transitive package license identifiers and shipped notices are documented in DEPENDENCIES.md and THIRD_PARTY_NOTICES.md. No stock photos, textures, maps, or pre-event implementation files were imported. An initial dependency install encountered a DNS error; subsequent installation succeeded and npm reported zero known vulnerabilities at install time.

The generated concept was inspected alongside actual desktop and mobile screenshots. Intentional differences: original procedural 3D geometry instead of the concept's raster room; numbered home selectors instead of fake listing photos; participant-requested revised copy, moving controls and Nearby mode; synthetic-data disclosures. White app surfaces, green actions, sidebar/canvas arrangement, typography hierarchy, mode selection and responsive controls were visually checked. This is a working minimal prototype, not a claim of photorealistic fidelity or final submission readiness.

### 11:01:40 AM — recording metadata verified

ffprobe confirmed H.264, 1280×900, exactly 60.000 seconds. Sample frames from the commute and Nearby portions were inspected. The file remains local outside the public repo; nothing has been submitted or uploaded. Formatting completed, both unit tests passed again, and the production build passed. Vite reports a non-blocking bundle-size warning (576.58 kB minified JavaScript, 145.32 kB gzip); no split was added for this small prototype.

### 11:10:48 AM — listing-first dogfood flow verified

Added URL intake directly below the heading. Researched public listing facts during this event and bundled two explicit snapshots: 95 Wall Street #2308 and archived Zephyr Lofts #501. The running app does not fetch URLs or call Astra. The 95 Wall preview uses reported area and studio type; geometry and furniture positions are inferred, not measured. Unsupported links explain the current two-example limit. No listing images or page copies are distributed; source links and attribution are documented. No new dependencies.

Four unit tests and production build passed. Browser checks verified listing review, studio walking, archived status, stale-scene clearing, unsupported links, and no overflow at 768px/390px. A missing selector was found and fixed before the successful rerun; zero page errors in the passing run. The sandbox blocked Chromium launch; native-approved launch was used. Screenshots and verification JSON are outside the public repo.
