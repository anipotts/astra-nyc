import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createLayout, elementBounds, isSolidElement } from "../src/layout.js";
import { buildLayoutScene } from "../src/layout-scene.js";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test("two synthetic layouts have stable semantic identities and explicit provenance", () => {
  for (const [home, width, depth] of [
    ["current", 10, 8],
    ["potential", 12, 10],
  ]) {
    const layout = createLayout(home);
    assert.equal(layout.width, width);
    assert.equal(layout.depth, depth);
    assert.equal(layout.units, "m");
    assert.equal(layout.measurementStatus, "synthetic");
    assert.equal(
      new Set(layout.elements.map((e) => e.id)).size,
      layout.elements.length,
    );
    assert.deepEqual(layout.sources, []);
    assert.equal(layout.openings[0].width, 1.8);
    for (const e of layout.elements) {
      assert.equal(e.rotation, 0);
      assert.deepEqual(e.evidence, {
        basis: "synthetic",
        source: "Event-authored demonstration",
      });
      for (const n of [e.x, e.z, e.width, e.depth, e.height, e.y])
        assert.ok(Number.isFinite(n));
      assert.ok(e.width > 0 && e.depth > 0 && e.height > 0);
    }
  }
  assert.throws(() => createLayout({ width: 7, depth: 8, studio: true }));
  assert.throws(() => createLayout("wall2308"));
});

test("outer furniture dimensions include bed frame/headboard and sofa arms", () => {
  const queen = createLayout("current").elements.find((e) => e.id === "bed");
  const king = createLayout("current", { largeBed: true }).elements.find(
    (e) => e.id === "bed",
  );
  close(queen.width, 1.64);
  close(king.width, 2.05);
  close(king.depth, 2.23);
  close(queen.x, king.x);
  close(queen.z, king.z);
  const bounds = elementBounds(queen);
  close(bounds.maxZ - bounds.minZ, 2.23);
  const sofa = createLayout("current").elements.find((e) => e.id === "sofa");
  close(sofa.width, 1.15);
  close(sofa.depth, 2.8);
});

test("unfurnished keeps fixed fixtures and hidden furniture stays in canonical record", () => {
  const filled = createLayout("potential");
  const empty = createLayout("potential", { unfurnished: true });
  assert.deepEqual(
    empty.elements.map((e) => e.id),
    filled.elements.map((e) => e.id),
  );
  assert.ok(
    empty.elements
      .filter((e) => e.category === "furniture")
      .every((e) => !e.visible),
  );
  assert.ok(
    empty.elements
      .filter((e) => e.category !== "furniture")
      .every((e) => e.visible),
  );
  assert.ok(isSolidElement(empty.elements.find((e) => e.id === "kitchen")));
  const hidden = createLayout("current", { hiddenItems: ["table", "sofa"] });
  assert.equal(
    hidden.elements.find((e) => e.id === "coffee-table").visible,
    false,
  );
  assert.equal(hidden.elements.find((e) => e.id === "sofa").visible, false);
  assert.equal(hidden.elements.find((e) => e.id === "bed").visible, true);
});

test("3D furniture outer bounds, plan bounds, and collision records agree", () => {
  for (const home of ["current", "potential"])
    for (const largeBed of [false, true]) {
      const layout = createLayout(home, { largeBed });
      const group = new THREE.Group(),
        solids = [];
      buildLayoutScene(group, solids, layout);
      group.updateMatrixWorld(true);
      assert.equal(group.userData.layoutId, layout.id);
      assert.deepEqual(
        solids,
        layout.elements.filter(isSolidElement).map(elementBounds),
      );
      for (const e of layout.elements.filter(isSolidElement)) {
        const rendered = new THREE.Box3().setFromObject(
          group.getObjectByName(e.id),
        );
        const canonical = elementBounds(e);
        assert.ok(
          rendered.min.x >= canonical.minX - 1e-6,
          e.id + " left geometry contained",
        );
        assert.ok(
          rendered.max.x <= canonical.maxX + 1e-6,
          e.id + " right geometry contained",
        );
        assert.ok(
          rendered.min.z >= canonical.minZ - 1e-6,
          e.id + " back geometry contained",
        );
        assert.ok(
          rendered.max.z <= canonical.maxZ + 1e-6,
          e.id + " front geometry contained",
        );
        if (["bed", "sofa", "table", "kitchen", "wall"].includes(e.kind)) {
          close(rendered.min.x, canonical.minX);
          close(rendered.max.x, canonical.maxX);
          close(rendered.min.z, canonical.minZ);
          close(rendered.max.z, canonical.maxZ);
        }
      }
      assert.deepEqual(
        group.userData.bedFootprint,
        elementBounds(layout.elements.find((e) => e.id === "bed")),
      );
      assert.ok(solids.includes(group.userData.bedFootprint));
    }
});

test("visual cutaway never removes wall collisions, and empty scenes keep kitchen collision", () => {
  const layout = createLayout("current", { unfurnished: true });
  const group = new THREE.Group(),
    solids = [];
  buildLayoutScene(group, solids, layout, { cutaway: true });
  assert.equal(group.userData.bedFootprint, null);
  assert.ok(group.getObjectByName("kitchen"));
  assert.equal(group.getObjectByName("bed"), undefined);
  assert.deepEqual(
    solids,
    layout.elements.filter(isSolidElement).map(elementBounds),
  );
  const cutaway = [];
  group.traverse((node) => {
    if (node.userData.cutaway) cutaway.push(node);
  });
  assert.equal(cutaway.length, 3);
  assert.ok(cutaway.every((node) => node.scale.y === 0.19));
});
