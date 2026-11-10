# API Design & Server Contracts: Cevo

## 1. Overview & Protocol Principles

Cevo leverages Next.js 16 App Router using a hybrid strategy:
1. **Server Actions (`@/actions/...`):** Primary mechanism for form submissions, state mutations, and transactional operations within authenticated layouts (type-safe end-to-end, zero boilerplate, automatic CSRF protection).
2. **Route Handlers (`/api/...`):** Used for external webhooks, streaming AI responses, file uploads, binary file downloads (exports), and external integrations.

### Standard Response Envelope
All API endpoints and Server Actions adhere to a consistent contract:

```typescript
export type ApiResponse<T> = 
  | { success: true; data: T; message?: string }
  | { success: false; error: { code: string; message: string; details?: unknown } };
```

---

## 2. Server Actions Inventory

### 2.1 Academic Onboarding (`@/actions/onboarding.ts`)
- `updatePersonalDetails(data: PersonalDetailsInput): Promise<ApiResponse<StudentProfile>>`
- `updateAcademicProfile(data: AcademicProfileInput): Promise<ApiResponse<AcademicProfile>>`
- `completeOnboarding(): Promise<ApiResponse<{ redirectUrl: string }>>`

### 2.2 Project Management (`@/actions/projects.ts`)
- `createProject(data: CreateProjectInput): Promise<ApiResponse<{ projectId: string }>>`
- `updateProjectDetails(projectId: string, data: UpdateProjectInput): Promise<ApiResponse<Project>>`
- `archiveProject(projectId: string): Promise<ApiResponse<void>>`
- `deleteProject(projectId: string): Promise<ApiResponse<void>>`
- `duplicateProject(projectId: string): Promise<ApiResponse<{ newProjectId: string }>>`

### 2.3 Project Creation Wizard (`@/actions/project-wizard.ts`)
- `generateBriefClarifications(step2Input: Step2DiscoveryInput): Promise<ApiResponse<AiQuestionsOutput>>`
- `generateProjectBlueprint(data: FramingInput): Promise<ApiResponse<ProjectBrief>>`
- `approveProjectBlueprint(projectId: string, briefData: BriefApprovalInput): Promise<ApiResponse<void>>`

### 2.4 Document Workspace (`@/actions/workspace.ts`)
- `saveSectionContent(projectId: string, sectionId: string, contentJson: unknown, expectedVersion: number): Promise<ApiResponse<{ newVersion: number; savedAt: string }>>`
- `createDocumentSnapshot(sectionId: string, summary: string): Promise<ApiResponse<DocumentVersion>>`
- `restoreDocumentSnapshot(sectionId: string, versionId: string): Promise<ApiResponse<ProjectSection>>`
- `toggleSectionCompletion(projectId: string, sectionId: string): Promise<ApiResponse<boolean>>`

### 2.5 Research & References (`@/actions/research.ts`)
- `saveSourceToProject(projectId: string, source: NormalizedSourceInput): Promise<ApiResponse<ProjectSource>>`
- `removeSourceFromProject(projectId: string, sourceId: string): Promise<ApiResponse<void>>`
- `updateSourceNote(projectId: string, sourceId: string, note: string): Promise<ApiResponse<void>>`
- `getProjectSources(projectId: string): Promise<ApiResponse<ProjectSourceWithDetails[]>>`

### 2.6 Billing & Payments (`@/actions/billing.ts`)
- `initiatePackagePurchase(packageId: string, phone: string, provider: 'MTN' | 'ORANGE'): Promise<ApiResponse<{ paymentUrl: string; transId: string }>>`
- `checkPaymentStatus(paymentId: string): Promise<ApiResponse<{ status: PaymentStatus; newBalance?: number }>>`
- `getWalletBalance(): Promise<ApiResponse<{ balance: number }>>`

### 2.7 Administration Actions (`@/actions/admin.ts`)
- `toggleStudentSuspension(userId: string, reason: string): Promise<ApiResponse<void>>`
- `adjustStudentCredits(userId: string, amount: number, reason: string): Promise<ApiResponse<void>>`
- `publishTemplateVersion(templateVersionId: string): Promise<ApiResponse<void>>`
- `reconcilePaymentManually(paymentId: string): Promise<ApiResponse<Payment>>`
- `respondToSupportTicket(ticketId: string, message: string): Promise<ApiResponse<void>>`

---

## 3. Route Handlers (`/api/...`)

### 3.1 Authentication Handlers (`/api/auth/[...all]`)
- Integrated with Better Auth. Handles session exchange, OAuth, email confirmation redirects, and token verifications.

### 3.2 AI Streaming & Execution (`/api/ai/stream`)
- **Method:** `POST`
- **Auth:** Session cookie required.
- **Request Body:**
  ```json
  {
    "projectId": "proj_123",
    "sectionId": "sec_456",
    "operation": "PARAGRAPH_IMPROVE",
    "prompt": "Improve academic formality and active voice",
    "contextText": "Our system helps farmers monitor chickens using sensors."
  }
  ```
- **Response:** Server-Sent Events (SSE) data stream powered by Vercel AI SDK `toDataStreamResponse()`.
- **Side Effect:** Automatically commits usage telemetry and debits student credits on stream completion.

### 3.3 Research Search Gateway (`/api/research/search`)
- **Method:** `GET`
- **Query Parameters:** `q` (string), `yearFrom` (number), `yearTo` (number), `limit` (default: 20).
- **Behavior:** Queries OpenAlex and Crossref concurrently, merges records, deduplicates by DOI, formats author names, and returns standardized records.

### 3.4 Payment Webhook Gateway (`/api/webhooks/fapshi`)
- **Method:** `POST`
- **Security:** Requires `x-fapshi-signature` header.
- **Request Body:**
  ```json
  {
    "transId": "fap_trans_987",
    "externalId": "pay_uuid_123",
    "status": "SUCCESSFUL",
    "amount": 2500,
    "financialTransId": "MTN_MOMO_REF_5544"
  }
  ```
- **Response:** `200 OK` (idempotent; duplicate deliveries return `200` without double allocation).

### 3.5 Document Export Gateway (`/api/projects/[id]/export`)
- **Method:** `POST` to queue export; `GET` to poll status and obtain presigned download link.
- **Request Body (POST):** `{ "format": "PDF" | "DOCX", "templateId": "tmpl_xyz" }`
- **Response (POST):** `{ "jobId": "job_999", "status": "QUEUED" }`
- **Response (GET):** `{ "status": "COMPLETED", "downloadUrl": "https://s3.../thesis.pdf?expires=..." }`

### 3.6 Background Job Webhook (`/api/inngest`)
- Serves Inngest SDK webhook for background task execution, event consumption, and retries.

---

## 4. Error Handling & Standard Codes

| Code | HTTP Status | Description |
|---|---|---|
| `UNAUTHENTICATED` | 401 | User session is missing or expired. |
| `FORBIDDEN` | 403 | User does not have permission (e.g. non-admin accessing admin portal, or accessing another student's project). |
| `NOT_FOUND` | 404 | Target resource (Project, Section, User) does not exist. |
| `INSUFFICIENT_CREDITS` | 402 | User wallet balance is lower than the operation price. |
| `VALIDATION_ERROR` | 422 | Zod schema validation failed on client input. |
| `CONFLICT_CONCURRENCY` | 409 | Document section version mismatch; student must refresh or merge. |
| `RATE_LIMITED` | 429 | Arcjet request limit exceeded on sensitive routes. |
| `GATEWAY_ERROR` | 502 | Upstream integration failure (OpenRouter, Fapshi, OpenAlex). |
| `INTERNAL_ERROR` | 500 | Unexpected server exception. |
