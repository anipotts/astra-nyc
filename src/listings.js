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
    facts: "2 beds · 2 baths · 1,434 ft²",
    price: "$3,950 / month historical base rent",
    availability: "Archived — no longer available since July 16, 2024.",
    checkedAt: "2026-09-10T15:08:03Z",
    archived: true,
    questions:
      "Current availability, price, layout, and condition are unknown. Use this archived listing to test evidence review; a unit-specific scene has not been built.",
    scene: null,
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
    facts: "Unit 48H · published source reference",
    price: "Check source for current rent",
    availability:
      "Current availability not verified; confirm with the original source.",
    checkedAt: "2026-09-10",
    archived: false,
    scene: null,
    dimensionalReadiness: "needs-evidence",
    furnishingStatus: "unknown",
    questions:
      "Confirm current availability, the exact unit, plan dimensions and current condition. The building map is geographic context; a walkable interior is not established.",
    readinessReason:
      "Published listing or plan reference available. Room geometry and current conditions remain unverified; review the original source.",
    planUrl:
      "https://www.relatedrentals.com/sites/default/files/2021-04/MiMA_H_39-50.pdf",
  },
  {
    id: "theone2h",
    mapAddress: "110 First Street, Jersey City, NJ 07302",
    url: "https://theonenj.com/pdf/1bdrm-h2-9.pdf",
    name: "The One #2H",
    location: "110 First Street, Jersey City, NJ 07302",
    facts: "Unit 2H · published source reference",
    price: "Check source for current rent",
    availability:
      "Current availability not verified; confirm with the original source.",
    checkedAt: "2026-09-10",
    archived: false,
    scene: null,
    dimensionalReadiness: "needs-evidence",
    furnishingStatus: "unknown",
    questions:
      "Confirm current availability, the exact unit, plan dimensions and current condition. The building map is geographic context; a walkable interior is not established.",
    readinessReason:
      "Published listing or plan reference available. Room geometry and current conditions remain unverified; review the original source.",
    planUrl: "https://theonenj.com/pdf/1bdrm-h2-9.pdf",
  },
  {
    id: "eos24f",
    mapAddress: "100 West 31st Street, Manhattan, NY 10001",
    url: "https://www.eosnomad.com/residences/studio/878484/",
    name: "EOS #24F",
    location: "100 West 31st Street, Manhattan, NY 10001",
    facts: "Unit 24F · published source reference",
    price: "Check source for current rent",
    availability:
      "Current availability not verified; confirm with the original source.",
    checkedAt: "2026-09-10",
    archived: false,
    scene: null,
    dimensionalReadiness: "needs-evidence",
    furnishingStatus: "unknown",
    questions:
      "Confirm current availability, the exact unit, plan dimensions and current condition. The building map is geographic context; a walkable interior is not established.",
    readinessReason:
      "Published listing or plan reference available. Room geometry and current conditions remain unverified; review the original source.",
  },
  {
    id: "jasperw410",
    mapAddress: "2-33 50th Avenue, Long Island City, NY",
    url: "https://jasperhp.com/availability/",
    name: "Jasper #W410",
    location: "2-33 50th Avenue, Long Island City, NY",
    facts: "Unit W410 · published source reference",
    price: "Check source for current rent",
    availability:
      "Current availability not verified; confirm with the original source.",
    checkedAt: "2026-09-10",
    archived: false,
    scene: null,
    dimensionalReadiness: "needs-evidence",
    furnishingStatus: "unknown",
    questions:
      "Confirm current availability, the exact unit, plan dimensions and current condition. The building map is geographic context; a walkable interior is not established.",
    readinessReason:
      "Published listing or plan reference available. Room geometry and current conditions remain unverified; review the original source.",
    planUrl:
      "https://jasperhp.com/wp-content/uploads/2025/03/Classic_Studio_W410-W710-W809-W1009-W1108-W1207-1024x666.png",
  },
  {
    id: "newkirk65",
    mapAddress: "65 Newkirk Street, Jersey City, NJ 07306",
    url: "https://www.live65newkirk.com/virtualtours",
    name: "65 Newkirk tour type",
    location: "65 Newkirk Street, Jersey City, NJ 07306",
    facts: "Building / plan-type source · no exact unit selected",
    price: "Check source for current rent",
    availability:
      "Current availability not verified; confirm with the original source.",
    checkedAt: "2026-09-10",
    archived: false,
    scene: null,
    dimensionalReadiness: "needs-evidence",
    furnishingStatus: "unknown",
    questions:
      "Confirm current availability, the exact unit, plan dimensions and current condition. The building map is geographic context; a walkable interior is not established.",
    readinessReason:
      "Published listing or plan reference available. Room geometry and current conditions remain unverified; review the original source.",
    planUrl:
      "https://www.live65newkirk.com/s/0_65-newkirk-1bd-w-balcony_0_1-copy.png",
  },
  {
    id: "plazastudio",
    mapAddress: "91 Sip Avenue, Jersey City, NJ 07306",
    url: "https://rnhousing.org/properties/plaza-apartments/",
    name: "Plaza Apartments studio type",
    location: "91 Sip Avenue, Jersey City, NJ 07306",
    facts: "Building / plan-type source · no exact unit selected",
    price: "Check source for current rent",
    availability:
      "Current availability not verified; confirm with the original source.",
    checkedAt: "2026-09-10",
    archived: false,
    scene: null,
    dimensionalReadiness: "needs-evidence",
    furnishingStatus: "unknown",
    questions:
      "Confirm current availability, the exact unit, plan dimensions and current condition. The building map is geographic context; a walkable interior is not established.",
    readinessReason:
      "Published listing or plan reference available. Room geometry and current conditions remain unverified; review the original source.",
    planUrl:
      "https://rnhousing.org/wp-content/uploads/2024/07/floor-plan-plaza.pdf",
  },
  {
    id: "gotham2409",
    mapAddress: "56-27 2nd Street, Long Island City, NY 11101",
    url: "https://gothampoint.com/availability/",
    name: "Gotham Point South #2409",
    location: "56-27 2nd Street, Long Island City, NY 11101",
    facts: "Unit South2409 · published source reference",
    price: "Check source for current rent",
    availability:
      "Current availability not verified; confirm with the original source.",
    checkedAt: "2026-09-10",
    archived: false,
    scene: null,
    dimensionalReadiness: "needs-evidence",
    furnishingStatus: "unknown",
    questions:
      "Confirm current availability, the exact unit, plan dimensions and current condition. The building map is geographic context; a walkable interior is not established.",
    readinessReason:
      "Published listing or plan reference available. Room geometry and current conditions remain unverified; review the original source.",
  },
  {
    id: "castiron5j",
    mapAddress: "300 Coles Street, Jersey City, NJ 07310",
    url: "https://castironlofts.com/floorplans/cil1_5-6j/",
    name: "Cast Iron Lofts #5J",
    location: "300 Coles Street, Jersey City, NJ 07310",
    facts: "Unit 5J (CIL1 plan group) · published source reference",
    price: "Check source for current rent",
    availability:
      "Current availability not verified; confirm with the original source.",
    checkedAt: "2026-09-10",
    archived: false,
    scene: null,
    dimensionalReadiness: "needs-evidence",
    furnishingStatus: "unknown",
    questions:
      "Confirm current availability, the exact unit, plan dimensions and current condition. The building map is geographic context; a walkable interior is not established.",
    readinessReason:
      "Published listing or plan reference available. Room geometry and current conditions remain unverified; review the original source.",
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
