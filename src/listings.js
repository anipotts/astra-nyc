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
    scene: { width: 7, depth: (575 * 0.09290304) / 7, studio: true },
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
      return host === known.hostname && path === known.pathname;
    }) ?? null
  );
}
