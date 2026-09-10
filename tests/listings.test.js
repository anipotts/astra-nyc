import test from "node:test";
import assert from "node:assert/strict";
import { identifyListing, listings } from "../src/listings.js";
test("matches exact listing identity while tolerating tracking and trailing slash", () => {
  assert.equal(
    identifyListing(listings[0].url + "/?card=1#photos").id,
    "wall2308",
  );
  assert.equal(
    identifyListing("https://www.streeteasy.com/building/zephyr-lofts/501")
      .archived,
    true,
  );
  assert.equal(
    identifyListing("https://streeteasy.com/building/zephyr-lofts/502"),
    null,
  );
  assert.equal(
    identifyListing(
      "https://streeteasy.com.evil.test/building/zephyr-lofts/501",
    ),
    null,
  );
});
test("rejects credential-bearing and non-HTTPS URLs", () => {
  for (const value of [
    "not a url",
    "javascript:alert(1)",
    "http://localhost/",
    "https://user:secret@streeteasy.com/building/zephyr-lofts/501",
  ])
    assert.throws(() => identifyListing(value));
});
