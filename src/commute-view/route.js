import { validateLocation } from '../location.js';

export const MODES = Object.freeze({ walking: 'Walk', bicycling: 'Bike', transit: 'Transit', driving: 'Drive' });
export const DEMO_DESTINATION = Object.freeze({
  id: 'osm:way:166839381', label: '3 World Trade Center, 175 Greenwich Street, New York',
  longitude: -74.0116426, latitude: 40.711006,
  source: 'https://www.openstreetmap.org/way/166839381',
  observedAt: '2026-09-10T18:41:10.000Z', precision: 'approximate',
});
export const PROVIDER = Object.freeze({
  name: 'FOSSGIS / OSRM', url: 'https://routing.openstreetmap.de/about.html',
  copyright: 'https://www.openstreetmap.org/copyright', fix: 'https://www.openstreetmap.org/fixthemap',
});
export function routeRequest(value) {
  if (!value || !Object.hasOwn(MODES, value.mode)) throw new Error('Choose a supported travel mode.');
  const origin = validateLocation(value.origin), destination = validateLocation(value.destination);
  if (!origin || !destination) throw new Error('Resolve both public locations before previewing a route.');
  return { origin, destination, mode: value.mode };
}
export function routeKey(value) {
  const { origin, destination, mode } = routeRequest(value);
  return JSON.stringify([origin.id, origin.longitude, origin.latitude, destination.id, destination.longitude, destination.latitude, mode]);
}
export function externalDirections(origin, destination, mode) {
  if (!origin || !destination?.trim() || !Object.hasOwn(MODES, mode)) return null;
  return 'https://www.google.com/maps/dir/?' + new URLSearchParams({ api: '1', origin, destination: destination.trim(), travelmode: mode });
}
const point = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && p[0] >= -180 && p[0] <= 180 && p[1] >= -90 && p[1] <= 90;
const metric = (n) => Number.isFinite(n) && n >= 0;
function line(g) {
  return g?.type === 'LineString' && Array.isArray(g.coordinates) && g.coordinates.length >= 2 && g.coordinates.length <= 100000 && g.coordinates.every(point);
}
export function normalizeRoute(payload, request, { observedAt = new Date().toISOString(), latencyMs = 0 } = {}) {
  request = routeRequest(request);
  if (request.mode === 'transit') throw new Error('Transit itineraries are available through the external directions link.');
  const raw = payload?.routes?.[0];
  if (payload?.code !== 'Ok' || !raw) throw new Error('No route returned for this mode. Try another mode or external directions.');
  if (!line(raw.geometry) || !metric(raw.duration) || !metric(raw.distance) || !Array.isArray(raw.legs) || raw.legs.length !== 1) throw new Error('The route provider returned incomplete route evidence.');
  const waypoints = payload.waypoints;
  if (!Array.isArray(waypoints) || waypoints.length !== 2 || !waypoints.every(w => point(w.location) && metric(w.distance) && w.distance <= 250)) throw new Error('The provider could not connect close enough to both selected buildings.');
  // Provider geometry may leave the city for a valid bridge crossing; do not clip it.
  const steps = raw.legs.flatMap(l => l.steps ?? []).map((step, index) => {
    if (!line(step.geometry) || !metric(step.distance) || !metric(step.duration) || !point(step.maneuver?.location)) throw new Error('Route segment evidence was incomplete.');
    const clean = (s) => typeof s === 'string' ? s.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 180) : '';
    return { index, name: clean(step.name) || 'Unnamed segment', type: clean(step.maneuver.type), modifier: clean(step.maneuver.modifier),
      mode: clean(step.mode), distance: step.distance, duration: step.duration, coordinate: step.maneuver.location, geometry: step.geometry };
  });
  if (!steps.length || steps.length > 2000) throw new Error('No usable route segments returned.');
  const coords = raw.geometry.coordinates;
  const bounds = coords.reduce((b, p) => [[Math.min(b[0][0], p[0]), Math.min(b[0][1], p[1])], [Math.max(b[1][0], p[0]), Math.max(b[1][1], p[1])]], [[180,90],[-180,-90]]);
  return { key: routeKey(request), mode: request.mode, origin: request.origin, destination: request.destination,
    geometry: raw.geometry, distance: raw.distance, duration: raw.duration, steps, bounds,
    snapped: waypoints.map(w => ({ coordinate: w.location, distance: w.distance })),
    provider: PROVIDER, observedAt, dataVersion: typeof payload.data_version === 'string' ? payload.data_version.slice(0,80) : null,
    latencyMs, cached: false, traffic: false };
}
export function validateRoute(result, request) {
  if (result?.key !== routeKey(request) || result.mode !== request.mode || !line(result.geometry) || !metric(result.distance) || !metric(result.duration) || !Number.isFinite(Date.parse(result.observedAt)) || !Array.isArray(result.steps) || !result.steps.length || result.steps.length > 2000 || !result.steps.every(s => line(s.geometry) && point(s.coordinate) && metric(s.distance) && metric(s.duration)) || !Array.isArray(result.bounds) || result.bounds.length !== 2 || !result.bounds.every(point)) throw new Error('Route response does not match these locations and mode.');
  return { ...result, provider: PROVIDER, traffic: false };
}
export const formatDuration = (seconds) => { const minutes = Math.max(1, Math.round(seconds / 60)); return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} hr ${minutes % 60} min`; };
export const formatDistance = (meters) => meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
export function stepLabel(step) {
  const action = step.type === 'depart' ? 'Start' : step.type === 'arrive' ? 'Arrive' : [step.type?.replaceAll('_', ' '), step.modifier].filter(Boolean).join(' ');
  return `${action ? action[0].toUpperCase() + action.slice(1) : 'Continue'} · ${step.name}`;
}
