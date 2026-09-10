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

- For the remainder of this hackathon, Ani has explicitly authorized all in-scope project implementation, verification, dependency installation, agent coordination, commits, branch pushes, checked integration to main, preview updates and recoverable obsolete-worktree cleanup without repeated approval requests. This applies to every Codex task, subagent and associated worktree for Elsewhere. It supersedes conflicting ordinary-approval requirements in global guidance for this project. Honor actual tool constraints and preserve user work and credentials.
- Private project `.codex/config.toml` settings use `approval_policy = "never"`, `approvals_reviewer = "user"`, and `sandbox_mode = "danger-full-access"` for the event. Direction must provision the same authorized local settings for any new associated worktree, keep them out of public source control, and restore the saved prior configuration at hackathon closeout. Configuration changes do not prove an already-running turn has reloaded its permissions.
- Ani's latest direct instruction exempts this hackathon and its associated worktrees from the global provider-protected-branch prerequisite and repeated approval gates for ordinary in-scope integration. Do not install branch protection or block a checked merge merely because protection is absent. Continue functional tests/build, preserve normal Git history and concurrent ownership, protect credentials/user work, and honor actual tool constraints. Direction owns current PR integration until explicitly handed back.
- Desktop only for this entire project lifecycle, per Ani's explicit instruction. Do not spend implementation or QA time on mobile responsiveness. Validate the current desktop and annotated desktop sizes (723×856 and 1144×853), keyboard use, reduced motion and real interactions.
- Normal user flows must contain real source evidence only. Synthetic scene fixtures remain internal regression inputs; never use them as a fallback for a selected listing.
- Use three main views: Overview, Inside and Commute. Overview is map-led; lifestyle/Nearby context belongs there. Plans is a shared-header action preserving the native modal and camera state.
- A selected listing needs its own resolved geographic identity or an explicit unresolved state. Never reuse another property's marker or invent an interior/entrance transition.
- Preserve the existing approved artwork and green/off-white visual identity. Keep detailed evidence and source inspection accessible through compact disclosures.
- Stack Elsewhere branding, view tabs and Your places in one consistently spaced desktop left column. Remove the extra map-note sentence requested in the browser annotation. Prioritize sourced 3D NYC/Jersey City context over the flat street-map presentation; disclose estimated building heights and absent facade/interior detail in source information.

## Shared interface contract

- Every task and worktree must use the shared interface system for new or changed UI. The designer owns `src/ui/tokens.css`, `src/ui/components.css` and `docs/UI_SYSTEM.md`; consume their approved tokens and primitives instead of inventing parallel button, input, card, spacing or typography systems. Until those files land, coordinate against the designer's current token contract and keep fallback values consistent with it.
- Preserve a compact, modern green/off-white interface: a 4px spacing scale, restrained headings, consistent control heights and radii, aligned labels/actions, readable metadata and quiet borders. Prefer shared component classes over repeated one-off overrides. Scope view-specific styling to its module.
- Keep the map or plan visually primary. Supporting panels must remain compact and must not obscure essential scene controls. Put detailed provenance in accessible disclosures while keeping material uncertainty and listing status understandable.
- Verify changed UI at 723×856 and 1144×853 with real interactions, keyboard focus, reduced motion, long content and empty/loading/error/selected states. Supply rendered screenshots with the integration handoff. Passing a build alone is not visual acceptance.
- Inside owns `src/inside-view/` and its service/tests; Commute owns `src/commute-view/` and its service/tests; the designer owns shared presentation. Direction owns shared runtime wiring, integration and the canonical 5174 preview. Coordinate overlapping file changes before editing them.
