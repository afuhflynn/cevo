# 0020. Dashboard catalog journey polish

**Date**: 2026-11-15
**Status**: In Progress

_Build spec. Decision record lives in `rationale.md`._

## Summary

This spec remakes the look of the dashboard path so stats plus catalog plus archived plus detail read as one calm family. It keeps all server logic from spec 0005 exactly as is and only remakes screens in `app/dashboard` using the frozen foundation from spec 0017 plus the Roboto wiring from spec 0019. Search plus filter plus pagination stay in the URL and feel instant, card actions confirm kindly, and every loading pause shows a skeleton that mirrors the coming layout.

## Requirements

**User stories**:
* As a student, I want stats that scan fast so I know where my work stands
* As a student, I want search plus filter plus pagination that feel instant with the URL reflected so I can find any report and share the view
* As a student, I want duplicate plus archive plus restore to confirm kindly so I never lose work by accident
* As a student, I want kind skeletons plus empty plus error views so I always know the next action

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
* **AC-1**: Stats header shows four cards for active projects plus credit balance plus recent activity plus completion using current reads, completion is the rounded mean of progressPercent across active projects and zero when none exist, recent activity counts the 10 feed rows, each card uses the foundation card pattern in light and dark themes
* **AC-2**: Catalog search plus status filter plus pagination live in the URL through nuqs with 200 ms debounced search, search matches title plus programme name case sensitively neutral, status options are all plus DRAFT plus PLANNING plus IN_PROGRESS plus READY_FOR_REVIEW plus COMPLETED with archived ignoring status, page size 12, out of range page clamps to 1, placeholder data keeps the old page visible while the next page loads, archived uses its own search plus page state
* **AC-3**: Duplicate plus archive plus restore run from the card menu through a shadcn dialog with title plus consequence plus cancel plus confirm, dialog copy lives in code beside each card, duplicate names the copy Copy of title capped at 200 chars, pending disables dialog buttons so double submit is ignored, success shows a toast with 4 second duration and the dashboard projects plus activity caches refresh
* **AC-4**: Loading uses skeletons that mirror the coming layout, stats skeleton mirrors four cards, catalog skeleton shows six cards as a preview window of the 12 per page, detail skeleton mirrors the header, spinner lives only on the dialog confirm plus the form submit control
* **AC-5**: Empty plus error states guide the next action, empty plus alert copy lives in code beside each view, blank shows New project, filtered shows Clear filters, archived empty shows Restore hint, failures show alert plus refetch retry, toasts only for transient notices
* **AC-6**: Project detail shows a summary header with status plus progress plus updated plus open plus done task counts, with Open workspace plus Back to dashboard actions, routes use the workspace plus dashboard constants, missing or unowned maps to not found
* **AC-7**: Milestones feed stays beside the catalog with 10 recent rows from the current activity read, each row maps action to label plus icon plus workspace link in code, credit card shows balance plus a buy credits link to billing, balance at 20 or less shows the kind low note
* **AC-8**: Motion stays inside the foundation allow list with each use approved here, no new motion library and no new visual pattern, both themes read well

## Decision

**Chosen option**: Option 2: Replace presentation directly

The polish remakes only screens in `app/dashboard` plus `components/dashboard` on the frozen base, with zero change to logic or schema.

## Feature design

**Data model sketch**:
Target reuses spec 0001 with zero migration. Project (many per User): title required, status enum, archived flag, progress value, updatedAt. CreditWallet (one per User): balance. CreditLedger (many per User): amount plus reference plus createdAt, welcome row kept. AuditEvent (many per User): action plus target plus createdAt for duplicate plus archive plus restore. No new tables, no new columns, no new indexes.

**State transitions**:
Catalog view states: loading then ready then empty or error, filter change resets page to 1. Card action states: idle then dialog open then pending then toast plus refresh, cancel returns to idle with no write. Detail states: loading then header then not found for missing or unowned. Archived states mirror active with restore in place of archive. No change to project lifecycle or credit lifecycle.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `getDashboardStats` | server read | userId:string (req) | active count, credit balance, activity count, completion | session owner | 401 |
| `getDashboardCatalog` | server read | search:string (opt), status:string (opt), page:number (opt), archived:boolean (opt) | items, totalPages, page | session owner | 401 |
| `getDashboardActivities` | server read | userId:string (req) | 10 rows of type plus title plus time | session owner | 401 |
| `GET /api/dashboard/projects` | GET | search, status, page, archived | items, totalPages | session owner | 401 |
| card duplicate | client plus server | projectId:string (req) | new project id, toast, refresh | session owner | 401, 404 |
| card archive plus restore | client plus server | projectId:string (req) | archived flag, toast, refresh | session owner | 401, 404 |

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):
| Action | Value produced / displayed | Source |
|---|---|---|
| stats read | active count plus completion | Project rows filtered by owner plus archived false limited to 500, completion is the rounded mean of progressPercent and zero when none exist |
| stats read | credit balance plus buy link | CreditWallet balance column plus billing route constant, low note at 20 or less in code |
| catalog read | items plus totalPages plus page | Project rows filtered by search over title plus programme name plus status plus archived, page size fixed constant 12 in code, page clamped to 1 when out of range |
| catalog read | search plus status plus page in URL | nuqs query state with 200 ms debounce on search, archived keeps its own state |
| card actions | dialog copy plus toast copy | Static copy in code beside each card, duplicate names the copy Copy of title capped at 200 chars, pending disables dialog buttons, success toast 4 second duration |
| card actions | refreshed list plus feed | TanStack cache invalidate for dashboard projects plus activity keys in code |
| detail read | status plus progress plus updated plus task counts | Project columns plus open plus done task counts from the catalog read, per project credit spend is out of scope since the ledger carries no project link, missing or unowned maps to not found |
| milestones read | 10 rows plus time plus link | getDashboardActivities limited to 10, link routes to workspace |
| states display | skeleton plus empty plus alert copy | Static copy in code, skeleton mirrors coming layout, spinner only inside submit control |

**Key invariants**:
* No schema or server logic change, polish is screens plus states only
* Every labeled control uses the field wrapper with label plus input plus optional description plus inline error
* Filter change resets page to 1, page clamps to 1 when out of range
* Dialog confirm gates every duplicate plus archive plus restore, toast confirms after
* List loading uses skeleton that mirrors coming layout, spinner only inside the submit control, toasts only for transient notices
* Foundation primitives only from spec 0017, no new card or dialog or skeleton or toast style
* Search input uses 200 ms debounce, status uses select, pagination uses shadcn pagination
* Archived catalog mirrors active with restore in place of archive
* Firecrawl per page notes guide the build at build time, no links ship in this spec
* Roboto body from spec 0019 stays, serif stays for headings and stat values, mono stays for code

**Security model**:
Only the owning student may read stats plus catalog plus detail plus milestones, enforced by session user id match on every read. Signed out maps to sign in, other user maps to not found. Missing project maps to not found, failed writes map to alert plus refetch retry. Admins read only for support, no admin edit in this build. Card writes check ownership before duplicate plus archive plus restore and write an audit row. This touches project titles plus credit balance (private account facts), so client trims search input, never logs ids, and server keeps owner scoping as today.

**Configuration required**:
No new env vars. Page size stays the fixed constant 12 in code. Activity feed stays the fixed constant 10 in code.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
* Happy path: student opens dashboard, sees four stat cards plus catalog plus milestones, searches plus filters plus pages with URL reflected, verifies **AC-1**, **AC-2**, **AC-7**
* Action path: duplicate plus archive plus restore each show dialog then toast then refreshed list, cancel writes nothing, verifies **AC-3**
* States path: slow load shows mirroring skeletons, blank shows New project, filtered empty shows Clear filters, failure shows alert plus retry, verifies **AC-4**, **AC-5**
* Detail path: open project shows header plus progress plus task counts plus workspace link, missing or unowned shows not found, verifies **AC-6**
* Auth path: signed out maps to sign in, other user maps to not found, verifies **AC-6**
* Motion path: all animation stays inside the approved allow list in both themes, verifies **AC-8**

## Build plan

Ordered as thin Tracer Bullet slices through the dashboard path with logic untouched, each tagged to its AC.

1. Stats header plus credit card with four cards plus buy credits link plus both themes pass, satisfies **AC-1**, **AC-7**
2. Catalog shell plus search plus filter plus pagination with nuqs URL state plus 200 ms debounce plus placeholder data plus archived twin, satisfies **AC-2**
3. Card grid plus detail header with summary plus progress plus task counts plus workspace links plus not found, satisfies **AC-6**
4. Dialog confirms plus toasts plus cache refresh for duplicate plus archive plus restore, satisfies **AC-3**
5. Skeletons plus empty plus error pass with mirroring layouts plus alert plus retry plus motion allow list check plus Firecrawl per page notes applied at build time, satisfies **AC-4**, **AC-5**, **AC-8**, **AC-7**

Motion allow list approval (only these may ship, nothing else without a new decision):
* Overlay open and close fade plus scale from primitive defaults for card menu plus dialog
* Loading shimmer and pulse on skeleton, spin on spinner
* Duration around 100 to 200 milliseconds for control transitions
* No page transition choreography, no layout animation, no spring physics, no scroll linked effects, no looping decorative animation, no new motion library

## Consequences

**Positive**:
* Dashboard plus archived plus detail read as one family, so trust carries from stats to detail
* URL reflected search plus filter makes views shareable and back button safe
* Kind dialogs plus toasts remove accidental loss, the top support fear for student work

**Negative / tradeoffs**:
* Larger presentation diff across dashboard plus archived plus detail needs careful review of cache refresh wiring
* Mirroring skeletons add markup per surface, small drift risk if card layout changes without updating its skeleton
* Firecrawl taste at build time can drift if each surface borrows a different pattern

**Neutral**:
* No migration, no new endpoints, no new env vars, no new libraries
* Font stays Roboto from spec 0019, no global visual change outside dashboard

## Follow-up

* [ ] Record approved motion uses above at build time so each use stays visible
* [ ] Apply Firecrawl per page notes at build time for dashboard plus archived plus detail, keep borrowed ideas inside the foundation card and dialog patterns
* [ ] Confirm page size 12 plus activity limit 10 feel right on small screens at build time
* [ ] Inngest v4 upgrade alongside the build (scanner flags 3.38.1 as vulnerable, demands 3.54.0 or later, npm latest is 4.26.2): install `inngest@4.26.2`, move both function triggers into the options object as `triggers` in `inngest/functions/file-extract.ts` plus `inngest/functions/export-run.ts`, add `isDev` to the client in `lib/inngest.ts` so local work uses the dev server while production stays in cloud mode with the signing key, keep `serve` in `app/api/inngest/route.ts` as is, no EventSchemas plus no middleware plus no serve options in use so nothing else changes, then typecheck plus boot the dev server with the Inngest dev server to confirm both functions register
* [ ] Enroll workspace guardrails plus public site polish as separate specs when ready

## Rationale

Reasoning and options: see `rationale.md`.
