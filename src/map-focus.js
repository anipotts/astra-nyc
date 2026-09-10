// View changes may interrupt a listing flight; direct map interaction owns the
// camera and cancels that intent. A stopped flight must not mark a target reached.
export function createMapFocus() {
  let target = null;
  return {
    set(camera) { target = structuredClone(camera); },
    cancel() { target = null; },
    get pending() { return target && structuredClone(target); },
    settled(camera) {
      if (target && camera &&
          target.center.every((n, i) => Math.abs(n - camera.center[i]) < 0.00001) &&
          Math.abs(target.zoom - camera.zoom) < 0.01) target = null;
    },
  };
}
