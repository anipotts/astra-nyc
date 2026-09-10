import test from 'node:test';
import assert from 'node:assert/strict';
import { nearbyStreetView, streetViewUrl } from '../src/street-view.js';

test('real panoramas bind to nearby matching buildings without borrowing remote imagery', () => {
  assert.match(nearbyStreetView({latitude:40.7589262,longitude:-73.9943187}).label,/42nd/);
  assert.match(nearbyStreetView({latitude:40.7047056,longitude:-74.0075698}).label,/Wall/);
  assert.equal(nearbyStreetView({latitude:40.78,longitude:-73.96}),null);
});

test('other locations use the actual coordinates in an official Street View URL', () => {
  const url=new URL(streetViewUrl({latitude:40.78,longitude:-73.96}));
  assert.equal(url.origin,'https://www.google.com');
  assert.equal(url.searchParams.get('map_action'),'pano');
  assert.equal(url.searchParams.get('viewpoint'),'40.78,-73.96');
  for(const p of [null,{latitude:NaN,longitude:0},{latitude:91,longitude:0},{latitude:0,longitude:181}]){
    assert.equal(streetViewUrl(p),null);assert.equal(nearbyStreetView(p),null);
  }
});
