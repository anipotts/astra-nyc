// Public listing facts inspected during the event; these are bundled snapshots,
// not responses from a live importer. Listing photos are not redistributed.
export const listings = [
  {
    id: "wall2308",
    mapAddress: "95 Wall Street, New York, NY",
    url: "https://streeteasy.com/building/95-wall-street-new_york/2308",
    name: "95 Wall Street #2308",
    location: "Financial District, Manhattan",
    facts: "Studio · 1 bath · 575 ft²",
    price: "$4,564 / month base rent",
    availability: "Listed as available when checked; confirm with the source.",
    checkedAt: "2026-09-10T15:08:03Z",
    archived: false,
    questions:
      "Confirm the unit-specific floor plan, window orientation, actual light, noise, total fees, and current condition. Listing photos may show representative spaces.",
    scene: null,
    dimensionalReadiness: "needs-measurement",
    furnishingStatus: "unknown",
  },
  {
    id: "zephyr501",
    mapAddress: "689 Marin Boulevard, Jersey City, NJ",
    url: "https://streeteasy.com/building/zephyr-lofts/501",
    name: "Zephyr Lofts #501",
    location: "689 Marin Boulevard, Jersey City",
    facts:
      "Historical 2-bed listing · conflicting area and bath records",
    price: "$3,950 / month historical base rent",
    availability:
      "2024 StreetEasy record archived July 16, 2024; ApartmentFinder also showed unavailable in the September 10, 2026 research. Current availability is unknown.",
    checkedAt: "2026-09-10T15:08:03Z",
    archived: true,
    questions:
      "StreetEasy history reports 1,434 ft² / 2 baths in 2018 and 2024, versus 1,087 ft² / 1 bath in 2021. ApartmentFinder describes bedrooms on two levels and reports 18-foot ceilings. Confirm the current configuration, floor connections and measurements; these historical claims have not been reconciled.",
    scene: null,
    readinessReason:
      "No matching scaled plan was found in the September 10 research. The reported duplex arrangement and ceiling height do not establish complete geometry; do not combine conflicting historical dimensions into one layout.",
  },
  {
    id: "urby409",
    mapAddress: "532 Summit Avenue, Jersey City, NJ",
    url: "https://www.urby.com/location/journal-square/availability/unit-409-1-5031127",
    name: "Journal Square Urby #409",
    location: "532 Summit Avenue, Jersey City",
    facts: "1 bed · 1 bath · 523 ft² reported · plan M1",
    price: "Check source for current rent",
    availability: "Reported available when checked; confirm with source.",
    checkedAt: "2026-09-10T16:03:12Z",
    archived: false,
    furnishingStatus: "unknown",
    dimensionalReadiness: "needs-measurement",
    planUrl:
      "https://medialibrarycf.entrata.com/15790/MLv3/4/22/2024/05/15/020231/664514d7b7b286.00950225554.png",
    readinessReason:
      "Official unit-specific plan reference found. Usable scale and permission for reuse are not established. Provide an authorized dimensioned plan or measured room dimensions; no dimensional interior has been generated.",
    questions:
      "Confirm drawing scale, room dimensions, permitted plan reuse, included furnishings, current availability and condition. The source terms restrict reuse; no plan image has been copied into this app.",
    scene: null,
  },
  {
    id: "urby1504",
    mapAddress: "532 Summit Avenue, Jersey City, NJ",
    url: "https://www.urby.com/location/journal-square/availability/unit-1504-0-5031283",
    name: "Journal Square Urby #1504",
    location: "532 Summit Avenue, Jersey City",
    facts: "Studio · 1 bath · 442 ft² reported · plan S1",
    price: "Check source for current rent",
    availability:
      "Source reported October 31, 2026 availability; confirm with source.",
    checkedAt: "2026-09-10T16:03:12Z",
    archived: false,
    furnishingStatus: "unknown",
    dimensionalReadiness: "needs-measurement",
    planUrl:
      "https://medialibrarycf.entrata.com/15790/MLv3/4/22/2024/05/06/030951/6639471f64b840.09739297715.png",
    readinessReason:
      "Official unit-specific plan reference found. Usable scale and permission for reuse are not established. Provide an authorized dimensioned plan or measured room dimensions; no dimensional interior has been generated.",
    questions:
      "Confirm drawing scale, room dimensions, permitted plan reuse, included furnishings, current availability and condition. The source terms restrict reuse; no plan image has been copied into this app.",
    scene: null,
  },
  {
    id: "charles345",
    mapAddress: "272 Grove Street, Jersey City, NJ",
    identity: {
      building: "charles-272-grove",
      unit: "345",
      label: "Charles & Co #345",
    },
    url: "https://silvermanbuilding.com/wp-content/uploads/CC_1Bed_45Line.pdf",
    planUrl:
      "https://silvermanbuilding.com/wp-content/uploads/CC_1Bed_45Line.pdf",
    name: "Charles & Co #345",
    location: "272 Grove Street, Jersey City",
    facts: "1 bedroom · 1 bathroom · published Type 7 plan",
    price: "Rent not verified",
    availability: "Current availability not verified",
    checkedAt: "2026-09-10T17:13:27Z",
    archived: false,
    historical: true,
    scene: null,
    questions:
      "Historical 2015 plan; current conditions, full geometry and source artwork reproduction rights remain unverified.",
    readinessReason:
      "Inspected main bedroom region available in Plans. Historical nominal dimensions; remaining apartment, openings and ceiling height stay unknown.",
  },
  {
    id: "mima48h",
    mapAddress: "450 West 42nd Street, New York, NY 10036",
    url: "https://www.relatedrentals.com/apartment-rentals/new-york-city/midtown-manhattan/mima/studio-1-bath-31510",
    name: "MiMA #48H",
    location: "450 West 42nd Street, New York, NY 10036",
    facts:
      "Alcove studio · 1 bath · H-line, floors 39–50",
    price: "Check source for current rent",
    availability:
      "Current availability not verified; confirm with the original source.",
    checkedAt: "2026-09-10",
    archived: false,
    scene: null,
    dimensionalReadiness: "needs-evidence",
    furnishingStatus: "unknown",
    questions:
      "The official 48H page links the H-line plan for floors 39–50. The linked tour is titled Sample Alcove Studio and is representative, not an exact-unit record. Confirm the current unit condition, dimensions and source reuse terms.",
    readinessReason:
      "September 10 plan inspection recorded approximate living dimensions of 11′10″ × 15′ and alcove dimensions of 9′4″ × 11′5″. These printed labels are not calibrated coordinates or a measured survey; other dimensions and heights remain unknown.",
    planUrl:
      "https://www.relatedrentals.com/sites/default/files/2021-04/MiMA_H_39-50.pdf",
    tourUrl:
      "https://my.matterport.com/show/?brand=0&m=zppYDS4u2M8",
    tourIdentity:
      "representative_sample",
  },
  {
    id: "theone2h",
    mapAddress: "110 First Street, Jersey City, NJ 07302",
    url: "https://theonenj.com/pdf/1bdrm-h2-9.pdf",
    name: "The One #2H",
    location: "110 First Street, Jersey City, NJ 07302",
    facts:
      "1 bed · 1 bath · mapped H/J/L residence plan",
    price: "Check source for current rent",
    availability:
      "Current availability not verified; confirm with the original source.",
    checkedAt: "2026-09-10",
    archived: false,
    scene: null,
    dimensionalReadiness: "needs-evidence",
    furnishingStatus: "unknown",
    questions:
      "The mapped PDF covers 2H–9H, 10J and 11L–33L. The same building’s generic A1 image has a different layout and must remain separate. Confirm which plan reflects 2H today and obtain any missing measurements.",
    readinessReason:
      "September 10 independent visual inspection confirmed printed bedroom dimensions of 12′11″ × 11′ and living/dining dimensions of 18′4″ × 13′4″ in the mapped PDF. The irregular outline still needs reviewed coordinate calibration; opening dimensions and ceiling heights remain unknown.",
    planUrl: "https://theonenj.com/pdf/1bdrm-h2-9.pdf",
  },
  {
    id: "eos24f",
    mapAddress: "100 West 31st Street, Manhattan, NY 10001",
    url: "https://www.eosnomad.com/residences/studio/878484/",
    name: "EOS #24F",
    location: "100 West 31st Street, Manhattan, NY 10001",
    facts:
      "Studio · 1 bath · representative marketing imagery",
    price: "Check source for current rent",
    availability:
      "Current availability not verified; confirm with the original source.",
    checkedAt: "2026-09-10",
    archived: false,
    scene: null,
    dimensionalReadiness: "needs-evidence",
    furnishingStatus: "unknown",
    questions:
      "The official page warns that model or representative images may differ from 24F and states that listing republication requires prior written consent. Confirm exact-unit imagery, current condition and the applicable source-use terms.",
    readinessReason:
      "Floor-plan and 360-view labels were observed on September 10, but usable assets were not inspected. Acquisition and unit matching remain unresolved; this does not establish that no plan exists. Representative images do not establish unit geometry or textures.",
  },
  {
    id: "jasperw410",
    mapAddress: "2-33 50th Avenue, Long Island City, NY",
    url: "https://jasperhp.com/availability/",
    name: "Jasper #W410",
    location: "2-33 50th Avenue, Long Island City, NY",
    facts:
      "Studio W410 · furnished/unfurnished plan illustrations",
    price: "Check source for current rent",
    availability:
      "Current availability not verified; confirm with the original source.",
    checkedAt: "2026-09-10",
    archived: false,
    scene: null,
    dimensionalReadiness: "needs-evidence",
    furnishingStatus: "unknown",
    questions:
      "Furnished and unfurnished plan displays are illustrations, not evidence of furniture included in a lease. Confirm any included inventory and whether the shared W410/W710/W809/W1009/W1108/W1207 asset matches the selected unit.",
    readinessReason:
      "In the September 10 research, the linked plan timed out through one reader and returned HTTP 403 through another; the image was not inspected. This is a past access result, not a current availability check. Plan content, scale and current condition remain unverified.",
    planUrl:
      "https://jasperhp.com/wp-content/uploads/2025/03/Classic_Studio_W410-W710-W809-W1009-W1108-W1207-1024x666.png",
  },
  {
    id: "newkirk65",
    mapAddress: "65 Newkirk Street, Jersey City, NJ 07306",
    url: "https://www.live65newkirk.com/virtualtours",
    name: "65 Newkirk tour type",
    location: "65 Newkirk Street, Jersey City, NJ 07306",
    facts:
      "1 bed · 1 bath + den and balcony · building/type tour",
    price: "Check source for current rent",
    availability:
      "Current availability not verified; confirm with the original source.",
    checkedAt: "2026-09-10",
    archived: false,
    scene: null,
    dimensionalReadiness: "needs-evidence",
    furnishingStatus: "unknown",
    questions:
      "The official page links a publicly viewable tour titled 1 Bedroom / 1 Bath + Den w Balcony. No apartment number was established. Confirm the unit/type match before using it to assess a listing, and confirm current availability.",
    readinessReason:
      "Public tour playback was observed on September 10. No measurements were taken, no mesh/API access was established, and the associated plan image was not inspected. Viewing the tour does not establish exact-unit geometry or permission to export its assets.",
    planUrl:
      "https://www.live65newkirk.com/s/0_65-newkirk-1bd-w-balcony_0_1-copy.png",
    tourUrl:
      "https://my.matterport.com/show/?m=MU3hFyq1obs",
    tourIdentity:
      "building_type",
  },
  {
    id: "plazastudio",
    mapAddress: "91 Sip Avenue, Jersey City, NJ 07306",
    url: "https://rnhousing.org/properties/plaza-apartments/",
    name: "Plaza Apartments studio type",
    location: "91 Sip Avenue, Jersey City, NJ 07306",
    facts:
      "Studio type · 320 ft² reported · no exact unit selected",
    price: "Check source for current rent",
    availability:
      "The owner page showed the waiting list closed on September 10, 2026. Current waiting-list status and unit availability have not been rechecked.",
    checkedAt: "2026-09-10",
    archived: false,
    scene: null,
    dimensionalReadiness: "needs-evidence",
    furnishingStatus: "unknown",
    questions:
      "Confirm current waiting-list status and the specific apartment/type. The source also includes 420 ft² one-bedroom A/B plans; keep those separate from the studio. Building accessibility language does not establish measured clearance within this layout.",
    readinessReason:
      "The studio source reports 320 ft², but no usable linear dimensions were verified in the September 10 research. Area alone cannot calibrate the drawing or establish furniture fit. This is building/type evidence, independent of current availability.",
    planUrl:
      "https://rnhousing.org/wp-content/uploads/2024/07/floor-plan-plaza.pdf",
  },
  {
    id: "gotham2409",
    mapAddress: "56-27 2nd Street, Long Island City, NY 11101",
    url: "https://gothampoint.com/availability/",
    name: "Gotham Point South #2409",
    location: "56-27 2nd Street, Long Island City, NY 11101",
    facts:
      "South Tower studio · Residence 09 · floors 19–29",
    price: "Check source for current rent",
    availability:
      "Current availability not verified; confirm with the original source.",
    checkedAt: "2026-09-10",
    archived: false,
    scene: null,
    dimensionalReadiness: "needs-evidence",
    furnishingStatus: "unknown",
    questions:
      "The official availability page linked South 2409 to Residence 09 on floors 19–29. The direct plan asset is JPEG despite its download-style URL. Keep the South Tower identity separate from North Tower and leasing addresses; confirm the actual entrance and current unit condition.",
    readinessReason:
      "September 10 visual inspection recorded approximate living dimensions of 17′ × 12′4″, openings, fixtures and a floor locator. Printed dimensions are not calibrated geometry; remaining lengths, ceiling heights and exact exterior alignment remain unverified.",
    planUrl:
      "https://gothamproperties.file.force.com/sfc/dist/version/download/?asPdf=false&d=%2Fa%2FPW00000BkVMC%2FObLJwDbQBIERvwT9YfW8j3gReFSMzeDQsGDjQhJzZwE&ids=068PW000013OReS&oid=00DfI00000L4WTx",
  },
  {
    id: "castiron5j",
    mapAddress: "300 Coles Street, Jersey City, NJ 07310",
    url: "https://castironlofts.com/floorplans/cil1_5-6j/",
    name: "Cast Iron Lofts #5J",
    location: "300 Coles Street, Jersey City, NJ 07310",
    facts:
      "1 bed · 1 bath · 696 ft² reported · CIL1 5–6J plan",
    price: "Check source for current rent",
    availability:
      "Current availability not verified; confirm with the original source.",
    checkedAt: "2026-09-10",
    archived: false,
    scene: null,
    dimensionalReadiness: "needs-evidence",
    furnishingStatus: "unknown",
    questions:
      "The official CIL1 plan names 5–6J on floors 5–6 and says the illustration may not be to scale and actual dimensions may vary. Confirm the building, entrance and 5J plan match, then request room measurements.",
    readinessReason:
      "September 10 research found reported area of 696 ft² but no usable room dimensions. The source’s not-to-scale qualification prevents treating this illustration as calibrated geometry; total area cannot establish room dimensions or furniture clearances.",
    planUrl: "https://castironlofts.com/assets/files/Binder1-31.pdf",
  },
];
export function identifyListing(input) {
  let url;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Paste a complete listing URL starting with https://.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port)
    throw new Error(
      "Use a public HTTPS listing link without login details or a custom port.",
    );
  const host = url.hostname.replace(/^www\./, "");
  const path = url.pathname.replace(/\/+$/, "");
  return (
    listings.find((listing) => {
      const known = new URL(listing.url);
      return (
        host === known.hostname.replace(/^www\./, "") && path === known.pathname
      );
    }) ?? null
  );
}

export const auditedExampleIds = [
  "charles345",
  "mima48h",
  "theone2h",
  "eos24f",
  "jasperw410",
  "newkirk65",
  "plazastudio",
  "zephyr501",
  "gotham2409",
  "castiron5j",
];
export const auditedExamples = auditedExampleIds.map((id) =>
  listings.find((listing) => listing.id === id),
);
export const additionalExamples = listings.filter(
  (listing) => !auditedExampleIds.includes(listing.id),
);
