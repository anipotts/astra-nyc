# MiMA 48H: nominal dimensions, no accepted rectangular region

Reviewed September 10, 2026 at 19:23:44 UTC during the event. The official H-line PDF was freshly retrieved, text-extracted and visually inspected as a complete rendered page at 1800px. No live model call, browser preview, calibrated geometry or new dependency was used.

## Finding

The publisher's drawing explicitly covers H residences on floors 39 through 50. This includes the named 48H unit at the unit-group level. It does not establish its current construction or condition. The drawing contains the reported living/dining and sleeping-alcove dimension pairs, but neither labeled space provides an unambiguous, dimensioned rectangular subregion.

**Keep `acceptedGeometry: null`.** `src/nyc-plan-records.js` exports an empty `nycInspectedPlans` collection and a separate immutable `nycPlanStudies` observation. The observation is intentionally incompatible with `acceptInspectedRegion`; supplying nominal labels alone must not unlock a room. Existing Charles evidence is unchanged and cannot pass acceptance under the MiMA identity.

## Sources and acquisition

- [Official MiMA H-line PDF](https://www.relatedrentals.com/sites/default/files/2021-04/MiMA_H_39-50.pdf), page 1, publisher Related Rentals. Fresh HTTPS retrieval produced a one-page, 51,579-byte PDF. SHA-256: `b403ebd402eac922dc6b7d5b8e55be673c37ec15516cc6bef357f26bf46531f9`.
- [Official 48H unit page](https://www.relatedrentals.com/apartment-rentals/new-york-city/midtown-manhattan/mima/studio-1-bath-31510). Freshly opened during this review; it identifies the building at 450 West 42nd Street and says the apartment is no longer available. Direction should preserve it as an archived source, not advertise present availability.
- Private inspection files remain in `/tmp/elsewhere-nyc-plan-study/`. The original PDF and rendering are not copied into Git or redistributed through the UI.

The PDF's embedded creation and modification metadata dates the artwork to February 21, 2011; its embedded title is `699_39H`. No publication date is visibly printed. The `2021-04` URL directory is not a publication-date claim. The PDF qualifies dimensions as approximate. Original artwork reuse rights remain unresolved.

## Dimension-to-region inspection

| Source label | Printed nominal dimensions | Why no rectangle was accepted |
| --- | --- | --- |
| Living/dining | 11′10″ × 15′0″ | The lower-right boundary steps inward near the facade. The left edge is open to shared circulation around a projecting closet, and the kitchen edge changes the northern extent. No dimension endpoints identify which spans the label measures. |
| Sleeping alcove | 9′4″ × 11′5″ | Closet projections interrupt the upper/right area, the right side has an open connection, and the lower-left boundary steps inward near the facade. The drawing does not identify a dimensioned rectangle excluding those features. |

The living area looks broadly rectangular, but using the full printed pair for a clear rectangle would silently include or exclude the unknown jog/obstruction dimensions. Cropping away those portions changes the usable spans; the source gives no new dimensions for the cropped rectangle. An enclosing nominal rectangle would also fail to describe the actual boundary. Visual proportions alone do not resolve this correspondence.

The same problem applies more strongly to the sleeping alcove. Room labels are evidence of reported size, not a calibrated polygon or a furniture clearance envelope. Unlike the accepted Charles partial-region interpretation, no defensible labeled rectangular subregion can be isolated here with this review's evidence.

The small floor-position diagram identifies relative placement only. It is not used to infer geographic orientation, window direction, exterior access or interior-to-map alignment. Visible drawn openings and fixtures are unmeasured; no walls, doors, windows, ceiling height or as-built coordinates were accepted. Promotional text about lobby height is unrelated to apartment ceiling height.

## Identity and source discrepancy

The official unit page describes a studio; the group PDF describes a junior one-bedroom. Preserve both descriptions as a source discrepancy. The explicit H/floor mapping supports association with 48H, but it does not resolve this classification difference or prove a current exact-unit layout.

If direction records the reviewed group association in `nycListings`, the identity for a future independently accepted record should be:

```js
identity: {
  building: 'mima-450-west-42nd',
  unit: '48H',
  label: 'MiMA #48H',
},
planScope: 'unit_group',
// Keep acceptedGeometry null and dimensionalReadiness needs-evidence.
```

This identity alone unlocks nothing: there is no matching accepted MiMA record. Do not insert the study into `inspectedPlans`, change its method/schema to satisfy the adapter, or derive a rectangle from the printed numeric pairs. The existing generic source-only Inside state and external plan link are the supported result.

## Source-plan alternative and next evidence

Direction can show a compact link to the publisher plan, the two reported dimension pairs, the H/floors 39–50 scope, and the absence of accepted geometry. Open the publisher source externally; no embedded/copied artwork is provided by this change. Keep the nominal labels distinct from measurement controls and any furniture comparison. Existing optional source inspection can return observations, but its success does not accept geometry.

To accept a region later, obtain endpoint-marked dimensions or independently reviewed measurements tying a specific rectangle/polygon to its boundary. Separately establish the recesses, fixed obstacles and openings required for placement. A 3D room additionally needs supported vertical geometry. Current exact-unit and source-use questions remain separate. This review makes no furniture-fit, complete-interior, as-built or code-compliance claim.

## Verification and handoff scope

Only the new study data, its regression tests and this document belong to this change. No shared app, accepted Charles record, main catalog, preview or Inside view module is modified. Direction owns source-only UI wiring, listing availability wording and any future acceptance decision.

Tests check rejection by the canonical acceptance adapter, bounded unit-group mapping, retained nominal labels, unknown publication date, qualified artwork date, separate availability, immutable observations, and preservation of the Charles record. The PDF was reviewed visually and no rectangle was manufactured to satisfy the existing schema.

Verification completed September 10, 2026: `npm test` passed all 136 tests in this worktree (six new study tests), and `npm run build` passed with the existing large-chunk warning. The build checks the existing app; the data module is directly imported and exercised by the tests. No test server or model endpoint was started.
