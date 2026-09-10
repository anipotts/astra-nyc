// Regional bounds for NYC and Jersey City; this is not a jurisdiction polygon.
export const LOCATION_BOUNDS = Object.freeze({
  west: -74.27,
  south: 40.49,
  east: -73.68,
  north: 40.93,
});
export const LOCATION_ATTRIBUTION = Object.freeze({
  label: "© OpenStreetMap contributors · Nominatim",
  url: "https://www.openstreetmap.org/copyright",
});
const text = (value, max) =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= max &&
  !/[\x00-\x1f\x7f]/.test(value);
export function validateLocation(value) {
  if (value === null) return null;
  const keys = [
    "id",
    "label",
    "longitude",
    "latitude",
    "source",
    "observedAt",
    "precision",
  ];
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== keys.length ||
    !keys.every((key) => Object.hasOwn(value, key)) ||
    !text(value.id, 100) ||
    !text(value.label, 500) ||
    value.precision !== "approximate" ||
    !Number.isFinite(value.longitude) ||
    !Number.isFinite(value.latitude) ||
    value.longitude < LOCATION_BOUNDS.west ||
    value.longitude > LOCATION_BOUNDS.east ||
    value.latitude < LOCATION_BOUNDS.south ||
    value.latitude > LOCATION_BOUNDS.north ||
    !text(value.observedAt, 32) ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value.observedAt) ||
    !Number.isFinite(Date.parse(value.observedAt))
  )
    throw new Error("Invalid approximate location.");
  const identity = /^osm:(node|way|relation):([1-9]\d{0,15})$/.exec(value.id);
  if (
    !identity ||
    value.source !==
      `https://www.openstreetmap.org/${identity[1]}/${identity[2]}`
  )
    throw new Error("Location source does not match its identity.");
  return {
    id: value.id,
    label: value.label.trim(),
    longitude: value.longitude,
    latitude: value.latitude,
    source: value.source,
    observedAt: value.observedAt,
    precision: "approximate",
  };
}

// Call only after explicit selection of a public listing. Never bind to typing.
// Candidates require user choice even when the provider returns a single match.
export async function lookupLocation(
  address,
  { signal, fetchFn = fetch } = {},
) {
  if (!text(address, 180) || address.trim().length < 3)
    throw new Error("Choose a listing with a street address.");
  const response = await fetchFn("/api/location", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: address.trim() }),
    signal,
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "Location lookup is busy. Wait a moment and retry."
        : "Location lookup is unavailable. You can still review the listing sources.",
    );
  if (
    !result ||
    !Array.isArray(result.candidates) ||
    result.candidates.length > 3 ||
    result.requiresChoice !== true
  )
    throw new Error("Location lookup returned an invalid result.");
  const candidates = result.candidates.map((value) => {
    const candidate = validateLocation(value);
    if (!candidate) throw new Error("Invalid location candidate.");
    return candidate;
  });
  return {
    address: address.trim(),
    candidates,
    requiresChoice: true,
    provider: "Nominatim / OpenStreetMap",
    attribution: LOCATION_ATTRIBUTION,
    cached: result.cached === true,
    observedAt: result.observedAt,
  };
}
