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

- Switch between two synthetic homes with different floor areas and illustrative routes.
- Orbit the home or walk at eye level. Focus the scene, use WASD to move, arrow keys to turn, or drag to look. On-screen buttons also support movement. Walls and furniture have collision boundaries; the front doorway leads outside.
- Compare queen and king bed footprints, remove furnishings, and change daylight/evening lighting.
- Follow an animated car along an invented road route. Pause, replay, or scrub the commute; reduced-motion users start paused.
- Explore example locations for groceries, transit, EV charging, gas, restaurants, shopping, healthcare, and airports.

## What the demo does not establish

All homes, dimensions, streets, routes, and nearby locations are synthetic. No real listing, address, photograph, business information, distance, or travel time has been fetched. The scene is not a verified reconstruction, furniture-fit guarantee, current-condition inspection, or solar study.

Astra assists development of the scene and app. The running product has no live model connection: its controls edit local state deterministically. It does not launch runtime agents or claim that a model processed a listing. API credentials are not required for this version.

## Next integration, not implemented

Use the participant's listing inputs to collect attributable photo evidence with source URLs and observation dates. Separate visible details from inferred geometry and unknown conditions. Generate a validated scene description and bounded edits, then render locally with Three.js. Real commute and nearby data require a geographic provider and source/license attribution. A photo cannot establish every issue or guarantee a listing's present condition.

## Build provenance

See [BUILD_LOG.md](BUILD_LOG.md) for the event boundary, actual milestones, verification, and remaining work. This task encountered earlier context during initial scaffolding; the log records that exposure. Timestamps alone are not proof of originality.

See [DEPENDENCIES.md](DEPENDENCIES.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for external dependencies and licenses. Private event details, credentials, and conversation exports are excluded from this repository.
