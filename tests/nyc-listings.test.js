import test from "node:test";
import assert from "node:assert/strict";
import { nycListings, nycListingIds, nycPrimaryCase } from "../src/nyc-listings.js";
import { listings } from "../src/listings.js";
import { getExampleLocation } from "../src/example-locations.js";
import { validateLocation } from "../src/location.js";

test("NYC catalog has nine scout identities plus Wall, without mutating recovered JC research", () => {
  assert.equal(nycListings.length, 10);
  assert.equal(new Set(nycListingIds).size, 10);
  const scouts = nycListings.map(l => l.scoutId).filter(Boolean);
  assert.equal(scouts.length, 9);
  assert.equal(new Set(scouts).size, 9);
  assert.ok(listings.some(l => l.id === "charles345"));
  for (const listing of nycListings) {
    assert.ok(!/Jersey City|charles/i.test(JSON.stringify(listing)));
    assert.equal(listing.scene, null);
    assert.equal(listing.identity, undefined);
    assert.match(listing.checkedAt, /^2026-09-10/);
    assert.equal(new URL(listing.url).protocol, "https:");
    assert.ok(Object.isFrozen(listing));
  }
});

test("catalog only reuses previously reviewed location points; reserves never inherit another property", () => {
  assert.equal(nycListings.filter(l => l.geographicStatus === "unresolved").length, 5);
  for (const listing of nycListings) {
    const existing = getExampleLocation(listing.id);
    if (!existing) {
      assert.equal(listing.geographicStatus, "unresolved");
      assert.equal(listing.geographicLocation, null);
    } else {
      assert.deepEqual(validateLocation(listing.geographicLocation), validateLocation(existing));
      assert.equal(listing.geographicStatus, "resolved_approximate");
    }
  }
});

test("same-building unit and type cases stay distinct, and type/building records have no invented unit", () => {
  const unit = nycListings.find(l => l.id === "set20e");
  const type = nycListings.find(l => l.id === "setftype");
  assert.equal(unit.mapAddress, type.mapAddress);
  assert.equal(unit.archived, true);
  assert.equal(unit.unit, "20E");
  assert.equal(unit.planUrl, undefined);
  assert.equal(type.planScope, "type_only");
  assert.notEqual(unit.url, type.url);
  for (const listing of nycListings.filter(l => l.evidenceScope !== "unit"))
    assert.equal(listing.unit, null);
  assert.equal(nycListings.find(l => l.id === "gold15type").planUrl, undefined);
  assert.equal(nycListings.find(l => l.id === "avalonbowery").planUrl, undefined);
});

test("primary case preserves reported dimensions without accepted geometry or exact-unit tour claims", () => {
  const primary = nycListings.find(l => l.id === nycPrimaryCase.listingId);
  assert.equal(primary.evidenceScope, "unit");
  assert.equal(primary.planScope, "unit_group");
  assert.equal(primary.tourIdentity, "representative_sample");
  assert.equal(nycPrimaryCase.planUrl, primary.planUrl);
  assert.equal(nycPrimaryCase.reportedDimensions.length, 2);
  assert.equal(nycPrimaryCase.coordinateCalibration, "pending");
  assert.equal(nycPrimaryCase.acceptedGeometry, null);
  const gotham = nycListings.find(l => l.id === "gotham2409");
  assert.equal(gotham.mapAddress, "56-27 2nd Street, Long Island City, NY 11101");
  assert.equal(gotham.planUrl, listings.find(l => l.id === "gotham2409").planUrl);
});
