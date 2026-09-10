// These provider doubles test discovery boundaries, not a live search result.
import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createListingSearchMiddleware } from "../server/listing-search.js";

test("official publisher candidates still require the exact cited path and query", async () => {
  for (const url of [
    "https://theonenj.com/pdf/1bdrm-h2-9.pdf",
    "https://silvermanbuilding.com/wp-content/uploads/CC_1Bed_45Line.pdf",
    "https://www.relatedrentals.com/sites/default/files/2021-04/MiMA_H_39-50.pdf",
    "https://gothampoint.com/availability/?unit=South2409",
  ]) {
    const accepted = setup(async () =>
      response({ candidates: [candidate({ url })], sources: [url] }),
    );
    const result = await invoke(accepted.middleware);
    assert.equal(result.status, 200);
    assert.equal(result.body.candidates[0].url, url);
    for (const cited of [
      url + "/other",
      url + (url.includes("?") ? "&" : "?") + "unit=other",
    ]) {
      const rejected = setup(async () =>
        response({ candidates: [candidate({ url })], sources: [cited] }),
      );
      assert.equal((await invoke(rejected.middleware)).status, 502);
    }
  }
});
const candidate = (patch = {}) => ({
  name: "95 Wall Street",
  address: "95 Wall Street, New York, NY 10005",
  unit: null,
  url: "https://streeteasy.com/building/95-wall-street-new_york",
  note: "Building page; choose a unit and confirm details with the source.",
  ...patch,
});
function response({
  candidates = [candidate()],
  sources = [candidate().url],
  annotations = [],
  output,
  status = "completed",
  ...patch
} = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      status,
      model: "gpt-6-astra",
      id: "resp_fake_search",
      usage: { input_tokens: 100, output_tokens: 80 },
      output:
        output === undefined
          ? [
              {
                type: "web_search_call",
                status: "completed",
                action: {
                  type: "search",
                  sources: sources.map((url) => ({ type: "url", url })),
                },
              },
              {
                type: "message",
                content: [
                  {
                    type: "output_text",
                    text: JSON.stringify({ candidates }),
                    annotations,
                  },
                ],
              },
            ]
          : output,
      ...patch,
    }),
  };
}
function setup(provider = async () => response(), apiKey = "fake-private-key") {
  const calls = [];
  return {
    calls,
    middleware: createListingSearchMiddleware({
      apiKey,
      fetchImpl: async (...args) => {
        calls.push(args);
        return provider(...args);
      },
    }),
  };
}
async function invoke(
  middleware,
  {
    body = { query: "95 Wall Street NYC" },
    raw,
    chunks,
    headers,
    url = "/api/listings/search",
    method = "POST",
  } = {},
) {
  const req = Readable.from(chunks ?? [raw ?? JSON.stringify(body)]);
  Object.assign(req, {
    url,
    method,
    headers: {
      host: "127.0.0.1:5173",
      origin: "http://127.0.0.1:5173",
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
    () => (result = { next: true }),
  );
  return result;
}

test("request boundaries reject malformed/oversized/private-origin requests without provider calls", async () => {
  const { middleware, calls } = setup();
  for (const body of [
    null,
    [],
    { query: "hi" },
    { query: " ".repeat(4) },
    { query: "x".repeat(181) },
    { query: 12 },
    { query: "95 Wall Street", extra: true },
  ])
    assert.equal((await invoke(middleware, { body })).status, 400);
  assert.equal((await invoke(middleware, { raw: "{" })).status, 400);
  assert.equal(
    (await invoke(middleware, { raw: "x".repeat(1025) })).status,
    413,
  );
  assert.equal(
    (
      await invoke(middleware, {
        body: { query: "界".repeat(180), extra: "界".repeat(180) },
      })
    ).status,
    413,
  );
  for (const headers of [
    { host: "localhost:5173" },
    { host: "evil.example:5173" },
    { origin: "http://evil.example" },
    { origin: undefined },
    { "content-type": "text/plain" },
    { "content-type": "application/jsonp" },
  ])
    assert.equal((await invoke(middleware, { headers })).status, 403);
  assert.equal((await invoke(middleware, { method: "GET" })).status, 404);
  assert.equal(
    (await invoke(middleware, { url: "/api/listings/other" })).status,
    404,
  );
  assert.deepEqual(await invoke(middleware, { url: "/api/astra/status" }), {
    next: true,
  });
  assert.equal(calls.length, 0);
  const off = setup(undefined, "");
  assert.equal((await invoke(off.middleware)).status, 503);
  assert.equal(off.calls.length, 0);
});

test("search request uses documented bounded controls and returns discovery-only source-backed suggestions", async () => {
  const { middleware, calls } = setup();
  const result = await invoke(middleware);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.candidates, [candidate()]);
  assert.equal(result.body.cached, false);
  assert.equal(result.body.model, "gpt-6-astra");
  assert.equal(result.body.requestId, "resp_fake_search");
  assert.ok(Number.isFinite(Date.parse(result.body.checkedAt)));
  assert.equal(result.headers["Cache-Control"], "no-store");
  const sent = JSON.parse(calls[0][1].body);
  assert.equal(sent.model, "gpt-6-astra");
  assert.equal(sent.store, false);
  assert.equal(sent.reasoning.effort, "low");
  assert.equal(sent.max_tool_calls, 2);
  assert.equal(sent.max_output_tokens, 2048);
  assert.equal(sent.tools[0].type, "web_search");
  assert.equal(sent.tools[0].search_context_size, "low");
  assert.deepEqual(sent.tools[0].filters.allowed_domains, [
    "streeteasy.com",
    "zillow.com",
    "realtor.com",
    "apartments.com",
    "urby.com",
    "apartmentfinder.com",
    "redfin.com",
    "theonenj.com",
    "silvermanbuilding.com",
    "relatedrentals.com",
    "gothampoint.com",
    "eosnomad.com",
    "jasperhp.com",
    "live65newkirk.com",
    "rnhousing.org",
    "castironlofts.com",
    "260gold.com",
    "avaloncommunities.com",
  ]);
  assert.deepEqual(sent.include, ["web_search_call.action.sources"]);
  assert.equal(sent.text.format.strict, true);
  assert.equal(sent.text.format.schema.properties.candidates.maxItems, 3);
  assert.match(sent.instructions, /untrusted data/);
  assert.ok(calls[0][1].signal instanceof AbortSignal);
});

test("normalized concurrent requests coalesce, cache for thirty minutes, then refresh", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  let release;
  const { middleware, calls } = setup(
    () => new Promise((resolve) => (release = resolve)),
  );
  const first = invoke(middleware);
  const duplicate = invoke(middleware, {
    body: { query: "  95   WALL Street NYC  " },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 1);
  release(response());
  const results = await Promise.all([first, duplicate]);
  assert.deepEqual(
    results.map((r) => r.body.cached),
    [false, true],
  );
  now += 30 * 60 * 1000 - 1;
  assert.equal((await invoke(middleware)).body.cached, true);
  assert.equal(calls.length, 1);
  now += 1;
  const expired = invoke(middleware);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 2);
  release(response());
  assert.equal((await expired).body.cached, false);
});

test("three-attempt cap includes failures; successful cached searches remain available", async () => {
  let count = 0;
  const { middleware, calls } = setup(async () => {
    if (++count === 2) throw new Error("private error");
    return response();
  });
  assert.equal((await invoke(middleware)).status, 200);
  assert.equal(
    (
      await invoke(middleware, {
        body: { query: "180 River Drive Jersey City" },
      })
    ).status,
    502,
  );
  assert.equal(
    (
      await invoke(middleware, {
        body: { query: "180 River Drive Jersey City" },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await invoke(middleware, {
        body: { query: "689 Marin Boulevard Jersey City" },
      })
    ).status,
    429,
  );
  assert.equal((await invoke(middleware)).body.cached, true);
  assert.equal(calls.length, 3);
});

test("every candidate needs real search receipt and an allowed HTTPS source URL", async () => {
  const invalid = [
    response({
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify({ candidates: [candidate()] }),
              annotations: [{ type: "url_citation", url: candidate().url }],
            },
          ],
        },
      ],
    }),
    response({ sources: [] }),
    response({ sources: ["https://streeteasy.com/unrelated"] }),
    ...[
      "http://streeteasy.com/building/95",
      "https://streeteasy.com.evil.example/95",
      "https://user:pass@streeteasy.com/95",
      "https://streeteasy.com:8443/95",
      "javascript:alert(1)",
      "https://evil.example/95",
    ].map((url) =>
      response({ candidates: [candidate({ url })], sources: [url] }),
    ),
    response({
      candidates: [candidate({ address: "10 Main Street, Hoboken, NJ 07030" })],
    }),
    response({
      candidates: [candidate({ address: "200 Greene Street, Jersey City, NJ 07311" })],
    }),
    response({ candidates: [candidate(), candidate()] }),
  ];
  for (const provider of invalid) {
    const { middleware } = setup(async () => provider);
    const r = await invoke(middleware);
    assert.equal(r.status, 502);
    assert.equal(r.body.candidates, undefined);
  }
  const byCitation = setup(async () =>
    response({
      sources: [],
      annotations: [{ type: "url_citation", url: candidate().url }],
    }),
  );
  assert.equal((await invoke(byCitation.middleware)).status, 200);
  const unitCandidate = candidate({
    name: "95 Wall Street #2308",
    address: "95 Wall Street, Manhattan, NY 10005",
    unit: "2308",
    url: "https://streeteasy.com/building/95-wall-street-new_york/2308",
    note: "Possible address match; confirm details on the original listing.",
  });
  const unit = setup(async () =>
    response({ candidates: [unitCandidate], sources: [unitCandidate.url] }),
  );
  assert.deepEqual((await invoke(unit.middleware)).body.candidates, [
    unitCandidate,
  ]);
});

test("malformed, unsafe, incomplete, or assertion-bearing outputs fail closed and failures are evicted", async () => {
  for (const invalid of [
    response({ status: "incomplete" }),
    response({ output: null }),
    response({ candidates: [candidate({ note: "Available now for $3000" })] }),
    response({ candidates: [candidate({ price: 3000 })] }),
    response({ candidates: [candidate({ unit: 42 })] }),
    response({ candidates: [candidate({ name: "x".repeat(121) })] }),
    response({ candidates: Array.from({ length: 4 }, () => candidate()) }),
    response({
      output: [
        { type: "web_search_call", status: "completed" },
        {
          type: "message",
          content: [{ type: "output_text", text: "not json" }],
        },
      ],
    }),
  ]) {
    let count = 0;
    const { middleware, calls } = setup(async () =>
      ++count === 1 ? invalid : response(),
    );
    assert.equal((await invoke(middleware)).status, 502);
    assert.equal((await invoke(middleware)).status, 200);
    assert.equal(calls.length, 2);
  }
  const none = setup(async () => response({ candidates: [], sources: [] }));
  assert.deepEqual((await invoke(none.middleware)).body.candidates, []);
});

test("network/provider failures never expose private values or read error bodies", async () => {
  for (const provider of [
    async () => {
      throw new Error("fake-private-key user query secret");
    },
    async () => ({
      ok: false,
      status: 401,
      json: async () => assert.fail("Error body read"),
    }),
  ]) {
    const { middleware } = setup(provider);
    const result = await invoke(middleware);
    assert.equal(result.status, 502);
    assert.doesNotMatch(
      JSON.stringify(result),
      /fake-private-key|user query secret/,
    );
  }
});
