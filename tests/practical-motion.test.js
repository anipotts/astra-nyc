import test from 'node:test';
import assert from 'node:assert/strict';
import { createResultReveal, createRouteEmphasis, createOverviewReturn } from '../src/practical-motion.js';

function preference() {
  const listeners = new Set();
  return { matches: false, addEventListener: (_, f) => listeners.add(f), removeEventListener: (_, f) => listeners.delete(f),
    reduce() { this.matches = true; for (const f of listeners) f(); }, get size() { return listeners.size; } };
}
test('results are immediately visible; duplicate renders do not restart motion; replacement cancels', () => {
  const calls = []; let cancelled = 0;
  const pref = preference();
  const reveal = createResultReveal({ animate: (...args) => { calls.push(args); return { cancel: () => cancelled++ }; } }, { preference: pref });
  reveal.show('route-a'); reveal.show('route-a');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][0], [{ opacity: .55 }, { opacity: 1 }]);
  assert.equal(calls[0][1].duration, 160);
  reveal.show('route-b'); assert.equal(cancelled, 1);
  pref.reduce(); assert.equal(cancelled, 2);
  reveal.show('route-c'); assert.equal(calls.length, 2);
  reveal.destroy(); assert.equal(pref.size, 0);
});
test('reveal tolerates missing browser animation and resets a hidden result', () => {
  const reveal = createResultReveal({}, { preference: null });
  reveal.show('cached'); reveal.reset(); reveal.show('cached'); reveal.destroy();
});
test('route emphasis finishes at permanent selection weight and stale frames cannot repaint', () => {
  const pref = preference(), queue = new Map(), paint = []; let next = 0;
  const map = { getLayer: () => true, setPaintProperty: (...args) => paint.push(args) };
  const motion = createRouteEmphasis(map, { preference: pref, requestFrame: f => { queue.set(++next, f); return next; }, cancelFrame: id => queue.delete(id) });
  const tick = time => { const [id, fn] = queue.entries().next().value; queue.delete(id); fn(time); };
  motion.run(); tick(0); assert.equal(paint.at(-1)[2], 10);
  tick(300); assert.equal(paint.at(-1)[2], 7); assert.equal(queue.size, 0);
  motion.run(); const stale = queue.values().next().value;
  motion.stop(); const count = paint.length; stale(400); assert.equal(paint.length, count);
  motion.run(); pref.reduce(); assert.equal(queue.size, 0); assert.equal(paint.at(-1)[2], 7);
  motion.run(); assert.equal(queue.size, 0);
  motion.destroy(); assert.equal(pref.size, 0);
});
test('Overview camera returns once and never carries over to another listing', () => {
  const navigation = createOverviewReturn(), camera = { center: [-74, 40.7], zoom: 15, pitch: 56, bearing: 24 };
  navigation.leave('wall', camera); camera.zoom = 18;
  assert.equal(navigation.take('wall').zoom, 15); assert.equal(navigation.take('wall'), null);
  navigation.leave('wall', camera); assert.equal(navigation.take('charles'), null);
  navigation.leave('wall', camera); navigation.clear(); assert.equal(navigation.take('wall'), null);
});
