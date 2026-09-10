import test from "node:test";
import assert from "node:assert/strict";
import { clearanceAround, validateBedEdit } from "../src/clearance.js";
test("clearance finds nearest obstacles only along overlapping spans", () => {
  const bed = { minX: 0, maxX: 2, minZ: 0, maxZ: 2 };
  const obstacles = [
    { minX: 3, maxX: 4, minZ: 0, maxZ: 1 },
    { minX: 2.1, maxX: 3, minZ: 3, maxZ: 4 },
    { minX: 0, maxX: 1, minZ: 4, maxZ: 5 },
  ];
  const result = clearanceAround(bed, obstacles);
  assert.equal(result.right, 1);
  assert.equal(result.foot, 2);
  assert.equal(result.overlap, false);
  assert.equal(
    clearanceAround(bed, [{ minX: 1, maxX: 3, minZ: 1, maxZ: 3 }]).overlap,
    true,
  );
});
test("scene edits reject code, arbitrary sizes, extra fields, and wrong targets", () => {
  assert.equal(
    validateBedEdit({
      action: "resize_bed",
      target: "existing_bed",
      size: "king",
    }).size,
    "king",
  );
  for (const edit of [
    null,
    { action: "eval", target: "existing_bed", size: "king" },
    { action: "resize_bed", target: "wall", size: "king" },
    { action: "resize_bed", target: "existing_bed", size: "king", code: "x" },
  ])
    assert.throws(() => validateBedEdit(edit));
});
