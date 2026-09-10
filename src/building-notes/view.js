
const HPD_URL = "https://www.nyc.gov/site/hpd/about/hpd-online.page";
const sourceLink = (url) => {
  try { const parsed = new URL(url); return parsed.protocol === "https:" && ["www.nyc.gov", "data.cityofnewyork.us"].includes(parsed.hostname) && !parsed.username && !parsed.password && !parsed.port ? parsed.href : HPD_URL; }
  catch { return HPD_URL; }
};
const date = (value) => typeof value === "string" ? value.slice(0, 10) : "Not supplied";

// Direction can mount this anywhere in Overview without another view or server.
export function mountBuildingNotes(container, { listing = null, fetchFn = fetch } = {}) {
  let selected = null, generation = 0, request = null, attempted = false;
  const doc = container.ownerDocument;
  const el = (tag, text, className) => {
    const node = doc.createElement(tag); if (text) node.textContent = text;
    if (className) node.className = className; return node;
  };
  const root = el("details", "", "building-notes ui-disclosure");
  root.setAttribute("aria-label", "Building notes");
  const heading = el("summary", "Building notes");
  const button = el("button", "Refresh", "ui-button ui-button--compact ui-button--quiet"); button.type = "button";
  button.setAttribute("aria-label", "Refresh building records");
  const output = el("div"); output.setAttribute("role", "status"); output.setAttribute("aria-live", "polite");
  const source = el("a", "HPD Online ↗", "building-notes-source"); source.href = HPD_URL; source.target = "_blank"; source.rel = "noopener noreferrer";
  const actions = el("div", "", "building-notes-actions"); actions.append(source, button);
  root.append(heading, output, actions); container.append(root);
  function reset(value) {
    const identity = value ? `${value.id}|${value.mapAddress || value.location}` : "";
    if (selected?.key === identity) return;
    generation++; request?.abort(); request = null;
    selected = value ? { key: identity, address: value.mapAddress || value.location } : null;
    attempted = false; root.open = false; button.hidden = true;
    output.replaceChildren(); button.textContent = "Refresh";
    source.textContent = "HPD Online ↗"; source.href = HPD_URL; source.removeAttribute("aria-label");
    button.disabled = !selected; root.removeAttribute("aria-busy");
  }
  function render(result) {
    output.replaceChildren();
    const disclosure = el("details", "", "building-notes-record ui-disclosure");
    disclosure.append(el("summary", "Record & source details"));
    const content = el("div", "", "building-notes-detail-content");
    disclosure.append(content);
    const finding = result.coverage === "completed_with_matches" && result.findings?.[0];
    if (finding) {
      const meta = el("div", "", "building-notes-meta-row");
      const label = el("span", "", "building-notes-agency");
      const icon = el("span", "", "ui-icon ui-icon-buildings"); icon.setAttribute("aria-hidden", "true");
      label.append(icon, el("span", "HPD complaint"));
      const status = el("span", finding.status === "CLOSE" ? "Closed" : finding.status === "OPEN" ? "Open" : finding.status, "ui-chip building-notes-status");
      status.setAttribute("data-status", finding.status);
      meta.append(label, el("span", date(finding.receivedAt)), status);
      output.append(meta, el("strong", finding.summary, "building-notes-summary"));
      if (finding.outcome) output.append(el("div", finding.outcome, "building-notes-outcome"));
      const issues = el("ul", "", "building-notes-issues");
      const explanations = new Map();
      for (const problem of finding.problems || []) {
        const item = el("li");
        const label = problem.detail || problem.category;
        item.append(el("span", label), el("span", problem.status, "building-notes-meta"));
        item.setAttribute("title", problem.category || "HPD problem");
        issues.append(item);
        if (problem.agencyExplanation) {
          const labels = explanations.get(problem.agencyExplanation) || [];
          labels.push(label); explanations.set(problem.agencyExplanation, labels);
        }
        if (problem.duplicateReported) item.append(el("small", "Duplicate report"));
      }
      content.append(issues);
      for (const [explanation, labels] of explanations) {
        const group = el("div", "", "building-notes-agency-detail");
        if (explanations.size > 1) group.append(el("strong", labels.join(" · ")));
        group.append(el("div", explanation)); content.append(group);
      }
      if (finding.question) {
        const question = el("div", "", "building-notes-question");
        question.append(el("strong", "Ask at your viewing"), el("div", finding.question)); content.append(question);
      }
      source.textContent = `Complaint #${finding.id} ↗`; source.href = sourceLink(finding.sourceUrl);
      source.setAttribute("aria-label", `Original HPD complaint ${finding.id}`);
    } else {
      output.append(el("div", result.message || "Building records are unavailable.", "building-notes-outcome"));
      source.textContent = "HPD Online ↗"; source.href = HPD_URL; source.removeAttribute("aria-label");
    }
    output.append(el("div", "Building reports · not verified violations", "building-notes-meta"));
    if (result.checkedAt) {
      const coverage = el("dl", "", "building-notes-coverage");
      const row = (label, value) => { if (value) coverage.append(el("dt", label), el("dd", value)); };
      row("Address", result.identity?.label || selected?.address);
      row("Match", result.identity?.matchBasis || result.identity?.reason);
      if (result.window) row("Window", `${result.window.start} through ${result.window.end}`);
      row("Source", "NYC HPD complaints · updated daily");
      row(result.cached ? "Cached" : "Checked", result.checkedAt);
      content.append(coverage);
      if (result.limitation) content.append(el("div", result.limitation, "building-notes-meta"));
      if (result.truncated) content.append(el("div", "50-problem limit reached; older records and complaint details may be omitted.", "building-notes-meta"));
      const agency = el("a", "HPD Online ↗"); agency.href = HPD_URL; agency.target = "_blank"; agency.rel = "noopener noreferrer";
      content.append(agency);
    }
    if (finding || result.checkedAt) output.append(disclosure);
  }
  async function load({ refresh = false } = {}) {
    if (!selected || !root.open) return null;
    attempted = true;
    let failed = false;
    const version = ++generation; request?.abort(); request = new AbortController();
    button.disabled = true; button.hidden = true; root.setAttribute("aria-busy", "true");
    output.replaceChildren(el("p", "Checking this building’s HPD records…"));
    try {
      const response = await fetchFn("/api/building-notes", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({address:selected.address, refresh}), signal: request.signal });
      const result = await response.json();
      if (version !== generation) return null;
      if (!response.ok || !["completed_with_matches", "completed_no_matches", "unavailable", "ambiguous", "not_supported"].includes(result.coverage))
        throw new Error("Building records are unavailable.");
      failed = result.coverage === "unavailable";
      render(result); return result;
    } catch (error) {
      failed = true;
      if (version === generation && error.name !== "AbortError") output.replaceChildren(el("p", "Building records are unavailable. Retry or use HPD Online; no conclusion about this building was made."));
      return null;
    } finally {
      if (version === generation) { button.disabled = false; button.hidden = false; button.textContent = failed ? "Retry" : "Refresh"; button.setAttribute("aria-label", failed ? "Retry building records" : "Refresh building records"); root.removeAttribute("aria-busy"); }
    }
  }
  button.onclick = () => load({refresh:true});
  root.ontoggle = () => { if (root.open && !attempted) return load(); };
  reset(listing);
  return { setListing: reset, load, destroy() { generation++; request?.abort(); root.ontoggle = null; root.remove(); } };
}
