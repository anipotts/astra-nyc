import { Map, Marker, NavigationControl, setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { validateLocation, LOCATION_BOUNDS } from "./location.js";
setWorkerUrl(workerUrl);
const regionalCamera = {
  center: [-74.009, 40.711],
  zoom: 14.5,
  pitch: 56,
  bearing: -25,
};

// Planetiler's OpenMapTiles profile uses raw height, otherwise storeys * 3.66,
// otherwise 5 m. Tiles discard which branch supplied a height. Exclude the
// entire 5 m bucket conservatively, including genuinely measured 5 m objects.
// https://github.com/openmaptiles/planetiler-openmaptiles/blob/main/src/main/java/org/openmaptiles/layers/Building.java
const tileHeight = ["number", ["get", "render_height"], 0];
const tileBase = ["number", ["get", "render_min_height"], 0];
const supportedMassing = [
  "all",
  ["has", "render_height"],
  ["has", "render_min_height"],
  ["!=", ["get", "hide_3d"], true],
  [">", tileHeight, 0],
  ["!=", tileHeight, 5],
  ["<", tileHeight, 1000],
  [">=", tileBase, 0],
  ["<", tileBase, tileHeight],
];
export const CITY_SOURCE_DETAILS = Object.freeze({
  title: "3D city context",
  description:
    "OpenStreetMap footprints with approximate tile heights. Heights may come from recorded measurements or estimates from storey counts; the tiles do not distinguish them. Fixed 5 m defaults are excluded and missing heights remain flat. Colors are a neutral rendering, not building materials. This is untextured city massing, not surveyed or photorealistic geometry.",
  source: "https://openfreemap.org/",
  heightMethod:
    "https://github.com/openmaptiles/planetiler-openmaptiles/blob/main/src/main/java/org/openmaptiles/layers/Building.java",
  coverage:
    "Available OpenStreetMap geometry in the NYC and Jersey City regional extent; completeness and currentness vary by building.",
});

export async function createNeighborhood(container, onStatus = () => {}) {
  const response = await fetch("https://tiles.openfreemap.org/styles/liberty", {
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("Map style unavailable");
  const style = await response.json();
  // Exclude unused POI sprites and road shields before their first render.
  // Otherwise the upstream style requests missing icons before load handlers run.
  style.layers = style.layers.filter(
    (layer) =>
      !["poi", "housenumber"].includes(layer["source-layer"]) &&
      !/shield/.test(layer.id),
  );
  const map = new Map({
    container,
    style,
    ...regionalCamera,
    attributionControl: { compact: false },
    canvasContextAttributes: {
      antialias: true,
      powerPreference: "high-performance",
    },
    pixelRatio: Math.min(2, globalThis.devicePixelRatio || 1),
    maxZoom: 19,
    minZoom: 10,
    maxPitch: 70,
    maxBounds: [
      [LOCATION_BOUNDS.west, LOCATION_BOUNDS.south],
      [LOCATION_BOUNDS.east, LOCATION_BOUNDS.north],
    ],
  });
  const duration = () =>
    globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 650;
  let selected = null;
  let pin = null;
  let destroyed = false;
  const stop = () => {
    if (!destroyed) map.stop();
  };
  const move = (camera) => {
    if (!destroyed) {
      map.stop();
      map.easeTo({ ...camera, duration: duration() });
    }
  };
  // Interrupt a prior programmatic tween before a fresh direct interaction.
  for (const event of ["pointerdown", "wheel", "keydown"])
    container.addEventListener(event, stop, { capture: true, passive: true });
  map.addControl(new NavigationControl({ showCompass: true }), "top-right");
  const status = () =>
    onStatus(
      selected
        ? "Selected address · 3D city context · © OpenStreetMap contributors"
        : "NYC + Jersey City · 3D city context · © OpenStreetMap contributors",
    );
  const timeout = setTimeout(() => {
    if (!destroyed && !map.loaded())
      onStatus(
        "Map tiles are taking longer than expected. Location source links remain available.",
      );
  }, 12000);
  map.on("error", () => {
    if (!destroyed)
      onStatus(
        "Some map tiles could not load. Location source links remain available.",
      );
  });
  map.on("load", () => {
    clearTimeout(timeout);
    if (destroyed) return;
    // Replace the default extrusion layer, which includes guessed 5 m blocks.
    for (const layer of map.getStyle().layers ?? [])
      if (layer.type === "fill-extrusion") map.removeLayer(layer.id);
    for (const layer of map.getStyle().layers ?? []) {
      const sourceLayer = layer["source-layer"];
      if (sourceLayer === "transportation" && layer.type === "line") {
        map.setPaintProperty(layer.id, "line-color", "#d7dad4");
        map.setPaintProperty(layer.id, "line-opacity", 0.52);
      } else if (
        sourceLayer === "transportation_name" &&
        layer.type === "symbol"
      ) {
        map.setPaintProperty(layer.id, "text-opacity", 0.48);
        map.setPaintProperty(layer.id, "icon-opacity", 0);
        map.setPaintProperty(layer.id, "text-color", "#5f6b61");
      } else if (sourceLayer === "poi" || sourceLayer === "housenumber") {
        map.setLayoutProperty(layer.id, "visibility", "none");
      } else if (sourceLayer === "boundary" && layer.type === "line") {
        map.setPaintProperty(layer.id, "line-opacity", 0.15);
      }
    }
    map.setLight({
      anchor: "map",
      color: "#fff5e8",
      intensity: 0.5,
      position: [1.5, 210, 35],
    });
    const source = Object.entries(map.getStyle().sources).find(
      ([, value]) => value.type === "vector",
    )?.[0];
    if (source && !map.getLayer("elsewhere-buildings")) {
      const before = map
        .getStyle()
        .layers.find((layer) => layer.type === "symbol")?.id;
      map.addLayer(
        {
          id: "elsewhere-buildings",
          type: "fill",
          source,
          "source-layer": "building",
          minzoom: 14,
          paint: {
            "fill-color": "#cac9bc",
            "fill-opacity": 0.85,
            "fill-outline-color": "#aaa99e",
          },
        },
        before,
      );
      map.addLayer(
        {
          id: "elsewhere-city-massing",
          type: "fill-extrusion",
          source,
          "source-layer": "building",
          minzoom: 14,
          filter: supportedMassing,
          paint: {
            "fill-extrusion-height": tileHeight,
            "fill-extrusion-base": tileBase,
            "fill-extrusion-color": [
              "interpolate",
              ["linear"],
              tileHeight,
              0,
              "#d7dcd5",
              35,
              "#bbc7bc",
              150,
              "#92a89d",
              400,
              "#7f9991",
            ],
            "fill-extrusion-opacity": 1,
            "fill-extrusion-vertical-gradient": true,
          },
        },
        before,
      );
    }
    status();
  });
  return {
    setLocation(value) {
      if (destroyed) return;
      stop();
      pin?.remove();
      pin = null;
      selected = null;
      const location = validateLocation(value);
      selected = location;
      if (location) {
        const element = document.createElement("div");
        element.className = "listing-pin";
        element.textContent = location.label.split(",").slice(0, 2).join(",");
        element.title = `${location.label} · approximate source location`;
        pin = new Marker({ element })
          .setLngLat([location.longitude, location.latitude])
          .addTo(map);
        move({
          center: [location.longitude, location.latitude],
          zoom: 17.5,
          pitch: 56,
          bearing: map.getBearing(),
        });
      } else move(regionalCamera);
      status();
    },
    resize: () => {
      if (!destroyed) map.resize();
    },
    stop,
    getSourceDetails: () => CITY_SOURCE_DETAILS,
    getCamera: () => {
      if (destroyed) return null;
      const center = map.getCenter();
      return {
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing(),
      };
    },
    restoreCamera(camera) {
      if (
        !camera ||
        !Array.isArray(camera.center) ||
        camera.center.length !== 2 ||
        !camera.center.every(Number.isFinite) ||
        camera.center[0] < LOCATION_BOUNDS.west ||
        camera.center[0] > LOCATION_BOUNDS.east ||
        camera.center[1] < LOCATION_BOUNDS.south ||
        camera.center[1] > LOCATION_BOUNDS.north ||
        !Number.isFinite(camera.zoom) ||
        camera.zoom < 10 ||
        camera.zoom > 19 ||
        !Number.isFinite(camera.pitch) ||
        camera.pitch < 0 ||
        camera.pitch > 70 ||
        !Number.isFinite(camera.bearing)
      )
        return false;
      move({
        center: camera.center,
        zoom: camera.zoom,
        pitch: camera.pitch,
        bearing: camera.bearing,
      });
      return true;
    },
    pullback() {
      if (selected)
        move({
          center: [selected.longitude, selected.latitude],
          zoom: 14.7,
          pitch: 56,
          bearing: map.getBearing(),
        });
      else move(regionalCamera);
    },
    direct() {
      if (selected) {
        move({
          center: [selected.longitude, selected.latitude],
          zoom: 17.5,
          pitch: 56,
          bearing: map.getBearing(),
        });
        status();
      } else onStatus("Choose a location match before focusing the map.");
    },
    destroy() {
      if (destroyed) return;
      stop();
      destroyed = true;
      clearTimeout(timeout);
      for (const event of ["pointerdown", "wheel", "keydown"])
        container.removeEventListener(event, stop, { capture: true });
      pin?.remove();
      map.remove();
    },
  };
}
