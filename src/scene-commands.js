import { validateSceneEdit } from "./scene-edit.js";
import { PERSONAL_ASSETS } from "./personal-assets.js";
import { elementBounds, isSolidElement } from "./layout.js";

const rotations = [0, 90, 180, 270];
const validId = (value) =>
  typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value);
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const exactKeys = (value, keys) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));

export function cleanPersonalObjects(value = []) {
  if (!Array.isArray(value) || value.length > 12)
    throw new Error("Keep at most 12 personal objects in one arrangement.");
  const ids = new Set();
  return value.map((instance) => {
    if (
      !exactKeys(instance, ["id", "assetId", "x", "z", "rotation"]) ||
      !validId(instance.id) ||
      ids.has(instance.id) ||
      typeof instance.assetId !== "string" ||
      !Object.hasOwn(PERSONAL_ASSETS, instance.assetId) ||
      !finite(instance.x) ||
      !finite(instance.z) ||
      !rotations.includes(instance.rotation)
    )
      throw new Error("Invalid or duplicate personal object instance.");
    ids.add(instance.id);
    return {
      id: instance.id,
      assetId: instance.assetId,
      x: instance.x,
      z: instance.z,
      rotation: instance.rotation,
    };
  });
}

function candidateBounds(instance) {
  const asset = PERSONAL_ASSETS[instance.assetId];
  return elementBounds({
    ...asset.previewDimensions,
    x: instance.x,
    z: instance.z,
    rotation: instance.rotation,
  });
}

function checkPlacement(instance, layout) {
  const bounds = candidateBounds(instance);
  if (
    bounds.minX < -layout.width / 2 ||
    bounds.maxX > layout.width / 2 ||
    bounds.minZ < -layout.depth / 2 ||
    bounds.maxZ > layout.depth / 2
  )
    throw new Error("The preview object would extend outside this layout.");
  for (const element of layout.elements) {
    if (element.id === instance.id || !isSolidElement(element)) continue;
    const obstacle = elementBounds(element);
    if (
      bounds.minX < obstacle.maxX &&
      bounds.maxX > obstacle.minX &&
      bounds.minZ < obstacle.maxZ &&
      bounds.maxZ > obstacle.minZ
    )
      throw new Error(
        "That position overlaps another object or fixed structure. Choose a clear position.",
      );
  }
}

// This is the shared atomic command boundary for direct controls and model edits.
// Hypothetical asset bounds are useful for editing a preview, not real-world fit.
export function applySceneCommand(state, command, layout, expectedRevision) {
  if (
    typeof expectedRevision !== "string" ||
    !expectedRevision ||
    layout?.revision?.id !== expectedRevision
  )
    throw new Error(
      "The arrangement changed. Try this command again on the current revision.",
    );
  if (
    !layout ||
    !finite(layout.width) ||
    !finite(layout.depth) ||
    layout.width <= 0 ||
    layout.depth <= 0 ||
    !Array.isArray(layout.elements)
  )
    throw new Error("A valid current layout is required.");
  if (
    !state ||
    !["largeBed", "unfurnished", "evening"].every(
      (key) => typeof state[key] === "boolean",
    ) ||
    !Array.isArray(state.hiddenItems) ||
    state.hiddenItems.some(
      (item) => !["bed", "sofa", "table"].includes(item),
    ) ||
    new Set(state.hiddenItems).size !== state.hiddenItems.length
  )
    throw new Error("Invalid arrangement state.");
  const personalObjects = cleanPersonalObjects(state.personalObjects);
  const next = {
    ...structuredClone(state),
    hiddenItems: [...state.hiddenItems],
    personalObjects,
  };
  const fields = {
    place_asset: ["action", "assetId", "instanceId", "x", "z", "rotation"],
    move_instance: ["action", "instanceId", "x", "z"],
    rotate_instance: ["action", "instanceId", "rotation"],
    remove_instance: ["action", "instanceId"],
  };
  if (!Object.hasOwn(fields, command?.action)) {
    const edit = validateSceneEdit(command);
    if (edit.action === "resize_bed") {
      next.largeBed = edit.value === "king";
      next.unfurnished = false;
      next.hiddenItems = next.hiddenItems.filter((item) => item !== "bed");
    } else if (edit.action === "set_lighting")
      next.evening = edit.value === "evening";
    else if (edit.target === "furniture") {
      next.unfurnished = edit.value === "hide";
      if (!next.unfurnished) next.hiddenItems = [];
    } else if (edit.value === "show") {
      if (next.unfurnished) next.hiddenItems = ["bed", "sofa", "table"];
      next.unfurnished = false;
      next.hiddenItems = next.hiddenItems.filter(
        (item) => item !== edit.target,
      );
    } else if (!next.hiddenItems.includes(edit.target))
      next.hiddenItems.push(edit.target);
    return next;
  }
  if (
    !exactKeys(command, fields[command.action]) ||
    !validId(command.instanceId)
  )
    throw new Error("Invalid personal object command.");
  const index = personalObjects.findIndex(
    (instance) => instance.id === command.instanceId,
  );
  let candidate;
  if (command.action === "place_asset") {
    if (
      index !== -1 ||
      layout.elements.some((element) => element.id === command.instanceId)
    )
      throw new Error(
        "That object ID already exists. Use a new stable instance ID.",
      );
    candidate = {
      id: command.instanceId,
      assetId: command.assetId,
      x: command.x,
      z: command.z,
      rotation: command.rotation,
    };
    cleanPersonalObjects([...personalObjects, candidate]);
  } else {
    if (index === -1)
      throw new Error(
        "Only an existing personal object can be moved, rotated, or removed.",
      );
    const matchingElement = layout.elements.find(
      (element) => element.id === command.instanceId,
    );
    if (
      matchingElement &&
      (matchingElement.category !== "furniture" ||
        matchingElement.assetId !== personalObjects[index].assetId)
    )
      throw new Error(
        "Fixed structures and nonpersonal furniture cannot be changed by this command.",
      );
    if (command.action === "remove_instance") {
      next.personalObjects.splice(index, 1);
      return next;
    }
    candidate = {
      ...personalObjects[index],
      ...(command.action === "move_instance"
        ? { x: command.x, z: command.z }
        : { rotation: command.rotation }),
    };
    cleanPersonalObjects([candidate]);
  }
  checkPlacement(candidate, layout);
  if (command.action === "place_asset") next.personalObjects.push(candidate);
  else next.personalObjects[index] = candidate;
  return next;
}
