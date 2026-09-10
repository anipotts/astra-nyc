# Elsewhere shared desktop UI

The map, plan or source image is the primary surface. Controls support it with a compact persistent sidebar. Keep the approved Elsewhere brand/artwork and forest-green/off-white palette. Desktop only, including723×856 and1144×853 windows.

## Sources and loading order

1. Existing style.css and shell.css: legacy compatibility and native Plans shell.
2. src/ui/tokens.css: shared values and legacy aliases.
3. src/ui/components.css: reusable primitives and interaction defaults.
4. src/desktop.css: existing shell composition and explicitly scoped legacy adapters.

New view modules should consume tokens and primitives, then add only module-scoped layout rules. Do not copy an old global44px control rule or add broad body/button/header selectors. Runtime behavior, provider data and geometry do not belong in the UI system.

## Tokens

| Role | Token | Value |
| --- | --- | --- |
| Spacing | --ui-space-1/2/3/4/6/8 |4/8/12/16/24/32px |
| Type | --ui-text-sm/base/title |12/14/22px |
| Font | --ui-font-family | Existing Inter/system sans-serif stack |
| Body line height | --ui-line-height |1.45 |
| Controls | --ui-control-height/compact/primary |36/30/40px |
| Corners | --ui-radius-control/panel |8/12px |
| Text | --ui-color-text/muted | #18231f / #59665e |
| Surfaces | --ui-color-surface/field | #fafaf6 / #ffffff |
| Accent | --ui-color-accent/on-accent | #204d3d / #ffffff |
| Border | --ui-color-border | #dce2df |
| Selection/hover | --ui-color-selected/hover | #e7eee5 / #eef2ec |
| Keyboard focus | --ui-color-focus | #387954 |
| Warning | --ui-color-warning | #79442b |
| Shadows | --ui-shadow-panel/popover | Quiet panel / distinct temporary popover |
| Motion | --ui-motion-fast/panel |140/200ms,0ms under reduced motion |
| Easing | --ui-ease | cubic-bezier(.2,.7,.2,1) |
| Sidebar | --ui-sidebar-width |248px |

The22px title reduces to18px in the sidebar listing summary. The approved landing heading remains a deliberate large display exception. Provider map controls retain their native29px geometry to preserve supplied icon alignment.

## Primitives

- `.ui-panel`: one surface with16px padding,12px corners and subtle border/shadow. Avoid nested panels for ordinary facts.
- `.ui-button`: standard36px control. `.ui-button--primary` is40px and filled green; `.ui-button--quiet` removes emphasis; `.ui-button--compact` is30px. Apply both base and modifier classes. Anchor buttons keep real href semantics.
- `.ui-field`: native input, select or textarea. Keep native select keyboard behavior; long selected text may truncate visually while the full option remains accessible.
- `.ui-label`: associated12px label. Use a real label/for pair.
- `.ui-chip`: compact choice; pair with `aria-pressed` for toggle semantics.
- `.ui-disclosure`: native details/summary with a restrained divider.
- `.ui-meta`, `.ui-stack`, `.ui-row`: supporting copy and predictable grouping.

Examples:

```html
<section class="ui-panel" aria-labelledby="journey-title">
  <h2 id="journey-title">Your journey</h2>
  <form class="ui-stack">
    <div>
      <label class="ui-label" for="destination">Destination</label>
      <input class="ui-field" id="destination" required>
    </div>
    <button class="ui-button ui-button--primary" type="submit">Prepare directions</button>
  </form>
</section>
```

## Shared layout and integrations

For a selected listing, #evidence-stage belongs in the main sidebar directly below the listing selector. The selector identifies the property and unit; the heading shows its sourced street address. Essential bed/bath/area facts, quoted rent and one availability status stay visible. Unknown rent uses quiet metadata styling. Freshness, full original facts, qualifications and source inspection live in Sources & details. The sidebar scrolls independently when expanded. Do not reintroduce a bottom facts bar, floating listing card or duplicate listing summary. Overview and Inside retain the full viewport height.

#inside-surface is a block with16px padding and overflow:auto. Incoming Inside content owns only its inner layout. #commute-panel is one bounded, independently scrolling component layered over the map at both supported desktop widths. Walking collapses it to progress, Exit, temporary movement guidance and a Controls disclosure. Map controls stay clear. Incoming modules must consume shared tokens and primitives without global shell overrides.

Plans remains a native dialog. Opening it must not reposition the sidebar or map. Preserve Escape, focus return, document state and camera state. Background document controls remain inert. Original publisher documents and generated planning drawings must remain visibly distinct.

Use one visible Selected place section heading. Browse listings remains the accessible name of the native selector without another visible label; bundled source cases are not relabelled as user-saved. Add sits alongside the select. Your routine is a native disclosure, collapsed initially, with the selected short labels in #priority-summary and an Edit affordance. Expanded priorities remain real pressed-state buttons in stable single-column rows. Status/persistence elements retain runtime IDs and failure messages inside the disclosure. Plans is a compact action beside the wordmark, above the three view tabs.

## Content and evidence

Retain meaningful source freshness, availability, dimensional uncertainty and case-specific questions. Long facts wrap; disclosures and source URLs scroll/wrap cleanly. Do not replace source-backed records with concept imagery, synthetic fallback or generic certainty copy. New3D rendering methods remain a separate scope.

## Verification

Shared pass:123existing tests and production build pass; existing bundle-size advisory remains. Browser reviewed723×856 and1144×853, empty/selected states, native dropdown, long Gotham title, priority limit and deselection, source disclosure scrolling, Plans opening/Escape/focusreturn, current Inside plan and Commute form. Reduced motion resolves motion tokens to0ms and CSS transitions to0s. No new dependencies or model requests.

Calculated contrast: body/surface15.45:1, muted/surface5.76:1, white/accent9.59:1, selected-text/background8.11:1, focus/surface4.98:1. These are token-pair checks, not a claim of exhaustive accessibility certification.

Direction owns combined checks of rapid listing selection, intended camera restoration, route cancellation and source-view state on the final integration head. Practical motion uses a160ms result reveal and300ms route-segment emphasis; both cancel on state changes and respect reduced motion. Camera movement uses actual geographic framing; no input morph or simulated map zoom decorates view changes. Private screenshots and detailed QA receipts remain outside public sources.

## Compact evidence inspector

`src/ui/inspector.css` loads after desktop.css. Original listing/plan links form one quiet action row. Map identity, city sources, full facts/limitations, plan inspection, and additional Astra evidence use native disclosures; runtime IDs and complete source qualifications remain intact. Dynamic inspection room labels/dimensions use compact rows. Status/error output stays visible in its active disclosure.

Five decorative Phosphor regular SVGs are vendored under `src/ui/icons`, from core revision `2b75f3ad12b420c9504ef05df8d2564a28f8500e`, MIT license included. Source: https://github.com/phosphor-icons/core/tree/2b75f3ad12b420c9504ef05df8d2564a28f8500e/assets/regular. Use `<span class="ui-icon ui-icon-buildings" aria-hidden="true"></span>` alongside real text; available names: files, map-pin, ruler, magnifying-glass, buildings. No icon runtime dependency.

Commute mounts by its unchanged #commute-panel ID in #viewport. Keep walking, travel-mode, destination and route controls together in this compact map overlay. The sidebar holds selected-place facts and persistent lifestyle preferences only. Keep map zoom controls clear. Walking guidance disappears after actual movement and reappears for a new walking session; Exit remains visible.
