import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { PERSONAL_ASSETS } from "../src/personal-assets.js";
import { buildPersonalAsset } from "../src/personal-asset-mesh.js";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test("personal assets keep real dimensions unknown and preview scale explicitly hypothetical", () => {
  assert.deepEqual(Object.keys(PERSONAL_ASSETS), ["green-seat", "black-shelf"]);
  for (const [id, asset] of Object.entries(PERSONAL_ASSETS)) {
    assert.equal(asset.id, id);
    assert.equal(asset.kind, id);
    assert.equal(asset.revision, 1);
    assert.equal(asset.units, "m");
    for (const axis of ["width", "depth", "height"])
      assert.deepEqual(asset.dimensions[axis], {
        value: null,
        basis: "unknown",
      });
    assert.match(
      asset.previewDimensionBasis,
      /hypothetical.*not measured or photo-derived/,
    );
    assert.match(asset.appearanceBasis, /exact product unidentified/);
    assert.equal(Object.isFrozen(asset), true);
    assert.equal(Object.isFrozen(asset.dimensions.width), true);
  }
  assert.deepEqual(PERSONAL_ASSETS["green-seat"].previewDimensions, {
    width: 1.1,
    depth: 1.05,
    height: 0.85,
  });
  assert.deepEqual(PERSONAL_ASSETS["black-shelf"].previewDimensions, {
    width: 0.8,
    depth: 0.35,
    height: 1.8,
  });
});

test("asset meshes remain inside canonical dimensions for default and changed preview scales", () => {
  for (const [id, asset] of Object.entries(PERSONAL_ASSETS))
    for (const dimensions of [
      asset.previewDimensions,
      { width: 0.55, depth: 0.48, height: 0.6 },
      { width: 1.5, depth: 0.8, height: 2.2 },
    ]) {
      const node = new THREE.Group();
      buildPersonalAsset(node, { kind: id, ...dimensions });
      const bounds = new THREE.Box3().setFromObject(node);
      assert.ok(bounds.min.x >= -dimensions.width / 2 - 1e-6);
      assert.ok(bounds.max.x <= dimensions.width / 2 + 1e-6);
      assert.ok(bounds.min.z >= -dimensions.depth / 2 - 1e-6);
      assert.ok(bounds.max.z <= dimensions.depth / 2 + 1e-6);
      assert.ok(bounds.min.y >= -1e-6);
      assert.ok(bounds.max.y <= dimensions.height + 1e-6);
      close(bounds.max.x - bounds.min.x, dimensions.width);
      close(bounds.max.z - bounds.min.z, dimensions.depth);
      close(bounds.min.y, 0);
      close(bounds.max.y, dimensions.height);
      assert.equal(node.userData.assetId, id);
    }
});

test("shelf stays open, with four full-height uprights and five boards below the uprights' tops", () => {
  const node = new THREE.Group();
  const element = {
    kind: "black-shelf",
    ...PERSONAL_ASSETS["black-shelf"].previewDimensions,
  };
  buildPersonalAsset(node, element);
  const posts = node.children.filter((mesh) => mesh.name === "shelf-upright");
  const shelves = node.children.filter((mesh) => mesh.name === "shelf-board");
  assert.equal(posts.length, 4);
  assert.equal(shelves.length, 5);
  assert.equal(node.children.length, 9); // No back or side panels.
  const top = new THREE.Box3().setFromObject(shelves.at(-1));
  assert.ok(top.max.y < element.height - 0.1);
});

test("chair is a separate rounded armchair, with two arms, a back, and seat cushion", () => {
  const node = new THREE.Group();
  buildPersonalAsset(node, {
    assetId: "green-seat",
    ...PERSONAL_ASSETS["green-seat"].previewDimensions,
  });
  assert.equal(
    node.children.filter((mesh) => mesh.name === "chair-arm").length,
    2,
  );
  assert.ok(node.getObjectByName("chair-back"));
  assert.ok(node.getObjectByName("seat-cushion"));
  assert.ok(
    node.getObjectByName("chair-arm").geometry.attributes.position.count > 24,
  );
});

test("builder preserves caller transform and rejects unknown assets or invalid dimensions before adding meshes", () => {
  const node = new THREE.Group();
  node.position.set(2, 0.4, -3);
  node.rotation.y = Math.PI / 2;
  buildPersonalAsset(node, {
    kind: "black-shelf",
    ...PERSONAL_ASSETS["black-shelf"].previewDimensions,
  });
  assert.deepEqual(node.position.toArray(), [2, 0.4, -3]);
  close(node.rotation.y, Math.PI / 2);
  for (const element of [
    { kind: "unknown", width: 1, depth: 1, height: 1 },
    { kind: "green-seat", width: NaN, depth: 1, height: 1 },
    { kind: "black-shelf", width: 1, depth: 0, height: 1 },
  ]) {
    const empty = new THREE.Group();
    assert.throws(() => buildPersonalAsset(empty, element));
    assert.equal(empty.children.length, 0);
  }
});
