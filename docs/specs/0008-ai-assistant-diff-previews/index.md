# 0008. AI assistant with diff previews

**Date**: 2026-11-14
**Status**: In Progress

## Summary

This spec designs the assistant that lives inside the workspace and helps with tone, polishing, and consistency checks. Students see the cost before the run, preview every change in a panel, and accept or discard each paragraph, so the editor never changes text silently. Accepted text writes through the same guarded save the workspace already uses, so concurrent edits stay safe.

## Requirements

**User stories**:
* As a student, I want tone revision and paragraph polishing inside the workspace so that my draft reads in a steady academic voice.
* As a student, I want a consistency review that points at the exact paragraph so that I can fix aim and objective drift early.
* As a student, I want the credit cost shown before I confirm so that spend feels fair and refunds happen on failure.
* As a student, I want to preview changes and accept or discard them per paragraph so that no edit lands without my choice.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
* **AC-1**: Given an open chapter, when the student picks tone revision, paragraph polishing, or consistency review, then the assistant runs only that operation with prompts from versioned code constants.
* **AC-2**: Given the canvas, when the student starts a run, then scope is the current selection if present else the whole open chapter, the panel names the scope, and input over 12000 characters is refused with guidance to split the request.
* **AC-3**: Given a valid request, when the student reviews the estimate, then the panel shows credits from the OperationPricing table, the run starts only after confirm, a hold is placed at confirm, debit uses actual provider usage, failure releases the hold with automatic refund, and short balance returns 402 with a top up prompt and no hold.
* **AC-4**: Given a completed run, when the student opens the suggestion, then the panel shows original beside revised per paragraph with word highlights, offers accept per paragraph plus accept all plus discard, streams partial paragraphs while running, and never writes to the canvas before accept.
* **AC-5**: Given a consistency review, when results arrive, then each issue links to its paragraph and offers a fix draft the student may accept or skip.
* **AC-6**: Given a suggestion, when the student accepts, then the write sends the section version and the input hash, a stale version or changed source text blocks the apply with a rebase prompt, and success increments the section version with recomputed word count.
* **AC-7**: Given past runs, when the student opens history, then the latest 20 runs per section remain available for 30 days through a paged runs endpoint with nested suggestions, and older rows are pruned nightly.
* **AC-8**: Given a project owned by another student, when a non owner calls any assistant endpoint, then the API denies with 403 and records an audit event; administrators get read access for support with no apply path.
* **AC-9**: Given the panel, when states change, then idle, estimating, streaming, review, applied, error, and empty history all render in both themes with skeletons for loading, a 90 second stream cap keeps partial paragraphs on timeout with a retry action, and failed runs keep streamed paragraphs with released hold.
* **AC-10**: Given any run, accept, or discard, when it completes, then an AiUsage row records model plus tokens plus cost and an audit event records the action, and the panel states the result is an AI draft that needs review and never applies on its own.

## Decision

**Chosen option**: Option 2: Structured paragraphs with explicit confirm and guarded apply

The assistant reuses the wizard model routing and SSE streaming, returns typed paragraphs with warnings, estimates from OperationPricing with hold at confirm, and applies through version checked writes with hash guard.

**Implementation skills**: `ai-sdk` (`vercel/ai`, `.agents/skills/ai-sdk/`)

## Feature design

**Data model sketch**:
* `AiAssistRun` (id, projectId FK required cascade delete, sectionId FK required cascade delete, userId FK required cascade delete, operation: tone, polish, review, promptVersion text, scope: selection, chapter, sectionVersion int captured at create, inputHash text SHA-256 over normalized plain text, inputChars int, estimateCredits int, actualCredits int default 0, modelId text nullable, tokenCost int default 0, status, idempotencyKey text unique, expiresAt, createdAt), index on (sectionId, createdAt)
* `AiSuggestion` (id, runId FK required cascade delete, paragraphIndex int, originalText text, revisedText text, warnings JSON nullable, status: pending, accepted, discarded), unique (runId, paragraphIndex)
* Reuse `ProjectSection` for apply (content holds Tiptap JSON, version guards writes, wordCount recomputed on save)
* Reuse `AiUsage` for telemetry (model plus tokens plus cost per run)
* Reuse `CreditWallet` plus `CreditLedger` for money (hold, debit, refund rows with referenceId equal to run id, unique per wallet per type)
* Retention: runs plus suggestions pruned after 30 days except the latest 20 per section are always kept; expiresAt equals createdAt plus 30 days but the prune shields the newest 20; accepted text already lives in the section; ledger and usage rows kept for audit

**State transitions**:
AiAssistRun: estimated to held to streaming to succeeded or failed; succeeded to accepted or discarded; any active state to expired on expiry. Suggestion: pending to accepted or discarded. Section apply is atomic per paragraph set: all accepted paragraphs write in one guarded update or the write is rejected with 409.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/projects/:projectId/assistant/estimate | POST | sectionId:string (req), operation:enum (req), inputText:string (req), sectionVersion:number (req) | estimateCredits, inputChars, allowedOutputChars, scope | session owner or admin read | 403 forbidden, 422 too large with split guidance, 409 stale section |
| /api/projects/:projectId/assistant/runs | POST | sectionId:string (req), operation:enum (req), inputText:string (req), sectionVersion:number (req), inputHash:string (opt, server recomputes), idempotencyKey:string (req header) | runId, status, estimateCredits | session owner only | 402 insufficient credits with balance, 409 duplicate key returns same run, 409 stale section, 422 too large |
| /api/projects/:projectId/assistant/runs/:runId/stream | GET | runId:path (req) | SSE events paragraph, done, error; done carries modelId plus tokenCost plus actualCredits | session owner or admin read | 403 forbidden, 404 unknown run, 502 provider failure |
| /api/projects/:projectId/assistant/runs | GET | sectionId:string (req), cursor:string (opt, createdAt), pageSize:int (opt, default 20, max 50) | runs page newest first with nested suggestions | session owner or admin read | 403 forbidden |
| /api/projects/:projectId/assistant/runs/:runId/accept | POST | suggestionIds:array (req) or acceptAll:bool, sectionVersion:number (req), inputHash:string (req) | content JSON, version, wordCount | session owner only | 403 forbidden, 409 stale version or hash mismatch with currentVersion plus currentText |
| /api/projects/:projectId/assistant/runs/:runId/discard | POST | runId:path (req) | ok:true | session owner only | 403 forbidden, 404 unknown run |

**Stream contract**: events are `paragraph` (one typed paragraph with index, original, revised, warnings), `done` (modelId, tokenCost, actualCredits), `error` (code, message, partialKept true). The zod schema for each paragraph is paragraphIndex:int, originalText:string, revisedText:string, warnings:array of issue plus location. The 90 second cap is enforced server side with abort; abort keeps streamed paragraphs and releases the hold.

**Prompt and model routing**: prompts live in `lib/assistant-prompts.ts` with a version string per operation logged on each run. Routing reuses the wizard two step draft plus review through OpenRouter; the same model pair serves all three operations for v1.

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):
| Action | Value produced / displayed | Source |
|---|---|---|
| Scope pick | scope label selection or chapter | client selection if non empty else open section id; server rereads section content at run create and rejects stale sectionVersion with 409 |
| Estimate display | estimateCredits, inputChars, allowedOutputChars | derived from OperationPricing rate per 1k chars per operation times inputChars plus allowedOutputChars for that operation; allowedOutputChars is a per operation constant in the pricing row |
| Run create | runId, status, hold | DB columns on AiAssistRun; hold is a CreditLedger row with referenceId equal to run id; hold amount equals estimate; retry with the same idempotencyKey header returns the same run |
| inputHash | hash guard for apply | server computes SHA-256 over normalized plain text (trim plus collapse whitespace) from received inputText and stores it; client echo is ignored |
| Stream | paragraphs plus warnings | single model call validated against zod schema for paragraphs; warnings and fix drafts arrive in the same call at no extra charge |
| Panel diff | word highlights | client diff over originalText and revisedText per suggestion |
| Review | issue list with paragraph links | warnings JSON on AiSuggestion with paragraphIndex; fix drafts use the same accept path |
| Accept | new content, version, wordCount | guarded update of ProjectSection content; paragraphIndex maps to ordered paragraphs extracted from Tiptap JSON in section order; only chosen indexes are replaced; server increments version and recomputes count with the shared helper from spec 0007; second accept of the same suggestion is refused by status check so no double spend |
| Failure path | refund or hold release | hold equals estimate; debit equals actual capped at hold with automatic refund of any overage; mid stream failure refunds in full and keeps streamed paragraphs; hold expiry 15 minutes |
| History | runs page with suggestions | AiAssistRun plus AiSuggestion rows ordered newest first by createdAt with cursor paging, page size 20 default max 50 |
| History | runs page with suggestions | AiAssistRun plus AiSuggestion rows ordered by createdAt, 20 per section |
| Panel notice | AI draft needs review | fixed copy constant, never auto apply |
| Cost record | modelId, tokenCost, actualCredits | provider usage reply stored on AiAssistRun and AiUsage |

**Key invariants**:
* No silent writes: suggestion text reaches the canvas only through accept with explicit student action.
* Every section write carries the section version and the input hash; stale writes are rejected, never merged silently.
* Every credit movement pairs a ledger row with a wallet balance update in one transaction; ledger referenceId plus type stays unique per wallet; hold equals estimate and debit equals actual capped at hold with automatic refund of any overage; accept itself is free and a second accept of the same suggestion is refused by status check.
* Input over 12000 characters is refused before any hold; run create validates sectionVersion against the current row and rejects stale reads.
* Prompts live in versioned code constants in `lib/assistant-prompts.ts`; each run logs the operation plus prompt version plus model pair.
* Runs are idempotent on the idempotencyKey header; retry after timeout with the same key returns the same run.
* SSE disconnect keeps the run server side; reconnect to the stream endpoint resumes remaining paragraphs; concurrent double accept is serialized per section so only the first guarded write wins.

**Security model**:
Owner writes and applies; project owner reads and writes runs in their project. Administrators get read access on estimate, stream, and history for support with no apply path. All other users receive 403 with body code FORBIDDEN. Short balance returns 402 with estimateCredits plus balance. Stale writes return 409 with currentVersion plus currentText. Mutations carry the existing Arcjet per user per minute plus daily AI caps used by the wizard with the same numeric values read from code at build. Runs, accepts, and discards emit audit events named assistant.run, assistant.accept, assistant.discard carrying actor plus run id plus cost. Financial rows are retained for audit.

**Configuration required**:
None new. Reuses the existing OpenRouter key and model ids from the wizard slice plus OperationPricing rows for the three operations.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
* Happy path: select paragraph, estimate, confirm, stream, accept one paragraph, chapter updates with new version, verifies **AC-2**, **AC-3**, **AC-4**, **AC-6**
* Failure case: provider fails mid stream, partial paragraphs kept, hold released with refund, retry offered, verifies **AC-9**, **AC-3**
* Auth/permission: non owner calls estimate and accept, both denied with 403 plus audit, verifies **AC-8**
* Race case: edit chapter during stream then accept, hash mismatch blocks with rebase prompt, verifies **AC-6**
* Review case: consistency review links each warning to its paragraph with fix draft, verifies **AC-5**
* History case: 21st run prunes oldest beyond 20 within 30 days, verifies **AC-7**

## Build plan

Ordered as Tracer Bullet slices (thin thread through every layer first, then thicken), each traceable to its AC:

1. Migration plus estimate plus run skeleton: add AiAssistRun and AiSuggestion tables with indexes, POST estimate and POST runs with hold and 402 path, satisfies **AC-3**, **AC-7**
2. Thin thread: stream one polish run SSE with structured paragraphs, right rail Assistant tab with scope label and word diff, accept one paragraph through guarded PUT, satisfies **AC-1**, **AC-2**, **AC-4**, **AC-6**
3. All operations plus review warnings: tone and review prompts in constants, warnings with paragraph links and fix drafts, satisfies **AC-1**, **AC-5**
4. Bulk actions plus history: accept all, discard, paged runs endpoint, 20 per section pruning job, satisfies **AC-4**, **AC-7**
5. Guards plus states plus audit: owner scoping with admin read, 403 plus audit, Arcjet caps, 90 second cap with partial keep, full panel states in both themes, AiUsage plus AuditEvent writes, academic draft banner, satisfies **AC-8**, **AC-9**, **AC-10**

## Consequences

**Positive**:
* Students get a trusted copilot with cost shown before confirm and no silent edits.
* Reuse of wizard routing, SSE, ledger, and guarded saves keeps the codebase coherent.
* Paragraph level accept plus history gives recovery without new editor machinery.

**Negative / tradeoffs**:
* Structured output plus two step review costs more per run than a single cheap call and adds latency.
* Storing 20 runs per section grows the database and needs the prune job to stay healthy.
* Hash plus version guards will sometimes block an accept after an interim edit, which asks the student to rebase.

**Neutral**:
* Model ids and prompt versions need upkeep as providers change.
* OperationPricing needs three new rows before estimates work.

## Follow-up

* [ ] Add OperationPricing rows for tone, polish, and review before build slice 1.
* [ ] Confirm the 12000 character cap after first latency and cost sample in verification.
* [ ] Record prompt versions per run so later quality review can compare revisions.

## Rationale

Reasoning and options: see rationale.md.
