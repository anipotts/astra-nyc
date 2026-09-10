// Fake-provider tests exercise the local boundary; these are not live Astra proof.
import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createAstraMiddleware } from "../server/astra.js";

const origin = "http://127.0.0.1:5173";
const request = (prompt = "Put a king bed here") => ({
  scene: "wall2308-inferred-v2",
  prompt,
});
const edit = { action: "resize_bed", target: "existing_bed", size: "king" };
function providerResponse(overrides = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      status: "completed",
      model: "gpt-6-astra",
      id: "fake-response",
      usage: { input_tokens: 12, output_tokens: 8 },
      output: [
        { content: [{ type: "output_text", text: JSON.stringify(edit) }] },
      ],
      ...overrides,
    }),
  };
}
async function invoke(
  middleware,
  {
    body = request(),
    raw,
    chunks,
    headers,
    url = "/api/astra/edit",
    method = "POST",
  } = {},
) {
  const req = Readable.from(chunks ?? [raw ?? JSON.stringify(body)]);
  req.method = method;
  req.url = url;
  req.headers = {
    host: "127.0.0.1:5173",
    origin,
    "content-type": "application/json",
    ...headers,
  };
  let result;
  await middleware(
    req,
    {
      writeHead(status, responseHeaders) {
        result = { status, headers: responseHeaders };
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
function setup(
  implementation = async () => providerResponse(),
  apiKey = "fake-test-key",
) {
  const calls = [];
  const middleware = createAstraMiddleware({
    apiKey,
    fetchImpl: async (...args) => {
      calls.push(args);
      return implementation(...args);
    },
  });
  return { middleware, calls };
}

test("unconfigured access is observable but makes no provider request", async () => {
  const { middleware, calls } = setup(undefined, "");
  const status = await invoke(middleware, {
    url: "/api/astra/status",
    method: "GET",
  });
  assert.equal(status.body.configured, false);
  assert.equal((await invoke(middleware)).status, 503);
  assert.equal(calls.length, 0);
});

test("host, origin, content type, method, and route guards never call provider", async () => {
  const { middleware, calls } = setup();
  for (const options of [
    { headers: { host: "attacker.example:5173" } },
    { headers: { origin: "https://attacker.example" } },
    { headers: { origin: undefined } },
    { headers: { "content-type": "application/jsonp" } },
    { headers: { "content-type": "text/plain" } },
  ])
    assert.equal((await invoke(middleware, options)).status, 403);
  assert.equal((await invoke(middleware, { method: "GET" })).status, 404);
  assert.equal(
    (await invoke(middleware, { url: "/api/astra/missing" })).status,
    404,
  );
  assert.deepEqual(await invoke(middleware, { url: "/src/main.js" }), {
    next: true,
  });
  assert.equal(calls.length, 0);
});

test("malformed, oversized, blank, and wrong-scene requests do not consume attempts", async () => {
  const { middleware, calls } = setup();
  for (const options of [
    { raw: "{" },
    { body: null },
    { body: [] },
    { body: 1 },
    { body: request("   ") },
    { body: request("x".repeat(501)) },
    { body: { ...request(), scene: "unsupported" } },
  ])
    assert.equal((await invoke(middleware, options)).status, 400);
  assert.equal(
    (await invoke(middleware, { raw: "x".repeat(2049) })).status,
    413,
  );
  // The request limit applies to bytes, not JS characters.
  assert.equal(
    (
      await invoke(middleware, {
        body: { ...request(), extra: "界".repeat(700) },
      })
    ).status,
    413,
  );
  assert.equal(calls.length, 0);
  assert.equal(
    (await invoke(middleware, { url: "/api/astra/status", method: "GET" })).body
      .attempts,
    0,
  );
});

test("validated edits pass through and split UTF-8 input remains intact", async () => {
  const { middleware, calls } = setup();
  const body = request("King bed please 🛏️");
  const bytes = Buffer.from(JSON.stringify(body));
  const split = bytes.indexOf(Buffer.from("🛏️")) + 1;
  const response = await invoke(middleware, {
    chunks: [bytes.subarray(0, split), bytes.subarray(split)],
    headers: { "content-type": "application/json; charset=utf-8" },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.edit, edit);
  assert.equal(response.body.cached, false);
  assert.deepEqual(response.body.usage, { inputTokens: 12, outputTokens: 8 });
  assert.equal(response.headers["Cache-Control"], "no-store");
  const sent = JSON.parse(calls[0][1].body);
  assert.equal(sent.input, body.prompt);
  assert.equal(sent.store, false);
  assert.equal(sent.model, "gpt-6-astra");
  assert.equal(sent.text.format.strict, true);
  assert.ok(calls[0][1].signal instanceof AbortSignal);
});

test("simultaneous equivalent requests share one provider call and cached result", async () => {
  let resolveProvider;
  const { middleware, calls } = setup(
    () =>
      new Promise((resolve) => {
        resolveProvider = resolve;
      }),
  );
  const first = invoke(middleware);
  const duplicate = invoke(middleware, {
    body: request("  PUT A KING BED HERE  "),
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 1);
  resolveProvider(providerResponse());
  const [a, b] = await Promise.all([first, duplicate]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(a.body.cached, false);
  assert.equal(b.body.cached, true);
  assert.equal(a.body.requestId, b.body.requestId);
  assert.equal((await invoke(middleware)).body.cached, true);
  assert.equal(calls.length, 1);
});

test("unsafe, unsupported, incomplete, and malformed provider results do not become edits", async () => {
  for (const response of [
    providerResponse({ status: "incomplete" }),
    providerResponse({
      output: [{ content: [{ type: "output_text", text: "not json" }] }],
    }),
    providerResponse({
      output: [
        {
          content: [
            {
              type: "output_text",
              text: JSON.stringify({ ...edit, code: "run" }),
            },
          ],
        },
      ],
    }),
    providerResponse({
      output: [
        {
          content: [
            {
              type: "output_text",
              text: JSON.stringify({ ...edit, action: "unsupported" }),
            },
          ],
        },
      ],
    }),
    providerResponse({ output: null }),
    {
      ok: false,
      status: 401,
      json: async () => {
        throw new Error("provider body must not be read");
      },
    },
  ]) {
    const { middleware } = setup(async () => response);
    const result = await invoke(middleware);
    assert.equal(result.status, 502);
    assert.equal(result.body.edit, undefined);
  }
});

test("failed requests are evicted for retry and arbitrary provider errors remain private", async () => {
  let attempt = 0;
  const { middleware, calls } = setup(async () => {
    if (++attempt === 1)
      throw new Error("Astra leaked fake-test-key and user prompt");
    return providerResponse();
  });
  const failure = await invoke(middleware);
  assert.equal(failure.status, 502);
  assert.equal(JSON.stringify(failure).includes("fake-test-key"), false);
  assert.equal(JSON.stringify(failure).includes("user prompt"), false);
  const retry = await invoke(middleware);
  assert.equal(retry.status, 200);
  assert.equal(retry.body.cached, false);
  assert.equal(calls.length, 2);
});

test("ten-attempt session limit includes failures and allows previous cached edits", async () => {
  let attempt = 0;
  const { middleware, calls } = setup(async () => {
    if (++attempt === 2) throw new Error("network failure");
    return providerResponse();
  });
  for (let i = 0; i < 10; i++) {
    const result = await invoke(middleware, { body: request(`king bed ${i}`) });
    assert.equal(result.status, i === 1 ? 502 : 200);
  }
  assert.equal(
    (await invoke(middleware, { body: request("one more king bed") })).status,
    429,
  );
  assert.equal(
    (await invoke(middleware, { body: request("king bed 1") })).status,
    429,
  );
  assert.equal(
    (await invoke(middleware, { body: request("king bed 0") })).body.cached,
    true,
  );
  assert.equal(calls.length, 10);
  assert.equal(
    (await invoke(middleware, { url: "/api/astra/status", method: "GET" })).body
      .attempts,
    10,
  );
});
