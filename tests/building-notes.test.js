import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { resolveNotesIdentity, buildingNotesQuery, normalizeBuildingNotes, createBuildingNotesService, createBuildingNotesMiddleware } from "../server/building-notes.js";
const time = Date.parse("2026-09-10T20:20:00Z");
const address = "450 West 42nd Street, New York, NY 10036";
const identity = resolveNotesIdentity({address});
// Minimal protocol fixture, not a demo allegation or source record.
const record = (patch = {}) => ({problem_id:"1",complaint_id:"2",building_id:"3",borough:"MANHATTAN",house_number:"450",street_name:"WEST 42 STREET",received_date:"2026-08-18T10:59:21.000",major_category:"TEST CATEGORY",minor_category:"TEST DETAIL",complaint_status:"CLOSE",problem_status:"CLOSE",status_description:"Test agency status.",problem_duplicate_flag:"N",...patch});
const json = value => new Response(JSON.stringify(value));

test("numbered street normalization preserves exact house identity and requires an unambiguous borough", () => {
  assert.equal(identity.street,"WEST 42 STREET"); assert.equal(identity.borough,"MANHATTAN");
  assert.equal(resolveNotesIdentity({address:"450 W 42nd St, Manhattan"}).street,identity.street);
  assert.equal(resolveNotesIdentity({address:"95 Wall Street, New York, NY"}).houseNumber,"95");
  assert.equal(resolveNotesIdentity({address:"56-27 2nd Street, Long Island City, NY"}).borough,"QUEENS");
  for (const input of [{address:"Wall Street, Manhattan"},{address:"450 West 42 Street"},{address,borough:"QUEENS"},{address:"450 West 42 Street #48H, Manhattan"}]) assert.equal(resolveNotesIdentity(input).status,"ambiguous");
  assert.equal(resolveNotesIdentity({address:"272 Grove Street, Jersey City, NJ"}).status,"not_supported");
});

test("official query is exact-address scoped, bounded by date and count, and omits apartment/person fields", () => {
  const query=buildingNotesQuery(identity,time), url=new URL(query.url);
  assert.equal(url.hostname,"data.cityofnewyork.us");
  assert.equal(url.searchParams.get('house_number'),'450');
  assert.equal(url.searchParams.get('street_name'),'WEST 42 STREET');
  assert.equal(url.searchParams.get('borough'),'MANHATTAN');
  assert.equal(url.searchParams.get('$limit'),'51');
  assert.ok(!url.searchParams.get('$select').includes('apartment'));
  assert.match(url.searchParams.get('$where'),/2024-09-10.*2026-09-10/);
});

test("problem IDs deduplicate while related problems stay one complaint and retain agency closure meaning", () => {
  const rows=[record(),record(),record({problem_id:'4',problem_duplicate_flag:'Y'})];
  const result=normalizeBuildingNotes(rows,identity);
  assert.equal(result.findings.length,1); assert.equal(result.findings[0].problems.length,2);
  assert.equal(result.findings[0].kind,'complaint'); assert.equal(result.findings[0].scope,'building');
  assert.equal(result.findings[0].problems[1].duplicateReported,true);
  assert.match(result.findings[0].outcome,/closure alone does not establish repair/);
  assert.equal(result.findings[0].problems[0].agencyExplanation,'Test agency status.');
  const noViolation=normalizeBuildingNotes([record({status_description:'The conditions observed did not violate the housing laws.'})],identity);
  assert.match(noViolation.findings[0].outcome,/no violation/);
  const noAccess=normalizeBuildingNotes([record({status_description:'An HPD Inspector was not able to gain access.'})],identity);
  assert.match(noAccess.findings[0].outcome,/does not establish repair/);
});

test("different address rows fail closed; multiple building IDs remain ambiguous", () => {
  for (const patch of [{house_number:'1450'},{borough:'QUEENS'},{street_name:'EAST 42 STREET'},{problem_id:null}])
    assert.throws(()=>normalizeBuildingNotes([record(patch)],identity));
  const result=normalizeBuildingNotes([record(),record({problem_id:'9',building_id:'99'})],identity);
  assert.equal(result.ambiguous,true); assert.deepEqual(result.findings,[]);
});

test("empty response, timeout, unavailable source and malformed response remain different from no issues", async () => {
  for(const [provider,coverage] of [
    [()=>json([]),'completed_no_matches'],
    [()=>new Response('unavailable',{status:503}),'unavailable'],
    [()=>json({records:[]}), 'unavailable'],
    [()=>{throw new DOMException('timed out','TimeoutError');},'unavailable'],
    [()=>json([record({house_number:'95'})]),'unavailable'],
  ]) {
    const result=await createBuildingNotesService({fetchFn:provider,now:()=>time})({address});
    assert.equal(result.coverage,coverage); assert.deepEqual(result.findings,[]);
    if(coverage==='completed_no_matches') assert.match(result.message,/does not establish no issues/);
  }
});

test("cache reuses requests, coalesces concurrency, supports refresh and expires", async () => {
  let calls=0,clock=time;
  const service=createBuildingNotesService({fetchFn:async()=>{calls++;return json([record()]);},now:()=>clock});
  const [first,second]=await Promise.all([service({address}),service({address})]);
  assert.equal(calls,1); assert.equal(first.coverage,'completed_with_matches'); assert.equal(second.cached,true);
  assert.equal((await service({address})).cached,true); assert.equal(calls,1);
  await service({address,refresh:true}); assert.equal(calls,2);
  clock+=31*60*1000; await service({address}); assert.equal(calls,3);
  assert.equal((await service({address:'450 West 42 Street'})).coverage,'ambiguous'); assert.equal(calls,3);
});

test("response cap is enforced and request origin/body validation prevents unscoped use", async () => {
  const oversized=await createBuildingNotesService({fetchFn:()=>new Response('x'.repeat(160001)),now:()=>time})({address});
  assert.equal(oversized.coverage,'unavailable');
  const middleware=createBuildingNotesMiddleware({fetchFn:()=>json([]),now:()=>time});
  async function invoke(body,origin='http://127.0.0.1:5174') {
    const req=Readable.from([JSON.stringify(body)]);
    Object.assign(req,{url:'/api/building-notes',method:'POST',headers:{host:'127.0.0.1:5174',origin,'content-type':'application/json'}});
    let result;
    await middleware(req,{writeHead(status){result={status};},end(body){result.body=JSON.parse(body);}},()=>{});
    return result;
  }
  assert.equal((await invoke({address})).body.coverage,'completed_no_matches');
  assert.equal((await invoke({address},'https://example.com')).status,403);
  assert.equal((await invoke({address,query:'arbitrary'})).status,400);
  assert.equal((await invoke({address:'x'.repeat(3000)})).status,413);
});
