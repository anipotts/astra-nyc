import { walkingAvailability } from './walking-model.js';

// A compact route inset, drawn only from the returned geographic coordinates.
function drawRoute(canvas, route, position) {
  const ctx = canvas.getContext?.('2d'); if (!ctx || !route) return;
  const points = route.geometry.coordinates, [west, south] = route.bounds[0], [east, north] = route.bounds[1];
  const scaleX = Math.cos((south + north) / 2 * Math.PI / 180);
  const width = canvas.width, height = canvas.height, margin = 12;
  const scale = Math.min((width - margin * 2) / Math.max((east - west) * scaleX, .000001), (height - margin * 2) / Math.max(north - south, .000001));
  const project = p => [width / 2 + (p[0] - (west + east) / 2) * scaleX * scale, height / 2 - (p[1] - (south + north) / 2) * scale];
  ctx.clearRect(0, 0, width, height); ctx.lineWidth = 2; ctx.strokeStyle = '#204d3d'; ctx.beginPath();
  points.forEach((p,i) => { const xy = project(p); if (i) ctx.lineTo(...xy); else ctx.moveTo(...xy); }); ctx.stroke();
  for (const p of [points[0], points.at(-1)]) {ctx.beginPath();ctx.arc(...project(p),3,0,2*Math.PI);ctx.fillStyle='#204d3d';ctx.fill();}
  const xy = project(position.coordinate), heading = position.viewBearing * Math.PI / 180;
  ctx.beginPath();ctx.moveTo(...xy);ctx.lineTo(xy[0]+Math.sin(heading)*13,xy[1]-Math.cos(heading)*13);ctx.strokeStyle='#a65d2b';ctx.lineWidth=3;ctx.stroke();
  ctx.beginPath();ctx.arc(...xy,4,0,2*Math.PI);ctx.fillStyle='#a65d2b';ctx.fill();
}
export function mountWalkingControls(container, routeLayer) {
  container.innerHTML = `<button type="button" class="ui-button cv-walk-start">Walk this route</button>
    <p class="cv-walk-unavailable" hidden></p>
    <div class="cv-walk-controls" hidden>
      <div class="cv-walk-heading"><strong>Walk the route</strong><button type="button" class="ui-button ui-button--compact cv-walk-exit">Exit walk</button></div>
      <p class="cv-walk-progress"></p>
      <span class="cv-walk-announcement" role="status" aria-live="polite" aria-atomic="true"></span>
      <div class="cv-walk-actions"><button type="button" class="ui-button ui-button--compact" data-walk-action="back">Step back</button><button type="button" class="ui-button ui-button--compact" data-walk-action="forward">Step forward</button><button type="button" class="ui-button ui-button--compact" data-walk-action="next">Skip segment</button></div>
      <div class="cv-walk-actions"><button type="button" class="ui-button ui-button--compact" data-walk-action="left">Look left</button><button type="button" class="ui-button ui-button--compact" data-walk-action="right">Look right</button><button type="button" class="ui-button ui-button--compact cv-walk-speed" data-walk-action="speed">Speed 1×</button></div>
      <label class="ui-label cv-walk-seek-label">Jump along route<input class="cv-walk-seek" type="range" min="0" max="1000" value="0" aria-label="Position along walking route"></label>
      <details class="cv-walk-details ui-disclosure"><summary>Route overview & controls</summary>
        <canvas class="cv-walk-inset" width="240" height="64" role="img" aria-label="North-up route overview; orange point shows your position and viewing direction"></canvas>
        <p class="cv-walk-help">Focus the map: W/S move, A/D or drag look, Shift speeds up. Release to pause; Escape exits. Reduced motion uses single steps.</p>
        <p class="cv-walk-help">The environment uses approximate, untextured buildings along the mapped route. Sidewalks, street elevation and entrances are unverified. Select another home in Your places to compare the same destination.</p>
      </details>
    </div>
    <p class="cv-walk-note" hidden>Approximate route · entrances unverified</p>`;
  const $ = selector => container.querySelector(selector);
  let route = null, active = false, lastAnnouncement = '';
  function exited() { active = false; $('.cv-walk-controls').hidden = true; $('.cv-walk-start').hidden = Boolean(walkingAvailability(route)); container.classList.remove('is-walking'); }
  function position(state) {
    $('.cv-walk-seek').value = String(Math.round(state.fraction * 1000));
    $('.cv-walk-seek').setAttribute('aria-valuetext', `${Math.round(state.fraction * 100)} percent of route`);
    $('.cv-walk-speed').textContent = `Speed ${state.speed}×`;
    const text = state.arrived ? 'At the mapped route end · entrance unverified' : `${Math.round(state.distance).toLocaleString()} m along route · ${state.step?.name || 'Mapped route'}`;
    $('.cv-walk-progress').textContent = text;
    // Announce at most each 10 m or segment change, not every rendered frame.
    const announcement = `${Math.floor(state.distance / 10)}:${state.stepIndex}:${state.arrived}`;
    if (announcement !== lastAnnouncement) { lastAnnouncement = announcement; $('.cv-walk-announcement').textContent = text; }
    drawRoute($('.cv-walk-inset'), route, state);
  }
  $('.cv-walk-start').onclick = () => {
    if (!route || active) return;
    try {
      lastAnnouncement = '';
      $('.cv-walk-details').open = false;
      if (!routeLayer.beginWalk?.({ onChange: position, onExit: exited })) throw new Error('The walking camera is not ready yet. Try again shortly.');
      active = true; $('.cv-walk-controls').hidden = false; $('.cv-walk-start').hidden = true; container.classList.add('is-walking');
      $('.cv-walk-unavailable').hidden = true;
      container.closest?.('.commute-view')?.scrollTo?.({ top: 0, behavior: 'instant' });
    } catch (error) { $('.cv-walk-unavailable').hidden = false; $('.cv-walk-unavailable').textContent = error.message; }
  };
  const exitWalk = () => { routeLayer.endWalk?.(); exited(); $('.cv-walk-start').focus(); };
  $('.cv-walk-exit').onclick = exitWalk;
  // Scope this shortcut to walking controls; destination editing keeps its own keys.
  $('.cv-walk-controls').onkeydown = event => {
    if (!active || event.key !== 'Escape' || event.isComposing || event.defaultPrevented) return;
    event.preventDefault(); event.stopPropagation(); exitWalk();
  };
  $('.cv-walk-seek').oninput = () => routeLayer.seekWalk?.(Number($('.cv-walk-seek').value) / 1000);
  for (const button of container.querySelectorAll('[data-walk-action]')) button.onclick = () => routeLayer.walkAction?.(button.dataset.walkAction);
  return {
    update(value) {
      if (value?.key !== route?.key) { if (active) routeLayer.endWalk?.({ restore: false }); exited(); lastAnnouncement = ''; }
      route = value; const reason = walkingAvailability(route);
      container.hidden = !route;
      $('.cv-walk-start').hidden = Boolean(reason) || active;
      $('.cv-walk-unavailable').hidden = !reason;
      $('.cv-walk-unavailable').textContent = reason || '';
      $('.cv-walk-note').hidden = Boolean(reason);
    },
    destroy() { if (active) routeLayer.endWalk?.({ restore: false }); route = null; container.replaceChildren(); },
  };
}
