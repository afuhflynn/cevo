# Verify: Academic onboarding and institution hierarchy · spec 0004 · updated 2026-11-13
_Steps derived from spec 0004 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [x] Sign up a new account, sign in, visit `/dashboard` and expect a redirect to `/onboarding` → AC-1
- [ ] Complete step 1, refresh the page, expect step 2 with step 1 values intact; sign out and back in, expect resume at the first incomplete step → AC-2
- [ ] On step 2 search `Buea`, pick University of Buea, expect faculties filtered to that university; pick a faculty, expect departments filtered; pick a department, expect programmes filtered; page through results → AC-3
- [ ] Search a name with no matches, expect a no matches state with a suggest action; suggest the missing school, expect completion succeeds with custom text stored → AC-4
- [ ] Complete all three steps with seeded picks, expect landing on `/dashboard` with wallet balance 50 → AC-1, AC-5
- [ ] Trigger complete twice (double click), expect the second call returns current state with no extra grant → AC-5
- [ ] Remove a faculty row directly in the DB, then complete, expect a repick error on the faculty field; visit `/onboarding?step=3` with step 2 incomplete, expect redirect to the first gap → AC-7
- [ ] Submit each step with empty required fields, expect field keyed errors; call a save action signed out, expect unauthenticated → AC-6
## Commands
- [x] `pnpm db:seed` → seeds 5 Cameroonian institutions with faculties, departments, programmes → AC-3
- [x] `pnpm typecheck` → passes with the onboarding slice → AC-6
## Acceptance-criteria coverage
- AC-1 covered by dashboard redirect step and completion landing step
- AC-2 covered by refresh and resume step
- AC-3 covered by filtered search step and seed command
- AC-4 covered by suggest step
- AC-5 covered by welcome grant step and double complete step
- AC-6 covered by validation and ownership step, plus typecheck
- AC-7 covered by stale id and deep link step
## Value sourcing checks
- [ ] onboardingStep advances only on valid save and the stored step stays a hint while gap derivation wins → savePersonalStep row
- [ ] Picker ids validate against Institution, Faculty, Department, Programme columns; custom text stores only when no id is set at that level → saveAcademicStep rows
- [ ] Session values outside 2000 to 2030 or not spanning one year are rejected; qualification outside the enum is rejected → academicSession row
- [ ] Search returns only id, name, code (plus city) with hasMore paging at size 20 → search actions row
- [ ] Completing twice grants once; ledger holds one PROMOTIONAL_CREDIT row with reference welcome plus user id → completeOnboarding rows
- [x] Signed out dashboard request redirects to sign in; signed in but incomplete request redirects to onboarding → guard row
