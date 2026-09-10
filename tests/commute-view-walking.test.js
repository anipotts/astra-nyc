import test from 'node:test';
import assert from 'node:assert/strict';
import { createWalkingPath, walkingAvailability, metersBetween } from '../src/commute-view/walking-model.js';
import { createWalkingSession } from '../src/commute-view/walking-session.js';
const geometry={type:'LineString',coordinates:[[-74.01,40.71],[-74.01,40.711],[-74.009,40.711]]};
const route={mode:'walking',geometry,steps:[{name:'Regression segment A',mode:'walking',distance:111},{name:'Regression segment B',mode:'walking',distance:84}]};
class Target {
  constructor(){this.listeners=new Map();this.attributes={};this.tabIndex=7;this.focused=false;}
  addEventListener(type,fn){this.listeners.set(type,fn);}removeEventListener(type){this.listeners.delete(type);}
  emit(type,event={}){event.preventDefault??=()=>{};this.listeners.get(type)?.(event);}
  getAttribute(key){return this.attributes[key]??null;}setAttribute(key,value){this.attributes[key]=value;}removeAttribute(key){delete this.attributes[key];}
  focus(){this.focused=true;}setPointerCapture(){}releasePointerCapture(){}
}
function setup(reducedMotion=()=>false) {
  const canvas=new Target(),windowTarget=new Target(),documentTarget=new Target(),frames=new Map(),jumps=[];let id=0,maxZoom=19,maxPitch=70;
  const handler={enabled:true,isEnabled(){return this.enabled;},disable(){this.enabled=false;},enable(){this.enabled=true;}};
  const map={getCanvas:()=>canvas,getCenter:()=>({lng:-74.01,lat:40.71}),getZoom:()=>15,getPitch:()=>35,getBearing:()=>20,getPadding:()=>({left:300,right:20,top:50,bottom:20}),getMaxPitch:()=>maxPitch,getMaxZoom:()=>maxZoom,setMaxPitch:v=>maxPitch=v,setMaxZoom:v=>maxZoom=v,setPadding(){},stop(){},dragPan:handler,
    calculateCameraOptionsFromTo(from,height,to,ground){assert.equal(height,1.7);assert.equal(ground,0);return {center:to,from,pitch:84,zoom:22,bearing:0};},jumpTo:camera=>jumps.push(camera)};
  const changes=[];let exits=0;
  const session=createWalkingSession(map,route,{reducedMotion,windowTarget,documentTarget,requestFrame:fn=>{frames.set(++id,fn);return id;},cancelFrame:key=>frames.delete(key),onChange:value=>changes.push(value),onExit:()=>exits++});
  return {session,map,canvas,windowTarget,documentTarget,frames,jumps,changes,handler,get exits(){return exits;},tick(time){const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(time));}};
}
test('walking path samples the sourced line, clamps ends and finds the next segment',()=>{
  const path=createWalkingPath(route);assert.ok(path.length>190&&path.length<200);assert.deepEqual(path.at(-1).coordinate,geometry.coordinates[0]);assert.deepEqual(path.at(Infinity).coordinate,geometry.coordinates[0]);
  assert.ok(metersBetween(path.at(40).coordinate,[-74.01,40.71036])<1);assert.equal(path.at(path.length+1).arrived,true);assert.deepEqual(path.at(path.length).coordinate,geometry.coordinates.at(-1));
  assert.ok(path.nextStop(0)>100);assert.equal(path.nextStop(path.length),path.length);assert.equal(path.nextStop(20,-1),0);
});
test('only sourced walking routes without ferry segments enable the camera',()=>{
  assert.match(walkingAvailability({...route,mode:'driving'}),/walking/);assert.match(walkingAvailability({...route,steps:[{mode:'ferry'}]}),/ferry/);
  assert.throws(()=>createWalkingPath({...route,geometry:{type:'LineString',coordinates:[[0,0],[0,0]]}}),/short/);
});
test('enter is stationary; held keys move; blur pauses; exit restores camera and navigation',()=>{
  const h=setup();assert.equal(h.changes.at(-1).distance,0);assert.equal(h.frames.size,0);assert.equal(h.handler.enabled,false);assert.equal(h.map.getMaxPitch(),89);
  h.canvas.emit('keydown',{key:'w'});h.tick(100);h.tick(150);assert.ok(h.changes.at(-1).distance>0);assert.equal(h.frames.size,1);
  h.canvas.emit('blur');assert.equal(h.frames.size,0);h.session.end();assert.equal(h.handler.enabled,true);assert.equal(h.map.getMaxPitch(),70);assert.equal(h.map.getMaxZoom(),19);assert.equal(h.canvas.tabIndex,7);assert.equal(h.canvas.getAttribute('aria-label'),null);assert.equal(h.canvas.listeners.size,0);assert.equal(h.windowTarget.listeners.size,0);assert.equal(h.jumps.at(-1).zoom,15);assert.equal(h.exits,1);h.session.end();assert.equal(h.exits,1);
});
test('look changes direction without moving; skip/seek stay on path and do not autoplay',()=>{
  const h=setup();h.session.action('right');assert.equal(h.changes.at(-1).distance,0);assert.equal(h.changes.at(-1).viewBearing,20);
  h.session.action('next');assert.ok(h.changes.at(-1).distance>100);assert.equal(h.frames.size,0);h.session.seek(1);assert.equal(h.changes.at(-1).arrived,true);
  h.session.action('back');assert.equal(h.changes.at(-1).arrived,false);h.session.action('speed');assert.equal(h.changes.at(-1).speed,4);h.session.end();
});
test('reduced motion steps once per key press; turning it on stops continuous movement',()=>{
  let reduced=true;const h=setup(()=>reduced);h.canvas.emit('keydown',{key:'w'});const first=h.changes.at(-1).distance;assert.equal(first,3);h.canvas.emit('keydown',{key:'w',repeat:true});assert.equal(h.changes.at(-1).distance,first);assert.equal(h.frames.size,0);
  reduced=false;h.canvas.emit('keydown',{key:'w'});assert.equal(h.frames.size,1);reduced=true;h.tick(500);assert.equal(h.frames.size,0);assert.equal(h.changes.at(-1).distance,first);h.session.end();
});
test('deactivation cancels held inputs without restoring the previous listing camera',()=>{
  const h=setup();h.canvas.emit('keydown',{key:'w'});h.tick(100);const count=h.jumps.length;h.session.end({restore:false});h.tick(200);assert.equal(h.frames.size,0);assert.equal(h.jumps.length,count);assert.equal(h.handler.enabled,true);assert.equal(h.canvas.listeners.size,0);
});
test('Space pauses and Escape exits; hidden documents cannot continue walking',()=>{
  const h=setup();h.canvas.emit('keydown',{key:'w'});h.canvas.emit('keydown',{key:' '});assert.equal(h.frames.size,0);h.canvas.emit('keydown',{key:'w'});h.documentTarget.hidden=true;h.documentTarget.emit('visibilitychange');assert.equal(h.frames.size,0);h.canvas.emit('keydown',{key:'Escape'});assert.equal(h.exits,1);
});
