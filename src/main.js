import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { homes, pointOnRoute, blocked } from "./model.js";
import "./style.css";
import { clearanceAround, validateBedEdit } from "./clearance.js";
import { buildStudio, updateCutaway } from "./interior.js";
import { listings, identifyListing } from "./listings.js";
const $ = (s) => document.querySelector(s);
const container = $("#scene");
const state = {
  home: "current",
  mode: "overview",
  largeBed: false,
  unfurnished: false,
  evening: false,
  progress: 0,
  playing: false,
};
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (error) {
  container.textContent =
    "This preview needs WebGL. Try a browser with hardware acceleration enabled.";
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
container.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#a8b39e");
scene.fog = new THREE.Fog("#a8b39e", 85, 155);
const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 230);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 8;
controls.maxDistance = 58;
controls.maxPolarAngle = Math.PI * 0.47;
const ambient = new THREE.HemisphereLight("#e9f1ff", "#af9777", 1.15);
scene.add(ambient);
const sun = new THREE.DirectionalLight("#fff1d9", 3.2);
sun.position.set(-12, 24, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -30,
  right: 30,
  top: 30,
  bottom: -30,
  near: 0.1,
  far: 90,
});
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
sun.shadow.radius = 3;
scene.add(sun);
const materials = new Map();
function material(color) {
  if (!materials.has(color))
    materials.set(
      color,
      new THREE.MeshStandardMaterial({ color, roughness: 0.83 }),
    );
  return materials.get(color);
}
const solids = [];
let house = new THREE.Group(),
  neighborhood = new THREE.Group(),
  car = new THREE.Group();
scene.add(house, neighborhood, car);
function box(parent, w, h, d, x, y, z, color, solid = false) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  if (solid)
    solids.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
    });
  return m;
}
function cylinder(parent, r, h, x, y, z, color) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r * 0.88, h, 16),
    material(color),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function plant(parent, x, z, size = 1, y = 0) {
  cylinder(parent, 0.22 * size, 0.4 * size, x, y + 0.2 * size, z, "#cbc4ad");
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.32 * size, 0),
      material(i % 2 ? "#627655" : "#465f43"),
    );
    leaf.position.set(
      x + Math.sin(i * 2) * 0.2 * size,
      y + (0.6 + i * 0.075) * size,
      z + Math.cos(i * 2) * 0.2 * size,
    );
    leaf.scale.set(0.6, 1.8, 0.6);
    leaf.rotation.z = Math.sin(i) * 0.5;
    leaf.castShadow = true;
    parent.add(leaf);
  }
}
function tree(x, z, size = 1) {
  cylinder(neighborhood, 0.13 * size, 1.5 * size, x, 0.75 * size, z, "#84775c");
  for (let i = 0; i < 3; i++) {
    const crown = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.9 * size, 0),
      material(i % 2 ? "#637657" : "#718264"),
    );
    crown.position.set(
      x + Math.sin(i * 3) * 0.3 * size,
      (1.7 + i * 0.38) * size,
      z,
    );
    crown.castShadow = true;
    neighborhood.add(crown);
  }
}
function clear(group) {
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
  });
  group.clear();
}
function frameWindow(x, z, width, axis = "x") {
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(
      axis === "x" ? width : 0.04,
      1.4,
      axis === "x" ? 0.04 : width,
    ),
    new THREE.MeshStandardMaterial({
      color: "#b8d5d2",
      transparent: true,
      opacity: 0.35,
      roughness: 0.15,
    }),
  );
  glass.position.set(x, 1.9, z);
  house.add(glass);
  for (const y of [1.2, 2.6])
    box(
      house,
      axis === "x" ? width : 0.09,
      0.075,
      axis === "x" ? 0.09 : width,
      x,
      y,
      z,
      "#646e62",
    );
  for (const offset of [-width / 2, 0, width / 2])
    box(
      house,
      0.065,
      1.4,
      0.065,
      x + (axis === "x" ? offset : 0),
      1.9,
      z + (axis === "z" ? offset : 0),
      "#646e62",
    );
}
function buildHome() {
  clear(house);
  solids.length = 0;
  if (homes[state.home].studio) {
    buildStudio(house, solids, state, homes[state.home]);
    updateCutaway(house, state.mode === "overview");
    return;
  }
  const { width: w, depth: d, sofa } = homes[state.home];
  box(house, w + 0.35, 0.2, d + 0.35, 0, -0.1, 0, "#b6a78a");
  for (let i = 0; i < Math.ceil(w / 0.28); i++)
    box(
      house,
      0.275,
      0.025,
      d - 0.12,
      -w / 2 + 0.14 + i * 0.28,
      0.012,
      0,
      ["#c7b597", "#cbb99b", "#c3af91", "#d0bea2"][i % 4],
    );
  // Back wall has a continuous window band; all wall bases remain collidable.
  box(house, w, 1.18, 0.18, 0, 0.59, -d / 2, "#efede4", true);
  box(house, w, 0.25, 0.18, 0, 2.82, -d / 2, "#efede4");
  for (const x of [-w / 2, 0, w / 2])
    box(house, 0.22, 3, 0.2, x, 1.5, -d / 2, "#efede4");
  frameWindow(-w / 4, -d / 2, w / 2 - 0.25);
  frameWindow(w / 4, -d / 2, w / 2 - 0.25);
  box(house, 0.18, 3, d, -w / 2, 1.5, 0, "#e9e6db", true);
  box(house, 0.18, 3, d, w / 2, 1.5, 0, "#efede4", true);
  const frontWidth = w / 2 - 0.9;
  box(
    house,
    frontWidth,
    3,
    0.18,
    -(0.9 + frontWidth / 2),
    1.5,
    d / 2,
    "#efede4",
    true,
  );
  box(
    house,
    frontWidth,
    3,
    0.18,
    0.9 + frontWidth / 2,
    1.5,
    d / 2,
    "#efede4",
    true,
  );
  box(house, 1.8, 0.65, 0.18, 0, 2.675, d / 2, "#efede4");
  // Bedroom divider includes a walkable opening near the entry.
  if (!homes[state.home].studio)
    box(house, 0.14, 2.9, d - 2.5, w * 0.19, 1.45, -1.25, "#ece9df", true);
  if (state.unfurnished) return;
  box(house, w * 0.32, 0.09, d * 0.65, -w * 0.22, 0.075, -0.45, "#ded4bf");
  const sofaX = -w * 0.25,
    sofaZ = -d * 0.13;
  box(house, 1.05, 0.4, 2.8, sofaX, 0.43, sofaZ, sofa, true);
  box(house, 0.24, 0.9, 2.8, sofaX - 0.45, 0.8, sofaZ, sofa);
  for (const z of [sofaZ - 1.25, sofaZ + 1.25])
    box(house, 1.15, 0.7, 0.23, sofaX, 0.64, z, sofa);
  for (let i = 0; i < 3; i++)
    box(
      house,
      0.87,
      0.18,
      0.77,
      sofaX + 0.04,
      0.71,
      sofaZ - 0.84 + i * 0.84,
      "#839274",
    );
  box(house, 1.15, 0.1, 1.4, sofaX + 1.65, 0.5, sofaZ, "#b49c76", true);
  for (const x of [-0.44, 0.44])
    for (const z of [-0.55, 0.55])
      box(
        house,
        0.055,
        0.44,
        0.055,
        sofaX + 1.65 + x,
        0.23,
        sofaZ + z,
        "#8a775d",
      );
  box(house, 0.32, 0.035, 0.42, sofaX + 1.65, 0.58, sofaZ + 0.1, "#eee9db");
  plant(house, sofaX + 1.65, sofaZ - 0.4, 0.42, 0.55);
  const bedX = w * 0.34,
    bedZ = -d * 0.18,
    bedWidth = state.largeBed ? 1.93 : 1.52;
  box(house, bedWidth, 0.32, 2.1, bedX, 0.27, bedZ, "#a89372", true);
  box(house, bedWidth, 0.22, 2.03, bedX, 0.54, bedZ, "#e6e2d8");
  box(house, bedWidth, 0.07, 1.55, bedX, 0.7, bedZ + 0.4, "#899982");
  for (const x of [-0.38, 0.38])
    box(house, 0.62, 0.14, 0.46, bedX + x, 0.76, bedZ - 0.87, "#f5f1e5");
  box(house, bedWidth + 0.12, 1, 0.12, bedX, 0.55, bedZ - 1.12, "#b19b79");
  // Kitchen on the entrance side, leaving the doorway clear.
  box(
    house,
    w * 0.26,
    0.86,
    0.65,
    -w * 0.32,
    0.43,
    d / 2 - 0.46,
    "#d5d1c2",
    true,
  );
  box(house, w * 0.27, 0.07, 0.71, -w * 0.32, 0.9, d / 2 - 0.46, "#f1eddf");
  box(house, 0.6, 0.035, 0.46, -w * 0.34, 0.96, d / 2 - 0.46, "#434b42");
  for (const x of [-0.14, 0.14])
    for (const z of [-0.1, 0.1])
      cylinder(
        house,
        0.095,
        0.014,
        -w * 0.34 + x,
        0.99,
        d / 2 - 0.46 + z,
        "#737c70",
      );
  plant(house, -w / 2 + 0.5, -d / 2 + 0.65, 1.15);
  plant(house, w / 2 - 0.55, -d / 2 + 0.6, 0.95);
  plant(house, w / 2 - 0.55, d / 2 - 0.55, 1.15);
  // Framed wall art and entrance mat.
  box(house, 0.06, 0.95, 0.72, -w / 2 + 0.11, 1.8, 1.25, "#9b8865");
  box(house, 0.065, 0.8, 0.58, -w / 2 + 0.13, 1.8, 1.25, "#a0ab88");
  box(house, 1.45, 0.035, 0.8, 0, 0.05, d / 2 - 0.6, "#8e9a81");
}
function buildNeighborhood() {
  clear(neighborhood);
  box(neighborhood, 170, 0.2, 170, 0, -0.3, 0, "#a8b39e");
  for (const z of [12, -24]) {
    box(neighborhood, 115, 0.04, 5, 0, -0.16, z, "#81877c");
    for (let x = -54; x < 57; x += 4)
      box(neighborhood, 1.8, 0.02, 0.08, x, -0.13, z, "#ddd8bd");
    box(neighborhood, 115, 0.08, 0.8, 0, -0.11, z - 3, "#bbc0b2");
    box(neighborhood, 115, 0.08, 0.8, 0, -0.11, z + 3, "#bbc0b2");
  }
  for (const x of [-22, 22]) {
    box(neighborhood, 5, 0.04, 58, x, -0.15, -6, "#81877c");
    for (let z = -32; z < 22; z += 4)
      box(neighborhood, 0.08, 0.02, 1.8, x, -0.12, z, "#ddd8bd");
  }
  box(neighborhood, 1.65, 0.04, 8, 0, -0.1, 8, "#c2c5b6");
  for (const x of [-38, -11, 11, 38])
    for (const z of [-12, 25]) {
      const height = 3 + (Math.abs(x + z) % 5);
      box(neighborhood, 7, height, 8, x, height / 2 - 0.15, z, "#c3c3b5");
      box(neighborhood, 7.2, 0.15, 8.2, x, height - 0.05, z, "#a1a798");
      for (let y = 1; y < height - 0.3; y += 1.6)
        for (let wx = -2; wx <= 2; wx += 2)
          box(neighborhood, 0.8, 0.95, 0.03, x + wx, y, z + 4.02, "#899d95");
    }
  box(neighborhood, 8, 8, 7, 44, 3.85, -32, "#d4d5c8");
  for (let y = 1; y < 8; y += 1.7)
    for (let x = 41; x < 48; x += 1.7)
      box(neighborhood, 1.1, 1.1, 0.04, x, y, -28.48, "#829f99");
  for (let x = -48; x < 55; x += 7) {
    if (Math.abs(x) > 7) tree(x, 7, 1.1);
    tree(x, -19, 0.9);
  }
  for (const p of [
    [-8, -5],
    [-9, 1],
    [9, -7],
    [9, 4],
    [-5, 7],
    [6, 7],
  ])
    tree(...p, 0.85);
  const route = homes[state.home].route;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1],
      b = route[i];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ribbon = box(
      neighborhood,
      length,
      0.028,
      0.16,
      (a[0] + b[0]) / 2,
      -0.08,
      (a[1] + b[1]) / 2,
      "#e6c36c",
    );
    ribbon.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
  }
}
box(car, 1.7, 0.5, 3, 0, 0.43, 0, "#315345");
box(car, 1.4, 0.6, 1.7, 0, 0.97, -0.2, "#496d59");
box(car, 1.32, 0.43, 0.04, 0, 1.05, -1.06, "#b7d0c7");
for (const x of [-0.85, 0.85])
  for (const z of [-0.92, 0.92]) {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.31, 0.31, 0.2, 14),
      material("#343a35"),
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.25, z);
    car.add(wheel);
  }
car.visible = false;
const markers = new THREE.Group();
scene.add(markers);
markers.visible = false;
const places = [
  ["Groceries", -11, -12],
  ["Transit", 6, 12],
  ["EV charging", 22, 4],
  ["Gas", -22, 4],
  ["Restaurants", 11, -12],
  ["Shopping", -38, 25],
  ["Healthcare", 38, -12],
  ["Airport", -38, -30],
];
let selectedPlace = "Groceries";
function showPlaces() {
  clear(markers);
  for (const [name, x, z] of places) {
    const active = name === selectedPlace;
    cylinder(
      markers,
      active ? 0.65 : 0.35,
      0.18,
      x,
      0.25,
      z,
      active ? "#f0c568" : "#315744",
    );
    if (active) {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 110;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(0, 0, 512, 110, 20);
      ctx.fill();
      ctx.fillStyle = "#214b39";
      ctx.font = "500 34px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(name + " · example", 256, 66);
      const texture = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: texture, depthTest: false }),
      );
      sprite.position.set(x, 4, z);
      sprite.scale.set(11, 2.4, 1);
      markers.add(sprite);
    }
  }
  $("#poi-name").textContent = selectedPlace + " · example location";
  for (const b of document.querySelectorAll("[data-place]"))
    b.setAttribute("aria-pressed", String(b.dataset.place === selectedPlace));
}
for (const [name] of places) {
  const b = document.createElement("button");
  b.textContent = name;
  b.dataset.place = name;
  b.setAttribute("aria-pressed", String(name === selectedPlace));
  b.onclick = () => {
    selectedPlace = name;
    showPlaces();
    message(
      name +
        ": showing an illustrative location. No live business information or distance is claimed.",
    );
  };
  $("#categories").appendChild(b);
}
showPlaces();
let yaw = 0,
  pitch = 0,
  drag = false,
  prev = { x: 0, y: 0 };
const keys = new Set();
function message(text) {
  $("#status").textContent = text;
}
function resetCamera() {
  const h = homes[state.home];
  camera.position.set(...(h.studio ? [8.6, 10.9, 11.5] : [11, 16, 14]));
  controls.target.set(0, 0, 0);
  controls.update();
}
function setMode(mode) {
  $("#map-view").hidden = true;
  $("#astra-form").hidden =
    !homes[state.home].studio || !["walk", "overview"].includes(mode);
  $("#neighborhood-view").hidden = !homes[state.home].studio;
  state.mode = mode;
  updateCutaway(house, mode === "overview");
  keys.clear();
  controls.enabled = mode === "overview" || mode === "nearby";
  $(".walk-controls").hidden = mode !== "walk";
  $(".journey").hidden = mode !== "commute";
  car.visible = mode === "commute";
  $(".nearby-panel").hidden = mode !== "nearby";
  markers.visible = mode === "nearby";
  document
    .querySelectorAll(".modebar [data-mode]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.mode === mode)),
    );
  if (mode === "overview") {
    state.playing = false;
    resetCamera();
    $("#hint").textContent = "Drag to orbit · scroll to zoom";
    $("#view-description").textContent = "A place to start imagining.";
  }
  if (mode === "nearby") {
    state.playing = false;
    controls.target.set(0, 0, -4);
    camera.position.set(33, 55, 48);
    controls.update();
    $("#hint").textContent = "Explore sample places around the home";
    $("#view-description").textContent =
      "Daily essentials · synthetic locations";
    message(
      "Nearby categories preview the decision flow. Real location data is not connected.",
    );
  }
  if (mode === "walk") {
    state.playing = false;
    yaw = 0;
    pitch = 0;
    camera.position.set(0, 1.65, homes[state.home].depth / 2 - 1.3);
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch, yaw, 0);
    $("#hint").textContent =
      "WASD to move · drag or arrows to look · use the doorway to go outside";
    $("#view-description").textContent = "Eye level · explore the space";
    message(
      "Walk through the room, or turn around and leave through the front door.",
    );
  }
  if (mode === "commute") {
    state.progress = 0;
    state.playing = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    $("#ride").textContent = state.playing ? "Pause ride" : "Play ride";
    $("#hint").textContent =
      "The car follows the highlighted synthetic road route";
    $("#view-description").textContent =
      "Your journey to work · illustrative streets";
    message(
      "Commute preview uses invented streets, not a real address or travel time.",
    );
    updateCar();
  }
}
function updateCar() {
  const p = pointOnRoute(homes[state.home].route, state.progress),
    len = Math.hypot(p.dx, p.dz);
  const dx = p.dx / len,
    dz = p.dz / len;
  car.position.set(p.x, 0, p.z);
  car.rotation.y = Math.atan2(-dx, -dz);
  camera.position.set(p.x - dx * 7, 4.2, p.z - dz * 7);
  camera.lookAt(p.x + dx * 7, 0.9, p.z + dz * 7);
  $("#progress").value = String(state.progress * 100);
  $("#journey-label").textContent =
    state.progress >= 1 ? "Arrived at work" : "Home → Work";
}
function light() {
  sun.color.set(state.evening ? "#ffb970" : "#fff1d9");
  sun.intensity = state.evening ? 1.15 : 3.2;
  ambient.intensity = state.evening ? 0.65 : 1.2;
  house.traverse((o) => {
    if (o.isPointLight) o.intensity = state.evening ? 14 : 2;
  });
  scene.background.set(state.evening ? "#777f7b" : "#a8b39e");
  scene.fog.color.copy(scene.background);
  $("#evening").setAttribute("aria-pressed", String(state.evening));
  $("#evening span:last-child").textContent = state.evening
    ? "Daylight"
    : "Evening light";
}
function refresh() {
  buildHome();
  buildNeighborhood();
  const footprint = homes[state.home].studio && house.userData.bedFootprint;
  $("#clearance-panel").hidden = !footprint;
  if (footprint) {
    const c = clearanceAround(footprint, solids);
    $("#clearance-values").textContent = c.overlap
      ? "Overlap detected — this arrangement needs changing."
      : `Left ${c.left.toFixed(2)} m · right ${c.right.toFixed(2)} m · foot ${c.foot.toFixed(2)} m`;
  }
  $("#scene-clearance").textContent = footprint
    ? "Inferred layout · " + $("#clearance-values").textContent
    : "";
  $("#place").textContent = homes[state.home].label;
  light();
  $("#bed").setAttribute("aria-pressed", String(state.largeBed));
  $("#bed span:last-child").textContent = state.largeBed
    ? "Return to queen bed"
    : "Will a king bed fit?";
  $("#unfurnished").setAttribute("aria-pressed", String(state.unfurnished));
  $("#unfurnished span:last-child").textContent = state.unfurnished
    ? "Restore furnishings"
    : "See it unfurnished";
}
let selectedListing = null;
const syntheticPotential = { ...homes.potential };
function showListing(listing) {
  selectedListing = listing;
  $("#listing-evidence").hidden = false;
  for (const key of ["name", "location", "facts", "price", "availability"])
    $("#listing-" + key).textContent = listing[key];
  $("#listing-source").href = listing.url;
  $("#listing-checked").textContent =
    "Source checked " +
    new Date(listing.checkedAt).toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }) +
    " ET · not a live refresh";
  $("#listing-unknowns").textContent = listing.questions;
  $("#listing-preview").hidden = !listing.scene;
  $("#listing-map").hidden = !listing.scene;
  $("#listing-status").textContent = listing.archived
    ? "Archived listing found. Current availability is unknown."
    : "Source snapshot loaded. Review the facts, then explore the inferred studio.";
}
$("#listing-form").addEventListener("submit", (event) => {
  event.preventDefault();
  selectedListing = null;
  $("#listing-evidence").hidden = true;
  // Do not leave a previously selected listing scene attached to a new URL.
  Object.assign(homes.potential, syntheticPotential, { studio: false });
  $("#potential-name").textContent = "Potential home";
  $("#potential-note").textContent = "Synthetic example · more space";
  refresh();
  setMode("overview");
  try {
    const listing = identifyListing($("#listing-url").value);
    if (listing) showListing(listing);
    else
      $("#listing-status").textContent =
        "This URL needs a public unit-specific listing, photos, and a floor plan or measured dimensions. Live import is not connected; try a researched example above. No page was fetched and no scene was generated.";
  } catch (error) {
    $("#listing-status").textContent = error.message;
  }
});
for (const button of document.querySelectorAll("[data-listing]"))
  button.addEventListener("click", () => {
    $("#listing-url").value = listings.find(
      (l) => l.id === button.dataset.listing,
    ).url;
    $("#listing-form").requestSubmit();
  });
let geoMap;
async function openNeighborhood() {
  if (selectedListing?.id !== "wall2308") return;
  state.playing = false;
  keys.clear();
  $("#map-view").hidden = false;
  $("#astra-form").hidden = true;
  $(".walk-controls").hidden = true;
  $(".journey").hidden = true;
  $(".nearby-panel").hidden = true;
  $(".local").textContent = "Local demo · map tiles from OpenFreeMap";
  try {
    if (!geoMap) {
      const { createNeighborhood } = await import("./neighborhood.js");
      geoMap = createNeighborhood(
        $("#map-canvas"),
        (text) => ($("#map-status").textContent = text),
      );
    }
    geoMap.resize();
    geoMap.pullback();
  } catch {
    $("#map-status").textContent =
      "Map could not load. You can still enter the local interior.";
  }
}
$("#listing-map").onclick = openNeighborhood;
$("#neighborhood-view").onclick = openNeighborhood;
$("#map-pullback").onclick = () => geoMap?.pullback();
$("#map-direct").onclick = () => geoMap?.direct();
$("#map-enter").onclick = async () => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  $("#transition").classList.add("active");
  if (!reduced) await new Promise((resolve) => setTimeout(resolve, 350));
  $("#listing-preview").click();
  $("#transition").classList.remove("active");
};
$("#listing-preview").addEventListener("click", () => {
  if (!selectedListing?.scene) return;
  Object.assign(homes.potential, selectedListing.scene, {
    label: selectedListing.name + " · inferred sketch",
  });
  $("#potential-name").textContent = selectedListing.name;
  $("#potential-note").textContent = "Reported area · inferred layout";
  $("input[value=potential]").checked = true;
  state.home = "potential";
  state.largeBed = state.unfurnished = state.evening = false;
  refresh();
  setMode("walk");
  message(
    "575 ft² reported by listing. Shape, windows and furnishings are inferred; this is not a reconstruction. Streets remain synthetic.",
  );
  container.focus({ preventScroll: true });
});
for (const b of document.querySelectorAll("[data-mode]"))
  b.addEventListener("click", () => {
    setMode(b.dataset.mode);
    if (state.mode === "walk") container.focus({ preventScroll: true });
  });
for (const input of document.querySelectorAll("[name=home]"))
  input.addEventListener("change", () => {
    state.home = input.value;
    state.largeBed = false;
    state.unfurnished = false;
    state.evening = false;
    refresh();
    setMode("overview");
    message(
      `${homes[state.home].label} loaded. All dimensions and surroundings are synthetic.`,
    );
  });
$("#bed").onclick = () => {
  state.largeBed = !state.largeBed;
  state.unfurnished = false;
  refresh();
  if (state.mode === "walk") setMode("walk");
  message(
    state.largeBed
      ? "King bed footprint: 1.93 × 2.03 m. Compare clearance in this synthetic room; verify real dimensions before buying."
      : "Queen bed restored: 1.52 × 2.03 m. Synthetic room dimensions.",
  );
};
$("#unfurnished").onclick = () => {
  state.unfurnished = !state.unfurnished;
  refresh();
  message(
    state.unfurnished
      ? "Furnishings removed. Explore the empty floor area."
      : "Furnishings restored.",
  );
};
$("#evening").onclick = () => {
  state.evening = !state.evening;
  light();
  message(
    state.evening
      ? "Evening lighting applied. Illustrative light, not a solar study."
      : "Daylight restored.",
  );
};
$("#reset").onclick = () => {
  state.largeBed = false;
  state.unfurnished = false;
  state.evening = false;
  refresh();
  setMode("overview");
  message("Selected home reset to its original synthetic scene.");
};
$("#ride").onclick = () => {
  if (state.progress >= 1) state.progress = 0;
  state.playing = !state.playing;
  $("#ride").textContent = state.playing ? "Pause ride" : "Play ride";
};
$("#progress").oninput = (e) => {
  state.progress = Number(e.target.value) / 100;
  state.playing = false;
  $("#ride").textContent = "Play ride";
  updateCar();
};
window.addEventListener("keydown", (e) => {
  if (state.mode !== "walk" || document.activeElement !== container) return;
  if (
    [
      "w",
      "a",
      "s",
      "d",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ].includes(e.key)
  ) {
    keys.add(e.key);
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key));
window.addEventListener("blur", () => keys.clear());
container.addEventListener("blur", () => keys.clear());
for (const b of document.querySelectorAll("[data-key]")) {
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    keys.add(b.dataset.key);
    b.setPointerCapture(e.pointerId);
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(event, () => keys.delete(b.dataset.key));
}
container.addEventListener("pointerdown", (e) => {
  if (state.mode !== "walk") return;
  drag = true;
  prev = { x: e.clientX, y: e.clientY };
  container.setPointerCapture(e.pointerId);
});
container.addEventListener("pointermove", (e) => {
  if (!drag || state.mode !== "walk") return;
  yaw -= (e.clientX - prev.x) * 0.004;
  pitch = THREE.MathUtils.clamp(
    pitch - (e.clientY - prev.y) * 0.004,
    -1.1,
    1.1,
  );
  prev = { x: e.clientX, y: e.clientY };
});
for (const ev of ["pointerup", "pointercancel"])
  container.addEventListener(ev, () => (drag = false));
function resize() {
  const { width, height } = container.getBoundingClientRect();
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(container);
refresh();
setMode("overview");
resize();
let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (state.mode === "overview" || state.mode === "nearby") controls.update();
  if (state.mode === "walk") {
    if (keys.has("ArrowLeft")) yaw += dt * 1.6;
    if (keys.has("ArrowRight")) yaw -= dt * 1.6;
    let f =
        (keys.has("w") || keys.has("ArrowUp") ? 1 : 0) -
        (keys.has("s") || keys.has("ArrowDown") ? 1 : 0),
      r = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
    const len = Math.hypot(f, r) || 1;
    f /= len;
    r /= len;
    const dx = (-Math.sin(yaw) * f + Math.cos(yaw) * r) * dt * 2.6,
      dz = (-Math.cos(yaw) * f - Math.sin(yaw) * r) * dt * 2.6;
    if (!blocked(camera.position.x + dx, camera.position.z, solids))
      camera.position.x = THREE.MathUtils.clamp(
        camera.position.x + dx,
        -55,
        55,
      );
    if (!blocked(camera.position.x, camera.position.z + dz, solids))
      camera.position.z = THREE.MathUtils.clamp(
        camera.position.z + dz,
        -40,
        35,
      );
    camera.rotation.set(pitch, yaw, 0, "YXZ");
  }
  if (state.mode === "commute") {
    if (state.playing) {
      state.progress = Math.min(1, state.progress + dt / 26);
      if (state.progress === 1) {
        state.playing = false;
        $("#ride").textContent = "Replay ride";
        message(
          "Arrived at the illustrative workplace. This route is not geographic evidence.",
        );
      }
    }
    updateCar();
  }
  renderer.render(scene, camera);
});
// Read-only diagnostics for local interaction verification; contains no user data.
window.__elsewhere = {
  snapshot: () => ({
    ...state,
    camera: camera.position.toArray(),
    objects: scene.children.length,
    solids: solids.length,
    webgl: renderer.capabilities.isWebGL2,
  }),
};

let astraReady = false;
fetch("/api/astra/status")
  .then((r) => r.json())
  .then((data) => {
    astraReady = data.configured === true;
    $("#astra-submit").disabled = !astraReady;
    $("#astra-status").textContent = astraReady
      ? "Runtime ready · one validated edit, then local rendering"
      : "Runtime unavailable · configure API access to try a live edit. Local controls still work.";
  })
  .catch(() => {
    $("#astra-status").textContent =
      "Runtime endpoint unavailable. Use the local dev server for Astra edits.";
  });
$("#astra-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!astraReady || !homes[state.home].studio) return;
  const sceneAtRequest = homes[state.home];
  $("#astra-submit").disabled = true;
  $("#astra-status").textContent = "Asking Astra for a bounded scene edit…";
  try {
    const response = await fetch("/api/astra/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: $("#astra-prompt").value,
        scene: "wall2308-inferred-v2",
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Astra edit failed.");
    const edit = validateBedEdit(result.edit);
    if (homes[state.home] !== sceneAtRequest || !homes[state.home].studio)
      throw new Error(
        "Home changed while Astra was working. Edit was not applied.",
      );
    state.largeBed = edit.size === "king";
    state.unfurnished = false;
    refresh();
    if (state.mode === "walk") setMode("walk");
    $("#astra-status").textContent =
      `${result.cached ? "Cached Astra edit" : "Live Astra edit"} · ${result.model} · ${result.requestId} · ${new Date(result.generatedAt).toLocaleTimeString()}`;
    $(".local").textContent = "Local demo · live Astra edit received";
  } catch (error) {
    $("#astra-status").textContent = error.message;
  } finally {
    $("#astra-submit").disabled = !astraReady;
  }
});
