// Search classification supplies leads, never accepted dimensional evidence.
// A future inspected-plan/scan adapter must supply separately verified geometry.
export function evidenceCapabilities(sources = []) {
  const exact = sources.filter((s) => s.scope === "exact_unit");
  const photos = exact.filter((s) => s.kind === "photos");
  const plans = exact.filter(
    (s) => s.kind === "floor_plan" || s.kind === "dimensions",
  );
  return [
    {
      id: "source_review",
      label: "Source review",
      status: sources.length ? "available" : "missing",
      sources: sources.map((s) => s.url),
      requirement: sources.length
        ? "Linked references available"
        : "No usable references returned",
    },
    {
      id: "show_source_photos",
      label: "Exact-unit photos",
      status: photos.length ? "partial" : "missing",
      sources: photos.map((s) => s.url),
      requirement: photos.length
        ? "References found; images and unit identity need inspection"
        : "No exact-unit photo reference established in this report",
    },
    {
      id: "show_floor_plan",
      label: "Exact-unit plan",
      status: plans.length ? "partial" : "missing",
      sources: plans.map((s) => s.url),
      requirement: plans.length
        ? "Reference found; layout, scale and permitted use need verification"
        : "No exact-unit plan or dimension reference established in this report",
    },
    {
      id: "render_room_region",
      label: "Room geometry",
      status: "missing",
      sources: [],
      requirement:
        "No inspected, accepted geometry in this source-search adapter",
    },
    {
      id: "render_unit",
      label: "Complete interior",
      status: "missing",
      sources: [],
      requirement:
        "Unit extent, levels, openings and scale have not been verified",
    },
    {
      id: "locate_unit_within_building",
      label: "Unit placement in building",
      status: "missing",
      sources: [],
      requirement: "Floor and facade relationships need separate evidence",
    },
  ];
}
