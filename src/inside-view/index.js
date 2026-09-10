import { initialInsideState, resolveInsideContext, reduceInsideAction, dimensionLabel, safeSourceUrl } from './model.js';
import { mountEstimatedInterior } from './estimate-view.js';
import { insideEstimateSource } from './source.js';
import './style.css';

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const link = (url, label) => safeSourceUrl(url) ? `<a href="${escape(safeSourceUrl(url))}" target="_blank" rel="noopener noreferrer">${label} ↗</a>` : '';
let viewSequence = 0;
const date = (value) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString().slice(0, 10) : 'Unknown';

export function mountInsideView(container, { onInspectPlan, onOpenPlans, onAction, records, sourceDetailsHost, createSourcePlan = mountEstimatedInterior } = {}) {
  const helpId = `inside-help-${++viewSequence}`;
  let context = resolveInsideContext(), state = initialInsideState(), destroyed = false, active = true, signature = '', drag = null;
  let sourceViewer = null, sourceVisible = false;
  let sidebarEvidence = null;
  const root = document.createElement('section');
  root.className = 'inside-view';
  root.setAttribute('aria-label', 'Inside evidence explorer');
  container.append(root);
  const abort = new AbortController();
  const listen = (element, type, handler, options = {}) => element.addEventListener(type, (event) => { if (active && !destroyed) handler(event); }, { ...options, signal: abort.signal });

  function draw() {
    const { region } = context;
    if (!region) return;
    const canvas = root.querySelector('.iv-canvas');
    const w = region.width * 90, h = region.depth * 90, x = (600 - w) / 2, y = (460 - h) / 2;
    canvas.innerHTML = `<svg viewBox="0 0 600 460" role="img" aria-label="Nominal bedroom region. Unknown architecture is excluded.">
      <g transform="translate(${300 + state.panX} ${230 + state.panY}) scale(${state.zoom}) translate(-300 -230)">
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#e0e7d8" stroke="#56715b" stroke-width="1.5" stroke-dasharray="7 5"/>
        <text x="300" y="218" text-anchor="middle" class="iv-room-label">${escape(region.elements[0].label)}</text>
        <text x="300" y="242" text-anchor="middle" class="iv-svg-note">Published nominal region</text>
        ${state.dimensions ? `<path d="M${x} ${y+h+12}v20m0 -10h${w}m0 -10v20M${x-12} ${y}h-20m10 0v${h}m-10 0h20" fill="none" stroke="#6b7c69"/><text x="300" y="${y+h+50}" text-anchor="middle" class="iv-dimension">${dimensionLabel(region.width, state.unit)}</text><text x="${x-42}" y="230" text-anchor="middle" transform="rotate(-90 ${x-42} 230)" class="iv-dimension">${dimensionLabel(region.depth, state.unit)}</text>` : ''}
      </g></svg>`;
    root.querySelector('[data-action="dimensions"]').setAttribute('aria-pressed', String(state.dimensions));
    root.querySelector('[data-action="unit"]').textContent = state.unit === 'ft' ? 'Feet' : 'Metres';
    root.querySelector('.iv-zoom').textContent = `${Math.round(state.zoom * 100)}%`;
    const comparison = root.querySelector('.iv-comparison');
    comparison.hidden = !state.comparison;
    if (state.comparison) {
      const object = state.comparison;
      const scale = Math.min(160 / Math.max(region.width, object.width), 105 / Math.max(region.depth, object.depth));
      comparison.innerHTML = `<p><strong>Size reference · unplaced</strong></p><svg viewBox="0 0 380 145" role="img" aria-label="Room region and your object drawn separately at the same scale"><rect x="15" y="8" width="${region.width*scale}" height="${region.depth*scale}" fill="#e0e7d8" stroke="#56715b" stroke-dasharray="5 4"/><rect x="205" y="8" width="${object.width*scale}" height="${object.depth*scale}" fill="#c5b99a" stroke="#766744"/><text x="15" y="132">Nominal region</text><text x="205" y="132">Your dimensions</text></svg><p>${dimensionLabel(object.width, state.unit)} × ${dimensionLabel(object.depth, state.unit)}. These rectangles compare size only. Obstructions and clearances remain unknown.</p><button class="ui-button" type="button" data-action="clear-comparison">Remove comparison</button>`;
    }
  }

  function syncSourcePlan() {
    const plan = !context.region && insideEstimateSource(context.listing);
    const host = root.querySelector('.iv-published-plan');
    if (!plan || !host) return;
    if (!active) {
      if (sourceVisible) sourceViewer?.setActive(false);
      sourceVisible = false;
      return;
    }
    sourceViewer ||= createSourcePlan(host, {
      compact: true,
      onSource(receipt) {
        if (destroyed || !sourceVisible || context.listing?.id !== plan.listingId || insideEstimateSource(context.listing)?.sourceUrl !== plan.sourceUrl) return;
        const output = (sidebarEvidence || root).querySelector('.iv-source-receipt');
        if (output) {
          const evidence = receipt.sourceEvidence;
          const basis = evidence?.kind === 'listing_evidence'
            ? `Listing evidence checked ${evidence.catalogCheckedAt || 'date unavailable'}; web sources checked ${evidence.searchedAt || 'not retrieved'}`
            : `Source retrieved ${receipt.fetchedAt || 'time not supplied'}`;
          output.textContent = `${receipt.model || 'Astra'} · ${receipt.cached ? 'cached estimate' : 'generated estimate'} · ${basis}. ${receipt.scene?.sourceAssessment || ''} ${(receipt.scene?.assumptions || []).join(' ')}`;
          for (const url of evidence?.sourceUrls || []) {
            if (!safeSourceUrl(url)) continue;
            const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = new URL(url).hostname + ' ↗';
            output.append(document.createElement('br'), a);
          }
        }
      },
    });
    if (!sourceVisible) {
      sourceVisible = true;
      void sourceViewer.update({ sourceUrl: plan.sourceUrl, listingId: plan.listingId, title: plan.title, active: true });
    }
  }

  function render() {
    sidebarEvidence?.remove(); sidebarEvidence = null;
    sourceViewer?.destroy(); sourceViewer = null; sourceVisible = false;
    const { listing, region } = context;
    const sourcePlan = !region && insideEstimateSource(listing);
    root.classList.toggle('iv-source-first', Boolean(sourcePlan));
    if (!listing) {
      root.innerHTML = '<div class="iv-empty ui-panel"><span class="iv-eyebrow">Inside</span><h2>Choose a home to look inside</h2><p>Select a listing to review its source and any accepted room evidence.</p></div>';
      return;
    }
    root.innerHTML = `${sourcePlan ? '' : `<header class="iv-heading"><div><span class="iv-eyebrow">${region ? 'Reviewed partial plan' : 'Source review'}</span>${region ? `<h2>${escape(listing.name)}</h2><p>${escape(listing.location)}</p>` : ''}</div><span class="iv-badge ui-chip">${listing.archived ? 'Archived source' : listing.historical ? 'Historical plan' : 'Source snapshot'}</span></header>`}
      ${sourcePlan ? `<p class="iv-source-scope">${escape(sourcePlan.scope)}${listing.archived ? ' · Archived listing' : ''}</p><div class="iv-published-plan" aria-label="Estimated 3D apartment interior"></div>` : region ? `<div class="iv-toolbar" role="group" aria-label="Room view controls"><button class="ui-button" type="button" data-action="dimensions" aria-pressed="true">Dimensions</button><button class="ui-button" type="button" data-action="unit" aria-label="Switch dimension units">Feet</button><span class="iv-toolbar-spacer"></span><button class="ui-button" type="button" data-action="zoom-out" aria-label="Zoom out">−</button><output class="iv-zoom" aria-label="Zoom level">100%</output><button class="ui-button" type="button" data-action="zoom-in" aria-label="Zoom in">+</button><button class="ui-button" type="button" data-action="reset">Reset</button></div><div class="iv-canvas" tabindex="0" aria-label="Room canvas. Drag or use arrow keys to pan, plus and minus to zoom, Home to reset." aria-describedby="${helpId}"></div><p class="iv-canvas-help" id="${helpId}">Drag to pan · + / − to zoom · Home to reset</p><p class="iv-scope">${escape(region.extent)} <strong>Nominal region only; no fit guarantee.</strong></p>` : `<div class="iv-fallback"><h3>No supported PDF plan for this home</h3><p>Open the listing source to review its photos and any published plan. Room geometry remains unverified.</p></div>`}
      <nav class="iv-source-actions" aria-label="Source actions">${sourcePlan ? '<span class="iv-source-scope">Estimated geometry, materials and furnishings · not a fit guarantee</span>' : link(listing.url, 'Open listing source')}${!sourcePlan && listing.planUrl && listing.planUrl !== listing.url ? link(listing.planUrl, 'Published plan') : ''}${!sourcePlan && onInspectPlan && safeSourceUrl(listing.planUrl) ? '<button class="ui-button" type="button" data-action="inspect">Ask Astra to inspect this plan</button>' : ''}${(region || safeSourceUrl(listing.planUrl)) && onOpenPlans ? '<button class="ui-button" type="button" data-action="plans">Open Plans</button>' : ''}</nav>
      <details class="iv-details ui-disclosure"><summary>${sourcePlan ? 'Estimate details & source evidence' : 'Sources & dimensions'}</summary><dl><dt>Selected source</dt><dd>${escape(listing.name)}</dd>${sourcePlan ? '<dt>Estimated reconstruction</dt><dd class="iv-source-receipt">Not loaded yet</dd>' : ''}<dt>Listing checked</dt><dd>${date(listing.checkedAt)}</dd><dt>Availability</dt><dd>${escape(listing.availability || 'Not verified')}</dd>${region ? `<dt>Region dimensions</dt><dd>${dimensionLabel(region.width, 'ft')} × ${dimensionLabel(region.depth, 'ft')} (${dimensionLabel(region.width, 'm')} × ${dimensionLabel(region.depth, 'm')})</dd><dt>Basis</dt><dd>${escape(region.elements[0].evidence.source)}</dd><dt>Reviewed</dt><dd>${date(region.revision.createdAt)}</dd><dt>Published date</dt><dd>${date(region.sourceDate)}</dd><dt>Artwork metadata</dt><dd>${date(region.artworkDate)}; not a publication date</dd>` : ''}</dl>${region ? `<p>${escape(region.qualification)}</p><p><strong>Excluded:</strong> ${escape(region.exclusions.join('; '))}.</p>${region.sources.map((source) => `<p>${link(source.url, escape(source.title))}</p>`).join('')}<p>Source artwork remains at the publisher. Reuse rights are unresolved.</p>` : `<p>${escape(listing.questions || 'Confirm exact unit, source date, dimensions and current condition.')}</p>`}</details>
      ${region ? `<details class="iv-details ui-disclosure"><summary>Compare an object’s footprint</summary><p>Enter dimensions you know. This creates a separate scale reference; placing furniture needs verified room boundaries and obstacles.</p><form class="iv-object-form"><label>Width (m)<input class="ui-field" name="width" type="number" min="0.1" max="10" step="any" required placeholder="e.g. 1.5"></label><label>Depth (m)<input class="ui-field" name="depth" type="number" min="0.1" max="10" step="any" required placeholder="e.g. 2.0"></label><button class="ui-button" type="submit">Compare size</button></form><div class="iv-comparison" hidden></div></details>` : ''}
      ${sourcePlan ? '' : '<details class="iv-details ui-disclosure"><summary>What would unlock more?</summary><p><strong>Furniture placement:</strong> reviewed clear-floor boundaries, doors, fixed obstacles and confirmed object dimensions.</p><p><strong>Walkthrough & lighting:</strong> reviewed wall, opening, ceiling and orientation evidence. These sources do not establish a complete 3D interior.</p></details>'}<p class="iv-status" role="status" aria-live="polite"></p>`;
    if (sourcePlan) {
      root.querySelector('.iv-source-actions')?.remove();
      root.querySelector('.iv-source-scope').textContent = sourcePlan.kind === 'pdf' ? 'Estimated interior from the published plan' : 'Estimated interior from listing evidence';
      if (sourceDetailsHost) {
        sidebarEvidence = root.querySelector('.iv-details');
        sidebarEvidence.setAttribute('data-inside-evidence', '');
        sidebarEvidence.querySelector('summary').textContent = 'Interior estimate';
        sourceDetailsHost.append(sidebarEvidence);
      }
    }
    draw();
    syncSourcePlan();
  }

  function dispatch(action) {
    if (destroyed) throw new Error('Inside view has been destroyed.');
    if (!active) throw new Error('Inside view is inactive.');
    state = reduceInsideAction(state, action, context);
    draw();
    onAction?.({ ...action, origin: 'local', representation: 'inspected_2d_region' });
    return structuredClone(state);
  }
  function local(type, values = {}) {
    try { dispatch({ type, listingId: context.listing?.id, ...values }); }
    catch (error) { root.querySelector('.iv-status').textContent = error.message; }
  }
  listen(root, 'click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'zoom-in') local('zoom', { factor: 1.2 });
    if (action === 'zoom-out') local('zoom', { factor: 1/1.2 });
    if (action === 'reset') local('reset_view');
    if (action === 'dimensions') local('set_dimensions', { visible: !state.dimensions });
    if (action === 'unit') local('set_unit', { unit: state.unit === 'ft' ? 'm' : 'ft' });
    if (action === 'clear-comparison') local('clear_comparison');
    if (action === 'inspect') onInspectPlan?.({ listing: context.listing, sourceUrl: safeSourceUrl(context.listing.planUrl) });
    if (action === 'plans') onOpenPlans?.({ listing: context.listing, region: context.region });
  });
  listen(root, 'submit', (event) => {
    if (!event.target.matches('.iv-object-form')) return;
    event.preventDefault();
    const data = new FormData(event.target);
    local('compare_object', { width: Number(data.get('width')), depth: Number(data.get('depth')) });
  });
  listen(root, 'keydown', (event) => {
    if (!event.target.matches('.iv-canvas')) return;
    const pans = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] };
    if (pans[event.key]) { event.preventDefault(); local('pan', { dx: pans[event.key][0], dy: pans[event.key][1] }); }
    else if (['+', '=', '-', 'Home', 'Escape'].includes(event.key)) {
      event.preventDefault();
      if (['Home', 'Escape'].includes(event.key)) local('reset_view');
      else local('zoom', { factor: event.key === '-' ? 1/1.2 : 1.2 });
    }
  });
  listen(root, 'pointerdown', (event) => {
    const canvas = event.target.closest('.iv-canvas');
    if (!canvas || event.button !== 0) return;
    canvas.focus(); canvas.setPointerCapture(event.pointerId);
    drag = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  });
  listen(root, 'pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = root.querySelector('.iv-canvas').getBoundingClientRect();
    const scale = Math.min(rect.width / 600, rect.height / 460);
    local('pan', { dx: (event.clientX - drag.x) / scale, dy: (event.clientY - drag.y) / scale });
    drag = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(root, name, () => { drag = null; });
  listen(root, 'wheel', (event) => {
    if (!event.target.closest('.iv-canvas') || !event.ctrlKey) return;
    event.preventDefault(); local('zoom', { factor: event.deltaY > 0 ? 1/1.1 : 1.1 });
  }, { passive: false });

  function setActive(value) {
    if (destroyed) return;
    active = Boolean(value);
    drag = null;
    root.inert = !active;
    syncSourcePlan();
  }
  render();
  return {
    update(next) {
      if (destroyed) return;
      const nextActive = next?.active !== false;
      const resolved = resolveInsideContext(next, records);
      const nextSignature = JSON.stringify([resolved.listing, resolved.region]);
      context = resolved;
      if (signature !== nextSignature) {
        active = nextActive; root.inert = !active;
        signature = nextSignature; state = initialInsideState(); drag = null; render();
      } else setActive(nextActive);
    },
    dispatch,
    setActive,
    deactivate: () => setActive(false),
    getState: () => structuredClone(state),
    destroy() { destroyed = true; drag = null; sidebarEvidence?.remove(); sourceViewer?.destroy(); sourceViewer = null; sourceVisible = false; abort.abort(); root.remove(); },
  };
}
