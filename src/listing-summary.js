// Present source facts compactly; do not infer missing beds, area or availability.
export function listingSummary(listing) {
  const sourcedAddress = listing.mapAddress || (/^\d+[\w-]*\s/.test(listing.location || '') ? listing.location : null);
  const address = sourcedAddress?.split(',')[0].trim() || listing.name;
  const facts = (listing.facts || '').split('·').map(part => part.trim()).filter(part =>
    /\bstudio\b|\b\d+(?:\.\d+)?\s*(?:beds?|bedrooms?|baths?|bathrooms?)\b|\b[\d,]+\s*(?:ft²|sq\.?\s*ft)/i.test(part)
  ).join(' · ');
  const rentKnown = /[$£€]\s*\d/.test(listing.price || '');
  return {
    address, facts, price: rentKnown ? listing.price : 'Rent unverified', rentKnown,
    status: listing.historical ? 'Historical source' : listing.archived ? 'Archived listing' : 'Availability unverified',
    details: [listing.facts, listing.availability].filter(Boolean).join(' · '),
  };
}
