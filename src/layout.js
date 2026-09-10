const evidence = () => ({
  basis: "synthetic",
  source: "Event-authored demonstration",
});

// Both presets are authored demo layouts. Listing area alone cannot create one.
export function createLayout(home, state = {}) {
  const key =
    typeof home === "string"
      ? home
      : home?.width === 10 && home?.depth === 8 && !home?.studio
        ? "current"
        : home?.width === 12 && home?.depth === 10 && !home?.studio
          ? "potential"
          : null;
  if (!["current", "potential"].includes(key))
    throw new Error("A supported synthetic home is required.");
  const w = key === "current" ? 10 : 12;
  const d = key === "current" ? 8 : 10;
  const hidden = state.hiddenItems ?? [];
  const furnitureVisible = (group) =>
    !state.unfurnished && !hidden.includes(group);
  const elements = [];
  function add(
    id,
    label,
    category,
    kind,
    x,
    z,
    width,
    depth,
    height,
    y,
    visible = true,
  ) {
    elements.push({
      id,
      label,
      category,
      kind,
      x,
      z,
      width,
      depth,
      height,
      y,
      rotation: 0,
      visible,
      evidence: evidence(),
    });
  }
  add(
    "floor",
    "Floor",
    "structure",
    "floor",
    0,
    0,
    w + 0.35,
    d + 0.35,
    0.2,
    -0.1,
  );
  add(
    "wall-back",
    "Window wall base",
    "structure",
    "wall",
    0,
    -d / 2,
    w,
    0.18,
    1.18,
    0.59,
  );
  add(
    "wall-back-lintel",
    "Window wall lintel",
    "structure",
    "lintel",
    0,
    -d / 2,
    w,
    0.18,
    0.25,
    2.82,
  );
  for (const [index, x] of [-w / 2, 0, w / 2].entries())
    add(
      `wall-back-post-${index}`,
      "Window wall pier",
      "structure",
      "wall",
      x,
      -d / 2,
      0.22,
      0.2,
      3,
      1.5,
    );
  for (const [index, x] of [-w / 4, w / 4].entries())
    add(
      `window-${index}`,
      "Window",
      "structure",
      "window",
      x,
      -d / 2,
      w / 2 - 0.25,
      0.09,
      1.4,
      1.9,
    );
  add(
    "wall-left",
    "Left exterior wall",
    "structure",
    "wall",
    -w / 2,
    0,
    0.18,
    d,
    3,
    1.5,
  );
  add(
    "wall-right",
    "Right exterior wall",
    "structure",
    "wall",
    w / 2,
    0,
    0.18,
    d,
    3,
    1.5,
  );
  const frontWidth = w / 2 - 0.9;
  for (const [side, sign] of [
    ["left", -1],
    ["right", 1],
  ])
    add(
      `wall-front-${side}`,
      "Entry wall",
      "structure",
      "wall",
      sign * (0.9 + frontWidth / 2),
      d / 2,
      frontWidth,
      0.18,
      3,
      1.5,
    );
  add(
    "entry-lintel",
    "Entry lintel",
    "structure",
    "lintel",
    0,
    d / 2,
    1.8,
    0.18,
    0.65,
    2.675,
  );
  add(
    "wall-bedroom",
    "Bedroom divider",
    "structure",
    "wall",
    w * 0.19,
    -1.25,
    0.14,
    d - 2.5,
    2.9,
    1.45,
  );
  add(
    "living-rug",
    "Living room rug",
    "furniture",
    "rug",
    -w * 0.22,
    -0.45,
    w * 0.32,
    d * 0.65,
    0.09,
    0.075,
    !state.unfurnished,
  );
  add(
    "sofa",
    "Sofa",
    "furniture",
    "sofa",
    -w * 0.25,
    -d * 0.13,
    1.15,
    2.8,
    1.25,
    0.625,
    furnitureVisible("sofa"),
  );
  add(
    "coffee-table",
    "Coffee table",
    "furniture",
    "table",
    -w * 0.25 + 1.65,
    -d * 0.13,
    1.15,
    1.4,
    0.55,
    0.275,
    furnitureVisible("table"),
  );
  // Canonical bounds encompass the frame and headboard, rather than mattress only.
  add(
    "bed",
    state.largeBed ? "King bed" : "Queen bed",
    "furniture",
    "bed",
    w * 0.34,
    -d * 0.18 - 0.065,
    (state.largeBed ? 1.93 : 1.52) + 0.12,
    2.23,
    1.05,
    0.525,
    furnitureVisible("bed"),
  );
  // Fixed cabinets/counter remain when movable furniture is hidden.
  add(
    "kitchen",
    "Fixed kitchen",
    "fixtures",
    "kitchen",
    -w * 0.32,
    d / 2 - 0.46,
    w * 0.27,
    0.71,
    1,
    0.5,
  );
  for (const [id, x, z, size] of [
    ["plant-left", -w / 2 + 0.5, -d / 2 + 0.65, 1.15],
    ["plant-right", w / 2 - 0.55, -d / 2 + 0.6, 0.95],
    ["plant-entry", w / 2 - 0.55, d / 2 - 0.55, 1.15],
  ])
    add(
      id,
      "Potted plant",
      "furniture",
      "plant",
      x,
      z,
      size * 0.7,
      size * 0.7,
      size * 1.2,
      size * 0.6,
      !state.unfurnished,
    );
  add(
    "entry-mat",
    "Entry mat",
    "furniture",
    "rug",
    0,
    d / 2 - 0.6,
    1.45,
    0.8,
    0.035,
    0.05,
    !state.unfurnished,
  );
  return {
    id: `synthetic-${key}-v1`,
    label: key === "current" ? "Current home" : "Potential home",
    units: "m",
    width: w,
    depth: d,
    measurementStatus: "synthetic",
    elements,
    openings: [
      {
        id: "front-door",
        label: "Entry opening",
        x: 0,
        z: d / 2,
        width: 1.8,
        depth: 0.18,
      },
      {
        id: "bedroom-entry",
        label: "Bedroom opening",
        x: w * 0.19,
        z: d / 2 - 1.25,
        width: 0.14,
        depth: 2.5,
      },
    ],
    sources: [],
  };
}

export function elementBounds(element) {
  if (element.rotation !== 0)
    throw new Error("Only axis-aligned layout elements are supported.");
  return {
    minX: element.x - element.width / 2,
    maxX: element.x + element.width / 2,
    minZ: element.z - element.depth / 2,
    maxZ: element.z + element.depth / 2,
  };
}

export function isSolidElement(element) {
  return (
    element.visible &&
    ["wall", "bed", "sofa", "table", "kitchen", "plant"].includes(element.kind)
  );
}
