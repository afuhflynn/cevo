# 0019. Auth pages polish

**Date**: 2026-11-15
**Status**: In Progress

_Build spec. Decision record lives in `rationale.md`._

## Summary

This spec remakes the look of the auth path so all five screens feel like one calm family. It keeps all auth logic and stored data exactly as today and only remakes screens plus the app font. Body text across the app moves to Roboto (a clean sans face from Google Fonts, loaded with next/font) to echo the Docs feel, while serif stays for long reading and mono stays for code.

## Requirements

**User stories**:
* As a student, I want sign in plus sign up plus forgot plus reset plus verify to look like one family so I trust each step
* As a student, I want password rules shown live with a meter and a checklist so I know what remains before I can submit
* As a student, I want errors that name the issue and the next action so I can recover without guessing
* As a student, I want clear loading plus clear inbox confirm plus kind expired token views so I never stare at a blank card

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
* **AC-1**: Sign in plus sign up plus forgot password plus reset password plus verify and inbox confirm share one card family in `app/(auth)`, centered column max width medium with page padding plus form gap plus base radius plus same alert slot plus centered footer link, single column under large breakpoint with brand aside at large and up, same tokens in light and dark themes
* **AC-2**: Body text across the app uses Roboto weights 400 plus 500 plus 700 with latin subset through `app/layout.tsx` plus `app/globals.css` via next/font/google with display swap and system fallback, serif stays Source Serif 4 for long reading surfaces, mono stays JetBrains Mono for code, both themes read well with build plus manual pass confirming no layout shift
* **AC-3**: Sign up plus reset password boxes show a hint plus a live strength meter with 4 levels plus a checklist for length 12 to 128 plus upper case plus lower case plus number plus symbol from a fixed symbol set, submit stays blocked with disabled plus aria busy until all checklist items pass, client gate only with no schema change, sign in stays exempt with no checklist gate so old passwords still sign in
* **AC-4**: Every password box offers show and hide with an eye button at the input end labeled Show password and Hide password, autocomplete current password on sign in plus new password on sign up plus reset, full keyboard use with visible focus, state stays per field
* **AC-5**: Field errors show inline under each control plus page or card errors show an alert with title plus description plus a next action per the error copy table in Feature design, toasts only for transient resend confirm with 4 second duration
* **AC-6**: Submit wait shows a spinner inside the submit control plus disables inputs plus links plus buttons in the form, token read wait shows a skeleton card mirroring title plus two field rows plus button inside Suspense, toasts only for transient resend confirm
* **AC-7**: Sign up success shows an inbox confirm with mail icon plus the address plus expiry note tied to real Verification lifetime of 24 hour plus resend with 60 second client cooldown and 429 copy plus go to sign in, sign in shows verify and error notices from query state per the notice copy table with recovery links
* **AC-8**: Reset with missing token shows an alert plus a request new link action to forgot password with no token precheck endpoint, invalid or expired resolves at submit with 401 mapped to the same expired view, skeleton shows while search params resolve so loading never flashes as expired
* **AC-9**: Safe next accepts only local paths starting with a single slash and never protocol relative or outside values which fall back to onboarding, billing targets keep packageId merge so paid entry still lands on the intended billing view with package kept
* **AC-10**: Motion stays inside the foundation allow list from spec 0017 with each use approved here, no new motion library and no new animation pattern

## Decision

**Chosen option**: Option 2: Replace presentation directly

The polish remakes only screens in `app/(auth)` plus the global font wiring, with zero change to logic or stored data.

## Feature design

**Data model sketch**:
Target reuses spec 0001 with zero migration. User (one per account): name required, email unique required, emailVerified flag, role default STUDENT, isActive flag. Session (many per User): token unique, expiresAt. Account (many per User): providerId plus accountId unique pair, password hash optional. Verification (per identifier): identifier plus value unique pair, expiresAt. No new tables, no new columns, no new indexes.

**State transitions**:
Anonymous visit to sign in or sign up. Sign up success then inbox confirm then verify link then sign in. Sign in success then onboarding or safe next target. Forgot submit then inbox confirm then reset link then new password then sign in. Reset token states: valid then form, missing or invalid or expired then kind expired view with fresh link action. Resend creates a fresh verification mail with same callback. No change to session or verification lifecycles.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `authClient.signIn.email` | client call | email:string (req, trimmed), password:string (req) | session, redirect target | public | 401, 429 |
| `authClient.signUp.email` | client call | name:string (req, trimmed), email:string (req, trimmed), password:string (req), callbackURL:string (req) | created flag, inbox confirm view | public | 422, 429 |
| `authClient.sendVerificationEmail` | client call | email:string (req, trimmed), callbackURL:string (req) | resent flag | public | 429 |
| `authClient.requestPasswordReset` | client call | email:string (req, trimmed) | inbox confirm view | public | 429 |
| `authClient.resetPassword` | client call | token:string (req), password:string (req) | done flag | public token | 401, 422 |
| page read `loadSignInSearchParams` | server read | verified flag, error code | notice copy plus link | public | none |
| page read `loadResetPasswordSearchParams` | server read | token, expired flag | form or expired view | public | none |

**Error copy** (code to alert title plus description plus next action, copy lives in code beside each form):
| Code | Title | Description plus next action |
|---|---|---|
| 401 on sign in | Could not sign you in | Incorrect mail or password, check both and try again or reset password |
| 401 on reset submit | Link no longer works | Request a new link from forgot password and try again |
| 422 | Check the highlighted fields | Fix the inline errors and post again |
| 429 | Too many attempts | Wait a moment then try again, resend respects a 60 second cooldown |
| empty field | Missing detail | Fill the highlighted field to continue |
| invalid mail | Mail looks off | Use a valid mail address and try again |

**Notice copy** (query state to notice on sign in, copy lives in code beside the notice):
| Query | Notice | Action |
|---|---|---|
| verified flag | Account verified | Sign in to continue |
| expired error | Link expired | Request a new link |
| invalid error | Link invalid | Request a new link |

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):
| Action | Value produced / displayed | Source |
|---|---|---|
| sign in submit | redirect target | safe next param validated as local path plus packageId kept when billing target lacks it, fallback constant /onboarding |
| sign in submit | error alert plus inline error | friendly copy derived from auth error code in code, field error tied to email and password inputs |
| sign up submit | inbox confirm address plus expiry note | trimmed email input plus fixed 24 hour copy in code |
| sign up submit | field errors | trimmed name plus email plus password inputs checked in client before call |
| password boxes | meter plus checklist state | derived live from password input value in client with 4 levels from length plus variety, length 12 to 128 plus upper plus lower plus number plus fixed symbol set shown in the hint, sign in exempt |
| show and hide | visible value | local per field boolean in client, no stored value |
| forgot submit | inbox confirm | trimmed email input, same confirm pattern as sign up |
| reset submit | done flag plus sign in link | token from search params plus new password input, success routes to sign in |
| reset read | form or expired view | token plus expired flag from search params, missing or invalid maps to expired view with fresh link action |
| verify notice | notice copy plus recovery link | verified flag plus error code from search params, copy in code |
| loading | spinner plus skeleton | pending boolean in client for submit, Suspense fallback skeleton card for token read |
| font | body face plus fallback | Roboto weights 400 plus 500 plus 700 latin via next/font/google in `app/layout.tsx`, CSS variable consumed in `app/globals.css`, serif Source Serif 4 plus mono JetBrains Mono unchanged |
| forgot submit | inbox confirm neutrality | same confirm view for known plus unknown mail, address shown as typed only |
| resend | cooldown plus limit copy | 60 second client cooldown in code plus server 429 mapped to wait copy |

**Key invariants**:
* No schema or server logic change, polish is screens plus font only
* Every labeled control uses the field wrapper with label plus input plus optional description plus inline error
* Password submit stays blocked until full checklist passes, checklist is client gate only
* Every password box has its own show and hide control
* Page and card errors use alert with a next action, inline errors use field error, toasts only for transient notices
* Submit plus resend controls disable while pending, double post is ignored
* next value must be a local path, outside values fall back to /onboarding, packageId is kept only for billing targets
* Skeleton mirrors the coming card for token reads, spinner lives only inside the submit control
* Foundation primitives only from spec 0017, no new input or dialog or skeleton or toast style
* Shared look ships through one AuthCard shell plus one PasswordField control, sign in uses the simple show and hide variant with no checklist gate
* Meter uses 4 levels derived from length plus variety in client, symbol set fixed in code and shown in the hint
* Disabled submit uses disabled plus aria busy plus described error, focus stays visible
* Mail is trimmed plus lowercased, name is trimmed length 2 to 100, password is never trimmed
* Forgot plus resend copy stays neutral and never signals whether an account exists
* Token travels only in query to the page and in the submit body, never logged and never linked outside origin
* Skeleton shows while search params resolve, expired view only after resolve or 401 at submit
* next must start with a single slash and billing merge keeps packageId only for billing targets
* Firecrawl per page notes guide the build at build time, no links ship in this spec

**Security model**:
All five screens are public with no session required. Only the owning flow may use its token, reset token is single use with expiry enforced by current auth logic. Rate limits stay as today through current guards. Audit and session handling stay unchanged. This touches mail address plus password (private account facts), so client trims input, never logs secrets, and server keeps Argon2id plus sliding expiry as today. Forgot and resend replies stay neutral so no response reveals whether an account exists. Resend uses a 60 second client cooldown plus server 429 to slow spam. Token stays in query to the page and travels in the submit body only, nothing logs it. Signed in visits route per current guards to onboarding or dashboard.

**Configuration required**:
No new env vars. Font loads via next/font/google in `app/layout.tsx` with Roboto weights 400 plus 500 plus 700 and latin subset, display swap, and a system fallback stack consumed as a CSS variable in `app/globals.css`.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
* Happy path: new account signs up then sees inbox confirm then verifies then signs in then lands on safe next target, verifies **AC-1**, **AC-7**, **AC-9**
* Password path: weak password blocks submit with checklist guidance, strong password enables submit, eye toggles each box, verifies **AC-3**, **AC-4**
* Font path: cold load shows Roboto body with serif and mono intact in light and dark with no layout shift, verifies **AC-2**
* Validation path: empty field shows inline error plus alert with next action in both themes, verifies **AC-5**
* States path: submit shows spinner with form disabled, token read shows skeleton, expired token shows alert plus fresh link, verifies **AC-6**, **AC-8**
* Redirect path: billing entry with packageId lands on billing with package kept, outside next falls back to onboarding, verifies **AC-9**
* Auth/permission: anonymous can open all five screens, signed in visit routes per current guards, verifies **AC-1**
* Lockout guard: old password missing a symbol still signs in, while sign up plus reset block until full checklist passes, verifies **AC-3**
* Enumeration guard: forgot with unknown mail shows the same inbox confirm as known mail, verifies **AC-7**
* Redirect guard: protocol relative plus outside next values fall back to onboarding with package kept only for billing, verifies **AC-9**

## Build plan

Ordered as thin slices through the auth path with logic untouched, each tagged to its AC.

1. Font plus shell plus card family with Roboto wiring in layout plus globals plus shared card spacing plus footer link pattern plus both themes pass, satisfies **AC-1**, **AC-2**, **AC-10**
2. Shared PasswordField plus AuthCard shell with meter plus checklist plus eye plus autocomplete variants, sign in uses the simple variant with no gate, satisfies **AC-3**, **AC-4**
3. Forgot plus reset forms plus token read with skeleton plus kind expired view plus fresh link action, satisfies **AC-8**, **AC-6**
4. Inbox confirm plus verify notices with mail icon plus address plus 24 hour note plus resend plus go to sign in, satisfies **AC-7**
5. Errors plus loading plus motion allow list pass with error copy plus notice copy tables plus alert plus inline pattern plus spinner plus disabled state plus both themes manual check with dark contrast plus font perf plus Firecrawl per page notes applied at build time, satisfies **AC-5**, **AC-6**, **AC-10**, **AC-1**, **AC-9**

Motion allow list approval (only these may ship, nothing else without a new decision):
* Overlay open and close fade plus scale from primitive defaults for any popover use
* Loading shimmer and pulse on skeleton, spin on spinner
* Duration around 100 to 200 milliseconds for control transitions
* No page transition choreography, no layout animation, no spring physics, no scroll linked effects, no looping decorative animation, no new motion library

## Consequences

**Positive**:
* All auth screens read as one family, so trust carries from sign up through reset
* Live password help cuts weak submits and support confusion
* Roboto body gives the Docs calm feel across the app with almost no code churn

**Negative / tradeoffs**:
* Stricter client checklist on sign up plus reset may annoy users with strong old passwords that lack a symbol, sign in stays exempt so no lockout, while server still accepts length only on other paths
* Global font swap touches every screen, so visual review must cover onboarding plus dashboard plus admin plus public plus workspace
* Firecrawl ideas add build time taste work and can drift if each page borrows a different pattern

**Neutral**:
* No migration, no new endpoints, no new env vars, no new libraries
* Verify states reuse current verification flow with no lifecycle change

## Follow-up

* [ ] Record approved motion uses above at build time so each use stays visible
* [ ] Apply Firecrawl per page notes at build time for sign in plus sign up plus forgot plus reset plus verify, keep borrowed ideas inside the foundation card and input patterns
* [ ] Confirm Roboto weights and fallback stack in light and dark on low end hardware
* [ ] Prove forgot neutrality plus resend cooldown plus token handling with dedicated test scenarios at build time
* [ ] Enroll dashboard catalog journey polish plus workspace guardrails plus public site polish as separate specs when ready

## Rationale

Reasoning and options: see `rationale.md`.
