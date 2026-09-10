import { Map, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
setWorkerUrl(workerUrl);
import { mountCommuteView } from '../../src/commute-view/index.js';
import { createCommuteMapLayer } from '../../src/commute-view/map-layer.js';
import { getExampleLocation } from '../../src/example-locations.js';
const map = new Map({ container: 'map', style: 'https://tiles.openfreemap.org/styles/liberty', center: [-74.01,40.708], zoom: 14, pitch: 35, attributionControl: true });
map.addControl(new NavigationControl(), 'top-right');
map.on('error', () => { document.querySelector('#map-status').textContent = 'Some city map details could not load. Route evidence remains separate.'; });
const layer = createCommuteMapLayer(map, { padding: { left: 345, top: 75, right: 50, bottom: 65 } });
const view = mountCommuteView(document.querySelector('#view'), { routeLayer: layer });
let active = true;
function update() { const id = document.querySelector('select').value; view.update({ selectedListing: { id, name: id === 'wall2308' ? '95 Wall Street #2308' : id === 'zephyr501' ? 'Zephyr Lofts #501' : 'Unresolved home', mapAddress: id === 'zephyr501' ? '689 Marin Boulevard, Jersey City' : '95 Wall Street, New York' }, resolvedLocation: getExampleLocation(id), priorities: [], active }); }
document.querySelector('select').onchange = update;
document.querySelector('#active').onclick = () => { active = !active; document.querySelector('#active').textContent = active ? 'Deactivate' : 'Activate'; update(); };
update();
