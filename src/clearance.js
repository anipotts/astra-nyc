// Horizontal, axis-aligned floor clearances. These are geometric distances,
// not an accessibility, circulation, or real-world furniture-fit certification.
export function clearanceAround(target, obstacles) {
  const result = {
    left: Infinity,
    right: Infinity,
    head: Infinity,
    foot: Infinity,
    overlap: false,
  };
  for (const b of obstacles) {
    if (b === target) continue;
    const overlapX = target.minX < b.maxX && target.maxX > b.minX;
    const overlapZ = target.minZ < b.maxZ && target.maxZ > b.minZ;
    if (overlapX && overlapZ) result.overlap = true;
    if (overlapZ) {
      if (b.maxX <= target.minX)
        result.left = Math.min(result.left, target.minX - b.maxX);
      if (b.minX >= target.maxX)
        result.right = Math.min(result.right, b.minX - target.maxX);
    }
    if (overlapX) {
      if (b.maxZ <= target.minZ)
        result.head = Math.min(result.head, target.minZ - b.maxZ);
      if (b.minZ >= target.maxZ)
        result.foot = Math.min(result.foot, b.minZ - target.maxZ);
    }
  }
  return result;
}
export function validateBedEdit(edit) {
  if (
    !edit ||
    typeof edit !== "object" ||
    Array.isArray(edit) ||
    Object.keys(edit).sort().join(",") !== "action,size,target" ||
    edit.action !== "resize_bed" ||
    edit.target !== "existing_bed" ||
    !["king", "queen"].includes(edit.size)
  )
    throw new Error(
      "Astra returned an unsupported scene edit. The scene was not changed.",
    );
  return Object.freeze({
    action: edit.action,
    target: edit.target,
    size: edit.size,
  });
}
