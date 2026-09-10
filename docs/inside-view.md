# Inside view integration

This independently mounted, desktop-only module renders a reviewed nominal 2D region and links to selected listing evidence. It makes no provider requests, copies no publisher artwork and introduces no dependencies. Source-only listings get an explicit missing-geometry state.

## Mounting contract

```js
import { mountInsideView } from './inside-view/index.js';

const insideView = mountInsideView(container, {
  onInspectPlan: ({ sourceUrl, listing }) => {
    // Explicit user action. Reuse the existing budgeted inspection adapter.
    planInspection.inspect(sourceUrl);
  },
  onOpenPlans: ({ listing, region }) => {
    setPlansOpen(true); // Existing native modal; retain its camera state.
  },
  onAction: (receipt) => {
    // Optional local-action receipt, never a claim of a live Astra call.
  },
});
insideView.update({ selectedListing, acceptedRegion, priorities, active: true });
// Off-tab: pause all UI/agent actions without destroying camera or comparison.
insideView.setActive(false); // also available as deactivate()
insideView.setActive(true);
// Optional validated local / agent action:
insideView.dispatch({ type: 'zoom', listingId: selectedListing.id, factor: 1.2 });
// Teardown removes owned DOM and all listeners.
insideView.destroy();
```

`update` also accepts `listing` as an alias for `selectedListing`. A selected-listing or region change clears camera, comparison and disclosures. Updating the same selection preserves the view. Priorities are accepted as context without fabricating evidence from them. `getState()` returns an independent snapshot.

The module imports its scoped stylesheet. It consumes the designer’s `--ui-*` tokens with fallbacks and adds `.ui-button`, `.ui-field`, `.ui-chip`, `.ui-panel` and `.ui-disclosure` classes while retaining scoped layout rules. No shared stylesheet is edited. `active: false` in a full context update, `setActive(false)` or `deactivate()` makes the root inert, stops pointer dragging and blocks UI/agent handlers; no pending requests exist in this module. Host-started inspection requests remain owned by the existing host adapter.

The module imports its scoped stylesheet. Give the container a bounded height and `min-width: 0; min-height: 0`. The module owns its internal scroll. On current main, direction should:

1. Replace the children of `#inside-surface` with the mount; remove the old `#inside-plan`, `#inside-empty`, `#inside-source` writes in the `inside` branch of `setMode`.
2. Update the mount whenever selected listing / accepted region changes, including clear-selection paths. Do not mount/unmount on every view toggle: retaining the mount preserves camera state across Overview / Inside / Plans.
3. Replace `.desktop-shell #inside-surface`'s `padding: 32px 32px 330px; display: grid; place-items: center` with `padding: 0; display: block; overflow: hidden`. Preserve its existing stage positioning and `[hidden]` rule.
4. Hide the floating `#evidence-stage` while Inside is active so it does not cover the new inspector. If the source-inspection callback opens the existing evidence panel, make that panel visibly accessible for the inspection result (or take the user to Overview with its source disclosure expanded). Keep the current native Plans modal and shared-header button.
5. Pass `onInspectPlan` only when the host can expose the existing report; omit it otherwise. No invisible/background inspection is started by this module.

These are integration instructions, not modifications to shared files. Direction owns integration and its full-shell QA.

## Geometry and furniture boundary

`resolveInsideContext` reuses `acceptInspectedRegion` and the current trusted inspected records. Incoming geometry must match the selected building/unit, accepted ID and nominal dimensions. The adapter rebuilds canonical geometry from the trusted record: extra incoming walls, openings or ceilings cannot leak through. The optional mount `records` argument can carry additional independently reviewed records accepted by the same adapter. Runtime model observations never belong in that trusted collection without review.

The current accepted Charles & Co region remains partial: printed 11′6″ × 11′4″, unknown dimension endpoints, closet/entry excluded, no surveyed clear floor. No 3D room, wall, door, window, lighting study, collision model or furniture-placement guarantee is produced.

The footprint comparison accepts explicit object width/depth in metres and draws two separate rectangles at the same scale. It is reversible, unplaced and never computes clearance or says that an object fits. No default object measurement is supplied. Real placement would require a separate accepted clear-floor boundary with obstructions/openings and confirmed object dimensions; a nominal rectangle does not meet that requirement.

Astra's development role is implementation and test assistance. This module's runtime role is deterministic local control. An authorized host can call the same validated `dispatch` function after an agent proposes an action. Only the host's explicit inspection callback reaches the existing bounded Astra service. No live Astra claim is made for local view operations.

## Supported commands

Every command requires `listingId` equal to the current selected listing; every command requires an accepted region. Unknown commands and invalid numeric parameters throw before mutation.

| Type | Parameters | Result |
| --- | --- | --- |
| `zoom` | finite `factor`, >0 and ≤4 | Clamp zoom to 0.6–3 |
| `pan` | finite `dx`, `dy`, in SVG view units | Clamp each axis to ±600 |
| `reset_view` | none | Restore centered 100% view |
| `set_dimensions` | boolean `visible` | Toggle dimension annotations |
| `set_unit` | `unit`: `ft` or `m` | Change annotation units |
| `compare_object` | finite `width`, `depth`, each 0.1–10 m | Separate unplaced footprint |
| `clear_comparison` | none | Remove footprint |

The keyboard canvas supports arrows, +/− and Home/Escape. Pointer drag pans; Ctrl+wheel zooms. Ordinary wheel scroll remains available for the inspector. Controls have visible keyboard focus. There are no animations, and reduced-motion CSS disables inherited animation/transition effects.

## Independent verification

```sh
npm ci
npm test
npm run build
node scripts/inside-view-build.mjs
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5181 --strictPort
# Open http://127.0.0.1:5181/scripts/inside-view-harness.html
# Stop the temporary server after QA.
```

The isolated build uses a fresh temporary directory and does not change shared Vite configuration or normal build output. The main build cannot by itself prove this unmounted module bundles; the independent build covers it.

On September 10, 2026, the first slice passed all 130 existing/new tests and both builds. Seven new tests cover identity rebinding, all bundled unsupported listings, altered geometry, another mapped unit, numeric/action validation, stale agent commands, reversible comparisons and source-link safety. Initial test execution before `npm ci` failed due to missing worktree dependencies; after installing the exact lockfile, all passed. The existing main bundle-size warning remains.

Browser QA in the isolated harness used the actual 312px desktop sidebar width at 723×856 and 1144×853. Verified: dimensions and unit switching, zoom, keyboard pan/reset, pointer drag, same-selection camera preservation, explicit inspection/Plans callbacks, separate footprint comparison/removal, provenance disclosure, source-only and empty states, no stale region when a Wall Street listing receives Charles geometry, zero horizontal overflow at the smaller desktop size, and reduced-motion styles (`animation: none`, `transition: 0s`) with working controls. Off-tab deactivation rejected an agent zoom at 120%; resuming retained 120% and the next zoom reached 144%. Browser console returned no warnings or errors. Screenshots were saved privately in `/tmp/inside-view-qa/1144x853-region.png`, `/tmp/inside-view-qa/723x856-region.png`, `/tmp/inside-view-qa/1144x853-comparison.png` and `/tmp/inside-view-qa/723x856-unsupported.png`. Temporary browser viewport/media overrides were reset. Full-shell integration and live inspection are not claimed by this independent harness.
