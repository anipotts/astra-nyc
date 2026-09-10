export const homes = {
  current: {
    label: "Current home",
    width: 10,
    depth: 8,
    sofa: "#637855",
    route: [
      [0, 12],
      [22, 12],
      [22, -24],
      [42, -24],
    ],
  },
  potential: {
    label: "Potential home",
    width: 12,
    depth: 10,
    sofa: "#748669",
    route: [
      [0, 12],
      [-22, 12],
      [-22, -24],
      [42, -24],
    ],
  },
};
// Synthetic world coordinates in metres; neither route is geographic source data.
export function pointOnRoute(route, progress) {
  const lengths = route
    .slice(1)
    .map((p, i) => Math.hypot(p[0] - route[i][0], p[1] - route[i][1]));
  let distance =
    Math.max(0, Math.min(1, progress)) * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i] || i === lengths.length - 1) {
      const t = lengths[i] ? distance / lengths[i] : 0,
        a = route[i],
        b = route[i + 1];
      return {
        x: a[0] + (b[0] - a[0]) * t,
        z: a[1] + (b[1] - a[1]) * t,
        dx: b[0] - a[0],
        dz: b[1] - a[1],
      };
    }
    distance -= lengths[i];
  }
}
export function blocked(x, z, boxes, radius = 0.22) {
  return boxes.some(
    (b) =>
      x > b.minX - radius &&
      x < b.maxX + radius &&
      z > b.minZ - radius &&
      z < b.maxZ + radius,
  );
}
