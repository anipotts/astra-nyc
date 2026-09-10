import { routeKey, routeRequest, validateRoute } from './route.js';
export async function acquireRoute(request, { signal, fetchFn = fetch } = {}) {
  const response = await fetchFn('/api/commute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(routeRequest(request)), signal });
  let data;
  try { data = await response.json(); } catch { throw new Error('Route service is not connected. Open external directions or try again later.'); }
  if (!response.ok) throw new Error(data.error || 'Route service is unavailable. Try again later.');
  return validateRoute(data, request);
}
export function createRouteController({ acquire = acquireRoute, onChange = () => {}, now = Date.now } = {}) {
  let generation = 0, active = null, destroyed = false;
  const cache = new Map();
  let state = { status: 'idle', route: null, error: null };
  const publish = (next) => { state = next; if (!destroyed) onChange(state); };
  function invalidate() { generation++; active?.abort(); active = null; publish({ status: 'idle', route: null, error: null }); }
  return {
    get state() { return state; }, invalidate,
    async request(value) {
      if (destroyed) return;
      invalidate();
      const token = generation;
      let request;
      try { request = routeRequest(value); } catch (e) { publish({ status: 'error', route: null, error: e.message }); return; }
      if (request.mode === 'transit') { publish({ status: 'external', route: null, error: null }); return; }
      const key = routeKey(request), saved = cache.get(key);
      if (saved && now() - saved.time < 30 * 60 * 1000) { publish({ status: 'ready', route: { ...saved.route, cached: true }, error: null }); return; }
      active = new AbortController();
      publish({ status: 'loading', route: null, error: null });
      try {
        const route = validateRoute(await acquire(request, { signal: active.signal }), request);
        if (destroyed || token !== generation) return;
        if (cache.size >= 32) cache.delete(cache.keys().next().value);
        cache.set(key, { time: now(), route });
        publish({ status: 'ready', route, error: null });
      } catch (error) {
        if (destroyed || token !== generation || error.name === 'AbortError') return;
        publish({ status: 'error', route: null, error: error.message });
      } finally { if (token === generation) active = null; }
    },
    destroy() { invalidate(); destroyed = true; cache.clear(); },
  };
}
