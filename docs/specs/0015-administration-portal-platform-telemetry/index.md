# 0015. Administration portal and platform telemetry

**Date**: 2026-11-14
**Status**: In Progress

## Summary

Cevo already ships a partial admin area for templates and billing. This spec extends it into one ops home where admins triage the platform each day. The home shows live counts for registrations and revenue and AI spend and open tickets and pending templates, plus alerts when money totals disagree, with links into each queue. Every admin action writes an audit row (a permanent log of who did what).

## Requirements

**User stories**:
* As an administrator, I want one home with live counts and alerts so that I can triage users and payments and AI spend and templates and tickets in one pass.
* As an administrator, I want to reconcile payments against ledger entries so that support questions have exact answers.
* As an administrator, I want to review audit events so that every sensitive change has proof.
* As a super admin, I want role change and package control limited to my role so that blast radius stays small.

**Acceptance criteria**:
* **AC-1**: Admin home at `/admin` shows KPI cards (new users last 7 days by `User.createdAt`, revenue last 7 days as sum of `Payment.amountXaf` where status is SUCCESSFUL by `completedAt`, AI tokens and cost last 7 days by `AiUsage.createdAt`, open tickets where status is OPEN or IN_PROGRESS, pending templates as two labeled counts) plus mismatch alerts plus recent audit activity (20 newest first), with each card linking into its queue. Pending templates shows unpublished version count plus open draft count as separate lines so a draft linked to a template never merges into one number. Revenue never subtracts refunds silently; refunds appear as a separate ledger line.
* **AC-2**: Users queue lists name and masked email and role and active flag and institution and created date and live wallet balance, with case insensitive partial search on name or email and filters by role and active flag and institution id, paginated at 20 per page; detail shows full email plus wallet plus last 10 payments plus last 10 tickets. Mask format is first char of local part plus three stars plus full domain. Active flag comes from `User.isActive` (true means active, false means suspended).
* **AC-3**: Payments queue shows package and amount XAF and provider and status and user and ledger link and timestamps, with filters by status and provider and date; daily totals view uses UTC calendar days with zero tolerance, proves confirmed payment sum equals allocated ledger sum, lists payment ids plus ledger refs on both sides, and raises the home alert only after a 15 minute grace past day close so late webhooks never cause a false alarm.
* **AC-4**: AI usage view shows per run rows (feature from wizard or assistant or review, model as stored text, tokens in, tokens out, cost estimate, user, project or the text No project, timestamp) plus 7 day totals by feature and by model, paginated at 20 per page. Cost sums show 2 decimals; date filters accept ISO dates interpreted in UTC.
* **AC-5**: Templates queue reuses existing admin template and draft pages, linked from the new home and nav, with pending drafts and unpublished versions surfaced as counts on the home.
* **AC-6**: Tickets queue shows status from OPEN or IN_PROGRESS or RESOLVED or CLOSED and priority from LOW or NORMAL or HIGH or URGENT and assignee and requester and subject and updated date, with filters by status and priority and assignee; detail shows the full message thread oldest first paged at 50 plus assign (admin user id or null to unassign, self assign allowed) plus close with optional reason text plus reopen which returns the ticket to IN_PROGRESS.
* **AC-7**: Audit viewer lists actor name plus email plus role and action from the admin vocab (for example user.role.change, user.status.change, payment.recheck, ticket.assign, ticket.close, ticket.reopen) and target type and target id and timestamp with filters by action and actor and date, paginated at 20 per page; every admin write in this slice creates an audit row. Reads never create audit rows so detail views cannot flood the log. Denied requests write an audit row with null actor when signed out and target set to the request path, and denial writes share the existing rate limits so the log cannot be spammed.
* **AC-8**: Signed out users redirect to sign in with a next param pointing back at the admin path; students receive 403 (forbidden) plus an audit row on denial; ADMIN (standard admin) reads all areas and runs ops actions (recheck payment, assign and close and reopen ticket, suspend and activate user); SUPER_ADMIN (elevated admin) additionally changes roles and edits packages. Self role change is blocked with 403.
* **AC-9**: Empty queues show guidance text naming the next action, first load and any refetch slower than 300ms show skeletons (placeholder loading blocks), stale overview data older than 5 minutes shows a freshness badge with last computed time, and overview aggregates refresh at most every 60 seconds via cache. Cache keeps the prior value on error and updates last computed time only on success.
* **AC-10**: All dates render in the viewer timezone from the admin profile with fallback UTC; currency stays fixed XAF from payment rows formatted with digit grouping and zero decimals; AI cost shown comes from the stored estimate column with 2 decimals, never recomputed in the UI.

## Decision

**Chosen option**: Option 1: Extend current admin with live aggregates

Build the portal as an extension of the current admin tree with live aggregate queries and short cache. Reuse all existing tables with no schema change.

## Feature design

**Data model sketch**:

Reuse only, no new tables, no migration. Target stays as confirmed.

* `User`: id, name, email, role (STUDENT, ADMIN, SUPER_ADMIN), isActive bool where true means active and false means suspended, createdAt. Relations: 1 to N Payment, 1 to 1 CreditWallet, 1 to N SupportTicket as requester, 1 to N AuditEvent as actor.
* `Payment`: id, userId FK, packageId FK, amountXaf int copied at start, creditsAllocated int, status (PENDING, SUCCESSFUL, FAILED, EXPIRED), provider, providerTransId unique where set, payerPhone, failureReason, expiresAt, webhookVerifiedAt, createdAt, completedAt. Relation: 1 to N CreditLedger via reference.
* `CreditWallet`: id, userId unique, balance int, updatedAt.
* `CreditLedger`: id, walletId FK, type, amount int, balanceAfter int, description, referenceId, metadata JSON, createdAt. Rows immutable, unique on wallet plus reference plus type.
* `AiUsage` and `AiAssistRun`: id, userId FK, projectId FK nullable, feature (wizard, assistant, review), model, tokensIn int, tokensOut int, costEst decimal, createdAt.
* `ProjectTemplate`: id, title, scope ids nullable, qualification, projectType, isOfficial, isActive. `TemplateVersion`: id, templateId FK, version int, isPublished bool, publishedAt, unique template plus version. `TemplateDraft`: id, templateId nullable FK, payload JSON, status (open, applied, discarded), createdBy, createdAt.
* `SupportTicket`: id, requesterId FK, assigneeId FK nullable holding an admin user id, status from TicketStatus (OPEN, IN_PROGRESS, RESOLVED, CLOSED), priority free text with convention LOW, NORMAL, HIGH, URGENT, subject, updatedAt. `SupportMessage`: id, ticketId FK, authorId FK, body, createdAt ordered oldest first.
* `AuditEvent`: id, actorId FK, action text, targetType text, targetId text, details JSON, createdAt. Index on action plus createdAt and actor plus createdAt.

**Build note (0015 implementation, 2026-11-14)**: real columns differ from the sketch and the build maps them: AiUsage uses operationType, modelName, inputTokens, outputTokens, providerCostUsd; SupportTicket uses userId plus new assigneeId (added by migration in this slice, engineer approved), SupportMessage uses senderId, isAdmin, message; AuditEvent uses userId nullable. Institution filter joins via AcademicProfile.institutionId. Reads never write audit rows per AC-7; the security model line about detail view audit is superseded by AC-7.

**State transitions**:

Ticket: OPEN to IN_PROGRESS to RESOLVED to CLOSED; CLOSED is terminal; reopen returns the ticket to IN_PROGRESS through the explicit reopen action, never silent. TemplateDraft: open to applied or open to discarded, exactly once. TemplateVersion: draft to published exactly once with publishedAt set once. Payment states stay as decided in spec 0014 and are never altered here.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/admin/overview | GET | none | KPI counts plus sums plus mismatch flag plus lastComputedAt | ADMIN, SUPER_ADMIN | 401, 403 |
| /api/admin/users | GET | q:text (opt), role:text (opt), status:text (opt), institutionId:text (opt), page:int (opt) | user page 20 per page with masked email | ADMIN, SUPER_ADMIN | 401, 403 |
| /api/admin/users/:id | GET | id:path (req) | full user plus wallet plus recent payments plus tickets | ADMIN, SUPER_ADMIN | 401, 403, 404 |
| /api/admin/users/:id/role | POST | role:text (req) | updated user | SUPER_ADMIN only, self change blocked 403 | 401, 403, 404, 422 |
| /api/admin/users/:id/status | POST | isActive:bool (req) | updated user | ADMIN, SUPER_ADMIN | 401, 403, 404, 422 |
| /api/admin/payments | GET | status:text (opt), provider:text (opt), from:text (opt), to:text (opt), page:int (opt) | payment page with ledger link | ADMIN, SUPER_ADMIN | 401, 403 |
| /api/admin/payments/:id | GET | id:path (req) | payment plus ledger entries plus webhook events | ADMIN, SUPER_ADMIN | 401, 403, 404 |
| /api/admin/payments/:id/recheck | POST | id:path (req) | refreshed status via server side provider query | ADMIN, SUPER_ADMIN | 401, 403, 404 |
| /api/admin/reconcile/daily | GET | date:text (req) | confirmed sum plus allocated sum plus diff plus row ids | ADMIN, SUPER_ADMIN | 401, 403, 422 |
| /api/admin/ai-usage | GET | feature:text (opt), model:text (opt), from:text (opt), to:text (opt), page:int (opt) | run page plus 7 day totals | ADMIN, SUPER_ADMIN | 401, 403 |
| /api/admin/tickets | GET | status:text (opt), priority:text (opt), assigneeId:text (opt), q:text (opt), page:int (opt) | ticket page | ADMIN, SUPER_ADMIN | 401, 403 |
| /api/admin/tickets/:id | GET | id:path (req) | ticket plus message thread | ADMIN, SUPER_ADMIN | 401, 403, 404 |
| /api/admin/tickets/:id/assign | POST | assigneeId:text (req) | updated ticket | ADMIN, SUPER_ADMIN | 401, 403, 404, 422 |
| /api/admin/tickets/:id/close | POST | reason:text (opt) | closed ticket | ADMIN, SUPER_ADMIN | 401, 403, 404, 409 |
| /api/admin/tickets/:id/reopen | POST | id:path (req) | ticket set to IN_PROGRESS | ADMIN, SUPER_ADMIN | 401, 403, 404, 409 |
| /api/admin/audit | GET | action:text (opt), actorId:text (opt), from:text (opt), to:text (opt), page:int (opt) | audit page newest first | ADMIN, SUPER_ADMIN | 401, 403 |

Existing template and package admin APIs stay as decided in specs 0011 and 0014 and are linked from the new nav, not rebuilt.

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Overview KPIs | new users, revenue sum, token sums, open tickets, pending templates | DB columns via live aggregate queries over User, Payment, AiUsage, SupportTicket, TemplateVersion, TemplateDraft |
| Mismatch alert | diff flag plus row ids | Derived from daily confirmed Payment sum versus allocated CreditLedger sum for that date |
| Freshness badge | lastComputedAt | Derived at query time, cached value timestamp |
| User list | masked email | DB column User.email masked server side in list mapper |
| User detail | full email, balance, history | DB columns User.email plus CreditWallet.balance plus Payment and Ticket rows |
| Payment list | ledger link | DB column Payment id joined to CreditLedger reference |
| AI totals | cost sum, token sums | DB columns AiUsage costEst plus tokensIn plus tokensOut grouped by feature and model |
| Ticket detail | thread | DB columns SupportMessage rows ordered by createdAt |
| Audit list | actor, action, target | DB columns AuditEvent rows |
| Display dates | local date strings | Derived from stored UTC timestamps plus viewer timezone from admin profile |
| Display money | XAF amounts | DB column Payment.amountXaf, fixed currency, no conversion |

**Key invariants**:
* Ledger rows are never edited or deleted from this portal; corrections use the refund flow decided in spec 0014.
* Every write in this slice writes one AuditEvent with actor plus action plus target plus details; reads never write audit rows.
* Students never pass the admin guard; denial returns 403 and writes an audit row subject to existing rate limits.
* Role change and package edit accept SUPER_ADMIN only; ADMIN receives 403; self role change is blocked with 403.
* List pages never return full emails; detail alone returns full email.
* Overview cache lifetime is 60 seconds with last computed time updated only on success; mismatch alerts use UTC calendar days with zero tolerance plus a 15 minute grace past day close.
* Pagination default 20, max 100, newest first unless a queue defines otherwise.

**Security model**:

Routes under `app/admin` keep the existing server guard that reads role from the database on every request. APIs reuse the admin API guard that allows ADMIN and SUPER_ADMIN and denies others with 403 plus audit. SUPER_ADMIN alone may change roles and edit packages. PII (personal data) handling: lists mask emails to first letter plus domain, details reveal full email only to admins, and every detail view of a user writes an audit row. Compliance scope is platform PII plus money records; audit logs are required and immutable.

**Configuration required**:

No new env vars. Reuses current database URL, auth secret, and Fapshi keys from spec 0014. Cache uses existing framework cache, no new service.

**Critical test scenarios**:
* Happy path: admin lands on home, sees KPIs and no mismatch, drills into payments, opens a SUCCESSFUL row and sees its ledger entry, verifies **AC-1**, **AC-3**.
* Failure case: confirmed sum differs from allocated sum for a date, home shows mismatch banner with row ids, verifies **AC-1**, **AC-3**.
* Failure case: empty tickets queue shows guidance plus skeletons appear during slow load, verifies **AC-6**, **AC-9**.
* Auth: student requests `/admin/users`, receives 403 plus audit row; ADMIN requests role change, receives 403; SUPER_ADMIN succeeds, verifies **AC-8**.
* PII: user list returns masked emails, detail returns full email, verifies **AC-2**.

## Build plan

Ordered as thin thread first per the project Tracer Bullet approach (one working slice through all layers, then thicken). Each task names its ACs.

1. Thin thread: shared admin nav plus guarded overview page plus overview API with KPIs and mismatch flag and audit recent, satisfies **AC-1**, **AC-7**, **AC-8**, **AC-9**.
2. Users queue: list plus detail APIs with masking plus pages with search and filters plus role and status actions with audit, satisfies **AC-2**, **AC-8**.
3. Payments plus reconcile: list plus detail plus recheck plus daily totals APIs plus pages with filters plus mismatch banner wiring, satisfies **AC-3**, **AC-10**.
4. AI usage plus audit viewer: run list plus totals APIs plus pages plus audit list with filters, satisfies **AC-4**, **AC-7**, **AC-10**.
5. Tickets plus home polish: ticket list plus detail plus assign and close APIs plus thread UI plus nav links to existing template and package pages plus skeletons and empty and error and freshness states in both themes, satisfies **AC-5**, **AC-6**, **AC-9**.

## Consequences

**Positive**:
* One triage home replaces scattered pages, faster daily ops.
* Money proof sits beside payment rows, faster support answers.
* Every sensitive action leaves proof, stronger trust.

**Negative / tradeoffs**:
* Live aggregates add read load on each home visit; cached 60 seconds but still heavier than static pages.
* Seven sections in one slice is a large build; review load is high and sequencing matters.
* Masking plus per area auth adds mapper and guard code that must stay in sync with future tables.

**Neutral**:
* No schema change in this slice; a rollup table may follow when measured slowness appears.
* Existing template and billing admin pages stay as is, only linked from the new nav.

## Follow-up

* [ ] Measure home aggregate latency in production; if slow, enroll a rollup table spec.
* [ ] Decide CSV export scope for payments and audit; excluded here to keep slice tight.
* [ ] Decide ticket notification path (email to requester on assign and close); excluded here, needs email spec input.
* [ ] Confirm audit retention window with product (proposed 90 days visible plus archive after); retention job not in this slice.
* [ ] Confirm admin profile timezone field; spec falls back to UTC until the field exists.
* [ ] Add createdAt indexes for User, Payment, AiUsage, SupportTicket, and AuditEvent if missing, to keep masked search and aggregates fast.
