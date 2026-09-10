import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRoute, routeRequest, routeKey, DEMO_DESTINATION, externalDirections } from '../src/commute-view/route.js';
import { createRouteController } from '../src/commute-view/controller.js';
import { createRouteProvider, providerUrl, createCommuteMiddleware } from '../server/commute-view/provider.js';
import { createCommuteMapLayer } from '../src/commute-view/map-layer.js';
import { getExampleLocation } from '../src/example-locations.js';
import { Readable } from 'node:stream';
// Synthetic provider responses are internal regression inputs only, never an app fallback.
const request = { origin: getExampleLocation('wall2308'), destination: DEMO_DESTINATION, mode: 'walking' };
const geometry = { type: 'LineString', coordinates: [[-74.007,40.704],[-74.011,40.711]] };
const payload = () => ({ code: 'Ok', routes: [{ duration: 600, distance: 900, geometry, legs: [{ steps: [{ name: 'Test street', mode: 'walking', distance: 900, duration: 600, geometry, maneuver: { type: 'depart', location: geometry.coordinates[0] } }] }] }], waypoints: geometry.coordinates.map(location => ({ location, distance: 10 })) });
const normalized = r => normalizeRoute(payload(), r || request);
test('separate graph deployments for walking, bike and drive; transit rejected', () => {
  for (const [mode,profile] of [['walking','foot'],['bicycling','bike'],['driving','car']]) assert.match(providerUrl({...request,mode}), new RegExp(`/routed-${profile}/route/v1/${profile}/`));
  assert.throws(() => providerUrl({...request,mode:'transit'}));
  assert.throws(() => routeRequest({...request,origin:null}));
  assert.notEqual(routeKey(request), routeKey({...request,mode:'driving'}));
});
test('route evidence preserves geometry, mode, time, network gaps; rejects bad data', () => {
  const result = normalized(); assert.equal(result.mode,'walking'); assert.deepEqual(result.geometry,geometry); assert.equal(result.traffic,false); assert.ok(Date.parse(result.observedAt));
  for (const bad of [null, {code:'NoRoute'}, {...payload(),waypoints:[]}, {...payload(),routes:[{...payload().routes[0],duration:-1}]}]) assert.throws(() => normalizeRoute(bad,request));
  const distant = payload(); distant.waypoints[0].distance = 400; assert.throws(() => normalizeRoute(distant,request), /close enough/);
});
test('external directions encode user text and selected mode', () => {
  const url = new URL(externalDirections('95 Wall Street', '3 World Trade Center & plaza', 'transit'));
  assert.equal(url.searchParams.get('destination'),'3 World Trade Center & plaza'); assert.equal(url.searchParams.get('travelmode'),'transit');
  assert.equal(externalDirections(null,'WTC','walking'),null);
});
test('stale responses discarded even if acquisition ignores abort', async () => {
  let resolve; let signal;
  const controller = createRouteController({ acquire: (_, options) => { signal = options.signal; return new Promise(r => resolve=r); } });
  const work = controller.request(request); controller.invalidate(); assert.equal(signal.aborted,true); resolve(normalized()); await work;
  assert.equal(controller.state.route,null); assert.equal(controller.state.status,'idle');
});
test('identical route cached, mode change gets own result, transit makes no call', async () => {
  let count=0; const controller=createRouteController({ acquire: async r => {count++;return normalized(r);} });
  await controller.request(request); await controller.request(request); assert.equal(count,1); assert.equal(controller.state.route.cached,true);
  await controller.request({...request,mode:'driving'}); assert.equal(count,2);
  await controller.request({...request,mode:'transit'}); assert.equal(count,2); assert.equal(controller.state.status,'external');
});
test('failure is recoverable, destroy aborts and suppresses late response', async () => {
  let calls=0; const controller=createRouteController({acquire:async () => {if(++calls===1)throw new Error('offline');return normalized();}});
  await controller.request(request); assert.equal(controller.state.status,'error'); await controller.request(request); assert.equal(controller.state.status,'ready'); controller.destroy(); assert.equal(controller.state.route,null);
});
test('provider coalesces identical requests and rejects bad response', async () => {
  let calls=0;
  const provider=createRouteProvider({root:'https://route-test.example', gate:async()=>async()=>{}, fetchFn:async()=>{calls++;return new Response(JSON.stringify(payload()),{headers:{'content-type':'application/json'}});}});
  const [a,b]=await Promise.all([provider(request),provider(request)]); assert.equal(calls,1); assert.equal(a.cached,false); assert.equal(b.cached,true);
  assert.equal((await provider(request)).cached,true);
  const bad=createRouteProvider({root:'https://bad-test.example',gate:async()=>async()=>{},fetchFn:async()=>new Response('nope',{headers:{'content-type':'text/html'}})}); await assert.rejects(bad(request), /unsupported/);
});
test('middleware denies cross-origin, missing identity and unsupported transit', async () => {
  const middleware=createCommuteMiddleware();
  async function run(body, origin='http://127.0.0.1:5182') { const req=Readable.from([JSON.stringify(body)]); Object.assign(req,{url:'/api/commute',method:'POST',headers:{host:'127.0.0.1:5182',origin,'content-type':'application/json'}}); let status; await middleware(req,{writeHead(s){status=s;},end(){}},()=>{}); return status; }
  assert.equal(await run(request,'https://evil.example'),403); assert.equal(await run({...request,origin:null}),400); assert.equal(await run({...request,mode:'transit'}),422);
});
test('map uses GeoJSON sources, clears stale geometry and honors reduced motion', () => {
  const sources=new Map(), layers=new Map(); let fit;
  const map={isStyleLoaded:()=>true,on(){},off(){},stop(){},getSource:id=>sources.get(id),addSource(id,s){sources.set(id,{...s,setData(data){this.data=data;}});},getLayer:id=>layers.get(id),addLayer:l=>layers.set(l.id,l),removeLayer:id=>layers.delete(id),removeSource:id=>sources.delete(id),fitBounds:(bounds,options)=>fit={bounds,options}};
  const layer=createCommuteMapLayer(map,{reducedMotion:()=>true}); const route=normalized();layer.setRoute(route);assert.deepEqual(sources.get('commute-route').data.geometry,geometry);layer.fit({bounds:route.bounds,duration:500});assert.equal(fit.options.duration,0);layer.setRoute(null);assert.deepEqual(sources.get('commute-route').data.features,[]);layer.destroy();assert.equal(sources.size,0);
});
