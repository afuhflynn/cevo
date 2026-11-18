# Research page full replication — global search + type tabs + saved panel

Plan profile: full — IMPLEMENTED 2026-11-18 (user-approved), no Git requested

## Build Log (P1+P2 — executed 2026-11-18)

- P1 discoveries: OpenAlex `type` (article/proceedings-article/…) and Crossref `type` (journal-article/book-chapter/…) verified live; `checkResearchCap(userId, kind)` is already user-scoped and reused as-is; audit skipped on the global route (no project target); summary is 2 queries (own projects + their links, counted in code). Workspace right-tab is local `useState` (no URL param) — panel links land on the workspace page, research one click away.
- P1 backend: `ResearchWorkType` + `normalizeWorkType` (OpenAlex/Crossref maps, `other` fallback, OpenAlex-preferred on merge) + `parseWorkTypeParam` + `filterHitsByWorkType` in `lib/research.ts`; `workType` added to both serializers (global + per-project, workspace ignores it); new `GET /api/dashboard/research/search` (same budgets/cache/limits, no project scoping, no billing change); new `getResearchLibrarySummary` (`lib/research-library.ts`, per-project groups with counts) + `GET /api/dashboard/research/library` for panel refresh after save; 5 new unit tests.
- P2 frontend: `/dashboard/research` page (server summary load) + `ResearchBrowser` (search + picker, tabs + More menu, expandable rows with abstract/save/Open-source, skeletons/empty/error/notice states) + `SavedSourcesPanel` (per-project groups, inline View-all); sidebar Research group → direct link with active state; zero per-page font wiring (weight-only utilities, global Roboto inherited).
- Fixes during verify: `<form role="search">` → `<search>` wrapper and `role="status"` p → `<output>` (lint); `inWorkspace` orphan removed; Base UI `Value` falls back to raw id until items register, so pickers now use primitive-native `itemToStringLabel` to always render project titles; temp preview harness (incl. temp `export`, temp route, temp proxy exception) removed afterwards.
- Evidence: `pnpm typecheck` clean; touched-file `biome check` clean (remaining `lib/research.ts` + per-project route diagnostics verified identical on baseline via stash); `pnpm vitest run lib/research.test.ts` 13/13; full `pnpm test` 120/120; dev-server render proof at 1280 + 390 (matches mock: search+button, picker, tabs, rows with Verified pills, panel groups + View all); interactions verified (submit→error path without session, tab→URL param, row expand, More menu 3 items, picker shows titles, save→toast path wired, zero page errors).
- Workspace untouched: `ResearchTab`, per-project routes, billing, providers unchanged; `git diff --stat prisma/` empty.

## 0. Applicability and Plan Gate

### Plan Gate

- **Branch:** EXEMPT — no `docs/product-roadmap.md` in repo; no `docs/project-config.json` (glob 2026-11-18 empty); scope owner is user message 2026-11-18 + attached design screenshot (global Research page).
- **Roadmap:** EXEMPT — none exists; slice owner is this message; follows the shipped projects-list slice (`docs/plans/dashboard-projects-rebuild/plan.md`).
- **Milestone:** EXEMPT — no milestone; builds on research backend truth: per-project search API (`app/api/projects/[projectId]/research/search/route.ts:53-198`), `lib/research.ts` providers + merge, `ProjectSource`/`ResearchSource` models (`prisma/schema.prisma:514-559`), workspace `ResearchTab` (`components/workspace/research-tab.tsx:67-137`).
- **Scope brief:** inline — new global `/dashboard/research` page replicating the screenshot (search + Search button, type tabs, verified results list, Saved Sources panel), reusing provider search + save backends, global font/theme inheritance with no per-page font wiring.
- **Scenarios:** inline — (1) user opens Research, searches, filters by type tab, browses verified results; (2) user saves a hit into a chosen project; (3) Saved Sources panel shows per-project saved groups and jumps into each project's workspace; (4) light render at 360/768/1280 with no dark flash.
- **Product decisions:** global page (not per-project); type tabs need a new normalized `workType` bucket (no such field exists today — `ResearchHit` in `lib/research.ts:18-35`); save stays per-project via existing POST; Saved Sources = per-project groups (mock's "AI in Education (2 sources)" reads as project titles + counts).
- **Project skeleton:** Next.js App Router + Tailwind v4 OKLCH + shadcn-only; owners: new `app/dashboard/research/page.tsx` + `components/dashboard/research-*.tsx`, `lib/research.ts:18-35,502-568,609-668,672-784`, new `app/api/dashboard/research/search/route.ts`, `components/dashboard/app-sidebar.tsx:138-143`, `lib/dashboard.ts` or new `lib/research-library.ts`.
- **Commands:** `pnpm dev`, `pnpm lint`, `pnpm typecheck`; NEVER `pnpm build` (ADR-009). Verify: `pnpm test` only if touched suites exist.
- **Evidence plan:** render-vs-screenshot at 360/768/1280 + API/tab/save/panel click logs; `pnpm lint` + `pnpm typecheck`; grep proving no per-page font wiring; `git diff --stat prisma/` must show the migration only if the plan's schema touch is approved (default: none).
- **Human approval:** APPROVED — user approved all five validation questions 2026-11-18 in-session (expand-inline rows, header picker newest-first, per-project panel groups, sidebar direct link, gate approved).
- **Gate status:** READY — implementation unblocked for P1+P2.

## 1. Outcome and boundaries

**Outcome:** a global Research page matching the screenshot — top search + Search button, All/Journal Articles/Conference Papers/Books/More tabs, verified results rows, Saved Sources side panel — where search reuses the OpenAlex + Crossref merge stack, saving lands in a user-chosen project, and the panel reflects real saved libraries.

**Governing intent:** user message 2026-11-18 ("next we have the research page full replication") + screenshot; existing backend truth preserved (`research/search/route.ts` rate-limit + cache + merge behavior, `checkResearchCap`/`checkResearchRateLimit`, `serializeHit` shape, per-project save POST in `research-tab.tsx:205-242`).

**In scope:**
- Normalized work-type bucket surfaced from provider payloads (`raw` already carries full OpenAlex/Crossref objects — `lib/research.ts:566,668`) through `serializeHit`-equivalent output, plus an optional `type` filter accepted by search.
- One thin global search route reusing `searchOpenAlex`/`searchCrossref`/`mergeHits`/cache (user-scoped rate limit, no project audit or audit without project target — decision in §2).
- New `/dashboard/research` page + client components (header, tabs, rows, panel, skeletons, empty/error), sidebar entry, global font inheritance (no font classes added).
- Saved Sources panel backed by a real cross-project library summary (per-project groups with counts, jump links into workspaces).

**Non-goals (by decision):**
- No schema migration by default — reason: `ResearchSource.rawMetadata` + `ProjectSource` already cover storage; grouping is a query, not a model change. A migration forces replan.
- No citation insert flow on this page — reason: insert needs an open chapter/section (`research-tab.tsx:273-303`); this page is search + save + browse. Mock shows no insert affordance.
- No new providers (Semantic Scholar etc.) — reason: visual slice; provider set stays OpenAlex + Crossref.
- No dark-theme work — reason: light default stands.
- No credit/billing change — reason: search route charges nothing today (rate limits only, `route.ts:78-87`).

**Compatibility/rollback:** additive only (new route, new page, new lib fn, sidebar link edit); rollback = revert range. Search behavior of the workspace tab untouched.

**Not yet specified:** None — the whole route is visible. Open choices are precise decisions in §2, not fog.

## 2. Important technical decisions

1. **Global page, per-project save.** Choice: new `/dashboard/research` route; saving a hit requires a target project chosen in a picker (default = most recently updated project). Alternative: global page without save (browse-only). Sacrifice: picker UI the mock doesn't show. Reversibility: easy. Owner: new page + save dialog.
2. **Work-type bucket, normalized post-merge.** Choice: extract OpenAlex `type` / Crossref `type` from `raw` into a normalized bucket (`journal-article` | `proceedings-article` | `book` | `other`) serialized on every hit; tabs filter by bucket. Alternative: provider-level `filter=type:` params. Sacrifice: pagination can thin out under a tab (≤20 merged hits filtered client-visible); accepted, noted in UI copy only if it bites. Reversibility: medium (replaced by provider params later). Owner: `lib/research.ts` (+ thin route passing `type` through for future provider filtering).
3. **Thin global search route.** Choice: `GET /api/dashboard/research/search?q=&type=&cursor=` reusing `searchOpenAlex`, `searchCrossref`, `mergeHits`, `researchCacheKey`/cache, user-scoped `checkResearchCap` + `checkResearchRateLimit`; no `loadOwnedProject`; audit skipped (no project target) or logged without target. Alternative: reuse per-project route with a synthetic project. Sacrifice: small new file. Reversibility: easy. Owner: new route file.
4. **Saved Sources = per-project groups.** Choice: new `getResearchLibrarySummary(userId)` (projects with saved-source counts + top titles), panel lists top groups, "View all →" expands the panel inline (no new route). Alternative: flat recent-saves list. Sacrifice: one new lib query + server load in page. Reversibility: easy. Owner: new `lib/research-library.ts` (or `lib/dashboard.ts` addition) + panel component.
5. **Submit-based search.** Choice: explicit Search button + Enter (mock shows "Q Search"); no debounce auto-search (saves quota, matches mock). Alternative: 400ms debounce like workspace. Sacrifice: one extra click per search. Reversibility: easy. Owner: search header component.
6. **Sidebar: Research becomes a direct link.** Choice: replace the Research `ProjectGroup` (`app-sidebar.tsx:138-143`) with a direct link to `/dashboard/research` (mock shows Research as a plain highlighted item). Alternative: keep group + add separate item. Sacrifice: loses per-project quick-jump for research (projects group still quick-jumps workspaces). Reversibility: easy. Owner: `app-sidebar.tsx`.

## 3. Areas and owners to touch

- New frontend: `app/dashboard/research/page.tsx` (server shell + library summary load), `components/dashboard/research-search.tsx` (header + tabs + results + save picker), `components/dashboard/research-saved.tsx` (panel), skeletons/empty/error states inside those files.
- Backend: `lib/research.ts` (bucket extraction + serialization + optional `type` threading), new `app/api/dashboard/research/search/route.ts`, new library-summary query (`lib/research-library.ts` or `lib/dashboard.ts`).
- Sidebar: `components/dashboard/app-sidebar.tsx:138-143` (Research group → link, active state).
- Unchanged by default: workspace `ResearchTab`, per-project search/sources routes, `prisma/schema.prisma` (any migration = replan trigger), billing, providers.
- Tests/specs/docs: `lib/research.test.ts` (bucket + merge-filter assertions live here); no e2e research refs found; plan Build Log records evidence.

## 4. Quality Gates & Concerns Checklist

| # | Gate / concern | Applies? (YES/NO + one-line why) | How it will be verified | Evidence expected (command, test name, report path, file:line) | Owner phase |
|---|---|---|---|---|---|
| G1 | Page matches approved design (search+button, tabs, rows+Verified, saved panel) | YES — core deliverable | Side-by-side screenshot-vs-render at 1280 + 768 + 360 | Render notes + new page/component diffs | P2 |
| G2 | Single global font/theme, zero per-page font wiring | YES — same standing requirement as projects slice | Grep `font-family`/`font-(sans\|serif\|mono)` on new files + visual spot vs landing | Grep log clean of family wiring; `app/layout.tsx:62` unchanged | P1/P2 |
| G3 | Type tabs truthful (every tab filters correctly, All = unfiltered) | YES — new bucket + filter path | Click each tab + More options on a fixed query; All restores full set | Tab click log; `lib/research.test.ts` bucket cases | P1/P2 |
| G4 | Search + save work end-to-end (submit, 429/empty/error, save lands in chosen project) | YES — new route + picker + existing POST | Submit query, force empty + rate-limit copy, save to picked project and confirm in its workspace library | Action log; workspace library check | P2 |
| G5 | Saved panel truthful (counts match libraries, links land in workspaces) | YES — new summary query | Compare panel counts vs per-project library totals; click through each group link | Count reconciliation log | P1/P2 |
| G6 | No workspace regression (tab search/save/insert untouched) | YES — shared `lib/research.ts` touched | Workspace research smoke: search → save → insert citation still works | Smoke log; `pnpm test` if suites exist | P2 |
| G7 | Responsive, no overflow (tabs scroll, panel stacks below list) | YES — two-column + 5 tabs | 360/768/1280 pass | Viewport notes | P2 |
| G8 | Accessibility (tabs semantics, search label, menu keyboard, progress-free meters n/a) | YES — new tablist + menus + results | Keyboard-only: tab strip, More menu, save picker, panel links; focus visible; live-region status | A11y notes | P2 |
| G9 | Empty/error/loading states (no query, no results, provider notice, 429) | YES — new surface | Force each: blank, gibberish query, 429 copy, notice display | State notes | P2 |
| G10 | Static review of plan + change | YES — user-facing + backend change | One self-check on plan; one static pass on change before verify | `## Self-Review` + change notes | P1/P2 |
| G11 | Spec/doc sync | YES if a research spec owns this surface, else plan log only | Update only owned verify notes | Spec diff or Build Log | P2 |
| G12 | Security/authz (user-scoped search, no cross-user library leak, picker lists own projects only) | YES — new global route + cross-project query | Unauthenticated API → 401; user B cannot see user A's panel data (code review of `where userId`) | Authz review notes + `route.ts`/`research-library.ts` lines | P1 |
| G13 | Data integrity/migration | NO by default — query-only, no schema change | N/A (any migration triggers replan) | `git diff --stat prisma/` empty | — |
| G14 | Performance (provider budgets kept, cache shared, no N+1 in summary) | YES — new route + summary query | 12s overall budget intact; summary is 1–2 queries, not per-project fan-out | Route/lib lines; render timing note | P1 |
| G15 | Maintainability (one owner per rule, tokens only, no one-off hex) | YES — new surface | Bucket map + tab config in one place; token-only diff | Lib/component paths | P1/P2 |
| G16 | AI-feature gate | NO — no model/prompt/tool change | N/A | No `lib/assistant*` diff | — |

### Open concerns and risks

- Bucket vocabulary (G3) → settled by P1 bounded discovery: read OpenAlex `type` values + Crossref `type` values from `raw` samples/codecs, record exact map; stop = map table recorded; unknown types fall in `other`, never dropped silently.
- Save-picker default + empty-project case (G4) → user decision Q2; threatens G4 if a user with zero projects searches.
- Panel grouping + View-all behavior (G5) → user decision Q3.
- Sidebar replacement vs addition (G1) → user decision Q4.
- Quota/429 copy on global route (G9) → reuse existing 30/min copy; settled in P1 by reading `checkResearchCap`.

## 5. Execution phases

### P1 — Backend: bucket + global search route + library summary (SEQ predecessor)

- **Objective and boundary:** prove the data the mock promises. Includes: `workType` bucket extraction/serialization, optional `type` param threading, thin global search route (user-scoped limits, shared cache), `getResearchLibrarySummary(userId)`, unit tests for bucket + merge filtering. Non-goals: no UI yet, no schema change, no provider additions.
- **Decisions fixed:** §2 choices 2–4 (bucket post-merge, thin route, per-project groups).
- **Areas/owners:** `lib/research.ts`, new route file, new summary query, `lib/research.test.ts`.
- **Discovery before edit (bounded, stop conditions):**
  1. Type vocab: record OpenAlex `type` values (article, proceedings-article, book, book-chapter, dataset, review…) and Crossref `type` values (journal-article, proceedings-article, book…) from docs-in-code/samples; write the normalization map. Stop: map table recorded; unmapped → `other`.
  2. Cap/audit: read `checkResearchCap` + `logWorkspaceAudit` signatures for user-scoped (project-less) use. Stop: call pattern recorded.
  3. Summary shape: confirm `ProjectSource`→`Project`→user join path via existing queries (`getDashboardCatalog` user scoping pattern). Stop: query sketched, 1–2 queries, no fan-out.
- **Implementation output:** typed search results filterable by tab; global search endpoint honoring limits + cache; summary data with per-project counts; unit tests green.
- **Acceptance/quality gate:** G3 (unit), G5 (query verified against seed/real data), G12 (authz review of new route + query), G14 (budgets intact), G2 (no font wiring in any touched file). Gates: G2, G3, G5, G12, G14.
- **Dependency metadata:** SEQ — P2 starts only after P1's route + summary + bucket map land.

### P2 — Frontend: page + sidebar + verify (SEQ after P1)

- **Objective and boundary:** ship the mock on `/dashboard/research` reusing P1. Includes search header + tabs + More menu, results rows with Verified pills, save-to-project picker, saved panel with inline View-all, skeletons/empty/error, sidebar link swap, responsive + a11y, dev-server render proof. Non-goals in §1 hold.
- **Decisions fixed:** §2 choices 1, 5, 6 as approved in Validation Summary (global page + picker, submit search, sidebar link).
- **Areas/owners:** new `app/dashboard/research/page.tsx`, `components/dashboard/research-*.tsx`, `app-sidebar.tsx:138-143`.
- **Discovery before edit (bounded, stop condition):** confirm save-picker project source (reuse catalog's first-5 query vs full list; stop = source named) and empty-project save path (stop = behavior recorded: disable save with guidance vs prompt to create).
- **Implementation output:** the replicated page; sidebar Research highlights on this route; no per-page font classes; no new `public/` rasters.
- **Acceptance/quality gate:** G1, G4, G6–G11, G15 evidenced (render notes at 3 viewports, action/click/keyboard logs, `pnpm lint`, `pnpm typecheck`, test run). Gates: G1, G4, G6, G7, G8, G9, G10, G11, G15.
- **Dependency metadata:** SEQ — shares research writers with P1; no parallelism.

Inline steps: (1) P1 discoveries, record; (2) apply validation answers; (3) P1 route + summary + tests; (4) P2 page → tabs → rows → picker → panel → sidebar → responsive/a11y; (5) static pass; (6) verify (§6). Rollback: revert range (additive, workspace untouched).

## 6. Final verification order

1. `pnpm lint` then `pnpm typecheck` — must be clean (touched-file flags vs baseline).
2. Unit: `lib/research.test.ts` bucket + filter cases green (new assertions).
3. Render sweep: `/dashboard/research` vs screenshot at 360/768/1280 in light + forced-OS-dark reload (stays light, no flash, no overflow) — notes recorded.
4. Behavior: submit search → results; each tab + More option filters; All restores; save → appears in picked project's workspace library; panel counts reconcile; panel links land in workspaces; View-all expands inline.
5. Workspace regression smoke: per-project tab search → save → insert still works.
6. Keyboard + states: tab strip / More menu / picker keyboard run; empty/429/error/skeleton each forced once.
7. Authz spot: unauthenticated global search → 401; picker lists own projects only.
8. One static review pass; fix validated findings; rerun only invalidated checks. Then `pnpm test` if suites exist.
9. Docs: Build Log here; spec notes only where owned; confirm `git diff --stat prisma/` empty and no new `public/` rasters.

## 7. Risks and execution concerns

- Type-bucket mismatch (OpenAlex vs Crossref vocabularies) → mitigated by P1 normalization map with `other` fallback; failing check: tab showing zero while All shows many (G3 unit + click log).
- Save without a project (new users) → mitigated by Q2 (picker default + empty-state behavior); unapproved invention here is a plan violation.
- Panel N+1 (per-project fan-out) → mitigated by single aggregate query design (G14); failing check: query count in review.
- Cross-user library leak → mitigated by user-scoped `where` + G12 review; failing check: authz spot test.
- Sidebar quick-jump loss → mitigated by Q4; full nav redesign forces replan.
- Scope creep into insert-flow or new providers → explicitly non-goal; forces replan.
- 10× concern: summary query stays aggregate; search stays provider-budgeted + cached; next plausible change = save-from-panel + bulk actions — edit sites: panel component + existing POST only.
- Protected-rule tests that must fail if broken: tab filter returning wrong set (G3), panel count mismatch (G5), unauthenticated search not 401 (G12) — named obligations, no fabricated IDs.

## 8. Execution waves

Sequential — P1 then P2; P2 consumes P1's route + summary + bucket map. No PAR.

## Self-Review

Self-review: DONE (single reviewer-style pass by plan author, review-only, no edits to other files).

- Finding 1 (MEDIUM): first draft let the summary query fan out per project — fixed: P1 discovery item 3 requires a 1–2-query aggregate design (G14).
- Finding 2 (MEDIUM): save target was implied by the mock's silence — fixed: explicit Q2 with picker default + zero-project behavior.
- Finding 3 (LOW): "More ⌄" content was undefined — fixed: overflow menu of extra buckets from the same normalization map, executor-bounded.
- Open: Q1–Q5 answers pending — carried to Validation Summary, not decided by assumption.

## Validation Summary

**Validated:** 2026-11-18
**Questions asked:** 5 in 2 rounds

### Applicability

- **Branch:** EXEMPT
- **Owning artifact / roadmap:** NOT APPLICABLE — EXEMPT (no `docs/product-roadmap.md`, no `docs/project-config.json`; owner is user message 2026-11-18 + design screenshot)
- **Slice / milestone / technical outcome:** global research page replication (`docs/plans/research-page-replication/plan.md`)
- **Scope handoff / scenarios:** inline scope brief + inline scenarios (§0)
- **Plan Gate:** READY
- **Human approval:** APPROVED

### Confirmed Decisions

- Q1 Row behavior: expand inline (recommended) — row expands to abstract + Save to project + Open DOI link; no new detail route.
- Q2 Save picker: header dropdown defaulting to most recently updated project (recommended); zero projects → save disabled with "Create a project first" guidance linking `/dashboard/new`.
- Q3 Saved panel: per-project groups with counts linking into workspaces (recommended); View-all expands the panel inline.
- Q4 Sidebar: replace Research group with direct link to `/dashboard/research` (recommended).
- Q5 Plan Gate approval: APPROVED for new global page + thin route + summary query + sidebar link; no schema/insert/providers.

### Assumptions Not Asked

- "More ⌄" holds extra buckets from the same normalization map — left as executor-bounded (plan §5 P1 discovery item 1).
- Global search audit skipped (no project target) — left to P1 discovery item 2 (skip vs target-less log).
- Save-picker project source (catalog first-5 vs full list) — left to P2 bounded discovery.

### Action Items

- [x] Flip Plan Gate to APPROVED/READY (done here).
- [ ] Execute P1 (bucket map, thin route, summary query, unit tests), then P2 (page, panel, picker, sidebar, verify) — separate build invocation.

### Applied Changes

- §0 Plan Gate → Human approval REQUIRED→APPROVED with session evidence; status BLOCKED→READY.
- §2 decisions → Q1–Q4 outcomes recorded as the confirmed path (expand-inline, header picker, per-project groups, sidebar link).
- This section (§Validation Summary) → PENDING→Validated with decisions, action items, and applied-changes list.
