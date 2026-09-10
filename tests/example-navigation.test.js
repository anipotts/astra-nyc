import test from "node:test";
import assert from "node:assert/strict";
import {
  listings,
  auditedExamples,
  additionalExamples,
} from "../src/listings.js";
import { findKnownListings } from "../src/listing-intake.js";
import { confidentLocationMatch } from "../src/location.js";
test("ten researched examples and three prior homes remain discoverable without geometry claims", () => {
  assert.equal(auditedExamples.length, 10);
  assert.equal(additionalExamples.length, 3);
  assert.equal(new Set(listings.map((l) => l.id)).size, 13);
  for (const listing of listings) {
    assert.equal(listing.scene, null);
    assert.ok(
      findKnownListings(listing.mapAddress).some((l) => l.id === listing.id),
      listing.id,
    );
  }
  assert.equal(
    listings.find((l) => l.id === "gotham2409").mapAddress,
    "56-27 2nd Street, Long Island City, NY 11101",
  );
});
const point = (id, label) => ({
  id: `osm:way:${id}`,
  label,
  longitude: -74.04,
  latitude: 40.72,
  source: `https://www.openstreetmap.org/way/${id}`,
  observedAt: "2026-09-10T17:00:00.000Z",
  precision: "approximate",
});
test("automatic map selection requires one exact numbered street match", () => {
  const building = point(1, "Zephyr Lofts, 689, Marin Boulevard, Jersey City");
  const address = "689 Marin Blvd, Jersey City, NJ";
  assert.equal(confidentLocationMatch(address, [building]).id, building.id);
  assert.equal(
    confidentLocationMatch(address, [point(2, "Marin Boulevard, Jersey City")]),
    null,
  );
  assert.equal(
    confidentLocationMatch(address, [building, point(3, building.label)]),
    null,
  );
  assert.equal(
    confidentLocationMatch(address, [
      point(4, "1689 Marin Boulevard, Jersey City"),
    ]),
    null,
  );
  assert.equal(
    confidentLocationMatch("100 W 31st St, New York", [
      point(5, "100, West 31st Street, Manhattan"),
    ]).id,
    "osm:way:5",
  );
});
