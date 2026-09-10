// Motion decorates already available results. It never gates data or interaction.
const media = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');

export function createResultReveal(element, { preference = media() } = {}) {
  let animation = null, identity = null;
  const cancel = () => { animation?.cancel(); animation = null; };
  const onPreference = () => { if (preference.matches) cancel(); };
  preference?.addEventListener('change', onPreference);
  return {
    show(key) {
      if (key === identity) return;
      cancel();
      identity = key;
      if (!preference?.matches && element.animate) {
        animation = element.animate([{ opacity: .55 }, { opacity: 1 }], {
          duration: 160, easing: 'ease-out',
        });
      }
    },
    reset() { cancel(); identity = null; },
    destroy() { cancel(); preference?.removeEventListener('change', onPreference); },
  };
}

// Only the existing, sourced route segment changes weight; coordinates stay fixed.
export function createRouteEmphasis(map, {
  preference = media(),
  reducedMotion = () => preference?.matches,
  requestFrame = callback => globalThis.requestAnimationFrame(callback),
  cancelFrame = id => globalThis.cancelAnimationFrame(id),
} = {}) {
  let frame = null, generation = 0, destroyed = false;
  function paint(extra = 0) {
    if (map.getLayer('commute-highlight-line')) map.setPaintProperty('commute-highlight-line', 'line-width', 7 + extra);
    if (map.getLayer('commute-highlight-point')) map.setPaintProperty('commute-highlight-point', 'circle-radius', 7 + extra);
  }
  function stop() {
    generation++;
    if (frame !== null) cancelFrame(frame);
    frame = null;
    if (!destroyed) paint();
  }
  const onPreference = () => { if (reducedMotion()) stop(); };
  preference?.addEventListener('change', onPreference);
  return {
    run() {
      stop();
      if (destroyed || reducedMotion()) return;
      const current = generation;
      let start;
      const tick = time => {
        if (current !== generation || destroyed) return;
        if (reducedMotion()) { stop(); return; }
        start ??= time;
        const progress = Math.min(1, (time - start) / 300);
        paint(3 * (1 - progress) ** 2);
        frame = progress < 1 ? requestFrame(tick) : null;
      };
      frame = requestFrame(tick);
    },
    stop,
    destroy() { stop(); destroyed = true; preference?.removeEventListener('change', onPreference); },
  };
}

// A route can move the camera without losing the user's previous Overview framing.
export function createOverviewReturn() {
  let saved = null;
  return {
    leave(id, camera) { saved = id && camera ? { id, camera: structuredClone(camera) } : null; },
    take(id) {
      const camera = saved?.id === id ? saved.camera : null;
      saved = null;
      return camera;
    },
    clear() { saved = null; },
  };
}
