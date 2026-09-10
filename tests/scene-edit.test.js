// Fake-provider coverage proves contracts and isolation, not live Astra behavior.
import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createAstraMiddleware } from "../server/astra.js";
import {
  validateSceneContext,
  validateSceneEdit,
  sceneEditSchema,
} from "../src/scene-edit.js";

const context = (overrides = {}) => ({
  version: 1,
  width: 7,
  depth: 8,
  provenance: "inferred",
  bedSize: "queen",
  lighting: "day",
  unfurnished: false,
  hiddenItems: [],
  ...overrides,
});
const validEdit = { action: "set_visibility", target: "sofa", value: "hide" };
function response(edit = validEdit) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      status: "completed",
      model: "gpt-6-astra",
      id: "fake-scene-response",
      output: [
        { content: [{ type: "output_text", text: JSON.stringify(edit) }] },
      ],
    }),
  };
}
function setup(provider = async () => response()) {
  const calls = [];
  const middleware = createAstraMiddleware({
    apiKey: "private-fake-key",
    fetchImpl: async (...args) => {
      calls.push(args);
      return provider(...args);
    },
  });
  return { calls, middleware };
}
async function invoke(
  middleware,
  {
    body = { prompt: "Hide the sofa", scene: context() },
    headers,
    url = "/api/astra/scene-edit",
    method = "POST",
    raw,
  } = {},
) {
  const req = Readable.from([raw ?? JSON.stringify(body)]);
  Object.assign(req, {
    method,
    url,
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
      writeHead(status) {
        result = { status };
      },
      end(text) {
        result.body = JSON.parse(text);
      },
    },
    () => assert.fail("Unexpected next"),
  );
  return result;
}

test("scene context canonicalizes hidden items and rejects invented fields or invalid dimensions", () => {
  assert.deepEqual(
    validateSceneContext(context({ hiddenItems: ["table", "bed"] }))
      .hiddenItems,
    ["bed", "table"],
  );
  for (const scene of [
    null,
    [],
    {},
    context({ version: 2 }),
    context({ width: NaN }),
    context({ width: Infinity }),
    context({ width: 2.99 }),
    context({ depth: 30.01 }),
    context({ width: "7" }),
    context({ provenance: "verified" }),
    context({ bedSize: "twin" }),
    context({ lighting: "night" }),
    context({ unfurnished: 1 }),
    context({ hiddenItems: ["sofa", "sofa"] }),
    context({ hiddenItems: ["door"] }),
    context({ address: "must not send" }),
  ])
    assert.throws(() => validateSceneContext(scene));
  assert.equal(
    validateSceneContext(
      context({ width: 3, depth: 30, provenance: "synthetic" }),
    ).width,
    3,
  );
});

test("only executable action-target-value tuples pass client/server validation", () => {
  for (const value of ["king", "queen"])
    assert.deepEqual(
      validateSceneEdit({ action: "resize_bed", target: "bed", value }),
      { action: "resize_bed", target: "bed", value },
    );
  for (const target of ["bed", "sofa", "table", "furniture"])
    for (const value of ["show", "hide"])
      assert.equal(
        validateSceneEdit({ action: "set_visibility", target, value }).value,
        value,
      );
  for (const value of ["day", "evening"])
    assert.equal(
      validateSceneEdit({ action: "set_lighting", target: "scene", value })
        .value,
      value,
    );
  for (const edit of [
    null,
    [],
    { ...validEdit, code: "run" },
    { ...validEdit, action: "unsupported" },
    { ...validEdit, target: "window" },
    { ...validEdit, value: "king" },
    { action: "resize_bed", target: "table", value: "king" },
    { action: "set_lighting", target: "bed", value: "day" },
    { action: "set_visibility", target: "sofa", value: true },
  ])
    assert.throws(() => validateSceneEdit(edit));
  assert.equal(sceneEditSchema.additionalProperties, false);
});

test("generic endpoint supplies validated context, isolates scenes, and canonicalizes equivalent cache keys", async () => {
  const { calls, middleware } = setup();
  const first = await invoke(middleware);
  assert.equal(first.status, 200);
  assert.deepEqual(first.body.edit, validEdit);
  assert.equal(first.body.cached, false);
  const sent = JSON.parse(calls[0][1].body);
  assert.deepEqual(JSON.parse(sent.input), {
    prompt: "Hide the sofa",
    scene: context(),
  });
  assert.equal(sent.store, false);
  assert.equal(sent.text.format.strict, true);
  assert.deepEqual(sent.text.format.schema, sceneEditSchema);
  assert.match(sent.instructions, /never partially satisfy/);
  assert.doesNotMatch(JSON.stringify(sent), /95 Wall|wall2308/);
  assert.equal((await invoke(middleware)).body.cached, true);
  for (const patch of [
    { width: 9 },
    { depth: 10 },
    { provenance: "synthetic" },
    { bedSize: "king" },
    { lighting: "evening" },
    { unfurnished: true },
    { hiddenItems: ["bed", "table"] },
  ]) {
    const result = await invoke(middleware, {
      body: { prompt: "Hide the sofa", scene: context(patch) },
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.cached, false);
  }
  assert.equal(
    (
      await invoke(middleware, {
        body: {
          prompt: "  HIDE THE SOFA  ",
          scene: context({ hiddenItems: ["table", "bed"] }),
        },
      })
    ).body.cached,
    true,
  );
  assert.equal(calls.length, 8);
});

test("malformed or unsupported contexts and request metadata never contact provider", async () => {
  const { calls, middleware } = setup();
  for (const body of [
    null,
    [],
    { prompt: "", scene: context() },
    { prompt: "x".repeat(501), scene: context() },
    { prompt: "Hide sofa", scene: "wall2308-inferred-v2" },
    { prompt: "Hide sofa", scene: context({ width: 0 }) },
    { prompt: "Hide sofa", scene: context({ address: "private address" }) },
    { prompt: "Hide sofa", scene: context(), address: "private address" },
  ])
    assert.equal((await invoke(middleware, { body })).status, 400);
  assert.equal((await invoke(middleware, { raw: "{" })).status, 400);
  for (const headers of [
    { host: "evil:5173" },
    { origin: "https://evil" },
    { "content-type": "text/plain" },
  ])
    assert.equal((await invoke(middleware, { headers })).status, 403);
  assert.equal(calls.length, 0);
});

test("unsupported, wrong tuple, extra fields, malformed provider output reject atomically and allow retry", async () => {
  for (const edit of [
    { ...validEdit, action: "unsupported" },
    { ...validEdit, value: "king" },
    { ...validEdit, code: "private-provider-data" },
    [validEdit],
    null,
  ]) {
    let count = 0;
    const { calls, middleware } = setup(async () =>
      response(++count === 1 ? edit : validEdit),
    );
    const failed = await invoke(middleware);
    assert.equal(failed.status, 502);
    assert.equal(failed.body.edit, undefined);
    assert.match(failed.body.error, /Try one change/);
    assert.doesNotMatch(JSON.stringify(failed), /private-provider-data/);
    assert.equal((await invoke(middleware)).status, 200);
    assert.equal(calls.length, 2);
  }
  const { middleware } = setup(async () => {
    throw new Error("private-fake-key private prompt");
  });
  const failed = await invoke(middleware);
  assert.equal(failed.status, 502);
  assert.doesNotMatch(
    JSON.stringify(failed),
    /private-fake-key|private prompt/,
  );
});

test("generic concurrent requests coalesce and generic/legacy endpoints share session budget", async () => {
  let resolveProvider;
  const { calls, middleware } = setup(
    () =>
      new Promise((resolve) => {
        resolveProvider = resolve;
      }),
  );
  const first = invoke(middleware);
  const second = invoke(middleware);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 1);
  resolveProvider(response());
  const results = await Promise.all([first, second]);
  assert.deepEqual(
    results.map((result) => result.body.cached),
    [false, true],
  );

  const shared = setup(async (_url, options) => {
    const generic = JSON.parse(options.body).text.format.name === "scene_edit";
    return response(
      generic
        ? validEdit
        : { action: "resize_bed", target: "existing_bed", size: "king" },
    );
  });
  for (let i = 0; i < 10; i++) {
    const generic = i % 2 === 0;
    const result = await invoke(shared.middleware, {
      url: generic ? "/api/astra/scene-edit" : "/api/astra/edit",
      body: {
        prompt: `king bed ${i}`,
        scene: generic ? context() : "wall2308-inferred-v2",
      },
    });
    assert.equal(result.status, 200);
  }
  assert.equal((await invoke(shared.middleware)).status, 429);
  assert.equal(
    (
      await invoke(shared.middleware, {
        body: { prompt: "king bed 0", scene: context() },
      })
    ).body.cached,
    true,
  );
  assert.equal(shared.calls.length, 10);
});
