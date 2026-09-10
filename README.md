# Elsewhere

Decide where to move. Before you visit.

A local prototype for comparing the space, commute, and daily essentials around a possible home. Built during the Astra NYC hackathon hosted by Cerebral Valley.

## Run locally

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Tested with Node.js 25.8.2 and npm 11.11.1. WebGL is required. The server binds to localhost.

```sh
npm test
npm run build
```

## What works

- Start with a listing URL immediately below the heading. Two researched example snapshots are supported: 95 Wall Street #2308 and archived Zephyr Lofts #501. Other URLs show an explicit unsupported state without fetching data.
- Review dated source facts and unknowns, then walk an inferred 95 Wall studio sketch. Its 575 ft² area and studio type come from the listing; the rectangular footprint, windows, furnishings, and placement are invented.
- Switch between a synthetic current home and a potential home with illustrative routes.
- Orbit the home or walk at eye level. Focus the scene, use WASD to move, arrow keys to turn, or drag to look. On-screen buttons also support movement. Walls and furniture have collision boundaries; the front doorway leads outside.
- Compare queen and king bed footprints, remove furnishings, and change daylight/evening lighting.
- Follow an animated car along an invented road route. Pause, replay, or scrub the commute; reduced-motion users start paused.
- Explore example locations for groceries, transit, EV charging, gas, restaurants, shopping, healthcare, and airports.

## What the demo does not establish

Public listing facts were researched during development on September 10, 2026 and bundled in src/listings.js. The running app matches two exact listing URLs to these snapshots; it does not fetch arbitrary pages or analyze photographs. Source links open the original listing and gallery. Listing availability and prices can change. All streets, routes, nearby locations, and scene arrangements are synthetic; only the 95 Wall sketch area and studio type are source-informed. The scene is not a verified reconstruction, furniture-fit guarantee, current-condition inspection, or solar study.

Astra assists development of the scene and app. The running product now has an optional localhost-only Astra endpoint for bounded king/queen bed edits. It remains unavailable until secure API configuration is complete; no live model proof has been recorded yet. Local controls still work without credentials. The endpoint validates the returned edit, caches it in server memory, and leaves movement/rendering local. It does not launch runtime agents or reconstruct listing photos.

## Current graphics and geographic experiment

The inferred 95 Wall studio has procedural materials, rounded furniture, a cutaway overview, and geometry-derived bed clearance. These dimensions are inferred and cannot establish real fit. Its neighborhood opens a separate MapLibre/OpenFreeMap map with source attribution, camera pullback, “Go directly,” and a fade into the interior. The listing pin is approximate; no verified driving route is available. The initial recording remains the baseline.

## Next integration, not implemented

Replace the two bundled snapshots with a live, bounded listing importer. Use the participant's listing inputs to collect attributable photo evidence with source URLs and observation dates. Separate visible details from inferred geometry and unknown conditions. Generate a validated scene description and bounded edits, then render locally with Three.js. Real commute and nearby data require a geographic provider and source/license attribution. A photo cannot establish every issue or guarantee a listing's present condition.

## Build provenance

See [BUILD_LOG.md](BUILD_LOG.md) for the event boundary, actual milestones, verification, and remaining work. This task encountered earlier context during initial scaffolding; the log records that exposure. Timestamps alone are not proof of originality.

See [DEPENDENCIES.md](DEPENDENCIES.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for external dependencies and licenses. Private event details, credentials, and conversation exports are excluded from this repository.
