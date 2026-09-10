// Trusted, event-inspected records enter here separately from model/search prose.
// Acceptance validates a limited nominal 2D region, never unseen architecture.
const finitePositive = (v) =>
  typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 100;
export function acceptInspectedRegion(record, identity) {
  const fail = (reason) => {
    throw new Error(`Plan not accepted: ${reason}`);
  };
  if (
    !record ||
    record.schemaVersion !== 1 ||
    record.inspection?.method !== "visual_source_review"
  )
    fail("original plan inspection required");
  if (
    !identity ||
    record.identity?.building !== identity.building ||
    !record.identity.units?.includes(identity.unit)
  )
    fail("building and unit mapping do not match");
  if (
    !record.inspection.reviewedAt ||
    !Number.isFinite(Date.parse(record.inspection.reviewedAt))
  )
    fail("inspection date required");
  if (record.conflicts?.length || !Array.isArray(record.conflicts))
    fail("unresolved conflicts");
  const source = record.source;
  let url;
  try {
    url = new URL(source.url);
  } catch {
    fail("source URL required");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !Number.isInteger(source.page) ||
    source.page < 1
  )
    fail("public HTTPS source and page required");
  if (
    !(
      source.publishedAt === null ||
      Number.isFinite(Date.parse(source.publishedAt))
    ) ||
    !source.qualification
  )
    fail("source date and qualification required");
  if (
    record.use?.representation !== "factual_region" ||
    record.use?.originalArtwork !== "link_only"
  )
    fail("representation use not established");
  const region = record.region;
  if (
    region?.shape !== "rectangle" ||
    region.boundaryBasis !== "visually_inspected_region" ||
    !region.extent ||
    !region.exclusions?.length
  )
    fail("inspected region extent required");
  if (
    !record.id ||
    !region.label ||
    !Array.isArray(region.dimensions) ||
    region.dimensions.length !== 2
  )
    fail("two source-linked dimensions required");
  const dimensions = region.dimensions.map((d) => {
    if (
      !finitePositive(d.value) ||
      !["ft", "m"].includes(d.unit) ||
      d.basis !== "printed_dimension" ||
      typeof d.locator !== "string" ||
      !d.locator.trim() ||
      !d.printed
    )
      fail("printed dimensional evidence required");
    return d.value * (d.unit === "ft" ? 0.3048 : 1);
  });
  const [width, depth] = dimensions;
  return {
    id: `${record.id}-${identity.unit}`,
    label: `${identity.label} · ${region.label}`,
    units: "m",
    width,
    depth,
    measurementStatus: "published nominal",
    representation: "inspected_2d_region",
    height: null,
    extent: region.extent,
    exclusions: [...region.exclusions],
    qualification: source.qualification,
    sourceDate: source.publishedAt,
    artworkDate: source.artworkDate || null,
    sourceUse: { ...record.use },
    sources: [
      {
        url: url.href,
        title: `${source.title} · page ${source.page} · ${source.publishedAt ? "Published " + source.publishedAt : "Publication date unknown"}${source.artworkDate ? "; embedded artwork metadata " + source.artworkDate : ""} · ${url.href}`,
      },
    ],
    revision: {
      id: record.id,
      createdAt: record.inspection.reviewedAt,
      summary: "Source-seeded visual inspection; nominal 2D region only",
    },
    elements: [
      {
        id: "accepted-region",
        label: region.label,
        category: "structure",
        kind: "floor",
        x: 0,
        z: 0,
        width,
        depth,
        height: null,
        y: null,
        rotation: 0,
        visible: true,
        evidence: {
          basis: "printed_dimension",
          source: `${source.title}, page ${source.page}; ${region.dimensions.map((d) => d.printed).join(" × ")}`,
        },
      },
    ],
    openings: [],
  };
}

export function inspectedRegionCapabilities(layout) {
  if (layout?.representation !== "inspected_2d_region") return [];
  return [
    {
      id: "render_room_region",
      label: "Inspected 2D region",
      status: "partial",
      sources: layout.sources.map((s) => s.url),
      requirement: `${layout.extent} Published nominal dimensions; excluded portions remain absent.`,
    },
    {
      id: "export_supported_plan",
      label: "Export supported region",
      status: "available",
      sources: layout.sources.map((s) => s.url),
      requirement: "2D factual region with source, date and exclusions",
    },
    {
      id: "render_unit",
      label: "Complete interior",
      status: "missing",
      sources: [],
      requirement:
        "Complete boundaries, openings, fixtures and ceiling heights are not established",
    },
    {
      id: "calculate_specific_clearance",
      label: "Furniture clearance",
      status: "missing",
      sources: [],
      requirement:
        "Obstacles, operating envelopes and actual object dimensions need evidence",
    },
  ];
}
