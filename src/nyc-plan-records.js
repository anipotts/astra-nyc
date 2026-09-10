// Current-event inspection of the publisher's actual MiMA H-line PDF.
// Observations are deliberately separate from records accepted as room geometry.
// No source artwork or model-generated boundaries are reproduced here.
const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

// Keep this compatible with direction's [...inspectedPlans, ...nycInspectedPlans].
// No MiMA region currently satisfies the trusted acceptance contract.
export const nycInspectedPlans = Object.freeze([]);

export const nycPlanStudies = freeze([
  {
    id: 'mima-h39-50-review-20260910',
    listingId: 'mima48h',
    status: 'source_plan_only',
    acceptedGeometry: null,
    reviewedAt: '2026-09-10T19:23:44Z',
    method: 'visual_source_review',
    identity: {
      building: 'mima-450-west-42nd',
      unit: '48H',
      label: 'MiMA #48H',
      scope: 'unit_group',
      mappedUnits: Array.from({ length: 12 }, (_, index) => `${index + 39}H`),
      basis: 'Publisher drawing explicitly identifies residence H on floors 39 through 50; 48H belongs to that group. Current exact-unit construction is not established.',
    },
    source: {
      url: 'https://www.relatedrentals.com/sites/default/files/2021-04/MiMA_H_39-50.pdf',
      title: 'MiMA H-line plan, floors 39 through 50',
      page: 1,
      publishedAt: null,
      artworkDate: '2011-02-21',
      artworkDateBasis: 'Embedded PDF creation/modification metadata; no visible publication date.',
      acquiredAt: '2026-09-10T19:23:05Z',
      byteLength: 51579,
      sha256: 'b403ebd402eac922dc6b7d5b8e55be673c37ec15516cc6bef357f26bf46531f9',
      originalArtwork: 'link_only',
      rightsStatus: 'unresolved',
      qualification: 'Publisher marketing plan states approximate dimensions. Printed sizes have no dimension lines/endpoints or explicit drawing scale. The URL directory date does not establish publication, and current unit conditions are unverified.',
    },
    reportedDimensions: [
      {
        label: 'Living/dining room',
        printed: '11′10″ × 15′0″',
        values: [11 + 10 / 12, 15],
        unit: 'ft',
        basis: 'printed_dimension',
        locator: 'Page 1, living/dining label in the lower-right room area.',
        boundaryStatus: 'not_accepted',
        reason: 'The southern/right boundary has a jog, the west side connects to shared circulation around a projecting closet, and the kitchen edge defines another change of extent. Printed spans do not identify their endpoints. A rectangular clear-floor subset cannot inherit both nominal dimensions.',
      },
      {
        label: 'Sleeping alcove',
        printed: '9′4″ × 11′5″',
        values: [9 + 4 / 12, 11 + 5 / 12],
        unit: 'ft',
        basis: 'printed_dimension',
        locator: 'Page 1, sleeping-alcove label in the lower-left room area.',
        boundaryStatus: 'not_accepted',
        reason: 'Closet projections and an open connection interrupt the upper/right extent; the lower-left boundary also steps inward. The labels do not specify a rectangular subregion or which recesses/obstructions their spans include.',
      },
    ],
    geometryGaps: [
      'Dimension endpoints and a defensible dimension-to-boundary correspondence',
      'Dimensions for boundary jogs, closet projections and open circulation connections',
      'Reviewed clear-floor polygon with measured fixed obstacles and openings',
      'Source-derived ceiling height and vertical geometry',
      'Current exact-unit condition and construction confirmation',
    ],
    discrepancies: [
      'The official 48H unit page classifies the apartment as a studio; the H-group PDF labels its type as a junior one-bedroom. Preserve both source descriptions; neither proves the current unit layout.',
    ],
    listingObservation: {
      url: 'https://www.relatedrentals.com/apartment-rentals/new-york-city/midtown-manhattan/mima/studio-1-bath-31510',
      checkedAt: '2026-09-10T19:22:55Z',
      availability: 'The official unit page says the apartment is no longer available.',
      archived: true,
    },
    nextStep: 'Offer an external link to the publisher plan with its nominal dimension labels and unit-group scope. Seek endpoint-marked dimensions or independently reviewed measurements before accepting a rectangle or polygon. Do not derive a scale from the marketing illustration.',
  },
]);
