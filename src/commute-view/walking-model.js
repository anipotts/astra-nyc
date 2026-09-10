const EARTH = 6371008.8;
const radians = degrees => degrees * Math.PI / 180;
const degrees = value => value * 180 / Math.PI;
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function metersBetween(a, b) {
  const lat = radians(b[1] - a[1]), lon = radians(b[0] - a[0]);
  const h = Math.sin(lat / 2) ** 2 + Math.cos(radians(a[1])) * Math.cos(radians(b[1])) * Math.sin(lon / 2) ** 2;
  return 2 * EARTH * Math.asin(Math.sqrt(clamp(h, 0, 1)));
}
export function bearingBetween(a, b) {
  const lon = radians(b[0] - a[0]), lat1 = radians(a[1]), lat2 = radians(b[1]);
  return (degrees(Math.atan2(Math.sin(lon) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon))) + 360) % 360;
}
export function offsetPoint(point, bearing, meters) {
  const angular = meters / EARTH, heading = radians(bearing), lat = radians(point[1]), lon = radians(point[0]);
  const nextLat = Math.asin(Math.sin(lat) * Math.cos(angular) + Math.cos(lat) * Math.sin(angular) * Math.cos(heading));
  return [degrees(lon + Math.atan2(Math.sin(heading) * Math.sin(angular) * Math.cos(lat), Math.cos(angular) - Math.sin(lat) * Math.sin(nextLat))), degrees(nextLat)];
}
export function walkingAvailability(route) {
  if (!route || route.mode !== 'walking') return 'First-person exploration is available for walking routes.';
  if (route.steps?.some(step => step.mode === 'ferry')) return 'This route includes a ferry. Use the map overview and check its schedule.';
  if (route.geometry?.type !== 'LineString' || route.geometry.coordinates?.length < 2) return 'Walking route geometry is unavailable.';
  return null;
}
export function createWalkingPath(route) {
  const unavailable = walkingAvailability(route);
  if (unavailable) throw new Error(unavailable);
  const points = route.geometry.coordinates;
  if (points.length > 100000 || !points.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90)) throw new Error('Invalid walking coordinates.');
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + metersBetween(points[i - 1], points[i]));
  const length = cumulative.at(-1);
  if (length < .5) throw new Error('The route is too short to explore.');
  // Segment positions come from provider distances; movement uses actual geometry.
  const segmentTotal = route.steps.reduce((sum, step) => sum + step.distance, 0);
  let segmentDistance = 0;
  const stops = route.steps.map((step, index) => {
    const stop = { index, distance: segmentTotal > 0 ? segmentDistance / segmentTotal * length : 0, step };
    segmentDistance += step.distance;
    return stop;
  });
  function at(value) {
    const distance = clamp(Number.isFinite(value) ? value : 0, 0, length);
    let low = 1, high = points.length - 1;
    while (low < high) { const mid = (low + high) >> 1; if (cumulative[mid] < distance) low = mid + 1; else high = mid; }
    let end = low;
    while (end < points.length - 1 && cumulative[end] === cumulative[end - 1]) end++;
    const start = end - 1, span = cumulative[end] - cumulative[start];
    const ratio = span > 0 ? clamp((distance - cumulative[start]) / span, 0, 1) : 0;
    const coordinate = points[start].map((value, axis) => value + (points[end][axis] - value) * ratio);
    const segment = stops.findLast(stop => stop.distance <= distance + .01) || stops[0];
    return { coordinate, bearing: bearingBetween(points[start], points[end]), distance, fraction: distance / length, length, stepIndex: segment?.index ?? 0, step: segment?.step ?? null, arrived: distance >= length - .05 };
  }
  return { length, points, at, nextStop(distance, direction = 1) {
    return direction > 0 ? stops.find(stop => stop.distance > distance + 1)?.distance ?? length : [...stops].reverse().find(stop => stop.distance < distance - 1)?.distance ?? 0;
  } };
}
