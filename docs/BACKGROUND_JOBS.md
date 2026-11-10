# Background Jobs Architecture: Cevo

## 1. Engine & Strategy: Inngest

Cevo uses **Inngest** for serverless, durable background workflows. Inngest provides:
- Step-level idempotency and checkpointing.
- Built-in exponential backoff retries without maintaining Redis queues.
- Local development testing via the Inngest Dev Server.
- Seamless execution in standard Node and serverless hosting environments.

All Inngest function handlers are mounted at `/api/inngest`.

---

## 2. Background Job Inventory

### Job 1: `file.process` (File Validation & Text Extraction)
- **Event:** `cevo/file.uploaded`
- **Payload:** `{ fileAssetId: string, projectId: string, s3Key: string, mimeType: string }`
- **Steps:**
  1. Fetch file stream from private S3 bucket.
  2. Validate magic bytes to verify genuine PDF/DOCX format.
  3. Extract text content:
     - For PDF: parse text layers via `pdf-parse`.
     - For DOCX: parse XML structure via `mammoth`.
  4. Update `FileAsset.extractedText` and set `isProcessed = true`.
- **Retry Policy:** 3 retries with exponential backoff (`delay: '5s'`).
- **Failure:** Marks `FileAsset.isProcessed = false` and notifies the student.

### Job 2: `template.extract` (Institutional Guideline Extraction)
- **Event:** `cevo/template.extract.requested`
- **Payload:** `{ templateId: string, fileAssetId: string }`
- **Steps:**
  1. Retrieve extracted text from `FileAsset`.
  2. Call OpenRouter with Advanced reasoning tier using `TemplateRuleSchema`.
  3. Generate `TemplateRule` and `TemplateSection` records in database.
  4. Dispatch in-app notification to Admin team: "New template ready for review".
- **Retry Policy:** 2 retries.

### Job 3: `project.export` (High-Fidelity PDF & DOCX Generation)
- **Event:** `cevo/project.export.requested`
- **Payload:** `{ exportJobId: string, projectId: string, format: 'PDF' | 'DOCX', templateVersionId: string }`
- **Steps:**
  1. Mark `ExportJob.status = PROCESSING`.
  2. Assemble all project sections in order with preliminary pages, chapter headings, and references.
  3. Render document:
     - **PDF:** Render styled HTML with running headers and page numbers into Chromium PDF stream.
     - **DOCX:** Compile OpenXML `.docx` buffer via `docx` library.
  4. Upload artifact to private S3 bucket under `exports/{projectId}/{exportJobId}.{ext}`.
  5. Update `ExportJob.status = COMPLETED`, save `s3Key` and `fileSize`.
  6. Dispatch in-app notification: "Your project export is ready to download".
- **Retry Policy:** 1 retry.

### Job 4: `payment.reconcile` (Fapshi Payment Reconciliation Cron)
- **Trigger:** Scheduled cron (`cron: "*/15 * * * *"`, every 15 minutes).
- **Steps:**
  1. Query database for `Payment` records where `status = PENDING` and `createdAt < now() - 10 minutes`.
  2. For each pending payment:
     - Query Fapshi API `/payment-status/:transId`.
     - If Fapshi reports `SUCCESSFUL`: execute transactional credit allocation.
     - If Fapshi reports `FAILED` or `EXPIRED`: update status accordingly.
  3. Log discrepancies in `AuditEvent`.

### Job 5: `storage.cleanup` (Temporary Export Artifact Cleanup)
- **Trigger:** Scheduled cron (`cron: "0 3 * * 0"`, weekly on Sunday at 3 AM).
- **Steps:**
  1. Find completed `ExportJob` records older than 14 days.
  2. Delete files from S3 bucket.
  3. Update `ExportJob.s3Key = null` to free storage.

---

## 3. Idempotency & Error Handling

- **Idempotency Keys:** Every step in Inngest uses deterministic step IDs.
- **Credit Safety:** Background jobs that process payments or exports use PostgreSQL serializable transactions to prevent duplicate mutations.
- **Telemetry:** Any job that encounters an unrecoverable error writes a structured entry to `AuditEvent` and notifies the admin dashboard.
