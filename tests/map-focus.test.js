import test from 'node:test';
import assert from 'node:assert/strict';
import { createMapFocus } from '../src/map-focus.js';

test('a view interruption cannot accept a camera stranded between two listings', () => {
  const focus = createMapFocus();
  focus.set({ center: [-73.96, 40.75], zoom: 17.5 });
  const latest = { center: [-74.007, 40.704], zoom: 17.5 };
  focus.set(latest);
  focus.settled({ center: [-73.98, 40.73], zoom: 17.5 });
  assert.deepEqual(focus.pending, latest);
  focus.settled(latest);
  assert.equal(focus.pending, null);
});
test('manual map motion cancels pending location intent; a stale end cannot resurrect it', () => {
  const focus = createMapFocus();
  const camera = { center: [-74.007, 40.704], zoom: 17.5 };
  focus.set(camera);
  focus.cancel();
  focus.settled(camera);
  assert.equal(focus.pending, null);
});
