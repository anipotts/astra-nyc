import { setupSearchSuggestions } from "./search-suggestions.js";
import { createListingPicker } from "./listing-picker.js";
import { normalizeSourceUrl } from "./source-policy.js";
import {
  listings,
  identifyListing,
  auditedExamples,
  additionalExamples,
} from "./listings.js";
const aliases = {
  charles345: "charles co 345 272 grove street jersey city new jersey",
  wall2308: "95 wall street 2308 financial district manhattan new york",
  zephyr501: "zephyr lofts 501 689 marin boulevard jersey city new jersey",
  urby409: "journal square urby 409 532 summit avenue jersey city new jersey",
  urby1504: "journal square urby 1504 532 summit avenue jersey city new jersey",
};
function normalize(value) {
  return value
    .toLowerCase()
    .replace(/\bnyc\b/g, "new york")
    .replace(/\bnj\b/g, "new jersey")
    .replace(/\bny\b/g, "new york")
    .replace(/\bst\b/g, "street")
    .replace(/\bblvd\b/g, "boulevard")
    .replace(/\bave\b/g, "avenue")
    .replace(/\b(?:apartment|apt|unit|usa)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
export function findKnownListings(query) {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (query.trim().length < 3 || !tokens.length) return [];
  return listings.filter((l) =>
    tokens.every((token) =>
      normalize(aliases[l.id] || `${l.name} ${l.mapAddress || l.location}`)
        .split(" ")
        .some((word) => word.startsWith(token)),
    ),
  );
}
export function safeListingUrl(value) {
  return normalizeSourceUrl(value);
}
export function candidateListing(candidate, checkedAt) {
  if (
    !candidate ||
    !["name", "address", "note"].every(
      (key) =>
        typeof candidate[key] === "string" && candidate[key].length <= 500,
    ) ||
    !Number.isFinite(Date.parse(checkedAt))
  )
    throw new Error(
      "The search returned an incomplete candidate. Try a more specific address.",
    );
  const url = safeListingUrl(candidate.url);
  return {
    id: "discovery-" + encodeURIComponent(url),
    url,
    name: candidate.name,
    location: candidate.address,
    facts: "Search candidate · unit and listing details need review",
    price: "Rent not verified",
    availability: "Current availability not verified.",
    checkedAt,
    archived: false,
    discovery: true,
    scene: null,
    dimensionalReadiness: "needs-evidence",
    readinessReason:
      "This is a search-discovered source, not a verified apartment model. Confirm the building and unit at the source. No floor plan, dimensions or current condition have been established.",
    questions:
      "Confirm the exact building and unit, listing date, availability, rent and permission to use a matching floor plan. Search results may include building pages or archived listings.",
  };
}
export function setupListingIntake(onSelect) {
  const $ = (s) => document.querySelector(s);
  const picker = createListingPicker($("#listing-select"), [...auditedExamples, ...additionalExamples], (listing) => {
    cancel();
    onSelect(listing);
  });
  let request = null;
  let generation = 0;
  function cancel() {
    generation++;
    request?.abort();
    request = null;
    $("#address-form button").disabled = false;
    $("#listing-form button").disabled = false;
  }
  function render(items, meta = null) {
    const results = $("#listing-results");
    results.replaceChildren();
    results.hidden = !items.length;
    for (const item of items) {
      const card = document.createElement("article");
      card.className = "listing-match";
      const title = document.createElement("strong");
      title.textContent = item.name;
      const description = document.createElement("p");
      description.textContent = item.location || item.address;
      const known = meta ? identifyListing(item.url) : item;
      const status = document.createElement("p");
      status.textContent = meta
        ? `${known?.archived ? "Archived · " : ""}Search candidate · confirm building and unit`
        : `${item.archived ? "Archived · " : ""}Saved source snapshot · ${item.facts}`;
      const footer = document.createElement("footer");
      const link = document.createElement("a");
      link.href = safeListingUrl(item.url);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "View source ↗";
      const select = document.createElement("button");
      select.type = "button";
      select.textContent = meta ? "Review this place →" : "Open Overview →";
      select.onclick = () => {
        cancel();
        onSelect(known || candidateListing(item, meta.checkedAt));
      };
      footer.append(link, select);
      card.append(title, description, status, footer);
      results.append(card);
    }
  }
  function localMatches(showResults = false) {
    cancel();
    const found = findKnownListings($("#listing-address").value);
    if (showResults) render(found);
    else $("#listing-results").hidden = true;
    $("#listing-status").textContent = "";
    $("#search-online").hidden = !showResults || !found.length;
    return found;
  }
  async function online(query) {
    cancel();
    const version = generation;
    request = new AbortController();
    $("#address-form button").disabled = true;
    $("#listing-form button").disabled = true;
    $("#listing-status").textContent = "Finding public listing sources…";
    $("#search-online").hidden = true;
    try {
      const response = await fetch("/api/listings/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: request.signal,
      });
      const data = await response.json();
      if (version !== generation) return;
      if (!response.ok)
        throw new Error(
          data.error ||
            "Listing search is unavailable. Try an example or a direct link.",
        );
      if (!Array.isArray(data.candidates) || data.candidates.length > 3)
        throw new Error("Search returned an invalid candidate list.");
      data.candidates.forEach((c) => candidateListing(c, data.checkedAt));
      render(data.candidates, data);
      $("#listing-status").textContent = data.candidates.length
        ? `${data.cached ? "Cached search" : "Astra search"} · Choose the matching building or unit. Details and availability still need source review.`
        : "No sourced matches found. Add a street number, city or unit, or paste the listing link.";
    } catch (error) {
      if (version === generation && error.name !== "AbortError")
        $("#listing-status").textContent = error.message;
    } finally {
      if (version === generation) {
        request = null;
        $("#address-form button").disabled = false;
        $("#listing-form button").disabled = false;
      }
    }
  }
  $("#listing-address").addEventListener("input", () => localMatches());
  const suggestions = setupSearchSuggestions($("#listing-address"),
    [...auditedExamples, ...additionalExamples], findKnownListings,
    (listing) => { cancel(); onSelect(listing); }, () => localMatches());
  $("#listing-url").addEventListener("input", () => {
    cancel();
    $("#listing-status").textContent = "";
    $("#listing-results").hidden = true;
    $("#search-online").hidden = true;
  });
  $("#address-form").onsubmit = (event) => {
    event.preventDefault();
    const query = $("#listing-address").value.trim();
    suggestions.close();
    suggestions.remember({ kind: "query", value: query });
    if (/^https?:\/\//i.test(query)) {
      $("#listing-url").value = query;
      $("#listing-form").requestSubmit();
      return;
    }
    const found = localMatches(true);
    if (found.length === 1) onSelect(found[0]);
    else if (!found.length) online(query);
  };
  $("#search-online").onclick = () =>
    online($("#listing-address").value.trim());
  $("#listing-form").onsubmit = (event) => {
    event.preventDefault();
    cancel();
    try {
      const url = $("#listing-url").value.trim();
      const known = identifyListing(url);
      if (known) return onSelect(known);
      const source = new URL(safeListingUrl(url));
      source.search = "";
      source.hash = "";
      const cleanUrl = source.href;
      if (cleanUrl.length > 180)
        throw new Error(
          "This link is too long for this search experiment. Remove tracking parameters or search its address.",
        );
      online(cleanUrl);
    } catch (error) {
      $("#listing-status").textContent = error.message;
    }
  };
  for (const button of document.querySelectorAll("[data-listing]"))
    button.onclick = () => {
      cancel();
      onSelect(listings.find((l) => l.id === button.dataset.listing));
    };
  return {
    select(listing) {
      picker.select(listing);
      suggestions.close();
      if (listings.some((item) => item.id === listing.id))
        suggestions.remember({ kind: "listing", value: listing.id });
    },
  };
}
