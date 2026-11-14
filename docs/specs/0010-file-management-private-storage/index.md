# 0010. File management and private storage

**Date**: 2026-11-14
**Status**: In Progress

## Summary

Students need a safe place for supervisor notes and guidelines and figures and datasets inside each project. This spec adds private file storage with direct browser uploads and short lived preview links and background text extraction. Build runs as a thin live slice first through every layer, then thickens with extraction plus guards plus polish.

## Requirements

**User stories**:
* As a student, I want to upload supervisor instructions and guidelines and figures and datasets to my project so that all source material lives in one place.
* As a student, I want to preview images and PDFs and text files in the browser so that I can check content without downloading.
* As a student, I want text extracted from documents in the background so that later review and search can use it.

**Acceptance criteria**:
* **AC-1**: Student requests an upload from the workspace Files tab with file name and mime type and size and checksum hint and category and client token. Server checks the exact allowlist of `application/pdf` and `image/png` and `image/jpeg` and `image/webp` and `image/gif` and DOCX and `text/csv` and `text/plain` with matching extensions pdf and png and jpg and jpeg and webp and gif and docx and csv and txt, and checks size at or under 25MB. HEIC and SVG stay out in version one. Server returns a presigned PUT URL valid 15 min with a server generated file id and object key, plus an advisory quota flag that never enforces. Student PUTs bytes direct to storage, then calls complete with file id and client token only. Server verifies with HeadObject that landed size equals requested size and that the checksum hint matches before creating the row, with magic byte sniff on complete. Disallowed type or oversize or stale token receives 400 with a clear message.
* **AC-2**: Student previews a file from the list. Server checks project ownership, then returns a presigned GET URL valid 5 min with inline disposition and the sanitized file name and the stored mime. Ownership failure gives 404, expired or tampered link use gives 403, and no bytes leak. Browser renders images inline and PDFs in a viewer and text based files as text.
* **AC-3**: After complete, PDF and DOCX and TXT and CSV files enter background extraction. `FileAsset` moves from PENDING to PROCESSING to COMPLETED, or to FAILED with a stored error, or to SKIPPED for image types. Parsers are pdf parse for PDF text and mammoth for DOCX paragraphs and CSV parse of the first 200 rows joined as text and UTF8 read for TXT. Stored text caps at 100KB with a `…[truncated]` marker. Runs try at most 3 times with backoff, a run stuck in PROCESSING over 30 min flips to FAILED with a timeout error, and reruns are idempotent and skip work when status is already COMPLETED. Scanned PDFs with no text layer get no OCR in version one and complete with empty text. The list shows status and the file stays usable when extraction fails, with a retry action.
* **AC-4**: File list for a project is paginated newest first by `createdAt` desc plus `id` desc with an opaque base64 cursor over both values and a filtered total from an indexed count. Category filter covers guideline and supervisor note and figure and dataset and literature and other. Page size is 20. Each row shows name and size and mime and category and upload date and extraction state. Response also reports `quotaUsedBytes`. Rows with null checksum sort normally and skip dedupe.
* **AC-5**: Project quota is 25MB per file and 200MB per project total, enforced only on complete inside a serializable transaction holding a Postgres advisory lock on the project id. Request returns an advisory `quotaWouldExceed` flag only and never rejects. Over quota completes receive 409. `clientToken` is unique, a repeat complete with the same token inside 24 hours returns the existing row, and a token older than 24 hours receives 400 stale. A repeat upload with the same non null checksum in one project returns the existing row with a deduped flag instead of a new copy. FAILED and SKIPPED rows count toward quota.
* **AC-6**: Only the project owner may request upload and complete and list and preview and delete, otherwise 404. The bucket denies all public read and every read passes through a signed URL plus an ownership check. Caps are 20 request uploads plus 20 completes plus 60 preview grants per min per user with 429 plus retry after seconds. Every request upload and complete and delete writes an `AuditEvent`, and preview writes one audit row at grant time only, with named actions `files.request`, `files.complete`, `files.delete`, `files.preview`.
* **AC-7**: A PUT that never finishes leaves no row because rows exist only on complete, and stale PUT URLs expire in 15 min. Orphan objects with no row older than 24 hours are removed by a 1 day bucket lifecycle rule on incomplete uploads plus a nightly reconciler. Corrupt files mark extraction FAILED and keep the row. Two parallel completes are serialized by the advisory lock so only the first committer inside quota wins and the second receives 409. Delete marks the row deleting then deletes the object then deletes the row, with an `s3Deleted` flag retried by the reconciler, and deleting a project cascades to rows plus objects through a cleanup worker.
* **AC-8**: The Files tab shows a guided empty state before the first upload and skeleton rows while loading and a helpful error state with retry on failure. Upload progress shows per file with clear messages for type and size and quota rejections.

## Decision

**Chosen option**: Option 1: Presigned S3 with R2 in prod and MinIO local plus Inngest extraction

Private bucket storage with short lived presigned URLs and an Inngest background function for text parsing. This matches the env already reserved for this feature and keeps large bytes out of serverless request limits.

**Implementation skills**: `prisma-8` (`prisma/prisma`, `.agents/skills/prisma-8/`)

## Feature design

**Data model sketch**:
* `FileAsset` extended: keep `id` PK and `projectId` FK to `Project` with cascade on project delete and `fileName` and `fileSize` Int and `mimeType` and `s3Key` unique and `category` enum and `extractedText` nullable text and `isProcessed` bool and `createdAt`. Add `uploadedByUserId` FK to `User` and `checksumSha256` nullable text and `clientToken` String unique and `extractionStatus` text with allowed values PENDING and PROCESSING and COMPLETED and FAILED and SKIPPED and `extractionError` nullable text and `updatedAt`. Add partial unique on `projectId` plus `checksumSha256` where checksum is not null for dedupe, and index on `projectId` plus `category` and index on `projectId` plus `createdAt` plus `id`.
* Relations: `Project` one to many `FileAsset` with cascade. `User` one to many `FileAsset` as uploader with restrict on user delete so file rows survive profile changes and stay owned by the project.
* Object key pattern: `projects/{projectId}/{fileId}/{slug}` where slug is the lowercased trimmed file name with runs of non alphanumeric collapsed to underscore and capped at 80 chars, set once at request time and stored in `s3Key` and never accepted from the client on complete.

**State transitions**:
* Upload: no row to PENDING on complete to PROCESSING when the Inngest run starts to COMPLETED or FAILED or SKIPPED at parse end. SKIPPED applies to image types and to files with no text target. A PROCESSING row older than 30 min flips to FAILED with a timeout error. Reruns for a file already COMPLETED return at once with no rewrite.
* Row lifecycle: active to deleting on owner delete to gone after the object delete confirms, with reconciler retry while `s3Deleted` stays false. Project delete cascades rows and enqueues object deletes in the cleanup worker. No restore path in version one.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/projects/[projectId]/files/request-upload` | POST | `fileName`:string (req), `mimeType`:string (req), `fileSize`:number (req), `category`:enum (req), `checksumSha256`:string (opt), `clientToken`:string (req) | `uploadUrl`, `fileId`, `s3Key`, `expiresInSec`, `quotaWouldExceed` advisory | owner | 400 invalid type or size or stale token, 404 no project, 429 capped |
| `/api/projects/[projectId]/files/complete` | POST | `fileId`:string (req), `clientToken`:string (req) | `file` row plus `deduplicated` flag plus `extractionStatus` | owner | 400 bytes missing or checksum mismatch, 404 no file, 409 quota exceeded or checksum clash, 429 capped |
| `/api/projects/[projectId]/files` | GET | `category`:enum (opt), `cursor`:string (opt), `limit`:number (opt, max 20) | file page plus `nextCursor` plus `total` plus `quotaUsedBytes` | owner | 404 no project |
| `/api/projects/[projectId]/files/[fileId]/preview` | GET | none | `previewUrl` plus `expiresInSec` inline disposition | owner | 403 expired or tampered use, 404 no file or non owner |
| `/api/projects/[projectId]/files/[fileId]` | DELETE | none | ok plus `s3Deleted` flag | owner | 404 no file |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| request upload | `uploadUrl` and `fileId` and `s3Key` and `expiresInSec` | server generated cuid file id plus slug built key in `S3_BUCKET_NAME`, AWS SDK presigner TTL 15 min from server clock |
| request upload | `quotaWouldExceed` advisory | sum of `FileAsset.fileSize` per `projectId` from DB plus requested `fileSize` input, advisory only |
| complete | `file` row and `deduplicated` flag | DB row by `fileId`, token match inside 24 hours returns existing, checksum match on `projectId` plus `checksumSha256` decides dedupe |
| complete | landed size and checksum verdict | S3 HeadObject size plus stored checksum compare on complete, client checksum treated as hint only |
| complete | `extractionStatus` initial PENDING | server set on row create, SKIPPED immediately for image mimes |
| list | page plus `total` plus `quotaUsedBytes` | DB query scoped by session `userId` to owned `projectId`, newest first, total from filtered indexed count, quota from summed `fileSize` in bytes |
| preview | `previewUrl` inline | AWS SDK presigner GetObject over stored `s3Key` with inline disposition and sanitized name, TTL 5 min, after ownership check, audit at grant time |
| extraction run | `extractedText` and terminal status | Inngest function output from object bytes fetched with server credentials, capped at 100KB with `…[truncated]` marker, idempotent rerun |
| UI | per file progress and error text | client upload state plus server error code from API response |

**Key invariants**:
* Every file row belongs to exactly one project and one uploader, and the object key embeds both project and file id and is server owned.
* `s3Key` is unique across all rows and never reused after delete, and complete never accepts a client supplied key.
* `clientToken` is unique, repeat inside 24 hours returns the existing row, older tokens are stale.
* Stored `fileSize` equals the landed object size verified by HeadObject on complete, and checksum dedupe runs only after verify.
* Quota is enforced only on complete inside a serializable transaction with an advisory lock on the project, and FAILED plus SKIPPED rows count toward quota.
* Extraction never blocks upload completion and never deletes the file on parse failure, and reruns are idempotent.
* Exact allowlist only from the AC-1 mime plus extension map, rechecked on complete with byte sniff, no HEIC and no SVG in version one.
* No public bucket read ever, all browser reads use a fresh signed GET after an ownership check, with 404 for non owner and 403 for bad or expired link use.

**Security model**:
* Project owner only for all five endpoints, others receive 404 to avoid id discovery. No admin read in version one, to keep the private promise simple. Admin access can be added later with explicit scope.
* Arcjet caps of 20 request uploads plus 20 completes plus 60 preview grants per min per user, matching the wizard and assistant pattern, with 429 plus retry after seconds.
* Server side mime allowlist plus extension plus magic byte sniff plus size cap rechecked on complete, client values treated as hints only. File names sanitized for key building with the slug rule and for display.
* Audit on request and complete and delete and preview grant only, including actor and project and file id and outcome, using the four named actions in **AC-6**.

**Configuration required**:
* `S3_ENDPOINT`: storage endpoint, R2 in prod and MinIO local
* `S3_REGION`: storage region, value auto for R2
* `S3_BUCKET_NAME`: private bucket name
* `S3_ACCESS_KEY_ID`: server only credential, never exposed
* `S3_SECRET_ACCESS_KEY`: server only credential, never exposed
* `INNGEST_EVENT_KEY`: event key for the extraction function trigger
* `INNGEST_SIGNING_KEY`: signing key that secures the Inngest endpoint
* All seven already exist in `.env.example`, no new names in version one. Local also needs a MinIO service in `docker-compose.yml` with matching endpoint and bucket bootstrap plus a 1 day lifecycle rule on incomplete uploads.

**Critical test scenarios**:
* Happy path: request then PUT then complete then list shows the file then preview renders then extraction completes, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**
* Failure case: parallel completes over quota allow one and reject the other via the advisory lock, and corrupt PDF keeps the file with FAILED plus retry, verifies **AC-5**, **AC-7**
* Auth/permission: non owner receives 404 on list and preview and delete, bad or expired preview use receives 403, and public GET on the bucket or object fails closed, verifies **AC-6**

## Build plan

Ordered as a Tracer Bullet thin thread first, then thickening. Each task names the ACs it satisfies.

1. Extend `FileAsset` with uploader and checksum and unique client token and extraction status and timestamps plus indexes and the MinIO local service and bucket bootstrap with lifecycle rule, satisfies **AC-3**, **AC-5**
2. Build the thin thread of request upload plus complete with server key generation and advisory quota flag plus ownership guard plus paginated newest first list, using real R2 or MinIO end to end, satisfies **AC-1**, **AC-4**, **AC-6**
3. Add signed inline preview plus the workspace Files tab with basic list and viewer states and 404 versus 403 handling, satisfies **AC-2**, **AC-8**
4. Add the Inngest extraction function for PDF and DOCX and TXT and CSV with the 100KB cap and 3 try backoff and 30 min timeout and idempotent rerun, satisfies **AC-3**, **AC-7**
5. Add serializable quota enforcement with advisory lock plus checksum verify plus dedupe plus token window plus Arcjet caps plus audit events plus bucket deny public proof, satisfies **AC-5**, **AC-6**, **AC-7**
6. Finish category filter plus delete with S3 then row order plus project cascade worker plus nightly orphan reconciler plus empty and error and loading polish, satisfies **AC-4**, **AC-7**, **AC-8**

## Consequences

**Positive**:
* Large files never pass through serverless functions, so uploads stay fast and avoid body limits.
* Private by default with short lived links, so sharing a URL cannot leak the library.
* Background parsing keeps the UI responsive and gives later review a text source to use.

**Negative / tradeoffs**:
* Two services to operate in prod in R2 plus Inngest, plus MinIO local, so local setup gains one container.
* Eventual text availability, so features that need extracted text must handle PENDING and FAILED states.
* Presigned flow has more client states to test, including stalled PUT and expired URL retry.

**Neutral**:
* `FileAsset` rows grow one object per file, plus extraction text capped at 100KB, which raises row size for large documents.
* Admins have no file read in version one, which simplifies privacy but limits support visibility.

## Follow-up

* [ ] Add MinIO to `docker-compose.yml` with bucket create on boot and 1 day lifecycle on incomplete uploads and document local keys that match `.env.example`.
* [ ] Add the nightly orphan reconciler plus the project cascade cleanup worker before production launch.
* [ ] Revisit admin read only file access for support once the private path is proven in production.
* [ ] Reuse this extraction pipeline for template guideline rule import in the template engine slice when that spec is written.

## Rationale

Reasoning and options: see `rationale.md`.
