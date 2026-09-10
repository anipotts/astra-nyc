import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { insideSourcePlan } from '../src/inside-view/source.js';
import { nycListings } from '../src/nyc-listings.js';
import { listings } from '../src/listings.js';
import { acceptInspectedRegion } from '../src/inspected-plan.js';
import { inspectedPlans } from '../src/inspected-plan-records.js';

const mima = nycListings.find((listing) => listing.id === 'mima48h');
const wall = nycListings.find((listing) => listing.id === 'wall2308');
const set = nycListings.find((listing) => listing.id === 'setftype');

test('automatic source preview binds NYC listing id to its own approved PDF', () => {
  assert.equal(insideSourcePlan(mima).sourceUrl, mima.planUrl);
  assert.match(insideSourcePlan(mima).scope, /Residence-group/);
  assert.match(insideSourcePlan(set).scope, /exact apartment not selected/);
  for (const listing of [wall, null, { ...mima, id: 'unknown' }, { ...mima, planUrl: set.planUrl }, { ...set, planUrl: mima.planUrl }, { ...mima, planUrl: 'javascript:alert(1)' }])
    assert.equal(insideSourcePlan(listing), null);
  assert.equal(insideSourcePlan(listings.find((listing) => listing.id === 'charles345')), null);
});

// Exercise the real Inside lifecycle with a bounded DOM adapter and injected
// source renderer. PDF.js rendering itself is covered by its independent QA.
const hooks = registerHooks({ load(url, context, next) {
  if (url.endsWith('/inside-view/style.css')) return { format: 'module', source: '', shortCircuit: true };
  if (url.endsWith('/inside-view/estimate-view.js')) return { format: 'module', source: 'export function mountEstimatedInterior() { throw new Error("Use the test renderer"); }', shortCircuit: true };
  return next(url, context);
} });
const { mountInsideView } = await import('../src/inside-view/index.js');
hooks.deregister();
class Element {
  constructor() {
    this.children = []; this.events = {}; this.attributes = {}; this.nodes = new Map();
    this.classList = { toggle() {} }; this.inert = false;
  }
  set innerHTML(value) { this.html = value; this.nodes = new Map(); }
  get innerHTML() { return this.html || ''; }
  querySelector(selector) {
    if (selector === '.iv-published-plan' && !this.innerHTML.includes('class="iv-published-plan"')) return null;
    if (!this.nodes.has(selector)) this.nodes.set(selector, new Element());
    return this.nodes.get(selector);
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  append(child) { this.children.push(child); }
  addEventListener(name, fn) { this.events[name] = fn; }
  remove() { this.removed = true; }
}
function setup() {
  const original = globalThis.document;
  globalThis.document = { createElement: () => new Element() };
  const container = new Element(), renders = [], plans = [];
  const view = mountInsideView(container, {
    createSourcePlan(host, options) {
      const render = { host, options, updates: [], active: [], destroyed: false,
        update(value) { this.updates.push(value); },
        setActive(value) { this.active.push(value); },
        destroy() { this.destroyed = true; },
      };
      renders.push(render); return render;
    },
    onOpenPlans: (context) => plans.push(context),
    onInspectPlan: () => {},
  });
  return { view, renders, plans, root: container.children[0], close() { view.destroy(); globalThis.document = original; } };
}

test('entering Inside loads estimated 3D directly; repeated context updates do not restart it', () => {
  const h = setup();
  try {
    h.view.update({ selectedListing: mima, active: false });
    assert.equal(h.renders.length, 0, 'Overview must not fetch an invisible estimate');
    h.view.update({ selectedListing: mima, active: true });
    assert.equal(h.renders.length, 1);
    assert.deepEqual(h.renders[0].updates, [{ sourceUrl: mima.planUrl, listingId: mima.id, title: mima.name, active: true }]);
    assert.match(h.root.innerHTML, /iv-published-plan/);
    assert.equal(h.renders[0].options.compact, true);
    assert.doesNotMatch(h.root.innerHTML, /<h2>|Open listing source|What would unlock more/);
    assert.match(h.root.innerHTML, /Estimated 3D apartment interior/);
    h.renders[0].options.onSource({ sourceUrl: mima.planUrl, fetchedAt: '2026-09-10T20:00:00Z' });
    assert.match(h.root.querySelector('.iv-source-receipt').textContent, /retrieved 2026-09-10/);
    assert.doesNotMatch(h.root.innerHTML, /No supported PDF plan/);
    h.view.update({ selectedListing: mima, active: true, priorities: ['Daily essentials'] });
    h.view.setActive(true);
    assert.equal(h.renders[0].updates.length, 1);
  } finally { h.close(); }
});

test('leaving cancels source work and resuming reopens the selected original source', () => {
  const h = setup();
  try {
    h.view.update({ selectedListing: mima, active: true });
    const renderer = h.renders[0];
    h.view.deactivate();
    assert.deepEqual(renderer.active, [false]);
    assert.equal(h.root.inert, true);
    h.view.setActive(true);
    assert.equal(renderer.updates.length, 2);
    assert.equal(renderer.updates[1].sourceUrl, mima.planUrl);
    h.view.destroy();
    assert.equal(renderer.destroyed, true);
  } finally { h.close(); }
});

test('switching listings destroys prior renderer and missing evidence has a compact honest fallback', () => {
  const h = setup();
  try {
    h.view.update({ selectedListing: mima, active: true });
    const first = h.renders[0];
    h.view.update({ selectedListing: set, active: false });
    assert.equal(first.destroyed, true);
    assert.equal(h.renders.length, 1);
    h.view.setActive(true);
    assert.equal(h.renders[1].updates[0].sourceUrl, set.planUrl);
    first.options.onSource({ sourceUrl: mima.planUrl, fetchedAt: 'old receipt' });
    assert.equal(h.root.querySelector('.iv-source-receipt').textContent, undefined);
    h.view.update({ selectedListing: wall, active: true });
    assert.equal(h.renders[1].destroyed, true);
    assert.match(h.root.innerHTML, /No supported PDF plan/);
    assert.doesNotMatch(h.root.innerHTML, /iv-published-plan|MiMA|11′10/);
    assert.equal(h.renders.length, 2);
  } finally { h.close(); }
});

test('full Plans action stays separate and source-only view never enables geometry commands', () => {
  const h = setup();
  try {
    h.view.update({ selectedListing: mima, active: true });
    h.root.events.click({ target: { closest: () => ({ dataset: { action: 'plans' } }) } });
    assert.equal(h.plans.length, 1);
    assert.equal(h.plans[0].listing.id, mima.id);
    assert.equal(h.plans[0].region, null);
    assert.throws(() => h.view.dispatch({ type: 'compare_object', listingId: mima.id, width: 1.5, depth: 2 }), /No reviewed/);
    assert.equal(h.renders[0].updates.length, 1);
  } finally { h.close(); }
});

test('Charles reviewed region retains its existing view without loading a NYC source', () => {
  const h = setup();
  try {
    const listing = listings.find((item) => item.id === 'charles345');
    const acceptedRegion = acceptInspectedRegion(inspectedPlans[0], listing.identity);
    h.view.update({ selectedListing: listing, acceptedRegion, active: true });
    assert.equal(h.renders.length, 0);
    assert.match(h.root.innerHTML, /iv-canvas/);
    assert.doesNotMatch(h.root.innerHTML, /iv-published-plan/);
  } finally { h.close(); }
});
