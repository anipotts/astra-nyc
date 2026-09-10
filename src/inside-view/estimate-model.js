// All geometry in this contract is an estimate, never measured/accepted evidence.
const obj = properties => ({ type: 'object', additionalProperties: false, properties, required: Object.keys(properties) });
const number = (min, max) => ({ type: 'number', minimum: min, maximum: max });
const string = maxLength => ({ type: 'string', minLength: 1, maxLength });
const point = obj({ x: number(-15, 15), z: number(-15, 15) });
export const furnitureTypes = ['bed', 'sofa', 'table', 'chair', 'counter', 'wardrobe', 'plant', 'rug', 'bath', 'toilet'];
export const estimateSchema = obj({
  listingId: string(60),
  sourceAssessment: string(600),
  assumptions: { type: 'array', minItems: 1, maxItems: 6, items: string(200) },
  height: number(2.3, 3.6),
  footprint: { type: 'array', minItems: 4, maxItems: 20, items: point },
  walls: { type: 'array', minItems: 4, maxItems: 32, items: obj({ a: point, b: point, opening: { type: 'string', enum: ['none', 'door', 'window'] } }) },
  furniture: { type: 'array', maxItems: 20, items: obj({ type: { type: 'string', enum: furnitureTypes }, x: number(-15, 15), z: number(-15, 15), width: number(.2, 5), depth: number(.2, 5), rotation: number(-180, 180) }) },
  spawn: obj({ x: number(-15, 15), z: number(-15, 15), yaw: number(-180, 180) }),
});
export function insidePolygon(x, z, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}
export function segmentDistance(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
}
export function walkable(scene, x, z, radius = .22) {
  if (!insidePolygon(x, z, scene.footprint)) return false;
  if (scene.footprint.some((a, i) => segmentDistance(x, z, a, scene.footprint[(i + 1) % scene.footprint.length]) < radius)) return false;
  if (scene.walls.some(w => {
    const d = Math.hypot(w.b.x - w.a.x, w.b.z - w.a.z);
    if (w.opening !== 'door') return segmentDistance(x, z, w.a, w.b) < radius + .06;
    const gap = Math.min(.55, d * .4), mid = { x: (w.a.x+w.b.x)/2, z: (w.a.z+w.b.z)/2 };
    const v = { x: (w.b.x-w.a.x)/d * gap, z: (w.b.z-w.a.z)/d * gap };
    return Math.min(segmentDistance(x,z,w.a,{x:mid.x-v.x,z:mid.z-v.z}),segmentDistance(x,z,{x:mid.x+v.x,z:mid.z+v.z},w.b)) < radius + .06;
  })) return false;
  return !scene.furniture.some(f => {
    if (f.type === 'rug') return false;
    const r = f.rotation * Math.PI / 180, dx = x-f.x, dz = z-f.z;
    return Math.abs(Math.cos(r)*dx-Math.sin(r)*dz) < f.width/2+radius && Math.abs(Math.sin(r)*dx+Math.cos(r)*dz) < f.depth/2+radius;
  });
}
function validate(value, schema) {
  if (schema.type === 'object') return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === schema.required.length && schema.required.every(k => Object.hasOwn(value,k) && validate(value[k],schema.properties[k]));
  if (schema.type === 'array') return Array.isArray(value) && value.length >= (schema.minItems || 0) && value.length <= schema.maxItems && value.every(v => validate(v,schema.items));
  if (schema.type === 'number') return typeof value === 'number' && Number.isFinite(value) && value >= schema.minimum && value <= schema.maximum;
  return typeof value === 'string' && (!schema.enum || schema.enum.includes(value)) && value.length >= (schema.minLength || 0) && value.length <= (schema.maxLength || Infinity) && !/[\x00-\x1f\x7f]/.test(value);
}
export function validateEstimate(value, listingId) {
  if (!validate(value, estimateSchema) || value.listingId !== listingId) throw new Error('Invalid estimated scene contract.');
  const area = Math.abs(value.footprint.reduce((sum,a,i) => { const b=value.footprint[(i+1)%value.footprint.length]; return sum+a.x*b.z-b.x*a.z; },0))/2;
  if (area < 12 || area > 250 || value.walls.some(w => Math.hypot(w.a.x-w.b.x,w.a.z-w.b.z)<.15)) throw new Error('Invalid estimated apartment bounds.');
  if (!walkable(value,value.spawn.x,value.spawn.z,.3)) {
    // Recover only the camera start, never alter the inferred source geometry.
    const candidates=[];
    for(let x=Math.min(...value.footprint.map(p=>p.x))+.4;x<Math.max(...value.footprint.map(p=>p.x));x+=.35)
      for(let z=Math.min(...value.footprint.map(p=>p.z))+.4;z<Math.max(...value.footprint.map(p=>p.z));z+=.35)
        if(walkable(value,x,z,.4))candidates.push({x,z,d:Math.hypot(x-value.spawn.x,z-value.spawn.z)});
    candidates.sort((a,b)=>a.d-b.d);
    if(!candidates.length)throw new Error('Estimated apartment has no clear starting point.');
    value=structuredClone(value);value.spawn.x=candidates[0].x;value.spawn.z=candidates[0].z;
  }
  if (value.furniture.some(f => !insidePolygon(f.x,f.z,value.footprint))) throw new Error('Estimated furniture is outside the apartment.');
  return structuredClone(value);
}
