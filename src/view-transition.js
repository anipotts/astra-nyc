// User intent changes state immediately; local decoration is cancellable.
export function createViewTransition(
  surface,
  {
    reducedMotion = () =>
      matchMedia("(prefers-reduced-motion: reduce)").matches,
  } = {},
) {
  let animation;
  return {
    run() {
      animation?.cancel();
      animation = null;
      if (!reducedMotion() && surface.animate)
        animation = surface.animate(
          [
            { opacity: 0.65, transform: "translateY(4px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 200, easing: "ease-out" },
        );
    },
    cancel() {
      animation?.cancel();
      animation = null;
    },
  };
}
