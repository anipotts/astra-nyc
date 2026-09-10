// Factual dimensions transcribed during this event after viewing the original PDF.
// No plan artwork is copied. This is seeded inspection data, not runtime extraction.
export const inspectedPlans = [
  {
    schemaVersion: 1,
    id: "charles-type7-bedroom-20260910",
    identity: {
      building: "charles-272-grove",
      units: ["345", "445", "545", "645"],
    },
    inspection: {
      method: "visual_source_review",
      reviewedAt: "2026-09-10T17:13:27Z",
    },
    source: {
      title: "Charles & Co · Type 7",
      url: "https://silvermanbuilding.com/wp-content/uploads/CC_1Bed_45Line.pdf",
      page: 1,
      publishedAt: null,
      artworkDate: "2015-05-13",
      qualification:
        "Historical marketing plan. Region correspondence is a developer-reviewed interpretation of printed dimensions and visible proportions; endpoints are not dimensioned. Published dimensions may change with construction. Current conditions and precise clear-floor geometry remain unverified.",
    },
    use: {
      representation: "factual_region",
      originalArtwork: "link_only",
      rightsStatus: "unresolved",
    },
    conflicts: [],
    region: {
      label: "Main bedroom region",
      shape: "rectangle",
      boundaryBasis: "visually_inspected_region",
      extent:
        "Main bedroom region above the closet partition; entry recess and closet excluded.",
      exclusions: [
        "Closet and entry recess",
        "Wall thickness, windows and door geometry",
        "Ceiling height",
        "Fixtures and current obstructions",
        "Remaining apartment and facade placement",
      ],
      dimensions: [
        {
          value: 11.5,
          unit: "ft",
          printed: "11′6″",
          basis: "printed_dimension",
          locator: "Page 1, BEDROOM label, horizontal span",
        },
        {
          value: 11 + 4 / 12,
          unit: "ft",
          printed: "11′4″",
          basis: "printed_dimension",
          locator: "Page 1, BEDROOM label, vertical main-region span",
        },
      ],
    },
  },
];
