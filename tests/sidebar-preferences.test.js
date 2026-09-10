import test from 'node:test';
import assert from 'node:assert/strict';
import { createPriorities, parsePriorities, PRIORITY_KEY } from '../src/priorities.js';
import { createListingPicker } from '../src/listing-picker.js';
import { parseSearchHistory, rememberSearch } from '../src/search-suggestions.js';
import { auditedExamples, additionalExamples } from '../src/listings.js';
const storage = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
test('priorities persist independently of listing, cap at three, and synchronize after another tab writes', () => {
  const store = storage(), first = createPriorities(() => store);
  const wanted = ['Fitness & outdoors', 'Food & social', 'Work & study'];
  wanted.forEach(label => first.toggle(label));
  first.toggle('Daily essentials');
  assert.deepEqual(first.selected, wanted);
  const second = createPriorities(() => store);
  assert.deepEqual(second.selected, wanted);
  second.toggle('Work & study'); first.reload();
  assert.deepEqual(first.selected, wanted.slice(0, 2));
  store.setItem(PRIORITY_KEY, null); first.reload();
  assert.deepEqual(first.selected, []);
});
test('corrupt or unknown preference values reset safely without accepting partial data', () => {
  for (const raw of ['{', 'null', '{"version":2,"selected":[]}',
    '{"version":1,"selected":["invented"]}',
    '{"version":1,"selected":["Work & study","Work & study"]}'])
    assert.deepEqual(parsePriorities(raw), []);
});
test('unavailable or full browser storage keeps choices usable in memory', () => {
  const preferences = createPriorities(() => { throw Error('blocked'); });
  preferences.toggle('Work & study'); preferences.reload();
  assert.deepEqual(preferences.selected, ['Work & study']);
  assert.equal(preferences.persisted, false);
  const full = createPriorities(() => ({getItem: () => null, setItem: () => { throw Error('full'); }}));
  full.toggle('Food & social');
  assert.deepEqual(full.selected, ['Food & social']);
  assert.equal(full.persisted, false);
});
test('listing picker retains 13 sources, syncs landing selection and selects discovered listing without duplicates', () => {
  const options = [], events = {};
  const select = { value: '', ownerDocument: { createElement: () => ({}) },
    append: option => options.push(option), addEventListener: (event, fn) => { events[event] = fn; } };
  let selected;
  const picker = createListingPicker(select, [...auditedExamples, ...additionalExamples], listing => { selected = listing; });
  assert.equal(options.length, 13);
  const discovered = {id: 'discovery-example', name: 'Discovered property'};
  picker.select(discovered); picker.select(discovered);
  assert.equal(options.length, 14);
  assert.equal(select.value, discovered.id);
  events.change(); assert.equal(selected, discovered);
  picker.select(auditedExamples[0]);
  assert.equal(select.value, auditedExamples[0].id);
  select.value = discovered.id; events.change(); assert.equal(selected, discovered);
});
test('recent searches are bounded, deduplicated, and safe with corrupt data', () => {
  let history = [];
  for (let i = 0; i < 10; i++) history = rememberSearch(history, {kind:'query',value:`Address ${i}`});
  assert.equal(history.length, 6);
  history = rememberSearch(history, {kind:'query',value:'ADDRESS 8'});
  assert.equal(history.length, 6);
  assert.equal(history[0].value, 'ADDRESS 8');
  assert.equal(history.filter(item => item.value.toLowerCase() === 'address 8').length, 1);
  assert.deepEqual(parseSearchHistory('broken'), []);
  assert.deepEqual(parseSearchHistory('[{"kind":"unknown","value":"x"}]'), []);
  assert.deepEqual(parseSearchHistory(JSON.stringify(history)), history);
});
