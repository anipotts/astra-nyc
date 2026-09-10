import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { mkdtemp, rm, writeFile, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocationMiddleware } from "../server/location.js";
import {
  validateLocation,
  lookupLocation,
  LOCATION_ATTRIBUTION,
} from "../src/location.js";
const observedAt = "2026-09-10T18:00:00.000Z";
const location = {
  id: "osm:way:123",
  label: "272 Grove Street, Jersey City, New Jersey",
  longitude: -74.043,
  latitude: 40.719,
  source: "https://www.openstreetmap.org/way/123",
  observedAt,
  precision: "approximate",
};
const rawCandidate = (patch = {}) => ({
  osm_type: "way",
  osm_id: 123,
  display_name: location.label,
  lon: String(location.longitude),
  lat: String(location.latitude),
  address: { country_code: "us" },
  ...patch,
});
const json = (value) =>
  new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
  });
async function setup(t, provider = () => json([rawCandidate()]), suppliedDir) {
  const stateDir =
    suppliedDir ?? (await mkdtemp(join(tmpdir(), "elsewhere-location-test-")));
  if (!suppliedDir)
    t.after(() => rm(stateDir, { recursive: true, force: true }));
  const calls = [];
  const middleware = createLocationMiddleware({
    stateDir,
    fetchFn: async (...args) => {
      calls.push({ args, startedAt: Date.now() });
      return provider(...args);
    },
  });
  return { middleware, calls, stateDir };
}
async function invoke(
  middleware,
  {
    body = { address: "272 Grove Street, Jersey City, NJ" },
    raw,
    headers,
    url = "/api/location",
    method = "POST",
  } = {},
) {
  const req = Readable.from([raw ?? JSON.stringify(body)]);
  Object.assign(req, {
    url,
    method,
    headers: {
      host: "127.0.0.1:5174",
      origin: "http://127.0.0.1:5174",
      "content-type": "application/json",
      ...headers,
    },
  });
  let result;
  await middleware(
    req,
    {
      writeHead(status, headers) {
        result = { status, headers };
      },
      end(text) {
        result.body = JSON.parse(text);
      },
    },
    () => {
      result = { next: true };
    },
  );
  return result;
}

test("location contract rejects invented precision, source identity mismatch and invalid or out-of-region coordinates", () => {
  assert.deepEqual(validateLocation(location), location);
  assert.equal(validateLocation(null), null);
  for (const invalid of [
    undefined,
    {},
    [],
    { ...location, longitude: NaN },
    { ...location, latitude: Infinity },
    { ...location, latitude: "40.719" },
    { ...location, longitude: -122 },
    { ...location, latitude: 0 },
    { ...location, precision: "verified" },
    { ...location, source: "https://evil.example/way/123" },
    { ...location, source: "https://www.openstreetmap.org/way/124" },
    { ...location, observedAt: "today" },
    { ...location, height: 6 },
  ])
    assert.throws(() => validateLocation(invalid));
});

test("request guard allows only explicit local address POST without upstream access on malformed input", async (t) => {
  const { middleware, calls } = await setup(t);
  for (const body of [
    null,
    [],
    {},
    { address: "ab" },
    { address: " " },
    { address: "a".repeat(181) },
    { address: "private\naddress" },
    { address: "http://evil.example" },
    { address: "me@example.com" },
    { address: "272 Grove Street", sourceUrl: "https://evil.example" },
  ])
    assert.equal((await invoke(middleware, { body })).status, 400);
  assert.equal((await invoke(middleware, { raw: "{" })).status, 400);
  assert.equal(
    (await invoke(middleware, { raw: "x".repeat(1025) })).status,
    413,
  );
  for (const headers of [
    { host: "localhost:5174" },
    { host: "evil.example:5174" },
    { origin: "https://evil.example" },
    { "content-type": "text/plain" },
  ])
    assert.equal((await invoke(middleware, { headers })).status, 403);
  assert.equal((await invoke(middleware, { method: "GET" })).status, 405);
  assert.deepEqual(await invoke(middleware, { url: "/other" }), { next: true });
  assert.equal(calls.length, 0);
});

test("geocoder request is identified, region-bounded and capped; every returned candidate still requires choice", async (t) => {
  const { middleware, calls } = await setup(t, () =>
    json([
      rawCandidate(),
      rawCandidate({ osm_id: 456, display_name: "A second candidate" }),
    ]),
  );
  const result = await invoke(middleware);
  assert.equal(result.status, 200);
  assert.equal(result.body.requiresChoice, true);
  assert.equal(result.body.candidates.length, 2);
  assert.equal(result.body.candidates[0].source, location.source);
  assert.equal(result.body.candidates[0].precision, "approximate");
  assert.equal(result.body.selected, undefined);
  assert.deepEqual(result.body.attribution, LOCATION_ATTRIBUTION);
  assert.equal(result.headers["Cache-Control"], "no-store");
  const [url, options] = calls[0].args;
  const parsed = new URL(url);
  assert.equal(parsed.origin, "https://nominatim.openstreetmap.org");
  assert.equal(parsed.pathname, "/search");
  assert.equal(parsed.searchParams.get("limit"), "3");
  assert.equal(parsed.searchParams.get("bounded"), "1");
  assert.equal(parsed.searchParams.get("countrycodes"), "us");
  assert.equal(parsed.searchParams.get("format"), "jsonv2");
  assert.equal(
    parsed.searchParams.get("q"),
    "272 Grove Street, Jersey City, NJ",
  );
  assert.match(
    options.headers["User-Agent"],
    /https:\/\/github.com\/anipotts\/astra-nyc/,
  );
  assert.equal(options.headers.Authorization, undefined);
  assert.equal(options.redirect, "error");
  assert.equal(options.credentials, "omit");
  assert.ok(options.signal instanceof AbortSignal);
});

test("unsourced/outside-region candidates are omitted and no first-match fallback is created", async (t) => {
  const { middleware } = await setup(t, () =>
    json([
      rawCandidate({ lon: "-122.4" }),
      rawCandidate({ osm_type: "unknown" }),
      rawCandidate({ address: { country_code: "ca" } }),
    ]),
  );
  const result = await invoke(middleware);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.candidates, []);
  assert.equal(result.body.requiresChoice, true);
});

test("same-address requests coalesce and persistent 24h cache survives a second middleware instance", async (t) => {
  let release;
  const first = await setup(
    t,
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const one = invoke(first.middleware);
  const two = invoke(first.middleware, {
    body: { address: "  272   GROVE Street, Jersey City, NJ  " },
  });
  while (!release) await new Promise((resolve) => setTimeout(resolve, 5));
  release(json([rawCandidate()]));
  const results = await Promise.all([one, two]);
  assert.equal(first.calls.length, 1);
  assert.deepEqual(results.map((r) => r.body.cached).sort(), [false, true]);
  const second = await setup(
    t,
    () => assert.fail("cached address was fetched again"),
    first.stateDir,
  );
  const result = await invoke(second.middleware);
  assert.equal(result.status, 200);
  assert.equal(result.body.cached, true);
  assert.equal(second.calls.length, 0);
});

test("global file gate spaces different queries across middleware instances and serializes fetches", async (t) => {
  const starts = [];
  let active = 0;
  const provider = async () => {
    starts.push(Date.now());
    active++;
    assert.equal(active, 1);
    await new Promise((resolve) => setTimeout(resolve, 15));
    active--;
    return json([rawCandidate()]);
  };
  const first = await setup(t, provider);
  const second = await setup(t, provider, first.stateDir);
  const results = await Promise.all([
    invoke(first.middleware),
    invoke(second.middleware, {
      body: { address: "110 First Street, Jersey City, NJ" },
    }),
  ]);
  assert.ok(results.every((result) => result.status === 200));
  assert.equal(starts.length, 2);
  assert.ok(starts[1] - starts[0] >= 999, String(starts));
});

test("expired disk cache is refreshed rather than presented as a current replay", async (t) => {
  const provider = await setup(t);
  assert.equal((await invoke(provider.middleware)).body.cached, false);
  const cacheName = (await readdir(provider.stateDir)).find((name) =>
    /^[a-f0-9]{64}\.json$/.test(name),
  );
  const path = join(provider.stateDir, cacheName);
  const stored = JSON.parse(await readFile(path, "utf8"));
  assert.ok(stored.expiresAt - Date.now() > 23 * 60 * 60 * 1000);
  stored.expiresAt = 0;
  await writeFile(path, JSON.stringify(stored));
  const result = await invoke(provider.middleware);
  assert.equal(result.status, 200);
  assert.equal(result.body.cached, false);
  assert.equal(provider.calls.length, 2);
});

test("provider failures are sanitized, bounded and release the global lock", async (t) => {
  let calls = 0;
  const provider = await setup(t, () => {
    if (++calls === 1) throw new Error("private upstream context");
    return json([rawCandidate()]);
  });
  const failed = await invoke(provider.middleware);
  assert.equal(failed.status, 502);
  assert.doesNotMatch(JSON.stringify(failed), /private upstream context/);
  assert.equal((await invoke(provider.middleware)).status, 200);
  for (const makeResponse of [
    () =>
      new Response("private html", {
        headers: { "content-type": "text/html" },
      }),
    () => json({ private: "bad schema" }),
    () => json(Array(4).fill(rawCandidate())),
    () =>
      new Response("x".repeat(65537), {
        headers: { "content-type": "application/json" },
      }),
  ]) {
    const bad = await setup(t, makeResponse);
    const result = await invoke(bad.middleware);
    assert.equal(result.status, 502);
    assert.doesNotMatch(JSON.stringify(result), /private html|bad schema/);
  }
});

test("provider throttle pauses subsequent requests without retrying or reading error bodies", async (t) => {
  const provider = await setup(
    t,
    () => new Response("private error", { status: 429 }),
  );
  const first = await invoke(provider.middleware);
  const second = await invoke(provider.middleware);
  assert.equal(first.status, 429);
  assert.equal(second.status, 429);
  assert.equal(provider.calls.length, 1);
  assert.doesNotMatch(JSON.stringify(first), /private error/);
});

test("endpoint is switchable through server configuration and cannot be supplied by a request", async (t) => {
  for (const endpoint of [
    "http://geocoder.example/search",
    "https://user:pass@geocoder.example/search",
    "https://geocoder.example/search?key=secret",
  ])
    assert.throws(() => createLocationMiddleware({ endpoint }));
  const { stateDir } = await setup(t);
  let actual;
  const middleware = createLocationMiddleware({
    stateDir,
    endpoint: "https://geocoder.example/search",
    fetchFn: async (url) => {
      actual = url;
      return json([]);
    },
  });
  assert.equal((await invoke(middleware)).status, 200);
  assert.equal(new URL(actual).origin, "https://geocoder.example");
});

test("frontend helper sends only explicit address input and validates source candidates before returning them", async () => {
  let called;
  const result = await lookupLocation("272 Grove Street, Jersey City, NJ", {
    fetchFn: async (...args) => {
      called = args;
      return json({
        candidates: [location],
        requiresChoice: true,
        cached: false,
        observedAt,
      });
    },
  });
  assert.equal(called[0], "/api/location");
  assert.deepEqual(JSON.parse(called[1].body), {
    address: "272 Grove Street, Jersey City, NJ",
  });
  assert.deepEqual(result.candidates, [location]);
  assert.equal(result.requiresChoice, true);
  await assert.rejects(() =>
    lookupLocation("272 Grove Street", {
      fetchFn: async () =>
        json({
          candidates: [{ ...location, longitude: -122 }],
          requiresChoice: true,
        }),
    }),
  );
  await assert.rejects(() =>
    lookupLocation("272 Grove Street", {
      fetchFn: async () =>
        json({ candidates: [location], requiresChoice: false }),
    }),
  );
  await assert.rejects(
    () =>
      lookupLocation("272 Grove Street", {
        fetchFn: async () =>
          new Response(JSON.stringify({ error: "private upstream context" }), {
            status: 502,
          }),
      }),
    /Location lookup is unavailable/,
  );
});
