import test from "node:test";
import assert from "node:assert/strict";
import { inspectionExtentText } from "../src/plan-inspection.js";
test("incomplete provider qualification is visible without silently clipping it", () => {
  const partial = "These are not dimensions of a proven";
  assert.ok(inspectionExtentText(partial).startsWith(partial));
  assert.match(
    inspectionExtentText(partial),
    /Qualification appears incomplete/,
  );
  assert.equal(
    inspectionExtentText("Boundaries remain unverified."),
    "Boundaries remain unverified.",
  );
});
