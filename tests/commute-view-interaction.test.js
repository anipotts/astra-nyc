import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { DEMO_DESTINATION, MODES, normalizeRoute } from '../src/commute-view/route.js';
import { getExampleLocation } from '../src/example-locations.js';
// Test actual view events with a small DOM adapter; stylesheet loading stays with Vite.
const hooks=registerHooks({load(url,context,next){return url.endsWith('/commute-view/styles.css')?{format:'module',source:'',shortCircuit:true}:next(url,context);}});
const {mountCommuteView}=await import('../src/commute-view/index.js');hooks.deregister();
class Element {
  constructor(){this.children=[];this.events={};this.attributes={};this.value='';this.hidden=false;this.disabled=false;this.classList={add(){},remove(){}};}
  querySelector(selector){this.nodes ??= new Map();if(!this.nodes.has(selector))this.nodes.set(selector,new Element());return this.nodes.get(selector);}
  querySelectorAll(){return [];}
  addEventListener(name,fn){this.events[name]=fn;} removeEventListener(name){delete this.events[name];}
  append(...children){this.children.push(...children);} replaceChildren(...children){this.children=children;}
  setAttribute(key,value){this.attributes[key]=value;} removeAttribute(key){delete this.attributes[key];} focus(){}
}
function setup(options={}) {
  const elements=new Map();const container=new Element();
  container.querySelector=selector=>{if(!elements.has(selector))elements.set(selector,new Element());return elements.get(selector);};
  const modes=Object.keys(MODES).map(mode=>Object.assign(new Element(),{dataset:{travelMode:mode}}));container.querySelectorAll=()=>modes;
  container.querySelector('.cv-destination').value='3 World Trade Center';
  globalThis.document={createElement:()=>new Element(),createTextNode:value=>value};
  const view=mountCommuteView(container,options);
  const context={active:true,selectedListing:{id:'wall2308',name:'95 Wall Street'},resolvedLocation:getExampleLocation('wall2308')};
  return {view,context,$:container.querySelector,modes};
}
const pause=()=>new Promise(resolve=>setTimeout(resolve,220));
function route(request) {
  const geometry={type:'LineString',coordinates:[[-74.007,40.704],[-74.011,40.711]]};
  return normalizeRoute({code:'Ok',routes:[{distance:900,duration:600,geometry,legs:[{steps:[{name:'Internal test segment',distance:900,duration:600,mode:request.mode,geometry,maneuver:{type:'depart',location:geometry.coordinates[0]}}]}]}],waypoints:geometry.coordinates.map(location=>({location,distance:10}))},request);
}
test('view removes Preview click, auto switches modes, and keeps priority updates quiet', async () => {
  const calls=[];const h=setup({acquire:async request=>{calls.push(request);return route(request);}});
  try {
    h.view.update(h.context);assert.equal(h.$('.cv-submit').hidden,true);await pause();assert.equal(calls.length,1);assert.equal(h.$('.cv-result').hidden,false);
    h.modes.find(b=>b.dataset.travelMode==='bicycling').onclick();await pause();assert.equal(calls.at(-1).mode,'bicycling');
    h.view.update({priorities:['Getting around']});await pause();assert.equal(calls.length,2);
    h.modes.find(b=>b.dataset.travelMode==='transit').onclick();assert.equal(h.$('.cv-result').hidden,true);assert.equal(h.$('.cv-submit').hidden,true);assert.match(h.$('.cv-external').href,/travelmode=transit/);await pause();assert.equal(calls.length,2);
  } finally {h.view.destroy();delete globalThis.document;}
});
test('typing only offers Find place; Enter lookup and candidate choice start route without another submit', async () => {
  let lookups=0;const calls=[];const candidate=getExampleLocation('zephyr501');
  const h=setup({acquire:async request=>{calls.push(request);return route(request);},resolveDestination:async()=>{lookups++;return {candidates:[candidate]};}});
  try {
    h.view.update(h.context);const input=h.$('.cv-destination');input.value='689 Marin Boulevard';input.events.input();await pause();
    assert.equal(calls.length,0);assert.equal(lookups,0);assert.equal(h.$('.cv-submit').textContent,'Find place');assert.equal(h.$('.cv-submit').hidden,false);
    await h.$('.cv-form').onsubmit({preventDefault(){}});assert.equal(lookups,1);assert.equal(calls.length,0);
    h.$('.cv-candidates').children[0].onclick();await pause();assert.equal(calls.length,1);assert.equal(calls[0].destination.id,candidate.id);assert.equal(h.$('.cv-submit').hidden,true);
    h.view.update({active:false});assert.equal(h.$('.cv-result').hidden,true);h.view.update({active:true});await pause();assert.equal(calls.length,1);assert.equal(h.$('.cv-freshness').textContent,'Cached route');
  } finally {h.view.destroy();delete globalThis.document;}
});
test('Retry route appears only after failure and retries on submit', async () => {
  let calls=0;const h=setup({acquire:async request=>{if(++calls===1)throw Error('offline');return route(request);}});
  try {
    h.view.update(h.context);await pause();assert.equal(h.$('.cv-submit').hidden,false);assert.equal(h.$('.cv-submit').textContent,'Retry route');
    h.view.update({priorities:[]});await pause();assert.equal(calls,1);
    await h.$('.cv-form').onsubmit({preventDefault(){}});assert.equal(h.$('.cv-submit').hidden,true);await pause();assert.equal(calls,2);assert.equal(h.$('.cv-result').hidden,false);
  } finally {h.view.destroy();delete globalThis.document;}
});
