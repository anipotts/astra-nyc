import { walkable } from './estimate-model.js';
// Choose a clear opening view locally; the source geometry stays unchanged.
export function openingYaw(scene) {
  const original=scene.spawn.yaw*Math.PI/180;
  let best=original,score=-Infinity;
  for(let i=0;i<36;i++){
    const yaw=original+i*Math.PI/18;
    let visible=0;
    for(const offset of [-.32,0,.32]){
      for(let d=.3;d<=7;d+=.2){
        if(!walkable(scene,scene.spawn.x-Math.sin(yaw+offset)*d,scene.spawn.z-Math.cos(yaw+offset)*d,.08))break;
        visible+=offset===0?.4:.2;
      }
    }
    if(visible>score){score=visible;best=yaw;}
  }
  return best;
}
