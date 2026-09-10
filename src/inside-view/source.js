import { nycListings } from '../nyc-listings.js';
import { normalizeSourceUrl } from '../source-policy.js';

// Bind the automatic preview to this catalog record's own published document.
// A valid publisher URL alone must not borrow another home's plan.
export function insideSourcePlan(listing) {
  if (!listing?.id || !listing.planUrl) return null;
  const record = nycListings.find((item) => item.id === listing.id);
  if (!record?.planUrl) return null;
  try {
    const sourceUrl = normalizeSourceUrl(listing.planUrl);
    if (sourceUrl !== normalizeSourceUrl(record.planUrl) || !/\.pdf$/i.test(new URL(sourceUrl).pathname)) return null;
    return {
      sourceUrl,
      title: listing.name || record.name,
      listingId: record.id,
      scope: record.planScope === 'type_only'
        ? 'Residence-type plan · exact apartment not selected'
        : record.planScope === 'unit_group'
          ? 'Residence-group plan · confirm the selected unit'
          : 'Published plan · unit match unverified',
    };
  } catch { return null; }
}
