const ENDPOINT = "https://data.cityofnewyork.us/resource/ygpa-z7cr.json";
const HPD = "https://www.nyc.gov/site/hpd/about/hpd-online.page";
const FIELDS = "problem_id,complaint_id,building_id,borough,house_number,street_name,received_date,major_category,minor_category,complaint_status,complaint_status_date,problem_status,problem_status_date,status_description,problem_duplicate_flag,bin";
const BOROUGHS = ["MANHATTAN", "BROOKLYN", "QUEENS", "BRONX", "STATEN ISLAND"];
const LIMIT = 51;
const CACHE_MS = 30 * 60 * 1000;
const clean = (value, max = 240) => typeof value === "string" && value.length <= max && !/[\x00-\x1f\x7f]/.test(value) ? value.trim() : "";
const normalizeStreet = (text) => text.toUpperCase().replace(/(\d+)(ST|ND|RD|TH)\b/g, "$1")
  .replace(/\b(W|E|N|S|ST|AVE|BLVD|RD|PL|DR|LN)\.?\b/g, word => ({W:"WEST",E:"EAST",N:"NORTH",S:"SOUTH",ST:"STREET",AVE:"AVENUE",BLVD:"BOULEVARD",RD:"ROAD",PL:"PLACE",DR:"DRIVE",LN:"LANE"})[word.replace('.', '')])
  .replace(/\s+/g, " ").trim();

export function resolveNotesIdentity({ address, borough } = {}) {
  const input = clean(address, 180);
  if (!input || /https?:|@/.test(input)) return { status: "ambiguous", reason: "Provide a numbered NYC street address and borough." };
  if (/\b(JERSEY CITY|NEW JERSEY|NJ)\b/i.test(input)) return { status: "not_supported", reason: "This source covers New York City only." };
  const upper = input.toUpperCase();
  const inferred = BOROUGHS.filter(b => upper.includes(b));
  if (/LONG ISLAND CITY/.test(upper) && !inferred.includes("QUEENS")) inferred.push("QUEENS");
  if (/NEW YORK,?\s+(NY|NEW YORK)(\s|\d|$)/.test(upper) && !inferred.includes("MANHATTAN")) inferred.push("MANHATTAN");
  const explicit = clean(borough, 30).toUpperCase();
  if (explicit && (!BOROUGHS.includes(explicit) || inferred.some(b => b !== explicit)))
    return { status: "ambiguous", reason: "The borough is missing or conflicts with the address." };
  const chosen = explicit || (inferred.length === 1 ? inferred[0] : null);
  const streetPart = input.split(",")[0].trim();
  const match = /^(\d{1,6}(?:-\d{1,4})?)\s+([A-Za-z0-9 .'-]{3,100})$/.exec(streetPart);
  if (!chosen || !match || /\b(APT|APARTMENT|UNIT|SUITE)\b/i.test(match[2]))
    return { status: "ambiguous", reason: "Confirm the numbered street address and borough; no building was guessed." };
  const street = normalizeStreet(match[2]);
  if (!/\b(STREET|AVENUE|BROADWAY|BOULEVARD|ROAD|PLACE|DRIVE|LANE|PARKWAY|SQUARE|TERRACE|WAY)$/.test(street))
    return { status: "ambiguous", reason: "Use a complete street name and borough." };
  return { status: "resolved", houseNumber: match[1], street, borough: chosen,
    label: `${match[1]} ${street}, ${chosen}`, matchBasis: "Exact numbered street and borough; building records, not selected-unit conditions." };
}

export function buildingNotesQuery(identity, now = Date.now()) {
  const end = new Date(now).toISOString().slice(0, 10);
  const start = new Date(now - 730 * 86400000).toISOString().slice(0, 10);
  const url = new URL(ENDPOINT);
  url.search = new URLSearchParams({
    "$select": FIELDS, borough: identity.borough, house_number: identity.houseNumber, street_name: identity.street,
    "$where": `received_date >= '${start}T00:00:00' AND received_date <= '${end}T23:59:59.999'`,
    "$order": "received_date DESC,problem_id DESC", "$limit": String(LIMIT),
  });
  return { url: url.href, window: { start, end, description: "Past 730 days, by complaint received date" } };
}

export function normalizeBuildingNotes(rows, identity) {
  if (!Array.isArray(rows) || rows.length > LIMIT) throw new Error("Invalid source response.");
  const buildings = new Set(), problems = new Set(), groups = new Map();
  for (const row of rows) {
    if (row?.house_number !== identity.houseNumber || row?.borough !== identity.borough || normalizeStreet(clean(row?.street_name)) !== identity.street)
      throw new Error("Source returned a different address; records were not attached.");
    if (!/^\d+$/.test(row.problem_id) || !/^\d+$/.test(row.complaint_id) || !/^\d+$/.test(row.building_id) || !Number.isFinite(Date.parse(row.received_date)))
      throw new Error("Source record identity or date was incomplete.");
    buildings.add(row.building_id);
    if (buildings.size > 1) return { ambiguous: true, findings: [], truncated: false };
  }
  for (const row of rows.slice(0, LIMIT - 1)) {
    if (problems.has(row.problem_id)) continue;
    problems.add(row.problem_id);
    const recordUrl = new URL(ENDPOINT);
    recordUrl.search = new URLSearchParams({"$select": FIELDS, complaint_id: row.complaint_id});
    let group = groups.get(row.complaint_id);
    if (!group) {
      group = { id: row.complaint_id, kind: "complaint", scope: "building", buildingId: row.building_id,
        receivedAt: row.received_date, status: clean(row.complaint_status, 80) || "Not supplied",
        statusAt: clean(row.complaint_status_date, 80) || null, sourceUrl: recordUrl.href, problems: [] };
      groups.set(row.complaint_id, group);
    }
    group.problems.push({ id: row.problem_id, category: clean(row.major_category, 100) || "Unspecified",
      detail: clean(row.minor_category, 100), status: clean(row.problem_status, 80) || "Not supplied",
      statusAt: clean(row.problem_status_date, 80) || null, agencyExplanation: clean(row.status_description, 2000),
      duplicateReported: row.problem_duplicate_flag === "Y" });
  }
  const findings = [...groups.values()].slice(0, 3).map(group => ({ ...group,
    summary: `Reported ${[...new Set(group.problems.map(p => p.category.toLowerCase()))].join(", ")}.`,
    outcome: group.problems.every(p => /did not violate/i.test(p.agencyExplanation))
      ? "HPD reported no violation in the inspected conditions."
      : group.problems.some(p => /not able to gain access/i.test(p.agencyExplanation))
        ? "HPD reported it could not gain inspection access; this does not establish repair."
        : "See the agency record for the reported outcome; closure alone does not establish repair.",
    question: "What was the outcome of this report, and is there recent documentation of any inspection or work completed?",
  }));
  return { findings, truncated: rows.length === LIMIT, returnedProblems: problems.size };
}

async function boundedJson(response) {
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`NYC HPD source unavailable (HTTP ${response.status}).`);
  }
  const reader = response.body.getReader(); let size = 0; const chunks = [];
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length; if (size > 160000) throw new Error("NYC HPD response exceeded the bounded record limit.");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function createBuildingNotesService({ fetchFn = fetch, now = Date.now } = {}) {
  const cache = new Map(), pending = new Map();
  return async function lookup(input) {
    const identity = resolveNotesIdentity(input);
    const base = { identity, source: { publisher: "NYC Housing Preservation and Development", dataset: "Housing Maintenance Code Complaints and Problems", url: HPD, updateFrequency: "Daily" },
      checkedAt: new Date(now()).toISOString(), findings: [], cached: false,
      limitation: "Complaints are reports, not verified violations or a safety assessment. Records may concern other units. Administrative closure does not necessarily establish repair. Only this source and date window were searched." };
    if (identity.status !== "resolved") return { ...base, coverage: identity.status === "not_supported" ? "not_supported" : "ambiguous", message: identity.reason };
    const query = buildingNotesQuery(identity, now());
    const key = query.url; const saved = cache.get(key);
    if (!input.refresh && saved && saved.expires > now()) return { ...saved.result, cached: true };
    if (pending.has(key)) return { ...(await pending.get(key)), cached: true };
    if (pending.size >= 4) return { ...base, window: query.window, coverage: "unavailable", message: "Building records are busy. Try again shortly." };
    const work = (async () => {
      const started = now();
      let result;
      try {
        const response = await fetchFn(query.url, { redirect: "error", credentials: "omit", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
        const normalized = normalizeBuildingNotes(await boundedJson(response), identity);
        result = { ...base, window: query.window, queryUrl: query.url, ...normalized,
          coverage: normalized.ambiguous ? "ambiguous" : normalized.findings.length ? "completed_with_matches" : "completed_no_matches",
          message: normalized.ambiguous ? "This address matched multiple HPD building identifiers. Review the official source before attaching a record." : normalized.findings.length ? "Recent HPD complaint records" : "No matching HPD complaints were returned for this exact address and time window. This does not establish no issues." };
      } catch (error) {
        result = { ...base, window: query.window, queryUrl: query.url, coverage: "unavailable", message: error.name === "TimeoutError" || error.name === "AbortError" ? "NYC HPD lookup timed out. Try again or open HPD Online." : "NYC HPD records could not be retrieved or matched reliably. Try again or open HPD Online.",
          failure: clean(error.message, 180) || "Source lookup failed." };
      }
      result.latencyMs = Math.max(0, now() - started);
      if (cache.size >= 100) cache.delete(cache.keys().next().value);
      cache.set(key, { expires: now() + (result.coverage === "unavailable" ? 15000 : CACHE_MS), result });
      return result;
    })();
    pending.set(key, work);
    try { return await work; } finally { pending.delete(key); }
  };
}

export function createBuildingNotesMiddleware(options = {}) {
  const lookup = createBuildingNotesService(options);
  const send = (res, status, body) => { res.writeHead(status, {"Content-Type":"application/json", "Cache-Control":"no-store"}); res.end(JSON.stringify(body)); };
  return async (req, res, next) => {
    if (req.url !== "/api/building-notes") return next();
    if (req.method !== "POST") return send(res, 405, { error: "Use POST." });
    if (!/^127\.0\.0\.1:\d+$/.test(req.headers.host ?? "") || req.headers.origin !== `http://${req.headers.host}` || !/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] ?? ""))
      return send(res, 403, { error: "Use the local app to check building records." });
    try {
      const chunks=[]; let size=0;
      for await (const chunk of req) { size += Buffer.byteLength(chunk); if(size>2048)return send(res,413,{error:"Request too large."}); chunks.push(Buffer.from(chunk)); }
      const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).some(k=>!["address","borough","refresh"].includes(k)) || typeof data.address !== "string" || data.address.length>180 || (data.borough !== undefined && typeof data.borough !== "string") || (data.refresh !== undefined && typeof data.refresh !== "boolean"))
        return send(res,400,{error:"Provide a public building address, optional borough and refresh flag."});
      return send(res,200,await lookup(data));
    } catch { return send(res,400,{error:"Invalid building-notes request."}); }
  };
}
