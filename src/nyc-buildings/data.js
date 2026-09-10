export const NYC_BUILDING_SOURCE = Object.freeze({
  title: "NYC OTI building footprints",
  endpoint: "https://services6.arcgis.com/yG5s3afENB5iO9fj/arcgis/rest/services/BUILDING_view/FeatureServer/0/query",
  metadata: "https://github.com/CityOfNewYork/nyc-geo-metadata/blob/main/Metadata/Metadata_BuildingFootprints.md",
  terms: "https://opendata.cityofnewyork.us/overview/#termsofuse",
  attribution: "Building footprints and roof heights: NYC Office of Technology and Innovation",
  description: "Official building footprints and recorded roof heights above ground. Neutral vertical massing; no roof shape, facade materials, interior, or surveyed site model is established. Individual feature dates vary.",
});

export const MAX_RADIUS_METERS = 400;
export const MAX_FEATURES = 2000;
export const BUILDING_FIELDS = Object.freeze([
  "DOITT_ID", "BIN", "HEIGHT_ROOF", "GROUND_ELEVATION", "GEOM_SOURCE",
  "FEATURE_CODE", "LAST_EDITED_DATE",
]);
// A request guard, not a borough boundary or proof that an address is in NYC.
const NYC_ENVELOPE = [-74.27, 40.47, -73.69, 40.93];
const validCoordinate = ([x, y] = []) => Number.isFinite(x) && Number.isFinite(y)
  && x >= NYC_ENVELOPE[0] && x <= NYC_ENVELOPE[2]
  && y >= NYC_ENVELOPE[1] && y <= NYC_ENVELOPE[3];

export function buildingRequest(location, { radiusMeters = MAX_RADIUS_METERS, limit = MAX_FEATURES } = {}) {
  const center = [location?.longitude, location?.latitude];
  if (!validCoordinate(center)) throw new RangeError("Location is outside the NYC building request extent.");
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) throw new RangeError("A positive request radius is required.");
  const radius = Math.min(MAX_RADIUS_METERS, radiusMeters);
  // Inscribe the query square in the radius: even its corners stay within 400 m.
  const halfSide = radius / Math.SQRT2;
  const dy = halfSide / 111320;
  const dx = halfSide / (111320 * Math.cos(center[1] * Math.PI / 180));
  const bounds = [center[0] - dx, center[1] - dy, center[0] + dx, center[1] + dy];
  const maxFeatures = Number.isInteger(limit) && limit > 0 ? Math.min(limit, MAX_FEATURES) : MAX_FEATURES;
  return { center, bounds, radiusMeters: radius, limit: maxFeatures };
}

export function buildingQueryUrl(request) {
  const url = new URL(NYC_BUILDING_SOURCE.endpoint);
  url.search = new URLSearchParams({
    geometry: request.bounds.join(","), geometryType: "esriGeometryEnvelope",
    spatialRel: "esriSpatialRelIntersects", inSR: "4326", outSR: "4326",
    outFields: BUILDING_FIELDS.join(","), returnGeometry: "true",
    resultRecordCount: String(request.limit), f: "geojson",
  }).toString();
  return url.href;
}

export function feetToMeters(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value * 0.3048 < 1000
    ? value * 0.3048 : null;
}

function validRing(ring) {
  if (!Array.isArray(ring) || ring.length < 4 || ring.length > 20000) return false;
  if (!ring.every(point => Array.isArray(point) && point.length === 2 && validCoordinate(point))) return false;
  const first = ring[0], last = ring.at(-1);
  if (first[0] !== last[0] || first[1] !== last[1]) return false;
  // Translate before computing area to avoid cancellation at longitude -74.
  const area = ring.slice(1).reduce((sum, point, i) => sum
    + (ring[i][0] - first[0]) * (point[1] - first[1])
    - (point[0] - first[0]) * (ring[i][1] - first[1]), 0);
  return Math.abs(area) > 1e-14;
}

function validGeometry(geometry) {
  const polygons = geometry?.type === "Polygon" ? [geometry.coordinates]
    : geometry?.type === "MultiPolygon" ? geometry.coordinates : null;
  return Array.isArray(polygons) && polygons.length > 0 && polygons.length <= 100
    && polygons.every(polygon => Array.isArray(polygon) && polygon.length > 0 && polygon.every(validRing));
}

function isoDate(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function boundsPolygon([west, south, east, north]) {
  return { type: "Polygon", coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] };
}

export function normalizeBuildings(payload, request, { fetchedAt = new Date().toISOString() } = {}) {
  if (payload?.error) throw new Error("NYC building service returned an error.");
  if (payload?.type !== "FeatureCollection" || !Array.isArray(payload.features)) throw new Error("NYC building service returned an invalid feature collection.");
  const crs = payload.crs?.properties?.name;
  if (crs && !/(:4326|\/4326|CRS84)$/i.test(crs)) throw new Error("NYC building coordinates are not geographic coordinates.");
  const counts = { received: payload.features.length, footprints: 0, extrusions: 0, unknownHeights: 0,
    flatStructures: 0, placeholders: 0, invalidGeometry: 0, invalidProperties: 0, duplicates: 0 };
  const features = [], seen = new Set();
  let vertexCount = 0, geometryLimited = false;
  for (const raw of payload.features.slice(0, request.limit)) {
    const p = raw?.properties;
    if (!p || !Number.isInteger(p.DOITT_ID) || p.DOITT_ID <= 0) { counts.invalidProperties++; continue; }
    // FEATURE_CODE is the actual placeholder field. Reject malformed legacy-like
    // GEOM_SOURCE=1003 too; it must never accidentally become a building prism.
    if (Number(p.FEATURE_CODE) === 1003 || String(p.GEOM_SOURCE).trim() === "1003") { counts.placeholders++; continue; }
    if (raw.type !== "Feature" || !validGeometry(raw.geometry)) { counts.invalidGeometry++; continue; }
    if (seen.has(p.DOITT_ID)) { counts.duplicates++; continue; }
    const polygons = raw.geometry.type === "Polygon" ? [raw.geometry.coordinates] : raw.geometry.coordinates;
    vertexCount += polygons.reduce((n, polygon) => n + polygon.reduce((m, ring) => m + ring.length, 0), 0);
    if (vertexCount > 150000) { geometryLimited = true; break; }
    seen.add(p.DOITT_ID);
    const roofMeters = feetToMeters(p.HEIGHT_ROOF);
    // Ground-to-roof prisms are appropriate for ordinary buildings and garages.
    // Skybridges, tanks, canopies and unfinished structures remain footprints.
    const extrudableType = [2100, 5110].includes(p.FEATURE_CODE);
    const heightMeters = extrudableType ? roofMeters : null;
    if (heightMeters !== null) counts.extrusions++;
    else if (roofMeters === null) counts.unknownHeights++;
    else counts.flatStructures++;
    features.push({ type: "Feature", id: p.DOITT_ID, geometry: raw.geometry, properties: {
      DOITT_ID: p.DOITT_ID, BIN: Number.isInteger(p.BIN) ? p.BIN : null,
      FEATURE_CODE: Number.isInteger(p.FEATURE_CODE) ? p.FEATURE_CODE : null,
      GEOM_SOURCE: typeof p.GEOM_SOURCE === "string" ? p.GEOM_SOURCE.slice(0, 80) : null,
      HEIGHT_ROOF: typeof p.HEIGHT_ROOF === "number" && Number.isFinite(p.HEIGHT_ROOF) ? p.HEIGHT_ROOF : null,
      GROUND_ELEVATION: typeof p.GROUND_ELEVATION === "number" && Number.isFinite(p.GROUND_ELEVATION) ? p.GROUND_ELEVATION : null,
      LAST_EDITED_DATE: typeof p.LAST_EDITED_DATE === "number" ? p.LAST_EDITED_DATE : null,
      lastEditedAt: isoDate(p.LAST_EDITED_DATE), roofMeters, heightMeters,
    } });
  }
  counts.footprints = features.length;
  // GeoJSON responses do not always include ArcGIS's transfer-limit flag.
  // Hitting the cap is conservatively marked truncated, without another query.
  const truncated = payload.exceededTransferLimit === true || payload.properties?.exceededTransferLimit === true
    || payload.features.length >= request.limit || geometryLimited;
  const dates = features.map(feature => feature.properties.lastEditedAt).filter(Boolean).sort();
  return { collection: { type: "FeatureCollection", features }, request,
    source: NYC_BUILDING_SOURCE, fetchedAt, cached: false, counts, truncated,
    oldestFeatureEditAt: dates[0] ?? null, newestFeatureEditAt: dates.at(-1) ?? null,
    completeQuery: !truncated && counts.invalidGeometry === 0 && counts.invalidProperties === 0 && counts.duplicates === 0,
  };
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    const cross = (x - xi) * (yj - yi) - (y - yi) * (xj - xi);
    if (Math.abs(cross) < 1e-13 && x >= Math.min(xi, xj) && x <= Math.max(xi, xj)
      && y >= Math.min(yi, yj) && y <= Math.max(yi, yj)) return true;
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function selectionCoverage(collection, center) {
  const matches = collection.features.filter(feature => {
    const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    return polygons.some(([outer, ...holes]) => pointInRing(center, outer) && !holes.some(hole => pointInRing(center, hole)));
  });
  return { kind: matches.length ? "point-within-footprint" : collection.features.length ? "nearby-only" : "none",
    doittIds: matches.map(feature => feature.properties.DOITT_ID),
    extrudedDoittIds: matches.filter(feature => feature.properties.heightMeters !== null).map(feature => feature.properties.DOITT_ID) };
}

// Apply only to the existing OSM extrusion layer, never to the entire map.
// Boundary-crossing OSM polygons are retained rather than clipped or invented.
export function outsideOfficialCoverageFilter(originalFilter, coverage) {
  if (!coverage) return originalFilter;
  const outside = ["!", ["within", coverage.geometry]];
  return originalFilter ? ["all", originalFilter, outside] : outside;
}
