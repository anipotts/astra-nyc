import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// Original procedural materials and furniture authored during the event.
// Dimensions below describe an inferred design, not the listing's measured plan.
const palette = new Map();
function surface(color, roughness = 0.8, map = null) {
  const key = color + roughness + (map?.uuid ?? "");
  if (!palette.has(key))
    palette.set(key, new THREE.MeshStandardMaterial({ color, roughness, map }));
  return palette.get(key);
}
let wood, fabric, shadow;
function textures() {
  if (wood) return;
  let seed = 17;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#c6a57c";
  ctx.fillRect(0, 0, 512, 1024);
  for (let row = 0; row < 8; row++) {
    const shade = 160 + Math.floor(random() * 28);
    ctx.fillStyle = `rgb(${shade + 40},${shade + 12},${shade - 24})`;
    ctx.fillRect(row * 64, 0, 63, 1024);
    for (let i = 0; i < 100; i++) {
      ctx.strokeStyle = `rgba(90,56,24,${0.025 + random() * 0.06})`;
      ctx.lineWidth = 0.5 + random();
      ctx.beginPath();
      const x = row * 64 + random() * 62;
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 8, 300, x - 8, 600, x, 1024);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(65,45,25,.15)";
    ctx.fillRect(row * 64, ((row % 3) * 330 + 130) % 1024, 64, 1);
  }
  wood = new THREE.CanvasTexture(canvas);
  wood.colorSpace = THREE.SRGBColorSpace;
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
  wood.repeat.set(2, 2);
  wood.anisotropy = 8;
  const cloth = document.createElement("canvas");
  cloth.width = cloth.height = 128;
  const cc = cloth.getContext("2d");
  cc.fillStyle = "#ddd9cc";
  cc.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 2) {
    cc.strokeStyle = i % 4 ? "#d1cbbd" : "#e8e4d9";
    cc.lineWidth = 0.5;
    cc.beginPath();
    cc.moveTo(i, 0);
    cc.lineTo(i, 128);
    cc.moveTo(0, i);
    cc.lineTo(128, i);
    cc.stroke();
  }
  fabric = new THREE.CanvasTexture(cloth);
  fabric.colorSpace = THREE.SRGBColorSpace;
  fabric.wrapS = fabric.wrapT = THREE.RepeatWrapping;
  fabric.repeat.set(5, 5);
  const contact = document.createElement("canvas");
  contact.width = contact.height = 128;
  const sc = contact.getContext("2d");
  const grad = sc.createRadialGradient(64, 64, 8, 64, 64, 64);
  grad.addColorStop(0, "rgba(30,24,15,.3)");
  grad.addColorStop(0.55, "rgba(30,24,15,.15)");
  grad.addColorStop(1, "rgba(30,24,15,0)");
  sc.fillStyle = grad;
  sc.fillRect(0, 0, 128, 128);
  shadow = new THREE.CanvasTexture(contact);
}
export function studioBed(largeBed) {
  return { x: 1.7, z: -1.55, width: largeBed ? 1.93 : 1.52, depth: 2.03 };
}
export function buildStudio(group, solids, state, dimensions) {
  group.userData.bedFootprint = null;
  textures();
  const w = dimensions.width,
    d = dimensions.depth;
  function box(
    width,
    height,
    depth,
    x,
    y,
    z,
    color,
    solid = false,
    radius = 0,
    texture = null,
  ) {
    const mesh = new THREE.Mesh(
      radius
        ? new RoundedBoxGeometry(
            width,
            height,
            depth,
            3,
            Math.min(radius, width / 3, height / 3, depth / 3),
          )
        : new THREE.BoxGeometry(width, height, depth),
      surface(color, 0.82, texture),
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (solid)
      solids.push({
        minX: x - width / 2,
        maxX: x + width / 2,
        minZ: z - depth / 2,
        maxZ: z + depth / 2,
      });
    return mesh;
  }
  function cylinder(r, h, x, y, z, color, metal = false) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, h, 32),
      metal
        ? new THREE.MeshStandardMaterial({
            color,
            metalness: 0.7,
            roughness: 0.3,
          })
        : surface(color),
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  function contact(x, z, width, depth) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      new THREE.MeshBasicMaterial({
        map: shadow,
        transparent: true,
        depthWrite: false,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.032, z);
    group.add(mesh);
  }
  function wall(width, depth, x, z, cutaway = false) {
    const mesh = box(width, 2.85, depth, x, 1.425, z, "#eeeae1", true);
    mesh.userData.cutaway = cutaway;
    return mesh;
  }
  function plant(x, z, scale = 1, y = 0) {
    cylinder(0.19 * scale, 0.36 * scale, x, y + 0.18 * scale, z, "#b59d7f");
    for (let i = 0; i < 9; i++) {
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        surface(i % 2 ? "#617556" : "#3c5840"),
      );
      leaf.scale.set(0.7, 2.9, 0.25);
      leaf.rotation.z = Math.sin(i * 2.4) * 0.9;
      leaf.rotation.y = i * 2.4;
      leaf.position.set(
        x + Math.sin(i * 2.4) * 0.16 * scale,
        y + (0.5 + i * 0.04) * scale,
        z + Math.cos(i * 2.4) * 0.16 * scale,
      );
      group.add(leaf);
    }
  }
  box(w + 0.25, 0.2, d + 0.25, 0, -0.12, 0, "#9b8264");
  box(w, 0.035, d, 0, 0.006, 0, "#fff5df", false, 0, wood);
  wall(0.16, d, -w / 2, 0);
  wall(0.16, d, w / 2, 0, true);
  // Entrance gap remains traversable, with short walls in the dollhouse view.
  wall(w / 2 - 0.7, 0.16, -w / 4 - 0.35, d / 2, true);
  wall(w / 2 - 0.7, 0.16, w / 4 + 0.35, d / 2, true);
  box(w, 0.85, 0.18, 0, 0.425, -d / 2, "#eeeae1", true);
  box(w, 0.3, 0.18, 0, 2.7, -d / 2, "#eeeae1");
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#d4e4e5",
    transparent: true,
    opacity: 0.24,
    roughness: 0.12,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 4; i++) {
    const x = -w / 2 + ((i + 0.5) * w) / 4;
    const pane = box(w / 4 - 0.09, 1.7, 0.035, x, 1.7, -d / 2, "#c9dcdf");
    pane.material = glass;
    pane.castShadow = false;
    box(0.045, 1.83, 0.09, x - w / 8, 1.7, -d / 2, "#39463e");
  }
  for (const y of [0.84, 1.7, 2.55])
    box(w, 0.055, 0.09, 0, y, -d / 2, "#39463e");
  // Skirting, window ledge, and soft curtains give the inferred shell depth.
  box(w, 0.07, 0.34, 0, 0.83, -d / 2 + 0.1, "#faf5ea");
  box(0.045, 0.11, d, -w / 2 + 0.09, 0.075, 0, "#faf7f0");
  box(0.045, 0.11, d, w / 2 - 0.09, 0.075, 0, "#faf7f0");
  for (const side of [-1, 1])
    for (let i = 0; i < 6; i++)
      box(
        0.065,
        2.45,
        0.12,
        side * (w / 2 - 0.17 - i * 0.035),
        1.4,
        -d / 2 + 0.22,
        "#e2dacc",
        false,
        0.03,
        fabric,
      );
  // Bathroom occupies a deliberately schematic corner, with a clear doorway.
  box(2.15, 0.045, 2.05, -2.35, 0.04, d / 2 - 1.04, "#a5a59a");
  wall(0.12, 2.05, -1.23, d / 2 - 1.04, true);
  wall(1.12, 0.12, -2.9, d / 2 - 2.05, true);
  box(0.7, 0.76, 0.48, -2.96, 0.4, d / 2 - 0.48, "#b89c76", true, 0.035);
  box(0.75, 0.08, 0.52, -2.96, 0.83, d / 2 - 0.48, "#f6f4e9");
  cylinder(0.21, 0.44, -1.78, 0.24, d / 2 - 0.6, "#f6f5ed");
  box(0.65, 0.07, 0.78, -1.78, 0.47, d / 2 - 0.6, "#f6f5ed", false, 0.08);
  // Kitchen cabinetry stays when loose furnishings are removed.
  for (let i = 0; i < 4; i++) {
    const z = -1.9 + i * 0.65;
    box(0.65, 0.86, 0.64, -w / 2 + 0.42, 0.46, z, "#bca482", true, 0.015, wood);
    box(0.05, 0.025, 0.22, -w / 2 + 0.77, 0.75, z, "#76634b");
    box(0.37, 0.62, 0.64, -w / 2 + 0.27, 2.02, z, "#dcd8cc", false, 0.008);
  }
  box(0.77, 0.055, 2.66, -w / 2 + 0.45, 0.92, -0.92, "#efeee5", false, 0.018);
  box(0.52, 0.016, 0.56, -w / 2 + 0.45, 0.96, -1.65, "#29322d", false, 0.025);
  for (const z of [-1.81, -1.48])
    for (const x of [-0.14, 0.14])
      cylinder(0.085, 0.012, -w / 2 + 0.45 + x, 0.979, z, "#68716b");
  box(0.4, 0.016, 0.46, -w / 2 + 0.45, 0.96, -0.25, "#929b93", false, 0.04);
  cylinder(0.025, 0.26, -w / 2 + 0.18, 1.09, -0.25, "#9d9f93", true);
  if (state.unfurnished) return;
  // Living area: rounded cushions, separate seams, legs, wool rug, stone table.
  box(2.6, 0.035, 3.25, -0.55, 0.052, -0.3, "#f0e8d9", false, 0.03, fabric);
  const sx = -0.9,
    sz = -1.25;
  if (!state.hiddenItems?.includes("sofa")) {
    contact(sx, sz, 2.75, 1.65);
    for (const x of [-0.96, 0.96])
      for (const z of [-0.32, 0.32])
        cylinder(0.045, 0.18, sx + x, 0.12, sz + z, "#625340");
    box(2.35, 0.3, 0.88, sx, 0.37, sz, "#566b53", true, 0.1, fabric);
    box(2.35, 0.62, 0.21, sx, 0.71, sz - 0.4, "#566b53", false, 0.09, fabric);
    for (const x of [-1.1, 1.1])
      box(0.19, 0.48, 0.92, sx + x, 0.55, sz, "#566b53", false, 0.08, fabric);
    for (const x of [-0.7, 0, 0.7]) {
      box(
        0.66,
        0.17,
        0.68,
        sx + x,
        0.58,
        sz + 0.05,
        "#7c8b6d",
        false,
        0.07,
        fabric,
      );
      const pillow = box(
        0.58,
        0.42,
        0.16,
        sx + x,
        0.82,
        sz - 0.25,
        x === 0 ? "#c3ab83" : "#899676",
        false,
        0.07,
        fabric,
      );
      pillow.rotation.x = -0.15;
    }
  }
  if (!state.hiddenItems?.includes("table")) {
    contact(-0.6, 0.38, 1.65, 1.35);
    cylinder(0.55, 0.07, -0.6, 0.47, 0.38, "#c4b495");
    cylinder(0.3, 0.4, -0.6, 0.25, 0.38, "#a2937b");
    box(0.28, 0.035, 0.37, -0.63, 0.53, 0.43, "#f1eadb", false, 0.008);
    plant(-0.4, 0.18, 0.48, 0.51);
  }
  if (!state.hiddenItems?.includes("bed")) {
    const bed = studioBed(state.largeBed);
    group.userData.bedFootprint = null;
    contact(bed.x, bed.z, bed.width + 0.7, 2.9);
    box(
      bed.width + 0.12,
      0.28,
      2.14,
      bed.x,
      0.25,
      bed.z,
      "#a18b6b",
      true,
      0.055,
      wood,
    );
    group.userData.bedFootprint = solids[solids.length - 1];
    box(
      bed.width,
      0.24,
      bed.depth,
      bed.x,
      0.5,
      bed.z,
      "#f7f3e8",
      false,
      0.1,
      fabric,
    );
    box(
      bed.width + 0.1,
      0.85,
      0.13,
      bed.x,
      0.55,
      bed.z - 1.07,
      "#b3a58d",
      false,
      0.06,
      fabric,
    );
    box(
      bed.width + 0.04,
      0.12,
      1.55,
      bed.x,
      0.67,
      bed.z + 0.26,
      "#9fa58e",
      false,
      0.06,
      fabric,
    );
    box(
      bed.width + 0.08,
      0.065,
      0.39,
      bed.x,
      0.755,
      bed.z + 0.43,
      "#c3c4af",
      false,
      0.025,
      fabric,
    );
    for (const x of [-0.4, 0.4]) {
      const pillow = box(
        0.66,
        0.19,
        0.44,
        bed.x + x,
        0.72,
        bed.z - 0.74,
        "#f8f4eb",
        false,
        0.085,
        fabric,
      );
      pillow.rotation.y = x * 0.09;
    }
  }
  cylinder(0.28, 0.44, 2.98, 0.25, -2.22, "#9e8563");
  cylinder(0.11, 0.024, 2.98, 0.5, -2.22, "#9c8a63", true);
  cylinder(0.018, 0.3, 2.98, 0.65, -2.22, "#ac986f", true);
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 0.27, 32, 1, true),
    surface("#f6e7ca"),
  );
  shade.position.set(2.98, 0.87, -2.22);
  group.add(shade);
  const lamp = new THREE.PointLight("#ffd9a0", state.evening ? 14 : 2, 4, 2);
  lamp.position.set(2.98, 0.83, -2.22);
  group.add(lamp);
  if (!state.hiddenItems?.includes("table")) {
    // Small dining table clear of the entrance and circulation path.
    cylinder(0.58, 0.065, 1.9, 0.75, 1.65, "#b9986d");
    solids.push({ minX: 1.32, maxX: 2.48, minZ: 1.07, maxZ: 2.23 });
    cylinder(0.12, 0.7, 1.9, 0.38, 1.65, "#957a55");
    for (const x of [1.02, 2.78]) {
      box(0.46, 0.08, 0.48, x, 0.44, 1.65, "#b99d73", true, 0.06);
      box(
        0.07,
        0.46,
        0.48,
        x + (x < 1.9 ? -0.2 : 0.2),
        0.62,
        1.65,
        "#b99d73",
        false,
        0.035,
      );
      for (const z of [-0.17, 0.17])
        for (const dx of [-0.16, 0.16])
          box(0.035, 0.4, 0.035, x + dx, 0.22, 1.65 + z, "#79654b");
    }
    plant(1.9, 1.65, 0.4, 0.79);
  }
  plant(-2.83, -3.25, 1.65);
  plant(3.03, 2.95, 1.25);
  box(0.045, 0.94, 0.74, -w / 2 + 0.1, 1.67, 0.75, "#998465");
  box(0.05, 0.84, 0.64, -w / 2 + 0.13, 1.67, 0.75, "#e1d5bb");
  box(0.052, 0.39, 0.4, -w / 2 + 0.15, 1.6, 0.75, "#7e8b6e");
  box(1.05, 0.018, 0.63, 0, 0.04, d / 2 - 0.45, "#a99f85", false, 0.02, fabric);
}
export function updateCutaway(group, enabled) {
  group.traverse((mesh) => {
    if (mesh.userData.cutaway) {
      mesh.scale.y = enabled ? 0.19 : 1;
      mesh.position.y = (mesh.userData.fullY ?? 1.425) * mesh.scale.y;
    }
  });
}
