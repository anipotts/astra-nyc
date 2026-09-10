// Google-issued public embeds captured through Maps' Share or embed image UI.
// Coordinates describe the panorama, not a surveyed building entrance.
export const streetViews = Object.freeze([
  { latitude:40.75908508199074, longitude:-73.99423900156438, label:'West 42nd Street', captured:'Apr 2026', reviewedAt:'2026-09-10T20:47:55Z', pano:'VMpSon7jy2db9JN4I3165w', embed:'https://www.google.com/maps/embed?pb=!4v1789073275049!6m8!1m7!1sVMpSon7jy2db9JN4I3165w!2m2!1d40.75908508199074!2d-73.99423900156438!3f0!4f0!5f0.4000000000000002' },
  { latitude:40.70489062010202, longitude:-74.00780139181721, label:'Water Street at Wall Street', captured:'Apr 2026', reviewedAt:'2026-09-10T20:50:34Z', pano:'fuaVOVXqxnUJeWpQtLeEgw', embed:'https://www.google.com/maps/embed?pb=!4v1789073434487!6m8!1m7!1sfuaVOVXqxnUJeWpQtLeEgw!2m2!1d40.70489062010202!2d-74.00780139181721!3f270!4f0!5f0.4000000000000002' },
]);
const valid = p => p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && Math.abs(p.latitude)<=90 && Math.abs(p.longitude)<=180;
export function streetViewUrl(location) {
  if (!valid(location)) return null;
  return 'https://www.google.com/maps/@?' + new URLSearchParams({api:'1',map_action:'pano',viewpoint:`${location.latitude},${location.longitude}`,pitch:'0'});
}
export function nearbyStreetView(location) {
  if (!valid(location)) return null;
  const distance = p => Math.hypot((p.latitude-location.latitude)*111320,(p.longitude-location.longitude)*111320*Math.cos(location.latitude*Math.PI/180));
  const source=[...streetViews].sort((a,b)=>distance(a)-distance(b))[0];
  return source && distance(source)<=120 ? source : null;
}
export function mountStreetView(container) {
  let returnFocus=null;
  container.className='street-surface';
  container.innerHTML='<div class="street-toolbar"><strong>Street View</strong><span class="street-location"></span><button class="ui-button ui-button--compact street-close" type="button">Back to route</button></div><div class="street-frame"></div><p class="street-help">Drag to look around · Click the street arrows to move</p>';
  const frameHost=container.querySelector('.street-frame'),help=container.querySelector('.street-help'),closeButton=container.querySelector('.street-close');
  function close({focus=true}={}) {
    if(container.hidden)return;
    container.hidden=true;frameHost.replaceChildren();document.body.classList.remove('street-view-open');
    if(focus&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
  }
  closeButton.onclick=()=>close();
  container.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close();}};
  // Cross-origin Street View owns its navigation; do not intercept its controls.
  const dismissHelp=()=>{if(document.activeElement===frameHost.firstElementChild)help.hidden=true;};
  window.addEventListener('blur',dismissHelp);
  return {
    open(location) {
      const source=nearbyStreetView(location),external=streetViewUrl(location);
      if(!external)return false;
      if(!source){window.open(external,'_blank','noopener,noreferrer');return false;}
      close({focus:false});returnFocus=document.activeElement;
      const frame=document.createElement('iframe');frame.src=source.embed;frame.title=`Interactive Google Street View near ${source.label}`;frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';
      frameHost.append(frame);container.querySelector('.street-location').textContent=`${source.label} · ${source.captured}`;
      help.hidden=false;container.hidden=false;document.body.classList.add('street-view-open');closeButton.focus({preventScroll:true});return true;
    },
    close,
    destroy(){close({focus:false});window.removeEventListener('blur',dismissHelp);container.replaceChildren();},
  };
}
