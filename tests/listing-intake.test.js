import test from "node:test";
import assert from "node:assert/strict";
import {
  findKnownListings,
  safeListingUrl,
  candidateListing,
} from "../src/listing-intake.js";
test("address aliases resolve building and exact units without inventing other units", () => {
  assert.deepEqual(
    findKnownListings("689 Marin Blvd #501").map((l) => l.id),
    ["zephyr501"],
  );
  assert.deepEqual(
    findKnownListings("532 Summit Ave Jersey City").map((l) => l.id),
    ["urby409", "urby1504"],
  );
  assert.deepEqual(
    findKnownListings("95 Wall St #2308 NYC").map((l) => l.id),
    ["wall2308"],
  );
  assert.deepEqual(findKnownListings("95 Wall St #9999"), []);
  assert.deepEqual(findKnownListings("no such building"), []);
});
test("candidate sources must be public HTTPS on supported sites", () => {
  for (const url of [
    "javascript:alert(1)",
    "http://streeteasy.com/a",
    "https://evil-streeteasy.com/a",
    "https://streeteasy.com.evil.test/a",
    "https://user:pass@streeteasy.com/a",
    "https://streeteasy.com:999/a",
  ])
    assert.throws(() => safeListingUrl(url));
  assert.equal(
    safeListingUrl("https://www.urby.com/location/journal-square"),
    "https://www.urby.com/location/journal-square",
  );
});
test("search candidates produce evidence-only records with no fit, rent or availability claims", () => {
  const l = candidateListing(
    {
      name: "A building",
      address: "95 Wall St",
      url: "https://streeteasy.com/building/95-wall-street-new_york",
      note: "Search candidate",
    },
    new Date().toISOString(),
  );
  assert.equal(l.scene, null);
  assert.equal(l.discovery, true);
  assert.equal(l.price, "Rent not verified");
  assert.match(l.questions, /exact building and unit/);
  assert.throws(() => candidateListing({ name: "incomplete" }, "invalid"));
});
