import test from 'node:test';
import assert from 'node:assert/strict';
import { mountWalkingControls } from '../src/commute-view/walking-view.js';

// View adapter exercises the live session callbacks without a WebGL context.
function setup() {
  const nodes = new Map();
  let focused;
  const $ = selector => {
    if (!nodes.has(selector)) nodes.set(selector, { setAttribute() {}, focus() { focused = selector; } });
    return nodes.get(selector);
  };
  let callbacks, scrolls = 0, exits = 0;
  const forward = $('[data-walk-action="forward"]'); forward.dataset = { walkAction: 'forward' };
  const container = {
    querySelector: $, querySelectorAll: () => [forward],
    classList: { add() {}, remove() {} }, replaceChildren() {},
    closest: () => ({ scrollTo: () => scrolls++ }),
  };
  const view = mountWalkingControls(container, {
    beginWalk(value) { callbacks = value; value.onChange(state(0)); return true; },
    endWalk() { exits++; callbacks.onExit(); },
    walkAction(action) { if (action === 'forward') callbacks.onChange(state(3)); },
  });
  view.update({ key: 'internal-test', mode: 'walking', geometry: { type: 'LineString', coordinates: [[0, 0], [0, .01]] } });
  return { $, view, forward, start: () => $('.cv-walk-start').onclick(), change: value => callbacks.onChange(value), scrolls: () => scrolls, exits: () => exits, focused: () => focused };
}
const state = (distance, extra = {}) => ({ distance, fraction: distance / 2000, speed: 1, stepIndex: 0, arrived: false, step: { name: 'Test street' }, ...extra });

test('movement dismisses the initial help, looking does not, and re-entry restores compact onboarding', () => {
  const h = setup(); h.start();
  assert.equal(h.$('.cv-walk-onboarding').hidden, false);
  assert.equal(h.$('.cv-walk-more').open, false);
  h.change(state(0, { viewBearing: 90 }));
  assert.equal(h.$('.cv-walk-onboarding').hidden, false, 'looking alone keeps movement help');
  h.forward.onclick();
  assert.equal(h.$('.cv-walk-onboarding').hidden, true);
  h.change(state(0));
  assert.equal(h.$('.cv-walk-onboarding').hidden, true, 'returning to the start does not revive dismissed help');
  h.$('.cv-walk-more').open = true;
  h.$('.cv-walk-exit').onclick(); h.start();
  assert.equal(h.$('.cv-walk-onboarding').hidden, false);
  assert.equal(h.$('.cv-walk-more').open, false);
  h.view.destroy();
});

test('Escape after Step forward exits from walking controls and returns focus to the start action', () => {
  const h = setup(); h.start(); h.forward.focus(); h.forward.onclick();
  assert.match(h.$('.cv-walk-progress').textContent, /^3 m/);
  let prevented = 0, stopped = 0;
  const event = key => ({ key, target: h.forward, preventDefault() { prevented++; }, stopPropagation() { stopped++; } });
  h.$('.cv-walk-controls').onkeydown(event('ArrowRight'));
  assert.equal(h.exits(), 0); assert.equal(prevented, 0);
  h.$('.cv-walk-controls').onkeydown(event('Escape'));
  assert.equal(h.exits(), 1); assert.equal(prevented, 1); assert.equal(stopped, 1);
  assert.equal(h.$('.cv-walk-controls').hidden, true);
  assert.equal(h.$('.cv-walk-start').hidden, false);
  assert.equal(h.focused(), '.cv-walk-start');
  h.$('.cv-walk-controls').onkeydown(event('Escape'));
  assert.equal(h.exits(), 1, 'inactive controls do not handle Escape');
  h.view.destroy();
});

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
