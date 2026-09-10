import test from "node:test";
import assert from "node:assert/strict";
import { renderPlanSvg, renderPlanPrintDocument } from "../src/plan-svg.js";

const layout = () => ({
  id: "demo",
  label: "Synthetic apartment",
  width: 6,
  depth: 8,
  units: "m",
  measurementStatus: "synthetic",
  elements: [
    {
      id: "wall",
      label: "Wall",
      category: "structure",
      x: -3,
      z: 0,
      width: 0.1,
      depth: 8,
      height: 2.7,
      visible: true,
    },
    {
      id: "sink",
      label: "Fixed sink",
      category: "fixtures",
      x: 2,
      z: 2,
      width: 0.6,
      depth: 0.5,
      visible: true,
    },
    {
      id: "bed",
      label: "Bed",
      kind: "bed",
      category: "furniture",
      x: 0,
      z: 0,
      width: 1.93,
      depth: 2.03,
      visible: true,
      evidence: { basis: "synthetic", source: "Event-authored demonstration" },
    },
  ],
  openings: [
    { id: "entry", label: "Entry", x: 0, z: 4, width: 0.9, depth: 0.12 },
  ],
  sources: [],
  revision: {
    id: "rev-2",
    createdAt: "2026-09-10T16:00:00Z",
    summary: "Bed resized",
  },
});

test("SVG retains stable named layers, source dimensions and revision metadata", () => {
  const svg = renderPlanSvg(layout(), { selectedId: "bed" });
  for (const group of [
    "structure",
    "fixtures",
    "movable-furniture",
    "dimensions",
    "clearance",
    "annotations",
    "openings",
  ])
    assert.match(svg, new RegExp(`<g id="${group}">`));
  for (const value of [
    "6.00 m",
    "8.00 m",
    "1.93 × 2.03 m",
    "Synthetic dimensions",
    "rev-2",
    "2026-09-10T16:00:00Z",
  ])
    assert.ok(svg.includes(value));
  assert.match(svg, /data-object-id="bed"/);
  assert.doesNotMatch(svg, /NaN|Infinity/);
});

test("empty view removes movable objects but keeps fixed fixtures and named furniture layer", () => {
  const value = layout();
  value.elements.find((e) => e.id === "bed").visible = false;
  const svg = renderPlanSvg(value);
  assert.doesNotMatch(svg, /data-object-id="bed"/);
  assert.match(svg, /data-object-id="sink"/);
  assert.match(svg, /<g id="movable-furniture"><\/g>/);
});

test("text and attribute injections are escaped in SVG and print document", () => {
  const value = layout();
  value.label = "</title><script>alert(1)</script>";
  value.elements[2].id = '" onclick="alert(1)';
  value.sources = [{ title: "<img src=x onerror=alert(1)>" }];
  for (const output of [renderPlanSvg(value), renderPlanPrintDocument(value)]) {
    assert.doesNotMatch(output, /<script>|<img | onclick="/);
    assert.match(output, /&lt;script&gt;/);
    assert.match(output, /&quot; onclick=&quot;/);
  }
});

test("clearance uses canonical bounds and rotation without unbounded numbers", () => {
  const value = layout();
  assert.match(renderPlanSvg(value), /left 1.99 m/);
  value.elements[2].rotation = 90;
  assert.match(renderPlanSvg(value), /left 1.94 m/);
  value.elements = [value.elements[2]];
  assert.match(renderPlanSvg(value), /no bounded obstacle found/);
  assert.doesNotMatch(renderPlanSvg(value), /NaN|Infinity/);
});

test("print document is a complete self-contained landscape snapshot", () => {
  const html = renderPlanPrintDocument(layout());
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /@page\{size:A4 landscape/);
  assert.match(html, /<svg /);
  assert.match(html, /not an official architectural drawing/);
  assert.doesNotMatch(html, /<script|<link|<img|@import|url\(/);
});
