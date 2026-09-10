import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { PERSONAL_ASSETS } from "./personal-assets.js";

const upholstery = new THREE.MeshStandardMaterial({
  color: "#4f6842",
  roughness: 0.96,
});
const cushion = new THREE.MeshStandardMaterial({
  color: "#617a50",
  roughness: 0.98,
});
const frame = new THREE.MeshStandardMaterial({
  color: "#20231f",
  roughness: 0.58,
  metalness: 0.15,
});
const boards = new THREE.MeshStandardMaterial({
  color: "#292d27",
  roughness: 0.78,
});

function box(node, name, width, height, depth, x, y, z, material, radius = 0) {
  const geometry =
    radius > 0
      ? new RoundedBoxGeometry(
          width,
          height,
          depth,
          4,
          Math.min(radius, width / 2, height / 2, depth / 2),
        )
      : new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  node.add(mesh);
  return mesh;
}

// Caller positions/rotates this node. All detail stays inside the canonical
// element footprint and between its local floor (y=0) and declared height.
export function buildPersonalAsset(node, element) {
  const id = element.assetId || element.kind || element.id;
  if (!Object.hasOwn(PERSONAL_ASSETS, id))
    throw new Error("Unsupported personal asset.");
  const { width: w, depth: d, height: h } = element;
  if (
    ![w, d, h].every(
      (value) =>
        typeof value === "number" && Number.isFinite(value) && value > 0,
    )
  )
    throw new Error(
      "Personal asset preview dimensions must be positive finite metres.",
    );
  node.userData.assetId = id;
  node.userData.assetRevision = PERSONAL_ASSETS[id].revision;
  node.userData.measurementBasis = "hypothetical preview dimensions";
  if (id === "green-seat") {
    // Four low recessed feet make the chair read as a separate movable object.
    for (const side of [-1, 1])
      for (const end of [-1, 1])
        box(
          node,
          "chair-foot",
          w * 0.075,
          h * 0.1,
          d * 0.075,
          side * w * 0.34,
          h * 0.05,
          end * d * 0.34,
          frame,
          Math.min(w, d) * 0.014,
        );
    box(
      node,
      "chair-base",
      w * 0.95,
      h * 0.23,
      d * 0.94,
      0,
      h * 0.21,
      0,
      upholstery,
      h * 0.07,
    );
    box(
      node,
      "chair-back",
      w,
      h * 0.77,
      d * 0.23,
      0,
      h * 0.615,
      -d * 0.385,
      upholstery,
      Math.min(w, h, d) * 0.11,
    );
    for (const side of [-1, 1])
      box(
        node,
        "chair-arm",
        w * 0.23,
        h * 0.52,
        d * 0.94,
        side * w * 0.385,
        h * 0.45,
        d * 0.03,
        upholstery,
        Math.min(w, h, d) * 0.1,
      );
    box(
      node,
      "seat-cushion",
      w * 0.56,
      h * 0.2,
      d * 0.7,
      0,
      h * 0.385,
      d * 0.12,
      cushion,
      Math.min(w, h, d) * 0.065,
    );
    box(
      node,
      "back-cushion",
      w * 0.56,
      h * 0.46,
      d * 0.13,
      0,
      h * 0.665,
      -d * 0.2,
      cushion,
      Math.min(w, h, d) * 0.07,
    );
  } else {
    const postWidth = w * 0.045;
    const postDepth = d * 0.095;
    for (const side of [-1, 1])
      for (const end of [-1, 1])
        box(
          node,
          "shelf-upright",
          postWidth,
          h,
          postDepth,
          (side * (w - postWidth)) / 2,
          h / 2,
          (end * (d - postDepth)) / 2,
          frame,
        );
    for (let i = 0; i < 5; i++)
      box(
        node,
        "shelf-board",
        w,
        h * 0.019,
        d,
        0,
        h * (0.065 + i * 0.21),
        0,
        boards,
      );
  }
  return node;
}
