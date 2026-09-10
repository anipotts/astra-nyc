import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSourceUrl,
  SOURCE_DOMAINS,
  SOURCE_LINK_HOSTS,
} from "../src/source-policy.js";

const officialPlans = [
  "https://theonenj.com/pdf/1bdrm-h2-9.pdf",
  "https://silvermanbuilding.com/wp-content/uploads/CC_1Bed_45Line.pdf",
  "https://www.relatedrentals.com/sites/default/files/2021-04/MiMA_H_39-50.pdf",
  "https://gothampoint.com/availability/",
];

test("accepts audited publisher links and existing exact/subdomain sources", () => {
  for (const url of officialPlans) assert.equal(normalizeSourceUrl(url), url);
  for (const domain of SOURCE_DOMAINS) {
    assert.equal(
      normalizeSourceUrl(`https://${domain}/unit/1`),
      `https://${domain}/unit/1`,
    );
    assert.equal(
      normalizeSourceUrl(`https://www.${domain}/unit/1`),
      `https://www.${domain}/unit/1`,
    );
  }
  assert.ok(Object.isFrozen(SOURCE_DOMAINS));
});

test("rejects deceptive authorities, credentials, explicit ports, and private URLs", () => {
  for (const value of [
    undefined,
    null,
    12,
    {},
    "",
    "https://theonenj.com/" + "a".repeat(1200),
    "http://theonenj.com/pdf/plan.pdf",
    "//theonenj.com/pdf/plan.pdf",
    "https:theonenj.com/pdf/plan.pdf",
    "https:///theonenj.com/pdf/plan.pdf",
    "https://theonenj.com.evil.example/plan.pdf",
    "https://eviltheonenj.com/plan.pdf",
    "https://theonenj.com@evil.example/plan.pdf",
    "https://user:pass@theonenj.com/plan.pdf",
    "https://@theonenj.com/plan.pdf",
    "https://theonenj.com:443/plan.pdf",
    "https://theonenj.com:8443/plan.pdf",
    "https://theonenj.com:/plan.pdf",
    "https://theonenj.com\\@evil.example/plan.pdf",
    "https://theonenj.com/with space",
    "https://theonenj.com/plan\n.pdf",
    "https://theonenj.com/plan\u0000.pdf",
    "https://%74heonenj.com/plan.pdf",
    "https://theonenj.com./plan.pdf",
    "https://-bad.theonenj.com/plan.pdf",
    "https://a..theonenj.com/plan.pdf",
    "https://localhost/plan.pdf",
    "https://127.0.0.1/plan.pdf",
    "https://10.0.0.1/plan.pdf",
    "https://169.254.169.254/plan.pdf",
    "https://[::1]/plan.pdf",
    "file:///tmp/plan.pdf",
    "javascript:alert(1)",
    "https://other.file.force.com/plan.pdf",
  ])
    assert.throws(() => normalizeSourceUrl(value), undefined, String(value));
});

test("all ten audited suite first-source URLs pass after coverage tuning (offline regression)", () => {
  // Public first-source URLs from the event-frozen suite. This verifies local
  // acceptance only; holdouts used for this tuning are now regression cases.
  const urls = [
    "https://silvermanbuilding.com/wp-content/uploads/CC_1Bed_45Line.pdf",
    "https://www.relatedrentals.com/apartment-rentals/new-york-city/midtown-manhattan/mima/studio-1-bath-31510",
    "https://theonenj.com/pdf/1bdrm-h2-9.pdf",
    "https://www.eosnomad.com/residences/studio/878484/",
    "https://jasperhp.com/availability/",
    "https://www.live65newkirk.com/virtualtours",
    "https://rnhousing.org/properties/plaza-apartments/",
    "https://www.apartmentfinder.com/New-Jersey/Jersey-City-Apartments/689-Marin-Blvd-Apartments-d5hp13h",
    "https://gothampoint.com/availability/",
    "https://castironlofts.com/floorplans/cil1_5-6j/",
  ];
  for (const url of urls) assert.equal(normalizeSourceUrl(url), url);
});

test("audited link-only hosts are exact tenants and remain outside download domains", () => {
  assert.deepEqual(SOURCE_LINK_HOSTS, [
    "my.matterport.com",
    "gothamproperties.file.force.com",
  ]);
  assert.ok(Object.isFrozen(SOURCE_LINK_HOSTS));
  for (const hostname of SOURCE_LINK_HOSTS) {
    const url = `https://${hostname}/show/?m=example&asset=%2Fa%2Fb`;
    assert.equal(normalizeSourceUrl(url + "#view"), url);
    // The downloader's apex/www matching cannot include these link-only hosts.
    assert.equal(
      SOURCE_DOMAINS.some(
        (domain) =>
          hostname === domain ||
          hostname === `www.${domain}` ||
          hostname.endsWith(`.${domain}`),
      ),
      false,
    );
    for (const invalid of [
      `https://www.${hostname}/plan.pdf`,
      `https://other.${hostname}/plan.pdf`,
      `https://${hostname}.evil.example/plan.pdf`,
      `https://${hostname}:443/plan.pdf`,
      `https://user@${hostname}/plan.pdf`,
    ])
      assert.throws(() => normalizeSourceUrl(invalid));
  }
  for (const hostname of [
    "matterport.com",
    "other.matterport.com",
    "force.com",
    "file.force.com",
    "other.file.force.com",
    "gothamproperties.file.force.com.evil.example",
  ])
    assert.throws(() => normalizeSourceUrl(`https://${hostname}/plan.pdf`));
});

test("preserves path, case, encoded query identity and distinct unit references", () => {
  const base = "https://www.relatedrentals.com/sites/default/files/MiMA_H.pdf";
  const query = "?unit=48H&asset=%2Fa%2Fb&asset=second";
  assert.equal(normalizeSourceUrl(base + query + "#page=1"), base + query);
  assert.equal(
    normalizeSourceUrl(base.replace("https://www", "HTTPS://WWW") + query),
    base + query,
  );
  assert.notEqual(
    normalizeSourceUrl(base + "?unit=48H"),
    normalizeSourceUrl(base + "?unit=49H"),
  );
  assert.notEqual(
    normalizeSourceUrl(base + "/48H"),
    normalizeSourceUrl(base + "/49H"),
  );
});
