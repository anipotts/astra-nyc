# Official NYC building overlay

This module supplies local building massing from NYC OTI's public footprint service. Direction owns integration in the shared map; this branch changes no existing runtime files and starts no preview server.

## Source and representation

- [NYC OTI metadata](https://github.com/CityOfNewYork/nyc-geo-metadata/blob/main/Metadata/Metadata_BuildingFootprints.md) links the [public ArcGIS layer](https://services6.arcgis.com/yG5s3afENB5iO9fj/arcgis/rest/services/BUILDING_view/FeatureServer/0). It describes full building outlines viewed from above and excludes interior divisions. Source methods and dates vary by feature.
- `HEIGHT_ROOF` is roof height **above ground**, in feet. The module converts it using `feet * 0.3048` for rendering; it never subtracts `GROUND_ELEVATION`. Original values remain in feature properties. The flat base map does not establish terrain elevations.
- `FEATURE_CODE=1003` is a placeholder, not a measured footprint. `GEOM_SOURCE` is text, not this code. Placeholders are rejected. Invalid, zero and null heights are never replaced with defaults.
- Ordinary buildings (`2100`) and garages (`5110`) with usable heights receive vertical prisms. Other structure codes remain flat, avoiding invented ground-to-roof volumes for skybridges, canopies or unfinished buildings. These are neutral massing volumes, with no established roof shape, facade, materials, entrance or interior.
- Keep the NYC OTI source attribution added to the GeoJSON source and existing map attribution. The data uses [NYC Open Data terms](https://opendata.cityofnewyork.us/overview/#termsofuse), not a newly asserted software license. Direction should add this hosted-data receipt to `DEPENDENCIES.md`; no package was installed here.

## Mount and selected-location contract

Mount once after the base building layers have been installed. Import from `src/nyc-buildings/index.js`:

```js
import {
  createNycBuildingOverlay,
  outsideOfficialCoverageFilter,
} from "./nyc-buildings/index.js";

const baseLayerId = "elsewhere-city-massing";
const originalBaseFilter = map.getFilter(baseLayerId);
const buildings = createNycBuildingOverlay(map, {
  radiusMeters: 400,
  // Insert below route emphasis if it exists; otherwise before map labels.
  beforeLayerId: () => map.getLayer("commute-route-halo")
    ? "commute-route-halo" : null,
  onStatus: status => updateSourceDisclosure(status),
  onCoverageChange: coverage => {
    if (map.getLayer(baseLayerId)) {
      map.setFilter(baseLayerId,
        outsideOfficialCoverageFilter(originalBaseFilter, coverage));
    }
  },
});

// Call only when the selected geographic identity changes, including clearing it.
await buildings.update({
  listingId: selectedListing.id,
  location: { longitude: resolved.longitude, latitude: resolved.latitude },
});
// Clearing or an unresolved location removes old geometry immediately.
await buildings.update({ listingId: null, location: null });
// Explicit retry after an error; refresh bypasses the module's result cache.
await buildings.retry();
const currentStatus = buildings.getState();
buildings.destroy(); // Call before map.remove().
```

Do not filter the whole map or hide the base extrusion layer globally. The callback supplies `null` during loading, failure, empty results and incomplete results. Restore the captured **original** filter each time; do not compose against an already excluded filter. It supplies a polygon only after a complete accepted query is rendered. `within` excludes OSM footprints wholly within that polygon; boundary-crossing OSM footprints are retained. An incomplete official overlay can therefore contain duplicates while the base remains available. No overall dataset completeness is inferred from `completeQuery`.

The implementation rebuilds its own layers on `style.load`, retains data when GeoJSON workers are busy, and suppresses asynchronous updates after cancellation or destruction. Repeated identical listing/location updates make no new request. Changing the listing ID clears old geometry and coverage synchronously even when the coordinates stay the same. Data for the same coordinates can then replay from cache. It never moves the camera; framing and transitions remain Direction/designer responsibilities.

`onStatus` reports `phase` (`idle`, `loading`, `ready`, `partial`, `unavailable`, `error`), `rendered`, listing identity, request bounds, retrieval time, oldest/newest feature edit dates, `cached`, counts and truncation. `selected.kind` is `point-within-footprint`, `nearby-only` or `none`, with matching DOITT IDs. A point inside a footprint is spatial coverage, not independent verification of the address, apartment, entrance or ownership. Keep this distinction in the source disclosure.

Suggested compact copy: “NYC building footprints and roof heights.” Show older record dates, skipped/flat counts and current acquisition under source details. Missing selected-building coverage should say “Nearby buildings available; this map point is not inside a returned footprint.” Do not label acquisition time as the time every building was measured.

## Bounds and performance

- One request to a fixed public CORS endpoint per uncached location, with no credentials, model calls, redirects, pagination or eager citywide fetch.
- Query square inscribed in a maximum 400 m radius, approximately 566 m per side. The small envelope is a request guard, not an administrative NYC boundary.
- Requests only seven needed fields; explicitly uses `inSR=4326`, `outSR=4326`, GeoJSON and 2,000 maximum records.
- Eight-second timeout, 6 MB streamed body cap, 150,000 accepted vertices, bounded ring/polygon sizes and eight-entry in-memory cache for 30 minutes. Cache retains original acquisition timestamps. There is no disk cache.
- Abort stale listing requests and reject late results even if acquisition ignores abort. Errors are not cached or retried automatically.
- Server transfer-limit flags or reaching the record/geometry cap are conservatively marked truncated. There is no second count query. Unsupported geometry, polygons outside the requested envelope, duplicate IDs and invalid identifying properties prevent area-wide OSM exclusion.
- Unknown heights remain flat. No imagery, LiDAR, CityGML, terrain, real-time construction status or professional survey is implied.

## Live evidence and verification

Checked September 10, 2026, 15:28 EDT, using the module's actual client against the public service and the existing source-reviewed map coordinates:

| Case | Retrieval (UTC) | Client elapsed | Footprints | Extrusions | Point coverage |
| --- | --- | ---: | ---: | ---: | --- |
| 95 Wall Street #2308 | 2026-09-10T19:28:15.990Z | 427 ms | 121 | 121 | DOITT 553840 |
| MiMA #48H | 2026-09-10T19:28:16.259Z | 267 ms | 349 | 347 | DOITT 1158178 |

Both queries were below the cap with no malformed geometry. MiMA included two unknown heights, retained flat. Wall feature edit dates ranged from 2015-01-01 to 2026-03-09; MiMA from 2009-02-14 to 2026-09-03. These are individual source edit dates, not proof of construction state on retrieval day. A separate module smoke confirmed cached replay without another fetch. These timings are individual observations, not a latency guarantee.

The service metadata advertised `maxRecordCount=2000` and polygon geometry; live responses used GeoJSON polygons and `Access-Control-Allow-Origin: *`. Verified field types: `DOITT_ID`/`BIN`/`GROUND_ELEVATION` integer, `FEATURE_CODE` small integer, `HEIGHT_ROOF` double, `GEOM_SOURCE` string and `LAST_EDITED_DATE` date.

Thirteen focused regression tests cover units, source date preservation, placeholders, flat unknown heights, geometry and coordinate validation, holes, bounded requests, truncation, cache expiry/limits, body limits, timeout, cancellation, stale results, base-map restoration, style reload and installed MapLibre style validation. Fixtures stay internal to tests. The existing full suite passed with the first twelve overlay tests (160 total); the added style-spec regression passed separately. The base application production build passed. Direction must wire the module and verify the combined browser render, route visibility, selected-building focus and canonical 5174 before claiming the overlay is visible in the app.
