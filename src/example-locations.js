import { validateLocation } from "./location.js";

// Reviewed during the event from a fixed one-time set of public listing addresses.
// These source-supported points locate a building/address approximately. They
// do not establish surveyed entrances, unit positions, interiors or availability.
const reviewed = {
  wall2308: {
    id: "osm:way:278076417",
    label:
      "95 Wall Street, 95, Wall Street, Financial District, Lower Manhattan, Manhattan, New York County, New York, 10005, United States",
    longitude: -74.0075698,
    latitude: 40.7047056,
    source: "https://www.openstreetmap.org/way/278076417",
    observedAt: "2026-09-10T17:41:29.313Z",
    precision: "approximate",
  },
  zephyr501: {
    id: "osm:way:410144250",
    label:
      "Zephyr Lofts, 689, Marin Boulevard, Journal Square, Jersey City, Hudson County, New Jersey, 07030, United States",
    longitude: -74.0390544,
    latitude: 40.7360126,
    source: "https://www.openstreetmap.org/way/410144250",
    observedAt: "2026-09-10T17:47:11.140Z",
    precision: "approximate",
  },
  urby1504: {
    id: "osm:way:1177256990",
    label:
      "Journal Square Urby, 532, Summit Avenue, Hilltop, Bergen Square, Journal Square, Jersey City, Hudson County, New Jersey, 07306, United States",
    longitude: -74.0593832,
    latitude: 40.7321117,
    source: "https://www.openstreetmap.org/way/1177256990",
    observedAt: "2026-09-10T17:48:08.597Z",
    precision: "approximate",
  },
  charles345: {
    id: "osm:way:761152120",
    label:
      "272, Grove Street, Communipaw, Jersey City, Hudson County, New Jersey, 07302, United States",
    longitude: -74.043967,
    latitude: 40.717582,
    source: "https://www.openstreetmap.org/way/761152120",
    observedAt: "2026-09-10T17:33:45.034Z",
    precision: "approximate",
  },
  mima48h: {
    id: "osm:node:2709680715",
    label:
      "450, West 42nd Street, Hudson Yards, Manhattan Community Board 4, Manhattan, New York County, New York, 10036, United States",
    longitude: -73.9943187,
    latitude: 40.7589262,
    source: "https://www.openstreetmap.org/node/2709680715",
    observedAt: "2026-09-10T17:48:09.998Z",
    precision: "approximate",
  },
  eos24f: {
    id: "osm:way:464515259",
    label:
      "100, West 31st Street, Chelsea District, Manhattan Community Board 5, Manhattan, New York County, New York, 10001, United States",
    longitude: -73.989361,
    latitude: 40.747883,
    source: "https://www.openstreetmap.org/way/464515259",
    observedAt: "2026-09-10T17:48:13.508Z",
    precision: "approximate",
  },
  newkirk65: {
    id: "osm:way:1340887168",
    label:
      "65 Newkirk, 65, Newkirk Street, Hilltop, Bergen Square, Journal Square, Jersey City, Hudson County, New Jersey, 07306, United States",
    longitude: -74.0623766,
    latitude: 40.7282093,
    source: "https://www.openstreetmap.org/way/1340887168",
    observedAt: "2026-09-10T17:48:16.229Z",
    precision: "approximate",
  },
  plazastudio: {
    id: "osm:way:410105347",
    label:
      "Plaza Apartments, 91, Sip Avenue, Hilltop, Bergen Square, Journal Square, Jersey City, Hudson County, New Jersey, 07306, United States",
    longitude: -74.0633327,
    latitude: 40.7303539,
    source: "https://www.openstreetmap.org/way/410105347",
    observedAt: "2026-09-10T17:48:17.443Z",
    precision: "approximate",
  },
  castiron5j: {
    id: "osm:way:56054722",
    label:
      "300, Coles Street, Journal Square, Jersey City, Hudson County, New Jersey, 07310, United States",
    longitude: -74.045767,
    latitude: 40.733631,
    source: "https://www.openstreetmap.org/way/56054722",
    observedAt: "2026-09-10T17:48:20.777Z",
    precision: "approximate",
  },
  urby409: {
    id: "osm:way:1177256990",
    label:
      "Journal Square Urby, 532, Summit Avenue, Hilltop, Bergen Square, Journal Square, Jersey City, Hudson County, New Jersey, 07306, United States",
    longitude: -74.0593832,
    latitude: 40.7321117,
    source: "https://www.openstreetmap.org/way/1177256990",
    observedAt: "2026-09-10T17:48:08.597Z",
    precision: "approximate",
  },
  theone2h: {
    id: "osm:way:1010988535",
    label:
      "110, 1st Street, Newport, Journal Square, Jersey City, Hudson County, New Jersey, 07302, United States",
    longitude: -74.0373673,
    latitude: 40.7212062,
    source: "https://www.openstreetmap.org/way/1010988535",
    observedAt: "2026-09-10T17:50:43.002Z",
    precision: "approximate",
  },
  gotham2409: {
    id: "osm:way:1132080798",
    label:
      "Gotham Point South Tower, 56-27, 2nd Street, Hunters Point, Long Island City, Queens, Queens County, New York, 11101, United States",
    longitude: -73.9605042,
    latitude: 40.7386111,
    source: "https://www.openstreetmap.org/way/1132080798",
    observedAt: "2026-09-10T17:49:15.566Z",
    precision: "approximate",
  },
  jasperw410: {
    id: "publisher:streeteasy.com:jasperw410",
    label: "Jasper, 2-33 50th Avenue, Long Island City, NY 11101",
    longitude: -73.9571,
    latitude: 40.743687,
    source:
      "https://streeteasy.com/building/jasper-2_33-50th-avenue-long_island_city",
    observedAt: "2026-09-10T17:53:09.904Z",
    precision: "approximate",
  },
};

export const exampleLocations = Object.freeze(
  Object.fromEntries(
    Object.entries(reviewed).map(([id, value]) => [
      id,
      Object.freeze(validateLocation(value)),
    ]),
  ),
);
export const unresolvedExampleLocationIds = Object.freeze([]);

// Evidence notes remain outside the strict location point contract.
export const exampleLocationReview = Object.freeze({
  reviewedAt: "2026-09-10T17:54:20.657Z",
  scope:
    "Twelve unique public addresses for thirteen example records; approximate building/address points, never unit positions or surveyed entrances.",
  jasperw410: {
    source:
      "https://streeteasy.com/building/jasper-2_33-50th-avenue-long_island_city",
    crossCheck:
      "https://geosearch.planninglabs.nyc/v2/search?text=2-33%2050th%20Avenue%2C%20Queens%2C%20NY",
    crossCheckIdentity:
      "NYC PAD venue 1766921, BIN 4625206, BBL 4000170001, version 26c",
    crossCheckCoordinates: [-73.9571, 40.74369],
  },
  gotham2409: {
    note: "Named South Tower OSM geometry is 56-27 2nd Street. The official availability page identifies 57-28 2nd Street as the leasing gallery, which was not used for the South Tower point.",
    source: "https://gothampoint.com/availability/",
    osmBounds: [-73.9608956, 40.7383891, -73.9601391, 40.738857],
  },
  zephyr501: {
    note: "Selected explicitly named Zephyr Lofts geometry over a second bare 689 Marin Boulevard address candidate. OSM postal-code label differs from the listing; original source label retained.",
  },
  theone2h: {
    note: "Exact 110 1st Street source match; equivalent numeric street spelling resolved the empty First Street search. An inconsistent longitude in publisher structured data was rejected.",
  },
  urby: {
    note: "Both units share the named Journal Square Urby building point at 532 Summit Avenue; no unit-specific position is claimed.",
  },
  castiron5j: {
    note: "Point matches 300 Coles Street, the address published on the CIL1 plan page. Internal phase or unit placement is not independently established by this address point.",
    source: "https://castironlofts.com/floorplans/cil1_5-6j/",
  },
});

export function getExampleLocation(listingId) {
  return Object.hasOwn(exampleLocations, listingId)
    ? exampleLocations[listingId]
    : null;
}
