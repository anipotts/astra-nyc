# NYC-focused demo catalog

The current direction is NYC only. `src/nyc-listings.js` exports ten entries: the nine candidates in the current-event NYC scout packet plus the existing 95 Wall record. The original catalog and Jersey City research below remain intact for archival reference. This data handoff does not switch the running app or perform new source checks.

**Primary recommendation: MiMA 48H.** Its [official H-line plan](https://www.relatedrentals.com/sites/default/files/2021-04/MiMA_H_39-50.pdf) is publisher-linked to floors 39–50; scout inspection recorded living 11′10″ × 15′ and alcove 9′4″ × 11′5″. Coordinate calibration is pending. The tour is a representative sample. No NYC case inherits Charles’s accepted region, and no new interior geometry or runtime pass is claimed. The Set F-type offers additional reported ceiling evidence, but it is not an identified unit.

| Case | Identity scope | Geographic evidence | Original source |
|---|---|---|---|
| MiMA #48H | unit | Existing approximate point | [Source](https://www.relatedrentals.com/apartment-rentals/new-york-city/midtown-manhattan/mima/studio-1-bath-31510) |
| Gotham Point South #2409 | unit | Existing approximate point | [Source](https://gothampoint.com/availability/) |
| 95 Wall Street #2308 | unit | Existing approximate point | [Source](https://streeteasy.com/building/95-wall-street-new_york/2308) |
| EOS #24F | unit | Existing approximate point | [Source](https://www.eosnomad.com/residences/studio/878484/) |
| Jasper #W410 | unit | Existing approximate point | [Source](https://jasperhp.com/availability/) |
| The Set #20E | unit · historical | Unresolved | [Source](https://www.relatedrentals.com/apartment-rentals/new-york-city/hudson-yards/the-set/studio-one-bath-53843) |
| The Set F-type studio | type | Unresolved | [Source](https://www.relatedrentals.com/sites/default/files/2022-08/TheSet_F_Floor15-PH1.pdf) |
| The Tate NE residence type | type | Unresolved | [Source](https://www.relatedrentals.com/sites/default/files/2021-04/Tate_StudioPH1E_N.pdf) |
| 260 Gold 15-line studio type | type | Unresolved | [Source](https://www.260gold.com/floorplans) |
| Avalon Bowery Place | building | Unresolved | [Source](https://www.avaloncommunities.com/new-york/new-york-city-apartments/avalon-bowery-place/) |

The Set 20E and F-type remain separate records at the same building. 20E was unavailable on the opened page during the September 10 research despite an available search snapshot; no F-type plan is assigned to 20E. Tate’s NE plan title and studio filename differ. 260 Gold remains an uninspected candidate type after a past image-access failure. Avalon Bowery is building-only. None establishes current availability or included furniture inventory.

Integration exports: `nycListings`, `nycListingIds`, `nycPrimaryListingId`, and `nycPrimaryCase`. Each record distinguishes `evidenceScope` from `planScope`; type/building records have `unit: null`. `geographicLocation` only reuses a previously reviewed point, otherwise null with `geographicStatus: "unresolved"`. New source hosts `260gold.com` and `avaloncommunities.com` require the integration owner to update the source-link policy where needed; this patch does not alter fetch permissions, discovery, or the geographic resolver. No previews, models, downloads or geocoding were run.

---

# Prior NYC/Jersey City research (retained)

Ten chosen cases: four NYC and six Jersey City, plus three retained legacy sources (13 total). Six unselected reserves remain outside the repository. This patch restores current-event research from September 10, 2026 and its independent candidate audit; it performs no new source checks and changes no evaluation outcomes or accepted geometry.

- **Charles & Co #345:** Existing accepted bedroom region and evaluation outcome unchanged. The mapped marketing plan is not a full measured interior; extracted-only scale metadata must not be applied automatically. [Original source](https://silvermanbuilding.com/wp-content/uploads/CC_1Bed_45Line.pdf).

- **MiMA #48H:** 48H links to the H-line floors 39–50 plan. Approximate printed dimensions await coordinate calibration; the Sample Alcove Studio tour is representative. [Original source](https://www.relatedrentals.com/apartment-rentals/new-york-city/midtown-manhattan/mima/studio-1-bath-31510) · [Plan](https://www.relatedrentals.com/sites/default/files/2021-04/MiMA_H_39-50.pdf) · [Sample tour](https://my.matterport.com/show/?brand=0&m=zppYDS4u2M8).

- **The One #2H:** The mapped PDF covers 2H–9H, 10J and 11L–33L. Independent full-page visual inspection resolved the scout’s earlier viewing limitation. Generic A1 has different geometry and remains separate. [Original source](https://theonenj.com/pdf/1bdrm-h2-9.pdf) · [Separate A1](https://theonenj.com/img/A1.jpg).

- **EOS #24F:** Representative images may differ from 24F. Floor-plan/360 labels were observed, but usable assets were not inspected. The source states a prior-written-consent requirement for republication; no legal conclusion is added. [Original source](https://www.eosnomad.com/residences/studio/878484/).

- **Jasper #W410:** Furnished/unfurnished drawings do not establish lease inventory. The linked asset was not inspected after timeout/403 responses during the September 10 research; current access has not been checked. [Original source](https://jasperhp.com/availability/) · [Plan](https://jasperhp.com/wp-content/uploads/2025/03/Classic_Studio_W410-W710-W809-W1009-W1108-W1207-1024x666.png).

- **65 Newkirk tour type:** Public playback of the one-bedroom/one-bath + den/balcony tour was observed. Identity is building/type, with no exact unit, measurements, mesh access or asset-export permission established. [Original source](https://www.live65newkirk.com/virtualtours) · [Plan](https://www.live65newkirk.com/s/0_65-newkirk-1bd-w-balcony_0_1-copy.png) · [Building/type tour](https://my.matterport.com/show/?m=MU3hFyq1obs).

- **Plaza Apartments studio type:** Studio type reports 320 ft²; no linear dimensions were verified. The waiting list was observed closed on September 10, independently of geometry. Current availability and measured accessibility remain unknown. [Original source](https://rnhousing.org/properties/plaza-apartments/) · [Plan](https://rnhousing.org/wp-content/uploads/2024/07/floor-plan-plaza.pdf).

- **Zephyr Lofts #501:** StreetEasy history reports 1,434 ft² / 2 baths in 2018 and 2024, versus 1,087 ft² / 1 bath in 2021. ApartmentFinder describes two levels and 18-foot ceilings. Keep these historical claims distinct; no scaled plan established. [Original source](https://streeteasy.com/building/zephyr-lofts/501) · [StreetEasy history](https://streeteasy.com/building/zephyr-lofts/) · [ApartmentFinder](https://www.apartmentfinder.com/New-Jersey/Jersey-City-Apartments/689-Marin-Blvd-Apartments-d5hp13h).

- **Gotham Point South #2409:** South 2409 maps to Residence 09, floors 19–29. The exact linked asset is JPEG, with approximate printed dimensions awaiting calibration. Preserve corrected South address 56-27 2nd Street; leasing aliases are not unit entrances. [Original source](https://gothampoint.com/availability/) · [Plan](https://gothamproperties.file.force.com/sfc/dist/version/download/?asPdf=false&d=%2Fa%2FPW00000BkVMC%2FObLJwDbQBIERvwT9YfW8j3gReFSMzeDQsGDjQhJzZwE&ids=068PW000013OReS&oid=00DfI00000L4WTx).

- **Cast Iron Lofts #5J:** CIL1 5–6J on floors 5–6 reports 696 ft² and explicitly qualifies the drawing as potentially not to scale. Area alone cannot establish room dimensions or furniture clearance. [Original source](https://castironlofts.com/floorplans/cil1_5-6j/) · [Plan](https://castironlofts.com/assets/files/Binder1-31.pdf).

