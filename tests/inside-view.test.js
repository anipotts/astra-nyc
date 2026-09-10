import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveInsideContext, initialInsideState, reduceInsideAction, dimensionLabel, safeSourceUrl } from '../src/inside-view/model.js';
import { listings } from '../src/listings.js';
import { inspectedPlans } from '../src/inspected-plan-records.js';
import { acceptInspectedRegion } from '../src/inspected-plan.js';
const selectedListing = listings.find((item) => item.id === 'charles345');
const acceptedRegion = acceptInspectedRegion(inspectedPlans[0], selectedListing.identity);
const context = resolveInsideContext({ selectedListing, acceptedRegion });
const action = (type, values = {}) => ({ type, listingId: selectedListing.id, ...values });

test('selected identity binds accepted partial geometry; all other bundled sources stay geometry-free', () => {
  assert.equal(context.region.id, acceptedRegion.id);
  assert.equal(context.region.height, null);
  assert.deepEqual(context.region.openings, []);
  for (const listing of listings.filter((item) => item.id !== selectedListing.id))
    assert.equal(resolveInsideContext({ selectedListing: listing, acceptedRegion }).region, null, listing.id);
  assert.equal(resolveInsideContext({ acceptedRegion }).region, null);
  assert.equal(resolveInsideContext({ selectedListing }).region, null);
});
test('fabricated dimensions and altered geometry never enter the viewer', () => {
  assert.equal(resolveInsideContext({ selectedListing, acceptedRegion: { ...acceptedRegion, width: 9 } }).region, null);
  const resolved = resolveInsideContext({ selectedListing, acceptedRegion: { ...acceptedRegion, height: 3, openings: [{ width: 1 }], elements: [] } });
  assert.equal(resolved.region.height, null);
  assert.deepEqual(resolved.region.openings, []);
  assert.equal(resolved.region.elements.length, 1);
});
test('adapter supports another independently reviewed mapped unit without property-specific rendering', () => {
  const listing = { ...selectedListing, id: 'charles445', identity: { ...selectedListing.identity, unit: '445' } };
  const region = acceptInspectedRegion(inspectedPlans[0], listing.identity);
  assert.equal(resolveInsideContext({ selectedListing: listing, acceptedRegion: region }).region.id, region.id);
  assert.equal(resolveInsideContext({ selectedListing: listing, acceptedRegion }).region, null);
});
test('local controls bound zoom and pan and reset the camera without erasing preferences', () => {
  let state = initialInsideState();
  for (let i = 0; i < 10; i++) state = reduceInsideAction(state, action('zoom', { factor: 2 }), context);
  assert.equal(state.zoom, 3);
  state = reduceInsideAction(state, action('pan', { dx: 900, dy: -900 }), context);
  assert.equal(state.panX, 600); assert.equal(state.panY, -600);
  state = reduceInsideAction(state, action('set_unit', { unit: 'm' }), context);
  state = reduceInsideAction(state, action('reset_view'), context);
  assert.deepEqual([state.zoom, state.panX, state.panY, state.unit], [1, 0, 0, 'm']);
});
test('stale agent calls, missing evidence, unvalidated payloads and unsupported actions reject', () => {
  for (const invalid of [
    { type: 'zoom', factor: 2 }, action('zoom', { factor: NaN }), action('zoom', { factor: 0 }),
    action('pan', { dx: Infinity, dy: 0 }), action('set_unit', { unit: 'px' }),
    action('set_dimensions', { visible: 'false' }), action('place_furniture'),
    action('compare_object', { width: 2, depth: -1 }), action('compare_object', { width: '2', depth: 1 }),
  ]) assert.throws(() => reduceInsideAction(initialInsideState(), invalid, context));
  assert.throws(() => reduceInsideAction(initialInsideState(), action('reset_view'), { listing: { id: 'other' }, region: acceptedRegion }));
  assert.throws(() => reduceInsideAction(initialInsideState(), action('reset_view'), { ...context, region: null }));
});
test('size references are reversible, do not mutate geometry, and never compute fit or clearance', () => {
  const original = structuredClone(context.region);
  let state = reduceInsideAction(initialInsideState(), action('compare_object', { width: 1.5, depth: 2 }), context);
  assert.deepEqual(state.comparison, { width: 1.5, depth: 2, rotated: false });
  assert.deepEqual(context.region, original);
  assert.equal('fit' in state, false);
  state = reduceInsideAction(state, action('clear_comparison'), context);
  assert.equal(state.comparison, null);
});
test('printed imperial nominal dimensions round-trip and links exclude executable/authenticated URLs', () => {
  assert.equal(dimensionLabel(acceptedRegion.width, 'ft'), '11′6″');
  assert.equal(dimensionLabel(acceptedRegion.depth, 'ft'), '11′4″');
  for (const value of ['javascript:alert(1)', 'http://example.com', 'https://user:pass@example.com', 'https://example.com:8080', null])
    assert.equal(safeSourceUrl(value), null);
  assert.equal(safeSourceUrl(selectedListing.url), selectedListing.url);
});
