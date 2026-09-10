
const HPD_URL = "https://www.nyc.gov/site/hpd/about/hpd-online.page";
const sourceLink = (url) => {
  try { const parsed = new URL(url); return parsed.protocol === "https:" && ["www.nyc.gov", "data.cityofnewyork.us"].includes(parsed.hostname) && !parsed.username && !parsed.password && !parsed.port ? parsed.href : HPD_URL; }
  catch { return HPD_URL; }
};
const date = (value) => typeof value === "string" ? value.slice(0, 10) : "Not supplied";

// Direction can mount this anywhere in Overview without another view or server.
export function mountBuildingNotes(container, { listing = null, fetchFn = fetch } = {}) {
  let selected = null, generation = 0, request = null;
  const doc = container.ownerDocument;
  const el = (tag, text, className) => {
    const node = doc.createElement(tag); if (text) node.textContent = text;
    if (className) node.className = className; return node;
  };
  const root = el("details", "", "building-notes");
  root.setAttribute("aria-label", "Building notes");
  const heading = el("summary", "Building notes");
  const intro = el("p", "NYC HPD complaints are reports, not verified violations.");
  const button = el("button", "Check building records"); button.type = "button";
  const output = el("div"); output.setAttribute("role", "status"); output.setAttribute("aria-live", "polite");
  const source = el("a", "Open HPD Online ↗"); source.href = HPD_URL; source.target = "_blank"; source.rel = "noopener noreferrer";
  root.append(heading, intro, button, output, source); container.append(root);
  function reset(value) {
    const identity = value ? `${value.id}|${value.mapAddress || value.location}` : "";
    if (selected?.key === identity) return;
    generation++; request?.abort(); request = null;
    selected = value ? { key: identity, address: value.mapAddress || value.location } : null;
    output.replaceChildren(); button.textContent = "Check building records";
    button.disabled = !selected; root.removeAttribute("aria-busy");
  }
  function render(result) {
    output.replaceChildren();
    output.append(el("p", result.message || "Building records are unavailable."));
    if (result.coverage === "completed_with_matches" && Array.isArray(result.findings) && result.findings[0]) {
      const finding = result.findings[0];
      output.append(el("strong", finding.summary));
      output.append(el("p", `Complaint received ${date(finding.receivedAt)} · ${finding.status}`, "building-notes-meta"));
      if (finding.outcome) output.append(el("p", finding.outcome));
      const details = el("details"); details.append(el("summary", "Agency record & viewing question"));
      for (const problem of finding.problems || []) {
        details.append(el("p", `${problem.category}${problem.detail ? " · " + problem.detail : ""} — ${problem.status}`));
        if (problem.agencyExplanation) details.append(el("p", problem.agencyExplanation));
        if (problem.duplicateReported) details.append(el("small", "Source marks this problem as a duplicate report."));
      }
      details.append(el("p", finding.question));
      const link = el("a", `Original HPD complaint ${finding.id} ↗`);
      link.href = sourceLink(finding.sourceUrl); link.target = "_blank"; link.rel = "noopener noreferrer";
      details.append(link); output.append(details);
    }
    if (result.checkedAt) {
      const disclosure = el("details"); disclosure.append(el("summary", "Coverage & sources"));
      disclosure.append(el("p", result.identity?.label || selected?.address));
      disclosure.append(el("p", result.identity?.matchBasis || result.identity?.reason));
      if (result.window) disclosure.append(el("p", `${result.window.start} through ${result.window.end} · HPD complaints only.`));
      disclosure.append(el("p", `${result.cached ? "Cached check" : "Checked"} ${result.checkedAt} · Source updates daily.`, "building-notes-meta"));
      disclosure.append(el("p", result.limitation));
      if (result.truncated) disclosure.append(el("p", "Showing the latest returned records from a 50-problem limit; older records and complaint details may be omitted."));
      output.append(disclosure);
    }
  }
  async function load({ refresh = false } = {}) {
    if (!selected) return null;
    const version = ++generation; request?.abort(); request = new AbortController();
    button.disabled = true; root.setAttribute("aria-busy", "true");
    output.replaceChildren(el("p", "Checking this building’s HPD records…"));
    try {
      const response = await fetchFn("/api/building-notes", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({address:selected.address, refresh}), signal: request.signal });
      const result = await response.json();
      if (version !== generation) return null;
      if (!response.ok || !["completed_with_matches", "completed_no_matches", "unavailable", "ambiguous", "not_supported"].includes(result.coverage))
        throw new Error("Building records are unavailable.");
      render(result); return result;
    } catch (error) {
      if (version === generation && error.name !== "AbortError") output.replaceChildren(el("p", "Building records are unavailable. Retry or use HPD Online; no conclusion about this building was made."));
      return null;
    } finally {
      if (version === generation) { button.disabled = false; button.textContent = "Refresh building records"; root.removeAttribute("aria-busy"); }
    }
  }
  button.onclick = () => load({refresh:button.textContent === "Refresh building records"});
  reset(listing);
  return { setListing: reset, load, destroy() { generation++; request?.abort(); root.remove(); } };
}
