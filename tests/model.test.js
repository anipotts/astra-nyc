import test from "node:test";
import assert from "node:assert/strict";
import { homes, pointOnRoute, blocked } from "../src/model.js";
test("each preview reaches the work endpoint and stays on its declared road segments", () => {
  for (const home of Object.values(homes)) {
    const start = pointOnRoute(home.route, 0),
      end = pointOnRoute(home.route, 1);
    assert.deepEqual([start.x, start.z], home.route[0]);
    assert.deepEqual([end.x, end.z], home.route.at(-1));
    for (let p = 0; p <= 1; p += 0.01) {
      const q = pointOnRoute(home.route, p);
      assert(
        home.route.slice(1).some((b, i) => {
          const a = home.route[i];
          return (
            Math.abs(
              (q.x - a[0]) * (b[1] - a[1]) - (q.z - a[1]) * (b[0] - a[0]),
            ) < 1e-7 &&
            q.x >= Math.min(a[0], b[0]) - 1e-7 &&
            q.x <= Math.max(a[0], b[0]) + 1e-7 &&
            q.z >= Math.min(a[1], b[1]) - 1e-7 &&
            q.z <= Math.max(a[1], b[1]) + 1e-7
          );
        }),
      );
    }
  }
});
test("walking collision includes personal clearance and preserves doorway openings", () => {
  const walls = [
    { minX: -5, maxX: -0.9, minZ: 4, maxZ: 4.2 },
    { minX: 0.9, maxX: 5, minZ: 4, maxZ: 4.2 },
  ];
  assert.equal(blocked(0, 4.1, walls), false);
  assert.equal(blocked(2, 4.1, walls), true);
  assert.equal(blocked(0.8, 4.1, walls), true);
});
