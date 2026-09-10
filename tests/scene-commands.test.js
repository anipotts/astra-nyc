import test from "node:test";
import assert from "node:assert/strict";
import {
  applySceneCommand,
  cleanPersonalObjects,
} from "../src/scene-commands.js";
import { PERSONAL_ASSETS } from "../src/personal-assets.js";
import { createLayout } from "../src/layout.js";
const state = (patch = {}) => ({
  largeBed: false,
  unfurnished: false,
  evening: false,
  hiddenItems: [],
  personalObjects: [],
  ...patch,
});
const room = (elements = [], patch = {}) => ({
  width: 10,
  depth: 8,
  elements,
  revision: { id: "r1" },
  ...patch,
});
const object = (patch = {}) => ({
  id: "my-shelf",
  assetId: "black-shelf",
  x: 0,
  z: 0,
  rotation: 0,
  ...patch,
});
const element = (instance) => ({
  ...instance,
  ...PERSONAL_ASSETS[instance.assetId].previewDimensions,
  kind: instance.assetId,
  category: "furniture",
  visible: true,
});
const place = (patch = {}) => ({
  action: "place_asset",
  assetId: "black-shelf",
  instanceId: "my-shelf",
  x: 0,
  z: 0,
  rotation: 0,
  ...patch,
});
const apply = (input, command, layout = room(), revision = "r1") =>
  applySceneCommand(input, command, layout, revision);
function frozen(value) {
  for (const child of Object.values(value))
    if (child && typeof child === "object") frozen(child);
  return Object.freeze(value);
}

test("commands return independent state, retain stable instance identity, and never mutate inputs", () => {
  const original = frozen(state()),
    layout = frozen(room()),
    command = frozen(place());
  const placed = apply(original, command, layout);
  assert.equal(original.personalObjects.length, 0);
  assert.deepEqual(placed.personalObjects, [object()]);
  const moved = apply(
    placed,
    { action: "move_instance", instanceId: "my-shelf", x: 1, z: 1 },
    room([element(object())]),
  );
  assert.equal(placed.personalObjects[0].x, 0);
  assert.equal(moved.personalObjects[0].id, "my-shelf");
  assert.equal(moved.personalObjects[0].x, 1);
  const removed = apply(
    moved,
    { action: "remove_instance", instanceId: "my-shelf" },
    room([element(moved.personalObjects[0])]),
  );
  assert.equal(removed.personalObjects.length, 0);
  assert.equal(moved.personalObjects.length, 1);
});

test("invalid commands and stale revisions reject atomically without partial state changes", () => {
  const original = frozen(state({ personalObjects: [object()] }));
  const before = JSON.stringify(original);
  for (const [command, revision] of [
    [place(), "stale"],
    [place(), undefined],
    [
      { action: "move_instance", instanceId: "my-shelf", x: Infinity, z: 0 },
      "r1",
    ],
    [{ action: "rotate_instance", instanceId: "my-shelf", rotation: 45 }, "r1"],
    [{ action: "remove_instance", instanceId: "my-shelf", extra: true }, "r1"],
    [{ action: "unsupported", target: "scene", value: "day" }, "r1"],
    [[place(), place()], "r1"],
  ]) {
    assert.throws(() =>
      applySceneCommand(original, command, room([element(object())]), revision),
    );
    assert.equal(JSON.stringify(original), before);
  }
});

test("instance sanitizer copies records and rejects duplicates, extra fields, IDs, assets, dimensions, and cap overflow", () => {
  const input = [object()];
  const copy = cleanPersonalObjects(input);
  copy[0].x = 3;
  assert.equal(input[0].x, 0);
  assert.deepEqual(cleanPersonalObjects(), []);
  for (const invalid of [
    null,
    {},
    [object(), object()],
    [object({ id: "" })],
    [object({ id: "a/b" })],
    [object({ id: "x".repeat(65) })],
    [object({ assetId: "unknown" })],
    [object({ assetId: ["black-shelf"] })],
    [object({ x: "1" })],
    [object({ z: NaN })],
    [object({ rotation: -90 })],
    [{ ...object(), width: 3 }],
    Array.from({ length: 13 }, (_, i) => object({ id: "item-" + i })),
  ])
    assert.throws(() => cleanPersonalObjects(invalid));
  assert.equal(
    cleanPersonalObjects([
      object({ id: "123e4567-e89b-12d3-a456-426614174000" }),
    ]).length,
    1,
  );
  assert.throws(() => apply(state({ personalObjects: [object()] }), place()));
  assert.throws(() =>
    apply(
      state(),
      place({ instanceId: "kitchen" }),
      room([
        {
          id: "kitchen",
          category: "fixtures",
          kind: "kitchen",
          visible: true,
          x: 3,
          z: 3,
          width: 1,
          depth: 1,
          rotation: 0,
        },
      ]),
    ),
  );
});

test("fixed fixtures and nonpersonal furniture cannot be moved or impersonated", () => {
  const kitchen = {
    id: "kitchen",
    category: "fixtures",
    kind: "kitchen",
    visible: true,
    x: 2,
    z: 2,
    width: 1,
    depth: 1,
    rotation: 0,
  };
  assert.throws(() =>
    apply(
      state(),
      { action: "move_instance", instanceId: "kitchen", x: 0, z: 0 },
      room([kitchen]),
    ),
  );
  assert.throws(() =>
    apply(
      state({ personalObjects: [object({ id: "kitchen" })] }),
      { action: "remove_instance", instanceId: "kitchen" },
      room([kitchen]),
    ),
  );
  assert.throws(() =>
    apply(state(), {
      action: "rotate_instance",
      instanceId: "bed",
      rotation: 90,
    }),
  );
});

test("quarter turns use canonical rotated bounds for room containment and collision", () => {
  const nearEdge = object({ x: 4.7, rotation: 90 });
  const rotated = apply(
    state({ personalObjects: [nearEdge] }),
    { action: "rotate_instance", instanceId: "my-shelf", rotation: 270 },
    room([element(nearEdge)]),
  );
  assert.equal(rotated.personalObjects[0].rotation, 270);
  assert.throws(
    () =>
      apply(
        state({ personalObjects: [nearEdge] }),
        { action: "rotate_instance", instanceId: "my-shelf", rotation: 0 },
        room([element(nearEdge)]),
      ),
    /outside/,
  );
  const obstacle = {
    id: "fixed",
    category: "fixtures",
    kind: "kitchen",
    visible: true,
    x: 0,
    z: 0.42,
    width: 0.2,
    depth: 0.2,
    rotation: 0,
  };
  const input = state({ personalObjects: [object()] });
  assert.throws(
    () =>
      apply(
        input,
        { action: "rotate_instance", instanceId: "my-shelf", rotation: 90 },
        room([element(object()), obstacle]),
      ),
    /overlaps/,
  );
  assert.throws(() => apply(state(), place({ x: 5 }), room()), /outside/);
});

test("only target overlap blocks edits; hidden objects and unrelated existing conflicts do not", () => {
  const block = {
    id: "other",
    category: "fixtures",
    kind: "kitchen",
    visible: true,
    x: 3,
    z: 3,
    width: 1,
    depth: 1,
    rotation: 0,
  };
  assert.equal(
    apply(
      state(),
      place(),
      room([block, { ...block, id: "existing-conflict" }]),
    ).personalObjects.length,
    1,
  );
  assert.throws(
    () => apply(state(), place({ x: 3, z: 3 }), room([block])),
    /overlaps/,
  );
  assert.equal(
    apply(state(), place({ x: 3, z: 3 }), room([{ ...block, visible: false }]))
      .personalObjects.length,
    1,
  );
  const instance = object();
  assert.equal(
    apply(
      state({ personalObjects: [instance] }),
      { action: "move_instance", instanceId: instance.id, x: 0, z: 0 },
      room([element(instance)]),
    ).personalObjects.length,
    1,
  );
});

test("legacy validated edits preserve prior bed, visibility, and lighting semantics", () => {
  let next = apply(
    state({
      unfurnished: true,
      hiddenItems: ["bed", "sofa"],
      personalObjects: [object()],
    }),
    { action: "resize_bed", target: "bed", value: "king" },
  );
  assert.equal(next.largeBed, true);
  assert.equal(next.unfurnished, false);
  assert.deepEqual(next.hiddenItems, ["sofa"]);
  assert.deepEqual(next.personalObjects, [object()]);
  next = apply(state({ unfurnished: true }), {
    action: "set_visibility",
    target: "sofa",
    value: "show",
  });
  assert.equal(next.unfurnished, false);
  assert.deepEqual(next.hiddenItems, ["bed", "table"]);
  next = apply(next, {
    action: "set_visibility",
    target: "furniture",
    value: "hide",
  });
  assert.equal(next.unfurnished, true);
  next = apply(next, {
    action: "set_visibility",
    target: "furniture",
    value: "show",
  });
  assert.equal(next.unfurnished, false);
  assert.deepEqual(next.hiddenItems, []);
  next = apply(next, {
    action: "set_lighting",
    target: "scene",
    value: "evening",
  });
  assert.equal(next.evening, true);
  assert.throws(() =>
    apply(next, { action: "resize_bed", target: "table", value: "king" }),
  );
});

test("commands operate against real canonical synthetic layout fixtures and personal bounds", () => {
  const initial = state();
  const layout = createLayout("current", initial);
  layout.revision = { id: "r1" };
  const added = apply(initial, place({ x: 0, z: 1 }), layout);
  assert.equal(added.personalObjects.length, 1);
  const refreshed = createLayout("current", added);
  refreshed.revision = { id: "r2" };
  assert.ok(refreshed.elements.some((e) => e.id === "my-shelf"));
  const moved = apply(
    added,
    { action: "move_instance", instanceId: "my-shelf", x: 0, z: 2 },
    refreshed,
    "r2",
  );
  assert.equal(moved.personalObjects[0].z, 2);
  assert.throws(
    () =>
      apply(
        added,
        { action: "move_instance", instanceId: "my-shelf", x: -3.2, z: 3.54 },
        refreshed,
        "r2",
      ),
    /overlaps/,
  );
});
