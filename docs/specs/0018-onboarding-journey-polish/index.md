# 0018. Onboarding journey polish

**Date**: 2026-11-14
**Status**: In Progress

_Build spec. Decision record lives in `rationale.md`._

## Summary

This spec rebuilds the presentation of the onboarding path so a new student can finish with no confusion. It keeps all server logic from spec 0004 exactly as is and only remakes the screens in `app/onboarding/page.tsx` using the frozen foundation from spec 0017. Progress saves and resumes, pickers filter cleanly, states feel kind in both themes, and each motion use is listed here for approval.

## Requirements

**User stories**:
* As a student, I want a guided start plus clear steps so I know where I am and what remains
* As a student, I want to pick my school from a searchable list or suggest it inline so I am never blocked
* As a student, I want progress saved per step so I can leave and resume where I stopped
* As a student, I want a welcome close that confirms credits so I trust the result

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
* **AC-1**: Start screen states value plus credit bonus then personal then academic then preferences then welcome with go to dashboard action, completed visit to onboarding goes to dashboard, resume lands at first gap
* **AC-2**: Each completed step persists through existing save actions, refresh or new login resumes at first incomplete step with saved values intact, gap derived from stored values wins over stored step hint
* **AC-3**: University picker plus faculty plus department plus programme filter by parent with 200 ms debounced search plus More button paging, selected row shows name plus code plus city where present, changing a parent clears child ids plus child custom text
* **AC-4**: Missing school or faculty or department can be suggested inline, name length 2 to 120 trimmed plus deduped case insensitive, suggest writes local state at once and persists on step save, clear notice names the saved value, finish allowed with custom text, programme stays optional, child under a custom parent shows suggest field only with no parent id search
* **AC-5**: Completing all required fields once grants 50 welcome credits exactly once through the existing complete action, repeats return current state with no extra grant, redirect target is /dashboard
* **AC-6**: Required fields show inline field error under each control, step errors show an alert with post again retry, both themes read well, signed out maps to sign in, other user maps to 401
* **AC-7**: Loading uses skeletons that mirror card plus picker rows, spinner only inside the submit control, empty search shows the empty pattern with suggest action, failures show alert plus retry, toasts only for transient notices with 4 second duration
* **AC-8**: Progress shows step names Personal details plus Academic place plus Preferences with position plus saved indicator after each successful save, motion stays inside the foundation allow list with each use approved here

## Decision record

Options considered plus rationale live in `rationale.md`.

**Chosen option**: Option 3: Replace presentation directly

The polish remakes only the screens in `app/onboarding/` on the frozen base, with zero change to logic or schema.

## Feature design

**Data model sketch**:
Target reuses spec 0004 with no migration. StudentProfile (one per User): firstName required, lastName required, country free text default Cameroon, preferredLanguage from list en plus fr, onboardingCompleted flag, onboardingStep hint. AcademicProfile (one per User): institutionId optional, customInstitution optional text, facultyId optional, customFaculty optional text, departmentId optional, customDepartment optional text, programmeId optional, qualification enum with labels HND plus Bachelors plus Masters plus PhD plus Other, academicSession text validated as YYYY/YYYY with start 2000 to 2030, preferredStyle allowed values APA_7 plus Harvard plus MLA. Institution parent of Faculty parent of Department parent of Programme. CreditWallet one per User with balance. CreditLedger row for welcome grant with reference welcome plus user id.

**State transitions**:
onboardingStep: 1 then 2 then 3 then complete. Forward only on valid save. Required set per step: step 1 needs firstName plus lastName plus country plus preferredLanguage, step 2 needs institution as id or custom plus faculty as id or custom plus department as id or custom plus qualification plus academicSession, step 3 needs preferredStyle plus preferredLanguage. Direct visit to step 2 or 3 with earlier gap redirects to first gap. Completed visit to onboarding goes to /dashboard. onboardingCompleted: false then true, set only by the existing complete action in the same transaction as the credit grant. Once true, complete is read only and returns current state with no extra grant.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| savePersonalStep | Server Action | firstName:string (req), lastName:string (req), country:string (req), preferredLanguage:string (req) | onboardingStep, fieldErrors | session owner | 401, 422 |
| saveAcademicStep | Server Action | institutionId:string (opt), customInstitution:string (opt), facultyId:string (opt), customFaculty:string (opt), departmentId:string (opt), customDepartment:string (opt), programmeId:string (opt), qualification:enum (req), academicSession:string (req) | onboardingStep, fieldErrors | session owner | 401, 404, 422 |
| savePreferencesStep | Server Action | preferredStyle:string (req), preferredLanguage:string (req) | onboardingStep, fieldErrors | session owner | 401, 422 |
| searchInstitutions | Server Action | query:string (opt), page:number (opt) | items id plus name plus code plus city, hasMore | session owner | 401 |
| searchFaculties | Server Action | institutionId:string (req), query:string (opt), page:number (opt) | items, hasMore | session owner | 401, 404 |
| searchDepartments | Server Action | facultyId:string (req), query:string (opt), page:number (opt) | items, hasMore | session owner | 401, 404 |
| searchProgrammes | Server Action | departmentId:string (req), query:string (opt), page:number (opt) | items, hasMore | session owner | 401, 404 |
| suggestInstitution | Server Action | name:string (req), city:string (opt) | name for customInstitution | session owner | 401, 422 |
| suggestFaculty | Server Action | name:string (req) | name for customFaculty | session owner | 401, 422 |
| suggestDepartment | Server Action | name:string (req) | name for customDepartment | session owner | 401, 422 |
| completeOnboarding | Server Action | none (uses saved profile) | onboardingCompleted, walletBalance, redirectTo | session owner | 401, 409, 422 |

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):
| Action | Value produced / displayed | Source |
|---|---|---|
| savePersonalStep | onboardingStep | Derived from validation success, stored in StudentProfile column |
| saveAcademicStep | institutionId, facultyId, departmentId, programmeId | Input picker selection, validated against Institution plus Faculty plus Department plus Programme columns |
| saveAcademicStep | customInstitution, customFaculty, customDepartment | Input suggest text length 2 to 120 trimmed, stored in AcademicProfile columns on step save |
| saveAcademicStep | qualification, academicSession | Input params, qualification from enum, session validated by shared pattern YYYY/YYYY with error copy naming the pattern plus year range |
| savePreferencesStep | preferredStyle, preferredLanguage | Input params, style from allowed list, language wins on conflict and prefills step 1 on return |
| search actions | items plus hasMore | DB columns filtered by parent id plus case insensitive contains on name, sorted by name, page starts at 1 size 20, More button loads next page |
| completeOnboarding | onboardingCompleted plus redirectTo | Derived from required predicate valid plus redirect constant /dashboard, already completed checked first, completed visit routes to dashboard |
| completeOnboarding | walletBalance plus ledger entry | CreditWallet balance column plus new CreditLedger row in serializable transaction, amount fixed constant 50 in code, submit disabled while pending so double post grants once |
| page read | initialStep plus saved values | getOnboardingState read by session user id, gap derived from stored values wins over stored step hint, query plus page state stays local to the step |
| welcome display | credit amount plus next action | CreditWallet balance column plus redirect constant |
| start display | value copy plus credit note | Static copy in code, no DB read |
| states display | skeleton plus empty plus alert plus toast copy | Static copy in code, profile read cache 30 seconds, spinner only inside submit control |

**Key invariants**:
* One StudentProfile and one AcademicProfile per user at most
* Faculty belongs to exactly one institution, department to exactly one faculty, programme to exactly one department
* Custom text present implies no linked id at that level, linked id present implies custom text empty at that level
* Child search under a custom parent is not offered, suggest field only at that level
* Academic picks always satisfy parent links at complete time, stale ids rejected with repick alert at the affected picker
* Changing a parent clears child ids plus child custom text
* Field gap derived from stored values wins over stored step hint
* Already completed returns current state with no extra grant
* Every labeled control uses the field wrapper with label plus input plus optional description plus inline error
* Searchable academic pickers use combobox with 200 ms debounce, simple fixed lists use native select, styled lists use select
* Page and card loading uses skeleton that mirrors coming layout, spinner only inside submit control, toasts only for transient notices
* Submit plus suggest controls disable while pending, step save is the source of truth for suggest plus save races

**Security model**:
Only the owning student may call save, search, suggest, and complete, enforced by session user id match on every action. Signed out maps to sign in, other user maps to 401. Admins read only for support, no admin edit in this build. Institution search returns id plus name plus code plus city only. Guards cover onboarding plus auth plus public plus auth api, profile read per request with 30 second cache, no redirect loop.

**Configuration required**:
No new env vars. Welcome amount stays the fixed constant 50 in code.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
* Happy path: new account completes start plus 3 steps with seeded picks and lands on dashboard with 50 credits, verifies **AC-1**, **AC-3**, **AC-5**
* Resume path: refresh after step 1 returns to step 2 with step 1 values intact, verifies **AC-2**
* Suggest path: missing school suggested inline as custom text, child under custom parent shows suggest only, completion succeeds, verifies **AC-4**
* Validation path: empty required field shows inline field error plus step alert with post again retry in both themes, verifies **AC-6**
* States path: slow search shows skeleton, empty search shows empty plus suggest action, failed save shows alert plus retry, verifies **AC-7**
* Failure case: double complete plus double submit grants once, stale faculty id triggers repick alert at picker, verifies **AC-5**, **AC-3**
* Auth/permission: other user id maps to 401, signed out maps to sign in, verifies **AC-6** scoping

## Build plan

Ordered as thin Tracer Bullet slices, each working through the page with logic untouched, each tagged to its AC.

1. Shell plus progress plus start plus welcome plus resume wiring with skeleton page, satisfies **AC-1**, **AC-2**, **AC-7**, **AC-8**
2. Personal step on field pattern with inline errors plus alert plus retry in both themes, satisfies **AC-6**, **AC-2**
3. Academic combobox pickers with 200 ms debounce plus More paging plus parent clearing plus selected name display, satisfies **AC-3**
4. Inline suggest flow with local state plus step save persistence plus notice plus custom text edit plus validation plus custom parent child rule, satisfies **AC-4**
5. Preferences plus complete plus welcome credits confirm plus dashboard routing plus repeat state, satisfies **AC-5**, **AC-1**
6. Empty plus loading plus error pass plus pending disable plus stale repick plus motion allow list check plus both themes manual pass, satisfies **AC-7**, **AC-8**, **AC-6**

Motion allow list approval (only these may ship, nothing else without a new decision):
* Overlay open and close fade plus scale from primitive defaults for combobox popover and dialogs
* Loading shimmer and pulse on skeleton, spin on spinner, blink on caret
* Duration around 100 to 200 milliseconds for control transitions
* No page transition choreography, no layout animation, no spring physics, no scroll linked effects, no looping decorative animation, no new motion library

## Consequences

**Positive**:
* First run reads as one calm family with the foundation, so later journeys inherit the pattern
* Pickers show real names with clean filtering, which removes the main confusion cause
* Zero migration keeps the ledger plus guards stable while the screens change

**Negative / tradeoffs**:
* Single larger presentation diff needs careful review of picker wiring
* Combobox plus suggest behavior needs seeded data plus network to test well, slow paths need manual checks
* Taste level refresh stays minimal by intent, small visual quirks remain until a journey justifies change

**Neutral**:
* No new tables, no new endpoints, no new env vars, no new libraries

## Follow-up

* [ ] Record approved motion uses above at build time so each use stays visible
* [ ] Add import guidance note for combobox versus select versus native select where academic pickers live
* [ ] Consider per page notes from external style research at build time without adding web links to this spec
* [ ] Enroll auth pages polish plus dashboard polish plus workspace guardrails plus public site polish as separate specs when ready
