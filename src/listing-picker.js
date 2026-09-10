export function createListingPicker(select, listings, onSelect) {
  const choices = new Map(listings.map((listing) => [listing.id, listing]));
  function add(listing) {
    const option = select.ownerDocument.createElement("option");
    option.value = listing.id;
    option.textContent = listing.name;
    select.append(option);
  }
  listings.forEach(add);
  select.addEventListener("change", () => {
    const listing = choices.get(select.value);
    if (listing) onSelect(listing);
  });
  return {
    select(listing) {
      if (!choices.has(listing.id)) add(listing);
      choices.set(listing.id, listing);
      select.value = listing.id;
    },
  };
}
