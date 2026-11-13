# 0004. Academic onboarding and institution hierarchy

**Date**: 2026-11-13
**Status**: In Progress

## Summary

This spec designs the welcome flow that turns a new account into a ready student profile. It uses a three step wizard (personal details, then academic place, then preferences) that saves each step and blocks the dashboard until done. It reuses the existing profile and school tables, adds searchable Cameroonian institutions with a suggest path, and grants a single welcome credit bonus on completion.

## Requirements

**User stories**:
- As a student, I want a guided setup after sign up so I can complete my profile without guessing.
- As a student, I want to pick my university from a searchable list or suggest it when missing so I am never blocked.
- As a student, I want my progress saved per step so I can leave and resume where I stopped.
- As a student, I want welcome credits on completion so I can try paid actions right away.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: After first sign in with incomplete profile, visiting dashboard routes to onboarding, completing onboarding routes to dashboard.
- **AC-2**: Wizard shows three steps in order with progress state, each completed step persists to the database, refresh or new login resumes at the first incomplete step.
- **AC-3**: University picker searches seeded Cameroonian institutions by name with paging, faculty list filters by chosen institution, department filters by faculty, programme filters by department.
- **AC-4**: When a school or faculty or department is missing, student can submit a suggested name inline and finish onboarding, suggestion stores as custom text through the academic save for later review, programme stays optional.
- **AC-5**: Completing all required fields (institution as id or custom plus faculty as id or custom plus department as id or custom plus qualification plus session) once grants 50 welcome credits exactly once, records a promotional ledger entry with reference welcome plus user id, repeats return current state with no extra grant.
- **AC-6**: Required fields validate on client and server with field keyed errors, only the owning student may read or write their onboarding data, completion and grant create audit events.
- **AC-7**: Empty search shows a no matches state with suggest action, removed hierarchy entries revalidate on complete, deep links to later steps redirect to the first gap.

## Decision

**Chosen option**: Option 1: Three step wizard with per step save and strict guard

The wizard uses three steps, per step Server Actions with shared Zod validation (a schema validator used on both client and server), shadcn search pickers (accessible UI primitives for searchable lists), a Prisma seed script for institutions, and an idempotent complete transaction (a retry safe database unit that grants credits only once).

## Feature design

**Data model sketch**:
- StudentProfile (one per User, cascade on user delete, created at signup with defaults): firstName required, lastName required, preferredLanguage default en, country default Cameroon, onboardingCompleted default false, onboardingStep default 1 (a hint only, gap derived from fields wins), referralSource optional and untouched by this wizard.
- AcademicProfile (one per User, cascade on user delete, created at signup with defaults): institutionId optional FK, facultyId optional FK, departmentId optional FK, programmeId optional FK, customInstitution optional text, customFaculty optional text (additive nullable, only if missing), customDepartment optional text (additive nullable, only if missing), qualification enum HND plus BACHELORS plus MASTERS plus PHD plus OTHER default BACHELORS, academicSession required text validated as YYYY/YYYY with start 2000 to 2030 and end equals start plus 1, preferredStyle default APA_7 allowed APA_7 plus Harvard plus MLA, preferredLanguage in step 3 wins on conflict with step 1.
- Institution: name globally unique, code globally unique, country, city optional, isVerified default false, parent of Faculty.
- Faculty: name unique per institution, FK institutionId cascade, parent of Department.
- Department: name unique per faculty, FK facultyId cascade, parent of Programme.
- Programme: name unique per department plus qualification, FK departmentId cascade, qualification enum, durationYears.
- CreditWallet: one per User, balance. CreditLedger: walletId FK, type PROMOTIONAL_CREDIT, amount 50, balanceAfter, referenceId unique per wallet plus type, description welcome grant.
- Uniqueness kept as in schema. No other structural change.

**State transitions**:
- onboardingStep: 1 then 2 then 3 then complete. Forward only on valid save. Direct visit to step 2 or 3 with earlier gap redirects to first gap. onboardingCompleted: false then true, set only by complete action in the same transaction as the credit grant. Once true, complete is read only and returns current state.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| savePersonalStep | Server Action | firstName:string (req), lastName:string (req), country:string (req), preferredLanguage:string (req) | onboardingStep, fieldErrors | session owner | 401 unauthenticated, 422 invalid |
| saveAcademicStep | Server Action | institutionId:string (opt), customInstitution:string (opt), facultyId:string (opt), customFaculty:string (opt), departmentId:string (opt), customDepartment:string (opt), programmeId:string (opt), qualification:enum (req), academicSession:string (req) | onboardingStep, fieldErrors | session owner | 401, 422, 404 hierarchy not found |
| savePreferencesStep | Server Action | preferredStyle:string (req), preferredLanguage:string (req) | onboardingStep, fieldErrors | session owner | 401, 422 |
| searchInstitutions | Server Action | query:string (opt), page:number (opt) | items id plus name plus code, hasMore | session owner | 401 |
| searchFaculties | Server Action | institutionId:string (req), query:string (opt), page:number (opt) | items, hasMore | session owner | 401, 404 institution missing |
| searchDepartments | Server Action | facultyId:string (req), query:string (opt), page:number (opt) | items, hasMore | session owner | 401, 404 faculty missing |
| searchProgrammes | Server Action | departmentId:string (req), query:string (opt), page:number (opt) | items, hasMore | session owner | 401, 404 department missing |
| suggestInstitution | Server Action | name:string (req), city:string (opt) | fills customInstitution into academic form, stored only on saveAcademicStep | session owner | 401, 422 |
| suggestFaculty | Server Action | name:string (req) | fills customFaculty into academic form, stored only on saveAcademicStep | session owner | 401, 422 |
| suggestDepartment | Server Action | name:string (req) | fills customDepartment into academic form, stored only on saveAcademicStep | session owner | 401, 422 |
| completeOnboarding | Server Action | none (uses saved profile) | onboardingCompleted, walletBalance, redirectTo | session owner | 401, 409 already completed returns state, 422 incomplete |

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):
| Action | Value produced / displayed | Source |
|---|---|---|
| savePersonalStep | onboardingStep | Derived from validation success, stored in StudentProfile column |
| saveAcademicStep | institutionId, facultyId, departmentId, programmeId | Input picker selection, validated against Institution plus Faculty plus Department plus Programme columns |
| saveAcademicStep | customInstitution, customFaculty, customDepartment | Input suggest text, stored in AcademicProfile columns |
| saveAcademicStep | qualification, academicSession | Input params, qualification from enum, session validated by pattern YYYY/YYYY in shared Zod module |
| savePreferencesStep | preferredStyle | Input param, allowed APA_7 plus Harvard plus MLA |
| search actions | items plus hasMore | DB columns filtered by parent id plus case insensitive contains on name, sorted by name, page starts at 1 size 20, all levels return id plus name plus code |
| completeOnboarding | onboardingCompleted plus redirectTo | Derived from required predicate valid (institution as id or custom plus faculty as id or custom plus department as id or custom plus qualification plus session), redirectTo constant /dashboard, already completed checked first before stale id checks |
| completeOnboarding | walletBalance plus ledger entry | CreditWallet balance column (created if missing at complete) plus CreditLedger new row in serializable transaction, amount fixed constant 50 in code, referenceId welcome plus user id |
| layout guard plus proxy | allow or redirect | StudentProfile onboardingCompleted column read by session user id |

**Key invariants**:
- One StudentProfile and one AcademicProfile per user at most.
- Faculty belongs to exactly one institution, department to exactly one faculty, programme to exactly one department.
- Institution name and code globally unique, child names unique per parent.
- onboardingCompleted true implies all required fields valid and welcome ledger entry exists exactly once per wallet.
- Custom text present implies no linked id at that level, linked id present implies custom text empty at that level.
- Academic picks always satisfy parent links at complete time, stale ids rejected with 422.
- Changing a parent clears its children (new institution clears faculty plus department plus programme, new faculty clears department plus programme).
- Field gap derived from stored values wins over stored onboardingStep, stored step is a resume hint only.
- Field errors use field keyed codes with short messages in English.
- Already completed returns current state with no further checks and no extra grant.

**Security model**:
- Only the owning student may call save, search, suggest, and complete, enforced by Better Auth session (a login session that identifies the caller) user id match on every action.
- Admins read only for support, no admin edit in this build.
- Institution search returns id plus name plus code plus city only, no internal flags beyond isVerified where needed for display.
- Audit events use AuditEvent table with action names onboarding.completed plus credits.welcome.granted plus onboarding.suggestion.created, with PII kept out of log details.
- Guard allowlist covers onboarding plus auth plus public plus auth api, profile read per request with short cache, no redirect loop.
- Rate handling reuses existing auth limits, search results cached briefly per parent plus query.

**Configuration required**:
- No new env vars. Welcome amount is a fixed constant WELCOME_CREDITS set to 50 in code to match the wallet starting balance, recorded in ledger metadata.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: new account completes three steps with seeded picks and lands on dashboard with 50 credits, verifies **AC-1**, **AC-3**, **AC-5**
- Resume path: refresh after step 1 returns to step 2 with step 1 values intact, verifies **AC-2**
- Suggest path: missing school suggested as custom text, completion succeeds, admin review pending, verifies **AC-4**
- Failure case: double click complete grants once, second call returns completed state, verifies **AC-5**
- Failure case: stale faculty id removed before complete triggers repick error, verifies **AC-7**
- Auth/permission: other user id or signed out caller receives unauthenticated, verifies **AC-6**

## Build plan

Ordered as thin Tracer Bullet slices (small working end to end increments), each tagged to its AC.

1. Add conditional migration for customFaculty plus customDepartment nullable text and write the Cameroonian seed script with institutions plus faculties plus departments plus programmes, satisfies **AC-3**, **AC-4**
2. Build wizard shell plus progress plus personal step with shared Zod module and per step save plus resume redirect, satisfies **AC-2**
3. Build academic step with filtered search pickers plus paging plus suggest dialog plus parent revalidation, satisfies **AC-3**, **AC-4**, **AC-7**
4. Build preferences step plus complete transaction with idempotent welcome grant plus server layout guard plus proxy guard plus dashboard routing, satisfies **AC-1**, **AC-5**
5. Harden validation errors plus audit events plus empty states plus double submit safety plus rate reuse, satisfies **AC-6**, **AC-7**

## Consequences

**Positive**:
- Later features receive complete academic context to match templates and rules.
- Resume plus suggest removes the main abandonment causes.
- Single grant path with unique reference keeps the ledger clean.

**Negative / tradeoffs**:
- Strict dashboard lock adds guard code in two places that must stay in sync.
- Seed list needs curation and updates as schools change, an ongoing content cost.
- Extra suggest text needs later admin review or the shared list drifts from custom entries.

**Neutral**:
- Adds a small nullable migration only if custom faculty and department columns are missing, else schema untouched.
- Search pickers set a reusable pattern for later template and project pickers.
