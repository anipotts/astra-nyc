# Building notes integration

Register `createBuildingNotesMiddleware()` from `server/building-notes.js` in the existing Vite server/preview middleware stack. It owns only `POST /api/building-notes` and uses no model/key/account. Input: `{ address, borough?, refresh? }`; borough is optional when the full address identifies it.

Import `mountBuildingNotes` from this directory's `index.js` and mount it in the existing secondary Sources/Details area:

```js
const notes = mountBuildingNotes(container, { listing });
notes.setListing(nextListing); // aborts/discards old-property requests
// First opening loads once; subsequent checks use explicit Refresh/Retry.
notes.destroy();
```

The component begins collapsed and does not fetch on mount or camera changes. Its first opening starts one lookup for that selection; closing/reopening does not repeat it. Changing identity aborts, clears and collapses it, and the next selection waits for its own opening. Explicit Refresh/Retry remains after the first lookup. No default card, new view or prominent loader is added. Server results distinguish `completed_with_matches`, `completed_no_matches`, `ambiguous`, `not_supported`, and `unavailable`. Cache lasts 30 minutes (15 seconds for failure); refresh bypasses cached results. Equivalent concurrent queries coalesce; at most four are in flight, with a ten-second source timeout and 160 KB response cap.

Source: NYC HPD Housing Maintenance Code Complaints and Problems, `ygpa-z7cr`, daily update metadata verified September 10. Query matches exact house number, normalized street and borough over the preceding 730-day date window; at most 51 problem rows are retrieved to flag a 50-row display cap. Problem IDs deduplicate and related problems group by complaint ID. Multiple observed building IDs become ambiguous. No-match claims concern only that exact address, source and date window. No apartment identifiers, complainant contact fields, reviews, violation scores or geometry are collected.

Live checks at 2026-09-10T20:17Z succeeded for MiMA / 450 WEST 42 STREET and 95 WALL STREET, Manhattan. Their latest returned complaint IDs were 14939020 and 14805554. The first reported an inspection with no HPD violation observed; the second closed after an unsuccessful inspection-access attempt. These are agency complaint records, not proof of present unit conditions. Private replay receipts are in `/tmp/elsewhere-plan-qa/building-notes-{mima48h,wall2308}.json`; current source data may change. The middleware is verified locally; shared app wiring is owned by Direction.
