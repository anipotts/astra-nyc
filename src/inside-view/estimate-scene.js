import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { walkable } from './estimate-model.js';
import { openingYaw } from './estimate-camera.js';

export function createEstimateScene(host, data) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#dddcd2');
  const renderer = new THREE.WebGLRenderer({antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.7));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','First-person estimated apartment in 3D. W A S D or arrow keys to move. Drag to look. Home resets the view.');
  host.append(renderer.domElement);
  const camera=new THREE.PerspectiveCamera(65,1,.035,80), mats=[],geos=[],textures=[];
  function material(color,roughness=.8){const m=new THREE.MeshStandardMaterial({color,roughness});mats.push(m);return m;}
  const plaster=material('#f0ede4'),trim=material('#fffaf0'),wood=material('#c2a480'),linen=material('#ded9c8'),green=material('#556b54'),dark=material('#303c38'),metal=material('#b0b6b4',.35),white=material('#f8f7f1',.4);
  // Deterministic surface detail, generated locally without additional images/API calls.
  const textureCanvas=document.createElement('canvas');textureCanvas.width=512;textureCanvas.height=512;
  const ctx=textureCanvas.getContext('2d');ctx.fillStyle='#bda280';ctx.fillRect(0,0,512,512);
  for(let row=0;row<8;row++){
    ctx.fillStyle=row%2?'#cbb290':'#bfa17b';ctx.fillRect(0,row*64,512,63);
    for(let i=0;i<42;i++){ctx.strokeStyle=`rgba(87,58,30,${.025+(i%4)*.015})`;ctx.beginPath();ctx.moveTo(0,row*64+i*1.5);ctx.bezierCurveTo(150,row*64+i*1.5+3,300,row*64+i*1.5-3,512,row*64+i*1.5);ctx.stroke();}
    ctx.fillStyle='#a98d6d';ctx.fillRect((row%3)*165,row*64,1,64);
  }
  const texture=new THREE.CanvasTexture(textureCanvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(.7,.7);texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.push(texture);
  const floorMat=new THREE.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:.008,roughness:.68});
  wood.map=texture;mats.push(floorMat);
  const fabricCanvas=document.createElement('canvas');fabricCanvas.width=fabricCanvas.height=128;
  const fabricContext=fabricCanvas.getContext('2d');fabricContext.fillStyle='#b8b8b8';fabricContext.fillRect(0,0,128,128);
  for(let i=0;i<128;i+=2){fabricContext.fillStyle=i%4?'#a8a8a8':'#d0d0d0';fabricContext.fillRect(i,0,1,128);fabricContext.fillStyle='#c7c7c7';fabricContext.fillRect(0,i,128,1);}
  const fabric=new THREE.CanvasTexture(fabricCanvas);fabric.wrapS=fabric.wrapT=THREE.RepeatWrapping;fabric.repeat.set(6,6);textures.push(fabric);
  linen.bumpMap=fabric;linen.bumpScale=.014;green.bumpMap=fabric;green.bumpScale=.01;
  metal.metalness=.65;
  function box(parent,w,h,d,x,y,z,mat,round=0){const geo=round?new RoundedBoxGeometry(w,h,d,2,Math.min(round,w/3,h/3,d/3)):new THREE.BoxGeometry(w,h,d);geos.push(geo);const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  const shape=new THREE.Shape();data.footprint.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();
  const geo=new THREE.ShapeGeometry(shape);geos.push(geo);
  const floor=new THREE.Mesh(geo,floorMat);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const ceiling=new THREE.Mesh(geo,plaster);ceiling.rotation.x=Math.PI/2;ceiling.scale.y=-1;ceiling.position.y=data.height;scene.add(ceiling);
  for(const w of data.walls){
    const length=Math.hypot(w.b.x-w.a.x,w.b.z-w.a.z),group=new THREE.Group();group.position.set((w.a.x+w.b.x)/2,0,(w.a.z+w.b.z)/2);group.rotation.y=-Math.atan2(w.b.z-w.a.z,w.b.x-w.a.x);scene.add(group);
    const gap=w.opening==='door'?Math.min(1.1,length*.8):length*.65;
    const solid=(width,height,x,y)=>box(group,width,height,.12,x,y,0,plaster);
    if(w.opening==='none') solid(length,data.height,0,data.height/2);
    else {
      const side=(length-gap)/2;solid(side,data.height,-(length+gap)/4,data.height/2);solid(side,data.height,(length+gap)/4,data.height/2);
      const top=w.opening==='door'?2.12:data.height-.24;solid(gap,data.height-top,0,(data.height+top)/2);
      if(w.opening==='door'){
        for(const sx of [-1,1]){box(group,.055,top,.17,sx*(gap/2+.025),top/2,0,trim);}
        box(group,gap+.1,.065,.17,0,top,0,trim);
      }
      if(w.opening==='window'){
        solid(gap,.75,0,.375);
        const glow=new THREE.MeshBasicMaterial({color:'#d3e2dc',side:THREE.DoubleSide});mats.push(glow);
        box(group,gap,top-.75,.025,0,(top+.75)/2,0,glow);
        box(group,.055,top-.75,.08,0,(top+.75)/2,.02,trim);box(group,gap,.05,.14,0,.77,0,trim);
      }
    }
    if(w.opening!=='door')box(group,length,.09,.15,0,.045,0,trim);
  }
  for(const f of data.furniture){
    const g=new THREE.Group();g.position.set(f.x,0,f.z);g.rotation.y=f.rotation*Math.PI/180;scene.add(g);
    const {width:w,depth:d}=f, b=(ww,hh,dd,x,y,z,m,r=.025)=>box(g,ww,hh,dd,x,y,z,m,r);
    if(f.type==='bed'){
      b(w,.24,d,0,.22,0,wood);b(w,.22,d*.96,0,.44,0,white,.07);b(w*.98,.1,d*.65,0,.58,d*.12,linen,.04);b(w,.8,.1,0,.48,-d/2,wood);
      for(const x of [-w*.25,w*.25])b(w*.43,.12,d*.22,x,.61,-d*.31,white,.06);
    } else if(f.type==='sofa'){
      b(w,.35,d,0,.28,0,green,.07);b(w,.55,d*.18,0,.63,-d*.41,green,.08);
      for(const x of [-w*.45,w*.45])b(w*.1,.42,d,x,.5,0,green,.04);
      for(const x of [-w*.22,w*.22])b(w*.43,.15,d*.72,x,.5,d*.05,linen,.06);
    }else if(f.type==='table'||f.type==='chair'){
      const h=f.type==='table'?.72:.44;b(w,.07,d,0,h,0,wood);
      for(const x of [-w*.4,w*.4])for(const z of [-d*.4,d*.4])b(.045,h,.045,x,h/2,z,dark,.005);
      if(f.type==='chair')b(w,.42,.055,0,.68,-d*.44,wood);
    }else if(f.type==='counter'){
      b(w,.86,d,0,.43,0,linen);b(w+.035,.045,d+.035,0,.88,0,white);
      for(let x=-w/2+.3;x<w/2;x+=.6){b(.012,.72,.018,x,.44,d/2,trim,.002);b(.14,.015,.03,x-.12,.72,d/2+.02,metal,.005);}
    }else if(f.type==='wardrobe'){b(w,2.1,d,0,1.05,0,linen);b(.012,2,.015,0,1.05,d/2,trim);b(.018,.22,.025,.07,1.1,d/2+.02,metal);}
    else if(f.type==='rug')b(w,.012,d,0,.013,0,linen,.004);
    else if(f.type==='plant'){
      b(w*.45,.4,d*.45,0,.2,0,white,.08);
      for(let i=0;i<7;i++){const leaf=b(w*.55,.045,d*.4,Math.sin(i)*w*.2,.55+i*.075,Math.cos(i)*d*.2,green,.025);leaf.rotation.set(.4,i,.35);}
    }else if(f.type==='bath') {b(w,.5,d,0,.25,0,white,.08);b(w*.78,.04,d*.75,0,.51,0,linen,.07);}
    else if(f.type==='toilet'){b(w*.8,.4,d*.65,0,.2,d*.15,white,.1);b(w,.65,d*.25,0,.325,-d*.36,white,.04);}
  }
  scene.add(new THREE.HemisphereLight('#fff7e8','#9a978a',2.0));
  const sun=new THREE.DirectionalLight('#fff2d9',3);sun.position.set(-4,8,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-15;sun.shadow.camera.right=15;sun.shadow.camera.top=15;sun.shadow.camera.bottom=-15;sun.shadow.normalBias=.035;scene.add(sun);
  const fill=new THREE.PointLight('#fff3df',25,20,2);fill.position.set(data.spawn.x,data.height-.3,data.spawn.z);scene.add(fill);
  const initialYaw=openingYaw(data);
  let x=data.spawn.x,z=data.spawn.z,yaw=initialYaw,pitch=-.04,active=true,frame=0,last=0,drag=null;
  const keys=new Set(),abort=new AbortController(),canvas=renderer.domElement;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  document.addEventListener('visibilitychange',()=>{if(document.hidden)keys.clear();},{signal:abort.signal});
  const listen=(type,fn)=>canvas.addEventListener(type,fn,{signal:abort.signal});
  function reset(){x=data.spawn.x;z=data.spawn.z;yaw=initialYaw;pitch=-.04;keys.clear();draw();}
  function draw(){
    camera.position.set(x,1.65,z);
    camera.lookAt(x-Math.sin(yaw)*3,1.65+pitch*3,z-Math.cos(yaw)*3);
    renderer.render(scene,camera);
    renderer.shadowMap.autoUpdate=false;
  }
  function wake(){if(active&&!frame){last=performance.now();frame=requestAnimationFrame(tick);}}
  function tick(time){frame=0;if(!active||!keys.size)return;const dt=Math.min((time-last)/1000,.04);last=time;
    let forward=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown')),side=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
    const norm=Math.hypot(forward,side)||1,dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)/norm*dt*1.5,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)/norm*dt*1.5;
    if(walkable(data,x+dx,z))x+=dx;if(walkable(data,x,z+dz))z+=dz;
    if(forward||side)draw();frame=requestAnimationFrame(tick);
  }
  listen('keydown',e=>{const key=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','home'].includes(key)){e.preventDefault();if(key==='home')reset();else if(reduced.matches){if(e.repeat)return;const f=key==='w'||key==='arrowup'?1:key==='s'||key==='arrowdown'?-1:0,side=key==='d'||key==='arrowright'?1:key==='a'||key==='arrowleft'?-1:0;const dx=(-Math.sin(yaw)*f+Math.cos(yaw)*side)*.2,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*side)*.2;if(walkable(data,x+dx,z))x+=dx;if(walkable(data,x,z+dz))z+=dz;draw();}else{keys.add(key);wake();}}});
  listen('keyup',e=>keys.delete(e.key.toLowerCase()));listen('blur',()=>{keys.clear();drag=null;});
  listen('pointerdown',e=>{if(e.button!==0)return;canvas.focus();canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY};});
  listen('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-drag.x)*.005;pitch=Math.max(-.35,Math.min(.35,pitch-(e.clientY-drag.y)*.003));drag={x:e.clientX,y:e.clientY};draw();});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(type,()=>{drag=null;});
  const observer=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();draw();});observer.observe(host);
  draw();
  return { reset, setActive(value){active=value;keys.clear();cancelAnimationFrame(frame);frame=0;if(active)draw();}, destroy(){active=false;cancelAnimationFrame(frame);abort.abort();observer.disconnect();geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();canvas.remove();} };
}
