import { DEMO_DESTINATION, MODES, externalDirections, formatDuration, formatDistance, stepLabel } from './route.js';
import { createAutomaticRoute } from './automatic-route.js';
import { lookupLocation } from '../location.js';
import { createResultReveal } from '../practical-motion.js';
import './styles.css';

export function mountCommuteView(container, { routeLayer = {}, acquire, resolveDestination = lookupLocation, onDestinationChange = () => {}, onModeChange = () => {} } = {}) {
  container.classList.add('commute-view');
  container.innerHTML = `<section aria-label="Commute preview" class="cv-card ui-panel">
    <div class="cv-eyebrow">YOUR EVERYDAY JOURNEY</div><h2>From here to there.</h2>
    <p class="cv-origin"></p>
    <form class="cv-form"><label class="cv-label ui-label">Destination<input class="cv-destination ui-field" maxlength="180" placeholder="A public destination or work address" value="3 World Trade Center" autocomplete="off" required></label>
    <div class="cv-modes" role="group" aria-label="Travel mode">${Object.entries(MODES).map(([value,label]) => `<button type="button" class="ui-chip" data-travel-mode="${value}" aria-pressed="${value === 'walking'}">${label}</button>`).join('')}</div>
    <button class="cv-submit ui-button" type="submit" hidden>Find place</button></form>
    <div class="cv-candidates"></div><p class="cv-status" role="status" aria-live="polite"></p>
    <div class="cv-result" hidden><div class="cv-metrics"><strong class="cv-duration"></strong><span class="cv-distance"></span><span class="cv-freshness"></span></div><p class="cv-estimate">Provider estimate · no live traffic or departure schedule</p>
    <div class="cv-preview-heading"><h3>Along the way</h3><button type="button" class="cv-fit">Show full route</button></div>
    <label class="cv-scrub-label">Explore route segments<input class="cv-scrub" type="range" min="0" value="0" step="1"></label>
    <p class="cv-step" aria-live="polite"></p><div class="cv-step-controls"><button type="button" class="cv-prev">← Previous</button><span class="cv-step-count"></span><button type="button" class="cv-next">Next →</button></div>
    <details class="cv-details ui-disclosure"><summary>Route sources & limitations</summary><p class="cv-receipt"></p><p>Approximate building points connect to the nearest routable network within 250 m. The gap is not a verified entrance or walking connection. Times omit traffic, wait times and current disruptions. Ferry segments, if returned, need schedule checks.</p><p class="cv-snapping"></p><p class="cv-endpoint-sources"></p><a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noopener noreferrer">FOSSGIS / OSRM routing</a></details></div>
    <a class="cv-external" target="_blank" rel="noopener noreferrer" hidden>Open directions in Google Maps ↗</a>
    <p class="cv-sharing">Walking, cycling and driving routes load automatically from FOSSGIS. Destination lookup uses OpenStreetMap. No request while typing.</p>
    <footer class="cv-attribution">Route data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer">Fix the map</a></footer>
  </section>`;
  const $ = selector => container.querySelector(selector);
  const resultReveal = createResultReveal($('.cv-result'));
  let context = { active: true }, mode = 'walking', destination = DEMO_DESTINATION, lookup = null, lookupGeneration = 0, stepIndex = 0, lastIdentity = '', destroyed = false;
  const motion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 500;
  const controller = createAutomaticRoute({ acquire, onChange: renderState });
  function syncRoute() {
    controller.update({ active: context.active !== false, listingId: (context.selectedListing || context.listing)?.id, origin: context.resolvedLocation, destination, mode });
  }
  function external() {
    const listing = context.selectedListing || context.listing;
    const origin = context.resolvedLocation?.label || listing?.mapAddress || (listing ? `${listing.name}, ${listing.location}` : null);
    const href = externalDirections(origin, $('.cv-destination').value, mode);
    $('.cv-external').hidden = !href; if (href) $('.cv-external').href = href; else $('.cv-external').removeAttribute('href');
  }
  function invalidate() {
    lookupGeneration++; lookup?.abort(); lookup = null;
    $('.cv-candidates').replaceChildren(); routeLayer.stop?.(); syncRoute(); external();
    renderState(controller.state);
  }
  function showStep() {
    const route = controller.state.route; if (!route) return;
    stepIndex = Math.max(0, Math.min(route.steps.length - 1, stepIndex));
    const step = route.steps[stepIndex];
    $('.cv-scrub').value = String(stepIndex); $('.cv-scrub').max = String(route.steps.length - 1);
    $('.cv-scrub').setAttribute('aria-valuetext', stepLabel(step));
    $('.cv-step').textContent = `${stepLabel(step)} · ${formatDistance(step.distance)}${step.mode === 'ferry' ? ' · ferry schedule not included' : ''}`;
    $('.cv-step-count').textContent = `${stepIndex + 1} / ${route.steps.length}`;
    $('.cv-prev').disabled = stepIndex === 0; $('.cv-next').disabled = stepIndex === route.steps.length - 1;
    routeLayer.highlight?.(step);
  }
  function renderState(state) {
    const route = state.route;
    $('.cv-result').hidden = !route;
    const findingPlace = Boolean(lookup);
    $('.cv-submit').hidden = mode === 'transit' || Boolean(destination && state.status !== 'error');
    $('.cv-submit').textContent = destination ? 'Retry route' : 'Find place';
    $('.cv-submit').disabled = findingPlace || state.status === 'loading' || context.active === false || !(context.selectedListing || context.listing);
    $('.cv-status').textContent = state.status === 'loading' ? 'Finding the route…' : state.status === 'error' ? state.error : state.status === 'external' || mode === 'transit' ? 'Transit schedules and itineraries open in Google Maps. No transit route is drawn here.' : route ? '' : context.resolvedLocation ? (destination ? 'Preparing the route…' : 'Enter a public destination and choose Find place.') : 'The selected home needs a resolved location for an in-app route. External directions remain available.';
    if (!route) { resultReveal.reset(); routeLayer.setRoute?.(null); return; }
    $('.cv-duration').textContent = formatDuration(route.duration);
    $('.cv-distance').textContent = `${formatDistance(route.distance)} · ${MODES[route.mode]}`;
    $('.cv-freshness').textContent = route.cached ? 'Cached route' : 'Live lookup';
    $('.cv-receipt').textContent = `Retrieved ${new Date(route.observedAt).toLocaleString()}. ${route.cached ? 'Reused within the 30 minute cache window.' : 'Acquired for this request.'} Road data version: ${route.dataVersion || 'not supplied by provider'}.`;
    $('.cv-snapping').textContent = route.snapped ? `Network offsets: ${Math.round(route.snapped[0].distance)} m from the home point; ${Math.round(route.snapped[1].distance)} m from the destination point.` : '';
    const sources = $('.cv-endpoint-sources'); sources.replaceChildren();
    for (const [label, point] of [['Home location',route.origin],['Destination location',route.destination]]) {
      const a = document.createElement('a'); a.textContent = label; a.href = point.source; a.target = '_blank'; a.rel = 'noopener noreferrer'; sources.append(a, document.createTextNode(` · reviewed ${new Date(point.observedAt).toLocaleDateString()} `));
    }
    stepIndex = 0; routeLayer.setRoute?.(route); showStep();
    resultReveal.show(JSON.stringify([context.selectedListing?.id, route.mode, route.observedAt, route.origin, route.destination]));
    if (context.active !== false) routeLayer.fit?.({ bounds: route.bounds, duration: motion() });
  }
  $('.cv-destination').addEventListener('input', () => { destination = null; invalidate(); onDestinationChange({ text: $('.cv-destination').value, location: null }); });
  for (const button of container.querySelectorAll('[data-travel-mode]')) button.onclick = () => {
    if (mode === button.dataset.travelMode) return;
    mode = button.dataset.travelMode;
    for (const item of container.querySelectorAll('[data-travel-mode]')) item.setAttribute('aria-pressed', String(item === button));
    invalidate(); onModeChange(mode);
  };
  $('.cv-form').onsubmit = async event => {
    event.preventDefault(); if (destroyed || context.active === false) return;
    external();
    if (mode === 'transit') { renderState({ status: 'external', route: null }); return; }
    if (!context.resolvedLocation) { $('.cv-status').textContent = 'Resolve the selected home first, or open external directions.'; return; }
    if (!destination && /^3\s*world\s*trade\s*cent(?:er|re)$/i.test($('.cv-destination').value.trim())) {
      destination = DEMO_DESTINATION; invalidate();
      onDestinationChange({ text: $('.cv-destination').value, location: destination });
      return;
    }
    if (!destination) {
      lookup?.abort(); lookup = new AbortController(); const token = ++lookupGeneration;
      $('.cv-candidates').replaceChildren();
      $('.cv-submit').disabled = true;
      $('.cv-status').textContent = 'Looking up this public destination…';
      try {
        const result = await resolveDestination($('.cv-destination').value.trim(), { signal: lookup.signal });
        if (token !== lookupGeneration || destroyed || context.active === false) return;
        $('.cv-candidates').replaceChildren();
        $('.cv-status').textContent = result.candidates.length ? 'Choose the matching destination to see your route.' : 'No destination match. Try a numbered street address or open external directions.';
        for (const candidate of result.candidates) {
          const button = document.createElement('button'); button.type = 'button'; button.textContent = candidate.label;
          button.onclick = () => { destination = candidate; $('.cv-destination').value = candidate.label.slice(0,180); invalidate(); onDestinationChange({ text: candidate.label, location: candidate }); $('.cv-destination').focus(); };
          $('.cv-candidates').append(button);
        }
      } catch (e) { if (token === lookupGeneration && e.name !== 'AbortError') $('.cv-status').textContent = e.name === 'TypeError' ? 'Destination lookup is unavailable. Try again or open external directions.' : e.message; }
      finally { if (token === lookupGeneration) { lookup = null; $('.cv-submit').disabled = context.active === false; } }
      return;
    }
    controller.retry();
  };
  $('.cv-scrub').oninput = () => { stepIndex = Number($('.cv-scrub').value); showStep(); };
  $('.cv-prev').onclick = () => { stepIndex--; showStep(); }; $('.cv-next').onclick = () => { stepIndex++; showStep(); };
  $('.cv-fit').onclick = () => { const route = controller.state.route; if (route) routeLayer.fit?.({ bounds: route.bounds, duration: motion() }); };
  const stop = () => routeLayer.stop?.(); container.addEventListener('keydown', stop); container.addEventListener('pointerdown', stop);
  return {
    update(next) {
      context = { ...context, ...next };
      const listing = context.selectedListing || context.listing;
      const identity = JSON.stringify([listing?.id, context.resolvedLocation, context.active]);
      $('.cv-origin').textContent = listing ? `From ${listing.name}` : 'Choose a home to explore its commute.';
      if (identity !== lastIdentity) { lastIdentity = identity; invalidate(); }
      external();
    },
    destroy() { destroyed = true; lookupGeneration++; lookup?.abort(); controller.destroy(); resultReveal.destroy(); routeLayer.stop?.(); routeLayer.setRoute?.(null); container.removeEventListener('keydown',stop); container.removeEventListener('pointerdown',stop); container.replaceChildren(); container.classList.remove('commute-view'); },
  };
}
