# 0013 · High fidelity PDF and DOCX export engine

**Date**: 2026-11-14
**Status**: In Progress

## Summary

Students need a finished report they can submit, in PDF and in Word format, with margins and numbering that match their institutional template. This spec designs background export jobs that compile chapters, opening pages, and references into both formats without timing out. You get one Export tab where you pick a format, watch progress, and download the file.

## Requirements

**User stories**:
* As a student, I want to export my project as PDF or DOCX so that I can submit a correctly formatted report.
* As a student, I want the export to keep running in the background so that long documents never time out on me.
* As an administrator, I want export life cycle events audited so that support questions can be answered from the record.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
* **AC-1**: Student starts an export for one format and the job runs in the background and finishes with a downloadable file that keeps correct pagination, with no server timeout on long documents.
* **AC-2**: The finished document holds preliminary pages plus chapters in template order plus a formatted reference list.
* **AC-3**: Margins, page size, fonts, spacing, headers, and page numbers match the locked template version.
* **AC-4**: An oversize document or too many concurrent jobs for one project is refused with 422.
* **AC-5**: Exports write no ledger entries and cost the student nothing.
* **AC-6**: Finished files stay available for 7 days and download links are brief and a fresh export can start after expiry.
* **AC-7**: A failed job shows its reason and the same request key can retry it to a new attempt.
* **AC-8**: Only the project owner and supporting admins can read jobs and downloads, other students get 403 and an audit row is written.
* **AC-9**: The workspace shows an Export tab with format choice, live progress, history, and download again for unexpired files.
* **AC-10**: Empty chapters print a pending note and orphan citations are flagged while the job still completes.

## Decision

**Chosen option**: Option 2: Single HTML intermediate plus Chromium PDF plus programmatic DOCX on Inngest

Build one HTML intermediate from Tiptap content and template rules, render PDF through headless Chromium, build DOCX with the `docx` package from the same content model, and run both on Inngest background jobs with polling and presigned downloads.

**Implementation skills**: `docx` (`anthropics/skills`, `.agents/skills/docx/`) · `docx-convert` (`duc01226/easyplatform`, `.agents/skills/docx-convert/`) · `puppeteer-automation` (`mindrally/skills`, `.agents/skills/puppeteer-automation/`) · `export-pdf` (`bluzir/claude-code-design`, `.agents/skills/export-pdf/`)

## Feature design

**Data model sketch**:

Reuse `ExportJob` with additive columns only, no new tables. Enums `ExportFormat` (PDF, DOCX) and `JobStatus` (QUEUED, PROCESSING, COMPLETED, FAILED) already exist.

* `ExportJob` (reuse plus add): `id`, `projectId` FK cascade delete (req), `format` (req), `status` (req), `s3Key` (opt, set at completion, cleared on prune), `fileSize` (opt, bytes from storage head), `errorMessage` (opt, truncated failure text), `requestedBy` user id (req, new), `templateVersionId` snapshot copied from project at request (opt, new, null falls back to the platform default per spec 0011), `clientKey` text (req, new, supplied by client for safe retry), `attemptCount` int starting at 0 (req, new), `expiresAt` DateTime created plus 7 days (req, new), `createdAt`, `completedAt` (opt).
* Indexes: existing (`projectId`, `status`), plus new (`expiresAt`) for the prune job.
* Uniqueness: (`projectId`, `format`, `clientKey`) so the same key works per format. A duplicate POST while a row for the key is active returns the existing row with 409. After a terminal state the same key may start a fresh row.

**State transitions**:

`QUEUED` to `PROCESSING` to `COMPLETED`, or to `FAILED` after retries are spent. A retry is a POST with the same key on a `FAILED` row, which returns the row to `QUEUED` and bumps `attemptCount`. Inngest retries transient errors 3 times automatically; after `FAILED` only a manual retry moves the row. Terminal rows never change their file. The prune job deletes the S3 object and clears `s3Key` after 7 days but keeps the row as history.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/projects/:projectId/exports | POST | format:text (req), clientKey:text (req) | job id, status QUEUED | owner | 401, 403, 404, 409 same key active, 422 over cap or oversize or no locked template |
| /api/projects/:projectId/exports | GET | page:int (opt), format:text (opt) | job page, page default 20 max 100, newest first | owner, admin read | 401, 403 |
| /api/projects/:projectId/exports/:exportId | GET | id:path (req) | job plus status plus error | owner, admin read | 401, 403, 404 |
| /api/projects/:projectId/exports/:exportId/download | GET | id:path (req) | presigned URL plus expiresIn | owner, admin read | 401, 403, 404, 409 not completed, 410 expired |
| inngest export/run | event | exportId | terminal job row plus S3 file | system | retry 3 times then FAILED |

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):
| Action | Value produced / displayed | Source |
|---|---|---|
| POST start | job id plus QUEUED status | DB columns on `ExportJob`, new row per (`projectId`, `format`, `clientKey`) |
| POST start | `templateVersionId` snapshot | copied from `Project.templateVersionId` at request time, never read live later; null falls back to the platform default per spec 0011 |
| POST start | `expiresAt` | server clock at request plus 7 days |
| POST duplicate key | existing job row with 409 | lookup by (`projectId`, `format`, `clientKey`) while row is active |
| Render PDF | page margins and size | `TemplateRule` margin and page size columns in mm, converted to CSS page rules |
| Render both | body fonts, sizes, spacing, indent | `TemplateRule` fontFamily, fontSizeBodyPt, lineSpacing, paragraphIndentMm columns |
| Render both | heading styles | `TemplateRule` heading style columns |
| Render both | prelim set and order | `TemplateRule` requirePrelims plus `TemplateSection` prelim rows in order |
| Render PDF | header and footer text | project title plus chapter title from `ProjectSection` rows, numbering from renderer page counter |
| Render DOCX | section margins, headers, numbering | same `TemplateRule` columns mapped to `docx` section properties |
| Render both | chapter bodies | `ProjectSection.content` Tiptap JSON in `orderIndex` sequence through one shared HTML builder; images pass with size caps, unknown nodes degrade to plain paragraphs and are logged |
| Render both | reference list entries | `Citation.formattedText` with fallback to `inlineText`, ordered by citation key, styled by `TemplateRule` citationStyle |
| Render both | table of contents | section titles plus order from `ProjectSection`, page refs from the renderer |
| Render both | pending notes and flags | empty content renders heading plus pending note from code constants; an orphan (a mark with no source row) renders inline text plus a review warning row |
| Complete | `s3Key` | derived slug from project title plus date plus short job id plus format extension, unique by construction, stored under project prefix |
| Complete | `fileSize` | storage head on the written object |
| Download | presigned URL plus `expiresIn` | S3 presigner with 900 second life, inline display name from the safe file name helper |
| Fail | `errorMessage` | caught error text truncated to 500 chars |
| List | history rows | `ExportJob` rows for the caller owned project, newest first, page default 20 max 100 |
| Export tab | live progress | job status field only, no percent; client polls status every 3 seconds |

**Key invariants**:
* One active row per (`projectId`, `format`, `clientKey`); a duplicate active POST returns the existing row with 409, never a second row.
* The template snapshot is fixed at request; later publishes never move a running or finished export.
* Completed files are immutable; a new export means a new job row.
* Word cap counts text in sections plus prelims and skips markup and pending notes; active means `QUEUED` or `PROCESSING`.
* Exports never touch the credit ledger.
* Download requires COMPLETED plus unexpired, else 409 or 410.
* Events `export.start`, `export.complete`, `export.fail`, and `export.denied` write audit rows.

**Security model**:
Project owner starts and downloads only their own jobs, enforced by owner scoping on every query. Admin and super admin get read only access to jobs and downloads for support through the existing admin guard. Cross student reads return 403 plus an `export.denied` audit row. Files live in the existing private S3 bucket and are reached only through brief presigned URLs, never public links. POST uses the existing Arcjet per user pattern.

**Configuration required**:
No new secrets and no new credentials. Storage reuses the existing S3 settings, background work reuses the existing Inngest settings. Tunables live as code constants: `EXPORT_MAX_WORDS` 20000, `EXPORT_MAX_ACTIVE_PER_PROJECT` 3, `EXPORT_FILE_TTL_DAYS` 7, `EXPORT_DOWNLOAD_URL_TTL_SEC` 900, polling every 3 seconds, worker retries 3 with a 10 minute attempt cap, pending note copy. New npm packages: `puppeteer-core` plus `@sparticuz/chromium` for serverless friendly rendering, plus `docx` for Word output.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
* Happy path: start PDF export to poll to download with correct margins and bibliography, verifies **AC-1**, **AC-2**, **AC-3**
* Happy path DOCX: same flow in DOCX with matching headers and numbering, verifies **AC-1**, **AC-2**, **AC-3**
* Failure case: oversize document refused with 422 and duplicate active key returns 409, verifies **AC-4**, **AC-7**
* Failure case: render throws twice then succeeds on retry with the same key and no duplicate row, verifies **AC-7**
* Failure case: empty chapter plus orphan citation still completes with pending note and warning, verifies **AC-10**
* Auth/permission: another student reads the job and gets 403 plus audit, verifies **AC-8**
* Expiry case: download after 7 days returns 410 and history offers a fresh export with the same key, verifies **AC-6**
* UI case: Export tab shows progress then history with download again, verifies **AC-9**
* Ledger case: completed exports leave wallet balance untouched, verifies **AC-5**

## Build plan

Ordered as a Tracer Bullet (the project approach): a thin end to end thread first, then thickening slices.

1. Migration plus thin PDF thread: add the new `ExportJob` columns and index, POST start with idempotency and caps, Inngest worker producing a minimal valid PDF, status and download reads with presigned URLs, satisfies **AC-1**, **AC-4**, **AC-7**, **AC-8**
2. Full fidelity PDF: shared HTML builder from Tiptap plus template rules, Chromium render with margins headers footers and page numbers, preliminary pages and table of contents, empty chapter notes and citation flags, satisfies **AC-2**, **AC-3**, **AC-10**
3. DOCX builder: `docx` output from the same content model with section margins and numbering, preliminary pages and reference list parity with PDF, satisfies **AC-2**, **AC-3**, **AC-10**
4. Guards plus life cycle plus UI: expiry and daily prune, 410 path, audit rows and rate limits, no ledger assert, Export tab with picker progress history and download again, satisfies **AC-4**, **AC-5**, **AC-6**, **AC-8**, **AC-9**

## Consequences

**Positive**:
* Students get submittable files in both required formats with no timeout cliff.
* One content model feeds both outputs, so wording stays shared while layout still needs checks in both formats.
* Reuse of S3, Inngest, and audit patterns keeps operations familiar to the team.

**Negative / tradeoffs**:
* Chromium adds a heavyweight render dependency and slower cold starts in serverless, which you accept for exact pagination.
* Two renderers means formatting bugs can appear in one format only, so verification must cover both every time.
* Stored files grow S3 usage until the prune job removes them, so a stuck prune means unbounded growth.

**Neutral**:
* Export stays free, which sets an expectation that later pricing must deliberately reverse.
* The 7 day lifetime means support must point students at a fresh export instead of recovery after expiry.

## Rationale

Reasoning and options: see rationale.md.

## Follow-up

* [ ] New skill conventions are not yet captured. The export area (`lib/exports/` or wherever the worker lands) deserves a nested `AGENTS.md` with the `docx` plus Chromium PDF conventions before implementation begins, plus a one line pointer from root `AGENTS.md` (do not add area conventions to root; root loads on every task).
* [ ] The fifth installed pack (`jwynia/agent-skills` DOCX generator guidance) is installed but unmapped to a single directory; confirm its home under `.agents/skills/` during the build and add it to the pointer above if it shapes the DOCX code.
* [ ] MCP servers were skipped by your pick; if live browser verification matters later, connect the Chrome DevTools MCP and note it in the area `AGENTS.md`.
* [ ] If Chromium cold starts hurt in production, evaluate the Gotenberg sidecar alternative named in rationale.md as a contained follow-up.
* [ ] Scope row 14 still needs its build sub tasks once you approve this spec.
