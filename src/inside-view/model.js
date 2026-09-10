import { acceptInspectedRegion } from '../inspected-plan.js';
import { inspectedPlans } from '../inspected-plan-records.js';

export function safeSourceUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port ? url.href : null;
  } catch { return null; }
}

// Rebind to the selected identity through the existing trusted acceptance adapter.
// Neither an old layout nor a model report can establish a new listing's geometry.
export function resolveInsideContext(context = {}, records = inspectedPlans) {
  const listing = context.selectedListing || context.listing || null;
  let region = null;
  if (listing?.id && context.acceptedRegion?.representation === 'inspected_2d_region') {
    for (const record of records) {
      try {
        const reviewed = acceptInspectedRegion(record, listing.identity);
        if (reviewed.id === context.acceptedRegion.id &&
            reviewed.width === context.acceptedRegion.width && reviewed.depth === context.acceptedRegion.depth) {
          region = reviewed;
          break;
        }
      } catch { /* An unrelated or unaccepted record stays absent. */ }
    }
  }
  return { listing, region, priorities: Array.isArray(context.priorities) ? [...context.priorities] : [] };
}

export function initialInsideState() {
  return { zoom: 1, panX: 0, panY: 0, dimensions: true, unit: 'ft', comparison: null };
}
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
export const INSIDE_ACTIONS = Object.freeze([
  'zoom', 'pan', 'reset_view', 'set_dimensions', 'set_unit', 'compare_object', 'clear_comparison',
]);

// Shared deterministic command path for UI and a host's validated agent tools.
// listingId is mandatory to prevent late commands changing a newly selected home.
export function reduceInsideAction(state, action, context) {
  if (!context.listing?.id || action?.listingId !== context.listing.id)
    throw new Error('The selected home changed. Refresh the Inside context.');
  if (!context.region) throw new Error('No reviewed room region is available for this home.');
  switch (action.type) {
    case 'zoom':
      if (!finite(action.factor) || action.factor <= 0 || action.factor > 4) throw new Error('Invalid zoom factor.');
      return { ...state, zoom: clamp(state.zoom * action.factor, 0.6, 3) };
    case 'pan':
      if (!finite(action.dx) || !finite(action.dy)) throw new Error('Invalid pan distance.');
      return { ...state, panX: clamp(state.panX + action.dx, -600, 600), panY: clamp(state.panY + action.dy, -600, 600) };
    case 'reset_view': return { ...state, zoom: 1, panX: 0, panY: 0 };
    case 'set_dimensions':
      if (typeof action.visible !== 'boolean') throw new Error('Dimension visibility must be boolean.');
      return { ...state, dimensions: action.visible };
    case 'set_unit':
      if (!['ft', 'm'].includes(action.unit)) throw new Error('Use feet or metres.');
      return { ...state, unit: action.unit };
    case 'compare_object':
      if (![action.width, action.depth].every((v) => finite(v) && v >= 0.1 && v <= 10))
        throw new Error('Enter object dimensions between 0.1 and 10 metres.');
      return { ...state, comparison: { width: action.width, depth: action.depth, rotated: false } };
    case 'clear_comparison': return { ...state, comparison: null };
    default: throw new Error('Unsupported Inside action.');
  }
}

export function dimensionLabel(metres, unit) {
  if (unit === 'm') return `${metres.toFixed(2)} m`;
  const inches = Math.round(metres / 0.0254);
  return `${Math.floor(inches / 12)}′${inches % 12}″`;
}
