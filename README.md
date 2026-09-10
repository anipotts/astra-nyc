# Elsewhere

See what life could be like in your next home

A local prototype for comparing the space, commute, and daily essentials around a possible home. Built during the Astra NYC hackathon hosted by Cerebral Valley.

## Run locally

```sh
cd ~/Code/hackathons/astra-nyc
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Tested with Node.js 25.8.2 and npm 11.11.1. WebGL is required. The server binds to localhost.

```sh
npm test
npm run build
```

## What works

- Start with address/building search, with a secondary listing-link field and no synthetic apartment loaded. Local address aliases and known URLs resolve to bundled source snapshots: 95 Wall Street #2308, archived Zephyr Lofts #501, or Journal Square Urby #409/#1504. Explicit online submissions use a bounded Astra web search for up to three source-linked candidates in NYC or Jersey City. Discovery candidates open evidence-only Overview records; known archived records retain their warning. The last selected known real example resumes on reload. Geographic address validation, floor-plan upload and full listing import are not implemented.
- Use a compact, full-viewport canvas with one mode selector and one change field. The document does not scroll; places and accuracy details can be collapsed.
- Review dated source facts and unknowns. Real listings are evidence only: no dimensional interior or fit result is generated from reported square footage. Linked Urby plan references have not established usable scale or authorization for reproduction.
- Enter the explicitly labeled synthetic demo to switch between current and potential homes with illustrative routes. Plans, 3D geometry, collision boundaries, clearance and SVG/PDF exports share one canonical layout. Select objects, toggle dimensions, inspect empty/furnished states, undo changes and retain arrangements in this browser using IndexedDB. Empty removes movable furniture while keeping fixed kitchen fixtures.
- Add approximate green-seat and black-shelf previews, select an item, nudge it, rotate it by quarter turns, remove it, or Undo. Personal objects persist with the arrangement. Actual product identities and dimensions are unknown; hypothetical preview sizes do not establish fit. Fixed fixtures remain inspect-only. These direct commands use the same validator as supported Astra scene edits, without model calls.
- Orbit the home or walk at eye level. Focus the scene, use WASD to move, arrow keys to turn, or drag to look. On-screen buttons also support movement. Walls and furniture have collision boundaries; the front doorway leads outside.
- Ask Astra to resize the bed, hide or restore the bed, sofa, table group, or all furnishings, and change daylight/evening lighting in any existing home preview. Table edits affect the full table group and attached chairs. Local preview buttons still work without API access.
- Follow an animated car along an invented road route. Pause, replay, or scrub the commute; reduced-motion users start paused.
- Explore example locations for groceries, transit, EV charging, gas, restaurants, shopping, healthcare, and airports.

## What the demo does not establish

Public listing facts were researched during development on September 10, 2026 and bundled in src/listings.js. The example picker opens these snapshots; it does not import arbitrary page contents or analyze photographs. Separately, submitted searches can discover candidate source links using Astra web search; their details and availability remain unverified. Source links open the original listing and gallery. Listing availability and prices can change. The interior and car-demo streets, routes, and example nearby places are synthetic. The separate 95 Wall neighborhood map uses live OpenFreeMap tiles sourced from OpenStreetMap; the listing map pin is approximate. Earlier recordings contain an inferred studio sketch; the current interface no longer enables it from listing area. Synthetic scenes are not a verified reconstruction, furniture-fit guarantee, current-condition inspection, or solar study.

Astra assists development of the scene and app. The running product has an optional localhost-only Astra endpoint for validated scene edits across the two synthetic home previews. Earlier runtime evidence also includes an inferred studio that is now gated from the listing interface. Live gpt-6-astra bed resizing, sofa hiding, evening lighting, and cached replay were verified during the event. The client supplies the current model dimensions, lighting, bed size, and visibility state; the endpoint does not require a particular address or listing ID. The server reads OPENAI_API_KEY from the local environment or ignored .env.local; credentials are never bundled into the client. Local controls still work without credentials. The endpoint validates the returned edit, caches it in server memory, and leaves movement/rendering local. It does not launch runtime agents or reconstruct listing photos.

## Interface and geographic context

The interface uses PNG exports of the participant-approved event-generated home-to-home artwork, live system-font text, compact listing controls, one view selector and one chat composer. The places drawer starts collapsed on small or short screens. Source status stays visible and full uncertainty details remain accessible. Plans opens in a separate modal with native keyboard focus and Escape dismissal; opening it does not resize or move the scene. The four view tabs stay associated with the selected home, and unavailable real-home views explain the missing evidence. No font or icon library was added.

95 Wall opens a separate MapLibre/OpenFreeMap neighborhood map with source attribution, camera pullback and “Go directly.” A fade returns to listing evidence. The pin is approximate; no verified driving route is available. Original recordings are preserved; they show earlier scope and are not proof of the current source gate.

## Address and listing discovery

Typing only searches bundled examples locally. Submit Search, Search online, or a supported unknown listing link to use OpenAI. The local endpoint accepts one query, allows three provider attempts per server start, and caches/coalesces equivalent queries for thirty minutes. Each request uses gpt-6-astra, low reasoning, at most two web-search tool calls and 2,048 output tokens. Results require a completed search receipt and supported HTTPS URLs present in actual tool sources/citations. Current domains: StreetEasy, Zillow, Realtor.com, Apartments.com and Urby. Links are shown for source review; no page copies, photos, resident information or inferred room geometry are imported. No geocoder or new SDK package was adopted. Search queries/results remain in server memory; store:false is set for the Responses request. Provider data handling still applies.

Live search and a cached browser replay were verified during the event; this is discovery proof, not a verified current listing or floor plan.

## Next integration, not implemented

Furniture evidence lookup should accept a photo, link, or description, use visual reasoning and bounded web search to find likely product variants and original specifications, and ask for confirmation when identity is ambiguous. No measurement form is required for previews. Automatic product search, matching, dimension recovery, and Astra manipulation of personal objects are not implemented. Single-image appearance alone does not establish real scale. Cache confirmed evidence per object; movement stays local.

Replace the bundled snapshots with a live, bounded listing importer. Use the participant's listing inputs to collect attributable photo evidence with source URLs and observation dates. Separate visible details from inferred geometry and unknown conditions. Generate a validated scene description and bounded edits, then render locally with Three.js. Verified driving routes, travel times, and filtered nearby-business details remain unimplemented. A photo cannot establish every issue or guarantee a listing's present condition.

## Build provenance

See [BUILD_LOG.md](BUILD_LOG.md) for the event boundary, actual milestones, verification, and remaining work. This task encountered earlier context during initial scaffolding; the log records that exposure. Timestamps alone are not proof of originality.

See [DEPENDENCIES.md](DEPENDENCIES.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for external dependencies and licenses. Private event details, credentials, and conversation exports are excluded from this repository.

## Runtime scope

The local Vite dev/preview endpoint accepts at most ten model attempts per server start, caps output at 2,048 tokens, and caches equivalent requests. Supported model edits are king/queen sizing of the existing bed, visibility of the bed/sofa/table group/all furnishings, and day/evening lighting. Each request applies one validated action; unsupported compound changes, arbitrary object creation, and individual-table targeting are not supported. Invalid responses or responses for a scene changed during the request leave the scene unchanged. Scene dimensions and state participate in cache identity. The original bed-only endpoint is retained for the baseline flow, while the composer uses /api/astra/scene-edit. The deployed static bundle alone does not include a hosted API. Do not expose the local development endpoint publicly.
