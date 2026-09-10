import { safeListingUrl } from "./listing-intake.js";
import { inspectedRegionCapabilities } from "./inspected-plan.js";
import { evidenceCapabilities } from "./evidence-readiness.js";
export function setupEvidenceReview({ inspectPlan } = {}) {
  const $ = (s) => document.querySelector(s);
  let listing = null;
  let acceptedRegion = null;
  let generation = 0;
  let pending = null;
  const reports = new Map();
  function render(report) {
    const panel = $("#evidence-report");
    panel.replaceChildren();
    panel.hidden = false;
    const title = document.createElement("h3");
    title.textContent = "Interior readiness · needs review";
    const summary = document.createElement("p");
    summary.textContent = report.assessment;
    const qualification = document.createElement("p");
    qualification.className = "evidence-qualification";
    qualification.textContent = acceptedRegion
      ? "Astra assessed text references. A separately inspected historical 2D region is available in Plans; this search did not generate it. Complete interior and source artwork reuse rights remain unresolved."
      : "Astra assessed text references. Source identity, image contents, plan scale and reuse permission still need verification. No interior has been generated.";
    panel.append(title, summary, qualification);
    const capabilities = document.createElement("details");
    const capabilityTitle = document.createElement("summary");
    capabilityTitle.textContent = "What this supports";
    const capabilityList = document.createElement("ul");
    const accepted = inspectedRegionCapabilities(acceptedRegion);
    const capabilitiesForReport = [
      ...evidenceCapabilities(report.sources).filter(
        (c) => !accepted.some((a) => a.id === c.id),
      ),
      ...accepted,
    ];
    for (const capability of capabilitiesForReport) {
      const item = document.createElement("li");
      item.textContent = capability.label + ": " + capability.requirement;
      capabilityList.append(item);
    }
    capabilities.append(capabilityTitle, capabilityList);
    panel.append(capabilities);
    for (const [heading, values] of [
      ["Missing evidence", report.gaps],
      ["Conflicts to resolve", report.conflicts],
    ]) {
      if (!values.length) continue;
      const section = document.createElement("details");
      section.open = heading === "Missing evidence";
      const label = document.createElement("summary");
      label.textContent = heading;
      const list = document.createElement("ul");
      for (const text of values) {
        const item = document.createElement("li");
        item.textContent = text;
        list.append(item);
      }
      section.append(label, list);
      panel.append(section);
    }
    const sourceDetails = document.createElement("details");
    const sourceTitle = document.createElement("summary");
    sourceTitle.textContent = `${report.sources.length} source references`;
    sourceDetails.append(sourceTitle);
    const scopes = {
      exact_unit: "Reported exact unit",
      unit_group: "Mapped unit group / layout type",
      building: "Building-wide",
      other_unit: "Different unit",
      unclear: "Identity unclear",
    };
    const kinds = {
      listing: "Listing",
      photos: "Photo reference",
      floor_plan: "Plan reference",
      dimensions: "Dimension reference",
      other: "Other reference",
    };
    for (const source of report.sources) {
      const article = document.createElement("article");
      article.className = "evidence-reference";
      const link = document.createElement("a");
      link.href = safeListingUrl(source.url);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = source.title + " ↗";
      const metadata = document.createElement("small");
      metadata.textContent = `${source.level ? source.level.charAt(0).toUpperCase() + source.level.slice(1).replaceAll("_", " ") + " · " : ""}${scopes[source.scope]} · ${kinds[source.kind]} · ${source.publishedAt ? "Reported date: " + source.publishedAt : "Publication date unknown"}`;
      const note = document.createElement("p");
      note.textContent = source.evidence.replace(
        /\s*\(\[[^\]]+\]\(https:\/\/[^)\s]+\)\)/g,
        "",
      );
      article.append(link, metadata, note);
      if (
        inspectPlan &&
        /\.(pdf|png|jpe?g)$/i.test(new URL(source.url).pathname)
      ) {
        const inspect = document.createElement("button");
        inspect.type = "button";
        inspect.textContent = "Inspect this plan →";
        inspect.onclick = () => inspectPlan(source.url);
        article.append(inspect);
      }
      sourceDetails.append(article);
    }
    panel.append(sourceDetails);
    const receipt = document.createElement("small");
    receipt.textContent = `${report.cached ? "Cached assessment" : "Astra assessment"} · ${new Date(report.observedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · bounded source search`;
    panel.append(receipt);
  }
  function reset(next, region = null) {
    acceptedRegion = region;
    generation++;
    pending?.abort();
    pending = null;
    listing = next;
    $("#collect-evidence").disabled = false;
    $("#evidence-progress").textContent = "";
    $("#evidence-report").hidden = true;
    const existing = reports.get(next?.url);
    if (existing) render(existing);
  }
  $("#collect-evidence").onclick = async () => {
    if (!listing || pending) return;
    const selected = listing;
    const version = generation;
    pending = new AbortController();
    $("#collect-evidence").disabled = true;
    $("#evidence-progress").textContent =
      "Searching listing, photo and plan references…";
    try {
      const response = await fetch("/api/listings/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: (selected.name + ", " + selected.location).slice(0, 180),
          sourceUrl: selected.url,
        }),
        signal: pending.signal,
      });
      const report = await response.json();
      if (version !== generation) return;
      if (!response.ok)
        throw new Error(
          report.error ||
            "Evidence search could not complete. Your selected listing is unchanged.",
        );
      if (
        report.readiness !== "needs_review" ||
        typeof report.assessment !== "string" ||
        !Array.isArray(report.sources) ||
        report.sources.length > 6 ||
        !Array.isArray(report.gaps) ||
        !Array.isArray(report.conflicts) ||
        !Number.isFinite(Date.parse(report.observedAt))
      )
        throw new Error(
          "The assessment was incomplete. No interior was generated.",
        );
      report.sources.forEach((source) => safeListingUrl(source.url));
      reports.set(selected.url, report);
      render(report);
      $("#evidence-progress").textContent = acceptedRegion
        ? "Assessment ready. Inspected 2D region retained; complete interior unavailable."
        : "Assessment ready. Interior remains unavailable.";
    } catch (error) {
      if (version === generation && error.name !== "AbortError")
        $("#evidence-progress").textContent = error.message;
    } finally {
      if (version === generation) {
        pending = null;
        $("#collect-evidence").disabled = false;
      }
    }
  };
  return { reset };
}
