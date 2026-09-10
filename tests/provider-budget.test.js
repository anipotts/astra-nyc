import test from "node:test";
import assert from "node:assert/strict";
import { createProviderBudget } from "../server/provider-budget.js";
test("one budget counts failed provider attempts across stages but not media or cache replay", async () => {
  let calls = 0;
  const budget = createProviderBudget({
    maxAttempts: 2,
    fetchFn: async () => {
      calls++;
      return new Response("", { status: 500 });
    },
  });
  await budget.fetchFn("https://silvermanbuilding.com/plan.pdf");
  assert.equal(budget.snapshot().providerAttempts, 0);
  await budget.fetchFn("https://api.openai.com/v1/responses");
  await budget.fetchFn("https://api.openai.com/v1/responses");
  assert.equal(
    (await budget.fetchFn("https://api.openai.com/v1/responses")).status,
    429,
  );
  assert.equal(calls, 3);
  assert.deepEqual(budget.snapshot(), {
    providerAttempts: 2,
    maxAttempts: 2,
    remaining: 0,
  });
});
