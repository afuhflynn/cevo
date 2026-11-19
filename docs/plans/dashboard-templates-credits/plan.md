# Dashboard templates + credits pages replication

Plan profile: full — IMPLEMENTED 2026-11-18 (user-approved), no Git requested

## Build Log (PET+PEC — executed 2026-11-18)

- PET discoveries (applied): briefing write site = `app/api/wizard/sessions/[id]/route.ts:79-96` (`suggestTemplateSafe` → `suggestedTemplate`); version lookup = new tiny `GET /api/dashboard/templates/versions/[id]` (reused shared `/api/templates/versions/[id]` rejected: its `isAllowed` only passes the matched or already-used version, not arbitrary gallery templates); institution labels from `Institution.name` via relation ids.
- PET backend: `lib/dashboard-templates.ts` (`listVisibleTemplates` active + latest-published + search/institution filter, `listTemplateInstitutions` with Other count, `getVisibleTemplateVersion` returning null for unpublished/inactive/bogus); session `POST` stores explicit `templateId/templateVersionId` (schema extended additively); `resolveSessionTemplate` prefers the stored version when still valid (gallery reason) else falls back to auto-suggest.
- PET frontend: `/dashboard/templates` (search + dynamic tabs + `TemplateCard` grid + empty state) with presentational `templates-browser.tsx` (`InstitutionTabs`, `TemplateCard`); Basics `?template=` chip + POST field (invalid id degrades to plain flow, never 500); sidebar Templates → direct link.
- PEC: billing page rebuilt (balance hero in **credits**, package grid, kept checkout + ledger + notices); `BillingCheckout` picker restyled into mock cards (icon, FCFA price, ~credits, Choose/Selected buttons, Most Popular pill) with all payment states/logic untouched; submit button + price labels unified to `en-US FCFA`.
- Q5 interpretation recorded: packages select inline in the checkout (same-page, no scroll hack, no `?packageId` remount risk) — strictly better than select+scroll while honoring its intent.
- Fixes during verify: `role="search"` form → `<search>` wrapper; `role="status"` p → `<output>` in new/rewritten surfaces; `inWorkspace` orphan removed; Base UI `Value` falls back to raw id until items register, so pickers use primitive-native `itemToStringLabel`; temp harness (incl. temp route + proxy exception) removed afterwards.
- Evidence: `pnpm typecheck` clean; touched-file `biome check` clean (only pre-existing diagnostics in per-project search route, verified identical on baseline via stash); new unit tests (`search-params.test.ts` +2) green; full `pnpm test` 122/122; live-DB script run verified list/institutions/version-lookup/bogus-null (script deleted after); dev-server render proof at 1280 + 390 for both pages (match mocks; truthful credits hero; select flow exercised; zero page errors); new API route 401s cleanly, both pages guard 307 to sign-in; `git diff --stat prisma/` empty.
- Follow-up change (user-requested, same day): MoMo phone block + Buy button removed from `BillingCheckout` per explicit request; dead payment machinery (state machine, polling, start/retry) stripped, package cards remain selectable. Note: package selection currently leads nowhere — buying from this page is impossible until the Choose buttons are wired to a checkout destination. Open follow-up, not silently resolved.
- User notes 2026-11-19 (future, explicitly NOT built): (a) admin templates page should let admins set a template document format (e.g. PDF/DOCX/…) and add more formats later — needs a schema change (new field on `ProjectTemplate` or `TemplateVersion`), so it forces a replan + migration when taken up; card subtitle `vN · PDF · DOCX` is hardcoded until then and must become data-driven; (b) platform templates should be well-named when admins add them (admin creation via `/admin/templates` already works — no build needed; verified: create + PATCH title/description/institution-links/qualification/active + per-version rules/sections/publish all exist); (c) "APA 7 / Harvard" the user remembered are **citation styles** (`preferredStyle`, `TemplateRule.citationStyle`, landing copy), not template rows — the DB held exactly one template row (`Cevo Platform Default (APA 7)`, verified live 2026-11-18); (d) project-creation template choice already exists twice: the wizard briefing radio list (`wizard-client.tsx` template options, DB-driven) plus the new gallery `?template=` preselect chip — both surface however many templates exist, so adding rows is sufficient, no new selection UI needed.
- Seeded 2026-11-19 per user choice: `Cevo Platform Default (Harvard)` via idempotent `scripts/seed-platform-template-harvard.ts` (same structure/prelims/margins as APA default, `citationStyle: "HARVARD"`; `pnpm db:seed:templates` runs both seeds). Verified live: both templates listed, `otherCount: 2`, version lookup resolves, bogus id → null. MLA deliberately NOT seeded at that point: `citationStyle` was enum-locked to APA_7/HARVARD and the deterministic formatter only rendered those two — an MLA row would have failed review checks.
- MLA slice 2026-11-19 (user: "MLA template is not included"): formatter support added — `CitationStyle += "MLA"`, `formatAuthorsMla`/`inlineBaseMla`, MLA branches in `buildInlineText`/`buildReference`/`computeSuffixGroups`, `normalizeStyle` accepts MLA/MLA9/MLA_9. In-text markers carry no year per handbook; same-author collisions get letter suffixes grouped author-only (user-approved pipeline-consistent variant, documented in code — handbook uses short titles, which this pipeline cannot express). Reference list follows MLA 9th (quoted title, `vol./no./pp.` container, publisher, DOI). Enums extended (`ruleSchema`, `extractPayloadSchema`), citations-route gate list += MLA, idempotent `scripts/seed-platform-template-mla.ts` (double-spaced, title-case headings) + `db:seed:templates` chain, 6 new unit tests. Verified: 128/128 tests, typecheck clean, zero new lint diagnostics (remaining flags verified pre-existing via stash), live list shows all 3 templates. Note: onboarding `preferredStyle` already offered "MLA"/"Harvard" but never flows into `Project.referencingStyle` (always schema default APA_7) — pre-existing gap, out of scope.

## 0. Applicability and Plan Gate

### Plan Gate

- **Branch:** EXEMPT — no `docs/product-roadmap.md`; no `docs/project-config.json` (verified absent 2026-11-18); scope owner is user message 2026-11-18 + two screenshots (Institutional Templates; Credits/Available Packages).
- **Roadmap:** EXEMPT — none exists; follows shipped slices (`docs/plans/dashboard-projects-rebuild/plan.md`, `docs/plans/research-page-replication/plan.md`).
- **Milestone:** EXEMPT — no milestone; builds on: `ProjectTemplate`/`TemplateVersion` models (`prisma/schema.prisma:280-318,373-392`), `matchTemplateForUser` visibility rule (`lib/templates.ts:165-232`: active templates + published versions), billing truth (`lib/billing.ts:18-70,112-145`: packages, `getBalance`, `listActivePackages`), `BillingCheckout` MoMo flow (`components/billing/billing-checkout.tsx:38-182`), `PricingCards` shared cards, `BuyButton` routing (`buildBillingHref`).
- **Scope brief:** inline — (PET) new `/dashboard/templates` page replicating the mock (search, institution tabs, template cards with working Use Template) + sidebar Templates entry; (PEC) rebuild `/dashboard/billing` (Credits) to the mock (balance hero, package cards, kept checkout + ledger) with truthful credits display.
- **Scenarios:** inline — (1) user opens Templates, searches/filters by institution, uses a template and lands in a wizard whose project carries that template version; (2) user opens Credits, sees true credit balance, picks a package, completes MoMo payment via the kept checkout; (3) both pages render at 360/768/1280 in light with no dark flash.
- **Product decisions:** Use Template = `?template=<versionId>` into `/dashboard/new` Basics (locked chip) → session POST → stored on `Project.templateId/templateVersionId` (columns exist, `schema.prisma:376-377`, no migration) → briefing honors explicit choice; balance shows **credits** (mock's "2,500 FCFA" is wrong and must not ship — credits are not FCFA); ledger + billing-down/low-balance notices kept below the fold; package card buttons select + scroll to payment (not `BuyButton` links, keeps one-page flow).
- **Project skeleton:** Next.js App Router + Tailwind v4 OKLCH + shadcn-only; owners: new `app/dashboard/templates/page.tsx` + `components/dashboard/templates-*`, `app/dashboard/billing/page.tsx`, `components/billing/billing-checkout.tsx`, `app/api/wizard/sessions/route.ts:38-80`, `components/wizard/new-wizard-entry.tsx:63-122`, `components/dashboard/app-sidebar.tsx` Templates entry, new `lib/dashboard-templates.ts` (or `lib/templates.ts` addition), `lib/search-params.ts` if new params are added.
- **Commands:** `pnpm dev`, `pnpm lint`, `pnpm typecheck`; NEVER `pnpm build` (ADR-09). Verify: `pnpm test` only if touched suites exist.
- **Evidence plan:** render-vs-mock at 360/768/1280 + tab/search/use-template/buy flows; `pnpm lint` + `pnpm typecheck`; grep proving no per-page font wiring; `git diff --stat prisma/` must stay empty (any migration = replan).
- **Human approval:** APPROVED — user approved all six validation questions 2026-11-18 in-session (dynamic tabs, version+both-formats subtitle, credits-truthful hero, ledger kept, select+scroll buttons, gate approved).
- **Gate status:** READY — implementation unblocked for PET+PEC.

## 1. Outcome and boundaries

**Outcome:** two dashboard pages matching the mocks — Institutional Templates (search + institution tabs + cards with real Use Template) and Credits (balance hero + package cards + kept MoMo checkout) — reusing the template-visibility rules and billing backends, with the global font inherited and no per-page font wiring.

**Governing intent:** user message 2026-11-18 ("dashboard templates page ... alongside the dashboard pricings page") + two screenshots; existing truth preserved (template visibility = active + published-version, `templates.ts:200-260`; billing packages/balance/ledger behavior; `BillingCheckout` phone + poll + success states).

**In scope:**
- Templates list backend: user-visible templates (active + latest published version + institution/faculty names for tabs), search + institution filter, card payload (title, version, export formats).
- `?template=<versionId>` plumbing: Basics locked chip + session POST + route stores on Project + briefing honors explicit choice over suggestion (bounded discovery for the briefing write site).
- Credits rebuild: balance hero (credits, truthful), package cards (select + scroll to payment), kept checkout + ledger + notices, restyled to mock.
- Sidebar: Templates ProjectGroup → direct link to `/dashboard/templates` (mirrors Research decision).
- Responsive + a11y + skeletons/empty/error for both pages.

**Non-goals (by decision):**
- No schema migration — reason: `Project.templateId/templateVersionId`, `ProjectTemplate.institutionId` and relations already exist; grouping is a query.
- No new providers, no pricing/billing logic change — reason: visual + wiring slice; MoMo flow untouched.
- No sidebar Upgrade card — reason: shell-level change affecting all pages; separate slice if wanted (same rule as projects slice).
- No citation/export changes — reason: untouched surfaces.
- No dark-theme work — reason: light default stands.

**Compatibility/rollback:** additive pages + small edits to session route/entry/sidebar/billing page; rollback = revert range. Workspace/research/projects flows keep working (session route change is additive-optional-field).

**Not yet specified:** None — the whole route is visible. Open choices are precise decisions in §2, not fog.

## 2. Important technical decisions

1. **Use Template = explicit version through the existing session.** Choice: card links `/dashboard/new?template=<versionId>`; Basics reads it (lookup for title), shows a locked "Starting from: {title}" chip, includes `templateVersionId` in the session POST (schema already allows it, `wizard-validation.ts:44`); session route stores `templateVersionId` (+ derived `templateId`) on the Project; briefing honors an explicitly stored version instead of re-suggesting. Alternative: link plain to `/dashboard/new` and rely on auto-suggestion. Sacrifice: touches session route + entry + briefing write site (3 small edits). Reversibility: easy. Owners: `new-wizard-entry.tsx:63-122`, `sessions/route.ts:38-80`, briefing write site (P-discovery).
2. **Visible templates = active + published.** Choice: reuse `matchTemplateForUser`'s rule (active templates, latest published version) for the list query; institution tabs derived from data (All + top institutions by count + Other for null). Alternative: list all active regardless of published version. Sacrifice: unpublished-only templates hidden (correct — unusable). Owner: new list query.
3. **Card subtitle = version + honest export formats.** Choice: `v{N} · PDF · DOCX` (every template exports both; model stores no per-template file format — mock's per-card single format is not data). Alternative: copy mock literally per card. Sacrifice: tiny deviation from mock. Owner: card component.
4. **Balance shows credits, never FCFA.** Choice: hero reads "Your Balance / {N} credits" (+ Buy Credits button scrolling to packages/checkout); packages keep `1,000 FCFA`-style price + `~ credits` lines. Alternative: mock-literal "2,500 FCFA" balance. Sacrifice: deliberate mock deviation — credits ≠ currency, showing FCFA would be false. Owner: billing page hero.
5. **Checkout + ledger stay, restyled below packages.** Choice: package cards select + scroll to a kept payment panel (phone + states, `BillingCheckout` reused or restyled in place); ledger kept as "Payment history"; low-balance/billing-down notices kept. Alternative: mock-literal (cards only, no checkout/ledger on page). Sacrifice: longer page than mock. Owner: `billing/page.tsx`, `billing-checkout.tsx`.
6. **Server-side search/filter for templates.** Choice: nuqs `search` + `institution` params reusing the catalog pattern (shareable URLs, consistent with projects/research). Alternative: client-side filter. Sacrifice: small loader work. Owner: page loader + `lib/search-params.ts` (only if a new param shape is needed).

## 3. Areas and owners to touch

- Templates: new `app/dashboard/templates/page.tsx`, `components/dashboard/templates-browser.tsx` (+ cards), new list query (`lib/dashboard-templates.ts` or `lib/templates.ts` addition), version-title lookup for the Basics chip (tiny GET or shared fn), `app/api/wizard/sessions/route.ts` (store version), `new-wizard-entry.tsx` (?template chip + POST field), briefing write site (honor explicit — discovery), sidebar Templates entry.
- Credits: `app/dashboard/billing/page.tsx` (hero + cards + checkout + ledger restyle), `billing-checkout.tsx` (reuse; restyle only if mock demands), `PricingCards` NOT reused here (landing marketing cards ≠ dashboard flow; dashboard keeps select-and-pay).
- Unchanged by default: provider/search/save flows, exports, admin templates, pricing page, shell topbar.
- Tests/specs/docs: new unit tests for tab/institution grouping + version-label helpers if logic-bearing; `lib/billing.test.ts`-style suites if touched; no new e2e; plan Build Log records evidence.

## 4. Quality Gates & Concerns Checklist

| # | Gate / concern | Applies? (YES/NO + one-line why) | How it will be verified | Evidence expected (command, test name, report path, file:line) | Owner phase |
|---|---|---|---|---|---|
| G1 | Templates page matches mock (search, tabs, cards, Use Template) | YES — core deliverable PET | Side-by-side mock-vs-render at 1280 + 768 + 360 | Render notes + new template files diff | PET |
| G2 | Credits page matches mock (balance hero, packages, Most Popular) with truthful units | YES — core deliverable PEC | Side-by-side + unit check (credits shown as credits) | Render notes + billing diff | PEC |
| G3 | Use Template works end-to-end (card → Basics chip → session → project carries version → briefing honors) | YES — the feature behind the button | Click Use Template on 2 templates; verify Project row version + briefing preselect | Action log; session route + entry lines | PET |
| G4 | Buy flow intact (select package → phone → start → poll → success; 422/429/error copies; ledger records) | YES — money path restyled | Exercise checkout on the rebuilt page (test package or mocked provider per existing test practice); ledger entry appears | Action log; existing billing tests | PEC |
| G5 | List truthfulness (only usable templates; tabs partition the set; All = unfiltered; counts honest) | YES — new list query + tabs | Compare page vs direct query counts; each tab filters; unpublished excluded | Count reconciliation log; unit tests | PET |
| G6 | No regression (workspace/research/projects/new-wizard flows, briefing suggestion when NO explicit template) | YES — session route + entry touched | New project without ?template still suggests as today; full `pnpm test` | Regression log; suite result | PET |
| G7 | Single global font/theme, zero per-page font wiring | YES — standing requirement | Grep `font-family`/`font-(sans\|serif\|mono)` on new/edited dashboard files + visual spot | Grep log clean of family wiring | PET/PEC |
| G8 | Responsive, no overflow (3-col cards → stack; tabs scroll) | YES — two card grids + tab strips | 360/768/1280 pass | Viewport notes | PET/PEC |
| G9 | Accessibility (tabs semantics, card action names, form labels, live regions, focus) | YES — new controls + kept form | Keyboard-only: tabs, Use Template, package select, phone form, checkout states | A11y notes | PET/PEC |
| G10 | Empty/error/loading states (no templates, no matches, billing-down, empty packages) | YES — new/changed surfaces | Force each: empty catalog, filter-to-zero, packages 503 path, skeleton | State notes | PET/PEC |
| G11 | Static review of plan + change | YES — user-facing + money-adjacent change | One self-check on plan; one static pass on change before verify | `## Self-Review` + change notes | PET/PEC |
| G12 | Spec/doc sync | YES if a template/billing spec owns these surfaces, else plan log only | Update only owned verify notes | Spec diff or Build Log | PET/PEC |
| G13 | Security/authz (own projects only for picker/save; billing session scoping unchanged; no cross-user template leak — templates are platform/institutional) | YES — new user-facing queries + session write | Unauthed page → sign-in; picker/save use own data; session route validates version id exists + published | Authz review notes + route lines | PET |
| G14 | Data integrity/migration | NO by default — query + optional-field writes only | N/A (any migration triggers replan) | `git diff --stat prisma/` empty | — |
| G15 | AI-feature gate | NO — no model/prompt/tool change | N/A | No `lib/assistant*` diff | — |
| G16 | Maintainability (one owner per rule, tokens only, no one-off hex) | YES — two new surfaces | Tab/grouping + card + checkout in named components; token-only diff | Component paths | PET/PEC |

### Open concerns and risks

- Briefing write site (G3) → settled by PET bounded discovery: locate where the suggested template lands on the Project/briefing and add explicit-choice precedence; stop = write site named + precedence rule recorded.
- Basics version-title lookup (G3) → settled by PET discovery: new tiny GET vs shared fn; stop = lookup path recorded; invalid/unknown version id → chip hidden, plain flow (never 500).
- Ledger keep vs drop (G2) → user decision Q4.
- Balance units (G2) → plan decides credits-truthful; user confirms the mock deviation in Q3 (no silent change).
- Package button behavior (G4) → user decision Q5 (select+scroll recommended).
- Card subtitle format (G1) → user decision Q2 (version + both formats recommended).

## 5. Execution phases

### PET — Templates page + Use-Template plumbing (SEQ predecessor for PEC? No — independent; SEQ for single-executor focus)

- **Objective and boundary:** ship `/dashboard/templates` (search + institution tabs + cards) with working Use Template into the wizard; sidebar Templates → direct link. Non-goals in §1 hold.
- **Decisions fixed:** §2 choices 1–3, 6 as approved (explicit version plumbing, active+published rule, honest subtitle, nuqs search/filter).
- **Areas/owners:** new page/components/query, session route, Basics entry, briefing write site, sidebar.
- **Discovery before edit (bounded, stop conditions):**
  1. Briefing write site: find where suggestion becomes the project's template (briefing approval / project update path). Stop: file:line recorded + explicit-choice precedence rule stated.
  2. Version lookup: decide tiny GET vs shared fn for `?template=` title + validity. Stop: path recorded; invalid id → plain flow (no error page).
  3. Institution labels: confirm `Institution.name` availability for tab labels + counts query shape. Stop: label source recorded.
- **Implementation output:** templates page + working template→wizard path + sidebar link; invalid template param degrades to plain new-project flow.
- **Acceptance/quality gate:** G1, G3, G5–G7, G9–G11, G13, G16 evidenced (render/action/keyboard/click logs, unit tests, lint + typecheck). Gates: G1, G3, G5, G6, G7, G9, G10, G11, G13, G16.
- **Dependency metadata:** SEQ — shares research-phase writers; PEC is file-independent but runs after for focus (no PAR inference).

### PEC — Credits page rebuild (SEQ after PET)

- **Objective and boundary:** rebuild `/dashboard/billing` to the mock (balance hero in credits, package cards with Most Popular, kept checkout + ledger below, notices kept). Non-goals in §1 hold.
- **Decisions fixed:** §2 choices 4–5 as approved (credits-truthful hero, kept checkout/ledger).
- **Areas/owners:** `app/dashboard/billing/page.tsx`, `billing-checkout.tsx` (restyle-touch only), no lib/billing changes expected.
- **Discovery before edit (bounded, stop condition):** confirm package → checkout handoff (card button sets `?packageId=` + scrolls vs client-state select; stop = handoff recorded; `BillingCheckout.initialPackageId` already supports the param).
- **Implementation output:** mock-faithful credits page with a working end-to-end buy flow and history.
- **Acceptance/quality gate:** G2, G4, G7–G12, G16 evidenced (render/action/keyboard logs, suite run, lint + typecheck). Gates: G2, G4, G7, G8, G9, G10, G11, G12, G16.
- **Dependency metadata:** SEQ — follows PET; no shared files, order is focus-only.

Inline steps: (1) PET discoveries, record; (2) apply validation answers; (3) PET list + page + plumbing + sidebar; (4) PEC hero + cards + checkout + ledger; (5) static pass; (6) verify (§6). Rollback: revert range (additive + small additive-optional edits).

## 6. Final verification order

1. `pnpm lint` then `pnpm typecheck` — must be clean (touched-file flags vs baseline).
2. Unit: new grouping/label tests green (naming the failing-test obligation, no fabricated IDs).
3. Render sweep: both pages vs mocks at 360/768/1280 in light + forced-OS-dark reload — notes recorded.
4. Templates behavior: search + each tab + All restore; Use Template ×2 → Basics chip → session → project carries version → briefing honors; invalid `?template=` → plain flow, no 500.
5. Credits behavior: hero shows true credits; card select → checkout; phone validation copy; start/poll/success path; ledger entry; low-balance + billing-down notices intact.
6. Regression: new project without template (suggestion as today); workspace/research/projects untouched; full `pnpm test`.
7. Keyboard + states: tabs/card buttons/package select/phone form runs; empty/error/skeleton each forced once.
8. Authz spot: signed-out pages → sign-in; user B cannot drive user A's picker/save.
9. One static review pass; fix validated findings; rerun only invalidated checks.
10. Docs: Build Log here; spec notes only where owned; confirm `git diff --stat prisma/` empty and no new `public/` rasters.

## 7. Risks and execution concerns

- Briefing precedence bug (suggestion overwrites explicit choice) → mitigated by PET discovery 1 + G3 end-to-end proof on 2 templates.
- Invalid `?template=` id → mitigated by validity lookup + plain-flow fallback; failing check: no 500, no chip.
- Credits-as-FCFA temptation → mitigated by decision 4 + G2 unit check; failing test: hero text shows "credits", never "FCFA" for balance.
- Checkout breakage during restyle → mitigated by reusing `BillingCheckout` states untouched + G4 full-path exercise.
- Unpublished-template leak → mitigated by active+published rule + G5 count reconciliation.
- Scope creep (insert-flow, shell Upgrade card, new providers) → explicitly non-goal; forces replan.
- 10× concern: template list stays server-paginated/filtered; summary-free page; next plausible change = template detail view — edit sites: new route + card link only.
- Protected-rule tests that must fail if broken: unpublished template visible (G5), balance labeled FCFA (G2), explicit template ignored (G3) — named obligations, no fabricated IDs.

## 8. Execution waves

Sequential — PET then PEC; different files but single-executor focus, no PAR.

## Self-Review

Self-review: DONE (single reviewer-style pass by plan author, review-only, no edits to other files).

- Finding 1 (MEDIUM): first draft let Use Template be a plain link relying on auto-suggestion — fixed: explicit version plumbing (§2.1) with bounded briefing discovery + G3 end-to-end proof.
- Finding 2 (MEDIUM): balance units were assumed from the mock — fixed: decision 4 makes credits-truthful explicit + Q3 asks the user to confirm the deviation.
- Finding 3 (LOW): ledger fate was implied — fixed: explicit Q4 (keep restyled below vs drop).
- Open: Q1–Q6 answers pending — carried to Validation Summary, not decided by assumption.

## Validation Summary
**Validated:** 2026-11-18
**Questions asked:** 6 in 2 rounds

### Applicability

- **Branch:** EXEMPT
- **Owning artifact / roadmap:** NOT APPLICABLE — EXEMPT (no `docs/product-roadmap.md`, no `docs/project-config.json`; owner is user message 2026-11-18 + two design screenshots)
- **Slice / technical outcome:** dashboard templates + credits replication (`docs/plans/dashboard-templates-credits/plan.md`)
- **Scope handoff / scenarios:** inline scope brief + inline scenarios (§0)
- **Plan Gate:** READY
- **Human approval:** APPROVED

### Confirmed Decisions

- Q1 Template tabs: dynamic — All + top institutions by template count + Other (recommended).
- Q2 Card subtitle: version + both export formats, e.g. "v1 · PDF · DOCX" (recommended).
- Q3 Balance units: hero shows true credit balance, never FCFA (recommended) — the one deliberate mock deviation.
- Q4 Ledger: keep restyled "Payment history" + notices below checkout (recommended).
- Q5 Package buttons: select package + scroll to payment form (recommended).
- Q6 Plan Gate approval: APPROVED for templates page + plumbing + credits rebuild; no migration/billing-logic/shell-card.

### Assumptions Not Asked

- Basics version-title lookup: tiny GET vs shared fn — left to PET bounded discovery (invalid id → plain flow, no 500).
- Briefing explicit-choice precedence: write site + rule left to PET bounded discovery.
- Package → checkout handoff detail (`?packageId=` + scroll vs client-state select) — left to PEC bounded discovery (`BillingCheckout.initialPackageId` already supports the param).

### Action Items

- [x] Flip Plan Gate to APPROVED/READY (done here).
- [ ] Execute PET (discoveries, list query, page, plumbing, sidebar), then PEC (hero, cards, checkout, ledger) — separate build invocation.

### Applied Changes

- §0 Plan Gate → Human approval REQUIRED→APPROVED with session evidence; status BLOCKED→READY.
- §2 decisions → Q1–Q5 outcomes recorded as the confirmed path (dynamic tabs, honest subtitle, credits hero, kept ledger, select+scroll).
- This section (§Validation Summary) → PENDING→Validated with decisions, action items, and applied-changes list.
