import { clearanceAround } from "./clearance.js";

const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const finite = (value, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;
const positive = (value, fallback = 1) =>
  Math.max(0.01, finite(value, fallback));
const number = (value) => finite(value).toFixed(2);
const wrap = (value, limit) =>
  String(value ?? "")
    .match(new RegExp(`.{1,${limit}}(?:\\s|$)|.{1,${limit}}`, "g"))
    ?.map((line) => line.trim()) || [""];
const text = (x, y, content, attributes = "") =>
  `<text x="${number(x)}" y="${number(y)}" ${attributes}>${escape(content)}</text>`;
const basisLabel = (layout) =>
  layout.measurementStatus === "synthetic"
    ? "Synthetic dimensions"
    : `${layout.measurementStatus || "Unknown"} dimensions — verify source scale`;

function footprint(element) {
  const angle = (finite(element.rotation) * Math.PI) / 180;
  const w =
    positive(element.width) * Math.abs(Math.cos(angle)) +
    positive(element.depth) * Math.abs(Math.sin(angle));
  const d =
    positive(element.width) * Math.abs(Math.sin(angle)) +
    positive(element.depth) * Math.abs(Math.cos(angle));
  return {
    minX: finite(element.x) - w / 2,
    maxX: finite(element.x) + w / 2,
    minZ: finite(element.z) - d / 2,
    maxZ: finite(element.z) + d / 2,
  };
}

function sourcesOf(layout) {
  return (Array.isArray(layout.sources) ? layout.sources : []).map((source) =>
    typeof source === "string"
      ? source
      : source?.label ||
        source?.title ||
        source?.name ||
        source?.url ||
        "Supplied source",
  );
}

/** A generated top-down planning document. x/z are centers in metres; rotation is degrees. */
export function renderPlanSvg(layout, options = {}) {
  const {
    selectedId = null,
    showDimensions = true,
    showClearance = true,
  } = options;
  const width = positive(layout.width),
    depth = positive(layout.depth);
  const scale = 90,
    margin = 88,
    header = 124;
  const pageWidth = Math.max(720, width * scale + margin * 2);
  const originX = pageWidth / 2,
    originY = header + (depth * scale) / 2;
  const sx = (x) => originX + finite(x) * scale;
  const sy = (z) => originY + finite(z) * scale;
  const elements = (
    Array.isArray(layout.elements) ? layout.elements : []
  ).filter((element) => element.visible !== false);
  const layers = {
    structure: [],
    fixtures: [],
    "movable-furniture": [],
    dimensions: [],
    clearance: [],
    annotations: [],
    openings: [],
  };
  const sourceLines = sourcesOf(layout);
  const footerY = header + depth * scale + 92;
  let pageHeight;
  const revision = layout.revision || {};
  const rules = `text{font-family:Arial,Helvetica,sans-serif;fill:#243b32;font-size:13px}.muted{fill:#58685f;font-size:12px}.heading{font-size:23px;font-weight:700}.dimension{font-size:12px;paint-order:stroke;stroke:#fff;stroke-width:4px;stroke-linejoin:round}.object-label{font-size:11px;text-anchor:middle;paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round}.dimension-line{stroke:#65746b;stroke-width:1;fill:none}.clearance-line{stroke:#28765d;stroke-width:1.5;stroke-dasharray:5 4;fill:none}[data-object-id]{cursor:pointer}`;
  layers.annotations.push(
    text(32, 38, "Elsewhere planning document", 'class="heading"'),
  );
  layers.annotations.push(text(32, 64, layout.label || "Home plan"));
  layers.annotations.push(
    text(
      32,
      86,
      `${basisLabel(layout)} · Generated plan, not an official architectural drawing`,
      'class="muted"',
    ),
  );
  layers.structure.push(
    `<rect x="${number(sx(-width / 2))}" y="${number(sy(-depth / 2))}" width="${number(width * scale)}" height="${number(depth * scale)}" fill="#fcfcf8" stroke="#d0d5ce" stroke-width="1"/>`,
  );
  for (const element of elements) {
    const category =
      element.category === "structure"
        ? "structure"
        : element.category === "fixtures"
          ? "fixtures"
          : "movable-furniture";
    const w = positive(element.width),
      d = positive(element.depth),
      x = sx(element.x),
      y = sy(element.z);
    const fill =
      category === "structure"
        ? "#7b847b"
        : category === "fixtures"
          ? "#e1e9e5"
          : "#eee8da";
    const selected = element.id === selectedId;
    const title = `${element.label || element.kind || element.id}: ${number(w)} × ${number(d)} m; ${element.evidence?.basis || layout.measurementStatus || "unknown"}; ${element.evidence?.source || "source not supplied"}`;
    const label =
      category !== "structure" && Math.min(w, d) >= 0.3
        ? text(
            x,
            y + 4,
            element.label || element.kind || element.id,
            'class="object-label"',
          )
        : "";
    layers[category].push(
      `<g data-object-id="${escape(element.id)}" role="img" aria-label="${escape(title)}"><title>${escape(title)}</title><rect x="${number(x - (w * scale) / 2)}" y="${number(y - (d * scale) / 2)}" width="${number(w * scale)}" height="${number(d * scale)}" transform="rotate(${number(element.rotation)} ${number(x)} ${number(y)})" fill="${fill}" stroke="${selected ? "#146c4e" : "#707b71"}" stroke-width="${selected ? 3 : 1.3}"/>${label}</g>`,
    );
    if (showDimensions && selected && category !== "structure")
      layers.dimensions.push(
        text(
          x,
          y + 21,
          `${number(w)} × ${number(d)} m`,
          'class="dimension" text-anchor="middle"',
        ),
      );
  }
  for (const opening of layout.openings || []) {
    const w = positive(opening.width),
      d = positive(opening.depth);
    layers.openings.push(
      `<g><title>${escape(opening.label || "Opening")}</title><rect x="${number(sx(opening.x) - (w * scale) / 2)}" y="${number(sy(opening.z) - (d * scale) / 2)}" width="${number(w * scale)}" height="${number(d * scale)}" fill="white" stroke="#63796b" stroke-dasharray="3 3"/></g>`,
    );
  }
  if (showDimensions) {
    const left = sx(-width / 2),
      right = sx(width / 2),
      top = sy(-depth / 2),
      bottom = sy(depth / 2);
    layers.dimensions.push(
      `<path class="dimension-line" d="M ${left} ${bottom + 12} V ${bottom + 36} M ${left} ${bottom + 28} H ${right} M ${right} ${bottom + 12} V ${bottom + 36} M ${left - 12} ${top} H ${left - 36} M ${left - 28} ${top} V ${bottom} M ${left - 12} ${bottom} H ${left - 36}"/>`,
    );
    layers.dimensions.push(
      text(
        (left + right) / 2,
        bottom + 47,
        `${number(width)} m`,
        'class="dimension" text-anchor="middle"',
      ),
    );
    layers.dimensions.push(
      text(
        left - 44,
        (top + bottom) / 2,
        `${number(depth)} m`,
        'class="dimension" text-anchor="middle" transform="rotate(-90 ' +
          number(left - 44) +
          " " +
          number((top + bottom) / 2) +
          ')"',
      ),
    );
  }
  let clearanceSummary =
    "Clearance: select or show a bed to calculate distances.";
  const beds = elements.filter(
    (element) =>
      element.category === "furniture" &&
      /bed/i.test(element.kind || element.label || element.id),
  );
  const bed = beds.find((element) => element.id === selectedId) || beds[0];
  if (showClearance && bed) {
    const target = footprint(bed);
    const clear = clearanceAround(
      target,
      elements.filter((element) => element !== bed).map(footprint),
    );
    const centerX = (target.minX + target.maxX) / 2,
      centerZ = (target.minZ + target.maxZ) / 2;
    const rays = {
      left: [target.minX, centerZ, -1, 0],
      right: [target.maxX, centerZ, 1, 0],
      head: [centerX, target.minZ, 0, -1],
      foot: [centerX, target.maxZ, 0, 1],
    };
    const measures = [];
    for (const [direction, [x, z, dx, dz]] of Object.entries(rays)) {
      const value = clear[direction];
      if (!Number.isFinite(value)) continue;
      measures.push(`${direction} ${number(value)} m`);
      const endX = x + dx * value,
        endZ = z + dz * value;
      layers.clearance.push(
        `<path class="clearance-line" d="M ${number(sx(x))} ${number(sy(z))} L ${number(sx(endX))} ${number(sy(endZ))}"/>`,
      );
      layers.clearance.push(
        text(
          sx((x + endX) / 2) + (dx ? 0 : 8),
          sy((z + endZ) / 2) - 6,
          `${number(value)} m`,
          'class="dimension" text-anchor="middle"',
        ),
      );
    }
    clearanceSummary = clear.overlap
      ? "Clearance: object overlap detected; check the layout."
      : `Calculated bed clearance: ${measures.join(" · ") || "no bounded obstacle found"}`;
  }
  const footerLines = [
    clearanceSummary,
    "Geometric distances only. Verify real dimensions; this does not establish real-world fit.",
    `Revision ${revision.id || "unversioned"} · ${revision.createdAt || "Timestamp not supplied"}`,
    revision.summary || "Generated from the current canonical layout",
    ...(sourceLines.length
      ? sourceLines
      : ["Event-authored demonstration; no verified property plan supplied."]
    ).map((source) => `Source: ${source}`),
  ].flatMap((line) => wrap(line, Math.floor((pageWidth - 64) / 6.3)));
  footerLines.forEach((line, index) =>
    layers.annotations.push(
      text(32, footerY + index * 20, line, 'class="muted"'),
    ),
  );
  pageHeight = footerY + footerLines.length * 20 + 16;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${number(pageWidth)} ${number(pageHeight)}" role="img" aria-labelledby="plan-title plan-description"><title id="plan-title">${escape(layout.label || "Home")} — generated planning document</title><desc id="plan-description">${escape(basisLabel(layout))}. Canonical layout in metres. Structure, fixed fixtures and visible movable furniture. Source and revision details included.</desc><style>${rules}</style><rect width="100%" height="100%" fill="white"/>${Object.entries(
    layers,
  )
    .map(([id, items]) => `<g id="${id}">${items.join("")}</g>`)
    .join("")}</svg>`;
}

/** A network-free snapshot suitable for the browser's Print / Save as PDF flow. */
export function renderPlanPrintDocument(layout) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Elsewhere planning document</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}html,body{margin:0;background:white;color:#243b32}body{font-family:Arial,Helvetica,sans-serif}main{height:185mm;width:100%;display:flex;justify-content:center}svg{display:block;max-width:100%;height:100%}@media screen{body{padding:24px}main{height:90vh}}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}main{break-inside:avoid}}</style></head><body><main>${renderPlanSvg(layout)}</main></body></html>`;
}
