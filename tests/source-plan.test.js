import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { approvedPlanUrl, fetchSourcePlan, createSourcePlanMiddleware, MAX_PLAN_BYTES } from '../server/source-plan.js';
const source = 'https://www.relatedrentals.com/sites/default/files/2021-04/MiMA_H_39-50.pdf';
const pdf = () => new Response('%PDF-1.4\nlocal fixture', {headers:{'content-type':'application/pdf'}});

test('only exact catalog PDF sources can be requested',()=>{
  assert.equal(approvedPlanUrl(source),source);
  for(const url of ['https://www.relatedrentals.com/other.pdf','http://www.relatedrentals.com/a.pdf','https://127.0.0.1/a.pdf','https://www.relatedrentals.com:443/a.pdf','https://my.matterport.com/show/?m=a']) assert.throws(()=>approvedPlanUrl(url));
});
test('fetch returns original bytes with current provenance without provider use',async()=>{
  const result=await fetchSourcePlan(source,{fetchFn:async(url,options)=>{ assert.equal(url,source);assert.equal(options.credentials,'omit');assert.equal(options.redirect,'manual');assert.ok(options.signal);return pdf(); }});
  assert.equal(result.bytes.toString(),'%PDF-1.4\nlocal fixture');assert.equal(result.finalUrl,source);assert.equal(result.sha256.length,64);assert.ok(Number.isFinite(Date.parse(result.fetchedAt)));
});
test('wrong types/signatures, oversized declared and streamed documents reject',async()=>{
  const responses=[new Response('html',{headers:{'content-type':'text/html'}}),new Response('not pdf',{headers:{'content-type':'application/pdf'}}),new Response('%PDF-', {headers:{'content-type':'application/pdf','content-length':String(MAX_PLAN_BYTES+1)}}),new Response(new Uint8Array(MAX_PLAN_BYTES+1),{headers:{'content-type':'application/pdf'}})];
  for(const response of responses) await assert.rejects(fetchSourcePlan(source,{fetchFn:async()=>response}));
});
test('every redirect stays on same approved PDF host and is capped at two',async()=>{
  for(const location of ['http://www.relatedrentals.com/a.pdf','https://silvermanbuilding.com/a.pdf','https://user:pass@www.relatedrentals.com/a.pdf','https://www.relatedrentals.com:443/a.pdf','/other.html','https://localhost/a.pdf']){
    let calls=0;await assert.rejects(fetchSourcePlan(source,{fetchFn:async()=>{calls++;return new Response(null,{status:302,headers:{location}});}}));assert.equal(calls,1);
  }
  let calls=0;await assert.rejects(fetchSourcePlan(source,{fetchFn:async()=>{calls++;return new Response(null,{status:302,headers:{location:'/other.pdf'}});}}));assert.equal(calls,3);
});
test('aborted fetch preserves cancellation signal',async()=>{
  const controller=new AbortController();controller.abort();
  await assert.rejects(fetchSourcePlan(source,{signal:controller.signal,fetchFn:async(url,{signal})=>{signal.throwIfAborted();return pdf();}}));
});
test('middleware rejects cross-origin/invalid requests before fetching and returns bytes for approved source',async()=>{
  let calls=0;const middleware=createSourcePlanMiddleware({fetchFn:async()=>{calls++;return pdf();}});
  const server=http.createServer((req,res)=>middleware(req,res,()=>{res.writeHead(404);res.end();}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin=`http://127.0.0.1:${server.address().port}`;
  try{
    let response=await fetch(`${origin}/api/plans/source`,{method:'POST',headers:{origin:'https://attacker.example','content-type':'application/json'},body:JSON.stringify({sourceUrl:source})});assert.equal(response.status,403);assert.equal(calls,0);
    response=await fetch(`${origin}/api/plans/source`,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({sourceUrl:source,extra:true})});assert.equal(response.status,400);assert.equal(calls,0);
    response=await fetch(`${origin}/api/plans/source`,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({sourceUrl:source})});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-plan-source'),source);assert.equal(await response.text(),'%PDF-1.4\nlocal fixture');assert.equal(calls,1);
  }finally{await new Promise(r=>server.close(r));}
});

test('client refuses oversized/signature-invalid bytes and documents beyond three pages',async()=>{
  const {validateSourcePlanBytes,validateSourcePlanPages}=await import('../src/source-plan/limits.js');
  validateSourcePlanBytes(new TextEncoder().encode('%PDF-1.4'));
  for(const value of [new Uint8Array(MAX_PLAN_BYTES+1),new TextEncoder().encode('<html>'),null]) assert.throws(()=>validateSourcePlanBytes(value));
  for(const count of [1,2,3]) validateSourcePlanPages(count);
  for(const count of [0,4,-1,Infinity,NaN,'1',1.2]) assert.throws(()=>validateSourcePlanPages(count));
});
