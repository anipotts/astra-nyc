import { listings } from "./listings.js";
import { getExampleLocation } from "./example-locations.js";
import { nycPlanStudies } from "./nyc-plan-records.js";

// Current-event NYC scout observations, September 10, 2026. No fresh retrieval.
// This is a separate catalog: the original NYC/Jersey City research stays intact.
const byId = new Map(listings.map((listing) => [listing.id, listing]));
function existing(id, scoutId, evidenceScope, unit, planScope) {
  const listing = byId.get(id);
  if (!listing) throw new Error(`Missing researched listing: ${id}`);
  const study = nycPlanStudies.find(item => item.listingId === id);
  return { ...listing, scoutId, evidenceScope, unit, planScope,
    ...(study ? {
      archived: study.listingObservation.archived,
      availability: study.listingObservation.availability,
      checkedAt: study.listingObservation.checkedAt,
      planStudy: study,
      questions: `${listing.questions} ${study.discrepancies.join(" ")}`,
    } : {}),
  };
}
function reserve(record) {
  return {
    checkedAt: "2026-09-10",
    price: "Rent not verified",
    availability: "Current availability not verified; confirm with the source.",
    archived: false,
    scene: null,
    dimensionalReadiness: "needs-evidence",
    furnishingStatus: "unknown",
    ...record,
  };
}

export const nycListings = Object.freeze([
  existing("mima48h", "nyc-mima-48h", "unit", "48H", "unit_group"),
  existing("gotham2409", "nyc-gothampoint-s2409", "unit", "South2409", "unit_group"),
  existing("wall2308", null, "unit", "2308", "unverified"),
  existing("eos24f", "nyc-eos-24f", "unit", "24F", "unverified"),
  existing("jasperw410", "nyc-jasper-w410", "unit", "W410", "uninspected_asset"),
  reserve({
    id: "set20e",
    scoutId: "nyc-set-20e",
    name: "The Set #20E",
    mapAddress: "455 10th Avenue, New York, NY 10018",
    location: "455 10th Avenue, Manhattan",
    url: "https://www.relatedrentals.com/apartment-rentals/new-york-city/hudson-yards/the-set/studio-one-bath-53843",
    buildingUrl: "https://www.relatedrentals.com/apartment-rentals/new-york-city/hudson-yards/the-set",
    evidenceScope: "unit",
    unit: "20E",
    planScope: "unverified",
    facts: "Historically advertised furnished studio · archived unit page",
    archived: true,
    availability: "The official unit page showed no longer available during the September 10 research, despite an available search snapshot. Current availability has not been rechecked.",
    questions: "Confirm current availability and any included furnishings. Building-level furnished/unfurnished choices do not establish 20E’s inventory. The separate F-type plan is not linked to 20E.",
    readinessReason: "No matching plan or usable dimensions for 20E were established. Preserve the opened-page status separately from the earlier search snapshot; do not borrow another line’s plan or furniture inventory.",
  }),
  reserve({
    id: "setftype",
    scoutId: "nyc-set-f-type",
    name: "The Set F-type studio",
    mapAddress: "455 10th Avenue, New York, NY 10018",
    location: "455 10th Avenue, Manhattan",
    url: "https://www.relatedrentals.com/sites/default/files/2022-08/TheSet_F_Floor15-PH1.pdf",
    planUrl: "https://www.relatedrentals.com/sites/default/files/2022-08/TheSet_F_Floor15-PH1.pdf",
    buildingUrl: "https://www.relatedrentals.com/apartment-rentals/new-york-city/hudson-yards/the-set",
    evidenceScope: "type",
    unit: null,
    planScope: "type_only",
    facts: "F-type studio · floors 15–PH1 · no exact unit selected",
    questions: "Confirm an actual unit’s link to this F-type plan and its current condition. The PDF states approximate dimensions and possible layout variation; illustrated furniture does not establish lease inventory.",
    readinessReason: "September 10 visual inspection recorded living dimensions of 13′5″ × 12′10″ and stated 9-foot ceilings. These are source-reported values, not calibrated or as-built geometry. Exact-unit identity and source reuse remain unresolved.",
  }),
  reserve({
    id: "tatenetype",
    scoutId: "nyc-tate-ne-type",
    name: "The Tate NE residence type",
    mapAddress: "535 West 23rd Street, New York, NY 10011",
    location: "535 West 23rd Street, Manhattan",
    url: "https://www.relatedrentals.com/sites/default/files/2021-04/Tate_StudioPH1E_N.pdf",
    planUrl: "https://www.relatedrentals.com/sites/default/files/2021-04/Tate_StudioPH1E_N.pdf",
    buildingUrl: "https://www.relatedrentals.com/apartment-rentals/new-york-city/chelsea/the-tate",
    evidenceScope: "type",
    unit: null,
    planScope: "type_only",
    facts: "NE residence · PH1–PH3 · drawn as junior 1-bedroom",
    questions: "The file name says studio, while the inspected plan title describes a junior one-bedroom. Confirm the current unit/type match; no available apartment or included furniture was established.",
    readinessReason: "September 10 visual inspection recorded living dimensions of 11′8″ × 16′6″ and bedroom dimensions of 8′ × 9′10″, with irregular circulation. Reported labels do not calibrate the whole plan; remaining dimensions and current materials are unknown.",
  }),
  reserve({
    id: "gold15type",
    scoutId: "nyc-260gold-studio15",
    name: "260 Gold 15-line studio type",
    mapAddress: "260 Gold Street, Brooklyn, NY",
    location: "260 Gold Street, Brooklyn",
    url: "https://www.260gold.com/floorplans",
    evidenceScope: "type",
    unit: null,
    planScope: "uninspected_asset",
    facts: "15-line studio candidate · floors 10–12 · exact unit unconfirmed",
    questions: "Confirm the 1015–1215 type association and obtain a readable matching plan. The page’s image descriptions had inconsistent address/area wording; image metadata is not dimensional evidence.",
    readinessReason: "During the September 10 research, the linked image fetch failed and the plan was not visually inspected. Current access has not been checked. No usable dimensions or exact-unit layout were established.",
  }),
  reserve({
    id: "avalonbowery",
    scoutId: "nyc-avalon-bowery-building",
    name: "Avalon Bowery Place",
    mapAddress: "11 East First Street, New York, NY 10003",
    location: "11 East First Street, Manhattan",
    url: "https://www.avaloncommunities.com/new-york/new-york-city-apartments/avalon-bowery-place/",
    evidenceScope: "building",
    unit: null,
    planScope: "unverified",
    facts: "Building source · no apartment or plan selected",
    questions: "Choose an actual apartment and obtain its matching plan. The source warns that similar apartment layouts may vary; building amenities and type choices do not identify one interior.",
    readinessReason: "The building address and published apartment choices were observed on September 10. No unit-specific plan was inspected and no dimensions were established. An address alone must not select an arbitrary interior.",
  }),
].map((record) => Object.freeze({
  ...record,
  // Only already-reviewed point IDs can resolve. New candidates remain null.
  geographicLocation: getExampleLocation(record.id),
  geographicStatus: getExampleLocation(record.id) ? "resolved_approximate" : "unresolved",
})));

export const nycListingIds = Object.freeze(nycListings.map((listing) => listing.id));
export const nycPrimaryListingId = "mima48h";
export const nycPrimaryCase = Object.freeze({
  listingId: nycPrimaryListingId,
  planUrl: byId.get(nycPrimaryListingId).planUrl,
  reason: "MiMA 48H has a publisher-linked H-line plan for floors 39–50 and two scout-inspected dimension pairs. It is the strongest named-unit NYC source-plan starting point; coordinate calibration and a working NYC interior still require their own verification.",
  reportedDimensions: Object.freeze(["Living 11′10″ × 15′", "Sleeping alcove 9′4″ × 11′5″"]),
  coordinateCalibration: "pending",
  acceptedGeometry: null,
});
