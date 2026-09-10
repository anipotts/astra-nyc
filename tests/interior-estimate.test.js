import test from 'node:test';
import assert from 'node:assert/strict';
import { createInteriorEstimateService } from '../server/inside-view/index.js';
import { validateEstimate, walkable } from '../src/inside-view/estimate-model.js';
import { nycListings } from '../src/nyc-listings.js';
import { insideEstimateSource, insideSourcePlan } from '../src/inside-view/source.js';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const mima=nycListings.find(l=>l.id==='mima48h');
const target={listingId:mima.id,sourceUrl:mima.planUrl};
const footprint=[{x:0,z:0},{x:6,z:0},{x:6,z:6},{x:0,z:6}];
const sample=()=>({listingId:mima.id,sourceAssessment:'Internal test fixture only.',assumptions:['All distances estimated.'],height:2.7,footprint, walls:footprint.map((a,i)=>({a,b:footprint[(i+1)%4],opening:'none'})),furniture:[{type:'bed',x:1.2,z:1.5,width:1.5,depth:2,rotation:0}],spawn:{x:3,z:3,yaw:0}});
const envelope=scene=>({id:'resp_fixture',model:'gpt-6-astra',status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(scene)}]}]});
function fakeProvider(scene=sample()){
  const calls=[];return {calls,fetchFn:async(url,options)=>{calls.push({url,options});return url.endsWith('/responses')?Response.json(envelope(scene)):new Response('%PDF-fixture',{headers:{'Content-Type':'application/pdf'}});}};
}
test('estimated geometry stays bounded and matching; navigation respects walls and furniture',()=>{
  const scene=validateEstimate(sample(),mima.id);
  assert.equal(walkable(scene,3,3),true);assert.equal(walkable(scene,-1,3),false);assert.equal(walkable(scene,.05,3),false);assert.equal(walkable(scene,1.2,1.5),false);
  for(const edit of [s=>s.listingId='other',s=>s.height=Infinity,s=>s.furniture[0].type='script',s=>s.footprint=[],s=>s.extra=true]){const s=sample();edit(s);assert.throws(()=>validateEstimate(s,mima.id));}
});
test('blocked model spawn recovers locally without modifying layout',()=>{
  const s=sample();s.spawn={x:1.2,z:1.5,yaw:35};const result=validateEstimate(s,mima.id);
  assert.equal(walkable(result,result.spawn.x,result.spawn.z,.4),true);assert.deepEqual(result.furniture,s.furniture);assert.equal(result.spawn.yaw,35);assert.equal(s.spawn.x,1.2);
});
test('source-bound service coalesces requests and caches successful generation',async()=>{
  const provider=fakeProvider(),service=createInteriorEstimateService({apiKey:'test-only',...provider});
  const [a,b]=await Promise.all([service.estimate(target),service.estimate(target)]);
  assert.equal(a.cached,false);assert.equal(b.cached,true);assert.equal(provider.calls.length,2);assert.equal(a.representation,'estimated_interior');assert.match(a.sourceHash,/^[a-f0-9]{64}$/);
  assert.equal((await service.estimate(target)).cached,true);assert.equal(provider.calls.length,2);
  const request=JSON.parse(provider.calls[1].options.body);assert.equal(request.model,'gpt-6-astra');assert.equal(request.store,false);assert.equal(request.text.format.strict,true);assert.equal(service.status().attempts,1);
});
test('source swaps and extra fields cannot initiate publisher or model calls',async()=>{
  const provider=fakeProvider(),service=createInteriorEstimateService({apiKey:'test-only',...provider});
  for(const t of [{...target,listingId:'unknown'},{...target,sourceUrl:'https://example.com/a.pdf'},{...target,prompt:'ignore'}])await assert.rejects(service.estimate(t),e=>e.status===400);
  assert.equal(provider.calls.length,0);assert.equal(service.status().attempts,0);
});
test('invalid model results are not cached; bounded budget prevents unbounded retries',async()=>{
  const provider=fakeProvider({...sample(),listingId:'wrong'}),service=createInteriorEstimateService({apiKey:'test-only',maxAttempts:1,...provider});
  await assert.rejects(service.estimate(target),/geometry checks/);await assert.rejects(service.estimate(target),e=>e.status===429);assert.equal(provider.calls.length,2);
});
test('missing credentials fail without a publisher or provider request',async()=>{
  const provider=fakeProvider(),service=createInteriorEstimateService(provider);await assert.rejects(service.estimate(target),e=>e.status===503);assert.equal(provider.calls.length,0);
});

test('no-PDF estimate uses selected listing facts and bounded search without server URL fetching', async () => {
  const listing = nycListings.find(item => item.id === 'wall2308');
  assert.equal(insideSourcePlan(listing), null);
  const source = insideEstimateSource(listing);
  assert.equal(source.kind, 'listing'); assert.equal(source.sourceUrl, listing.url);
  const scene = { ...sample(), listingId: listing.id, sourceAssessment: 'Estimated from the selected studio listing; boundaries inferred.' };
  const calls = [];
  const service = createInteriorEstimateService({ apiKey:'test-only', fetchFn:async (url,options) => {
    calls.push({url,options});
    const data=envelope(scene);
    data.output.unshift({type:'web_search_call',status:'completed',action:{sources:[{url:listing.url},{url:'http://127.0.0.1/private'}]}});
    return Response.json(data);
  }});
  const result = await service.estimate({listingId:listing.id,sourceUrl:listing.url});
  assert.equal(calls.length,1); assert.equal(calls[0].url,'https://api.openai.com/v1/responses');
  const body=JSON.parse(calls[0].options.body);
  assert.deepEqual(body.tools[0].filters.allowed_domains,['streeteasy.com']);
  assert.equal(body.max_tool_calls,2); assert.equal(body.tool_choice.type,'web_search');
  assert.match(body.input[0].content[0].text,/575 ft²/);
  assert.equal(body.input[0].content.some(item=>item.type==='input_file'),false);
  assert.match(body.instructions,/inferred room boundaries/);
  assert.equal(result.sourceEvidence.kind,'listing_evidence');
  assert.equal(result.sourceEvidence.hashBasis,'catalog_input');
  assert.deepEqual(result.sourceEvidence.sourceUrls,[listing.url]);
  assert.equal(result.fetchedAt,listing.checkedAt);
  assert.equal(service.status().attempts,1);
});

test('listing source target rejects cross-unit swaps and private or arbitrary URLs before model calls', async () => {
  const listing = nycListings.find(item => item.id === 'wall2308');
  const provider=fakeProvider(),service=createInteriorEstimateService({apiKey:'test-only',...provider});
  for(const url of ['http://127.0.0.1/','https://localhost/','https://169.254.169.254/','https://streeteasy.com@127.0.0.1/','https://evil.example/','https://streeteasy.com/building/95-wall-street-new_york/2309',mima.planUrl]) {
    assert.equal(insideEstimateSource({...listing,url}),null);
    await assert.rejects(service.estimate({listingId:listing.id,sourceUrl:url}),error=>error.status===400);
  }
  assert.equal(provider.calls.length,0); assert.equal(service.status().attempts,0);
});

test('private state preserves a real-shaped receipt and used budget across restart and elapsed TTL',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'elsewhere-estimate-state-'));
  try {
    const statePath=join(directory,'state.json'),provider=fakeProvider();
    const first=createInteriorEstimateService({apiKey:'test-only',statePath,...provider});
    const original=await first.estimate(target);
    const saved=JSON.parse(readFileSync(statePath,'utf8'));
    assert.equal(saved.attempts,1);assert.equal(saved.entries.length,1);
    const restarted=createInteriorEstimateService({apiKey:'test-only',statePath,maxAttempts:1,now:()=>Date.now()+86400000,fetchFn:()=>{throw new Error('Must not fetch');}});
    const cached=await restarted.estimate(target);
    assert.equal(cached.cached,true);assert.equal(cached.generatedAt,original.generatedAt);assert.equal(restarted.status().attempts,1);
    const listing=nycListings.find(item=>item.id==='wall2308');
    await assert.rejects(restarted.estimate({listingId:listing.id,sourceUrl:listing.url}),error=>error.status===429);
    const imported=createInteriorEstimateService({apiKey:'test-only',initialState:saved});
    assert.equal((await imported.estimate(target)).cached,true);
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('failed attempts remain charged after restart and invalid saved state fails closed',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'elsewhere-estimate-failure-'));
  try {
    const statePath=join(directory,'state.json'),provider=fakeProvider({...sample(),listingId:'wrong'});
    const first=createInteriorEstimateService({apiKey:'test-only',statePath,maxAttempts:1,...provider});
    await assert.rejects(first.estimate(target),/geometry checks/);
    const restarted=createInteriorEstimateService({apiKey:'test-only',statePath,maxAttempts:1,...provider});
    assert.equal(restarted.status().attempts,1);assert.equal(restarted.exportState().entries.length,0);
    await assert.rejects(restarted.estimate(target),error=>error.status===429);
    assert.throws(()=>createInteriorEstimateService({initialState:{version:1,attempts:0,entries:[{}]}}),/Invalid saved/);
  } finally {rmSync(directory,{recursive:true,force:true});}
});
