// Citation/link acceptance only. This does not fetch URLs, verify source claims,
// establish unit identity, or grant permission to reuse a publisher's media.
export const SOURCE_DOMAINS = Object.freeze([
  "streeteasy.com",
  "zillow.com",
  "realtor.com",
  "apartments.com",
  "urby.com",
  "apartmentfinder.com",
  "redfin.com",
  "theonenj.com",
  "silvermanbuilding.com",
  "relatedrentals.com",
  "gothampoint.com",
  "eosnomad.com",
  "jasperhp.com",
  "live65newkirk.com",
  "rnhousing.org",
  "castironlofts.com",
  "260gold.com",
  "avaloncommunities.com",
]);

// These audited tour/asset tenants may be cited or opened as source links.
// They do not grant download access to their platform or to other tenants.
export const SOURCE_LINK_HOSTS = Object.freeze([
  "my.matterport.com",
  "gothamproperties.file.force.com",
]);

export function normalizeSourceUrl(value) {
  if (
    typeof value !== "string" ||
    value.length > 1200 ||
    /[\s\\\x00-\x1f\x7f]/.test(value)
  )
    throw new Error("Invalid source URL.");

  // Inspect the supplied authority before URL parsing normalizes away :443,
  // empty user information, or malformed HTTPS slashes.
  const authority = /^https:\/\/([^/?#]+)/i.exec(value)?.[1];
  if (
    !authority ||
    !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/i.test(authority) ||
    authority
      .split(".")
      .some(
        (label) =>
          label.length > 63 || label.startsWith("-") || label.endsWith("-"),
      )
  )
    throw new Error("Unsupported source URL.");

  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !(
      SOURCE_LINK_HOSTS.includes(url.hostname) ||
      SOURCE_DOMAINS.some(
        (domain) =>
          url.hostname === domain || url.hostname.endsWith("." + domain),
      )
    )
  )
    throw new Error("Unsupported source URL.");

  // A fragment selects a position within the same source. Unit paths and query
  // parameters remain intact so different evidence documents cannot collide.
  url.hash = "";
  return url.href;
}
