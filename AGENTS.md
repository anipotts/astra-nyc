# Project guidance

- Keep changes small and focused on the hackathon demo.
- Choose dependencies when the implementation needs them.
- Keep setup and run instructions current in README.md.
- Keep credentials, private data, and local configuration out of Git.
- Run checks appropriate to the code added and report what was verified.

## Event build boundary

- Build this submission from scratch using requirements supplied in this task during the event build window.
- Do not retrieve earlier chats, hackathon memories, pre-event code, prototypes, planning documents, or saved planning prompts. Do not import, copy, adapt, or submit those materials.
- Standard dependencies and official documentation are allowed. Record exact dependency versions, licenses, sources, and purposes in DEPENDENCIES.md, separately from original project work.
- Keep BUILD_LOG.md factual: actual timestamps, major milestones, dependency changes, and verification results. Label targets and unverified claims clearly.
- Preserve normal Git history; do not backdate commits or rewrite history to imply originality. Timestamps alone do not prove originality.
- This task encountered earlier context while creating the initial scaffold. Do not claim otherwise. See BUILD_LOG.md.
- Keep credentials, private event information, conversation exports, and unrelated files out of the public repository. Use synthetic demo data unless the user supplies suitable public data during the build window.
- Before implementing the product, establish one user problem, one core interaction, one visible result, and distinct development and runtime roles for Astra from the user's current requirements.

## Current product direction

- Help people decide which homes to pursue through a traversable preview of space, commute, and daily essentials.
- Preserve the participant's updated direction: larger-bed fit, unfurnished view, lighting, and Nearby categories; do not reintroduce the rejected work-desk example.
- Keep development assistance distinct from live runtime Astra. The app has local controls plus a verified live Astra endpoint for bed sizing, existing furniture-group visibility, and lighting across current scene contexts. Keep model-backed edits and cached replays visibly distinguishable from local suggestions.
- Real listing imagery and location information must carry sources and freshness context. Never imply complete defect detection or verified reconstruction from visual plausibility alone.

## Current event overrides (September 10, 2026)

- Ani's latest direct instruction exempts this hackathon and its associated worktrees from the global provider-protected-branch prerequisite and repeated approval gates for ordinary in-scope integration. Do not install branch protection or block a checked merge merely because protection is absent. Continue functional tests/build, preserve normal Git history and concurrent ownership, protect credentials/user work, and honor actual tool constraints. Direction owns current PR integration until explicitly handed back.
- Desktop only for this entire project lifecycle, per Ani's explicit instruction. Do not spend implementation or QA time on mobile responsiveness. Validate the current desktop and annotated desktop sizes (723×856 and 1144×853), keyboard use, reduced motion and real interactions.
- Normal user flows must contain real source evidence only. Synthetic scene fixtures remain internal regression inputs; never use them as a fallback for a selected listing.
- Use three main views: Overview, Inside and Commute. Overview is map-led; lifestyle/Nearby context belongs there. Plans is a shared-header action preserving the native modal and camera state.
- A selected listing needs its own resolved geographic identity or an explicit unresolved state. Never reuse another property's marker or invent an interior/entrance transition.
- Preserve the existing approved artwork and green/off-white visual identity. Keep detailed evidence and source inspection accessible through compact disclosures.
- Stack Elsewhere branding, view tabs and Your places in one consistently spaced desktop left column. Remove the extra map-note sentence requested in the browser annotation. Prioritize sourced 3D NYC/Jersey City context over the flat street-map presentation; disclose estimated building heights and absent facade/interior detail in source information.
