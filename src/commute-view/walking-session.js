import { createWalkingPath, offsetPoint, clamp } from './walking-model.js';

// First-person preview follows the sourced line on the map's ground plane.
// It does not infer sidewalks, collision meshes, route elevation or entrances.
export function createWalkingSession(map, route, {
  onChange = () => {}, onExit = () => {},
  reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  requestFrame = callback => globalThis.requestAnimationFrame(callback),
  cancelFrame = id => globalThis.cancelAnimationFrame(id),
  windowTarget = globalThis.window, documentTarget = globalThis.document,
} = {}) {
  const path = createWalkingPath(route), canvas = map.getCanvas();
  const saved = { center: map.getCenter(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch(), padding: map.getPadding(), maxZoom: map.getMaxZoom(), maxPitch: map.getMaxPitch(), tabIndex: canvas.tabIndex, label: canvas.getAttribute('aria-label') };
  const handlers = ['dragPan', 'dragRotate', 'scrollZoom', 'boxZoom', 'doubleClickZoom', 'touchZoomRotate', 'touchPitch', 'keyboard'].map(name => ({ handler: map[name], enabled: map[name]?.isEnabled() }));
  let distance = 0, yaw = 0, lookDown = 6, speed = 1, destroyed = false, frame = null, lastTime = null, drag = null;
  const keys = new Set(), removers = [];
  const listen = (target, type, callback, options) => { target?.addEventListener(type, callback, options); removers.push(() => target?.removeEventListener(type, callback, options)); };
  function snapshot() { const position = path.at(distance); return { ...position, viewBearing: (position.bearing + yaw + 360) % 360, speed, moving: keys.has('w') || keys.has('s') || keys.has('arrowup') || keys.has('arrowdown') }; }
  function paint() {
    if (destroyed) return;
    const state = snapshot();
    const eyeHeight = 1.7, lookAhead = eyeHeight / Math.tan(lookDown * Math.PI / 180);
    const target = offsetPoint(state.coordinate, state.viewBearing, lookAhead);
    const camera = map.calculateCameraOptionsFromTo(state.coordinate, eyeHeight, target, 0);
    map.jumpTo({ ...camera, padding: { top: 0, right: 0, bottom: 0, left: 0 } });
    onChange(state);
  }
  function pause() { keys.clear(); if (frame !== null) cancelFrame(frame); frame = null; lastTime = null; }
  function tick(time) {
    frame = null;
    if (destroyed || !keys.size) return;
    if (reducedMotion()) { pause(); paint(); return; }
    const dt = lastTime === null ? 0 : clamp((time - lastTime) / 1000, 0, .05); lastTime = time;
    const forward = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'));
    const turn = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
    distance = clamp(distance + forward * 1.4 * speed * (keys.has('shift') ? 4 : 1) * dt, 0, path.length);
    yaw = (yaw + turn * 75 * dt + 360) % 360;
    paint();
    // Reaching an endpoint stops held movement instead of spinning a frame loop.
    if (!turn && (distance === 0 && forward < 0 || distance === path.length && forward > 0)) { pause(); return; }
    frame = requestFrame(tick);
  }
  function keydown(event) {
    const key = event.key.toLowerCase();
    if (key === 'escape') { event.preventDefault(); event.stopPropagation?.(); end(); return; }
    if (key === ' ' || key === 'spacebar') { event.preventDefault(); event.stopPropagation?.(); pause(); paint(); return; }
    if (!['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(key)) return;
    event.preventDefault(); event.stopPropagation?.();
    if (reducedMotion()) {
      if (event.repeat || key === 'shift') return;
      if (['w','arrowup','s','arrowdown'].includes(key)) distance = clamp(distance + (['w','arrowup'].includes(key) ? 1 : -1) * 3, 0, path.length);
      else yaw += ['d','arrowright'].includes(key) ? 15 : -15;
      paint(); return;
    }
    keys.add(key); if (key === 'shift') return; if (frame === null) frame = requestFrame(tick);
  }
  function keyup(event) { keys.delete(event.key.toLowerCase()); if (!keys.size || (keys.size === 1 && keys.has('shift'))) { pause(); paint(); } }
  function end({ restore = true } = {}) {
    if (destroyed) return;
    pause(); destroyed = true;
    if (drag) { try { canvas.releasePointerCapture(drag.id); } catch {} drag = null; }
    removers.forEach(remove => remove());
    handlers.forEach(({ handler, enabled }) => { if (enabled) handler?.enable(); });
    map.stop();
    if (restore) map.jumpTo({ center: saved.center, zoom: saved.zoom, bearing: saved.bearing, pitch: saved.pitch, padding: saved.padding });
    map.setPadding(saved.padding);
    map.setMaxPitch(saved.maxPitch); map.setMaxZoom(saved.maxZoom);
    canvas.tabIndex = saved.tabIndex;
    if (saved.label === null) canvas.removeAttribute('aria-label'); else canvas.setAttribute('aria-label', saved.label);
    onExit();
  }
  try {
  handlers.forEach(({ handler }) => handler?.disable());
  map.stop(); map.setMaxPitch(89); map.setMaxZoom(24);
  canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'Walking route preview. W and S move, A and D look, drag to look, Shift moves faster, Space pauses, Escape exits.');
  listen(canvas, 'keydown', keydown); listen(canvas, 'keyup', keyup);
  listen(canvas, 'blur', () => { pause(); });
  listen(windowTarget, 'blur', () => { pause(); });
  listen(documentTarget, 'visibilitychange', () => { if (documentTarget.hidden) pause(); });
  listen(canvas, 'pointerdown', event => { if (event.button !== 0) return; pause(); canvas.focus({ preventScroll: true }); drag = { id: event.pointerId, x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId); });
  listen(canvas, 'pointermove', event => { if (!drag || event.pointerId !== drag.id) return; yaw += (event.clientX - drag.x) * .25; lookDown = clamp(lookDown + (event.clientY - drag.y) * .08, 2, 25); drag.x = event.clientX; drag.y = event.clientY; paint(); });
  const release = event => { if (drag?.id !== event.pointerId) return; try { canvas.releasePointerCapture(event.pointerId); } catch {} drag = null; };
  listen(canvas, 'pointerup', release); listen(canvas, 'pointercancel', release);
  paint(); canvas.focus({ preventScroll: true });
  } catch (error) { end(); throw error; }
  return {
    end,
    action(action) {
      if (destroyed) return;
      pause();
      if (action === 'forward') distance = clamp(distance + 3 * speed, 0, path.length);
      if (action === 'back') distance = clamp(distance - 3 * speed, 0, path.length);
      if (action === 'left') yaw -= 20;
      if (action === 'right') yaw += 20;
      if (action === 'next') { distance = path.nextStop(distance); yaw = 0; }
      if (action === 'previous') { distance = path.nextStop(distance, -1); yaw = 0; }
      if (action === 'speed') speed = speed === 1 ? 4 : 1;
      if (action === 'face-route') { yaw = 0; lookDown = 6; }
      paint();
    },
    seek(fraction) { if (destroyed || !Number.isFinite(fraction)) return; pause(); distance = clamp(fraction, 0, 1) * path.length; yaw = 0; paint(); },
    pause,
  };
}
