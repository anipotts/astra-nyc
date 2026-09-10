import test from 'node:test';
import assert from 'node:assert/strict';
import { mountWalkingControls } from '../src/commute-view/walking-view.js';

// View adapter exercises the live session callbacks without a WebGL context.
function setup() {
  const nodes = new Map();
  const $ = selector => {
    if (!nodes.has(selector)) nodes.set(selector, { setAttribute() {}, focus() {} });
    return nodes.get(selector);
  };
  let callbacks, scrolls = 0;
  const container = {
    querySelector: $, querySelectorAll: () => [],
    classList: { add() {}, remove() {} }, replaceChildren() {},
    closest: () => ({ scrollTo: () => scrolls++ }),
  };
  const view = mountWalkingControls(container, {
    beginWalk(value) { callbacks = value; value.onChange(state(0)); return true; },
    endWalk() { callbacks.onExit(); },
  });
  view.update({ key: 'internal-test', mode: 'walking', geometry: { type: 'LineString', coordinates: [[0, 0], [0, .01]] } });
  return { $, view, start: () => $('.cv-walk-start').onclick(), change: value => callbacks.onChange(value), scrolls: () => scrolls };
}
const state = (distance, extra = {}) => ({ distance, fraction: distance / 2000, speed: 1, stepIndex: 0, arrived: false, step: { name: 'Test street' }, ...extra });

test('visible walking distance updates for each small step while live announcements remain throttled', () => {
  const h = setup(); h.start();
  assert.match(h.$('.cv-walk-progress').textContent, /^0 m/);
  h.change(state(3));
  assert.match(h.$('.cv-walk-progress').textContent, /^3 m/);
  assert.match(h.$('.cv-walk-announcement').textContent, /^0 m/);
  h.change(state(6));
  assert.match(h.$('.cv-walk-progress').textContent, /^6 m/);
  assert.match(h.$('.cv-walk-announcement').textContent, /^0 m/);
  h.change(state(12));
  assert.match(h.$('.cv-walk-announcement').textContent, /^12 m/);
  h.change(state(1003));
  const before = h.$('.cv-walk-progress').textContent;
  h.change(state(1006));
  assert.notEqual(h.$('.cv-walk-progress').textContent, before, 'metre steps remain visible beyond one kilometre');
  h.view.destroy();
});

test('segment changes and arrival announce without waiting for a distance bucket', () => {
  const h = setup(); h.start();
  h.change(state(3, { stepIndex: 1, step: { name: 'Next street' } }));
  assert.match(h.$('.cv-walk-announcement').textContent, /Next street/);
  h.change(state(6, { stepIndex: 1, arrived: true }));
  assert.match(h.$('.cv-walk-announcement').textContent, /mapped route end/);
  assert.equal(h.$('.cv-walk-announcement').textContent, h.$('.cv-walk-progress').textContent);
  h.view.destroy();
});

test('re-entering a walk restores compact controls and brings the panel back to its beginning', () => {
  const h = setup(); h.start();
  assert.equal(h.scrolls(), 1);
  h.$('.cv-walk-details').open = true;
  h.$('.cv-walk-exit').onclick();
  assert.equal(h.$('.cv-walk-controls').hidden, true);
  h.start();
  assert.equal(h.$('.cv-walk-controls').hidden, false);
  assert.equal(h.$('.cv-walk-details').open, false);
  assert.equal(h.scrolls(), 2);
  h.view.destroy();
});
