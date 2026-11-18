# Landing hero + navbar first, light-mode default

Plan profile: light — XS/S

## 0. Applicability and Plan Gate

### Plan Gate

- **Branch:** EXEMPT
- **Roadmap:** EXEMPT — no `docs/product-roadmap.md` in repo (verified 2026-11-17); living scope is `docs/scope/scope.md` rows 17 (Public Website) and 25 (Public Site Polish).
- **Milestone:** EXEMPT — no milestone; slice owner is scope rows 17/25 plus spec `docs/specs/0022-public-site-polish/index.md`.
- **Scope brief:** inline — rework landing hero + navbar (+ closely-attached “other things”: proof/preview strip, trust row, mobile menu) per user-supplied design screenshots 2026-11-17; set platform default to light-only for now.
- **Scenarios:** inline — (1) visitor lands, reads new headline + subcopy + two CTAs in seconds; (2) nav (Features/Templates/Pricing/FAQ/Contact/Get started) routes with no dead-ends on desktop + mobile; (3) platform renders light regardless of OS theme, with no dark flash.
- **Product decisions:** headline/subcopy/nav labels come from user images (settled by user); locked `0022` copy strings elsewhere stay untouched; no pricing/legal/auth-logic change.
- **Project skeleton:** Next.js 16.4 App Router + Tailwind v4 OKLCH + shadcn-only (`package.json`, `docs/DECISIONS.md` ADR-002/ADR-003); owners: `app/page.tsx`, `components/public/public-header.tsx`, `app/layout.tsx`, `components/providers.tsx`, `components/theme-toggle.tsx`, `components/public/proof-mock.tsx`.
- **Commands:** `pnpm dev`, `pnpm lint`, `pnpm typecheck`; NEVER `pnpm build` (ADR-009). Verify: `pnpm test` only if touched suites exist.
- **Evidence plan:** route render at 360/768/1024 in light + forced-dark-OS check; `pnpm lint` + `pnpm typecheck`; link crawl of new nav; no fabricated `file:line` for future assertions.
- **Human approval:** APPROVED — user replied "plan approved" 2026-11-17 in-session; recommendations adopted (Q1 map-to-existing/anchors, Q2 hide-toggle + default light), correctable on next message.
- **Gate status:** READY — implementation unblocked for P1 only (hero + navbar + preview strip + light default; no new pages, no logic change).

## 1. Outcome and boundaries

**Outcome:** landing opens with the user’s hero (headline “Your academic project, from idea to final report.” with accent on “idea” / “final report.”, subcopy, Get started + See how it works, illustration + “Smarter. Easier. Academic.” badge) under a navbar (Cevo logo, Features Templates Pricing FAQ Contact, Get started), followed by a light product-preview strip; whole platform defaults to light with no dark flash.

**Governing intent:** user message 2026-11-17 + design screenshots (hero/navbar/illustration/workspace preview); existing truth preserved from `docs/specs/0022-public-site-polish/index.md` (static public, honest mocks, AC-1/AC-2/AC-4/AC-6/AC-7) and `docs/INFORMATION_ARCHITECTURE.md` route map.

**In scope:**
- `components/public/public-header.tsx:1-86` — new link set, CTA, mobile menu, light-only treatment.
- `app/page.tsx:85-144` — hero + proof/preview strip restyle to design; headline/subcopy/CTAs; illustration + badge (CSS/SVG recreation, no screenshot assets in prod).
- Platform light default: `components/providers.tsx:9-14` (`defaultTheme="system"` + `enableSystem` today), `app/layout.tsx:59-62` (`suppressHydrationWarning`, theme class), `components/theme-toggle.tsx:14-48` usage.
- SEO/metadata touch only if headline/description must match new hero (`app/page.tsx:27-32`).
- Responsive + a11y for hero/nav at 360/768/1024.

**Non-goals (by decision):**
- No new routes for Features/Templates/FAQ/Contact in this run — reason: S-sized first slice; nav must not 404 so targets map to existing routes/anchors (decision Q1).
- No production use of the supplied screenshots as image assets — reason: screenshots are reference, not web assets (weight, sharpness, honesty rule in `proof-mock.tsx:10-14`).
- No dark-theme redesign — reason: user asked light-only for now; dark tokens stay intact, toggle hidden/disabled (reversible).
- No pricing/auth/billing logic change — reason: visual slice only.

**Compatibility/rollback:** pure frontend; rollback = revert commit range. No migration; `git diff --stat prisma/` must stay empty.

**Not yet specified:** None — the whole route is visible. Open choices are precise decisions in §2, not fog.

## 2. Important technical decisions

1. **Nav targets without 404s.** Choice: map Features/Templates/FAQ/Contact to existing routes or landing anchors this run (exact map = discovery, §5). Alternative: build the four pages now. Sacrifice: nav promises pages that don’t exist yet. Reversibility: easy (link swap). Owner: `components/public/public-header.tsx:9-13`, `app/sitemap.ts`.
2. **Light-only mechanism.** Choice: `defaultTheme="light"`, `enableSystem={false}`, hide `ThemeToggle` on public header (keep component, keep `.dark` tokens in `app/globals.css` intact). Alternative: `forcedTheme="light"` app-wide. Sacrifice: dark users get light until re-enabled (as requested). Reversibility: easy (one-prop revert). Owner: `components/providers.tsx:9-14`, `components/public/public-header.tsx:40,43`, `app/layout.tsx:59-62`.
3. **Illustration as code, not screenshots.** Choice: recreate docs + graduation-cap + badge composition with CSS/SVG using existing primary/accent tokens (badge pill white, green check via lucide). Alternative: ship user screenshots as `public/` assets. Sacrifice: custom SVG time. Reversibility: easy. Owner: new small component under `components/public/` (e.g. `hero-illustration.tsx`) + `proof-mock.tsx` restyle. Honors shadcn-only + honest-mock rule (`proof-mock.tsx:10-14`).
4. **Preview strip: restyle, don’t screenshot.** Choice: restyle existing `ProofBand`/`WorkspaceMock` cards to the new light card language (workspace outline, chapters, citation chip, export badges) instead of embedding the workspace screenshot. Alternative: embed supplied workspace screenshot. Sacrifice: less literal fidelity. Reversibility: easy. Owner: `components/public/proof-mock.tsx:15-141`.
5. **Accent color discipline.** Choice: reuse existing `--primary` OKLCH for headline accents/CTAs unless contrast fails; no new palette. Alternative: hardcode the screenshot royal-blue. Sacrifice: slight hue difference vs mock. Reversibility: easy (token edit). Owner: `app/globals.css`, `app/page.tsx:101-106`.

## 3. Areas and owners to touch

- Hero/nav/preview: `app/page.tsx:85-144`, `components/public/public-header.tsx:15-86`, `components/public/proof-mock.tsx:15-141`, new `components/public/hero-illustration.tsx` (bounded addition), `components/ui/button.tsx` + `badge.tsx` (reuse only, no new primitives).
- Theme: `components/providers.tsx:7-18`, `components/theme-toggle.tsx:14-48`, `app/layout.tsx:54-71`, `app/globals.css` `:root`/`.dark` tokens (read-only except accent check).
- Tests/specs/docs: `docs/specs/0022-public-site-polish/index.md` (verify section update only if AC wording changes), `e2e/` smoke where hero/nav covered, `app/sitemap.ts` if nav map adds anchors. No schema/mirror changes.
- Consumers: `app/pricing/page.tsx` (Buy/Get-started routing must keep working), `components/public/public-footer.tsx` (link consistency).

## 4. Quality Gates & Concerns Checklist

| # | Gate / concern | Applies? (YES/NO + one-line why) | How it will be verified | Evidence expected (command, test name, report path, file:line) | Owner phase |
|---|---|---|---|---|---|
| G1 | Hero matches approved design (copy, CTAs, accent, badge, illustration) | YES — core deliverable | Side-by-side design-vs-render check, light @360/768/1024 | Review note under `## Self-Review` in plan + screenshot tmp (not shipped) | P1 |
| G2 | Nav has zero dead-ends (desktop + mobile menu) | YES — 4 of 6 labels lack routes today | Link crawl of header desktop + mobile incl. `packageId/next` preservation | `pnpm lint` + crawl log; `components/public/public-header.tsx` link map | P1 |
| G3 | Light-only holds with OS dark + no flash | YES — explicit user requirement | Forced-dark-OS render + reload check; no `dark` class on `<html>` | Dev verification notes + `components/providers.tsx` diff | P1 |
| G4 | Responsive, no overflow (hero grid → stack) | YES — two-column hero + preview strip | 360/768/1024 pass | Viewport notes; `app/page.tsx` diff | P1 |
| G5 | Accessibility (headings, focus, contrast, menu `aria-expanded`) | YES — nav/menu/CTA surface changes | Keyboard-only run + contrast spot on accent + menu state check | Axe/contrast notes; `public-header.tsx:44-54` states intact | P1 |
| G6 | Perf (no screenshot assets, fonts unchanged, LCP) | YES — illustration approach affects weight | Bundle/asset check: no new raster in `public/`; fonts `display:swap` intact | `git status public/` clean of rasters; `app/layout.tsx:7-24` unchanged | P1 |
| G7 | Copy truth (new hero copy exact; old locked strings elsewhere intact) | YES — public copy changes | Diff of hero strings vs user design; `0022` locked-copy spot check | `app/page.tsx` diff + `docs/specs/0022:97-110` unchanged elsewhere | P1 |
| G8 | No logic regression (pricing/Buy/auth links) | YES — header/hero CTAs touch funnel | Click-through `/` → `/sign-up`, `/pricing` Buy path | Dev click log | P1 |
| G9 | Static review of plan + change | YES — user-facing change | One `why-review`-style self-check on plan; one static pass on change before verify | `## Self-Review` entry; review notes | P1/P2 |
| G10 | Spec/doc sync (0022 verify, scope rows 17/25) | YES — landing truth changes | Update verify notes only where AC rendering changed | `docs/specs/0022-public-site-polish/verify.md` diff (if exists) | P2 |
| G11 | Security/authz | NO — no guard, session, or data change | N/A (diff shows no `lib/auth*`, `proxy.ts` change) | `git diff --stat` | — |
| G12 | Data integrity/migration | NO — no schema change | N/A | `git diff --stat prisma/` empty | — |
| G13 | AI-feature gate | NO — no model/prompt/tool change | N/A | No `lib/assistant*`, `lib/review*` diff | — |
| G14 | Maintainability (one owner per rule, no one-off styles) | YES — new illustration component risk | Illustration lives in one component, tokens only | `components/public/hero-illustration.tsx` + token-only diff | P1 |

### Open concerns and risks

- G2 target map unknown until route discovery runs → settled by bounded discovery (§5: implemented-routes vs IA map) + user decision Q1.
- G3 mechanism (hide toggle vs force light app-wide) → user decision Q2; default recommendation: hide on public header + `defaultTheme="light"` + `enableSystem={false}`.
- Screenshot-as-asset temptation → settled by decision 3; reviewer checks `git status public/`.

## 5. Execution phases

### P1 — Hero + navbar + light default (SEQ, only phase)

- **Objective/boundary:** ship the user’s hero/nav/preview-strip in light per screenshots; platform defaults to light. Includes mobile menu, badge, illustration-as-code, responsive + a11y. Non-goals in §1 hold.
- **Decisions fixed:** §2 choices 1–5 as approved in Validation Summary (defaults apply only after user confirms Q1/Q2).
- **Areas/owners:** files listed in §3.
- **Discovery before edit (bounded, stop conditions):**
  1. Route map: list implemented routes (`app/**/page.tsx`) vs IA ideal for Features/Templates/FAQ/Contact; propose existing-route/anchor map. Stop: table recorded; any new-page need escalates instead of building.
  2. Theme call sites: grep `ThemeToggle` + `useTheme` usages to size hide-vs-force. Stop: call-site list recorded (`components/public/public-header.tsx:40,43` known; others enumerated).
  3. Accent contrast: check screenshot-blue vs `--primary` on white at body/large sizes. Stop: keep-`--primary` or token-tweak decision with ratio noted.
- **Implementation output:** reworked header/hero/preview-strip in light; light default with no flash; nav with no dead-ends; no raster assets added.
- **Acceptance/quality gate:** G1–G9 + G14 evidenced (render notes, crawl log, dark-OS check, keyboard/contrast, click-through, `pnpm lint`, `pnpm typecheck`).
- **Dependency metadata:** SEQ — single phase, no parallelism.

Inline steps: (1) run 3 discoveries, record; (2) apply Q1/Q2 answers; (3) edit header → hero → illustration → preview strip → theme default; (4) self static pass; (5) verify (§6). Rollback: revert commit range; dark restore = revert `providers.tsx` + unhide toggle.

## 6. Final verification order

1. `pnpm lint` then `pnpm typecheck` — must be clean.
2. Render sweep: light @360/768/1024 + forced-OS-dark reload (no dark flash, no overflow) — notes recorded.
3. Nav crawl (desktop + mobile menu incl. sign-in/sign-up/pricing links) + CTA click-through (`/` → `/sign-up`, `/pricing` Buy path intact).
4. Keyboard-only + contrast spot (accent text, menu `aria-expanded`, focus visibility).
5. One static review pass of the change; fix validated findings; rerun only invalidated checks.
6. Docs: update `docs/specs/0022` verify notes + `docs/scope/scope.md` rows 17/25 only where rendering truth changed; confirm `git diff --stat prisma/` empty and no new `public/` rasters.

## 7. Risks and execution concerns

- Nav labels without pages (Features/Templates/FAQ/Contact) ship as dead links → mitigated by Q1 map; what forces replan: user wants all four pages built now (that is a separate M-slice, not this S-plan).
- Screenshot-as-asset regression (weight/honesty) → mitigated by decision 3 + `git status public/` check.
- Dark-token damage while hiding toggle → mitigated by keeping `.dark` block untouched; revert is one prop + unhide.
- Accent-contrast failure on white → mitigated by discovery 3; failing test: contrast spot on headline accent + primary CTA.
- 10× concern: none material (static hero/nav, no lists); next plausible change = building the four nav pages + French copy — edit sites: `app/(…)` new routes + `public-header.tsx` link map only.
- Protected-rule test that must fail if broken: forced-dark-OS render showing light (G3) and nav crawl with zero 404s (G2) — named as verification obligations, no fabricated test IDs.

## 8. Execution waves

Sequential — single phase, shared header/hero/theme writers. No PAR.

## Self-Review

Self-review: DONE (single why-review-style pass by plan author, review-only, no phase files exist yet).
- Report path: inline (no separate report file for XS/S).
- Finding 1 (MEDIUM): nav-target map was assumed solvable in discovery without a user decision — fixed: added Q1 as blocking decision + stop/escalation rule in P1 discovery.
- Finding 2 (MEDIUM): “light mode only” was ambiguous (default vs forced, toggle fate) — fixed: decision 2 with hide-toggle + `enableSystem={false}` recommendation + Q2 blocking.
- Finding 3 (LOW): illustration could drift into screenshot-asset shortcut — fixed: decision 3 + `git status public/` evidence in G6.
- Open: Q1/Q2 answers pending — carried to Validation Summary, not decided by assumption.

## Validation Summary

**Validated:** 2026-11-17
**Questions asked:** 0 tool rounds (user dismissed the prior tool-question round; decisions taken in plain text instead). Plan approved by user reply "plan approved".

### Confirmed Decisions

- Q1 Nav targets: map Features / Templates / FAQ / Contact to existing routes or landing anchors this run; build the four pages as a later slice — user approved plan carrying this recommendation.
- Q2 Light-only mechanism: hide ThemeToggle on public header + `defaultTheme="light"` + `enableSystem={false}`; `.dark` tokens kept intact for later re-enable — user approved plan carrying this recommendation.
- Plan Gate approval: APPROVED for P1 scope (hero + navbar + preview strip + light default; no new pages, no logic change).

### Assumptions Not Asked

- None left open — Q1/Q2 defaults adopted via approval; correctable by reply.

### Action Items

- [x] Flip Plan Gate to APPROVED/READY (done here).
- [ ] Execute P1 (separate build invocation): route-map discovery table, accent-contrast check, theme call-site grep, then header → hero → illustration → preview strip → theme default.

### Applied Changes

- §0 Plan Gate → Human approval REQUIRED→APPROVED with session evidence; status BLOCKED→READY, scoped to P1.
- §2 decisions 1–2 → defaults confirmed as the approved path (map-to-existing/anchors; hide-toggle + default light).
- This section (§Validation Summary) → PENDING→Validated with decisions, action items, and applied-changes list.

## Build Log (P1 — executed 2026-11-17)

- Nav: `components/public/public-header.tsx` rewritten to Features→`/#features`, Templates→`/#templates` (template card anchor), Pricing→`/pricing`, FAQ→`/#faq` (new compact section), Contact→`/#contact` (footer), Sign in (ghost) + Get started; ThemeToggle removed from public header (kept in `(auth)/layout.tsx` — flagged, not removed).
- Theme: `components/providers.tsx` → `defaultTheme="light"`, `enableSystem={false}`; `.dark` tokens untouched for later re-enable.
- Hero: `app/page.tsx` two-column hero with approved headline/accents, subcopy, Get started + See how it works (`/#how-it-works`); new `components/public/hero-illustration.tsx` (token-only docs + SVG cap + badge pill, static v1 — motion deferred).
- Preview: `components/public/proof-mock.tsx` → browser-framed app-window preview (rail/outline/editor/assistant), `TrustStats` unchanged; no raster assets added.
- Anchors: `id`s on how-it-works, features, templates card, faq; compact FAQ (5 items, established truths only).
- Evidence: `pnpm typecheck` clean; `biome check` on touched files clean except pre-existing `useSemanticElements` on the untouched stale-notice line (verified present on baseline); full-repo `pnpm lint` failures pre-exist on baseline and are out of scope.
- Refinement pass (same day, from screenshot review): 3-zone navbar (logo left / links center / Get started right, Sign in kept in mobile menu + footer + CTA); hero H1 up to `text-5xl→6xl→4.25rem` with tighter leading; hero CTAs to `h-12 rounded-xl` with filled blue play triangle; proof heading + subcopy removed so the workspace preview follows the hero directly; illustration rebuilt with stronger blue glow shadows, rounder cards, larger cap, prominent pedestal cube, and overlapping badge pill.
- Follow-up: trust badge pill ("Smarter. Easier. Academic.") removed from the hero illustration entirely per user request.
- Slice 2 (same day): post-hero bands rebuilt to the approved mock — "Why Choose Cevo?" (eyebrow + H2 + copy + Explore features → `/#templates`, 6 icon items), "How It Works" (eyebrow + H2 + side note, 4 numbered steps with connector arrows, step 4 green check), "Templates & Research" (eyebrow + H2 + copy + Browse templates → `/sign-up`, docs visual + APA 7/Harvard/IEEE card + provider card with official OpenAlex/Crossref/Semantic Scholar marks in `public/brands/` fetched via Firecrawl from official sources, unmodified). Old 3-step/cards sections removed; `#templates` anchor now on the band. Evidence: `pnpm typecheck` clean; touched-file lint clean except the pre-existing stale-notice flag.
- Refinement: TrustStats band (APA 7 + Harvard / XAF via MoMo / PDF + DOCX cards) removed from the landing; How It Works stripped to a clean timeline — numbers, arrow separators, and side note removed; white `bg-card` icon discs (`size-14`, border + `shadow-md`) sit on a horizontal connector line; emerald final-step disc kept.
- Fix: brand logos 307 — `proxy.ts` treated `/brands/*` as protected, so the image optimizer's internal fetch got a 307 to `/sign-in`. Added `/brands` to `PUBLIC_PREFIXES`. Verified on a dev server (port 3107, since stopped): direct PNG/SVG → 200, `/_next/image` optimized URL → 200, landing `/` → 200.
- Slice 3: pricing rebuilt to the mock — centered "Simple, flexible pricing" heading + subcopy; cards with name, `1,000 FCFA`-style price (en-US grouping + FCFA to match design), `~ credits` line, tier tagline, 3 green-check features, full-width blue "Get Started". Tier copy mapped by sort position; popular = DB `isPopular` else middle card with "Most Popular" pill. `BuyButton` gained optional `label`/`buttonClassName` (routing unchanged: signup→billing with `packageId`); the "Get Started" label deviates from spec 0022's Buy-label lock — user-approved design overrides. Shared by landing teaser and `/pricing` page. Evidence: `pnpm typecheck` clean; touched-file lint clean except pre-existing `role="status"` patterns.
- Data: seeded all three seeds — billing packages (Starter 1000 XAF→50 cr, Standard 2500→150 popular, Pro 5000→350), Cameroonian institutions, platform default template. Landing verified on dev server (port 3107, since stopped): HTML contains Starter/Standard/Pro cards + "Most Popular", empty state gone. Note: DB names/credits (Standard, Pro, 50/150/350) differ from the mock's Research/Project + ~1,000/2,500/5,000 — cards render DB truth per spec invariant; renaming/repricing is an admin-billing action, not taken.
- Alignment (user: "proceed"): `lib/billing.ts` seed defaults now Starter/Research/Project at 1000/2500/5000 credits (Research popular); existing rows aligned via `scripts/align-billing-packages.ts` (matched by sortOrder, rerunnable). Re-verified on dev server: Starter/Research/Project + ~1,000/~2,500/~5,000 credits + Most Popular in HTML; server stopped. Note: credit grants rose 20x vs old seed values — watch AI unit economics; revert by re-running the align script with old values or editing packages in `/admin/billing`.
- Fallback (user: empty state kept appearing): `lib/billing.ts` now exports `DEFAULT_PACKAGES` (same three tiers, `fallback-*` ids); `lib/public-pricing.ts` returns DB rows when any exist, else the file constants (`fallback: true` on the result). Purchases still resolve against the DB (`startPayment` 404s unknown ids → existing kind message at checkout). Re-verified on dev server: cards render, no empty state; server stopped.
- Clip fix: no max-height exists anywhere in the chain — the clipper was shadcn `Card`'s own `overflow-hidden` (`components/ui/card.tsx:14`) cutting the absolutely-positioned "Most Popular" pill. Fixed locally in `PricingCards` with `overflow-visible` (shared primitive untouched); bottom cut in the screenshot was viewport crop.
- Slice 4: FAQ rebuilt to the mock — two-column (eyebrow "Got Questions?" + H2 + support subcopy + outline "Contact Support →" mailto, accordion list of the mock's 5 questions with established-truth answers, plus-icon rows that rotate to × when open). Exclusive-open fix: native `name="cevo-faq"` group so opening one closes the rest (all modern browsers, zero JS). Jank fix: grid `items-center`→`items-start` with sticky left column, so expansion only grows the list downward and the intro copy never shifts. Evidence: `pnpm typecheck` clean; page lint clean except the pre-existing stale-notice flag.
- Slice 5: CTA rebuilt to the mock — full-width blue banner (`bg-primary`, soft white glow blobs), white Cevo mark (icon whitened via filter), "Ready to bring your ideas to life?" + "Join thousands of students..." subcopy, white "Get started →" button to `/sign-up`. Evidence: `pnpm typecheck` clean; page lint clean except the pre-existing stale-notice flag.
- Slice 6: auth pages rebuilt to the signup mock — centered layout (logo, no sidebar, no theme toggle per light-only, periwinkle wave blobs), borderless centered `AuthCard` (3xl bold sans title), `h-12 rounded-xl` inputs, `h-11 rounded-xl` buttons, eye-icon password toggles (accessible names kept), signup copy "Create your account / Start your academic journey with Cevo / Full Name / Email Address / Create Account / Already have an account? Sign in". Deliberately kept: rule-hint placeholders + meter/checklist and forgot-password link (tested behavior). Evidence: `pnpm typecheck` clean; all 22 auth tests pass (layout test rewritten for the new layout, signup button-name assertion updated).
- Slice 6: footer rebuilt to the mock — dark navy (`#1a2048`), white logo/tagline "Plan. Research. Develop.", Product/Resources/Legal columns, Stay connected with real brand glyphs (react-icons/fa6: Discord, X, YouTube, LinkedIn — lucide ships no brand icons), bottom bar with © 2025 + "Built for students. Powered by innovation." Resources/Blog/Academic-Integrity have no dedicated pages yet, so they map to the closest live anchors (`/#faq`, `/#templates`, `/#how-it-works`, `/terms#acceptable-use`) — real pages are future slices. Social hrefs are "#" placeholders (no Cevo accounts found in repo) pending real URLs. Evidence: `pnpm typecheck` clean; footer lint-clean.
- Slice 7: onboarding reworked to the mock — two-column with the supplied student illustration (`public/onboarding-student.png`, true alpha, hidden on mobile), 4-node progress rail (Personal/Academic/Preferences/Done, saved steps check off), step-1 exactly per mock ("Tell us about yourself" + subcopy + Personal Information + First/Last Name two-col + Preferred Language + Country + blue "Continue →"), `h-12 rounded-xl` inputs/selects and `h-11/12` buttons everywhere, sans-bold titles. All flow logic untouched (resume, suggest flows, validation, welcome credits). Deliberately kept: country as free-text input (mock shows a select; a fixed list would change validation) and the language helper text dropped for mock fidelity. Evidence: `pnpm typecheck` clean; onboarding lint count identical to baseline (20 pre-existing).
- Slice 8: shadcn-ification + mobile pass — 5 raw `<select>` filters (admin tickets/audit/payments/users) → shared `components/admin/filter-select.tsx` (shadcn Select, empty-value sentinel); raw `type="date"` (admin reconcile) → `components/admin/date-picker.tsx` (Popover + Calendar + date-fns, same YYYY-MM-DD contract); hamburger tap target 32→40px; primary CTAs already 44–48px; grids/cards/nav already collapse at sm/md with no `overflow-x` breakouts found in audit. Evidence: `pnpm typecheck` clean; touched-file lint flags down 6→5, all remaining pre-existing.
- Slice 9 (rethink): onboarding step 2 rebuilt from research (progressive disclosure — one question per screen, staged reveal) because the old wall of 4 pickers × suggest rows was the dropout risk. Each level now appears only after the previous is answered; "can't find it" is a one-tap switch to typing the name (no per-level server roundtrips, no cooldowns); typed names save with the step and are audit-logged best-effort at submit so admins still learn which schools to add. Backend contract unchanged (picked id XOR typed name per level, programme optional). Evidence: `pnpm typecheck` clean; zero new lint flags; JSX nesting verified.
- Slice 9 (surprise me): onboarding motion design from Firecrawl research (milestone celebration, visible progress advance, sub-second feedback, reduced-motion-safe) — animated rail connectors with eased fill + node pop on completion, fade-slide step transitions keyed per view, floating illustration + drifting glow, hand-drawn welcome check (SVG stroke animation) with staggered entrance, arrow-nudge hovers on primary CTAs. All keyframes inert under `prefers-reduced-motion`. Evidence: `pnpm typecheck` clean; zero new lint flags.
- Slice 10: real Cameroon directory — 42 institutions (11 public incl. Bertoua/Ebolowa/Garoua + 31 private/polytechnics/grandes écoles), 92 verified faculties/schools, 38 verified departments, 0 fabricated programmes. Old 6-row seed wiped cleanly (profile + platform template unlinked first, both survived); fully reseeded via `scripts/seed-institutions.ts` ← `scripts/data/cameroon-institutions.ts` (new; sources documented in-file: Wikipedia roster + per-university pages + official sites). Kept the hierarchy with CORRECT per-school links (no schema change — template matching depends on it); typed fallback covers schools with unknown sub-structure. Evidence: row counts verified in DB, `pnpm typecheck` clean.
- Slice 11: typed-mode confirm gate — typing no longer auto-answers a level. Draft stays local until the user taps "Use this name" (min 2 chars with live guidance); only the confirmed name counts, reveals the next stage, and saves. Evidence: `pnpm typecheck` clean; lint count unchanged (20 pre-existing).
- Slice 7: `/pricing` rebuilt to its mock — centered "Simple, flexible pricing" hero + subcopy, shared `PricingCards` (same design as the landing teaser), payment-notes card kept below (MoMo PIN guidance, refunds, refresh note) since the mock shows above-fold only. Evidence: `pnpm typecheck` clean; only pre-existing `role="status"` lint pattern on the stale/failed notices.
- Reliability: `listActivePackages` "contract marker" crash diagnosed — Neon compute sleeps on inactivity; first queries after wake fail inside the ORM check, then self-heal (repro went from throwing to 3 rows with no code change). Hardened the unguarded call sites instead of masking the error: `/dashboard/billing` now degrades via `Promise.allSettled` (empty catalog + balance 0 + "Billing is temporarily unreachable... refresh" notice) instead of 500, and `GET /api/billing/packages` returns 503 `BILLING_UNAVAILABLE`. Public surfaces were already safe (`getPublicPackages` try/catch → file fallback). Evidence: `pnpm typecheck` clean; new code follows the file's pre-existing lint patterns (verified identical flags on baseline).
