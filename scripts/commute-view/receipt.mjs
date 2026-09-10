// Read cached public route receipts after the browser has explicitly exercised each mode.
import { DEMO_DESTINATION } from '../../src/commute-view/route.js';
import { getExampleLocation } from '../../src/example-locations.js';
for (const mode of ['walking','bicycling','driving']) {
  const response = await fetch('http://127.0.0.1:5182/api/commute', { method:'POST', headers:{'Content-Type':'application/json',Origin:'http://127.0.0.1:5182'}, body:JSON.stringify({ origin:getExampleLocation('wall2308'),destination:DEMO_DESTINATION,mode }) });
  const r=await response.json();console.log(JSON.stringify({mode,status:response.status,distance:r.distance,duration:r.duration,steps:r.steps?.length,observedAt:r.observedAt,latencyMs:r.latencyMs,cached:r.cached,error:r.error}));
}
