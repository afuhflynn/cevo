# Dashboard Projects rebuild — My Projects list + global font/theming guardrail

Plan profile: full — IMPLEMENTED 2026-11-18 (user-approved), no Git requested

## 0. Applicability and Plan Gate

### Plan Gate

- **Branch:** EXEMPT — no `docs/product-roadmap.md` in repo (verified 2026-11-18 by prior plans; still absent); no `docs/project-config.json` present (glob 2026-11-18 empty); living scope is the in-flight dashboard rebuild the user describes in-session.
- **Roadmap:** EXEMPT — none exists; scope owner is this user message 2026-11-18 + attached design screenshot (My Projects list).
- **Milestone:** EXEMPT — no milestone; slice owner is dashboard slice 12 follow-up (`docs/plans/landing-hero-light/plan.md` Build Log slice 12: dashboard shell + `/dashboard/projects` catalog shipped).
- **Scope brief:** inline — rebuild `/dashboard/projects` main content to the screenshot (title, search + Create Project, status tabs, project/status/progress/updated list) while keeping the app font from `app/globals.css` (landing font) global with no per-page/per-layout font insertion, plus other theming via tokens.
- **Scenarios:** inline — (1) user opens Projects, sees "My Projects" list matching design, filters by tab, searches, paginates; (2) row actions (open, duplicate, archive via kebab) keep working; (3) landing + dashboard + auth share one font/theme with no per-page font class, in light default.
- **Product decisions:** status set = existing five + All (matches screenshot tabs); progress = existing `progressPercent`; Updated = relative time (source = discovery P1); Create Project → `/dashboard/new`; sidebar shell stays (active Projects state only); Upgrade/credits card placement = decision Q3.
- **Project skeleton:** Next.js App Router + Tailwind v4 OKLCH + shadcn-only; owners: `app/layout.tsx:7-24,59-62`, `app/globals.css:117-209`, `app/dashboard/layout.tsx`, `components/dashboard/dashboard-shell.tsx`, `components/dashboard/app-sidebar.tsx`, `app/dashboard/projects/page.tsx`, `components/dashboard/dashboard-catalog.tsx:495-801`, `lib/dashboard.ts`, `lib/search-params.ts`.
- **Commands:** `pnpm dev`, `pnpm lint`, `pnpm typecheck`; NEVER `pnpm build` (ADR-009). Verify: `pnpm test` only if touched suites exist.
- **Evidence plan:** render check of `/dashboard/projects` vs screenshot at 360/768/1280 in light; `pnpm lint` + `pnpm typecheck`; grep proving no per-page font classes; click-through search/tab/row-action/pagination.
- **Human approval:** APPROVED — user approved all four validation questions 2026-11-18 in-session (scroll tabs, drop stats+sidebar, archived keeps cards, gate approved).
- **Gate status:** READY — implementation unblocked for P1+P2.

## 1. Outcome and boundaries

**Outcome:** `/dashboard/projects` shows the screenshot's "My Projects" list experience (title, top search + Create Project + overflow, status tabs + filter, rows with icon/title/status-pill/progress/updated/row-menu) fed by the existing catalog backend, and the landing font + theming is enforced once globally so every page inherits it with zero per-page font wiring.

**Governing intent:** user message 2026-11-18 ("rebuild dashboard projects page to replicate [screenshot]; keep app font in globals.css used on landing on all pages not by inserting manually per page but globally, plus other theming; do this design as good as it is").

**In scope:**
- List rebuild of the projects main column: header, controls, tabs, rows, empty/error/pagination states.
- Global font/theme guardrail: single `--font-sans` definition + `font-sans` on root `<body>` only; audit + remove any per-page/per-layout font-family or `font-*` overrides that fight it; theming strictly via existing CSS vars/Tailwind tokens.
- Keep backend contract: `getDashboardCatalog({search,status,page})`, `loadDashboardSearchParams`, archive/duplicate/unarchive actions, archived page untouched unless shared component forces it.
- Responsive + a11y for the new list (tabs as tablist/radio semantics, row menus keyboard-operable, progress with accessible values).

**Non-goals (by decision):**
- No sidebar full redesign — reason: shell shipped in slice 12 and screenshot sidebar is near-identical (nav items + active Projects); only active-state/polish, not a new nav.
- No new statuses, no progress algorithm change — reason: visual slice; tabs map 1:1 to existing `STATUS_OPTIONS`.
- No dark-theme redesign — reason: platform is light-default per slice 1 (`components/providers.tsx:9-14`); `.dark` tokens stay intact.
- No backend/schema change — reason: catalog already returns title/status/progress/dates/tasks.

**Compatibility/rollback:** pure frontend; rollback = revert commit range. No migration; `git diff --stat prisma/` must stay empty.

**Not yet specified:** None — the whole route is visible. Open choices are precise decisions in §2, not fog.

## 2. Important technical decisions

1. **Global font lives in two places only.** Choice: `app/layout.tsx:7-24` defines `Roboto --font-sans` via `next/font` + `app/globals.css:117-209` maps `--font-sans` in `@theme inline` and applies it once on `body`. Alternative: add `font-sans`/`font-[...]` classes per page or layout. Sacrifice: none — removes drift. Reversibility: easy. Owner: `app/layout.tsx`, `app/globals.css`. Executor must grep and delete competing `font-family` / `font-serif` / `font-mono` misuse on dashboard surfaces (serif stays only where deliberately used, e.g. stat numerals today).
2. **No hardcoded screenshot blue.** Choice: reuse `--primary` / `--muted` / `--border` / `--accent` tokens for pills, bars, tabs, Create button. Alternative: pixel-pick hex from screenshot. Sacrifice: slight hue delta vs mock. Reversibility: easy (token edit). Owner: `app/globals.css`, catalog components.
3. **Tabs, not the Select dropdown.** Choice (validated 2026-11-18): status tabs (`All, Draft, Planning, In Progress, Ready for Review, Completed`) drive the existing `status` query param; tabs scroll horizontally on mobile, Select removed from this page. Alternative: keep Select + add tabs (two sources of truth). Sacrifice: overflow styling work. Reversibility: easy. Owner: `components/dashboard/dashboard-catalog.tsx:515-562`, `lib/search-params.ts`.
4. **Rows, not cards, for the active list.** Choice: one row per project (icon, title, status pill, progress bar + %, updated relative time, kebab menu with Open/Duplicate/Archive). Alternative: restyle cards. Sacrifice: card grid removed on this page (archived page may keep cards or share rows — Q3). Reversibility: easy. Owner: `dashboard-catalog.tsx:321-493` (`ProjectCard` → `ProjectRow`).
5. **Updated column source.** Choice: relative time from the project's `updatedAt` (verify field exists in `lib/dashboard.ts` catalog type; else latest activity timestamp). Alternative: show absolute date. Sacrifice: needs discovery confirmation. Reversibility: easy. Owner: `lib/dashboard.ts` + row component. Blocking discovery in P1, default to `updatedAt` with fallback noted.
6. **Search moves to the page header.** Choice: screenshot's top search input (with Create Project + overflow) becomes the catalog search, replacing the in-column search box; keep `nuqs` debounced query + `page:1` reset. Alternative: two search boxes. Sacrifice: layout work in `app/dashboard/projects/page.tsx:38-95`. Reversibility: easy. Owner: `app/dashboard/projects/page.tsx`, `dashboard-catalog.tsx:644-679`.

## 3. Areas and owners to touch

- Font/theme (global only): `app/layout.tsx:54-71`, `app/globals.css:117-209`, `components/providers.tsx:7-18` (read-only confirm light default). Grep targets: `font-family`, `font-serif`, `font-sans`, `font-mono` under `app/dashboard/**` and `components/dashboard/**`.
- Projects page: `app/dashboard/projects/page.tsx:22-114` (header rewrite: "My Projects", search + Create Project + overflow, tabs row; stats header disposition = Q2).
- Catalog client: `components/dashboard/dashboard-catalog.tsx:110-124,495-801` (tabs control, `CatalogView` list markup, `ProjectCard`→row conversion, skeletons, empty/error, pagination keep).
- Sidebar (polish only): `components/dashboard/app-sidebar.tsx:123-137` (Projects active state incl. `/dashboard/new`, `/dashboard/archived`); upgrade/credits bottom card only if Q3 says add.
- Data contract (read-only unless discovery says otherwise): `lib/dashboard.ts` (catalog fields: status, progressPercent, updatedAt/activity), `lib/search-params.ts` (`dashboardSearchParams`), `app/dashboard/actions.ts` (duplicate/archive reused in row menu).
- Tests/specs/docs: existing dashboard tests if they assert card grid copy ("Your projects", "Search by title or programme"); `docs/specs/` only if a dashboard spec owns this page (verify, don't invent); no schema/mirror changes.

## 4. Quality Gates & Concerns Checklist

| # | Gate / concern | Applies? (YES/NO + one-line why) | How it will be verified | Evidence expected (command, test name, report path, file:line) | Owner phase |
|---|---|---|---|---|---|
| G1 | List matches approved design (title, search+CTA, tabs, row columns, pills, progress, updated, kebabs) | YES — core deliverable | Side-by-side screenshot-vs-render at 1280 + 768 + 360 | Render notes + `app/dashboard/projects/page.tsx` + `dashboard-catalog.tsx` diff | P2 |
| G2 | Single global font/theme, zero per-page font wiring | YES — explicit user requirement | Grep `font-family`/`font-(sans|serif|mono)` under dashboard surfaces + visual spot landing vs dashboard | `grep -rn` log clean except deliberate serif numerals; `app/layout.tsx:62`, `app/globals.css:151-160,188-197` | P1 |
| G3 | Filter/search/pagination truth preserved | YES — controls move but query contract stays | Click-through: each tab filters, search debounces + resets page, pagination walks | Dev click log; `lib/search-params.ts` unchanged or diff-noted | P2 |
| G4 | Row actions preserved (open/duplicate/archive + toasts + invalidation) | YES — card menu becomes row menu | Exercise kebab per row: duplicate → copy appears; archive → leaves list; restore path intact | Dev action log; `app/dashboard/actions.ts` reuse (no new server fn) | P2 |
| G5 | Responsive, no overflow (tabs scroll, rows collapse gracefully) | YES — 5 tabs + 4 columns on small screens | 360/768/1280 pass, tabs scroll, row stacks without horizontal scroll | Viewport notes; catalog diff | P2 |
| G6 | Accessibility (tabs semantics, menu keyboard, progress values, labels) | YES — new tablist + menus + meters | Keyboard-only run: tab arrow keys, menu open/Escape, focus visible; progress `aria-valuenow` | A11y notes; row/menu component lines | P2 |
| G7 | Empty/error/loading states redesigned, not dropped | YES — list has new skeleton + empty + error | Force each: filter to zero, offline error, slow load | State screenshots/notes; `CatalogSkeleton` + `Empty` + `Alert` diffs | P2 |
| G8 | No logic/data regression (archived page, stats, counts) | YES — shared `CatalogView`/actions touched | Archived page + stats render unchanged; counts consistent | Dev check log; `pnpm test` if dashboard suites exist | P2 |
| G9 | Static review of plan + change | YES — user-facing change | One why-review-style self-check on plan (§Self-Review); one static pass on change before verify | `## Self-Review` entry; change review notes | P1/P2 |
| G10 | Spec/doc sync | YES if a dashboard spec owns this page, else minimal | Update only the spec verify notes the render changes; else plan Build Log only | Spec diff or `docs/plans/dashboard-projects-rebuild/plan.md` log | P2 |
| G11 | Security/authz | NO — no guard, session, or data-access change | N/A (diff shows no `lib/auth*`, `proxy.ts` change) | `git diff --stat` | — |
| G12 | Data integrity/migration | NO — no schema change | N/A | `git diff --stat prisma/` empty | — |
| G13 | AI-feature gate | NO — no model/prompt/tool change | N/A | No `lib/assistant*`, `lib/review*` diff | — |
| G14 | Maintainability (one row component, tokens only, no one-off hex) | YES — new list markup risk | Row lives in one component; colors via tokens; no inline hex | Row component path + token-only diff | P2 |
| G15 | Performance (no new assets, lists bounded by existing pagination) | YES — list re-render + tabs | No new raster in `public/`; pagination limits intact; debounced search intact | `git status public/` clean; `dashboard-catalog.tsx:506-513` debounce intact | P2 |

### Open concerns and risks

- Updated-field source (G1) → settled by P1 discovery: confirm `updatedAt` (or chosen activity timestamp) exists on catalog items; stop = field named + fallback recorded; threatens G1/G8 if missing.
- Stats-header fate + archived-page sharing (G1/G8) → user decision Q2/Q3; threatens scope creep if both pages redesigned.
- Competing font overrides extent (G2) → settled by P1 grep; stop = override list recorded or clean declared; threatens G2 if a dashboard layout re-declares fonts.
- Tab-vs-Select single source (G3) → settled by decision 3 + Q1 mobile answer; threatens G3/G5 if both ship.

## 5. Execution phases

### P1 — Global font/theme guardrail + discovery (SEQ predecessor)

- **Objective and boundary:** prove one global font path and record all facts P2 needs. Includes: font/theme audit, override removal, Updated-field + stats/archived discovery. Non-goals: no list markup yet.
- **Decisions fixed:** §2 choices 1–2 (global-only font, token-only color).
- **Areas/owners:** `app/layout.tsx`, `app/globals.css`, `components/providers.tsx`, `lib/dashboard.ts`, `lib/search-params.ts`.
- **Discovery before edit (bounded, stop conditions):**
  1. Font-override grep: `font-family|font-sans|font-serif|font-mono` in `app/dashboard/**`, `components/dashboard/**`, `app/(auth)/**`, `app/onboarding/**`; record hits or declare clean. Stop: hit list or clean note recorded.
  2. Catalog fields: confirm `updatedAt` (or latest-activity) + `progressPercent` + `status` values on the catalog type; record exact field + relative-time formatter choice. Stop: field names recorded.
  3. Stats/archived fate: read tests/specs asserting "Your projects" / card grid / stats header to size renames. Stop: affected assertions listed.
- **Implementation output:** global font path confirmed with overrides removed; discovery table (Updated field, stats disposition, archived sharing, tab values) recorded in the build log.
- **Acceptance/quality gate:** G2 evidenced (grep log + landing-vs-dashboard font spot); G9 (plan self-review) closed. Gates: G2, G9.
- **Dependency metadata:** SEQ — P2 starts only after P1's discovery table lands.

### P2 — My Projects list rebuild (SEQ after P1)

- **Objective and boundary:** ship the screenshot list on `/dashboard/projects` reusing the catalog backend (validated 2026-11-18: stats header + Milestones sidebar dropped on this page; archived page keeps its card grid untouched). Includes header/search/CTA/tabs/rows/skeletons/empty/error/pagination + responsive + a11y. Non-goals in §1 hold; archived page changes only per Q3 answer.
- **Decisions fixed:** §2 choices 3–6 as approved in Validation Summary (tabs drive `status`; rows replace cards here; search in header; `updatedAt`-relative default).
- **Areas/owners:** `app/dashboard/projects/page.tsx`, `components/dashboard/dashboard-catalog.tsx`, `components/dashboard/app-sidebar.tsx` (active-state polish only).
- **Discovery before edit (bounded, stop condition):** confirm tab→`status` value map (`all/draft/planning/in_progress/ready_for_review/completed`) against `STATUS_OPTIONS` + `dashboardSearchParams`; confirm Create Project → `/dashboard/new` and overflow menu items (filter icon behavior: opens status menu on mobile vs decorative). Stop: map + menu items recorded; any new-route need escalates instead of building.
- **Implementation output:** "My Projects" list with working tabs/search/rows/menus/pagination; skeletons + empty + error restyled; no per-page font classes; no new `public/` rasters.
- **Acceptance/quality gate:** G1, G3–G8, G10, G14–G15 evidenced (render notes at 3 viewports, action/click logs, keyboard run, lint + typecheck, test run if suites exist). Gates: G1, G3, G4, G5, G6, G7, G8, G10, G14, G15.
- **Dependency metadata:** SEQ — shares catalog writers with P1's guardrail; no parallelism.

Inline steps: (1) P1 audit + discoveries, record; (2) apply validation answers; (3) P1 override cleanup; (4) P2 header → tabs → rows → states → responsive/a11y; (5) static pass; (6) verify (§6). Rollback: revert commit range; font restore = revert `globals.css`/`layout.tsx` hunks only.

## 6. Final verification order

1. `pnpm lint` then `pnpm typecheck` — must be clean (touched-file flags compared against baseline; pre-existing patterns noted, not fixed here).
2. Font guardrail: recorded grep log shows no competing dashboard font wiring; visual spot landing vs dashboard type matches; `git diff` shows font changes only in `app/layout.tsx` + `app/globals.css` (+ deletions of overrides).
3. Render sweep: `/dashboard/projects` vs screenshot at 360/768/1280 in light + forced-OS-dark reload (stays light, no flash, no overflow) — notes recorded.
4. Behavior: every tab filters correctly; search debounces and resets to page 1; pagination walks; kebab duplicate/archive/toasts/invalidation work; archived page + stats intact per Q2/Q3.
5. Keyboard + states: tablist arrow-key run, menu open/Escape/focus, progress values exposed; empty/error/skeleton each forced once.
6. One static review pass of the change; fix validated findings; rerun only invalidated checks. Then `pnpm test` if dashboard suites exist.
7. Docs: Build Log entry here; spec verify notes only where owned truth changed; confirm `git diff --stat prisma/` empty and no new `public/` rasters.

## 7. Risks and execution concerns

- Tab set mismatch (screenshot shows 6 incl. "Ready for Review") → mitigated by mapping tabs 1:1 to existing statuses; what forces replan: user wants a new status value (schema + workflow change, separate slice).
- Updated-source missing → mitigated by P1 discovery with activity-timestamp fallback; failing check: row renders "—" or wrong date.
- Stats-header removal surprise → mitigated by Q2 (keep vs drop vs restyle); unapproved removal is a plan violation, not executor discretion.
- Archived-page drift → mitigated by Q3 (share rows vs keep cards); sharing without approval risks breaking archived UX.
- Font-override whack-a-mole → mitigated by P1 grep + deletion; failing test: grep log clean (G2).
- Scope creep into sidebar redesign → mitigated by non-goal + active-state-only rule; full nav rebuild forces replan.
- 10× concern: list scales via existing server pagination; next plausible change = sort control + bulk actions — edit sites: `lib/search-params.ts` + `CatalogView` header only.
- Protected-rule tests that must fail if broken: tab filter returning wrong set (G3), duplicate/archive silently failing (G4), grep finding a dashboard `font-family` override (G2) — named as verification obligations, no fabricated test IDs.

## 8. Execution waves

Sequential — P1 then P2; shared catalog writers and P2 depends on P1's discovery table. No PAR.

## Self-Review

Self-review: DONE (single reviewer-style pass by plan author, review-only, no edits to other files).

- Finding 1 (MEDIUM): first draft let the executor choose stats-header fate inline — fixed: stats disposition is now blocking Q2 with keep/restyle/drop options and G8 owns the regression check.
- Finding 2 (MEDIUM): archived page sharing was implied — fixed: explicit Q3 + G8/G14 ownership; default keeps archived untouched unless user approves sharing.
- Finding 3 (LOW): font rule could have re-allowed serif body text — fixed: serif stays only where deliberate (existing stat numerals), body/dashboard UI is sans-only.
- Open: Q1–Q3 answers pending — carried to Validation Summary, not decided by assumption.

## Build Log (P1+P2 — executed 2026-11-18)

- P1 discovery: global font path confirmed — `app/layout.tsx:7-24` defines Roboto `--font-sans`, `app/globals.css:151-160` maps it in `@theme inline`, body applies `font-sans` once (`globals.css:186-200`, `layout.tsx:62`). No `font-family` overrides anywhere on dashboard surfaces; `font-serif` opt-ins exist on other dashboard pages (billing/archived/detail headings) and stat numerals — deliberate, out of scope, untouched. New list uses weight-only utilities, zero font-family classes (G2 evidence: grep logs).
- P1 discovery: catalog already returns `status`, `progressPercent`, `updatedAt` ISO (`lib/dashboard.ts:18-21,152-157`); Updated = relative `Intl.RelativeTimeFormat` from `updatedAt`. No test/spec asserts the old copy (no e2e dashboard refs; 20 unit-test files untouched by this change).
- P2: new `components/dashboard/projects-list.tsx` — `ActiveProjectsList` (search + Create + overflow, tabs, list, pagination, skeleton/empty/error) + `ProjectRow` (icon/title/pill/bar/%/relative-time/kebab with duplicate/archive dialogs reusing `app/dashboard/actions.ts` + same `["dashboard","projects"]` invalidation). `dashboard-catalog.tsx` gains only `export` on `fetchCatalog`/`CatalogResponse`; `ProjectCard`/`CatalogView` untouched for archived.
- P2: `app/dashboard/projects/page.tsx` rewritten — catalog loader, single-column list, Suspense fallback is the new `ProjectsListSkeleton`. Stats header + Milestones sidebar dropped per Q2; archived keeps cards per Q3; Archived stays reachable via header overflow menu.
- Self-review fix: `Progress` root renders its own track, so passing a custom track duplicated the bar — fixed with `[&_[data-slot=...]]` selectors (one track, `h-1.5`, emerald indicator when 100%).
- Evidence: `pnpm typecheck` clean; touched-file `biome check` clean; `pnpm test` 115/115; dev-server smoke (guard 307, sign-in 200, no 500s); Playwright render check on mock data at 1280 + 390 (matches screenshot: search/CTA/tabs/header/rows/pills/progress/relative time; mobile stacks, tabs scroll); tab click updates `?status=DRAFT`, search updates `?search=`, kebab opens Open/Duplicate/Archive and the archive dialog; zero page errors. Preview route + proxy exception removed afterwards; tree holds only the three intended changes.

## Validation Summary

**Validated:** 2026-11-18
**Questions asked:** 4 in 1 round

### Applicability

- **Branch:** EXEMPT
- **Owning artifact / roadmap:** NOT APPLICABLE — EXEMPT (no `docs/product-roadmap.md`, no `docs/project-config.json`; owner is user message 2026-11-18 + design screenshot)
- **Slice / milestone / technical outcome:** dashboard projects list rebuild + global font guardrail (`docs/plans/dashboard-projects-rebuild/plan.md`)
- **Scope handoff / scenarios:** inline scope brief + inline scenarios (§0)
- **Plan Gate:** READY
- **Human approval:** APPROVED

### Confirmed Decisions

- Q1 Tabs on mobile: scroll tabs horizontally (recommended) — §2.3 updated, Select removed from this page.
- Q2 Stats header + Milestones sidebar: drop both on this page (recommended) — P2 objective updated; G8 owns the check that nothing else depended on them.
- Q3 Archived page: keep current card grid untouched (recommended) — no shared-row work; G8 covers regression.
- Q4 Plan Gate approval: APPROVED for list rebuild + global font guardrail, no schema/new-status/sidebar-redesign.

### Assumptions Not Asked

- Updated column defaults to relative `updatedAt` with activity-timestamp fallback — left as P1 bounded discovery (plan §5 P1 item 2), not user-confirmed.
- Create Project → `/dashboard/new`; filter icon = status menu affordance — left as P2 bounded discovery (plan §5 P2), escalates if a new route is needed.

### Action Items

- [x] Flip Plan Gate to APPROVED/READY (done here).
- [ ] Execute P1 (discovery table: Updated field, font-override grep, stats-assertion list), then P2 (header → tabs → rows → states → responsive/a11y) — separate build invocation.

### Applied Changes

- §0 Plan Gate → Human approval REQUIRED→APPROVED with session evidence; status BLOCKED→READY.
- §2 decision 3 → scroll-tabs confirmed, Select removal recorded.
- §5 P2 objective → stats+sidebar drop and archived-keeps-cards recorded.
- This section (§Validation Summary) → PENDING→Validated with decisions, action items, and applied-changes list.
