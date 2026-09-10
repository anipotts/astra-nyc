# Elsewhere shared desktop UI

The map, plan or source image is the primary surface. Controls support it with a compact persistent sidebar and a separate listing fact strip. Keep the approved Elsewhere brand/artwork and forest-green/off-white palette. Desktop only, including723×856 and1144×853 windows.

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

The22px title reduces to20px in the compact fact strip. The approved landing heading remains a deliberate large display exception. Provider map controls retain their native29px geometry to preserve supplied icon alignment.

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

For a selected listing, #viewport has two grid areas: `surface` fills remaining height, `facts` contains #evidence-stage. The source strip scrolls at42dvh maximum; it never overlays map controls or the Inside surface. It uses two columns above900px window width and one below. Expanding source details reduces the visual area, so renderers must respond to container resize.

#inside-surface is a block with16px padding and overflow:auto; the old330px bottom padding and grid centering are removed. Incoming Inside content owns only its inner layout. The current nominal plan fits the available row. #commute-panel remains a bounded overlay within the surface row, leaving the map navigation stack clear. Incoming view modules can replace their own form composition without global shell overrides.

Plans remains a native dialog. Opening it must not reposition the obscured source strip. Preserve Escape, focus return, document state and camera state. Current browser checks confirm Escape and focus return; native browser chrome can receive focus when tabbing past dialog bounds, while background document controls remain inert.

Your places retains Browse listings wording: bundled source cases are not relabelled as user-saved. Add sits alongside the select. Priorities remain real pressed-state buttons in stable single-column rows. Status/persistence elements retain runtime IDs and failure messages; concise runtime wording is separately handed to the coordinator.

## Content and evidence

Retain meaningful source freshness, availability, dimensional uncertainty and case-specific questions. Long facts wrap; disclosures and source URLs scroll/wrap cleanly. Do not replace source-backed records with concept imagery, synthetic fallback or generic certainty copy. New3D rendering methods remain a separate scope.

## Verification

Shared pass:123existing tests and production build pass; existing bundle-size advisory remains. Browser reviewed723×856 and1144×853, empty/selected states, native dropdown, long Gotham title, priority limit and deselection, source disclosure scrolling, Plans opening/Escape/focusreturn, current Inside plan and Commute form. Reduced motion resolves motion tokens to0ms and CSS transitions to0s. No new dependencies or model requests.

Calculated contrast: body/surface15.45:1, muted/surface5.76:1, white/accent9.59:1, selected-text/background8.11:1, focus/surface4.98:1. These are token-pair checks, not a claim of exhaustive accessibility certification.

Known integration check: rapid listing selection followed by a view change can stop the current map flight before reaching the new listing; this belongs to runtime/map owner. Verify combined Inside/Commute and restored evidence records on the exact integration head. Private screenshots and detailed QA receipts remain outside public sources.
