# 0006. Project creation wizard and conversational briefing

**Date**: 2026-11-13
**Status**: In Progress

## Summary

This spec designs the 5 step project creation wizard that turns a rough idea into an approved academic brief. Students answer structured prompts, the system synthesizes aims plus objectives plus questions plus methodology with OpenRouter models through the Vercel AI SDK (software kit for calling models), and approval provisions the chapter tree in one consistent write. A busy reader can trust this keeps brief quality gated, credit spend exact, and resume painless.


## Requirements

**User stories**:
* As a student, I want a guided 5 step creation flow so that I can move from idea to approved brief without guessing what to provide.
* As a student, I want structured prompts with clear sufficiency feedback so that I know when my answers are enough for synthesis.
* As a student, I want to preview and approve the AI brief so that chapters grow only from work I accept.
* As a student, I want credit cost shown before synthesis and refunded on failure so that spend feels fair.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
* **AC-1**: Wizard presents 5 steps in order: concept, academic context, conversational briefing, brief review, approval and provisioning; back travel is allowed, forward travel needs the current step complete; currentStep updates only from server after each save.
* **AC-2**: Conversational briefing uses structured prompts mapped to brief fields (background, problem statement, aim, objectives, research questions, scope, limitations, methodology, expected outcomes), each with free text answers and targeted follow ups where answers are thin; prompt copy lives in code constants; follow ups come from deterministic rules first (length plus count checks), model paraphrase only for tone; max 2 follow ups per field.
* **AC-3**: Synthesis is blocked until every core field meets its sufficiency rule enforced on server (background min 80 chars, problem min 80, aim min 40, objectives min 3 items each min 20, questions min 3 items, methodology min 80, scope min 40, outcomes min 40, limitations min 30); counts use trimmed Unicode length; the UI names which fields remain thin.
* **AC-4**: Synthesis calls OpenRouter through the Vercel AI SDK using `Output.object` (typed structured output) with a zod schema (validation shape), streams a live preview, and saves a versioned draft on ProjectBrief with model id plus token cost recorded.
* **AC-5**: Repeated syntheses create new BriefVersion rows; students can view prior versions and restore one as the current draft.
* **AC-6**: Approval runs one atomic database transaction that marks the brief approved, writes ProjectOutline, and creates initial ProjectSection chapters from the active template version; any failure rolls back all three with no partial tree.
* **AC-7**: Synthesis places a credit hold shown as an estimate before the run, debits on success, and auto releases or refunds on failure or expiry; insufficient balance blocks synthesis with a top up prompt.
* **AC-8**: Wizard suggests a template from qualification plus department, displays the suggestion with a reason, allows override, and locks the chosen template version at approval.
* **AC-9**: Only the owning student can write sessions, turns, drafts, and approvals; administrators get read only access for support; all denials return 403 and write an audit event.
* **AC-10**: Students can resume an unfinished wizard from dashboard or a resume banner; abandoned sessions expire on a schedule; empty plus loading plus error states guide next action in both themes.


## Decision

**Chosen option**: Option 1: Structured prompts with gated synthesis

The wizard uses 5 ordered steps with structured prompts, per field readiness flags, OpenRouter synthesis through AI SDK `Output.object` streaming, versioned drafts, and atomic approval provisioning.

**Implementation skills**: `ai-sdk` (`vercel/ai`, `.agents/skills/ai-sdk/`)

## Feature design

**Data model sketch**:
* `WizardSession` (id, userId FK required, projectId FK nullable until approval then backfilled, currentStep 1 to 5, status: draft, chatting, synthesizing, awaiting approval, approved, abandoned, expired, readiness JSON shaped as fieldKey to true or false plus checkedAt, suggestedTemplateId nullable, idempotencyKey text unique per session, expiresAt computed as updatedAt plus 30 days, currentBriefVersion int default 0)
* `WizardTurn` (id, sessionId FK cascade delete, fieldKey: background, problem, aim, objectives, questions, scope, limitations, methodology, outcomes, promptText, answerText, followupText nullable, isSufficient bool, createdAt), index on (sessionId, fieldKey, createdAt)
* `ProjectBrief` extension (existing columns kept; add version int default 1, modelId text nullable, synthesisCost int default 0, isApproved bool, approvedAt nullable)
* `BriefVersion` (id, briefId FK cascade delete, version int, payload JSON with the 9 brief fields, modelId text, tokenCost int, createdAt), unique (briefId, version)
* Reuse `Project` plus `ProjectOutline` plus `ProjectSection` with no shape change; approval writes them atomically
* Retention: expiresAt marks abandonment; prune job deletes sessions plus turns 90 days after approval; briefs plus versions kept permanently

**State transitions**:
WizardSession: draft to chatting to synthesizing to awaiting approval to approved; active states to abandoned on explicit discard; to expired when updatedAt passes expiresAt. Readiness recomputes on server after every turn save. ProjectBrief draft (isApproved false) to approved (isApproved true plus approvedAt set) exactly once per project. Concurrent synthesize plus approve is serialized per session: approve wins only when status is awaiting approval, else 409.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/wizard/sessions | POST | title:text (req), qualification:text (opt), department:text (opt), programme:text (opt) | sessionId, currentStep | session owner | 401 unauthenticated, 429 rate limited |
| /api/wizard/sessions | GET | status:text (opt), page:int (opt) | sessions page, resume flags | session owner | 401 unauthenticated |
| /api/wizard/sessions/:id | GET | sessionId:path (req) | session, turns page, readiness | session owner or admin read | 403 forbidden, 404 not found |
| /api/wizard/sessions/:id/turns | POST | fieldKey:text (req), answerText:text (req) | turnId, isSufficient, readiness | session owner | 422 invalid field, 429 rate limited |
| /api/wizard/sessions/:id/synthesize | POST | sessionId:path (req) | SSE stream of partial brief, then version, cost | session owner, balance check | 402 insufficient credits, 422 insufficient detail, 502 provider failure |
| /api/wizard/sessions/:id/versions | GET | sessionId:path (req), page:int (opt) | version list page | session owner or admin read | 403 forbidden |
| /api/wizard/sessions/:id/versions/:v/restore | POST | version:int (req) | newVersion copying payload | session owner | 404 not found, 409 already approved |
| /api/wizard/sessions/:id/approve | POST | briefVersion:int (req), templateVersionId:text (opt), idempotencyKey:text (req header) | projectId, briefId, outlineId, sectionCount | session owner | 409 already approved, 422 readiness failed |

Synthesis contract: cheap draft model runs first, frontier review model refines; zod schema requires the 9 brief fields with the minimums in **AC-3**; abort closes the stream, keeps the last saved version, and releases the hold. Estimate equals pinned price per million tokens times sampled input plus expected output tokens, shown before the run; debit uses actual provider usage; overcharge versus estimate is refunded automatically.

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):
| Action | Value produced / displayed | Source |
|---|---|---|
| Create session | sessionId, currentStep | DB column on WizardSession |
| Answer turn | isSufficient flag | derived from minimums in **AC-3** applied on server |
| Readiness display | per field ready state | DB column readiness JSON on WizardSession |
| Estimate display | credit estimate | derived from pinned model price times sampled tokens, formula in Synthesis contract |
| Synthesize | brief draft payload | model output validated against zod schema in Synthesis contract |
| Synthesize | version, modelId, tokenCost | DB columns on BriefVersion plus provider usage reply |
| Template suggestion | suggested template plus reason | derived from qualification plus department match against TemplateVersion rows scored by exact qualification then department; reason text from fixed template naming both; no match yields null plus workspace default |
| Approve | projectId, outlineId, section list | DB columns written atomically from approved brief plus chosen TemplateVersion sections in order; sectionCount equals inserted rows |
| Failure path | refund or hold release | derived from credit hold reference recorded at synthesize time; hold expiry 15 minutes |

**Key invariants**:
* One active WizardSession per unfinished project per student; completed sessions never reopen
* Synthesis never runs while any core readiness flag is false; server rejects with 422 naming fields
* BriefVersion numbers are gapless per brief; restore copies payload into a new version, never rewrites history; currentBriefVersion points to the approved or latest draft
* Approval is idempotent per idempotencyKey header stored 24 hours: retry returns the same project without duplicate chapters; 409 takes precedence over 422 once approved
* Every paid synthesis has exactly one ledger outcome: hold then debit on success, release on 422 or abort, refund on 502 or timeout; approve itself costs no credits
* Section seeding reads the template version locked at approval; a template edited after suggestion does not move the locked pointer
* Sessions are always owner scoped; every read filters by userId except admin read paths

**Security model**:
Students read and write only their own sessions, turns, drafts, and approvals, enforced by userId scoping on every query. Administrators get read only access for support through the same GET routes with an admin role check and cannot approve or edit drafts. Synthesis and approval endpoints enforce session auth plus Arcjet per user caps (turn throttle plus daily synthesis cap) plus balance checks before any model call. Unauthenticated reads return 401, cross owner reads return 403, over limit calls return 429. All 403 plus 429 plus paid runs write an audit event row with actor, action, session id, and outcome (basis: Better Auth session plus Arcjet conventions from spec 0002).

**Configuration required**:
* `OPENROUTER_API_KEY`: server only key for OpenRouter provider calls
* `OPENROUTER_DRAFT_MODEL`: pinned cheap draft snapshot, e.g. `deepseek/deepseek-v4.1-flash-1017`
* `OPENROUTER_REVIEW_MODEL`: pinned frontier review snapshot, e.g. `anthropic/claude-sonnet-5.5`
* `OPENROUTER_FALLBACK_MODELS`: comma list of fallback slugs for routing failover
* `WIZARD_SYNTHESIS_DAILY_CAP`: per user daily synthesis limit for Arcjet
* `WIZARD_HOLD_EXPIRY_MINUTES`: credit hold lifetime, default 15
* `WIZARD_SESSION_TTL_DAYS`: expiry window for abandoned sessions, default 30, plus 90 day post approval prune

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
* Happy path: concept to approval provisions brief plus outline plus chapters in one transaction, verifies **AC-1**, **AC-6**
* Failure case: provider timeout during synthesis refunds the hold and keeps the prior draft intact, verifies **AC-4**, **AC-7**
* Auth/permission: another student requesting the session gets 403 plus an audit row, verifies **AC-9**
* Gate case: synthesis with thin methodology returns 422 naming the missing fields, verifies **AC-3**
* Version case: two syntheses plus a restore show three versions with correct current pointer, verifies **AC-5**
* Idempotency case: double approve with the same key returns the same project with one chapter tree, verifies **AC-6**

## Build plan

Ordered as thin Tracer Bullet slices (your project default): a working thread first, then depth. Each task names its ACs.

1. [x] Create the Prisma migration for WizardSession plus WizardTurn plus BriefVersion plus ProjectBrief extensions with indexes and cascade rules, satisfies **AC-2**, **AC-3**, **AC-5**
2. [x] Stand up the thin thread: create session plus post turns plus server readiness plus session list and resume read, no synthesis yet, satisfies **AC-1**, **AC-2**, **AC-10**
3. [x] Wire OpenRouter provider plus `Output.object` streaming synthesize with estimate display plus versioned draft save plus version list and restore, satisfies **AC-4**, **AC-5**
4. [x] Wire credit hold plus debit plus auto refund plus insufficient balance blocking, satisfies **AC-7**
5. [x] Wire atomic approval: brief approve plus outline write plus section seeding from template version with idempotency key, satisfies **AC-6**, **AC-8**
6. [x] Add template suggestion plus override plus lock at approval with fallback when no match exists, satisfies **AC-8**
7. [x] Add owner scoping plus admin read plus audit events plus Arcjet caps on turns and synthesis, satisfies **AC-9**
8. [x] Add expiry plus prune job plus empty plus loading plus error states in both themes, satisfies **AC-10**, **AC-3**

## Consequences

**Positive**:
* Briefs reach review only when complete, so downstream chapters start from solid ground
* Versioned drafts plus atomic approval remove partial tree states that are painful to repair
* Exact once ledger handling keeps student trust around paid synthesis

**Negative / tradeoffs**:
* New session plus turn plus version rows add storage and a prune job to operate
* Two stage model routing adds latency versus a single call and needs fallback tuning
* Strict gates can frustrate students who want to synthesize early; copy and estimate clarity must carry that weight

**Neutral**:
* Chapter seeding depends on the template engine shape from Slice 8; the wizard reads active TemplateVersion sections but does not own them
* Model ids are pinned snapshots and need periodic review as OpenRouter catalog prices shift

## Follow-up

* [ ] `ai-sdk` conventions newly installed under `.agents/skills/ai-sdk/` are not yet captured; root `AGENTS.md` `## Rules` should note the `Output.object` plus zod plus streaming pattern before implementation begins
* [ ] Consider installing `openrouterteam/skills@openrouter-models` for model discovery and routing controls; improves fallback list upkeep
* [ ] Consider installing `jezweb RHC zod forms` (react hook form plus zod) for wizard step form conventions
* [ ] Confirm exact pinned snapshot ids against OpenRouter at build time; provider examples still show older slugs
* [ ] Design Slice 8 template section shape so approval seeding has a stable contract to read

