import test from "node:test";
import assert from "node:assert/strict";
import { createViewTransition } from "../src/view-transition.js";
test("rapid view changes cancel previous decoration and reduced motion prevents animation", () => {
  let calls = 0,
    cancelled = 0,
    reduced = false;
  const transition = createViewTransition(
    {
      animate() {
        calls++;
        return {
          cancel() {
            cancelled++;
          },
        };
      },
    },
    { reducedMotion: () => reduced },
  );
  transition.run();
  transition.run();
  assert.equal(calls, 2);
  assert.equal(cancelled, 1);
  reduced = true;
  transition.run();
  assert.equal(calls, 2);
  assert.equal(cancelled, 2);
  transition.cancel();
  assert.equal(cancelled, 2);
});
