import { normalizeSourceUrl } from "./source-policy.js";
export function inspectionExtentText(value) {
  const text = String(value || "").trim();
  return /[.!?]$/.test(text)
    ? text
    : text + " [Qualification appears incomplete; review the original source.]";
}
export function setupPlanInspection() {
  const $ = (s) => document.querySelector(s);
  let listing = null,
    pending = null,
    generation = 0;
  const reports = new Map();
  function render(report) {
    const panel = $("#plan-inspection-report");
    panel.replaceChildren();
    panel.hidden = false;
    const title = document.createElement("h3");
    title.textContent = "Plan observations · review required";
    const summary = document.createElement("p");
    summary.textContent = report.assessment;
    const scope = document.createElement("p");
    scope.textContent = `Proposed identity: ${report.identity.address} · ${report.identity.unit || "unit unknown"} · ${report.identity.match.replaceAll("_", " ")}`;
    panel.append(title, summary, scope);
    for (const room of report.rooms) {
      const item = document.createElement("p");
      item.textContent = `${room.label}: ${room.printedDimensions || "No readable dimensions"}. ${inspectionExtentText(room.extent)} Boundary: ${room.boundary}.`;
      panel.append(item);
    }
    for (const [label, values] of [
      ["Conflicts", report.conflicts],
      ["Missing", report.gaps],
    ]) {
      if (!values.length) continue;
      const item = document.createElement("p");
      item.textContent = `${label}: ${values.join("; ")}`;
      panel.append(item);
    }
    const notice = document.createElement("p");
    notice.textContent =
      "Astra inspected source media. These observations need comparison with the original plan before geometry is accepted. No ceiling height or complete interior is inferred.";
    const source = document.createElement("a");
    source.href = normalizeSourceUrl(report.source.url);
    source.textContent = "Review original plan ↗";
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    const receipt = document.createElement("small");
    receipt.textContent = `${report.cached ? "Local result replay" : "Astra media inspection"} · ${new Date(report.observedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · source date: ${report.sourceDate || "unknown"}`;
    panel.append(notice, source, receipt);
  }
  $("#plan-inspection-form").onsubmit = async (event) => {
    event.preventDefault();
    if (!listing || pending) return;
    let sourceUrl;
    try {
      sourceUrl = normalizeSourceUrl($("#plan-source-url").value);
    } catch (error) {
      $("#plan-inspection-progress").textContent = error.message;
      return;
    }
    const version = generation;
    const selected = listing;
    pending = new AbortController();
    $("#inspect-plan").disabled = true;
    $("#plan-inspection-progress").textContent =
      "Retrieving the plan and inspecting its visible identity and dimensions…";
    try {
      const response = await fetch("/api/plans/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: pending.signal,
        body: JSON.stringify({
          address: (selected.name + ", " + selected.location).slice(0, 180),
          unit:
            selected.identity?.unit ||
            selected.name.match(/#([a-z0-9-]+)/i)?.[1] ||
            null,
          sourceUrl,
        }),
      });
      const report = await response.json();
      if (version !== generation) return;
      if (!response.ok)
        throw new Error(
          report.error ||
            "Plan inspection failed; prior evidence is unchanged.",
        );
      if (
        report.readiness !== "needs_review" ||
        !report.identity ||
        !Array.isArray(report.rooms) ||
        !Array.isArray(report.gaps) ||
        !Array.isArray(report.conflicts) ||
        !Number.isFinite(Date.parse(report.observedAt))
      )
        throw new Error("Incomplete inspection; no geometry accepted.");
      normalizeSourceUrl(report.source?.url);
      reports.set(selected.id, report);
      render(report);
      $("#plan-inspection-progress").textContent =
        "Inspection ready. Compare the observations with the source; existing accepted regions are unchanged.";
    } catch (error) {
      if (version === generation && error.name !== "AbortError")
        $("#plan-inspection-progress").textContent = error.message;
    } finally {
      if (version === generation) {
        pending = null;
        $("#inspect-plan").disabled = false;
      }
    }
  };
  return {
    inspect(sourceUrl) {
      $("#plan-source-url").value = normalizeSourceUrl(sourceUrl);
      $("#plan-inspection").open = true;
      $("#plan-inspection-form").requestSubmit();
      $("#plan-inspection").scrollIntoView({ block: "nearest" });
    },
    reset(next) {
      generation++;
      pending?.abort();
      pending = null;
      listing = next;
      $("#inspect-plan").disabled = false;
      $("#plan-inspection-progress").textContent = "";
      $("#plan-source-url").value = next?.planUrl || "";
      $("#plan-inspection-report").hidden = true;
      const report = reports.get(next?.id);
      if (report) render(report);
    },
  };
}
