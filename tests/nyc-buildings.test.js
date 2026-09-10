import test from "node:test";
import assert from "node:assert/strict";
import { buildingRequest, buildingQueryUrl, normalizeBuildings, feetToMeters,
  selectionCoverage, outsideOfficialCoverageFilter, boundsPolygon } from "../src/nyc-buildings/data.js";
import { createNycBuildingClient } from "../src/nyc-buildings/client.js";
import { createNycBuildingOverlay } from "../src/nyc-buildings/index.js";
import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec";

// Synthetic provider responses are regression inputs, never a runtime fallback.
const location = { longitude: -74.008, latitude: 40.706 };
const selection = { listingId: "unit-a", location };
const ring = [[-74.0081, 40.7059], [-74.0079, 40.7059], [-74.0079, 40.7061], [-74.0081, 40.7061], [-74.0081, 40.7059]];
const feature = (properties = {}, geometry = { type: "Polygon", coordinates: [ring] }) => ({
  type: "Feature", geometry, properties: { DOITT_ID: 10, BIN: 1000010, FEATURE_CODE: 2100,
    HEIGHT_ROOF: 100, GROUND_ELEVATION: 30, GEOM_SOURCE: "Photogrammetric", LAST_EDITED_DATE: 1700000000000, ...properties },
});
const payload = (features = [feature()]) => ({ type: "FeatureCollection", features });
const normalize = (body = payload(), options) => normalizeBuildings(body, buildingRequest(location), options);
const response = body => new Response(JSON.stringify(body), { headers: { "content-type": "application/geo+json" } });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

function mockMap({ loaded = true } = {}) {
  const sources = new Map(), layers = new Map(), events = new Map();
  return {
    sources, layers, loaded,
    isStyleLoaded() { return this.loaded; },
    getStyle: () => ({ layers: [...layers.values()] }),
    getSource: id => sources.get(id),
    getLayer: id => layers.get(id),
    addSource(id, value) { sources.set(id, { ...value, setData(data) { this.data = data; } }); },
    addLayer(layer) { layers.set(layer.id, layer); },
    removeLayer: id => layers.delete(id), removeSource: id => sources.delete(id),
    on(name, listener) { events.set(name, listener); },
    off(name, listener) { if (events.get(name) === listener) events.delete(name); },
    fire(name) { events.get(name)?.(); },
  };
}

test("request extent is bounded to a 400 m circumradius, capped at 2000 and only asks for needed fields", () => {
  const request = buildingRequest(location, { radiusMeters: 10000, limit: 10000 });
  assert.equal(request.radiusMeters, 400); assert.equal(request.limit, 2000);
  const [w, s, e, n] = request.bounds;
  const x = (e - w) / 2 * 111320 * Math.cos(location.latitude * Math.PI / 180);
  const y = (n - s) / 2 * 111320;
  assert.ok(Math.abs(Math.hypot(x, y) - 400) < 1e-6);
  const params = new URL(buildingQueryUrl(request)).searchParams;
  assert.equal(params.get("inSR"), "4326"); assert.equal(params.get("outSR"), "4326");
  assert.equal(params.get("f"), "geojson"); assert.equal(params.get("resultRecordCount"), "2000");
  assert.match(params.get("outFields"), /FEATURE_CODE/); assert.ok(!params.get("outFields").includes("*"));
  for (const bad of [null, { longitude: -118, latitude: 34 }, { longitude: "-74", latitude: 40.7 }, { longitude: NaN, latitude: 40.7 }]) assert.throws(() => buildingRequest(bad));
  assert.throws(() => buildingRequest(location, { radiusMeters: -1 }));
});

test("roof height converts feet above ground directly and retains source dates and ground elevation", () => {
  const result = normalize(); const props = result.collection.features[0].properties;
  assert.equal(props.heightMeters, 30.48); assert.equal(props.GROUND_ELEVATION, 30);
  assert.equal(props.roofMeters, 30.48); // Must not subtract 30 ft of ground elevation.
  assert.equal(props.lastEditedAt, new Date(1700000000000).toISOString());
  assert.equal(result.oldestFeatureEditAt, props.lastEditedAt);
  assert.equal(result.counts.extrusions, 1);
  for (const bad of [null, undefined, 0, -1, "100", NaN, Infinity, 4000]) assert.equal(feetToMeters(bad), null);
});

test("placeholders never render; missing heights and skybridges remain flat", () => {
  const result = normalize(payload([
    feature({ DOITT_ID: 1, FEATURE_CODE: 1003 }), feature({ DOITT_ID: 2, GEOM_SOURCE: 1003 }),
    feature({ DOITT_ID: 3, HEIGHT_ROOF: null }), feature({ DOITT_ID: 4, HEIGHT_ROOF: 0 }),
    feature({ DOITT_ID: 5, FEATURE_CODE: 2110 }), feature({ DOITT_ID: 6, FEATURE_CODE: 5110 }),
  ]));
  assert.deepEqual(result.collection.features.map(f => f.id), [3, 4, 5, 6]);
  assert.deepEqual(result.collection.features.map(f => f.properties.heightMeters), [null, null, null, 30.48]);
  assert.equal(result.counts.placeholders, 2); assert.equal(result.counts.extrusions, 1);
  assert.equal(result.counts.unknownHeights, 2); assert.equal(result.counts.flatStructures, 1);
});

test("malformed geometry, non-geographic coordinates, invalid IDs and duplicates cannot authorize coverage", () => {
  const result = normalize(payload([
    feature({ DOITT_ID: 1 }, { type: "Point", coordinates: location }),
    feature({ DOITT_ID: 2 }, { type: "Polygon", coordinates: [ring.slice(0, -1)] }),
    feature({ DOITT_ID: 3 }, { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }),
    feature({ DOITT_ID: "4" }), feature({ DOITT_ID: 5 }), feature({ DOITT_ID: 5 }),
  ]));
  assert.equal(result.counts.invalidGeometry, 3); assert.equal(result.counts.invalidProperties, 1);
  assert.equal(result.counts.duplicates, 1); assert.equal(result.counts.footprints, 1);
  assert.equal(result.completeQuery, false);
  assert.throws(() => normalize({ ...payload(), crs: { properties: { name: "EPSG:3857" } } }));
  assert.throws(() => normalize({ error: { message: "No service" } }));
});

test("point coverage handles multipolygons and holes without treating proximity as identity", () => {
  const outer = ring.map(([x, y]) => [location.longitude + (x - location.longitude) * 2, location.latitude + (y - location.latitude) * 2]);
  const inHole = normalize(payload([feature({}, { type: "MultiPolygon", coordinates: [[outer, ring]] })]));
  assert.equal(selectionCoverage(inHole.collection, [-74.008, 40.706]).kind, "nearby-only");
  assert.equal(selectionCoverage(inHole.collection, [-74.00815, 40.706]).kind, "point-within-footprint");
  assert.deepEqual(selectionCoverage(normalize().collection, [-74.008, 40.706]).doittIds, [10]);
  assert.equal(selectionCoverage(payload([]), [-74.008, 40.706]).kind, "none");
});

test("the server cap and transfer-limit flags are reported as truncation", () => {
  const request = buildingRequest(location, { limit: 1 });
  assert.equal(normalizeBuildings(payload(), request).truncated, true);
  assert.equal(normalize({ ...payload(), exceededTransferLimit: true }).completeQuery, false);
  assert.equal(normalize({ ...payload(), properties: { exceededTransferLimit: true } }).truncated, true);
});

test("client cache preserves acquisition and feature timestamps, expires and refreshes without secret credentials", async () => {
  let calls = 0, now = 1800000000000, options;
  const client = createNycBuildingClient({ now: () => now, cacheTtlMs: 100, fetchFn: async (_, opts) => { calls++; options = opts; return response(payload()); } });
  const first = await client.load(location), replay = await client.load(location);
  assert.equal(calls, 1); assert.equal(first.cached, false); assert.equal(replay.cached, true);
  assert.equal(first.fetchedAt, replay.fetchedAt); assert.equal(options.credentials, "omit");
  now += 101; const newer = await client.load(location); assert.equal(calls, 2); assert.notEqual(first.fetchedAt, newer.fetchedAt);
  await client.load(location, { refresh: true }); assert.equal(calls, 3);
  client.clear(); await client.load(location); assert.equal(calls, 4);
});

test("client bounds cache size and rejects HTML, large bodies and hung or aborted acquisition", async () => {
  let calls = 0;
  const client = createNycBuildingClient({ maxCacheEntries: 1, fetchFn: async () => { calls++; return response(payload()); } });
  await client.load(location); await client.load({ ...location, longitude: -74.009 }); await client.load(location);
  assert.equal(calls, 3);
  await assert.rejects(createNycBuildingClient({ fetchFn: async () => new Response("html") }).load(location), /unsupported/);
  await assert.rejects(createNycBuildingClient({ maxBytes: 20, fetchFn: async () => response(payload()) }).load(location), /size limit/);
  let signal;
  const hung = createNycBuildingClient({ timeoutMs: 5, fetchFn: (_, options) => { signal = options.signal; return new Promise(() => {}); } });
  await assert.rejects(hung.load(location), /timed out/); assert.equal(signal.aborted, true);
  const abort = new AbortController(); const work = hung.load(location, { signal: abort.signal }); abort.abort();
  await assert.rejects(work, { name: "AbortError" });
});

test("overlay mounts official metre heights, clears immediately on identity changes and restores base on failure", async () => {
  const map = mockMap(), changes = [], statuses = [];
  let failure = false;
  const layer = createNycBuildingOverlay(map, { onCoverageChange: c => changes.push(c), onStatus: s => statuses.push(s),
    client: { load: async () => { if (failure) throw new Error("offline"); return normalize(); } } });
  await layer.update(selection);
  assert.equal(layer.getState().phase, "ready"); assert.ok(changes.at(-1));
  assert.equal(map.sources.get("elsewhere-nyc-buildings").data.features[0].properties.heightMeters, 30.48);
  assert.equal(map.layers.get("elsewhere-nyc-massing").paint["fill-extrusion-base"], 0);
  failure = true; const work = layer.update({ ...selection, listingId: "unit-b" });
  assert.equal(map.sources.get("elsewhere-nyc-buildings").data.features.length, 0); assert.equal(changes.at(-1), null);
  await work; assert.equal(layer.getState().phase, "error"); assert.equal(changes.at(-1), null);
  layer.destroy(); assert.equal(map.sources.size, 0); assert.equal(map.layers.size, 0);
});

test("stale responses and destroyed overlay cannot update geometry or callbacks even if fetch ignores abort", async () => {
  const map = mockMap(), calls = [], changes = [];
  const layer = createNycBuildingOverlay(map, { onStatus: s => changes.push(s), client: { load: (_, options) => {
    const work = deferred(); calls.push({ ...work, signal: options.signal }); return work.promise;
  } } });
  const first = layer.update(selection);
  const second = layer.update({ ...selection, listingId: "unit-b" });
  assert.equal(calls[0].signal.aborted, true);
  calls[1].resolve(normalize()); await second;
  calls[0].resolve(normalize(payload([feature({ DOITT_ID: 100 })]))); await first;
  assert.equal(layer.getState().listingId, "unit-b");
  assert.equal(map.sources.get("elsewhere-nyc-buildings").data.features[0].id, 10);
  const third = layer.update({ ...selection, listingId: "unit-c" }); layer.destroy();
  const count = changes.length; calls[2].resolve(normalize()); await third; map.fire("style.load");
  assert.equal(changes.length, count); assert.equal(map.sources.size, 0); assert.equal(calls[2].signal.aborted, true);
});

test("style readiness and reload preserve data; repeated same selection avoids another fetch", async () => {
  const map = mockMap({ loaded: false }); let calls = 0;
  const layer = createNycBuildingOverlay(map, { client: { load: async () => { calls++; return normalize(); } } });
  await layer.update(selection); assert.equal(layer.getState().rendered, false);
  map.loaded = true; map.fire("style.load"); assert.equal(map.sources.size, 1);
  await layer.update(selection); assert.equal(calls, 1);
  map.loaded = false; await layer.update({ ...selection, listingId: "unit-b" });
  assert.equal(layer.getState().rendered, true); // A worker refresh does not unload the style.
  map.sources.clear(); map.layers.clear(); map.loaded = true; map.fire("style.load");
  assert.equal(map.sources.get("elsewhere-nyc-buildings").data.features.length, 1);
  layer.destroy();
});

test("partial and empty queries never hide the base map; unresolved selection never fetches", async () => {
  const map = mockMap(), changes = []; let calls = 0;
  const layer = createNycBuildingOverlay(map, { onCoverageChange: c => changes.push(c),
    client: { load: async () => { calls++; return normalize({ ...payload(), exceededTransferLimit: true }); } } });
  await layer.update({ listingId: "unknown", location: null }); assert.equal(calls, 0); assert.equal(layer.getState().phase, "unavailable");
  await layer.update(selection); assert.equal(layer.getState().phase, "partial"); assert.equal(changes.at(-1), null);
  layer.destroy();
  const emptyLayer = createNycBuildingOverlay(mockMap(), { onCoverageChange: c => changes.push(c), client: { load: async () => normalize(payload([])) } });
  await emptyLayer.update(selection); assert.equal(emptyLayer.getState().phase, "unavailable"); assert.equal(changes.at(-1), null);
  emptyLayer.destroy();
  const original = [">", ["get", "render_height"], 5];
  assert.equal(outsideOfficialCoverageFilter(original, null), original);
  const filter = outsideOfficialCoverageFilter(original, { geometry: boundsPolygon(buildingRequest(location).bounds) });
  assert.deepEqual(filter.slice(0, 2), ["all", original]); assert.equal(filter[2][0], "!"); assert.equal(filter[2][1][0], "within");
});

test("official layers and bounded base exclusion validate against the installed MapLibre style specification", async () => {
  const map = mockMap(); let coverage;
  const layer = createNycBuildingOverlay(map, { onCoverageChange: c => { coverage = c; }, client: { load: async () => normalize() } });
  await layer.update(selection);
  const sources = Object.fromEntries([...map.sources].map(([id, value]) => [id, { type: value.type, data: value.data }]));
  const layers = [...map.layers.values(), { id: "osm-massing", type: "fill-extrusion", source: "osm", "source-layer": "building",
    filter: outsideOfficialCoverageFilter([">", ["number", ["get", "render_height"], 0], 5], coverage) }];
  const style = { version: 8, sources: { ...sources, osm: { type: "vector", tiles: ["https://tiles.example/{z}/{x}/{y}.pbf"] } }, layers };
  assert.deepEqual(validateStyleMin(style), []);
  layer.destroy();
});
