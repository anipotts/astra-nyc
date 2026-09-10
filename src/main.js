import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { homes, pointOnRoute, blocked } from "./model.js";
import { clearanceAround } from "./clearance.js";
import { validateSceneEdit } from "./scene-edit.js";
import { applySceneCommand } from "./scene-commands.js";
import { updateCutaway } from "./interior.js";
import { createLayout } from "./layout.js";
import { buildLayoutScene } from "./layout-scene.js";
import { renderPlanSvg, renderPlanPrintDocument } from "./plan-svg.js";
import {
  loadPlanHistory,
  savePlanHistory,
  cleanPlanState,
} from "./plan-storage.js";
import { nycListings } from "./nyc-listings.js";
import { listingSummary } from "./listing-summary.js";
import { setupPriorities } from "./priorities.js";
import { mountBuildingNotes } from "./building-notes/index.js";
import { setupListingIntake } from "./listing-intake.js";
import { acceptInspectedRegion } from "./inspected-plan.js";
import { inspectedPlans } from "./inspected-plan-records.js";
import { lookupLocation, confidentLocationMatch } from "./location.js";
import { getExampleLocation } from "./example-locations.js";
import { createOverviewReturn } from "./practical-motion.js";
import { normalizeSourceUrl } from "./source-policy.js";
import { mountSourcePlan } from "./source-plan/index.js";
import "./plan-source.css";
import { setupPlanInspection } from "./plan-inspection.js";
import { setupEvidenceReview } from "./listing-evidence.js";
import { mountInsideView } from "./inside-view/index.js";
import { mountCommuteView } from "./commute-view/index.js";
const $ = (s) => document.querySelector(s);
const container = $("#scene");
const overviewReturn = createOverviewReturn();
let pendingOverviewCamera = null;
let sourcePlanViewer = null;
let geoMap,
  mapInit,
  locationRequest = null,
  locationGeneration = 0,
  shownLocation = null;
const listingLocations = new Map();
let mapLocationMessage = "";
let priorities = [];
const state = {
  home: "current",
  mode: "overview",
  largeBed: false,
  unfurnished: false,
  hiddenItems: [],
  personalObjects: [],
  evening: false,
  progress: 0,
  playing: false,
};
let currentLayout = null;
let acceptedRegion = null;
let entryKind = "empty";
let plansOpen = false;
let planZoom = 1;
let selectedPlanObject = null;
let planDownloadUrl = null;
let histories = { current: [], potential: [] };
let storageReady = false;
let saveQueue = Promise.resolve();
let applyingHistory = false;
function arrangementState() {
  return cleanPlanState(state);
}
function persistPlans() {
  if (!storageReady) return;
  const snapshot = structuredClone(histories);
  saveQueue = saveQueue
    .catch(() => {})
    .then(() => savePlanHistory(snapshot))
    .catch(() => {
      $("#plan-persistence").textContent =
        "Browser storage unavailable; export to keep this revision.";
    });
}
function recordArrangement() {
  const entries = histories[state.home];
  const next = arrangementState();
  if (
    !applyingHistory &&
    JSON.stringify(entries.at(-1)?.state) !== JSON.stringify(next)
  ) {
    entries.push({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      summary: entries.length
        ? "Arrangement changed"
        : "Synthetic starting layout",
      state: next,
      layout: structuredClone(currentLayout),
    });
    if (entries.length > 30) entries.shift();
    persistPlans();
  }
  return entries.at(-1);
}
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
  house.userData.bedFootprint = null;
  house.visible = entryKind === "demo";
  if (entryKind !== "demo") {
    currentLayout = acceptedRegion;
    return;
  }
  currentLayout = createLayout(state.home, state);
  const revision = recordArrangement();
  currentLayout.revision = {
    id: revision.id,
    createdAt: revision.createdAt,
    summary: revision.summary,
  };
  buildLayoutScene(house, solids, currentLayout, {
    cutaway: state.mode === "overview",
  });
}
function buildNeighborhood() {
  clear(neighborhood);
  if (entryKind !== "demo") return;
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
let sceneRevision = 0;
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
  if (mode === "nearby" && selectedListing) mode = "overview";
  if (mode !== state.mode && mode !== "overview") $("#source-details").open = false;
  if (selectedListing && mode !== state.mode) {
    if (state.mode === "overview") overviewReturn.leave(selectedListing.id, geoMap?.getCamera({ intended: true }));
    if (mode === "overview") pendingOverviewCamera = { id: selectedListing.id, camera: overviewReturn.take(selectedListing.id) };
  }
  geoMap?.stop();
  document.body.dataset.view = mode;
  if (entryKind === "empty") mode = "overview";
  if (plansOpen) setPlansOpen(false);
  document.body.classList.toggle("evidence-only", Boolean(selectedListing));
  $("#evidence-stage").hidden = !selectedListing || mode === "nearby";
  $("#map-view").hidden = true;
  $("#astra-form").hidden = !["walk", "overview"].includes(mode);
  syncComposer();
  $("#neighborhood-view").hidden = true;
  $("#listing-map").hidden = selectedListing?.id !== "wall2308";
  state.mode = mode;
  syncViewServices();
  if (entryKind === "empty") {
    $("#inside-surface").hidden = true;
    $("#commute-panel").hidden = true;
    $("#location-review").hidden = true;
    state.playing = false;
    keys.clear();
    return;
  }
  $("#inside-surface").hidden = true;
  $("#commute-panel").hidden = true;
  $("#location-review").hidden = true;
  if (selectedListing) {
    state.playing = false;
    keys.clear();
    document
      .querySelectorAll(".modebar [data-mode]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.mode === mode)),
      );
    $("#evidence-stage").hidden = false;
    $("#astra-form").hidden = true;
    $(".walk-controls").hidden = true;
    $(".journey").hidden = true;
    $(".nearby-panel").hidden = true;
    $("#summary-view-label").textContent =
      mode === "walk"
        ? "Inside"
        : mode === "commute"
          ? "Your starting point"
          : "Your next place";
    $("#summary-next").textContent = acceptedRegion
      ? "Reviewed nominal 2D region available in Plans."
      : "Interior dimensions remain unverified. Explore the source or surroundings.";
    const inside = mode === "walk";
    $("#inside-surface").hidden = !inside;
    $("#commute-panel").hidden = mode !== "commute";
    $("#view-unavailable").hidden = true;
    if (inside) {
      $("#summary-next").textContent = acceptedRegion
        ? "Nominal plan region only. Ceiling height, openings and a walkable interior remain unknown."
        : "No inspected interior is available. Open the real source or inspect a matching plan.";
    } else {
      openNeighborhood();
      $("#location-review").hidden =
        !mapLocationMessage ||
        Boolean(listingLocations.get(selectedListing.id));
    }
    return;
  }
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
    $("#view-description").textContent = "Synthetic example";
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
  if (mode === "nearby" && selectedListing?.id === "wall2308")
    openNeighborhood();
  else if (mode === "nearby" && selectedListing) {
    $("#evidence-stage").hidden = false;
    $("#evidence-reason").textContent =
      "A verified neighborhood adapter is not connected for this listing. View the original source for location information.";
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
  sceneRevision++;
  document.body.classList.toggle("empty-state", entryKind === "empty");
  document.body.classList.toggle("evidence-only", entryKind === "listing");
  $("#entry-stage").hidden = entryKind !== "empty";
  $("#plans-toggle").disabled = entryKind === "empty";
  $("#astra-reply").hidden = true;
  buildHome();
  buildNeighborhood();
  const footprint = house.userData.bedFootprint;
  $("#clearance-panel").hidden = !footprint;
  if (footprint) {
    const c = clearanceAround(footprint, solids);
    $("#clearance-values").textContent = c.overlap
      ? "Overlap detected — this arrangement needs changing."
      : `Left ${c.left.toFixed(2)} m · right ${c.right.toFixed(2)} m · foot ${c.foot.toFixed(2)} m`;
  }
  $("#scene-clearance").textContent = footprint
    ? (homes[state.home].studio
        ? "Inferred layout · "
        : "Synthetic layout · ") + $("#clearance-values").textContent
    : "";
  $("#place").textContent = selectedListing?.name || homes[state.home].label;
  for (const button of document.querySelectorAll("[data-listing]"))
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.listing === selectedListing?.id),
    );
  for (const input of document.querySelectorAll("[name=home]"))
    input.checked = entryKind === "demo" && input.value === state.home;
  for (const id of ["model-status", "collapsed-model-status"]) {
    const modelStatus = $("#" + id);
    if (modelStatus)
      modelStatus.textContent = selectedListing
        ? acceptedRegion
          ? "Partial 2D region"
          : "Evidence only"
        : "Illustrative model";
  }
  light();
  $("#bed").setAttribute("aria-pressed", String(state.largeBed));
  $("#bed span:last-child").textContent = state.largeBed
    ? "Queen bed"
    : "King bed";
  $("#unfurnished").setAttribute("aria-pressed", String(state.unfurnished));
  $("#unfurnished span:last-child").textContent = state.unfurnished
    ? "Furnished"
    : "Unfurnished";
  renderPlans();
  renderObjectControls();
}
const evidenceReview = setupEvidenceReview({
  inspectPlan: (url) => planInspection.inspect(url),
});
const planInspection = setupPlanInspection();
let selectedListing = null;
const buildingNotesHost = document.createElement("div");
$("#evidence-stage").append(buildingNotesHost);
const buildingNotes = mountBuildingNotes(buildingNotesHost);
const insideView = mountInsideView($("#inside-surface"), {
  onOpenPlans: () => setPlansOpen(true),
  onInspectPlan: ({ sourceUrl }) => {
    $("#source-details").open = true;
    planInspection.inspect(sourceUrl);
  },
});
const commuteView = mountCommuteView($("#commute-panel"), {
  routeLayer: {
    setRoute: (route) => geoMap?.routeLayer.setRoute(route),
    highlight: (step) => geoMap?.routeLayer.highlight(step),
    fit: (options) => geoMap?.routeLayer.fit(options),
    stop: () => geoMap?.routeLayer.stop(),
    beginWalk: (options) => geoMap?.routeLayer.beginWalk?.(options),
    endWalk: (options) => geoMap?.routeLayer.endWalk?.(options),
    walkAction: (action) => geoMap?.routeLayer.walkAction?.(action),
    seekWalk: (fraction) => geoMap?.routeLayer.seekWalk?.(fraction),
  },
});
function syncViewServices() {
  buildingNotes.setListing(selectedListing);
  insideView.update({
    selectedListing,
    acceptedRegion,
    priorities,
    active: Boolean(selectedListing) && state.mode === "walk",
  });
  commuteView.update({
    selectedListing,
    resolvedLocation: selectedListing
      ? listingLocations.get(selectedListing.id) || null
      : null,
    priorities,
    active: Boolean(selectedListing && geoMap) && state.mode === "commute",
  });
}
const syntheticPotential = { ...homes.potential };
function showListing(listing) {
  if (!listing) return;
  overviewReturn.clear();
  pendingOverviewCamera = null;
  entryKind = "listing";
  selectedListing = listing;
  listingIntake.select(listing);
  const reviewedLocation = getExampleLocation(listing.id);
  if (reviewedLocation && !listingLocations.has(listing.id))
    listingLocations.set(listing.id, reviewedLocation);
  locationGeneration++;
  locationRequest?.abort();
  locationRequest = null;
  $("#location-candidates").replaceChildren();
  $("#location-progress").textContent = "Locating the building automatically…";
  mapLocationMessage = "";
  $("#resolve-location").disabled = false;
  $("#source-details").open = false;
  $("#location-source").hidden = !listingLocations.has(listing.id);
  acceptedRegion = null;
  for (const record of inspectedPlans) {
    try {
      acceptedRegion = acceptInspectedRegion(record, listing.identity);
      break;
    } catch {}
  }
  evidenceReview.reset(listing, acceptedRegion);
  planInspection.reset(listing);
  try {
    localStorage.setItem("elsewhere-last-real-home", listing.id);
  } catch {}
  if (matchMedia("(max-width: 650px)").matches) {
    $("#places-content").hidden = true;
    $("#places-toggle").setAttribute("aria-expanded", "false");
    $("#places-toggle").setAttribute("aria-label", "Expand places");
    $("#places-toggle").textContent = "+";
  }
  $("#listing-evidence").hidden = false;
  for (const key of ["name", "location", "facts", "price", "availability"])
    $("#listing-" + key).textContent = listing[key];
  $("#listing-source").href = listing.url;
  $("#listing-checked").textContent = /^\d{4}-\d{2}-\d{2}$/.test(
    listing.checkedAt,
  )
    ? `Source reviewed ${listing.checkedAt} · saved snapshot`
    : (listing.discovery ? "Search observed " : "Source checked ") +
      new Date(listing.checkedAt).toLocaleString("en-US", {
        timeZone: "America/New_York",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }) +
      " ET · not a live refresh";
  $("#listing-unknowns").textContent = listing.questions;
  const summary = listingSummary(listing);
  $("#overview-price").textContent = summary.price;
  $("#overview-price").classList.toggle("unverified-rent", !summary.rentKnown);
  $("#evidence-availability").textContent = summary.status;
  $("#evidence-context").textContent = summary.details;
  $("#overview-freshness").textContent = $("#listing-checked").textContent;
  $("#listing-preview").hidden = true;
  $("#listing-map").hidden = listing.id !== "wall2308";
  $("#listing-status").textContent = acceptedRegion
    ? "Inspected nominal 2D region available in Plans."
    : "Evidence only · a usable dimensioned plan is needed.";
  $("#evidence-title").textContent = summary.address;
  $("#evidence-facts").textContent = summary.facts;
  $("#evidence-facts").hidden = !summary.facts;
  $("#evidence-reason").textContent =
    listing.readinessReason ||
    "A matching, authorized plan with usable scale is needed before creating a dimensional interior. Reported square footage is not enough.";
  $("#evidence-source").href = listing.url;
  $("#evidence-plan-source").hidden = !listing.planUrl;
  if (listing.planUrl) $("#evidence-plan-source").href = listing.planUrl;
  $("#inspected-region").hidden = !acceptedRegion;
  $("#inspected-region-note").textContent = acceptedRegion
    ? `${acceptedRegion.extent} ${acceptedRegion.qualification}`
    : "";
  $("#evidence-stage .evidence-note").textContent = acceptedRegion
    ? "A source-seeded, visually inspected 2D region is available. Furniture fit and current conditions are not established. Original plan artwork remains at its source."
    : "No room dimensions or furniture fit have been established. Listing furnishing status is unknown; photo staging does not establish what is included.";
  document.querySelector(".evidence").open = false;
  refresh();
  setMode("overview");
  if (!listingLocations.has(listing.id)) resolveListingLocation();
  else openNeighborhood(true);
}
const listingIntake = setupListingIntake(showListing, nycListings);
async function openNeighborhood(focus = false) {
  if (!selectedListing || state.mode === "walk") return;
  const selected = selectedListing;
  $("#map-view").hidden = false;
  $("#map-title").textContent = selected.name;
  $("#hint").hidden = true;
  try {
    mapInit ||= import("./neighborhood.js").then(({ createNeighborhood }) =>
      createNeighborhood($("#map-canvas"), (text) => {
        $("#map-status").textContent = mapLocationMessage || text;
      }, { onBuildingStatus: () => updateCitySource(), routePadding: () => {
        const mapRect = $("#map-canvas").getBoundingClientRect();
        const panel = $("#commute-panel").getBoundingClientRect();
        const overlaps = !$("#commute-panel").hidden && panel.top < mapRect.bottom && panel.bottom > mapRect.top;
        return { left: overlaps ? Math.min(panel.right - mapRect.left + 24, mapRect.width - 100) : 40, right: 40, top: 40, bottom: 48 };
      } }),
    );
    geoMap = await mapInit;
    updateCitySource();
    if (
      selectedListing?.id !== selected.id ||
      state.mode === "walk" ||
      entryKind === "empty"
    )
      return;
    const location = listingLocations.get(selected.id) || null;
    $("#location-source").hidden = !location;
    if (location) {
      $("#location-source-link").href = location.source;
      $("#location-source-link").textContent = location.label;
      $("#location-source-date").textContent =
        `Approximate building location · source reviewed ${new Date(location.observedAt).toLocaleString()}`;
    }
    syncViewServices();
    if (shownLocation !== selected.id) {
      geoMap.setLocation(location, selected.id);
      shownLocation = selected.id;
    }
    geoMap.resize();
    if (pendingOverviewCamera?.id === selected.id && state.mode === "overview") {
      const camera = pendingOverviewCamera.camera;
      pendingOverviewCamera = null;
      if (camera) geoMap.restoreCamera(camera);
      else geoMap.resumeLocationFocus();
    } else if (focus && location) geoMap.direct();
    else geoMap.resumeLocationFocus();
  } catch {
    mapInit = null;
    $("#map-status").textContent =
      "Map could not load. Source details remain available.";
  }
}
function updateCitySource() {
  if (!geoMap) return;
  const source = geoMap.getSourceDetails();
  $("#city-source-description").textContent = source.description + " " + source.coverage;
  $("#city-source-link").href = source.heightMethod;
}
$("#listing-map").onclick = () => setMode("overview");
$("#neighborhood-view").onclick = () => setMode("overview");
async function resolveListingLocation() {
  if (!selectedListing || locationRequest) return;
  const selected = selectedListing,
    generation = locationGeneration;
  locationRequest = new AbortController();
  $("#resolve-location").disabled = true;
  $("#location-progress").textContent = "Looking up the listing address…";
  mapLocationMessage = `Locating ${selected.name}…`;
  $("#map-status").textContent = mapLocationMessage;
  try {
    const result = await lookupLocation(
      selected.mapAddress || selected.name + ", " + selected.location,
      { signal: locationRequest.signal },
    );
    if (generation !== locationGeneration) return;
    const automatic = confidentLocationMatch(
      selected.mapAddress || selected.location,
      result.candidates,
    );
    if (automatic) {
      listingLocations.set(selected.id, automatic);
      shownLocation = null;
      mapLocationMessage = "";
      $("#location-review").hidden = true;
      await openNeighborhood(true);
      return;
    }
    mapLocationMessage = "Address needs review in Sources & details.";
    $("#map-status").textContent = mapLocationMessage;
    $("#location-review").hidden = false;
    $("#location-candidates").replaceChildren();
    $("#location-progress").textContent = result.candidates.length
      ? "Choose the matching address. This is an approximate location."
      : "No matching location returned. Check the address in the original source.";
    for (const candidate of result.candidates) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = candidate.label;
      button.onclick = () => {
        if (selectedListing?.id !== selected.id) return;
        listingLocations.set(selected.id, candidate);
        shownLocation = null;
        mapLocationMessage = "";
        $("#location-review").hidden = true;
        openNeighborhood(true);
      };
      $("#location-candidates").append(button);
    }
  } catch (error) {
    if (generation === locationGeneration && error.name !== "AbortError") {
      $("#location-progress").textContent = error.message;
      mapLocationMessage =
        "Location lookup unavailable. Retry in Sources & details.";
      $("#map-status").textContent = mapLocationMessage;
      $("#location-review").hidden = false;
    }
  } finally {
    if (generation === locationGeneration) {
      locationRequest = null;
      $("#resolve-location").disabled = false;
    }
  }
}
$("#resolve-location").onclick = resolveListingLocation;
$("#change-listing").onclick = () => $("#add-listing").click();
$("#change-location").onclick = () => {
  if (!selectedListing) return;
  listingLocations.delete(selectedListing.id);
  shownLocation = null;
  $("#source-details").open = false;
  setMode("overview");
  resolveListingLocation();
};
setupPriorities((selected) => {
  priorities = selected;
  const summary = $("#priority-summary");
  if (summary) summary.textContent = selected.length
    ? selected.join(", ")
    : "Choose what matters nearby";
  syncViewServices();
});
$("#listing-preview").addEventListener("click", () => {
  if (selectedListing) $("#evidence-stage").hidden = false;
});
for (const b of document.querySelectorAll("[data-mode]"))
  b.addEventListener("click", () => {
    setMode(b.dataset.mode);
    if (state.mode === "walk") {
      const target = selectedListing ? $("#inside-surface .iv-canvas") || $("#inside-surface a") : container;
      target?.focus({ preventScroll: true });
    }
  });
for (const input of document.querySelectorAll("[name=home]"))
  input.addEventListener("change", () => {
    selectedListing = null;
    acceptedRegion = null;
    entryKind = "demo";
    $("#listing-evidence").hidden = true;
    state.home = input.value;
    Object.assign(
      state,
      histories[state.home].at(-1)?.state || {
        largeBed: false,
        unfurnished: false,
        evening: false,
        hiddenItems: [],
        personalObjects: [],
      },
    );
    state.hiddenItems = [...state.hiddenItems];
    refresh();
    setMode("overview");
    message(
      `${homes[state.home].label} loaded. All dimensions and surroundings are synthetic.`,
    );
  });
function commitSceneCommand(command) {
  if (entryKind !== "demo" || !currentLayout)
    throw new Error("Select an available interior first.");
  Object.assign(
    state,
    applySceneCommand(state, command, currentLayout, currentLayout.revision.id),
  );
  refresh();
}
function localCommand(command) {
  try {
    commitSceneCommand(command);
    $("#astra-status").hidden = false;
    $("#astra-status").textContent = "Local edit · no model request";
    $("#object-feedback").textContent = "Updated · Undo is available";
  } catch (error) {
    $("#object-feedback").textContent = error.message;
  }
}
$("#bed").onclick = () =>
  localCommand({
    action: "resize_bed",
    target: "bed",
    value: state.largeBed ? "queen" : "king",
  });
$("#unfurnished").onclick = () =>
  localCommand({
    action: "set_visibility",
    target: "furniture",
    value: state.unfurnished ? "show" : "hide",
  });
$("#evening").onclick = () =>
  localCommand({
    action: "set_lighting",
    target: "scene",
    value: state.evening ? "day" : "evening",
  });
$("#reset").onclick = () => {
  state.hiddenItems = [];
  state.personalObjects = [];
  $("#astra-status").hidden = false;
  $("#astra-status").textContent = "Local edit · no model request";
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
  if (width < 1 || height < 1) return;
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
  if (entryKind !== "demo" || plansOpen) return;
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
    entryKind,
    camera: camera.position.toArray(),
    objects: scene.children.length,
    solids: solids.length,
    webgl: renderer.capabilities.isWebGL2,
    layout: currentLayout,
    revisionId: currentLayout?.revision?.id,
    evidenceOnly: Boolean(selectedListing),
    visibleElementIds: house.children
      .filter((n) => n.visible)
      .map((n) => n.userData.elementId)
      .filter(Boolean),
  }),
};

function syncComposer() {
  const form = $("#astra-form");
  $("#astra-submit").disabled =
    form.dataset.ready !== "true" ||
    entryKind !== "demo" ||
    form.getAttribute("aria-busy") === "true" ||
    !$("#astra-prompt").value.trim();
}
function sizeComposer() {
  const input = $("#astra-prompt");
  input.style.height = "auto";
  input.style.height = Math.min(108, input.scrollHeight) + "px";
  syncComposer();
}
$("#astra-prompt").addEventListener("input", sizeComposer);
$("#astra-prompt").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    if (!$("#astra-submit").disabled) $("#astra-form").requestSubmit();
  }
});
$("#dismiss-reply").onclick = () => {
  $("#astra-reply").hidden = true;
};
new ResizeObserver(([entry]) => {
  document.documentElement.style.setProperty(
    "--composer-height",
    `${entry.target.offsetHeight}px`,
  );
}).observe($("#astra-form"));
let astraReady = false;
fetch("/api/astra/status")
  .then((r) => r.json())
  .then((data) => {
    astraReady = data.configured === true;
    $("#astra-form").dataset.ready = String(astraReady);
    syncComposer();
    $("#astra-status").hidden = true;
    $("#astra-status").textContent = "";
    $("#astra-submit").title = astraReady
      ? "Send message (Enter)"
      : "Astra is unavailable. Local scene previews still work.";
  })
  .catch(() => {
    $("#astra-submit").title =
      "Astra is unavailable. Local scene previews still work.";
  });
$("#astra-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const prompt = $("#astra-prompt").value.trim();
  if (
    !astraReady ||
    entryKind !== "demo" ||
    !prompt ||
    $("#astra-form").getAttribute("aria-busy") === "true"
  )
    return;
  const sceneAtRequest = homes[state.home];
  const revisionAtRequest = sceneRevision;
  $("#astra-form").setAttribute("aria-busy", "true");
  $("#astra-form").dataset.error = "false";
  syncComposer();
  $("#astra-status").hidden = false;
  $("#astra-status").textContent = "Updating scene…";
  $("#astra-status").removeAttribute("title");
  $("#astra-request").textContent = prompt;
  $("#astra-answer").textContent = "Updating scene…";
  $("#astra-reply").hidden = false;
  try {
    const response = await fetch("/api/astra/scene-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        scene: {
          version: 1,
          width: sceneAtRequest.width,
          depth: sceneAtRequest.depth,
          provenance: sceneAtRequest.studio ? "inferred" : "synthetic",
          bedSize: state.largeBed ? "king" : "queen",
          lighting: state.evening ? "evening" : "day",
          unfurnished: state.unfurnished,
          hiddenItems: [...state.hiddenItems].sort(),
        },
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Astra edit failed.");
    const edit = validateSceneEdit(result.edit);
    if (
      homes[state.home] !== sceneAtRequest ||
      sceneRevision !== revisionAtRequest
    )
      throw new Error(
        "Scene changed while Astra was working. Edit was not applied. Send your request again.",
      );
    const reply =
      edit.action === "resize_bed"
        ? `${edit.value === "king" ? "King" : "Queen"} bed placed.`
        : edit.action === "set_lighting"
          ? `${edit.value === "evening" ? "Evening light" : "Daylight"} applied. Lighting is illustrative.`
          : `${edit.target === "furniture" ? "Movable furnishings" : edit.target === "table" ? "Table group" : edit.target} ${edit.value === "hide" ? "hidden" : "restored"}.`;
    commitSceneCommand(edit);
    if (state.mode === "walk") setMode("walk");
    $("#astra-reply").hidden = false;
    $("#astra-answer").textContent =
      reply +
      (edit.action === "resize_bed"
        ? ` ${$("#scene-clearance").textContent}. Verify real room measurements before deciding fit.`
        : "");
    $("#astra-status").textContent =
      `${result.cached ? "Cached Astra edit" : "Live Astra edit"} · ${result.model}`;
    $("#astra-status").title =
      `Request ${result.requestId} · ${new Date(result.generatedAt).toLocaleTimeString()}`;
    if ($("#astra-prompt").value.trim() === prompt)
      $("#astra-prompt").value = "";
    sizeComposer();
  } catch (error) {
    $("#astra-form").dataset.error = "true";
    $("#astra-reply").hidden = false;
    $("#astra-answer").textContent = error.message;
    $("#astra-status").textContent =
      "No edit applied · revise your message and try again";
  } finally {
    $("#astra-form").removeAttribute("aria-busy");
    syncComposer();
  }
});

// Keep scene controls discoverable without a permanent instruction banner.
function dismissHint() {
  $("#hint").hidden = true;
}
container.addEventListener("pointerdown", dismissHint, { once: true });
container.addEventListener("wheel", dismissHint, { once: true, passive: true });
container.addEventListener("keydown", dismissHint, { once: true });
$("#help-toggle").onclick = () => {
  const open = $("#help-panel").hidden;
  $("#help-panel").hidden = !open;
  $("#help-toggle").setAttribute("aria-expanded", String(open));
};
// Initialize once; later resizing must not override the user's panel choice.
if (matchMedia("(max-width: 650px), (max-height: 600px)").matches) {
  $("#places-content").hidden = true;
  $("#places-toggle").setAttribute("aria-expanded", "false");
  $("#places-toggle").setAttribute("aria-label", "Expand places");
  $("#places-toggle").textContent = "+";
}
$("#places-toggle").onclick = () => {
  const open = $("#places-content").hidden;
  $("#places-content").hidden = !open;
  $("#places-toggle").setAttribute("aria-expanded", String(open));
  $("#places-toggle").setAttribute(
    "aria-label",
    open ? "Collapse places" : "Expand places",
  );
  $("#places-toggle").textContent = open ? "−" : "+";
};

// Clear a retained document offset when this viewport layout replaces an older HMR page.
window.scrollTo({ top: 0, left: 0, behavior: "instant" });

function renderPlans() {
  if (planDownloadUrl) URL.revokeObjectURL(planDownloadUrl);
  planDownloadUrl = null;
  $("#plans-panel").hidden = !plansOpen;
  $("#plan-name").textContent =
    selectedListing?.name || currentLayout?.label || "Plans";
  const enabled = Boolean(currentLayout);
  let sourcePlan = null;
  try { sourcePlan = normalizeSourceUrl(selectedListing?.planUrl); } catch {}
  const sourceOnly = !enabled && Boolean(sourcePlan);
  if (!sourceOnly && sourcePlanViewer) {
    sourcePlanViewer.destroy();
    sourcePlanViewer = null;
  }
  $("#plan-drawing").classList.toggle("source-plan", sourceOnly);
  $(".plan-tools").hidden = !enabled;
  $("#plan-print").hidden = !enabled;
  for (const id of [
    "plan-print",
    "plan-zoom-in",
    "plan-zoom-out",
    "plan-fit",
    "plan-dimensions",
  ])
    $("#" + id).disabled = !enabled;
  const download = $("#plan-svg");
  download.textContent = "Download SVG";
  download.removeAttribute("target");
  download.removeAttribute("rel");
  download.setAttribute("aria-disabled", String(!enabled));
  download.tabIndex = enabled ? 0 : -1;
  download.removeAttribute("href");
  if (enabled) {
    planDownloadUrl = URL.createObjectURL(new Blob([renderPlanSvg(currentLayout)], { type: "image/svg+xml" }));
    const subject = (selectedListing?.name || state.home)
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    download.href = planDownloadUrl;
    download.download = `elsewhere-${subject}-${currentLayout.revision.id.slice(0, 8)}.svg`;
  }
  $("#plan-undo").disabled =
    !enabled || Boolean(selectedListing) || histories[state.home].length < 2;
  $("#plan-persistence").textContent = acceptedRegion
    ? "Bundled inspected source record · original artwork linked only · reuse rights unresolved"
    : "Saved on this browser only";
  for (const button of document.querySelectorAll("[data-document]")) {
    button.hidden = !enabled && button.dataset.document !== "source";
    button.disabled =
      Boolean(acceptedRegion) &&
      ["arrangement", "offered"].includes(button.dataset.document);
    if (button.dataset.document === "empty")
      button.textContent = acceptedRegion ? "Supported region" : "Empty layout";
    button.setAttribute(
      "aria-pressed",
      String(
        enabled &&
          button.dataset.document ===
            (acceptedRegion || state.unfurnished ? "empty" : "arrangement"),
      ),
    );
  }
  if (sourceOnly) {
    const study = selectedListing.planStudy;
    $("[data-document='source']").setAttribute("aria-pressed", "true");
    $("#plan-notice").textContent = "Original publisher plan · " +
      (selectedListing.planScope === "type_only" ? "Residence type; exact apartment not selected." : "Confirm the unit and current condition at its source.");
    if (plansOpen) {
      if (!sourcePlanViewer) {
        $("#plan-drawing").replaceChildren();
        sourcePlanViewer = mountSourcePlan($("#plan-drawing"));
      }
      void sourcePlanViewer.update({ sourceUrl: sourcePlan, title: selectedListing.name, active: true });
    } else sourcePlanViewer?.setActive(false);
    $("#plan-selection").textContent = study
      ? study.reportedDimensions.map(room => `${room.label}: ${room.printed}`).join(" · ") + ". Printed sizes; boundary endpoints remain unverified."
      : "This is the source document. It does not establish verified room geometry or included furnishings.";
    $("#plan-revision").textContent = study ? `Source reviewed ${study.reviewedAt.slice(0,10)}` : "Publisher-hosted document";
    $("#plan-persistence").textContent = "Original source preview · open the publisher document to print or save a copy.";
    download.textContent = "Open publisher plan ↗";
    download.href = sourcePlan;
    download.target = "_blank";
    download.rel = "noopener noreferrer";
    download.removeAttribute("download");
    download.setAttribute("aria-disabled", "false");
    download.tabIndex = 0;
    return;
  }
  if (!enabled) {
    $("#plan-drawing").replaceChildren();
    $("#plan-notice").textContent =
      "Needs measurement. Source plan, Empty layout, As offered and My arrangement stay unavailable until usable scale and authorized plan evidence are established.";
    $("#plan-selection").textContent =
      "Reported area is not a substitute for room dimensions.";
    $("#plan-revision").textContent = "Evidence only";
    return;
  }
  $("#plan-notice").textContent = acceptedRegion
    ? `${acceptedRegion.extent} Nominal correspondence to printed sizes; dimension endpoints are unmarked. Unknown architecture is excluded. Current clear-floor geometry is not established.`
    : "Synthetic demonstration · 2D and 3D share this layout. Empty hides movable furniture; fixed fixtures remain.";
  $("#plan-drawing").innerHTML = renderPlanSvg(currentLayout, {
    selectedId: selectedPlanObject,
    showDimensions: $("#plan-dimensions").checked,
    showClearance: !acceptedRegion,
    compact: true,
  });
  const svg = $("#plan-drawing svg");
  if (svg) {
    svg.style.width = `${planZoom * 100}%`;
    svg.style.height = `${planZoom * 100}%`;
  }
  $("#plan-revision").textContent = acceptedRegion
    ? "Artwork metadata: " + (acceptedRegion.artworkDate || "date unknown")
    : "Revision " + currentLayout.revision.id.slice(0, 8);
  const element = currentLayout.elements.find(
    (e) => e.id === selectedPlanObject && e.visible,
  );
  $("#plan-selection").textContent = element?.assetId
    ? `${element.label} · hypothetical preview ${element.width.toFixed(2)} × ${element.depth.toFixed(2)} m · actual dimensions unknown`
    : element
      ? `${element.label} · outer ${element.width.toFixed(2)} × ${element.depth.toFixed(2)} m · ${element.evidence.basis} · ${element.category === "fixtures" ? "Fixed fixture" : element.category}`
      : acceptedRegion
        ? "Published nominal 2D dimensions. No ceiling height, walkable interior or fit claim."
        : "Select an object to inspect its model dimensions.";
}
function setPlansOpen(open) {
  plansOpen = open;
  keys.clear();
  document.body.classList.toggle("plans-open", open);
  $("#plans-toggle").setAttribute("aria-pressed", String(open));
  renderPlans();
  if (open && !$("#plans-dialog").open) $("#plans-dialog").showModal();
  else if (!open && $("#plans-dialog").open) $("#plans-dialog").close();
}
$("#open-inspected-region").onclick = () => setPlansOpen(true);
$("#plans-toggle").onclick = () => setPlansOpen(!plansOpen);
$("#plans-close").onclick = () => setPlansOpen(false);
$("#plans-dialog").addEventListener("cancel", (event) => {
  event.preventDefault();
  setPlansOpen(false);
});
$("#plans-dialog").addEventListener("click", (event) => {
  const r = $("#plans-dialog").getBoundingClientRect();
  if (
    event.target === $("#plans-dialog") &&
    (event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom)
  )
    setPlansOpen(false);
});
$("#add-listing").onclick = () => {
  entryKind = "empty";
  selectedListing = null;
  $("#listing-status").textContent = "";
  mapLocationMessage = "";
  acceptedRegion = null;
  planInspection.reset(null);
  locationGeneration++;
  locationRequest?.abort();
  locationRequest = null;
  shownLocation = null;
  geoMap?.setLocation(null);
  evidenceReview.reset(null);
  setPlansOpen(false);
  refresh();
  setMode("overview");
  $("#listing-address").focus();
};
$("#plan-dimensions").onchange = renderPlans;
$("#plan-fit").onclick = () => {
  planZoom = 1;
  renderPlans();
};
$("#plan-zoom-in").onclick = () => {
  planZoom = Math.min(3, planZoom + 0.25);
  renderPlans();
};
$("#plan-zoom-out").onclick = () => {
  planZoom = Math.max(0.75, planZoom - 0.25);
  renderPlans();
};
$("#plan-drawing").onclick = (event) => {
  const target = event.target.closest("[data-object-id]");
  if (!target || !currentLayout) return;
  selectedPlanObject = target.dataset.objectId;
  renderPlans();
  const object = house.children.find(
    (n) => n.userData.elementId === selectedPlanObject,
  );
  if (object && !plansOpen) {
    controls.target.set(object.position.x, 0.7, object.position.z);
    controls.update();
  }
};
for (const button of document.querySelectorAll("[data-document]"))
  button.onclick = () => {
    const kind = button.dataset.document;
    if (acceptedRegion && kind === "empty") {
      renderPlans();
      return;
    }
    if (kind === "source") {
      $("#plan-notice").textContent = selectedListing?.planUrl
        ? acceptedRegion
          ? "Original plan artwork remains at its source. Published room dimensions were inspected; artwork reuse rights remain unresolved."
          : "Original plan reference is linked in the source evidence. Scale and permission for reuse remain unverified."
        : "No source plan is available for this home. This demonstration was authored during the event.";
      return;
    }
    if (kind === "offered") {
      $("#plan-notice").textContent =
        "As offered is unavailable: included furnishings have not been confirmed. Photo staging is not evidence of inclusion.";
      return;
    }
    if (!currentLayout || selectedListing) {
      $("#plan-notice").textContent =
        "Needs measurement: supply an authorized plan with usable scale before planning this listing.";
      return;
    }
    localCommand({
      action: "set_visibility",
      target: "furniture",
      value: kind === "empty" ? "hide" : "show",
    });
  };
$("#plan-undo").onclick = () => {
  const entries = histories[state.home];
  if (selectedListing || entries.length < 2) return;
  entries.pop();
  Object.assign(state, cleanPlanState(entries.at(-1).state));
  applyingHistory = true;
  refresh();
  applyingHistory = false;
  persistPlans();
};
$("#plan-print").onclick = () => {
  if (!currentLayout) return;
  const popup = window.open("", "_blank");
  if (!popup) {
    $("#plan-notice").textContent = "Allow a print window, then try again.";
    return;
  }
  popup.document.write(renderPlanPrintDocument(currentLayout));
  popup.document.close();
  setTimeout(() => popup.print(), 300);
};
// Internal development fixtures remain callable for regression checks only.
if (import.meta.env.DEV)
  window.__elsewhere.loadFixture = (home = "current") => {
    if (!["current", "potential"].includes(home))
      throw new Error("Unknown fixture");
    const input = document.querySelector(`input[value="${home}"]`);
    input.checked = true;
    input.dispatchEvent(new Event("change"));
  };
loadPlanHistory()
  .then((saved) => {
    for (const key of ["current", "potential"]) {
      if (!saved[key]?.length) continue;
      // The first local entry is the temporary startup preset. Subsequent
      // entries are actual edits made while IndexedDB was opening. Keep those
      // edits after the saved history, and always restore untouched homes.
      const localEdits = histories[key].slice(1);
      const merged = [...saved[key]];
      for (const entry of localEdits) {
        if (
          JSON.stringify(merged.at(-1)?.state) !== JSON.stringify(entry.state)
        )
          merged.push(entry);
      }
      histories[key] = merged.slice(-30);
    }
    const active = histories[state.home].at(-1);
    if (active) Object.assign(state, cleanPlanState(active.state));
    applyingHistory = true;
    try {
      refresh();
    } finally {
      applyingHistory = false;
    }
    storageReady = true;
    persistPlans();
  })
  .catch(() => {
    $("#plan-persistence").textContent =
      "Browser storage unavailable; export to keep this revision.";
  });

$("#plan-drawing").addEventListener("keydown", (event) => {
  const target = event.target.closest("[data-object-id]");
  if (!target || !["Enter", " "].includes(event.key)) return;
  event.preventDefault();
  const id = target.dataset.objectId;
  target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  $("#plan-drawing [data-object-id='" + CSS.escape(id) + "']")?.focus({
    preventScroll: true,
  });
});

function renderObjectControls() {
  $("#personal-library").hidden = entryKind !== "demo";
  for (const button of document.querySelectorAll("[data-add-asset]")) {
    button.disabled = state.unfurnished || state.personalObjects.length >= 12;
    button.title =
      state.personalObjects.length >= 12
        ? "This preview supports up to 12 personal objects"
        : state.unfurnished
          ? "Restore My arrangement before adding a furniture preview"
          : "Add a hypothetical preview; actual dimensions are unknown";
  }
  const select = $("#object-select");
  select.replaceChildren(new Option("Choose an item", ""));
  for (const element of currentLayout?.elements || [])
    if (element.visible && element.kind !== "floor")
      select.add(new Option(element.label, element.id));
  select.value = selectedPlanObject || "";
  const element = currentLayout?.elements.find(
    (e) => e.id === selectedPlanObject && e.visible,
  );
  $("#object-controls").hidden = !element || entryKind !== "demo";
  if (!element) return;
  $("#object-name").textContent = element.label;
  $("#object-evidence").textContent = element.assetId
    ? "Approximate appearance · size and product identity unconfirmed. Preview placement only; no real fit claim."
    : `${element.width.toFixed(2)} × ${element.depth.toFixed(2)} m · synthetic model${element.category === "fixtures" || element.category === "structure" ? " · fixed, inspect only" : ""}`;
  $("#object-move").hidden = !element.assetId;
  $("#object-undo").disabled = histories[state.home].length < 2;
}
function selectObject(id) {
  if (id && matchMedia("(max-width: 650px), (max-height: 600px)").matches) {
    $("#places-content").hidden = true;
    $("#places-toggle").setAttribute("aria-expanded", "false");
    $("#places-toggle").setAttribute("aria-label", "Expand places");
    $("#places-toggle").textContent = "+";
    $("#astra-reply").hidden = true;
  }
  selectedPlanObject = id || null;
  renderPlans();
  renderObjectControls();
  $("#object-feedback").textContent = "";
}
$("#object-select").onchange = (event) => selectObject(event.target.value);
$("#object-close").onclick = () => selectObject(null);
$("#object-undo").onclick = () => {
  $("#plan-undo").click();
  renderObjectControls();
};
$("#object-remove").onclick = () =>
  localCommand({ action: "remove_instance", instanceId: selectedPlanObject });
$("#object-rotate").onclick = () => {
  const instance = state.personalObjects.find(
    (o) => o.id === selectedPlanObject,
  );
  if (instance)
    localCommand({
      action: "rotate_instance",
      instanceId: instance.id,
      rotation: (instance.rotation + 90) % 360,
    });
};
for (const b of document.querySelectorAll("[data-nudge]"))
  b.onclick = () => {
    const instance = state.personalObjects.find(
      (o) => o.id === selectedPlanObject,
    );
    if (!instance) return;
    const delta = {
      left: [-0.25, 0],
      right: [0.25, 0],
      back: [0, -0.25],
      front: [0, 0.25],
    }[b.dataset.nudge];
    localCommand({
      action: "move_instance",
      instanceId: instance.id,
      x: instance.x + delta[0],
      z: instance.z + delta[1],
    });
  };
for (const b of document.querySelectorAll("[data-add-asset]"))
  b.onclick = () => {
    if (!currentLayout) return;
    const instanceId = "personal-" + crypto.randomUUID();
    for (const z of [1, 2, 0, -2, 3])
      for (const x of [-3, -1, 1, 3, -4, 4]) {
        const command = {
          action: "place_asset",
          assetId: b.dataset.addAsset,
          instanceId,
          x,
          z,
          rotation: 0,
        };
        try {
          applySceneCommand(
            state,
            command,
            currentLayout,
            currentLayout.revision.id,
          );
          localCommand(command);
          selectObject(instanceId);
          return;
        } catch {}
      }
    $("#astra-status").hidden = false;
    $("#astra-status").textContent =
      "No clear preview position is available in this arrangement";
  };
let pickStart;
container.addEventListener("pointerdown", (event) => {
  pickStart = [event.clientX, event.clientY];
});
container.addEventListener("pointerup", (event) => {
  if (
    !pickStart ||
    Math.hypot(event.clientX - pickStart[0], event.clientY - pickStart[1]) >
      6 ||
    entryKind !== "demo"
  )
    return;
  const r = container.getBoundingClientRect();
  const ray = new THREE.Raycaster();
  ray.setFromCamera(
    new THREE.Vector2(
      ((event.clientX - r.left) / r.width) * 2 - 1,
      (-(event.clientY - r.top) / r.height) * 2 + 1,
    ),
    camera,
  );
  const hit = ray.intersectObject(house, true)[0];
  let node = hit?.object;
  while (node && !node.userData.elementId) node = node.parent;
  if (node) selectObject(node.userData.elementId);
});
