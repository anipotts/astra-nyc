import test from 'node:test';
import assert from 'node:assert/strict';
import { createAutomaticRoute } from '../src/commute-view/automatic-route.js';
import { normalizeRoute, DEMO_DESTINATION } from '../src/commute-view/route.js';
import { getExampleLocation } from '../src/example-locations.js';
const intent = { active: true, listingId: 'wall2308', origin: getExampleLocation('wall2308'), destination: DEMO_DESTINATION, mode: 'walking' };
const geometry = {type:'LineString',coordinates:[[-74.007,40.704],[-74.011,40.711]]};
const result = request => normalizeRoute({code:'Ok',routes:[{duration:600,distance:900,geometry,legs:[{steps:[{name:'Internal test segment',mode:request.mode,duration:600,distance:900,geometry,maneuver:{type:'depart',location:geometry.coordinates[0]}}]}]}],waypoints:geometry.coordinates.map(location=>({location,distance:10}))},request);
const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
function harness(acquire) {
  const timers = new Map(); let id=0; const requests=[];
  const automatic = createAutomaticRoute({schedule:fn=>{timers.set(++id,fn);return id;},cancel:key=>timers.delete(key),acquire:acquire || (async request=>{requests.push(request);return result(request);})});
  return {automatic,requests,timers,async flush(){const callbacks=[...timers.values()];timers.clear();callbacks.forEach(fn=>fn());await settle();}};
}
test('active resolved entry requests once; equivalent/priority-only updates do not fetch or reschedule', async () => {
  const h=harness();assert.equal(h.automatic.update(intent),true);assert.equal(h.requests.length,0);
  assert.equal(h.automatic.update({...intent,priorities:['Getting around'],origin:{...intent.origin}}),false);
  await h.flush();assert.equal(h.requests.length,1);assert.equal(h.automatic.state.status,'ready');
  h.automatic.update({...intent,priorities:['Daily essentials']});await h.flush();assert.equal(h.requests.length,1);
  h.automatic.destroy();
});
test('rapid mode/listing/view changes debounce and inactive clears queued work', async () => {
  const h=harness();h.automatic.update(intent);h.automatic.update({...intent,mode:'bicycling'});h.automatic.update({...intent,mode:'driving'});
  await h.flush();assert.deepEqual(h.requests.map(r=>r.mode),['driving']);
  h.automatic.update({...intent,listingId:'zephyr501',origin:getExampleLocation('zephyr501')});h.automatic.update({...intent,active:false});await h.flush();
  assert.equal(h.requests.length,1);assert.equal(h.automatic.state.route,null);
  h.automatic.update({...intent,listingId:'zephyr501',origin:getExampleLocation('zephyr501')});await h.flush();
  assert.equal(h.requests.length,2);assert.equal(h.requests.at(-1).origin.id,getExampleLocation('zephyr501').id);h.automatic.destroy();
});
test('typing has no acquisition; resolved candidate requests automatically; transit cancels immediately', async () => {
  const h=harness();h.automatic.update({...intent,destination:null});await h.flush();assert.equal(h.requests.length,0);
  h.automatic.update(intent);await h.flush();assert.equal(h.requests.length,1);
  h.automatic.update({...intent,mode:'transit'});assert.equal(h.automatic.state.route,null);await h.flush();assert.equal(h.requests.length,1);
  h.automatic.update({...intent,origin:null});await h.flush();assert.equal(h.requests.length,1);h.automatic.destroy();
});
test('return to Commute replays cache and preserves current destination/mode', async () => {
  const h=harness(), chosen={...intent,mode:'bicycling',destination:getExampleLocation('zephyr501')};
  h.automatic.update(chosen);await h.flush();h.automatic.update({...chosen,active:false});h.automatic.update(chosen);await h.flush();
  assert.equal(h.requests.length,1);assert.equal(h.automatic.state.route.cached,true);assert.equal(h.automatic.state.route.destination.id,chosen.destination.id);assert.equal(h.automatic.state.route.mode,'bicycling');h.automatic.destroy();
});
test('failed route waits for explicit retry; priority updates and repeated context do not retry', async () => {
  let calls=0;const h=harness(async request=>{if(++calls===1)throw new Error('offline');return result(request);});
  h.automatic.update(intent);await h.flush();assert.equal(h.automatic.state.status,'error');
  h.automatic.update({...intent,priorities:['Getting around']});await h.flush();assert.equal(calls,1);
  h.automatic.retry();await h.flush();assert.equal(calls,2);assert.equal(h.automatic.state.status,'ready');
  h.automatic.retry();await h.flush();assert.equal(calls,2);h.automatic.destroy();
});
test('late responses cannot restore route after typing, transit or deactivation', async () => {
  for(const next of [{...intent,destination:null},{...intent,mode:'transit'},{...intent,active:false}]) {
    let complete,signal;const h=harness((request,options)=>{signal=options.signal;return new Promise(resolve=>complete=()=>resolve(result(request)));});
    h.automatic.update(intent);await h.flush();h.automatic.update(next);assert.equal(signal.aborted,true);complete();await settle();
    assert.equal(h.automatic.state.route,null);h.automatic.destroy();
  }
});
