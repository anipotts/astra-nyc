// Public listing facts inspected during the event; these are bundled snapshots,
// not responses from a live importer. Listing photos are not redistributed.
export const listings = [
  {
    id: "wall2308",
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
