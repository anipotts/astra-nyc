import { createNycBuildingClient } from "./client.js";
import { NYC_BUILDING_SOURCE, buildingRequest, boundsPolygon, selectionCoverage } from "./data.js";
export { NYC_BUILDING_SOURCE, outsideOfficialCoverageFilter } from "./data.js";
export { createNycBuildingClient } from "./client.js";

const empty = () => ({ type: "FeatureCollection", features: [] });
const SOURCE_ID = "elsewhere-nyc-buildings";
const LAYER_IDS = ["elsewhere-nyc-footprints", "elsewhere-nyc-massing"];
const height = ["number", ["get", "heightMeters"], 0];

export function getBuildingLayerAnchor(map, requestedBefore = null) {
  const layers = map.getStyle().layers ?? [];
  // Ground labels and road arrows must be painted before solid building volumes.
  // Keep place/POI labels and explicit overlays after the building volumes.
  const groundSources = new Set(["transportation", "transportation_name", "housenumber"]);
  const lastGround = layers.findLastIndex(layer => groundSources.has(layer["source-layer"]));
  return layers.find((layer, index) => index > lastGround && !LAYER_IDS.includes(layer.id)
    && (layer.id === requestedBefore || (layer.type === "symbol" && !groundSources.has(layer["source-layer"]))))?.id;
}

export function createNycBuildingOverlay(map, { client = createNycBuildingClient(),
  onStatus = () => {}, onCoverageChange = () => {}, beforeLayerId = null,
  radiusMeters = 400, initialStyleReady = map.isStyleLoaded() } = {}) {
  let destroyed = false, sequence = 0, controller = null, key = null;
  let styleReady = initialStyleReady;
  let data = null, lastSelection = null, pending = null;
  let state = { phase: "idle", listingId: null, source: NYC_BUILDING_SOURCE, rendered: false };
  const emit = patch => {
    if (destroyed) return;
    state = { ...state, ...patch }; onStatus(state);
  };
  const reportCoverage = () => {
    if (destroyed) return;
    onCoverageChange(data?.completeQuery && data.counts.footprints > 0 && state.rendered ? {
      bounds: [...data.request.bounds], geometry: boundsPolygon(data.request.bounds),
      fetchedAt: data.fetchedAt, featureCount: data.counts.footprints,
    } : null);
  };
  function render() {
    // isStyleLoaded() can briefly become false while GeoJSON workers update.
    // The style.load event, rather than each source update, owns readiness.
    if (destroyed || !styleReady) return false;
    if (!map.getSource(SOURCE_ID)) map.addSource(SOURCE_ID, {
      // The full NYC credit and acquisition details live in Sources & details.
      type: "geojson", data: empty(),
    });
    const requestedBefore = typeof beforeLayerId === "function" ? beforeLayerId() : beforeLayerId;
    const before = getBuildingLayerAnchor(map, requestedBefore);
    if (!map.getLayer(LAYER_IDS[0])) map.addLayer({
      id: LAYER_IDS[0], type: "fill", source: SOURCE_ID, minzoom: 14,
      paint: { "fill-color": "#cac9bc", "fill-opacity": 0.9, "fill-outline-color": "#aaa99e" },
    }, before);
    if (!map.getLayer(LAYER_IDS[1])) map.addLayer({
      id: LAYER_IDS[1], type: "fill-extrusion", source: SOURCE_ID, minzoom: 14,
      filter: [">", height, 0],
      paint: { "fill-extrusion-height": height, "fill-extrusion-base": 0,
        "fill-extrusion-color": ["interpolate", ["linear"], height,
          0, "#d7dcd5", 35, "#bbc7bc", 150, "#92a89d", 400, "#7f9991"],
        "fill-extrusion-opacity": 1, "fill-extrusion-vertical-gradient": true },
    }, before);
    // Also repair an existing layer pair after a style reload or changed anchor.
    for (const id of LAYER_IDS) map.moveLayer?.(id, before);
    map.getSource(SOURCE_ID).setData(data?.collection ?? empty());
    return true;
  }
  const clear = () => {
    data = null;
    if (map.getSource(SOURCE_ID)) map.getSource(SOURCE_ID).setData(empty());
    onCoverageChange(null);
  };
  const onStyleLoad = () => {
    if (destroyed) return;
    styleReady = true;
    try { emit({ rendered: render() && Boolean(data) }); reportCoverage(); }
    catch { clear(); emit({ phase: "error", rendered: false, error: "NYC building overlay could not be rendered. The base map remains available." }); }
  };
  map.on("style.load", onStyleLoad);

  async function update(selection, { refresh = false } = {}) {
    if (destroyed) return state;
    const listingId = typeof selection?.listingId === "string" ? selection.listingId : null;
    let request;
    try { request = listingId ? buildingRequest(selection.location, { radiusMeters }) : null; }
    catch { request = null; }
    const nextKey = JSON.stringify([listingId, request?.center ?? null, request?.radiusMeters ?? null]);
    if (nextKey === key && !refresh) return pending ?? state;
    key = nextKey; lastSelection = selection;
    const version = ++sequence;
    controller?.abort(); controller = null;
    // Remove both official geometry and its OSM exclusion before new acquisition.
    clear();
    state = { phase: request ? "loading" : listingId ? "unavailable" : "idle",
      listingId, source: NYC_BUILDING_SOURCE, rendered: false, request,
      error: request || !listingId ? null : "Resolve a location in the NYC request extent to load official buildings." };
    emit({});
    if (!request) return state;
    controller = new AbortController();
    const signal = controller.signal;
    const work = (async () => {
      try {
        const result = await client.load(selection.location, { signal, radiusMeters, refresh });
        if (destroyed || sequence !== version || signal.aborted) return state;
        data = result;
        const selected = selectionCoverage(data.collection, request.center);
        const rendered = render();
        emit({ phase: data.counts.footprints === 0 ? "unavailable" : data.completeQuery ? "ready" : "partial",
          counts: data.counts, truncated: data.truncated, cached: data.cached,
          fetchedAt: data.fetchedAt, oldestFeatureEditAt: data.oldestFeatureEditAt,
          newestFeatureEditAt: data.newestFeatureEditAt, selected, rendered, error: null });
        reportCoverage();
      } catch (error) {
        if (destroyed || sequence !== version || signal.aborted) return state;
        clear();
        emit({ phase: "error", rendered: false, error: error?.message || "NYC building data is unavailable." });
      }
      return state;
    })();
    pending = work;
    try { return await work; }
    finally { if (sequence === version) pending = null; }
  }
  return {
    update,
    retry: () => update(lastSelection, { refresh: true }),
    getState: () => state,
    destroy() {
      if (destroyed) return;
      clear(); // One final synchronous restoration; no callbacks after destroy.
      destroyed = true; sequence++; controller?.abort(); controller = null;
      map.off("style.load", onStyleLoad);
      for (const id of [...LAYER_IDS].reverse()) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      state = { phase: "destroyed", listingId: null, source: NYC_BUILDING_SOURCE, rendered: false };
    },
  };
}
