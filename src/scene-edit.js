const contextKeys = [
  "version",
  "width",
  "depth",
  "provenance",
  "bedSize",
  "lighting",
  "unfurnished",
  "hiddenItems",
];
const itemNames = ["bed", "sofa", "table"];

function exactKeys(value, keys) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

// Return a canonical context for cache identity; never accept address/source data.
export function validateSceneContext(scene) {
  if (
    !exactKeys(scene, contextKeys) ||
    scene.version !== 1 ||
    ![scene.width, scene.depth].every(
      (n) => typeof n === "number" && Number.isFinite(n) && n >= 3 && n <= 30,
    ) ||
    !["inferred", "synthetic"].includes(scene.provenance) ||
    !["king", "queen"].includes(scene.bedSize) ||
    !["day", "evening"].includes(scene.lighting) ||
    typeof scene.unfurnished !== "boolean" ||
    !Array.isArray(scene.hiddenItems) ||
    scene.hiddenItems.length > itemNames.length ||
    !scene.hiddenItems.every((item) => itemNames.includes(item)) ||
    new Set(scene.hiddenItems).size !== scene.hiddenItems.length
  ) {
    throw new Error("Invalid scene context.");
  }
  return {
    version: 1,
    width: scene.width,
    depth: scene.depth,
    provenance: scene.provenance,
    bedSize: scene.bedSize,
    lighting: scene.lighting,
    unfurnished: scene.unfurnished,
    hiddenItems: [...scene.hiddenItems].sort(),
  };
}

export function validateSceneEdit(edit) {
  if (
    !exactKeys(edit, ["action", "target", "value"]) ||
    ![edit.action, edit.target, edit.value].every(
      (value) => typeof value === "string",
    )
  ) {
    throw new Error("Invalid scene edit.");
  }
  const valid =
    (edit.action === "resize_bed" &&
      edit.target === "bed" &&
      ["king", "queen"].includes(edit.value)) ||
    (edit.action === "set_visibility" &&
      [...itemNames, "furniture"].includes(edit.target) &&
      ["show", "hide"].includes(edit.value)) ||
    (edit.action === "set_lighting" &&
      edit.target === "scene" &&
      ["day", "evening"].includes(edit.value));
  if (!valid) throw new Error("Unsupported scene edit.");
  return { action: edit.action, target: edit.target, value: edit.value };
}

// The model can explicitly decline, but unsupported is never an executable edit.
export const sceneEditSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: {
      type: "string",
      enum: ["resize_bed", "set_visibility", "set_lighting", "unsupported"],
    },
    target: {
      type: "string",
      enum: ["bed", "sofa", "table", "furniture", "scene"],
    },
    value: {
      type: "string",
      enum: ["king", "queen", "show", "hide", "day", "evening"],
    },
  },
  required: ["action", "target", "value"],
};
