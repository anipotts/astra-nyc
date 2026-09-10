import test from "node:test";
import assert from "node:assert/strict";
import { evidenceCapabilities } from "../src/evidence-readiness.js";
const states = (s) =>
  Object.fromEntries(evidenceCapabilities(s).map((c) => [c.id, c.status]));
test("building-only photos support source review without becoming unit imagery or geometry", () => {
  const s = states([
    {
      url: "https://example.test/building",
      scope: "building",
      kind: "photos",
      level: "building",
    },
  ]);
  assert.equal(s.source_review, "available");
  assert.equal(s.show_source_photos, "missing");
  assert.equal(s.render_unit, "missing");
});
test("exact-unit photos and other-unit plan remain distinct", () => {
  const s = states([
    { url: "a", scope: "exact_unit", kind: "photos", level: "unit" },
    { url: "b", scope: "other_unit", kind: "floor_plan", level: "unit" },
  ]);
  assert.equal(s.show_source_photos, "partial");
  assert.equal(s.show_floor_plan, "missing");
  assert.equal(s.render_room_region, "missing");
});
test("a cited dimensioned plan is still a lead until independent inspection accepts geometry", () => {
  const s = states([
    {
      url: "a",
      scope: "exact_unit",
      kind: "floor_plan",
      level: "unit",
      evidence: "Dimensioned plan reported",
    },
  ]);
  assert.equal(s.show_floor_plan, "partial");
  assert.equal(s.render_room_region, "missing");
  assert.equal(s.locate_unit_within_building, "missing");
});
test("empty report claims no source or rendering capability", () => {
  assert.ok(evidenceCapabilities([]).every((c) => c.status === "missing"));
});
