import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptInspectedRegion,
  inspectedRegionCapabilities,
} from "../src/inspected-plan.js";
import { inspectedPlans } from "../src/inspected-plan-records.js";
import { renderPlanSvg } from "../src/plan-svg.js";
const identity = {
  building: "charles-272-grove",
  unit: "345",
  label: "Charles & Co #345",
};
const record = () => structuredClone(inspectedPlans[0]);
test("inspected nominal region preserves unknowns and provenance in canonical2D/export", () => {
  const layout = acceptInspectedRegion(record(), identity);
  assert.ok(Math.abs(layout.width - 3.5052) < 1e-9);
  assert.ok(Math.abs(layout.depth - 3.4544) < 1e-9);
  assert.equal(layout.height, null);
  assert.equal(layout.elements[0].height, null);
  assert.deepEqual(layout.openings, []);
  assert.equal(layout.sourceUse.rightsStatus, "unresolved");
  const svg = renderPlanSvg(layout);
  for (const word of [
    "2015-05-13",
    "Closet and entry recess",
    "Historical marketing plan",
    "silvermanbuilding.com",
    "stroke-dasharray",
    "No wall, opening, ceiling or fit geometry",
  ])
    assert.ok(svg.includes(word), word);
  const caps = Object.fromEntries(
    inspectedRegionCapabilities(layout).map((c) => [c.id, c.status]),
  );
  assert.equal(caps.render_room_region, "partial");
  assert.equal(caps.export_supported_plan, "available");
  assert.equal(caps.render_unit, "missing");
  assert.equal(caps.calculate_specific_clearance, "missing");
});
test("one general path accepts separately mapped units and rejects wrong building/unit", () => {
  for (const unit of ["345", "445", "545", "645"])
    assert.ok(
      acceptInspectedRegion(record(), { ...identity, unit }).id.endsWith(unit),
    );
  for (const change of [{ unit: "346" }, { building: "other" }, { unit: null }])
    assert.throws(
      () => acceptInspectedRegion(record(), { ...identity, ...change }),
      /mapping/,
    );
});
test("search prose, area, unsupported shapes and unresolved conflicts cannot become geometry", () => {
  const mutations = [
    (r) => (r.inspection.method = "model_search"),
    (r) => (r.region.shape = "unknown"),
    (r) => (r.region.boundaryBasis = "area_inference"),
    (r) => r.conflicts.push("Wrong plan"),
    (r) => (r.region.exclusions = []),
    (r) => (r.use.representation = "reproduced_artwork"),
  ];
  for (const change of mutations) {
    const r = record();
    change(r);
    assert.throws(() => acceptInspectedRegion(r, identity));
  }
});
test("invalid or unlinked numeric dimensions never receive defaults", () => {
  for (const value of [null, 0, -1, Infinity, NaN, "11.5", 101]) {
    const r = record();
    r.region.dimensions[0].value = value;
    assert.throws(() => acceptInspectedRegion(r, identity));
  }
  for (const change of [
    (d) => (d.unit = "px"),
    (d) => (d.basis = "visual_guess"),
    (d) => (d.locator = ""),
  ]) {
    const r = record();
    change(r.region.dimensions[1]);
    assert.throws(() => acceptInspectedRegion(r, identity));
  }
});
test("source metadata must be qualified and safely linked", () => {
  for (const url of [
    "http://example.com/p.pdf",
    "https://name:pass@example.com/p.pdf",
    "javascript:alert(1)",
  ]) {
    const r = record();
    r.source.url = url;
    assert.throws(() => acceptInspectedRegion(r, identity));
  }
  const r = record();
  r.source.qualification = "";
  assert.throws(() => acceptInspectedRegion(r, identity));
});
