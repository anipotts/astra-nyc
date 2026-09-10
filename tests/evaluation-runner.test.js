import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateSuite,
  parseArgs,
  requestForCase,
  responseRecord,
} from "../scripts/evaluate-evidence.mjs";

const item = (id, overrides = {}) => ({
  case_id: id,
  split: "iteration",
  address_input: "272 Grove Street, Jersey City, NJ",
  unit_input: "345",
  source_urls: ["https://silvermanbuilding.com/plan.pdf"],
  reference_expectations: {
    positive_assertions: ["Resolve unit"],
    prohibited_assertions: ["Do not invent scale"],
  },
  ...overrides,
});
const options = {
  baseUrl: "http://127.0.0.1:5173",
  maxCalls: 2,
  holdouts: false,
};
const report = {
  readiness: "needs_review",
  requestId: "resp_test",
  model: "gpt-6-astra",
  sources: [
    {
      url: "https://silvermanbuilding.com/plan.pdf",
      scope: "exact_unit",
      kind: "floor_plan",
      level: "unit",
    },
  ],
  usage: { inputTokens: 200, outputTokens: 40, cachedTokens: 100 },
  cached: false,
};

test("CLI requires paths and bounds calls to local origin with explicit holdouts", () => {
  const base = ["--suite", "/tmp/suite.json", "--output", "/tmp/result.json"];
  assert.equal(parseArgs(base).maxCalls, 2);
  assert.equal(parseArgs([...base, "--holdouts"]).holdouts, true);
  for (const value of ["9", "-1", "2.5", "2x"])
    assert.throws(() => parseArgs([...base, "--max-calls", value]));
  for (const url of [
    "https://example.com",
    "http://127.0.0.1:5173/path",
    "http://user@127.0.0.1:5173",
    "http://127.0.0.1:99999",
  ])
    assert.throws(() => parseArgs([...base, "--base-url", url]));
  assert.throws(() => parseArgs([]));
  assert.throws(() => parseArgs([...base, "--unknown"]));
  assert.throws(() => parseArgs([...base, "--suite", "x"]));
});

test("request preserves exact source and identity and omits absent unit", () => {
  assert.deepEqual(requestForCase(item("one")), {
    address: "272 Grove Street, Jersey City, NJ unit 345",
    sourceUrl: "https://silvermanbuilding.com/plan.pdf",
  });
  assert.equal(
    requestForCase(item("type", { unit_input: null })).address,
    "272 Grove Street, Jersey City, NJ",
  );
});

test("sequential source-seeded run blocks unsupported sources without consuming budget", async () => {
  const requests = [];
  let active = 0;
  const run = await evaluateSuite(
    {
      cases: [
        item("a"),
        item("blocked", { source_urls: ["https://unsupported.test/plan"] }),
        item("b"),
        item("c"),
        item("holdout", { split: "held_out_acceptance" }),
      ],
    },
    options,
    {
      code: { commit: "test", dirty: true },
      fetchImpl: async (url, init) => {
        assert.equal(active++, 0);
        requests.push({
          url,
          body: JSON.parse(init.body),
          origin: init.headers.Origin,
        });
        await Promise.resolve();
        active--;
        return { ok: true, status: 200, json: async () => report };
      },
    },
  );
  assert.deepEqual(run.summary, {
    attempted: 2,
    completed: 2,
    blocked: 1,
    not_run: 1,
    failed: 0,
  });
  assert.equal(requests.length, 2);
  assert.equal(requests[0].origin, options.baseUrl);
  assert.deepEqual(requests[0].body, requestForCase(item("a")));
  assert.equal(
    run.cases[0].capabilities.find((c) => c.id === "render_room_region").status,
    "missing",
  );
  assert.equal(run.cases[0].expected.assertion_review, "not_evaluated");
  assert.equal(run.positive_geometry_not_evaluated, true);
  assert.equal(
    run.cases[0].stages.address_only_discovery,
    "not_run_source_seeded",
  );
  assert.equal(run.cases[1].attempts, 0);
  assert.ok(run.ended_at);
});

test("local replay and provider cached token usage remain independent", () => {
  const live = responseRecord(report);
  assert.equal(live.local_result_replay, false);
  assert.equal(live.provider.usage.cached_input_tokens, 100);
  const replay = responseRecord({
    ...report,
    cached: true,
    usage: { inputTokens: 200 },
  });
  assert.equal(replay.local_result_replay, true);
  assert.equal(replay.provider.usage.cached_input_tokens, null);
  assert.equal(replay.provider.usage.output_tokens, null);
});

test("HTTP errors and thrown secret-bearing errors are sanitized and never retried", async () => {
  let calls = 0;
  const run = await evaluateSuite(
    { cases: [item("a"), item("b"), item("c")] },
    options,
    {
      fetchImpl: async () => {
        calls++;
        if (calls === 1) return { ok: false, status: 429 };
        throw new Error("secret-value");
      },
    },
  );
  assert.equal(calls, 2);
  assert.equal(run.summary.failed, 2);
  assert.equal(run.cases[0].http_status, 429);
  assert.equal(run.cases[2].status, "not_run_budget");
  assert.equal(JSON.stringify(run).includes("secret-value"), false);
});

test("holdouts are explicitly selected; zero budget makes no HTTP call", async () => {
  const run = await evaluateSuite(
    { cases: [item("a"), item("holdout", { split: "held_out_acceptance" })] },
    { ...options, holdouts: true, maxCalls: 0 },
    { fetchImpl: () => assert.fail("No calls expected") },
  );
  assert.deepEqual(
    run.cases.map((c) => c.case_id),
    ["holdout"],
  );
  assert.equal(run.summary.not_run, 1);
});
