# 0012. Pre submission review and academic consistency

**Date**: 2026-11-14
**Status**: In Progress

## Summary

This spec designs a review before submission that scans a student draft for missing sections, uncited claims, drift from approved objectives, and formatting breaks. It runs when the student asks, saves each run with warnings, and links each warning to the exact chapter paragraph it describes. The result guides fixes but never blocks export, so students gain trust in the draft without losing control.

## Requirements

**User stories**:
- As a student, I want to run a consistency review on demand so that I see what is missing before I export.
- As a student, I want each warning linked to its chapter paragraph so that I can fix it without hunting.
- As a student, I want to see past runs so that I can tell whether my draft is improving.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: Given a project with chapters, when the student starts a review, then the system returns warnings in four groups (missing sections, uncited claims, objective drift, formatting) with counts per group.
- **AC-2**: Given the locked template version for the project, when required sections are absent or empty, then the run lists each missing section by title and order.
- **AC-3**: Given chapter text with claim language and no nearby citation mark, when the review completes, then the run flags the paragraph with an excerpt plus the reason. Orphan citation marks with no library entry are also flagged.
- **AC-4**: Given the approved brief aims plus objectives, when chapter text drifts from those objectives, then the run flags the drift with a short explanation naming the objective and the chapter.
- **AC-5**: Given the locked TemplateRule row, when margins, fonts, spacing, heading use, or required opening pages break the rules in a detectable way from stored content, then the run flags the violation with the expected value.
- **AC-6**: Given a completed run, when the student opens a warning, then the panel shows the chapter title plus an excerpt capped at 500 characters, and choosing the warning moves the workspace to that paragraph.
- **AC-7**: Given a completed review with warnings, when the student exports to PDF or DOCX, then export stays allowed. Review is advisory only and never gates export.
- **AC-8**: Given repeated reviews, when runs complete, then the student can list the last 20 runs per project with counts and open any run with its warning snapshot. Older runs are pruned.
- **AC-9**: Given ownership rules, when a non owner requests review data, then the API answers 403 and writes an audit row. Admin users hold read access for support.
- **AC-10**: Given provider or load pressure, when the AI check fails or the student exceeds 10 runs per project per hour, then structural warnings still save, semantic checks are marked skipped with a retry action, and the limit answers 429.

## Decision

**Chosen option**: Option 2: Full four checks in a sync action with reuse of OpenRouter

The review runs on demand in a server action, performs structural checks locally, calls the existing OpenRouter setup for drift and claim signals, and stores the snapshot for the Review tab.

**Implementation skills**: `ai-sdk` (`.agents/skills/ai-sdk/`)

## Feature design

**Data model sketch**:
- `ReviewRun` (new): id, projectId FK with cascade delete, templateVersionId text copy from `Project.templateVersionId` at run start (null allowed when the project has no locked version yet, the run then uses the matched template version and records that fallback), status (running, done, failed), counts per group (missingCount, uncitedCount, driftCount, formattingCount, each derived from stored warnings), skippedSemantic bool, createdBy user id, createdAt. Index on (projectId, createdAt). Idempotency key `clientRunKey` text optional, unique per project, so a double click creates one run.
- `ReviewWarning` (new): id, runId FK with cascade delete, checkType (missing_section, uncited, objective_drift, formatting), severity (info, warn, with warn counted in group totals and info shown as guidance), message text, sectionId FK to `ProjectSection` nullable (null means a missing section with no row yet, message then names the expected title and order), blockIndex int nullable plus excerpt text capped at 500 characters plus sectionVersion int copy (the `ProjectSection.version` seen at scan time, used to mark stale jumps after later edits), createdAt. Index on (runId, checkType).
- Reuse with no schema change: `Project` (owner plus locked templateVersionId), `ProjectSection` (chapter text plus order), `ProjectBrief` (agreed aims plus objectives), `TemplateVersion` plus `TemplateRule` plus `TemplateSection` (ground truth for structure and format), `ProjectSource` plus citation marks in section content (ground truth for citations).
- Retention: keep last 20 runs per project with warnings. Prune older runs plus their warnings after each successful save.

**State transitions**:
ReviewRun: running to done, or running to failed. Done includes the partial case where structural groups saved and semantic groups are marked skipped with a retry action. Failed means structural checks themselves errored and nothing saved. No reopen or resolve transition on warnings. Fixes land by editing chapters and starting a new run.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/projects/:projectId/review/runs | POST | projectId:path (req), clientRunKey:text (opt) | runId, status, counts, skippedSemantic | session, owner only (admin POST denied) | 401 unauthenticated, 403 forbidden, 404 unknown project, 429 over limit with Retry After, 409 duplicate clientRunKey |
| /api/projects/:projectId/review/runs | GET | projectId:path (req), page:int (opt, default 1), pageSize:int (opt, default 10, max 20) | run page ordered by createdAt desc with counts plus skippedSemantic | session, owner or admin read | 401, 403, 404 |
| /api/projects/:projectId/review/runs/:runId | GET | runId:path (req) | run plus warning list with sectionId, blockIndex, message, excerpt, sectionVersion | session, owner or admin read | 401, 403, 404 |
| /api/projects/:projectId/review/runs/:runId/retry | POST | runId:path (req) | runId, status, refreshed semantic groups | session, owner only | 401, 403, 404, 409 run has no skipped groups, 429 over limit |

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):
| Action | Value produced / displayed | Source |
|---|---|---|
| Start run | runId plus status running | new `ReviewRun` row, projectId from path, templateVersionId copied from `Project.templateVersionId` |
| Start run | ground truth sections plus rules | `TemplateSection` plus `TemplateRule` rows for the locked `TemplateVersion` |
| Start run | ground truth objectives | `ProjectBrief` aims plus objectives plus research questions for the project |
| Start run | chapter text scanned | `ProjectSection.content` rows for the project, ordered by `orderIndex` |
| Missing check | missing section names | set difference of `TemplateSection` required titles against `ProjectSection` titles using normalized match (trim plus case fold), empty means whitespace only or word count zero, message names expected title plus order |
| Uncited check | claim excerpt plus reason | model reply with blockIndex plus excerpt, verified against citation marks in the same paragraph plus one neighbor on each side in `ProjectSection.content` and against `ProjectSource` rows. Nearby means that three paragraph window. Unknown excerpts are dropped, never saved. Orphan marks (a mark with no source row) are flagged by a local join with no model call |
| Drift check | objective name plus chapter plus explanation | model reply in a pinned schema (objectiveId, blockIndex, note), accepted only when objectiveId exists in the `ProjectBrief` for the project, with a low threshold that favors recall and advisory wording |
| Formatting check | expected value plus found value, or marked skipped | `TemplateRule` columns compared only to checkable signals (required prelims present, heading levels present, citation style in use). Signals not present in stored content (margins, font files, exact spacing) are marked skipped in the run, never passed, so the UI never claims a false pass |
| Complete run | counts per group | derived from saved `ReviewWarning` rows grouped by checkType, with warn severity counted and info shown as guidance |
| Warning display | chapter title plus excerpt plus jump target plus stale flag | `ReviewWarning.sectionId` to `ProjectSection` row plus `blockIndex` scroll target plus `sectionVersion` compared to current `ProjectSection.version`. A mismatch shows a stale notice with the excerpt still readable |
| Run list | run history with counts | `ReviewRun` rows scoped by projectId, ordered by createdAt, paginated |
| Audit | actor plus action plus target | session user id plus route name plus projectId and runId, action name review.run |

**Key invariants**:
- Every read and write is scoped by projectId to the owning user, with admin read only. Cross project access returns 403. Unknown project ids return 404 without revealing ownership.
- A run snapshots the locked templateVersionId at start, so a later template publish never rewrites history. When no version is locked yet, the run records the matched fallback version and names it in the response.
- Warning excerpts are capped at 500 characters and never store full chapter text twice. Excerpts are cut on paragraph bounds so markup is never split mid tag.
- Review never writes to chapters, briefs, templates, or sources. It only inserts run plus warning rows.
- Counts always equal the stored warning rows grouped by checkType. No hand tuned totals.
- Rate limit of 10 runs per project per hour is enforced before any model call, keyed by projectId, with a 429 plus Retry After header.
- Scan caps: at most 50 sections and 200000 characters per run, model timeout 25 seconds. Over cap input is truncated with a notice, semantic groups then mark skipped with retry.
- Double submit with the same clientRunKey returns the existing run with 409 semantics and creates no duplicate.
- Chapter text sent to the model is treated as untrusted content, never as instructions, using the same prompt guard pattern as the assistant slice.

**Security model**:
Owner runs and reads, including the retry action. Admin users read runs plus warnings for support with no run start and no retry path (admin POST returns 403). All other callers receive 403. Unknown ids return 404. All 403 plus 429 plus completed runs write an `AuditEvent` row with actor plus action plus projectId plus runId, following the workspace and template slices. No student personal data leaves the project scope. Guideline text and chapter text sent to the model travel over the existing server side OpenRouter path only.

**Configuration required**:
- `OPENROUTER_API_KEY`: reuse of the server key already used by the wizard and assistant slices. No new credential.
- `OPENROUTER_REVIEW_MODEL`: pinned snapshot for drift plus claim signals. Falls back to the assistant model var when unset, with a boot log naming the fallback.
- `REVIEW_RUNS_PER_HOUR`: per project hourly cap, default 10, keyed by projectId.
- `REVIEW_MAX_RUNS_KEPT`: runs kept per project, default 20.
- `REVIEW_MAX_SECTIONS`: sections scanned per run, default 50.
- `REVIEW_MAX_CHARS`: characters sent to the model per run, default 200000.
- `REVIEW_MODEL_TIMEOUT_MS`: model timeout per run, default 25000.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: project with gaps runs review and shows four grouped warnings with paragraph links, verifies **AC-1**, **AC-6**
- Missing path: template requires sections absent from the project, run names each by title and order, verifies **AC-2**
- Citation path: claim paragraph without a citation mark is flagged with excerpt, verifies **AC-3**
- Drift path: chapter text off objective triggers an explanation naming the objective, verifies **AC-4**
- Advisory path: warnings present yet export stays allowed, verifies **AC-7**
- History path: repeated runs list with counts and prune past 20, verifies **AC-8**
- Auth path: non owner receives 403 with audit, admin reads but cannot start or retry, unknown project returns 404, verifies **AC-9**
- Failure path: provider error still saves structural groups and marks semantic skipped with retry, over limit returns 429 with Retry After, verifies **AC-10**
- Stale path: warning opened after chapter edits shows a stale notice with the saved excerpt, verifies **AC-6**
- Format honesty path: uncheckable rules show skipped, never passed, verifies **AC-5**

## Build plan

Ordered as a thin end to end thread first, then thickening, per the project Tracer Bullet approach.

1. Create the migration for `ReviewRun` plus `ReviewWarning` with indexes plus the prune helper, satisfies **AC-8**
2. Ship the thin thread: POST run with missing section check only, plus GET list plus GET detail with stub counts, plus owner scoping with audit, satisfies **AC-1**, **AC-2**, **AC-8**, **AC-9**
3. Add uncited plus formatting checks against citation marks and `TemplateRule`, with excerpt cap and null section handling for missing rows, satisfies **AC-3**, **AC-5**, **AC-6**
4. Add semantic drift plus claim signals through OpenRouter with caps, truncation, skippedSemantic plus retry, and the hourly limit with 429, satisfies **AC-4**, **AC-10**
5. Build the workspace Review tab with run button, grouped warnings, counts, history list, click to scroll to paragraph, plus loading plus empty plus error states in both themes, satisfies **AC-1**, **AC-6**, **AC-8**
6. Harden with advisory guarantee (no export gate), empty project full missing list, audit on 403 plus 429 plus completion, and prune verification, satisfies **AC-7**, **AC-9**, **AC-10**

## Consequences

**Positive**:
- Students see concrete gaps before export, which should raise submission quality and lower support questions.
- Snapshot history makes progress visible and gives admins evidence when helping.
- Reuse of OpenRouter, audit, and workspace patterns keeps operating cost and code spread low.

**Negative / tradeoffs**:
- Semantic checks can misfire and flag sound text, so wording must stay advisory and excerpts must show context.
- Sync execution plus a model call adds latency on large drafts, contained by caps and partial save but still slower than a pure local scan.
- Storing runs grows the database, bounded by the keep 20 rule but still a new write load per review.

**Neutral**:
- Export stays open in v1. A future severity gate would need a new decision and a migration of run status values.
- Model choice is pinned by config, so swapping models later is a config change plus a prompt review, not a schema change.

## Follow-up

- [ ] Decide whether a future export gate should use severity levels or a simple pass plus warn score, after v1 usage data arrives
- [ ] Consider a Turnitin style similarity check as a separate spec, explicitly out of scope here
- [ ] Record OpenRouter prompt plus model version for drift and claims in the build, so later audits can reproduce a run
- [ ] Confirm the Review tab copy with the workspace polish journey so tone matches the rest of the app
