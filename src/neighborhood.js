import { Map, Marker, NavigationControl, setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
setWorkerUrl(workerUrl);
// Rounded listing map coordinates, inspected from the source on 2026-09-10.
// This is not a surveyed entrance or a verified location inside the building.
const center = [-74.0075, 40.7046];
export function createNeighborhood(container, onStatus) {
  const map = new Map({
    container,
    style: "https://tiles.openfreemap.org/styles/liberty",
    center,
    zoom: 17.8,
    pitch: 55,
    bearing: -25,
    attributionControl: { compact: false },
    maxZoom: 19,
  });
  const duration = () =>
    matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1700;
  const marker = document.createElement("div");
  marker.className = "listing-pin";
  marker.textContent = "95 Wall";
  new Marker({ element: marker }).setLngLat(center).addTo(map);
  map.addControl(new NavigationControl({ showCompass: true }), "top-right");
  let failed = false;
  const timeout = setTimeout(() => {
    if (!map.loaded())
      onStatus(
        "Map is taking longer than expected. Enter the home to continue.",
      );
  }, 12000);
  map.on("error", () => {
    failed = true;
    onStatus("Some map data could not load. Interior remains available.");
  });
  map.on("load", () => {
    clearTimeout(timeout);
    const source = Object.entries(map.getStyle().sources).find(
      ([, v]) => v.type === "vector",
    )?.[0];
    if (source && !map.getLayer("elsewhere-buildings")) {
      const before = map
        .getStyle()
        .layers.find((layer) => layer.type === "symbol")?.id;
      map.addLayer(
        {
          id: "elsewhere-buildings",
          type: "fill-extrusion",
          source,
          "source-layer": "building",
          minzoom: 14,
          paint: {
            "fill-extrusion-color": "#cac9bc",
            "fill-extrusion-height": [
              "coalesce",
              ["get", "render_height"],
              ["get", "height"],
              6,
            ],
            "fill-extrusion-base": [
              "coalesce",
              ["get", "render_min_height"],
              0,
            ],
            "fill-extrusion-opacity": 0.85,
          },
        },
        before,
      );
    }
    if (!failed)
      onStatus("Streets and buildings from OpenStreetMap · live map tiles");
  });
  return {
    resize: () => map.resize(),
    pullback: () =>
      map.flyTo({
        center,
        zoom: 15.4,
        pitch: 45,
        bearing: -25,
        duration: duration(),
      }),
    direct: () => {
      map.flyTo({
        center,
        zoom: 18,
        pitch: 58,
        bearing: -25,
        duration: duration(),
      });
      onStatus("At the listing map pin. Enter the separate inferred interior.");
    },
  };
}
