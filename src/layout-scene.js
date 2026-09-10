import * as THREE from "three";
import { buildPersonalAsset } from "./personal-asset-mesh.js";
import { elementBounds, isSolidElement } from "./layout.js";

const materials = new Map();
function material(color) {
  if (!materials.has(color))
    materials.set(
      color,
      new THREE.MeshStandardMaterial({ color, roughness: 0.83 }),
    );
  return materials.get(color);
}
function box(parent, w, h, d, x, y, z, color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// All world footprints come from layout elements. Detail meshes are contained in
// their owning element and never add a separate collision or placement model.
export function buildLayoutScene(group, solids, layout, options = {}) {
  group.userData.layoutId = layout.id;
  group.userData.bedFootprint = null;
  for (const e of layout.elements) {
    if (!e.visible) continue;
    const node = new THREE.Group();
    node.name = e.id;
    node.position.set(e.x, e.y - e.height / 2, e.z);
    node.userData.elementId = e.id;
    node.rotation.y = -THREE.MathUtils.degToRad(e.rotation);
    group.add(node);
    const w = e.width,
      d = e.depth,
      h = e.height;
    const draw = (width, height, depth, x, y, z, color) =>
      box(node, width, height, depth, x, y, z, color);
    if (isSolidElement(e)) {
      const bounds = elementBounds(e);
      solids.push(bounds);
      if (e.id === "bed") group.userData.bedFootprint = bounds;
    }
    if (e.assetId) {
      buildPersonalAsset(node, e);
    } else if (e.kind === "floor") {
      draw(w, h, d, 0, h / 2, 0, "#b6a78a");
      const count = Math.ceil((w - 0.35) / 0.28),
        step = (w - 0.35) / count;
      for (let i = 0; i < count; i++)
        draw(
          step - 0.005,
          0.025,
          d - 0.47,
          -(w - 0.35) / 2 + step * (i + 0.5),
          h + 0.0125,
          0,
          ["#c7b597", "#cbb99b", "#c3af91", "#d0bea2"][i % 4],
        );
    } else if (e.kind === "wall" || e.kind === "lintel") {
      const mesh = draw(w, h, d, 0, h / 2, 0, "#efede4");
      if (e.id === "wall-right" || e.id.startsWith("wall-front-")) {
        mesh.userData.cutaway = true;
        mesh.userData.fullHeight = h;
        mesh.userData.fullY = h / 2;
        if (options.cutaway) {
          mesh.scale.y = 0.19;
          mesh.position.y = (h / 2) * 0.19;
        }
      }
    } else if (e.kind === "window") {
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d * 0.44),
        new THREE.MeshStandardMaterial({
          color: "#b8d5d2",
          transparent: true,
          opacity: 0.35,
          roughness: 0.15,
        }),
      );
      glass.position.y = h / 2;
      node.add(glass);
      for (const y of [0.0375, h - 0.0375])
        draw(w, 0.075, d, 0, y, 0, "#646e62");
      for (const x of [-w / 2 + 0.0325, 0, w / 2 - 0.0325])
        draw(0.065, h, d * 0.72, x, h / 2, 0, "#646e62");
    } else if (e.kind === "bed") {
      const mattressWidth = w - 0.12;
      draw(mattressWidth, h * 0.305, d - 0.13, 0, h * 0.257, 0.065, "#a89372");
      draw(mattressWidth, h * 0.21, d - 0.2, 0, h * 0.514, 0.065, "#e6e2d8");
      draw(
        mattressWidth,
        h * 0.067,
        d * 0.62,
        0,
        h * 0.667,
        d * 0.18,
        "#899982",
      );
      for (const sign of [-1, 1])
        draw(
          mattressWidth * 0.39,
          h * 0.133,
          d * 0.206,
          sign * mattressWidth * 0.25,
          h * 0.724,
          -d * 0.36,
          "#f5f1e5",
        );
      draw(w, h, 0.12, 0, h / 2, -d / 2 + 0.06, "#b19b79");
    } else if (e.kind === "sofa") {
      const color = layout.id.includes("current") ? "#637855" : "#748669";
      draw(w * 0.913, h * 0.32, d, 0, h * 0.344, 0, color);
      draw(w * 0.209, h * 0.72, d, -w / 2 + w * 0.1045, h * 0.64, 0, color);
      for (const sign of [-1, 1])
        draw(w, h * 0.56, d * 0.082, 0, h * 0.512, sign * d * 0.446, color);
      for (let i = 0; i < 3; i++)
        draw(
          w * 0.756,
          h * 0.144,
          d * 0.275,
          w * 0.035,
          h * 0.568,
          d * (-0.3 + i * 0.3),
          "#839274",
        );
    } else if (e.kind === "table") {
      draw(w, h * 0.182, d, 0, h * 0.909, 0, "#b49c76");
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          draw(
            w * 0.048,
            h * 0.8,
            d * 0.039,
            sx * w * 0.383,
            h * 0.4,
            sz * d * 0.393,
            "#8a775d",
          );
    } else if (e.kind === "kitchen") {
      draw(w * 0.963, h * 0.86, d * 0.915, 0, h * 0.43, 0, "#d5d1c2");
      draw(w, h * 0.07, d, 0, h * 0.9, 0, "#f1eddf");
      draw(w * 0.22, h * 0.035, d * 0.648, -w * 0.074, h * 0.96, 0, "#434b42");
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) {
          const burner = new THREE.Mesh(
            new THREE.CylinderGeometry(w * 0.033, w * 0.033, h * 0.014, 16),
            material("#737c70"),
          );
          burner.position.set(
            -w * 0.074 + sx * w * 0.052,
            h * 0.99,
            sz * d * 0.141,
          );
          node.add(burner);
        }
    } else if (e.kind === "plant") {
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(w * 0.28, w * 0.24, h * 0.32, 16),
        material("#cbc4ad"),
      );
      pot.position.y = h * 0.16;
      pot.castShadow = pot.receiveShadow = true;
      node.add(pot);
      for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1, 0),
          material(i % 2 ? "#627655" : "#465f43"),
        );
        leaf.scale.set(w * 0.2, h * 0.25, d * 0.2);
        leaf.position.set(
          Math.sin(i * 2) * w * 0.22,
          h * (0.53 + i * 0.045),
          Math.cos(i * 2) * d * 0.22,
        );
        leaf.castShadow = true;
        node.add(leaf);
      }
    } else {
      draw(w, h, d, 0, h / 2, 0, "#ded4bf");
    }
  }
  return group;
}
