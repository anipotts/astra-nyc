// Source/provider doubles exercise boundaries; these tests do not inspect a real plan.
import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import { createPlanInspectionMiddleware } from "../server/plan-inspection.js";
const sourceUrl =
  "https://silvermanbuilding.com/wp-content/uploads/CC_1Bed_45Line.pdf";
const target = {
  address: "272 Grove Street, Jersey City, NJ",
  unit: "345",
  sourceUrl,
};
const pdf = Buffer.from("%PDF-1.7\nfake test document");
const room = {
  label: "Bedroom",
  widthFeet: 11.5,
  depthFeet: 11 + 4 / 12,
  printedDimensions: "11'6\" × 11'4\"",
  boundary: "irregular",
  extent: "Printed room extents; offsets require review.",
};
const report = (patch = {}) => ({
  identity: { address: target.address, unit: target.unit, match: "unit_group" },
  rooms: [room],
  sourceDate: null,
  conflicts: [],
  gaps: ["Remaining walls and current condition are unverified."],
  assessment: "Printed dimensions are proposed observations for review.",
  ...patch,
});
const payload = (patch = {}) => ({
  status: "completed",
  id: "resp_test_inspect",
  model: "gpt-6-astra",
  usage: {
    input_tokens: 321,
    output_tokens: 100,
    input_tokens_details: { cached_tokens: 120 },
  },
  output: [
    {
      type: "message",
      content: [{ type: "output_text", text: JSON.stringify(report()) }],
    },
  ],
  ...patch,
});
const providerResponse = (data = report(), patch = {}) =>
  new Response(
    JSON.stringify(
      payload({
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: JSON.stringify(data) }],
          },
        ],
        ...patch,
      }),
    ),
    { headers: { "content-type": "application/json" } },
  );
const sourceResponse = (bytes = pdf, type = "application/pdf", headers = {}) =>
  new Response(bytes, { headers: { "content-type": type, ...headers } });
function setup({
  source = () => sourceResponse(),
  provider = () => providerResponse(),
  apiKey = "fake-private-key",
} = {}) {
  const calls = [];
  const middleware = createPlanInspectionMiddleware({
    apiKey,
    fetchFn: async (url, options) => {
      calls.push({ url, options });
      return url === "https://api.openai.com/v1/responses"
        ? provider(url, options)
        : source(url, options);
    },
  });
  return { middleware, calls };
}
async function invoke(
  middleware,
  {
    body = target,
    raw,
    headers,
    method = "POST",
    url = "/api/plans/inspect",
  } = {},
) {
  const req = Readable.from([raw ?? JSON.stringify(body)]);
  Object.assign(req, {
    method,
    url,
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

test("strict localhost and input guards reject unsafe requests before fetching", async () => {
  const { middleware, calls } = setup();
  for (const body of [
    null,
    [],
    {},
    { ...target, extra: true },
    { ...target, unit: 345 },
    { ...target, address: "xx" },
    { ...target, unit: "" },
    ...[
      "http://theonenj.com/plan.pdf",
      "https://127.0.0.1/plan.pdf",
      "https://[::1]/plan.pdf",
      "https://10.0.0.1/plan.pdf",
      "https://localhost/plan.pdf",
      "https://theonenj.com.evil.example/plan.pdf",
      "https://eviltheonenj.com/plan.pdf",
      "https://user:secret@theonenj.com/plan.pdf",
      "https://theonenj.com:443/plan.pdf",
      "https://theonenj.com\\@evil.example/plan.pdf",
      "https://theonenj.com/",
      "https://internal.theonenj.com/plan.pdf",
    ].map((sourceUrl) => ({ ...target, sourceUrl })),
  ])
    assert.equal((await invoke(middleware, { body })).status, 400);
  assert.equal((await invoke(middleware, { raw: "{" })).status, 400);
  assert.equal(
    (await invoke(middleware, { raw: "a".repeat(2049) })).status,
    413,
  );
  for (const headers of [
    { host: "localhost:5174" },
    { origin: "https://evil.example" },
    { origin: undefined },
    { "content-type": "text/plain" },
  ])
    assert.equal((await invoke(middleware, { headers })).status, 403);
  assert.equal((await invoke(middleware, { method: "GET" })).status, 405);
  assert.deepEqual(
    await invoke(middleware, { url: "/api/listings/evidence" }),
    { next: true },
  );
  assert.equal(calls.length, 0);
  const unavailable = setup({ apiKey: "" });
  assert.equal((await invoke(unavailable.middleware)).status, 503);
  assert.equal(unavailable.calls.length, 0);
});

test("PDF inspection uses bounded inline input and returns proposed observations with acquisition receipts", async () => {
  const { middleware, calls } = setup();
  const result = await invoke(middleware);
  assert.equal(result.status, 200);
  assert.equal(result.body.readiness, "needs_review");
  assert.equal(result.body.cached, false);
  assert.deepEqual(result.body.rooms, [room]);
  assert.deepEqual(result.body.source, {
    url: sourceUrl,
    finalUrl: sourceUrl,
    bytes: pdf.length,
    mimeType: "application/pdf",
    sha256: createHash("sha256").update(pdf).digest("hex"),
  });
  assert.deepEqual(result.body.usage, {
    inputTokens: 321,
    outputTokens: 100,
    cachedTokens: 120,
  });
  assert.equal(result.body.stages.sourceFetch.calls, 1);
  assert.equal(result.body.stages.provider.calls, 1);
  assert.equal(result.body.execution.localCacheHit, false);
  assert.equal(result.body.execution.providerCalls, 1);
  assert.equal(result.headers["Cache-Control"], "no-store");
  assert.equal(calls[0].options.redirect, "manual");
  assert.equal(calls[0].options.credentials, "omit");
  assert.deepEqual(calls[0].options.headers, {
    Accept: "application/pdf,image/png,image/jpeg",
  });
  assert.ok(calls[0].options.signal instanceof AbortSignal);
  const options = calls[1].options;
  const sent = JSON.parse(options.body);
  assert.equal(options.redirect, "error");
  assert.equal(sent.store, false);
  assert.equal(sent.model, "gpt-6-astra");
  assert.equal(sent.reasoning.effort, "low");
  assert.equal(sent.max_output_tokens, 2500);
  assert.equal(sent.tools, undefined);
  assert.equal(sent.text.format.strict, true);
  assert.equal(sent.text.format.schema.properties.rooms.maxItems, 4);
  assert.deepEqual(sent.input[0].content[1], {
    type: "input_file",
    filename: "source-plan.pdf",
    file_data: "data:application/pdf;base64," + pdf.toString("base64"),
  });
  assert.match(sent.instructions, /hidden PDF artwork/);
  assert.match(sent.instructions, /maximum extents/);
  assert.doesNotMatch(
    JSON.stringify(result.body),
    /base64|fake-private-key|fake test document/,
  );
});

test("PNG/JPEG require matching magic bytes and use image inputs", async () => {
  for (const [bytes, mimeType] of [
    [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]), "image/png"],
    [Buffer.from([255, 216, 255, 224, 0]), "image/jpeg"],
  ]) {
    const { middleware, calls } = setup({
      source: () => sourceResponse(bytes, mimeType),
    });
    const result = await invoke(middleware);
    assert.equal(result.status, 200);
    assert.equal(result.body.source.mimeType, mimeType);
    assert.deepEqual(JSON.parse(calls[1].options.body).input[0].content[1], {
      type: "input_image",
      image_url: `data:${mimeType};base64,${bytes.toString("base64")}`,
      detail: "high",
    });
  }
  for (const [bytes, type] of [
    [pdf, "image/png"],
    [Buffer.from("<html>private</html>"), "application/pdf"],
    [pdf, "text/html"],
    [Buffer.alloc(0), "application/pdf"],
    [pdf, "application/octet-stream"],
  ]) {
    const { middleware, calls } = setup({
      source: () => sourceResponse(bytes, type),
    });
    assert.equal((await invoke(middleware)).status, 502);
    assert.equal(calls.length, 1);
  }
});

test("redirects are manual, capped at two, and every target revalidated without credentials", async () => {
  let count = 0;
  const valid = setup({
    source: () =>
      ++count <= 2
        ? new Response(null, {
            status: 302,
            headers: {
              location:
                count === 1
                  ? "/plan.pdf?unit=345"
                  : "https://theonenj.com/pdf/1bdrm-h2-9.pdf",
            },
          })
        : sourceResponse(),
  });
  const result = await invoke(valid.middleware);
  assert.equal(result.status, 200);
  assert.equal(result.body.stages.sourceFetch.calls, 3);
  assert.equal(
    result.body.source.finalUrl,
    "https://theonenj.com/pdf/1bdrm-h2-9.pdf",
  );
  for (const location of [
    "https://127.0.0.1/plan.pdf",
    "https://169.254.169.254/plan.pdf",
    "https://evil.example/plan.pdf",
    "https://theonenj.com:443/plan.pdf",
    "//theonenj.com:443/plan.pdf",
    "https://@theonenj.com/plan.pdf",
    "http://theonenj.com/plan.pdf",
    "https://theonenj.com\\@evil.example/plan.pdf",
    "//evil.example/plan.pdf",
    "https://internal.theonenj.com/plan.pdf",
    "",
  ]) {
    const invalid = setup({
      source: () => new Response(null, { status: 302, headers: { location } }),
    });
    assert.equal((await invoke(invalid.middleware)).status, 502);
    assert.equal(invalid.calls.length, 1);
  }
  const loop = setup({
    source: () =>
      new Response(null, { status: 307, headers: { location: sourceUrl } }),
  });
  assert.equal((await invoke(loop.middleware)).status, 502);
  assert.equal(loop.calls.length, 3);
});

test("4 MB cap applies to declared length and streamed bytes and cancels oversized streams", async () => {
  const declared = setup({
    source: () =>
      sourceResponse(pdf, "application/pdf", {
        "content-length": String(4 * 1024 * 1024 + 1),
      }),
  });
  assert.equal((await invoke(declared.middleware)).status, 413);
  assert.equal(declared.calls.length, 1);
  let cancelled = false;
  const streamed = setup({
    source: () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(4 * 1024 * 1024 + 1));
          },
          cancel() {
            cancelled = true;
          },
        }),
        {
          headers: { "content-type": "application/pdf", "content-length": "1" },
        },
      ),
  });
  assert.equal((await invoke(streamed.middleware)).status, 413);
  assert.equal(streamed.calls.length, 1);
  assert.equal(cancelled, true);
});

test("invalid/refused/incomplete output and extra geometry never become accepted evidence", async () => {
  const variants = [
    { ...report(), geometry: {} },
    report({
      identity: { ...report().identity, address: "Different address" },
    }),
    report({ identity: { ...report().identity, unit: "445" } }),
    report({ rooms: [{ ...room, heightFeet: 9 }] }),
    report({ rooms: [{ ...room, widthFeet: -2 }] }),
    report({ rooms: [{ ...room, depthFeet: 0 }] }),
    report({ rooms: [{ ...room, boundary: "verified" }] }),
    report({ rooms: Array(5).fill(room) }),
    report({ sourceDate: 2015 }),
  ];
  for (const data of variants) {
    const { middleware } = setup({ provider: () => providerResponse(data) });
    const result = await invoke(middleware);
    assert.equal(result.status, 502);
    assert.equal(result.body.rooms, undefined);
    assert.equal(result.body.execution.providerCalls, 1);
  }
  for (const patch of [
    { status: "incomplete" },
    { model: "other" },
    { id: "invalid" },
    {
      output: [
        { type: "message", content: [{ type: "refusal", refusal: "private" }] },
      ],
    },
  ]) {
    const { middleware } = setup({
      provider: () => providerResponse(report(), patch),
    });
    assert.equal((await invoke(middleware)).status, 502);
  }
  const partial = setup({
    provider: () =>
      providerResponse(
        report({
          identity: { ...report().identity, match: "unclear" },
          rooms: [
            {
              ...room,
              widthFeet: null,
              depthFeet: null,
              printedDimensions: "Not legible",
              boundary: "unclear",
            },
          ],
        }),
      ),
  });
  assert.equal((await invoke(partial.middleware)).status, 200);
});

test("coalescing and thirty-minute replay avoid both source and provider calls; unit/query identity stays separate", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  let release;
  const { middleware, calls } = setup({
    provider: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  });
  const first = invoke(middleware);
  const second = invoke(middleware, {
    body: { ...target, address: "  272  GROVE Street, Jersey City, NJ  " },
  });
  await new Promise(setImmediate);
  assert.equal(calls.length, 2);
  release(providerResponse());
  const results = await Promise.all([first, second]);
  assert.deepEqual(
    results.map((r) => r.body.cached),
    [false, true],
  );
  assert.equal(results[1].body.execution.sourceFetchCalls, 0);
  assert.equal(results[1].body.execution.providerCalls, 0);
  now += 30 * 60 * 1000 - 1;
  assert.equal((await invoke(middleware)).body.cached, true);
  assert.equal(calls.length, 2);
  now++;
  const refreshed = invoke(middleware);
  await new Promise(setImmediate);
  release(providerResponse());
  assert.equal((await refreshed).body.cached, false);
  assert.equal(calls.length, 4);
  for (const body of [
    { ...target, unit: "445" },
    { ...target, sourceUrl: sourceUrl + "?unit=other" },
  ])
    assert.equal((await invoke(middleware, { body })).status, 429);
  assert.equal((await invoke(middleware)).body.cached, true);
});

test("two provider attempts include failures and concurrent reservations prevent budget oversubscription", async () => {
  let release;
  const capped = setup({
    source: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
    provider: () => {
      throw new Error("fake-private-key");
    },
  });
  const first = invoke(capped.middleware);
  await new Promise(setImmediate);
  const releaseFirst = release;
  const second = invoke(capped.middleware, {
    body: { ...target, sourceUrl: sourceUrl + "?v=2" },
  });
  await new Promise(setImmediate);
  assert.equal(
    (
      await invoke(capped.middleware, {
        body: { ...target, sourceUrl: sourceUrl + "?v=3" },
      })
    ).status,
    429,
  );
  releaseFirst(sourceResponse());
  release(sourceResponse());
  for (const result of await Promise.all([first, second])) {
    assert.equal(result.status, 502);
    assert.doesNotMatch(JSON.stringify(result), /fake-private-key/);
  }
  assert.equal((await invoke(capped.middleware)).status, 429);
});

test("source failures release reservations, failures are not cached, and errors never leak bodies or credentials", async () => {
  let sourceCalls = 0;
  const recovered = setup({
    source: () => {
      sourceCalls++;
      if (sourceCalls <= 3)
        throw new DOMException("private source failure", "TimeoutError");
      return sourceResponse();
    },
  });
  for (let i = 0; i < 3; i++) {
    const result = await invoke(recovered.middleware);
    assert.equal(result.status, 502);
    assert.equal(result.body.execution.providerCalls, 0);
    assert.doesNotMatch(JSON.stringify(result), /private source failure/);
  }
  assert.equal((await invoke(recovered.middleware)).status, 200);
  const rejected = setup({
    provider: () => new Response("secret provider body", { status: 403 }),
  });
  const result = await invoke(rejected.middleware);
  assert.equal(result.status, 502);
  assert.doesNotMatch(
    JSON.stringify(result),
    /secret provider body|fake-private-key/,
  );
  assert.equal(result.body.execution.providerCalls, 1);
});
