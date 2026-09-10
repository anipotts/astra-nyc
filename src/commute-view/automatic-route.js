import { createRouteController } from './controller.js';
import { routeKey } from './route.js';

// View events set resolved route intent; typing supplies destination:null.
// The controller still owns validation, cache and stale-response guards.
export function createAutomaticRoute({ delayMs = 180, schedule = setTimeout, cancel = clearTimeout, ...options } = {}) {
  const controller = createRouteController(options);
  let timer = null, intent = null, identity = null, generation = 0, destroyed = false;
  function clear() {
    generation++;
    if (timer !== null) cancel(timer);
    timer = null;
    controller.invalidate();
  }
  function enqueue() {
    const token = generation, request = intent;
    timer = schedule(() => {
      timer = null;
      if (!destroyed && token === generation) void controller.request(request);
    }, delayMs);
  }
  return {
    get state() { return controller.state; },
    update({ active, listingId, origin, destination, mode }) {
      if (destroyed) return false;
      let request = null;
      // Transit has no provider adapter; the view shows its external link immediately.
      if (active && listingId && origin && destination && mode !== 'transit') request = { origin, destination, mode };
      const next = request ? JSON.stringify([listingId, routeKey(request)]) : JSON.stringify([Boolean(active), listingId, mode, null]);
      if (next === identity) return false;
      identity = next;
      intent = request;
      clear();
      if (intent) enqueue();
      return true;
    },
    retry() {
      if (destroyed || !intent || controller.state.status !== 'error') return;
      clear();
      enqueue();
    },
    destroy() { clear(); destroyed = true; intent = null; controller.destroy(); },
  };
}
