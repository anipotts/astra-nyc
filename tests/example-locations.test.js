import test from "node:test";
import assert from "node:assert/strict";
import {
  exampleLocations,
  getExampleLocation,
  unresolvedExampleLocationIds,
  exampleLocationReview,
} from "../src/example-locations.js";
import { validateLocation } from "../src/location.js";

test("all thirteen example records have valid reviewed points for twelve unique building addresses", () => {
  const expected = [
    "wall2308",
    "zephyr501",
    "urby409",
    "urby1504",
    "charles345",
    "mima48h",
    "theone2h",
    "eos24f",
    "jasperw410",
    "newkirk65",
    "plazastudio",
    "gotham2409",
    "castiron5j",
  ];
  assert.deepEqual(Object.keys(exampleLocations).sort(), expected.sort());
  assert.deepEqual(unresolvedExampleLocationIds, []);
  for (const id of expected) {
    const point = getExampleLocation(id);
    assert.deepEqual(validateLocation(point), point);
    assert.equal(point.precision, "approximate");
    assert.ok(Object.isFrozen(point));
  }
  assert.equal(
    new Set(Object.values(exampleLocations).map((point) => point.source)).size,
    12,
  );
  assert.deepEqual(exampleLocations.urby409, exampleLocations.urby1504);
});

test("reviewed building identities exclude known road-only candidates and the Gotham leasing gallery", () => {
  const rejectedRoads = new Set([
    "osm:way:68325079",
    "osm:way:945942091",
    "osm:way:1089864110",
    "osm:way:219654674",
    "osm:way:707030145",
  ]);
  for (const point of Object.values(exampleLocations))
    assert.equal(rejectedRoads.has(point.id), false);
  assert.equal(exampleLocations.gotham2409.id, "osm:way:1132080798");
  assert.match(exampleLocations.gotham2409.label, /South Tower, 56-27/);
  const [west, south, east, north] = exampleLocationReview.gotham2409.osmBounds;
  assert.ok(
    exampleLocations.gotham2409.longitude >= west &&
      exampleLocations.gotham2409.longitude <= east,
  );
  assert.ok(
    exampleLocations.gotham2409.latitude >= south &&
      exampleLocations.gotham2409.latitude <= north,
  );
  assert.match(exampleLocations.zephyr501.label, /^Zephyr Lofts/);
  assert.match(exampleLocations.urby409.label, /^Journal Square Urby/);
  assert.match(exampleLocations.theone2h.label, /^110, 1st Street/);
});

test("Jasper keeps publisher provenance with independent NYC address corroboration", () => {
  const point = exampleLocations.jasperw410;
  assert.equal(point.id, "publisher:streeteasy.com:jasperw410");
  assert.equal(
    point.source,
    "https://streeteasy.com/building/jasper-2_33-50th-avenue-long_island_city",
  );
  assert.match(
    exampleLocationReview.jasperw410.crossCheckIdentity,
    /BIN 4625206/,
  );
  const [longitude, latitude] =
    exampleLocationReview.jasperw410.crossCheckCoordinates;
  assert.ok(Math.abs(point.longitude - longitude) < 0.00001);
  assert.ok(Math.abs(point.latitude - latitude) < 0.00001);
});

test("unknown selections and object prototype names never receive a default building", () => {
  for (const id of [
    "",
    "unknown",
    "constructor",
    "__proto__",
    "toString",
    null,
    undefined,
  ])
    assert.equal(getExampleLocation(id), null);
});
