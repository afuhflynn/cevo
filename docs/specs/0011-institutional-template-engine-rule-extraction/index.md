# 0011 · Institutional template engine and rule extraction

**Date**: 2026-11-14
**Status**: In Progress

## Summary

Cevo needs one home for academic formatting rules so every project starts from the right institutional template (margins, fonts, spacing, required opening pages, chapter order). This spec designs an admin lifecycle (create, draft, publish, archive) plus assisted extraction that turns a guideline PDF or pasted text into a reviewable rule draft, plus automatic matching that picks the most specific template for each student. Active projects stay locked to their chosen version, so a later publish never rewrites student work.

## Requirements

**User stories**:
* As an administrator, I want to create and publish versioned formatting templates so that students in each programme start from correct rules.
* As an administrator, I want to upload a guideline document and review an extracted draft so that rule entry is fast but stays accurate.
* As a student, I want the right template chosen for my programme automatically so that I never start from wrong formatting.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
* **AC-1**: Admin creates a template with title plus scope (institution, faculty, department, programme) plus qualification plus project type, and the system opens draft version 1; the template appears in the admin list as a draft.
* **AC-2**: Given a guideline PDF or pasted text, when extraction runs, then a draft row stores proposed rules plus proposed sections for admin review; when extraction fails, a blank draft remains for manual entry and nothing is published. PDF input is capped at 100 pages and 15 MB and pasted text at 500000 characters; a scanned PDF with no extractable text falls back to a blank draft.
* **AC-3**: Admin reviews and edits the draft, applies it to a version, then publishes; publish is blocked with 422 unless a rules row exists with every field inside its allowed range and section count is at least 1; applying a draft whose payload fails validation returns 422 and creates no version; published versions reject later edits with 409.
* **AC-4**: Matching picks the most specific active template that owns a published version, scored programme over department over faculty over institution with a qualification bonus; ties break by most recent publishedAt then by version id; when nothing matches, or the student has no academic profile, the student receives the platform default template and creation never blocks.
* **AC-5**: Approval locks the chosen templateVersionId on the project and copies sections into project chapters; at approval the version is revalidated as still published on an active template, and when it no longer qualifies matching runs again with fallback to the platform default; later publishes never move locked projects, and the locked version stays readable to its owner.
* **AC-6**: Only admin and super admin roles write templates, drafts, and publishes; students read only their matched version plus versions locked to their own projects; every denial returns 403 and writes an audit row.
* **AC-7**: Two publish requests for the same version at the same time produce exactly one published version with one publishedAt value; the loser receives 409. Two version creates for the same template resolve to one version number through the unique templateId plus version constraint; the loser receives 409.
* **AC-8**: Template scope edits affect future matches only and never rescore published versions or locked projects; version edits send the full ordered section list; archived templates leave matching while locked owners keep read access and reactivation by flipping isActive back is allowed; every list paginates with page default 20 and max 100, q searches title, and scope filters combine with AND.

## Decision

**Chosen option**: Option 1: Full lifecycle with assisted extraction

Build the full admin lifecycle with assisted extraction into stored drafts and a shared hierarchy matcher.

**Implementation skills**: `ai-sdk` (`vercel/ai`, `.agents/skills/ai-sdk/`)

## Feature design

**Data model sketch**:

Reuse the four existing rows with additive fields only, plus one new draft row:

* `ProjectTemplate` (reuse as is): id, title, description, institutionId, facultyId, departmentId, programmeId (all nullable for platform scope), qualification, projectType, isOfficial, isActive. Archive means setting isActive to false; rows are never deleted.
* `TemplateVersion` (reuse as is): id, templateId FK cascade delete, version int gapless per template starting at 1, isPublished bool, changelog, publishedAt set once at publish, unique (templateId, version). Draft means isPublished false.
* `TemplateRule` (reuse typed columns as is): 1:1 with TemplateVersion, pageSize, margin columns in mm, font columns, lineSpacing, paragraphIndentMm, heading styles, citationStyle, requirePrelims JSON.
* `TemplateSection` (reuse as is): id, templateVersionId FK cascade delete, orderIndex, title, sectionType, description, requiredSubsections JSON, index on (templateVersionId, orderIndex).
* `TemplateDraft` (new): id, templateId nullable FK (null means a brand new template shell is created at apply time), sourceText text nullable (pasted text or extracted text), sourceFileId nullable FK to FileAsset (the uploaded guideline), payload JSON (proposed rules plus proposed sections), status (open, applied, discarded), createdBy admin user id, createdAt. Index on (status, createdAt).
* `Project` (reuse as is): templateVersionId lock already written at approval by spec 0006; this spec adds no column.

**State transitions**:

TemplateDraft: open to applied, or open to discarded, exactly once each; double apply returns 409. TemplateVersion: draft to published, exactly once; publish sets publishedAt and rejects repeats with 409. ProjectTemplate: active to archived by setting isActive false; archived templates leave matching but published versions stay readable for locked projects. Published versions never accept rule or section edits; corrections need a new version.

**Validation contract** (allowed values, enforced on write, publish returns 422 outside them):
margins 0 to 50 mm, paragraphIndentMm 0 to 25.4 mm, fontSizeBodyPt 8 to 18, heading sizes 10 to 28, lineSpacing 1.0 to 3.0, fontFamily max 80 chars, pageSize one of A4 or LETTER, citationStyle one of APA_7 or HARVARD, heading styles free text max 40 chars. Section payloads need title plus order plus sectionType; sectionType is required text max 40 chars; orderIndex follows list position. Template create validates scope ids as existing rows and qualification against QualificationLevel; isOfficial defaults false and isActive defaults true.

**Extraction contract**:
the zod schema mirrors TemplateRule columns plus section triples (title, order, type); partial output is allowed with nulls flagged in review and blocks apply until filled; output is validated by zod before storage so injected instructions in a guideline cannot smuggle extra fields; caps are 100 pages, 15 MB per PDF, 500000 chars pasted text, enforced before any model call with a timeout.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/admin/templates | GET | page:int (opt), q:text (opt), scope filters (opt) | template page with latest version state | admin | 401 unauthenticated, 403 forbidden |
| /api/admin/templates | POST | title:text (req), qualification:text (req), scope ids (opt), projectType:text (opt) | templateId plus draft version 1 | admin | 401, 403, 422 invalid |
| /api/admin/templates/:id | GET | id:path (req) | template plus versions plus rules | admin | 401, 403, 404 not found |
| /api/admin/templates/:id | PATCH | title (opt), scope ids (opt), isActive:bool (opt) | updated template | admin | 401, 403, 404, 422 |
| /api/admin/templates/:id/versions | POST | fromDraftId:text (opt), cloneFromVersion:int (opt), fromDraftId wins when both passed, blank draft when neither passed | new draft version number | admin | 401, 403, 404, 409 already exists |
| /api/admin/templates/:id/versions/:v | PATCH | rule fields (opt), full ordered sections list (opt, stored as sent) | updated draft version | admin | 401, 403, 404, 409 published immutable |
| /api/admin/templates/:id/versions/:v/publish | POST | version:path (req) | publishedAt | admin | 401, 403, 404, 409 already published, 422 empty or ruleless |
| /api/admin/templates/extract | POST | fileId:text (opt), pastedText:text (opt), templateId:text (opt) | draftId plus proposed rules | admin | 401, 403, 422 no input, 502 provider failure |
| /api/admin/templates/drafts | GET | status:text (opt), page:int (opt) | draft page | admin | 401, 403 |
| /api/admin/templates/drafts/:id | GET | id:path (req) | draft plus payload | admin | 401, 403, 404 |
| /api/admin/templates/drafts/:id/apply | POST | targetTemplateId:text (opt) | new draft version id | admin | 401, 403, 404, 409 already applied |
| /api/admin/templates/drafts/:id/discard | POST | id:path (req) | status discarded | admin | 401, 403, 404, 409 |
| /api/templates/match | GET | none, reads caller profile | templateId, versionId, reason, isFallback | student session | 401 unauthenticated |
| /api/templates/versions/:id | GET | id:path (req) | rules plus sections | matched or locked only | 401, 403, 404 |

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):
| Action | Value produced / displayed | Source |
|---|---|---|
| Create template | templateId plus draft version 1 | DB columns on ProjectTemplate plus TemplateVersion, version number 1 |
| Extract | proposed rules plus proposed sections | model Output.object reply validated against a zod schema mirroring TemplateRule columns plus section shape |
| Extract failure | blank draft for manual entry | new TemplateDraft row with empty payload and status open |
| Apply draft | new draft version with rules plus sections | derived from draft payload plus next version number (max plus 1 per template) |
| Publish | publishedAt | server clock at publish time; guard values (rules present, section count) derived from version rows |
| Match | templateId plus versionId | shared matcher over active templates owning a published version, inputs from AcademicProfile (institution, faculty, department, programme) plus Programme qualification, programme name collisions broken by institution scope, scored programme 4, department 3, faculty 2, institution 1, qualification bonus 1; tie goes to most recent publishedAt then version id |
| Match with no winner | platform default version | PLATFORM_DEFAULT_TEMPLATE_VERSION_ID config value |
| Match reason text | human readable reason | fixed sentence naming the matched scope, e.g. the programme or department that won |
| Approval lock | templateVersionId on project plus chapter rows | chosen version at approval copied into ProjectSection rows in template order carrying title, order, type, and required flag (existing spec 0006 flow, unchanged); version revalidated as published on an active template, else rematch or default |
| Audit rows | actor plus action plus target | session user id plus route name plus template, version, or draft id; action names template.publish, template.apply, template.extract, template.archive; failed extractions audited |

**Key invariants**:
* Publish requires a rules row plus section count of at least 1, else 422.
* Published versions are immutable; edits return 409.
* Version numbers are gapless per template starting at 1.
* Template scope edits never alter published versions or locked projects.
* Concurrent publishes resolve to exactly one winner through a conditional update on isPublished false; the loser receives 409.
* Approval copies sections into project chapters; later template edits never touch locked projects.
* Draft apply runs once only; repeats return 409.
* Every admin write plus every 403 writes an AuditEvent row.
* Student reads are limited to the matched version plus versions locked to the caller owned projects.

**Security model**:
Admin and super admin roles write templates, drafts, and publishes through the existing requireAdmin guard on app/admin routes and API routes; students read only the match result plus versions locked to their own projects, enforced by userId scoping on every query. Cross student reads return 403, unauthenticated reads return 401, over limit extraction calls return 429 with a per admin per day window. Guideline PDFs reuse the private FileAsset storage path with presigned access, so no public URLs leak. Template rows hold no student personal data. All 403 plus 429 plus publish plus apply events write an audit event row with actor, action, target id, and outcome.

**Configuration required**:
* `OPENROUTER_API_KEY`: reuse of the server key already needed by spec 0006; no new credential.
* `OPENROUTER_EXTRACT_MODEL`: pinned snapshot used for rule extraction drafts.
* `PLATFORM_DEFAULT_TEMPLATE_VERSION_ID`: fallback version returned when no template matches; boot check fails loudly when the id is missing or archived.
* `TEMPLATE_EXTRACT_DAILY_CAP`: per admin daily extraction limit.
* No new storage credentials; guideline files reuse the FileAsset S3 path and background text extraction.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
* Happy path: upload guideline to extract to review to apply to publish, then student match to approval lock with copied chapters, verifies **AC-2**, **AC-3**, **AC-4**, **AC-5**.
* Failure case: provider failure during extraction keeps a blank draft, and publish of a ruleless or sectionless version returns 422, verifies **AC-2**, **AC-3**.
* Auth/permission: student POST to an admin route plus student GET of an unrelated version both return 403 with an audit row, verifies **AC-6**.
* Concurrency case: double publish with the same version yields one published version and one 409, verifies **AC-7**.
* Fallback case: student with an unmatched programme receives the platform default template, verifies **AC-4**.
* Edit case: scope edit on a template with a published version leaves the published version untouched, and an archived template keeps serving its locked owners while leaving matching, verifies **AC-8**.

## Build plan

Ordered as thin Tracer Bullet slices (your project default): a working thread first, then depth. Each task names its ACs.

1. Create the migration for TemplateDraft with indexes and cascade rules, and designate the platform default template version behind config, satisfies **AC-2**, **AC-4**.
2. Stand up the thin thread: shared hierarchy matcher lib plus GET match plus GET version read plus wizard suggestion rewired to the shared lib, satisfies **AC-4**, **AC-5**.
3. Wire admin template CRUD plus version create and edit plus the admin list and detail UI under app/admin, satisfies **AC-1**, **AC-8**.
4. Wire the extraction route plus draft list, detail, apply, and discard plus the review UI, satisfies **AC-2**, **AC-3**.
5. Wire guarded idempotent publish plus archive through isActive plus audit events plus extraction rate limits, satisfies **AC-3**, **AC-6**, **AC-7**.
6. Add pagination on every list plus empty, loading, and error states in both themes, satisfies **AC-1**, **AC-2**, **AC-6**, **AC-8**.

## Consequences

**Positive**:
* One versioned source of truth replaces scattered formatting assumptions across features.
* Assisted entry speeds rule capture while mandatory review keeps accuracy.
* A shared matcher keeps wizard, approval, and workspace consistent.
* The lock promise protects active student work from later publishes.

**Negative / tradeoffs**:
* Admin UI plus extraction plus review discipline is real operational load for a small team.
* Model drafts can read confident while wrong, so review is mandatory rather than optional.
* Draft rows plus guideline files add storage and a lifecycle to operate.
* The pinned extract model needs periodic review as provider catalogs shift.

**Neutral**:
* Live enforcement is deferred; the review feature (13) and the export feature (14) will read these rows later.
* Admin UI lives under the existing app/admin guard ahead of the future administration portal feature (16).
* Extraction spend stays platform funded with no student credit hold in version one.

## Follow-up

* [ ] Reconcile the override rule: spec 0006 AC-8 ships student override at approval while this spec matches from the profile; decide one rule and update the other spec.
* [ ] Designate the platform default template content and set PLATFORM_DEFAULT_TEMPLATE_VERSION_ID before launch.
* [ ] Decide later whether admin extraction should consume credits or stay platform funded.
* [ ] Review the pinned extract model each quarter as provider catalogs shift.
