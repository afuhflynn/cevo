# Unified project-creation flow (Basics → Idea → Details → Template → Review)

Plan profile: full

## 0. Applicability and Plan Gate

### Plan Gate

- **Branch:** EXEMPT — isolated brownfield UX unification; no `docs/product-roadmap.md` exists in repo (verified 2026-11-17 and still absent); no `docs/project-config.json` present.
- **Roadmap:** EXEMPT — not applicable; living owners are `docs/scope/scope.md` row 7 (wizard slice, in-progress) and spec `docs/specs/0006-project-creation-wizard-briefing/index.md`.
- **Milestone:** EXEMPT — no milestone; slice owner is scope row 7 + spec 0006.
- **Scope brief:** inline — unify the two disconnected creation surfaces (`/dashboard/new` Basics-only form + `/dashboard/wizard/[id]` Concept/Context/Briefing/Review/Approval) into one truthful 5-step flow matching the approved mock labels (Basics, Idea, Details, Template, Review) while preserving every backend guarantee in spec 0006 (AC-1..AC-10).
- **Scenarios:** inline —
  1. student completes Basics → lands on Idea (not a generic briefing dump), progresses Idea → Details → Template → Review with the rail always reflecting the server step;
  2. student resumes a draft from dashboard or the resume list and lands on the exact unfinished step;
  3. thin answers block synthesis with named fields; synthesis shows estimate, streams, versions; approval provisions exactly one chapter tree (idempotent).
- **Product decisions:** step labels switch to the mock's Basics/Idea/Details/Template/Review (spec 0006 §AC-1 wording updated to match; behavior unchanged); custom guideline upload stays deferred (no backend exists; mock does not show it); no pricing/credit-math change.
- **Project skeleton:** Next.js 16.4 App Router + Tailwind v4 + shadcn-only (`package.json`, `docs/DECISIONS.md` ADR-002/ADR-003); owners: `app/dashboard/new/page.tsx`, `components/wizard/new-wizard-entry.tsx`, `app/dashboard/wizard/[id]/page.tsx`, `components/wizard/wizard-client.tsx`, `lib/wizard-validation.ts`, `app/api/wizard/sessions/**`, `lib/wizard*.ts`.
- **Commands:** `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`. NEVER `pnpm build` (ADR-009).
- **Evidence plan:** rail-vs-server-step trace, `pnpm lint` + `pnpm typecheck`, affected vitest + targeted playwright (create → resume → 422-gate → approve idempotency), keyboard/a11y pass on the stepper; no fabricated `file:line` for future assertions.
- **Human approval:** APPROVED — user approved all four validation questions (mock labels, Idea/Details split, upload deferred, gate) in-session 2026-11-18.
- **Gate status:** READY — implementation unblocked for P1→P3 in order.

## 1. Outcome and boundaries

**Desired observable outcome:** one continuous creation flow. Basics (title, type, qualification, deadline) creates the session and moves to Idea — never to a disconnected briefing page. Idea and Details carry the conversational/structured briefing; Template carries suggestion + override; Review carries synthesis + versions + approval. The rail, the URL, and the server `currentStep` always agree; resume lands on the unfinished step; thin answers still gate synthesis; approval still provisions exactly one tree.

**Governing intent/spec:** `docs/PRODUCT_REQUIREMENTS.md` FR-4 (5-stage wizard), `docs/USER_FLOWS.md` Flow 2.1 (Basics → Idea → Framing → Template → Brief+Approve), spec `docs/specs/0006-project-creation-wizard-briefing/index.md` (AC-1..AC-10, API surface, invariants) as `spec_baseline` (rev 2026-11-13, unchanged behavior). The approved mock supplies labels and Basics field set.

**In scope:**
- Shared stepper shell + truthful rail (Basics/Idea/Details/Template/Review) used by both `/dashboard/new` (step 1) and `/dashboard/wizard/[id]` (steps 2–5, deep-linkable).
- Idea step: guided conversational prompts for background/problem/aim with sufficiency feedback + max-2 follow-ups (existing turn API, unchanged thresholds).
- Details step: structured fields for objectives/questions/scope/limitations/methodology/outcomes with the same server minimums (AC-3).
- Template step: suggestion display + override select + lock-at-approval (existing endpoints); upload stays visibly future, not silently dropped.
- Review step: estimate display, synthesis stream, version list + restore, approve with idempotency key → project redirect (existing endpoints, unchanged ledger semantics).
- Responsive + a11y for the stepper and forms; motion reuses onboarding `ob-*` keyframes, no new library.

**Non-goals (by decision, with reason):**
- No custom guideline upload build — reason: no backend exists (`grep` shows only `suggestTemplate`/`listActiveTemplateVersions`; no upload route), and the mock does not show it; building it here doubles the slice. Recorded as explicit future, not silent scope.
- No model/prompt/threshold change — reason: AC-2/AC-3/AC-4 synthesis contract is already verified behavior; this slice is flow honesty + UX, not AI tuning.
- No schema migration — reason: `projectType` + `submissionDeadline` already stored on `Project` (extended in Slice 13); Idea/Details reuse existing `WizardTurn.fieldKey` values.
- No dark-theme or global nav redesign — reason: unrelated surfaces.

**Compatibility/rollback:** frontend + thin API-params only; no migration. Rollback = revert commit range. Old sessions resume (server `currentStep` 1..5 still honored); legacy minimal create payloads (`title` only) still validate.

**Not yet specified:** None — open choices are precise decisions in §2 (label mapping, Idea/Details field split, upload deferral), not fog.

## 2. Important technical decisions

1. **One shell, two routes, server step as truth.** Choice: build a shared stepper shell; `/new` renders step 1 (Basics) and POSTs the session, then routes to `/wizard/[id]?step=2`; the wizard page renders steps 2–5 from the `?step` param clamped by server `currentStep`; remove the local `useState(3)` default that drops every new user into Briefing (`wizard-client.tsx:147`). Alternative: keep two independent steppers. Sacrifice: URL-param + clamp logic. Reversibility: easy (shell is additive). Owner: `components/wizard/*`, `app/dashboard/wizard/[id]/page.tsx`.
2. **Adopt the mock's step names as the canonical labels.** Choice: Basics / Idea / Details / Template / Review, mapped onto spec AC-1 phases (Basics = concept + academic context capture; Idea = briefing part 1; Details = briefing part 2; Template = template; Review = review + approval). Spec §AC-1 wording updated, behavior untouched. Alternative: keep Concept/Context/Briefing/Review/Approval labels. Sacrifice: doc churn across spec + USER_FLOWS. Reversibility: easy (labels only). Owner: spec 0006, `docs/USER_FLOWS.md` Flow 2.1.
3. **Split the 9 briefing fields across Idea and Details without moving thresholds.** Choice: Idea = background, problem, aim (the conversational "what/why"); Details = objectives, questions, scope, limitations, methodology, outcomes (the structured "how/what-it-proves"). Server minimums (AC-3), readiness JSON, and blocked-list semantics unchanged — only the grouping and copy change. Alternative: one giant briefing screen. Sacrifice: two smaller screens to maintain. Reversibility: easy (grouping only). Owner: `components/wizard/wizard-client.tsx` step 2/3 render, `lib/wizard-validation.ts` (untouched).
4. **Template step without upload.** Choice: suggestion + override + lock-at-approval only; upload shown as explicit "coming soon" (disabled with reason), never a dead button. Alternative: build upload + extraction now. Sacrifice: defers FR-4's custom-template path. Reversibility: n/a (additive later). Owner: `app/api/wizard/templates/route.ts`, approve route.
5. **Motion discipline.** Choice: reuse `ob-*` keyframes from `app/globals.css` (fade/slide on step change, eased rail fill); no new animation library, no scroll-linked effects, all inert under `prefers-reduced-motion`. Alternative: framer-motion. Sacrifice: less choreography. Reversibility: easy. Owner: `app/globals.css`.

## 3. Areas and owners to touch

- Shell + steps: `app/dashboard/new/page.tsx`, `components/wizard/new-wizard-entry.tsx` (becomes step-1 renderer inside the shell), `app/dashboard/wizard/[id]/page.tsx` (accept/clamp `?step=`), `components/wizard/wizard-client.tsx` (remove local-only step default `useState(3)` at line 147, render Idea/Details/Template/Review screens, shared rail component).
- Contracts (read-mostly, extend only where noted): `lib/wizard-validation.ts` (`createSessionSchema` already carries `projectType` + `submissionDeadline` from Slice 13), `app/api/wizard/sessions/route.ts` (create), `app/api/wizard/sessions/[id]/turns|synthesize|versions|approve` (unchanged semantics), `lib/wizard*.ts` (readiness, estimate, template match).
- Data/state: no migration; `WizardSession.currentStep` transitions verified against `turns` route (advances on answers), `synthesize` route (bumps to ≥4), `approve` route (sets 5) — discovery in P1 records the exact table.
- Tests/specs/docs: `docs/specs/0006-*/index.md` + `verify.md` (§AC-1 label update only), `docs/USER_FLOWS.md` Flow 2.1 (label update), `docs/scope/scope.md` row 7, e2e wizard specs, `prisma/schema.prisma` untouched (verify with `git diff --stat prisma/` empty).

## 4. Quality Gates & Concerns Checklist

| # | Gate / concern | Applies? (YES/NO + one-line why) | How it will be verified | Evidence expected (command, test name, report path, file:line) | Owner phase |
|---|---|---|---|---|---|
| G1 | Flow honesty: Basics Next lands on Idea; rail/URL/server-step always agree; resume lands on unfinished step | YES — the reported bug is exactly this divergence | Click-through new → Idea → Details → Template → Review + resume from dashboard on a fresh session | E2E run log + trace table (server `currentStep` per screen) | P1 |
| G2 | Briefing completeness gates preserved (AC-3 minimums, blocked list, 422 naming fields) | YES — regrouping fields must not weaken gates | Attempt synthesize with thin fields; confirm 422 names them | Targeted e2e/API check + `lib/wizard-validation.ts` unchanged diff | P2 |
| G3 | Synthesis + versions + approval semantics preserved (stream, estimate, idempotent approve, one tree) | YES — money + provisioning correctness | Synthesize → versions → double-approve with same key → one project | E2E approve path + `app/api/wizard/sessions/[id]/approve/route.ts` read | P3 |
| G4 | Authz preserved (owner-only writes, 403 + audit on cross-owner) | YES — session routes re-touched | Cross-owner read/write probe | API 403 + `AuditEvent` row check | P1, P3 |
| G5 | Tests for changed behavior + regression (stepper, resume, 422, idempotency, error paths) | YES — flow restructuring | New/updated intent-named tests that fail if the rule breaks | `pnpm test` suite names + `pnpm test:e2e` spec names (named at execution) | P4 |
| G6 | Static review (`why-review`/`changes-review`) | YES — cross-module flow change | One whole-change static review after all implementation; fix validated findings | Review report in `docs/reviews/` | P4 |
| G7 | Spec/doc sync (0006 AC-1 labels, USER_FLOWS 2.1, scope row 7) | YES — labels change, behavior does not | Diff of spec verify section + flow doc | Updated doc paths + commit diff | P4 |
| G8 | UI/UX + a11y (stepper semantics, focus management on step change, keyboard, contrast, reduced motion) | YES — user-facing flow rebuilt | Keyboard-only run + focus check + axe spot | A11y notes + `docs/reviews/` §a11y | P1, P2, P3 |
| G9 | Performance (no N+1 on session/turns/versions, bounded lists) | YES — session + turns + versions fetched per screen | Inspect fetch fan-out on Idea/Details/Review | Dev log + query count note | P2, P3 |
| G10 | Data integrity / migration / rollback | NO — no schema change; approval atomicity untouched | N/A (verify: `git diff --stat prisma/` empty + approve still single transaction) | `git diff --stat` | — |
| G11 | Backward compat (old sessions resume; legacy minimal create payloads) | YES — sessions created pre-change must still open | Open an old session + POST title-only create | E2E resume + schema unit check (existing pattern from Slice 13) | P1 |
| G12 | Cross-module consumers (dashboard resume links, template suggestion, billing estimate display) | YES — entry points and estimate surface touched | Dashboard resume + template suggestion + estimate render | Click-through log | P1, P3 |
| G13 | AI-feature gate (model call, prompt, agent, tool, retrieval, eval) | NO — no model/prompt/threshold/eval change in this slice | N/A (verify: `lib/wizard*.ts` model paths untouched) | `git diff --stat lib/` | — |
| G14 | Observability (estimate shown pre-run, hold/refund messaging, empty/loading/error states) | YES — paid-step trust copy moves screens | Synthesis blocked + failure messaging spot-check | E2E notes on estimate/402/refund copy | P3 |
| G15 | Maintainability (one shell owner, next change edit sites) | YES — two steppers collapse to one | Record next-change sites (§7) + no duplicated step logic | `grep` for stale step labels post-change | P4 |
| G16 | Project gates (shadcn-only, no-build rule, light-only intact) | YES — repo rules in README/DECISIONS | `components/ui`-only check + no `pnpm build` | `pnpm lint`, `git status` | All |

### Open concerns and risks

- Exact server `currentStep` transition table (turns vs synthesize vs approve) → threatens G1; settle via bounded discovery in P1 (read the three routes, record table; stop when every 1..5 transition has a writer).
- Idea/Details field split vs AC-2 copy ("structured prompts per field") → threatens G2/G7; settle via P2 discovery (propose background/problem/aim vs rest; confirm minimums untouched; stop when mapping table is approved by owner = user).
- Template upload expectation (FR-4 mentions it, no backend) → threatens G12 scope creep; settled as deferred by decision 4; reopens only on explicit user approval.
- Step-label rename churn across spec + flows + tests → threatens G7; settle by listing every touched string in P1 discovery (`grep` for Concept/Context/Briefing labels).

## 5. Execution phases

### P1 — Unified shell + truthful rail + routing (SEQ, root)

- **Objective/boundary:** one shell, honest rail, correct landing. Includes shared stepper, `/new` as step 1, `?step=` deep-linking clamped by server step, removal of local-only step default. Non-goals: no briefing-content redesign yet (P2), no Template/Review redesign yet (P3).
- **Decisions fixed:** §2 decisions 1, 2, 5.
- **Areas/owners:** shell + rail component (new under `components/wizard/`), `app/dashboard/new/page.tsx`, `app/dashboard/wizard/[id]/page.tsx`, `components/wizard/wizard-client.tsx:147` + rail block `:434-454`.
- **Discovery before edit (bounded):** record server `currentStep` writers (turns route `:110-117`, synthesize `:151/:213`, approve `:245`); list every screen string using old labels; stop when the transition table + rename list are recorded — then edit.
- **Implementation output:** Basics Next creates the session and routes to Idea; rail/URL/server-step agree on every screen; resume lands correctly; old sessions still open.
- **Acceptance/quality gate:** G1, G4, G8, G11, G12, G16 evidenced by click-through + resume probes.
- **Dependency metadata:** SEQ root — P2/P3 depend on the shell.

### P2 — Idea + Details briefing UX (SEQ after P1)

- **Objective/boundary:** two guided screens reusing the turn API. Idea (background/problem/aim) then Details (objectives/questions/scope/limitations/methodology/outcomes). Includes sufficiency badges, follow-ups (max 2), blocked list, save-per-field. Non-goals: no threshold/prompt/model change; no synthesis UI yet.
- **Decisions fixed:** §2 decision 3.
- **Areas/owners:** `components/wizard/wizard-client.tsx` briefing block (`:547-651`, `FIELD_ORDER`, `FIELD_LABELS`), `lib/wizard-validation.ts` (read-only), turns route (read-only).
- **Discovery before edit (bounded):** confirm Idea/Details field mapping against AC-2/AC-3 minimums; stop when the mapping table is recorded and approved.
- **Implementation output:** conversational guidance on Idea, structured framing on Details, same gates, staged reveal + motion discipline from Slice 9.
- **Acceptance/quality gate:** G2, G8, G9 evidenced by 422-gate probe + keyboard pass.
- **Dependency metadata:** SEQ after P1 (needs shell + clamped routing).

### P3 — Template + Review + approval (SEQ after P2)

- **Objective/boundary:** Template (suggestion + reason + override + lock note + explicit upload-future) then Review (estimate, synthesize stream, live preview, versions + restore, approve → project). Non-goals: no ledger/model change; no upload build.
- **Decisions fixed:** §2 decision 4 (+ 5 for motion).
- **Areas/owners:** wizard-client Template block (`:480-545`) and Review/Approval blocks (`:653-843`), `app/api/wizard/templates/route.ts`, approve route, `lib/wizard-template.ts`, `lib/wizard-credits.ts` (read-only).
- **Discovery before edit (bounded):** confirm template-list shape, estimate source, idempotency header handling; stop when each is cited to its file:line.
- **Implementation output:** suggestion with reason, override select, cost-transparent synthesis, version history, one-tree idempotent approval.
- **Acceptance/quality gate:** G3, G4, G12, G14 evidenced by synthesize/approve e2e + 403 probe.
- **Dependency metadata:** SEQ after P2 (needs Details-complete gating).

## 6. Final verification order

1. `pnpm lint` then `pnpm typecheck` — must be clean; fix validated findings only.
2. `pnpm test` — full affected suite (wizard + validation + onboarding-adjacent); new intent-named tests for rail-truth, resume landing, 422 naming, idempotent approve. Names fixed at execution (no fabricated IDs here).
3. `pnpm test:e2e` targeted — create Basics → lands Idea; complete Idea → Details unlocks; thin Details blocks synthesis naming fields; synthesis → versions → approve provisions one project; double-approve same key → same project; resume old session lands on unfinished step. Full suite only if targeted fails adjudication.
4. Keyboard-only + focus-management + axe spot on all five steps; reduced-motion check.
5. One whole-change static review; fix validated findings; rerun only invalidated checks.
6. Docs: spec 0006 §AC-1 + verify section label update, `USER_FLOWS.md` Flow 2.1 label update, `scope.md` row 7 progress; confirm `git diff --stat prisma/` empty.

## 7. Risks and execution concerns

- **Two-stepper divergence returns** if local step state drifts from server truth again → mitigated by G1 (server clamp is the single owner) and the transition table in P1 discovery.
- **Label rename misses** (Concept/Context/Briefing strings in tests, toasts, empty states) → mitigated by the P1 rename-list grep; failing test: any e2e asserting an old label (named at execution).
- **Upload pressure** (FR-4 mentions custom guidelines) → explicitly deferred; what forces replan: user approves upload build (new slice: upload API + extraction job + review UI).
- **Credit-estimate confusion** when estimate display moves screens → mitigated by G14 spot-check; estimate math untouched.
- **10× growth:** 10× turns/versions per session — lists stay paged/bounded; failing test: version-list pagination probe (named at execution).
- **Next plausible change:** conversational Idea assistant upgrade (model paraphrase of follow-ups) — edit sites: `lib/wizard*.ts` prompt copy + `wizard-client.tsx` Idea screen only (2 sites, both token/copy-driven).
- **Rollback boundary:** pure frontend + thin route params; no migration; approve path untouched semantically.

## 8. Execution waves

Sequential — shared shell + `wizard-client.tsx` writers across all phases. No PAR waves claimed.

## Self-Review

Self-review: DONE (single author pass, review-only, before validation interview).
- Finding 1 (MEDIUM): first draft repeated the old mistake — P1 described the shell but did not explicitly require removing the local `useState(3)` default that causes the reported bug. Fixed: P1 now names `wizard-client.tsx:147` removal + server clamp as the acceptance core (G1).
- Finding 2 (MEDIUM): Idea/Details split was asserted without an approval owner, risking an AC-2 dispute. Fixed: mapping table requires user approval in P2 discovery.
- Finding 3 (LOW): upload deferral was implicit. Fixed: decision 4 + non-goal state it explicitly with the `grep` evidence (no upload route exists).
- Open: step-label rename (Q1), field split approval (Q2), and overall Plan Gate approval — carried to validation, not decided by assumption.

## Validation Summary

**Validated:** 2026-11-18
**Questions asked:** 4 in 1 round

### Applicability

- **Branch:** EXEMPT
- **Owning artifact / roadmap:** NOT APPLICABLE — EXEMPT (owners: `docs/scope/scope.md` row 7, `docs/specs/0006-project-creation-wizard-briefing/index.md`)
- **Slice / milestone / technical outcome:** row 7 wizard slice — one truthful 5-step flow, mock labels canonical
- **Scope handoff / scenarios:** inline in §0 (three scenarios: fresh create, resume, gated synthesis → one-tree approval)
- **Plan Gate:** READY
- **Human approval:** APPROVED

### Confirmed Decisions

- Step labels: adopt mock labels Basics/Idea/Details/Template/Review everywhere; update spec AC-1 + `USER_FLOWS.md` Flow 2.1 wording, behavior unchanged.
- Idea/Details split: Idea = background/problem/aim; Details = objectives/questions/scope/limitations/methodology/outcomes; server minimums untouched.
- Upload scope: custom guideline upload stays deferred; Template step shows suggestion + override with explicit coming-soon note; future slice on approval.
- Plan Gate: APPROVED for P1→P3 in order; no further questions.

### Assumptions Not Asked

- None left open — all four material decisions asked and confirmed in one round.

### Action Items

- [x] Flip Plan Gate to APPROVED/READY (done here).
- [ ] Execute P1→P3 in order (separate build invocation).

### Applied Changes

- §0 Plan Gate → Human approval REQUIRED→APPROVED with session evidence; status BLOCKED→READY.
- §Validation Summary → PENDING→Validated with applicability, confirmed decisions, and action items.

## P1 Build Log (executed 2026-11-18)

- Shared stepper: `components/wizard/wizard-stepper.tsx` (new) — Basics/Idea/Details/Template/Review rail, `REQUIRED_SERVER_STEP` clamp map, clickable completed/current nodes.
- Basics entry (`components/wizard/new-wizard-entry.tsx`): rail replaced with shared stepper (step 1 active); resume list maps legacy server steps to new labels and deep-links without `?step` so the default rule lands correctly.
- Wizard (`components/wizard/wizard-client.tsx`): removed local-only `useState(3)`; step now initializes from validated `?step` then server-clamped; all nav goes through `goStep` (state + `router.replace` sync); rail replaces the old Concept/Context breadcrumb; content re-keyed — 1 Basics (recap), 2 Idea (background/problem/aim, gated on ≥1 ready field), 3 Details (rest, gated on empty blocked list), 4 Template (moved suggestion+override), 5 Review (synthesize + versions + merged approve, old standalone Approval deleted); `useState(3)` default gone; `Progress`/unused vars removed; effect deps honest.
- Page (`app/dashboard/wizard/[id]/page.tsx`): reads `?step=`, validates 1..5, passes `initialStep`; `instant=false` already present.
- Evidence: `pnpm typecheck` clean; 0 lint flags on touched wizard files; full suite 115/115 pass; dev-server smoke (guard redirect works, zero errors in log). Full click-through with auth deferred to final verification (§6).

## P2 Build Log — save-on-continue (executed 2026-11-18)

- Removed per-field "Save answer" buttons on Idea/Details (user: "isn't that too much work?"). Continue now saves: Idea saves its 3 fields, Details saves its 6, skipping empties and unchanged answers, then re-fetches the session and gates on fresh server state.
- Per-field status replaced with a quiet Saved / Unsaved changes line; sufficiency badges + blocked list still update from the refreshed session.
- Idea Continue requires ≥1 sufficient answer (server readiness, post-save); Details Continue requires empty blocked list (or serverStep ≥ 4, as before); failures show an inline message naming what's left. No contract change — same turns endpoint, same minimums.
- Evidence: `pnpm typecheck` clean; 0 lint flags on touched files; full suite 115/115 pass.

## P2 Cleanup — banner + hint removal (executed 2026-11-18)

- Removed the "Still needed for synthesis / Ready for synthesis" banner and the inline Idea hint from Idea/Details. Per-field Sufficient/Needs-detail badges plus post-save messages now carry all guidance; removed dead `ideaDone`.
- Evidence: `pnpm typecheck` clean; 0 lint flags on touched files.

## P2 UX pass (executed 2026-11-18)

- Field guidance: every briefing field now carries a one-line helper (what to write), rendered under the label next to the server's tailored prompt.
- Required marker: "Needs detail" badge replaced with a red `*` (+ sr-only "required"); green "Sufficient" badge appears only when earned.
- Blocked-field highlighting: failed Continue paints exactly the blocking fields — red container border + red textarea border via `aria-invalid` (shadcn styles it natively). Highlights clear per-field as the user edits, and on successful advance. Step message still names what's left.
- Removed "Resume a briefing" from `/dashboard/new` (distraction on a creation screen; resume lives on the dashboard + projects list).
- Evidence: `pnpm typecheck` clean; 0 lint flags on touched files; full suite 115/115 pass.

## P3 — Template + Review rework (executed 2026-11-18)

- Template step: dropdown replaced with selectable template cards (real shadcn RadioGroup, same pattern as Basics type picker) showing title, version chip, and a "Recommended for you + reason" ribbon on the suggested one; static explainer of what templates control (margins, headings, preliminary pages, citation style); freeze-at-creation framed as reassurance; list prefetched on page load (no open-dropdown spinner); custom upload marked honestly as coming soon (no backend exists). No invented per-template metadata — endpoint only returns title/version.
- Review step reframed around the student's goal: "Generate my project draft" with human credit copy ("Uses about N credits from your balance of M. Failed runs refund automatically."); version history demoted to a quiet "View earlier drafts" link; empty state previews the 9 draft sections instead of "No draft yet"; approval is now "Create my project" with copy that says chapters remain editable afterwards (removed "cannot be undone" scare + "in one transaction" internals). Behavior untouched: same estimate/synthesis/versions/idempotent-approve endpoints.
- Evidence: `pnpm typecheck` clean; 0 lint flags on touched files; full suite 115/115 pass.

## P4 — Review simplification + responsive pass (executed 2026-11-18)

- Fixed invisible radio cards: the shared `RadioGroupItem` hardcodes its own indicator as children, so `render`+children content never painted (affected Basics type picker too). Both switched to label-wrapped native radio semantics — visible cards, full keyboard/screen-reader behavior.
- Review trimmed to its job: removed version tabs/restore/"View earlier drafts" (a creator needs the latest draft, not archaeology); latest draft loads automatically on arrival and right after generation; section-checklist empty state kept as anticipation.
- Responsive: stepper rail collapses to numbered nodes under 480px (active step always labeled); template radio grid, review buttons (flex-wrap), and cards already stack; no `overflow-x` found in the flow.
- Evidence: `pnpm typecheck` clean; 0 lint flags; full suite 115/115 pass.

## P5 — Review single-action + auto-generate (executed 2026-11-18)

- Review stripped to one job: removed estimate/balance copy, the manual generate button, and version tabs/restore/"View earlier drafts" (creators need the latest draft, not archaeology). Draft loads automatically on arrival and re-loads after generation; empty state previews the 9 sections while streaming/queued.
- Synthesis now auto-starts once per session when Review is reached with no draft (one-shot ref guard); insufficient balance shows a top-up message instead of starting; any failure surfaces a Try again button that resets the guard and retries.
- Approve block reduced to Back + "Create my project" (dialog copy updated); removed "cannot be undone" framing and transaction internals from user-facing copy.
- Evidence: `pnpm typecheck` clean; 0 lint flags (one documented suppression for the intentional one-shot effect); full suite 115/115 pass.
