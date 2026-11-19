# Dashboard settings page — 6-tab replication

Plan profile: full — IMPLEMENTED 2026-11-19 (user-approved), no Git requested

## Build Log (P1+P2 — executed 2026-11-19)

- P1 discoveries (applied): better-auth built-ins `updateUser`/`changePassword`/`listSessions`/`revokeSession(s)` all present (no plugin needed); avatar flow mirrors files-upload presign pattern (`POST /api/settings/avatar` presign → client PUT → `confirmAvatarUpload` head-verify → `User.image` key; `GET /api/settings/avatar` redirects to a fresh presigned preview since keys, not URLs, are stored); cascade-audit discovery skipped (Q4 = support-routed).
- P1 backend: `NotificationPreference` model + additive migration applied (`20261119T0758_init`: create table + unique userId + FK); `lib/notification-preferences.ts` (get/save + consumer-facing comment); `lib/settings.ts` `describeDevice` + unit tests; `app/dashboard/settings/actions.ts` (profile save + `User.name` sync, prefs get/save, support ticket creation, avatar request/confirm with mime/size/key-prefix checks); `app/api/settings/avatar/route.ts` (GET redirect); `HelpFaq` extraction shared by `/dashboard/help` and the tab.
- AcademicPicker extraction: moved verbatim (322 lines) from `app/onboarding/wizard.tsx` to `components/dashboard/academic-picker.tsx` (byte-identical diff modulo `export` + suppressed exhaustive-deps now owned with a biome-ignore carrying the original rationale); wizard re-imports; `STEPS`/`NODES`/`View` stay in wizard; typecheck clean, onboarding suites still pass.
- P2: tab shell (`?tab=` server-driven, active underline per mock) + Profile (photo/initials, names, read-only verified email, country datalist, language, Save Changes) / Academic (staged pickers + qual/session + save, custom-mode preserved, suggest-audit best-effort mirrored) / Notifications (3 persisted toggles) / Billing (credits hero + mini ledger + link) / Security (change-password dialog with current-pw + min-12, disabled 2FA toggle + Coming-soon note, login activity with device/IP/relative time + current badge + revoke-others + 12s-timeout-bounded fetches, support-routed deletion dialog → ticket) / Help (shared FAQ + support card).
- Fixes during verify: `<search>`/`<output>` semantics instead of role attributes; picker labels resolve via primitive-native `itemToStringLabel` where needed; `inWorkspace` orphan removed (sidebar had no other user); temp harness (route + proxy exception) removed afterwards.
- Evidence: `pnpm typecheck` clean; touched-file `biome check` clean (all remaining `wizard.tsx` literal-key flags verified pre-existing on baseline via stash; moved-pattern ignore documented); `pnpm test` 132/132; dev-server render proof at 1280 + 390 for profile/academic/notifications/billing/help/security (Security dialog, delete dialog, More menu all exercised; zero page errors); new API 401s cleanly, both pages guard 307 to sign-in; migration diff reviewed (single additive table); country stays free-text per house convention (mock chevron is decorative).
- Open follow-ups (not silently closed): buying from the credits page is still unwired (prior slice); onboarding "Harvard"/"MLA" `preferredStyle` never flows into `Project.referencingStyle` (pre-existing gap).

## 0. Applicability and Plan Gate

### Plan Gate

- **Branch:** EXEMPT — no `docs/product-roadmap.md`; no `docs/project-config.json` (verified absent 2026-11-18); scope owner is user message 2026-11-18/19 + two screenshots (Profile tab, Security tab) plus explicit instruction: replicate everything, including the four unseen tabs.
- **Roadmap:** EXEMPT — none exists; follows shipped slices (`docs/plans/dashboard-templates-credits/plan.md` and predecessors).
- **Milestone:** EXEMPT — no milestone; builds on: `app/dashboard/settings/page.tsx` (read-only today), onboarding actions (`app/onboarding/actions.ts:43-199` — `savePersonalStep`/`saveAcademicStep`/search/suggest, reusable), `AcademicPicker` (`app/onboarding/wizard.tsx:122+`, reusable), better-auth built-ins (client `updateUser`/`changePassword`/`revokeSession`, no plugins enabled in `lib/auth.ts`), S3 presigned upload (`lib/storage.ts:presignPutUrl`), `Notification` model (exists, never written), `Session` rows with ip/userAgent, `getBalance` + ledger pattern, shared `faqs` (`components/public/faq-items.tsx`).
- **Scope brief:** inline — rebuild `/dashboard/settings` into the 6-tab mock (Profile, Academic, Notifications, Billing, Security, Help), every tab functional against real backends; unseen tabs implemented to the same bar, not as placeholders.
- **Scenarios:** inline — (1) user edits profile (photo, names, country) and saves; (2) user edits academic stack inline, including custom-typed schools; (3) user toggles notification prefs and they persist; (4) user sees balance, changes password, reviews/revokes sessions; (5) account deletion follows the approved safe path only; (6) Help answers without leaving settings; (7) render at 360/768/1280 in light.
- **Product decisions:** email stays read-only with Verified badge (no email-change flow exists); 2FA and delete-account depth decided by validation (real TOTP vs honest disabled; plugin/custom vs support-only); notifications = persisted prefs model (new, migration flagged) vs inbox empty-state — validation decides; photo = S3 avatar upload (User.image) vs deferred.
- **Project skeleton:** Next.js App Router + Tailwind v4 OKLCH + shadcn-only; owners: new `app/dashboard/settings/*` components, `app/api/settings/*` (avatar presign, prefs, sessions revoke — only what validation approves), `lib/notification-preferences.ts` (if prefs win), `lib/auth.ts` (only if 2FA/delete plugin wins), onboarding `actions.ts`/`wizard.tsx` (reuse, minimal extraction), `lib/onboarding-validation.ts` (only if a new schema is needed).
- **Commands:** `pnpm dev`, `pnpm lint`, `pnpm typecheck`; NEVER `pnpm build` (ADR-009). Verify: `pnpm test` only if touched suites exist.
- **Evidence plan:** render-vs-mock at 360/768/1280 + per-tab behavior logs (save flows, toggles, password change on a test account, session revoke, prefs round-trip); `pnpm lint` + `pnpm typecheck`; migration diff review if prefs model wins.
- **Human approval:** APPROVED — user approved all six validation questions 2026-11-19 in-session (S3 avatar, persisted prefs, honest-disabled 2FA, support-routed deletion, inline academic, gate approved).
- **Gate status:** READY — implementation unblocked for P1+P2.

## 1. Outcome and boundaries

**Outcome:** a settings page matching the mocks' tab strip and card language, where Profile edits (photo/names/country) persist, Academic edits reuse the onboarding pickers + save actions, Notifications persists per-user prefs, Billing shows true balance + history link, Security changes passwords / shows + revokes sessions (+ 2FA and deletion exactly as approved), and Help answers inline.

**Governing intent:** user messages 2026-11-18/19 ("next, we have the dashboard settings page", "make sure to well implement even all tabs not shown", "everything is to be replicated") + two screenshots; existing truth preserved (onboarding save actions, auth session behavior, billing numbers, FAQ content).

**In scope:**
- Tab shell with deep-linkable tabs (`?tab=profile|academic|notifications|billing|security|help`, default `profile`), active-pill styling per mock.
- Profile: S3 avatar upload (presign → upload → `User.image`) + names/country/language via `savePersonalStep` (+ `User.name` sync — new tiny wrapper action), email read-only + Verified badge from `emailVerified`.
- Academic: full inline editing reusing `AcademicPicker` + search/suggest actions + `saveAcademicStep` (picked + custom-typed paths both).
- Notifications: per Q1 outcome (prefs model + toggles + save, or inbox list + mark-read).
- Billing: balance hero (credits), recent payments mini-list (reuse ledger query), link to `/dashboard/billing`.
- Security: change-password dialog (built-in `changePassword`, current-password required, min-12 rule surfaced); login activity from `Session` rows (time/IP/device, current marked, revoke-others via built-in); 2FA + deletion exactly per Q3/Q4.
- Help: extract shared FAQ accordion + support card used by both `/dashboard/help` and the tab (no content fork).
- Responsive + a11y + skeletons/empty/error per tab.

**Non-goals (by decision):**
- No email-change flow — reason: no backend for it; mock shows email read-only anyway.
- No new providers, no billing-logic change — reason: settings surfaces existing data only.
- No dark-theme work — reason: light default stands.

**Compatibility/rollback:** additive page + optional migration (prefs model). If prefs win, migration is additive/nullable. Auth changes (if any) are additive plugin enablement; sign-in flow edits only if 2FA wins. Rollback = revert range (+ migration rollback note if prefs shipped).

**Not yet specified:** None — the whole route is visible. Open choices are precise decisions in §2, not fog.

## 2. Important technical decisions

1. **Reuse onboarding actions, don't fork them.** Choice: Profile/Academic tabs call `savePersonalStep`/`saveAcademicStep` and the search/suggest actions directly; `AcademicPicker` is reused (extracted only if imports force it). Alternative: duplicate pickers + new save routes. Sacrifice: settings inherits onboarding validation copy. Reversibility: easy. Owners: `app/onboarding/actions.ts`, `wizard.tsx:122+`.
2. **Avatar via existing S3 presign.** Choice: new `POST /api/settings/avatar` returning presigned PUT for `avatars/{userId}/{uuid}.{ext}` (image/*, ≤5MB), client uploads, then updates `User.image`. Alternative: initials-only, no upload. Sacrifice: small new route + client upload code. Owner: new route + Profile tab.
3. **Email stays read-only.** Choice: show `user.email` + Verified/Unverified badge from `emailVerified`; no change flow. Alternative: build email-change + re-verification. Sacrifice: users needing a new email contact support (status quo, matches mock). Owner: Profile tab.
4. **Notifications shape per validation.** Choice A (recommended): `NotificationPreference` model (`userId` unique, booleans for email categories that exist today) + toggles + save action. Choice B: inbox list over `Notification` rows + mark-read (honest but permanently near-empty — nothing emits). Owner: new lib + tab (A) or query + tab (B).
5. **2FA per validation.** Choice A: full TOTP via better-auth `twoFactor` plugin (enrollment QR + verify + backup codes + sign-in second step). Choice B (recommended if sign-in risk must stay zero): honest disabled toggle labeled "Coming soon". Owner: `lib/auth.ts` + sign-in form + Security tab (A) or tab only (B).
6. **Deletion per validation.** Choice A: `deleteUser` plugin with email verification + typed-name confirm + cascade audit. Choice B (recommended for safety): support-routed deletion (in-app request ticket + explanation), no self-serve destroy. Owner: auth/routes + tab (A) or tab + support ticket (B).
7. **Help extracted, not copied.** Choice: move FAQ accordion + support card into `components/dashboard/help-faq.tsx` used by both routes. Alternative: link out to `/dashboard/help`. Sacrifice: tiny refactor, keeps one owner (matches mock inline tab). Owner: new component + both pages.

## 3. Areas and owners to touch

- New settings UI: tab shell + 6 tab panels under `app/dashboard/settings/` (or `components/dashboard/settings-*`), page loader (user + profiles + balance + sessions + prefs/summary per outcome).
- Reuse (read-only unless forced): `app/onboarding/actions.ts`, `AcademicPicker` + search/suggest actions, `lib/storage.ts:presignPutUrl`, `faqs` module, billing balance/ledger queries.
- Conditional: `GET/POST /api/settings/avatar`, prefs model + migration + save action, `lib/auth.ts` plugin enablement, sign-in second step, delete route — only the validated winners.
- Unchanged by default: onboarding flows, provider search/save, billing packages/payments, exports.
- Tests/specs/docs: new unit tests for new pure logic (prefs defaults, session-device labeling); existing suites must stay green; plan Build Log records evidence.

## 4. Quality Gates & Concerns Checklist

| # | Gate / concern | Applies? (YES/NO + one-line why) | How it will be verified | Evidence expected (command, test name, report path, file:line) | Owner phase |
|---|---|---|---|---|---|
| G1 | Tabs + Profile/Security match mocks (strip, pills, cards, buttons) | YES — core deliverable | Side-by-side mock-vs-render at 1280 + 768 + 360 | Render notes + settings diffs | P2 |
| G2 | Unseen tabs (Academic/Notifications/Billing/Help) fully work, no placeholders | YES — explicit user requirement | Exercise each: academic save round-trip, prefs/inbox behavior, balance truth, FAQ inline | Behavior logs per tab | P2 |
| G3 | Profile save round-trips (names/country/photo persist + reload) | YES — new write paths | Save, reload, compare DB/UI; avatar shows after upload | Action log; route/action lines | P1/P2 |
| G4 | Auth flows safe (password change needs current pw; sessions revoke only others; 2FA/deletion exactly as approved) | YES — security tab | Change pw on test account (old fails/new works); revoke other session; 2FA/deletion per approved scope | Security action log | P1/P2 |
| G5 | No silent data loss (academic custom-typed values preserved; prefs defaults honest; deletion guarded) | YES — destructive-adjacent writes | Custom school round-trip; prefs default vs saved; deletion gate per Q4 | Data logs | P1/P2 |
| G6 | No regression (onboarding saves, sign-in, billing numbers, help page) | YES — shares actions/components | Onboarding personal+academic save still pass; `pnpm test` green | Regression log; suite result | P2 |
| G7 | Single global font/theme, zero per-page font wiring | YES — standing requirement | Grep `font-family`/`font-(sans\|serif\|mono)` on touched files + visual spot | Grep log clean | P1/P2 |
| G8 | Responsive + keyboard (tablist arrows, dialogs, toggles, menus) | YES — new interactive surface | 360/768/1280 + keyboard-only run incl. tab strip and each dialog | Viewport + a11y notes | P2 |
| G9 | Empty/error/loading per tab (no sessions besides current, prefs load fail, save 422s) | YES — new surface | Force each state | State notes | P2 |
| G10 | Static review of plan + change | YES — auth-adjacent change | One self-check on plan; one static pass on change before verify | `## Self-Review` + change notes | P1/P2 |
| G11 | Spec/doc sync | YES if a settings/account spec owns this surface, else plan log only | Update only owned verify notes | Spec diff or Build Log | P2 |
| G12 | Security/authz (own-data only, no IDOR on avatar/prefs/sessions/password/delete; upload is image-only + size-capped + own-prefix key) | YES — multi-surface user-data writes | Unauthed → 401; user B cannot touch user A rows (code review of every new route/action `where userId`); avatar key scoping + mime/size checks | Authz review notes + route lines | P1 |
| G13 | Data integrity/migration | CONDITIONAL — only if prefs model wins | Additive nullable table; rollback note | `prisma diff` review or empty `git diff --stat prisma/` | P1 |
| G14 | AI-feature gate | NO — no model/prompt/tool change | N/A | No `lib/assistant*` diff | — |
| G15 | Maintainability (one owner per rule, tokens only) | YES — new surface | Shared FAQ component, reused actions, token-only diff | Component paths | P1/P2 |

### Open concerns and risks

- Notifications shape (G2) → user decision Q2; threatens a hollow tab if the wrong shape wins.
- 2FA depth (G4) → user decision Q3; full TOTP touches sign-in (risk) vs honest disabled (drift from mock).
- Deletion path (G5) → user decision Q4; self-serve destroy needs verification + cascade audit.
- Photo upload (G3) → user decision Q1; S3 path needs key-scoping + mime/size review (G12).
- Academic inline weight (G2/G6) → user decision Q5; reuse keeps it bounded, summary+link is the fallback.
- Help fork risk (G11) → mitigated by extraction (decision 7); failing check: content drift between routes.

## 5. Execution phases

### P1 — Backends + contracts (SEQ predecessor)

- **Objective and boundary:** prove every write the tabs need. Includes: profile wrapper action (personal + `User.name` sync), avatar presign route (per Q1), prefs model + save (per Q2A) or inbox query (per Q2B), password/sessions server surface check (built-ins verified), 2FA/delete enablement (per Q3/Q4), shared FAQ extraction. Non-goals: no tab UI beyond what's needed to exercise.
- **Decisions fixed:** §2 choices 1–3 as applicable; 4–6 as approved in validation.
- **Areas/owners:** new `app/api/settings/*`, `lib/notification-preferences.ts` (Q2A), `lib/auth.ts` (Q3A/Q4A), `components/dashboard/help-faq.tsx`, onboarding reuse points.
- **Discovery before edit (bounded, stop conditions):**
  1. better-auth client capabilities: confirm `updateUser`/`changePassword`/`revokeSession(s)` signatures available in the installed version. Stop: method list recorded; any missing method becomes a plan deviation, not an improvisation.
  2. S3 avatar path: confirm presign-then-PUT pattern from an existing caller (`lib/file-uploads.ts`, files routes) and the avatar key prefix + public-read/preview strategy for `User.image`. Stop: pattern + URL strategy recorded.
  3. Cascade audit for deletion (only if Q4A): list relations blocking user delete and the handling for each. Stop: table recorded; any `Restrict` without a handler blocks the phase.
- **Implementation output:** tested write paths + unit tests for new pure logic; migration reviewed if prefs win.
- **Acceptance/quality gate:** G3–G5, G10, G12–G13 evidenced (action/authz logs, unit tests, migration review, lint + typecheck). Gates: G3, G4, G5, G10, G12, G13, G15.
- **Dependency metadata:** SEQ — P2 starts only after P1's contracts land.

### P2 — Tabs UI + verify (SEQ after P1)

- **Objective and boundary:** ship the 6-tab page reusing P1; sidebar Settings entry stays (already points here). Non-goals in §1 hold.
- **Decisions fixed:** all §2 choices as approved.
- **Areas/owners:** tab shell + panels, page loader, sidebar untouched (entry exists).
- **Discovery before edit (bounded, stop condition):** confirm tab param plumbing (`?tab=` preserved across saves where sensible; stop = behavior recorded).
- **Implementation output:** mock-faithful page; every control does what it says; skeletons/empty/error; responsive + a11y.
- **Acceptance/quality gate:** G1, G2, G6–G12, G15 evidenced (render/action/keyboard logs, suite run, lint + typecheck). Gates: G1, G2, G6, G7, G8, G9, G10, G11, G15.
- **Dependency metadata:** SEQ — consumes P1 contracts; no parallelism.

Inline steps: (1) P1 discoveries, record; (2) apply validation answers; (3) P1 contracts + tests + migration review; (4) P2 shell → Profile → Academic → Notifications → Billing → Security → Help; (5) static pass; (6) verify (§6). Rollback: revert range (+ migration rollback note if prefs shipped).

## 6. Final verification order

1. `pnpm lint` then `pnpm typecheck` — must be clean (touched-file flags vs baseline).
2. Unit: new pure-logic tests green (naming the obligation, no fabricated IDs).
3. Render sweep: both mocks + every tab vs expectation at 360/768/1280 in light + forced-OS-dark reload — notes recorded.
4. Behavior: profile save round-trip (incl. photo); academic picked + custom-typed round-trip; prefs/inbox per Q2; balance truth; password change old-fails/new-works; session revoke-other; 2FA/deletion per approved scope.
5. Workspace regression: onboarding personal+academic saves still pass; sign-in unaffected (or 2FA step verified if Q3A).
6. Keyboard + states: tablist arrows, dialogs, toggles, menus; empty/error/skeleton each forced once.
7. Authz spot: signed-out → sign-in; user B cannot write user A rows on any new route/action; avatar upload scoped + typed + capped.
8. One static review pass; fix validated findings; rerun only invalidated checks. Then `pnpm test` if suites exist.
9. Docs: Build Log here; spec notes only where owned; migration diff reviewed or `git diff --stat prisma/` empty; no new `public/` rasters.

## 7. Risks and execution concerns

- 2FA half-built (toggle without enforcement) → mitigated by Q3 forcing full-scope or honest-disabled; failing check: toggle state must equal enforcement state.
- Delete without cascade audit → mitigated by Q4 + P1 discovery 3; failing check: orphaned rows or over-deletion.
- Notification theater (toggles controlling nothing) → mitigated by Q2; failing check: every toggle maps to a persisted, readable effect.
- Academic fork drift → mitigated by reuse (decision 1); failing check: onboarding save still green post-change.
- Avatar abuse (wrong mime/oversize/cross-user key) → mitigated by G12 review; failing check: upload of non-image or oversized file rejected, key prefix enforced.
- Scope creep (email-change flow, new providers) → explicitly non-goal; forces replan.
- 10× concern: sessions list capped + ordered; prefs single-row per user; ledger mini-list capped; next plausible change = per-project notification routing — edit sites: prefs model + emitter call-sites only.
- Protected-rule tests that must fail if broken: cross-user settings write succeeds (G12), unpublished toggle with no effect (G2), password change without current password (G4) — named obligations, no fabricated IDs.

## 8. Execution waves

Sequential — P1 then P2; P2 consumes P1's contracts. No PAR.

## Self-Review

Self-review: DONE (single reviewer-style pass by plan author, review-only, no edits to other files).

- Finding 1 (MEDIUM): first draft let 2FA be "a toggle" without enforcement — fixed: Q3 forces full-TOTP scope or honest-disabled, with the toggle-must-equal-enforcement rule in G4/risks.
- Finding 2 (MEDIUM): delete-account was implied as self-serve — fixed: explicit Q4 with cascade-audit discovery gate.
- Finding 3 (LOW): notifications could have shipped as theater toggles — fixed: Q2 with the every-toggle-has-effect rule.
- Open: Q1–Q6 answers pending — carried to Validation Summary, not decided by assumption.

## Validation Summary

**Validated:** 2026-11-19
**Questions asked:** 6 in 2 rounds

### Applicability

- **Branch:** EXEMPT
- **Owning artifact / roadmap:** NOT APPLICABLE — EXEMPT (no `docs/product-roadmap.md`, no `docs/project-config.json`; owner is user messages 2026-11-18/19 + two design screenshots)
- **Slice / technical outcome:** dashboard settings 6-tab replication (`docs/plans/dashboard-settings/plan.md`)
- **Scope handoff / scenarios:** inline scope brief + inline scenarios (§0)
- **Plan Gate:** READY
- **Human approval:** APPROVED

### Confirmed Decisions

- Q1 Profile photo: S3 avatar upload (recommended) — presigned URL, image-only, size-capped, key-scoped, stored on `User.image`.
- Q2 Notifications: persisted preference toggles (recommended) — new `NotificationPreference` model + additive migration.
- Q3 2FA: honest disabled "Coming soon" (recommended) — toggle rendered disabled; `lib/auth.ts` untouched, sign-in flow untouched.
- Q4 Delete account: support-routed request (recommended) — in-app ticket + explanation, no self-serve destroy, no delete plugin.
- Q5 Academic: full inline editing (recommended) — reuse `AcademicPicker` + search/suggest + `saveAcademicStep`, picked and custom-typed paths.
- Q6 Plan Gate approval: APPROVED for the 6-tab scope above; migration only for prefs; auth untouched.

### Assumptions Not Asked

- better-auth built-in `updateUser`/`changePassword`/`revokeSession(s)` availability — left to P1 discovery item 1 (any gap becomes a deviation, never improvised).
- Avatar key prefix + public/preview URL strategy — left to P1 discovery item 2.
- `?tab=` preservation behavior across saves — left to P2 discovery.

### Action Items

- [x] Flip Plan Gate to APPROVED/READY (done here).
- [ ] Execute P1 (discoveries, contracts, migration review, unit tests), then P2 (shell + 6 tabs + verify) — separate build invocation.

### Applied Changes

- §0 Plan Gate → Human approval REQUIRED→APPROVED with session evidence; status BLOCKED→READY.
- §2 decisions → Q1–Q5 outcomes recorded as the confirmed path (avatar upload, prefs model, disabled 2FA, support-routed deletion, inline academic).
- This section (§Validation Summary) → PENDING→Validated with decisions, action items, and applied-changes list.
