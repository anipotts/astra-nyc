import { createWalkingSession } from './walking-session.js';
const empty = () => ({ type: 'FeatureCollection', features: [] });
const feature = geometry => ({ type: 'Feature', properties: {}, geometry });
// MapLibre owns the geospatial projection: route coordinates never become screen pixels.
export function createCommuteMapLayer(map, { reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches, padding = 72 } = {}) {
  const ids = ['commute-route-halo', 'commute-route-line', 'commute-highlight-line', 'commute-highlight-point'];
  let route = null, step = null, walking = null, destroyed = false, ready = map.isStyleLoaded();
  function endWalk(options) { const session = walking; walking = null; session?.end(options); }
  function ensure() {
    if (destroyed || !ready) return;
    for (const id of ['commute-route', 'commute-highlight']) if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: empty() });
    if (!map.getLayer(ids[0])) map.addLayer({ id: ids[0], type: 'line', source: 'commute-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fffdf3', 'line-width': 10, 'line-opacity': .95 } });
    if (!map.getLayer(ids[1])) map.addLayer({ id: ids[1], type: 'line', source: 'commute-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#1e5841', 'line-width': 5 } });
    if (!map.getLayer(ids[2])) map.addLayer({ id: ids[2], type: 'line', source: 'commute-highlight', filter: ['==', '$type', 'LineString'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#a65d2b', 'line-width': 7, 'line-width-transition': { duration: 0 } } });
    if (!map.getLayer(ids[3])) map.addLayer({ id: ids[3], type: 'circle', source: 'commute-highlight', filter: ['==', '$type', 'Point'], paint: { 'circle-radius': 7, 'circle-radius-transition': { duration: 0 }, 'circle-color': '#a65d2b', 'circle-stroke-width': 3, 'circle-stroke-color': '#fffdf3' } });
    map.getSource('commute-route').setData(route ? feature(route.geometry) : empty());
    map.getSource('commute-highlight').setData(step ? { type: 'FeatureCollection', features: [feature(step.geometry), feature({ type: 'Point', coordinates: step.coordinate })] } : empty());
  }
  const onStyleLoad = () => { ready = true; ensure(); };
  map.on('style.load', onStyleLoad);
  ensure();
  return {
    setRoute(value) { if (!value || value.key !== route?.key) endWalk({ restore: false }); route = value; step = null; ensure(); },
    beginWalk(options = {}) {
      if (destroyed || !ready || !route) return false;
      endWalk();
      walking = createWalkingSession(map, route, { ...options, reducedMotion, onExit() { walking = null; options.onExit?.(); } });
      return true;
    },
    endWalk,
    walkAction(action) { walking?.action(action); },
    seekWalk(fraction) { walking?.seek(fraction); },
    highlight(value) { step = value; ensure(); },
    fit({ bounds, duration = 500 }) { if (!destroyed) { endWalk(); map.stop(); map.fitBounds(bounds, { padding: typeof padding === 'function' ? padding() : padding, maxZoom: 16.5, pitch: 35, duration: reducedMotion() ? 0 : Math.min(duration, 650) }); } },
    stop() { if (!destroyed) { walking?.pause(); map.stop(); } },
    destroy() { endWalk({ restore: false }); map.stop(); map.off('style.load', onStyleLoad); for (const id of [...ids].reverse()) if (map.getLayer(id)) map.removeLayer(id); for (const id of ['commute-highlight', 'commute-route']) if (map.getSource(id)) map.removeSource(id); destroyed = true; },
  };
}
