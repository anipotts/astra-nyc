const unknownDimension = () => Object.freeze({ value: null, basis: "unknown" });
function asset(id, label, previewDimensions, description) {
  return Object.freeze({
    id,
    label,
    kind: id,
    revision: 1,
    units: "m",
    dimensions: Object.freeze({
      width: unknownDimension(),
      depth: unknownDimension(),
      height: unknownDimension(),
    }),
    previewDimensions: Object.freeze(previewDimensions),
    previewDimensionBasis:
      "hypothetical modeling defaults; not measured or photo-derived scale",
    description,
    appearanceBasis:
      "Original event-authored approximation from a supplied description; exact product unidentified",
  });
}

// The original objects' measurements are unknown. These previews cannot establish
// real-world furniture fit until measurements are supplied separately.
export const PERSONAL_ASSETS = Object.freeze({
  "green-seat": asset(
    "green-seat",
    "Green armchair",
    { width: 1.1, depth: 1.05, height: 0.85 },
    "Separate movable low upholstered armchair with chunky rounded green arms, a rounded back, and a seat cushion.",
  ),
  "black-shelf": asset(
    "black-shelf",
    "Black open shelf",
    { width: 0.8, depth: 0.35, height: 1.8 },
    "Narrow tall open shelf with four slender corner uprights, five boards, an open back, and uprights extending above the top board.",
  ),
});
