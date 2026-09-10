// Provider doubles validate collection boundaries, not live or image-inspection proof.
import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createListingEvidenceMiddleware } from "../server/listing-evidence.js";

test("official plan citations preserve document identity without unlocking geometry", async () => {
  for (const sourceUrl of [
    "https://theonenj.com/pdf/1bdrm-h2-9.pdf",
    "https://silvermanbuilding.com/wp-content/uploads/CC_1Bed_45Line.pdf",
    "https://www.relatedrentals.com/sites/default/files/2021-04/MiMA_H_39-50.pdf",
    "https://gothampoint.com/availability/?unit=South2409",
  ]) {
    const accepted = setup(async () =>
      response({
        sources: [sourceUrl],
        data: report({
          sources: [source({ url: sourceUrl, kind: "floor_plan" })],
        }),
      }),
    );
    const result = await invoke(accepted.middleware, {
      body: input({ sourceUrl }),
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.sources[0].url, sourceUrl);
    assert.equal(result.body.readiness, "needs_review");
    assert.equal(
      JSON.parse(JSON.parse(accepted.calls[0][1].body).input).sourceUrl,
      sourceUrl,
    );
    const rejected = setup(async () =>
      response({
        sources: [sourceUrl + "#page=1"],
        data: report({
          sources: [
            source({
              url:
                sourceUrl +
                (sourceUrl.includes("?") ? "&" : "?") +
                "unit=other",
            }),
          ],
        }),
      }),
    );
    assert.equal(
      (await invoke(rejected.middleware, { body: input({ sourceUrl }) }))
        .status,
      502,
    );
  }
});
const url = "https://streeteasy.com/building/95-wall-street-new_york/2308";
const input = (patch = {}) => ({
  address: "95 Wall Street #2308, New York, NY",
  sourceUrl: url,
  ...patch,
});
const source = (patch = {}) => ({
  url,
  title: "95 Wall Street #2308",
  scope: "exact_unit",
  level: "unit",
  kind: "listing",
  publishedAt: null,
  evidence:
    "The source identifies the requested apartment; interior scale remains unverified.",
  ...patch,
});
const report = (patch = {}) => ({
  identity: { address: input().address, unit: "2308" },
  sources: [source()],
  conflicts: [],
  gaps: [
    "Usable room dimensions and permission to reuse a plan remain unverified.",
  ],
  assessment:
    "Source review is needed. No exact interior can be established from search text alone.",
  ...patch,
});
function response({
  data = report(),
  sources = [url],
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
      id: "resp_fake_evidence",
      usage: { input_tokens: 150, output_tokens: 200 },
      output:
        output === undefined
          ? [
              {
                type: "web_search_call",
                status: "completed",
                action: {
                  type: "search",
                  sources: sources.map((url) => ({ url })),
                },
              },
              {
                type: "message",
                content: [
                  {
                    type: "output_text",
                    text: JSON.stringify(data),
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
    middleware: createListingEvidenceMiddleware({
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
    body = input(),
    raw,
    headers,
    url = "/api/listings/evidence",
    method = "POST",
  } = {},
) {
  const req = Readable.from([raw ?? JSON.stringify(body)]);
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

test("input is strictly local, bounded, and anchored to a specific supported public page", async () => {
  const { middleware, calls } = setup();
  for (const body of [
    null,
    [],
    input({ address: "hi" }),
    input({ address: "x".repeat(181) }),
    { ...input(), unit: "2308" },
    ...[
      "https://streeteasy.com/",
      "https://streeteasy.com/?unit=2308",
      "https://evil.example/path",
      "https://streeteasy.com.evil.example/path",
      "http://streeteasy.com/2308",
      "https://me:secret@streeteasy.com/2308",
      "https://streeteasy.com:9000/2308",
    ].map((sourceUrl) => input({ sourceUrl })),
  ])
    assert.equal((await invoke(middleware, { body })).status, 400);
  assert.equal((await invoke(middleware, { raw: "{" })).status, 400);
  assert.equal(
    (await invoke(middleware, { raw: "x".repeat(1025) })).status,
    413,
  );
  for (const headers of [
    { host: "evil:5173" },
    { origin: "https://evil" },
    { origin: undefined },
    { "content-type": "text/plain" },
  ])
    assert.equal((await invoke(middleware, { headers })).status, 403);
  assert.equal((await invoke(middleware, { method: "GET" })).status, 405);
  assert.deepEqual(await invoke(middleware, { url: "/api/listings/search" }), {
    next: true,
  });
  assert.equal(calls.length, 0);
  const off = setup(undefined, "");
  assert.equal((await invoke(off.middleware)).status, 503);
  assert.equal(off.calls.length, 0);
});

test("request preserves source unit path and returns needs_review with actual collection metadata", async () => {
  const { middleware, calls } = setup();
  const result = await invoke(middleware);
  assert.equal(result.status, 200);
  assert.equal(result.body.readiness, "needs_review");
  assert.equal(result.body.cached, false);
  assert.deepEqual(result.body.identity, report().identity);
  assert.ok(Number.isFinite(Date.parse(result.body.observedAt)));
  const sent = JSON.parse(calls[0][1].body);
  assert.deepEqual(JSON.parse(sent.input), {
    ...input(),
    sourcePath: "/building/95-wall-street-new_york/2308",
  });
  assert.equal(sent.model, "gpt-6-astra");
  assert.equal(sent.store, false);
  assert.equal(sent.reasoning.effort, "low");
  assert.equal(sent.max_tool_calls, 3);
  assert.equal(sent.max_output_tokens, 3000);
  assert.equal(sent.tools[0].type, "web_search");
  assert.equal(sent.tools[0].search_context_size, "low");
  assert.equal(sent.tools[0].filters.allowed_domains.length, 16);
  assert.deepEqual(sent.include, ["web_search_call.action.sources"]);
  assert.equal(sent.text.format.strict, true);
  assert.match(sent.instructions, /untrusted data/);
  assert.match(sent.instructions, /floor area does not establish room sizes/);
  assert.match(sent.instructions, /No direct image inspection/);
  assert.match(sent.instructions, /Never claim complete web coverage/);
  assert.equal(result.headers["Cache-Control"], "no-store");
});

test("source scope and date observations remain separate and never unlock readiness", async () => {
  const other = "https://streeteasy.com/building/95-wall-street-new_york/1901";
  const building = "https://www.urby.com/jersey-city";
  const data = report({
    sources: [
      source(),
      source({
        url: other,
        scope: "other_unit",
        kind: "floor_plan",
        publishedAt: "August 2026",
        evidence:
          "A different unit page references a plan; it does not establish the target layout.",
      }),
      source({
        url: building,
        scope: "building",
        kind: "photos",
        publishedAt: "3 days ago",
        evidence:
          "Building imagery may be generic; current target conditions are not established.",
      }),
    ],
    conflicts: ["Different apartment identifiers appear across these pages."],
  });
  const { middleware } = setup(async () =>
    response({ data, sources: [url, other, building] }),
  );
  const result = await invoke(middleware);
  assert.equal(result.status, 200);
  assert.equal(result.body.sources[1].scope, "other_unit");
  assert.equal(result.body.sources[2].publishedAt, "3 days ago");
  assert.equal(result.body.readiness, "needs_review");
});

test("source receipts require a completed actual search and exact safe URLs", async () => {
  const noSearch = [
    {
      type: "message",
      content: [
        {
          type: "output_text",
          text: JSON.stringify(report()),
          annotations: [{ type: "url_citation", url }],
        },
      ],
    },
  ];
  for (const invalid of [
    response({ output: noSearch }),
    response({ sources: [] }),
    response({ sources: [url + "/different"] }),
    response({
      data: report({
        sources: [source({ url: "https://evil.example/source" })],
      }),
      sources: ["https://evil.example/source"],
    }),
    response({ data: report({ sources: [source(), source()] }) }),
  ]) {
    const { middleware } = setup(async () => invalid);
    assert.equal((await invoke(middleware)).status, 502);
  }
  const citations = setup(async () =>
    response({ sources: [], annotations: [{ type: "url_citation", url }] }),
  );
  assert.equal((await invoke(citations.middleware)).status, 200);
  const noEvidence = setup(async () =>
    response({
      data: report({ sources: [], gaps: ["No useful source found."] }),
      sources: [],
    }),
  );
  assert.equal(
    (await invoke(noEvidence.middleware)).body.readiness,
    "needs_review",
  );
});

test("strict schema rejects fabricated readiness, geometry, bad scopes, oversized strings and malformed outputs", async () => {
  for (const invalid of [
    response({ status: "incomplete" }),
    response({ output: null }),
    response({ data: report({ readiness: "ready" }) }),
    response({ data: report({ geometry: { width: 7 } }) }),
    response({
      data: report({ identity: { address: input().address, unit: 2308 } }),
    }),
    response({ data: report({ assessment: "x".repeat(601) }) }),
    response({ data: report({ gaps: Array(6).fill("gap") }) }),
    response({ data: report({ conflicts: Array(5).fill("conflict") }) }),
    response({
      data: report({ sources: [source({ scope: "verified_unit" })] }),
    }),
    response({ data: report({ sources: [source({ publishedAt: 123 })] }) }),
    response({
      data: report({ sources: [source({ evidence: "x".repeat(361) })] }),
    }),
    response({ data: report({ sources: Array(7).fill(source()) }) }),
  ]) {
    const { middleware } = setup(async () => invalid);
    const result = await invoke(middleware);
    assert.equal(result.status, 502);
    assert.equal(result.body.readiness, undefined);
    assert.equal(result.body.sources, undefined);
  }
});

test("normalized same-target requests coalesce and cache thirty minutes, while source paths isolate units", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  let release;
  const { middleware, calls } = setup(
    () => new Promise((resolve) => (release = resolve)),
  );
  const first = invoke(middleware);
  const second = invoke(middleware, {
    body: input({ address: "  95  WALL Street #2308, New York, NY " }),
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 1);
  release(response());
  assert.deepEqual(
    (await Promise.all([first, second])).map((r) => r.body.cached),
    [false, true],
  );
  now += 30 * 60 * 1000 - 1;
  assert.equal((await invoke(middleware)).body.cached, true);
  now++;
  const expired = invoke(middleware);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 2);
  release(response());
  assert.equal((await expired).body.cached, false);
  assert.equal(
    (
      await invoke(middleware, {
        body: input({ sourceUrl: url.replace("2308", "1901") }),
      })
    ).status,
    429,
  );
  assert.equal((await invoke(middleware)).body.cached, true);
});

test("failed attempts are evicted, capped at two, and never leak provider errors", async () => {
  let n = 0;
  const { middleware, calls } = setup(async () => {
    if (++n === 1) throw new Error("fake-private-key private address");
    return response();
  });
  const failure = await invoke(middleware);
  assert.equal(failure.status, 502);
  assert.doesNotMatch(
    JSON.stringify(failure),
    /fake-private-key|private address/,
  );
  assert.equal((await invoke(middleware)).status, 200);
  assert.equal(calls.length, 2);
  assert.equal(
    (
      await invoke(middleware, {
        body: input({ address: "689 Marin Blvd Jersey City NJ" }),
      })
    ).status,
    429,
  );
  const denied = setup(async () => ({
    ok: false,
    status: 401,
    json: async () => assert.fail("provider error body read"),
  }));
  assert.equal((await invoke(denied.middleware)).status, 502);
});

test("failed source validation retains safe provider usage without leaking source output", async () => {
  for (const invalid of [
    { data: report({ geometry: { private: "model-only-secret" } }) },
    {
      sources: [url + "/unrelated"],
      data: report({ assessment: "model-only-secret" }),
    },
  ]) {
    const { middleware, calls } = setup(async () => ({
      ...response({
        ...invalid,
        usage: {
          input_tokens: 13000,
          output_tokens: 540,
          input_tokens_details: { cached_tokens: 4096 },
        },
      }),
      headers: new Headers({ "x-request-id": "req_test_validation" }),
    }));
    const result = await invoke(middleware);
    assert.equal(result.status, 502);
    assert.equal(result.body.stage, "invalid_source_report");
    assert.equal(result.body.httpStatus, 200);
    assert.equal(result.body.providerStatus, "completed");
    assert.equal(result.body.requestId, "resp_fake_evidence");
    assert.equal(result.body.providerRequestId, "req_test_validation");
    assert.equal(result.body.model, "gpt-6-astra");
    assert.deepEqual(result.body.usage, {
      inputTokens: 13000,
      outputTokens: 540,
      cachedTokens: 4096,
    });
    assert.equal(result.body.toolCalls, 1);
    assert.equal(result.body.cached, false);
    assert.equal(result.body.sources, undefined);
    assert.equal(result.body.assessment, undefined);
    assert.doesNotMatch(
      JSON.stringify(result),
      /model-only-secret|fake-private-key|streeteasy/,
    );
    await invoke(middleware);
    assert.equal(calls.length, 2);
    assert.equal((await invoke(middleware)).status, 429);
  }
});

test("malformed metadata is sanitized while completion and schema failures remain distinct", async () => {
  const bad = setup(async () => ({
    ...response({
      status: "private provider status",
      id: "resp_invalid\nprivate-id",
      model: "gpt-6-astra private-model",
      usage: {
        input_tokens: -1,
        output_tokens: "500",
        input_tokens_details: { cached_tokens: Number.MAX_SAFE_INTEGER + 1 },
      },
      output: { secret: "private-output" },
    }),
    headers: { get: () => "private header value" },
  }));
  const result = await invoke(bad.middleware);
  assert.equal(result.status, 502);
  assert.equal(result.body.stage, "invalid_source_report");
  assert.equal(result.body.providerStatus, "unknown");
  assert.equal(result.body.requestId, null);
  assert.equal(result.body.providerRequestId, null);
  assert.equal(result.body.model, null);
  assert.equal(result.body.toolCalls, null);
  assert.deepEqual(result.body.usage, {
    inputTokens: null,
    outputTokens: null,
    cachedTokens: null,
  });
  assert.doesNotMatch(JSON.stringify(result), /private/);
  const invalidReceipt = setup(async () => response({ id: "invalid-id" }));
  const receipt = await invoke(invalidReceipt.middleware);
  assert.equal(receipt.body.stage, "invalid_completion_receipt");
  assert.equal(receipt.body.requestId, null);
  assert.equal(receipt.body.usage.inputTokens, 150);
  assert.equal(receipt.body.toolCalls, 1);
});

test("HTTP, unreadable response, and network failures retain only known receipt fields", async () => {
  const denied = setup(async () => ({
    ok: false,
    status: 429,
    headers: new Headers({ "x-request-id": "req_test_http" }),
    json: async () => assert.fail("provider error body must not be read"),
  }));
  const http = await invoke(denied.middleware);
  assert.equal(http.status, 502);
  assert.equal(http.body.stage, "provider_http_error");
  assert.equal(http.body.httpStatus, 429);
  assert.equal(http.body.providerRequestId, "req_test_http");
  assert.equal(http.body.requestId, null);
  assert.equal(http.body.usage, null);
  assert.equal(http.body.toolCalls, null);
  assert.equal(http.body.providerStatus, "unknown");
  const unreadable = setup(async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ "x-request-id": "req_test_bad_json" }),
    json: async () => {
      throw new Error("private malformed body");
    },
  }));
  const malformed = await invoke(unreadable.middleware);
  assert.equal(malformed.body.stage, "invalid_provider_payload");
  assert.equal(malformed.body.providerRequestId, "req_test_bad_json");
  assert.equal(malformed.body.usage, null);
  assert.doesNotMatch(JSON.stringify(malformed), /private malformed body/);
  const disconnected = setup(async () => {
    throw new Error("private network failure");
  });
  const network = await invoke(disconnected.middleware);
  assert.equal(network.body.stage, "provider_network_error");
  assert.equal(network.body.providerStatus, "unknown");
  assert.equal(network.body.httpStatus, null);
  assert.equal(network.body.requestId, null);
  assert.equal(network.body.providerRequestId, null);
  assert.equal(network.body.usage, null);
  assert.equal(network.body.toolCalls, null);
  assert.doesNotMatch(JSON.stringify(network), /private network failure/);
});

test("hierarchy levels are independent from source scope and new supported domains remain source-backed", async () => {
  for (const level of [
    "neighborhood",
    "site",
    "building",
    "shared_space",
    "floor",
    "unit",
    "room",
    "object",
  ]) {
    const { middleware } = setup(async () =>
      response({
        data: report({ sources: [source({ level, scope: "unclear" })] }),
      }),
    );
    const result = await invoke(middleware);
    assert.equal(result.status, 200);
    assert.equal(result.body.sources[0].level, level);
    assert.equal(result.body.sources[0].scope, "unclear");
    assert.equal(result.body.readiness, "needs_review");
  }
  const invalid = setup(async () =>
    response({
      data: report({ sources: [source({ level: "verified_room" })] }),
    }),
  );
  assert.equal((await invoke(invalid.middleware)).status, 502);
  for (const sourceUrl of [
    "https://www.apartmentfinder.com/New-Jersey/Jersey-City-Apartments/Example",
    "https://www.redfin.com/NJ/Jersey-City/Example/home/123",
  ]) {
    const { middleware } = setup(async () =>
      response({
        sources: [sourceUrl],
        data: report({ sources: [source({ url: sourceUrl })] }),
      }),
    );
    assert.equal(
      (await invoke(middleware, { body: input({ sourceUrl }) })).status,
      200,
    );
  }
});
