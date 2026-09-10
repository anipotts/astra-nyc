import test from 'node:test';
import assert from 'node:assert/strict';
import { listingSummary } from '../src/listing-summary.js';
test('street address replaces repeated property name without inventing area or current rent', () => {
  const result = listingSummary({ name: 'MiMA #48H', mapAddress: '450 West 42nd Street, New York, NY 10036', facts: 'Alcove studio · 1 bath · H-line, floors 39–50', price: 'Check source for current rent', archived: true });
  assert.equal(result.address, '450 West 42nd Street');
  assert.equal(result.facts, 'Alcove studio · 1 bath');
  assert.equal(result.price, 'Rent unverified'); assert.equal(result.status, 'Archived listing');
  assert.match(result.details, /H-line/);
});
test('known quoted price and measurements stay verbatim, with no current availability claim', () => {
  const result = listingSummary({ name: '95 Wall Street #2308', mapAddress: '95 Wall Street, New York, NY', facts: 'Studio · 1 bath · 575 ft²', price: '$4,564 / month base rent', availability: 'Available when checked' });
  assert.equal(result.price, '$4,564 / month base rent');
  assert.equal(result.facts, 'Studio · 1 bath · 575 ft²');
  assert.equal(result.status, 'Availability unverified'); assert.equal(result.rentKnown, true);
});
test('missing street/facts use supplied identity and omit the facts line', () => {
  const result = listingSummary({ name: 'Unresolved candidate', location: 'Financial District, Manhattan', facts: 'Unit and listing details need review' });
  assert.equal(result.address, 'Unresolved candidate'); assert.equal(result.facts, '');
});
test('sourced numbered address and historical classification remain distinct', () => {
  const result = listingSummary({ name: 'Plan reference', location: '272 Grove Street, Jersey City', historical: true, archived: true, facts: '1 bed · 1.5 baths · 1,200 sq ft' });
  assert.equal(result.address, '272 Grove Street'); assert.equal(result.status, 'Historical source');
  assert.equal(result.facts, '1 bed · 1.5 baths · 1,200 sq ft');
});
