import test from "node:test";
import assert from "node:assert/strict";
import { mountBuildingNotes } from "../src/building-notes/view.js";

class Element {
  constructor(tag, doc) { this.tagName=tag.toUpperCase(); this.ownerDocument=doc; this.children=[]; this.attributes={}; this.textContent=""; this.open=false; }
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  setAttribute(key,value){this.attributes[key]=value;}
  removeAttribute(key){delete this.attributes[key];}
  remove(){this.removed=true;}
}
const createContainer=()=>{const doc={createElement:tag=>new Element(tag,doc)};return new Element('div',doc);};
const walk=node=>[node,...node.children.flatMap(walk)];
const text=node=>walk(node).map(n=>n.textContent).join(' ');
const result = (message='No matching records in this window.') => ({coverage:'completed_no_matches',message,findings:[],checkedAt:'2026-09-10T20:20:00Z',identity:{label:'95 WALL STREET, MANHATTAN'},window:{start:'2024-09-10',end:'2026-09-10'},limitation:'Complaints are reports, not verified violations.'});

test('opening loads once; mount, close and reopen do not trigger extra fetches', async () => {
  const container=createContainer();let calls=0;
  const view=mountBuildingNotes(container,{listing:{id:'wall',mapAddress:'95 Wall Street, New York, NY'},fetchFn:async()=>{calls++;return new Response(JSON.stringify(result()));}});
  const root=container.children[0];
  assert.equal(root.tagName,'DETAILS');assert.equal(root.open,false);assert.equal(calls,0);
  assert.equal(root.children[0].textContent,'Building notes');
  await view.load();assert.equal(calls,0);
  root.open=true; await root.ontoggle();assert.equal(calls,1);assert.match(text(root),/No matching records/);assert.match(text(root),/2024-09-10 through 2026-09-10/);
  root.open=false;await root.ontoggle();root.open=true;await root.ontoggle();assert.equal(calls,1);
  view.destroy();assert.equal(root.removed,true);
});

test('changing selected property aborts and discards delayed records from the previous building', async () => {
  const container=createContainer();let resolve, signal;
  const view=mountBuildingNotes(container,{listing:{id:'wall',mapAddress:'95 Wall Street, New York, NY'},fetchFn:async(_url,options)=>{signal=options.signal;return new Promise(r=>{resolve=r;});}});
  container.children[0].open=true;
  const loading=container.children[0].ontoggle();view.setListing({id:'mima',mapAddress:'450 West 42nd Street, New York, NY'});
  assert.equal(signal.aborted,true);assert.equal(container.children[0].open,false);
  resolve(new Response(JSON.stringify(result('OLD BUILDING RECORD'))));await loading;
  assert.ok(!text(container).includes('OLD BUILDING RECORD'));
  assert.equal(walk(container).find(n=>n.tagName==='BUTTON').disabled,false);
});

test('matched report retains agency outcome and hostile source URLs cannot become outgoing links', async () => {
  const container=createContainer();const data={...result(),coverage:'completed_with_matches',message:'Recent HPD complaint records',findings:[{id:'123',summary:'Reported condition.',receivedAt:'2026-08-18',status:'CLOSE',outcome:'HPD reported no violation in the inspected conditions.',sourceUrl:'javascript:alert(1)',question:'Ask about the inspection.',problems:[{category:'TEST',status:'CLOSE',agencyExplanation:'Original agency explanation.'}]}]};
  const view=mountBuildingNotes(container,{listing:{id:'wall',mapAddress:'95 Wall Street, New York, NY'},fetchFn:async()=>new Response(JSON.stringify(data))});
  container.children[0].open=true;await container.children[0].ontoggle();assert.match(text(container),/no violation in the inspected conditions/);assert.match(text(container),/Original agency explanation/);
  for(const link of walk(container).filter(n=>n.tagName==='A'))assert.match(link.href,/^https:\/\/(www\.nyc\.gov|data\.cityofnewyork\.us)\//);
});


test('failed first-open lookup exposes explicit retry; new identity waits for its own opening', async () => {
  const container=createContainer();const calls=[];
  const view=mountBuildingNotes(container,{listing:{id:'wall',mapAddress:'95 Wall Street, New York, NY'},fetchFn:async(_url,options)=>{calls.push(JSON.parse(options.body));return new Response(JSON.stringify({...result(),coverage:'unavailable'}));}});
  const root=container.children[0];root.open=true;await root.ontoggle();
  const button=walk(root).find(n=>n.tagName==='BUTTON');assert.equal(button.textContent,'Retry building records');
  await button.onclick();assert.equal(calls[1].refresh,true);
  view.setListing({id:'mima',mapAddress:'450 West 42nd Street, New York, NY'});
  assert.equal(root.open,false);assert.equal(calls.length,2);assert.equal(button.hidden,true);
  await root.ontoggle();assert.equal(calls.length,2);
  root.open=true;await root.ontoggle();assert.equal(calls.length,3);assert.match(calls[2].address,/450/);
});
