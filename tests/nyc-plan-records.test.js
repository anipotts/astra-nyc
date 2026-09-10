import test from 'node:test';
import assert from 'node:assert/strict';
import { nycInspectedPlans, nycPlanStudies } from '../src/nyc-plan-records.js';
import { acceptInspectedRegion } from '../src/inspected-plan.js';
import { inspectedPlans } from '../src/inspected-plan-records.js';

const study = nycPlanStudies[0];

test('MiMA observations cannot pass as accepted room geometry', () => {
  assert.deepEqual(nycInspectedPlans, []);
  assert.equal(study.acceptedGeometry, null);
  assert.equal(study.status, 'source_plan_only');
  assert.throws(() => acceptInspectedRegion(study, study.identity), /not accepted/);
  assert.equal('region' in study, false);
  for (const room of study.reportedDimensions) {
    assert.equal(room.boundaryStatus, 'not_accepted');
    assert.equal('polygon' in room, false);
    assert.equal('height' in room, false);
    assert.equal(room.basis, 'printed_dimension');
  }
});

test('unit-group mapping includes 48H without widening the printed floor range', () => {
  assert.equal(study.identity.scope, 'unit_group');
  assert.equal(study.identity.mappedUnits.length, 12);
  for (const unit of ['39H', '48H', '50H']) assert.ok(study.identity.mappedUnits.includes(unit));
  for (const unit of ['38H', '51H', '48G', '345']) assert.ok(!study.identity.mappedUnits.includes(unit));
  assert.equal(study.identity.unit, '48H');
});

test('source dimensions retain individual nominal labels without inferred calibration', () => {
  assert.deepEqual(study.reportedDimensions.map((room) => room.printed), ['11′10″ × 15′0″', '9′4″ × 11′5″']);
  assert.deepEqual(study.reportedDimensions[0].values, [11 + 10 / 12, 15]);
  assert.deepEqual(study.reportedDimensions[1].values, [9 + 4 / 12, 11 + 5 / 12]);
  assert.ok(study.geometryGaps.some((gap) => /endpoints/.test(gap)));
  assert.ok(study.geometryGaps.some((gap) => /ceiling/.test(gap)));
});

test('publication remains unknown, artwork metadata is qualified, and current availability is separate', () => {
  assert.equal(study.source.publishedAt, null);
  assert.equal(study.source.artworkDate, '2011-02-21');
  assert.match(study.source.artworkDateBasis, /metadata/);
  assert.equal(study.source.originalArtwork, 'link_only');
  assert.equal(study.source.sha256.length, 64);
  assert.equal(study.source.byteLength, 51579);
  assert.equal(study.listingObservation.archived, true);
  assert.ok(study.discrepancies.some((item) => /studio/.test(item)));
});

test('Charles evidence remains independent and cannot be relabeled as MiMA', () => {
  const charles = inspectedPlans[0];
  assert.throws(() => acceptInspectedRegion(charles, study.identity), /mapping/);
  const region = acceptInspectedRegion(charles, { building: 'charles-272-grove', unit: '345', label: 'Charles & Co #345' });
  assert.equal(region.representation, 'inspected_2d_region');
  assert.ok(Math.abs(region.width - 3.5052) < 1e-9);
  assert.equal(region.height, null);
});

test('inspection records cannot be accidentally mutated into geometry by consumers', () => {
  assert.throws(() => { study.acceptedGeometry = {}; }, TypeError);
  assert.throws(() => { study.identity.mappedUnits.push('51H'); }, TypeError);
  assert.throws(() => { nycInspectedPlans.push(study); }, TypeError);
});
