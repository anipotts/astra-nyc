import { validateEstimate } from './estimate-model.js';
const cache=new Map();
let rendererModule;
const loadRenderer=()=>rendererModule ||= import('./estimate-scene.js');
export function mountEstimatedInterior(host,{onSource}={}) {
  let active=true,destroyed=false,request=null,generation=0,scene=null,identity='';
  const status=document.createElement('p');status.className='iv-estimate-status';status.setAttribute('role','status');
  const stage=document.createElement('div');stage.className='iv-estimate-stage';
  const tools=document.createElement('div');tools.className='iv-estimate-tools';
  const badge=document.createElement('span');badge.className='iv-badge ui-chip';badge.textContent='Estimated interior · first person';
  const reset=document.createElement('button');reset.className='ui-button';reset.type='button';reset.textContent='Reset view';reset.addEventListener('click',()=>scene?.reset());
  const help=document.createElement('p');help.className='iv-estimate-help';help.textContent='W A S D / arrows to move · Drag to look · Home to reset';
  tools.append(badge,reset);host.append(stage,tools,status,help);
  async function update({sourceUrl,listingId,active:visible=true}) {
    active=visible;scene?.setActive(active);if(!active)return;
    const key=`${listingId}:${sourceUrl}`;
    if(identity===key&&scene)return;
    identity=key;request?.abort();const turn=++generation;request=new AbortController();
    scene?.destroy();scene=null;status.hidden=false;status.textContent='Astra is estimating this apartment from its published plan…';reset.disabled=true;
    try {
      // Download/parse rendering code while Astra works, rather than afterward.
      const readyRenderer=loadRenderer();
      void readyRenderer.catch(()=>{});
      let receipt=cache.get(key);
      if(receipt&&Date.now()-receipt.savedAt>30*60*1000){cache.delete(key);receipt=null;}
      if(receipt)receipt={...receipt,cached:true};
      if(!receipt){
        const response=await fetch('/api/interiors/estimate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({listingId,sourceUrl}),signal:AbortSignal.any([request.signal,AbortSignal.timeout(80000)])});
        const payload=await response.json();if(!response.ok)throw new Error(payload.error||'The estimated interior could not load.');
        if(payload.sourceUrl!==sourceUrl||payload.representation!=='estimated_interior')throw new Error('The interior did not match this source.');
        receipt={...payload,scene:validateEstimate(payload.scene,listingId),savedAt:Date.now()};cache.set(key,receipt);
      }
      const {createEstimateScene}=await readyRenderer;
      if(destroyed||turn!==generation||!active)return;
      scene=createEstimateScene(stage,receipt.scene);status.hidden=true;reset.disabled=false;
      help.textContent='W A S D / arrows to move · Drag to look · Home to reset';
      onSource?.(receipt);
    }catch(error){if(!destroyed&&turn===generation&&active){status.hidden=false;status.textContent=error.name==='AbortError'||error.name==='TimeoutError'?'Interior generation timed out. Open Plans to view the original drawing.':error.message;help.textContent='Open Plans for the published drawing. No substitute apartment is shown.';}}
  }
  return {update,setActive(value){active=Boolean(value);scene?.setActive(active);if(!active){generation++;request?.abort();}},destroy(){destroyed=true;generation++;request?.abort();scene?.destroy();host.replaceChildren();}};
}
