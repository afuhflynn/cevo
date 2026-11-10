# Implementation Plan: Cevo

## 1. Overview & Strategy

This implementation plan defines the step-by-step engineering roadmap to take Cevo from its initial scaffold to a complete, production-ready SaaS application.

Work progresses in strict dependency order:
```
Phase 1: Foundation (Stack, Design System, Auth, Database)
   │
Phase 2: Academic Infrastructure (Onboarding, Institutions, Templates)
   │
Phase 3: Project Development (Creation Wizard, AI Framing, Briefs)
   │
Phase 4: Document Workspace (Tiptap Editor, Autosave, 3-Panel UX)
   │
Phase 5: Research & Citations (OpenAlex, Crossref, Reference Library)
   │
Phase 6: Commercial Core (Credit Ledger, Fapshi Mobile Money)
   │
Phase 7: Document Production (Review Engine, PDF & DOCX Exports)
   │
Phase 8: Administration & Operations (Dashboard, Moderation, Telemetry)
   │
Phase 9: Launch Readiness (Security Audit, End-to-End Verification)
```

---

## 2. Detailed Phase Breakdown

### Phase 1: Foundation
- **Milestones:**
  - Setup Cevo branding tokens and font loaders (Inter, Source Serif 4, JetBrains Mono).
  - Provision multi-size favicons and centralized `CevoLogo` component.
  - Setup Better Auth configuration with email/password and session handlers.
  - Initialize Prisma schema covering User, Session, Account, StudentProfile, AcademicProfile, CreditWallet, and CreditLedger.
  - Setup root and app layouts with dark/light mode and responsive containers.
- **Deliverables:**
  - `components/cevo-logo.tsx`
  - `app/globals.css` and `app/layout.tsx`
  - `prisma/schema.prisma`
  - `lib/auth.ts` and `/api/auth/[...all]/route.ts`

### Phase 2: Academic Infrastructure
- **Milestones:**
  - Institutional hierarchy tables (Institution, Faculty, Department, Programme, Session).
  - Seed Cameroonian institutions (University of Buea, University of Yaounde I, University of Bamenda, PKFokam, CUIB, etc.).
  - Student onboarding flow at `/onboarding` with progressive state persistence.
  - Template repository schema and default HND/B.Sc. computing templates.
- **Deliverables:**
  - `/onboarding` page and onboarding server actions
  - Seed scripts for academic institutions
  - Template rule engine (`TemplateRule`, `TemplateSection`)

### Phase 3: Project Development & Wizard
- **Milestones:**
  - Project listing and dashboard at `/app` and `/app/projects`.
  - 5-stage project creation wizard at `/app/projects/new`.
  - AI idea exploration and clarifying questions.
  - Project brief synthesizer with structured Zod output (`ProjectBriefOutputSchema`).
  - Project blueprint review and approval screen.
  - Automatic provisioning of chapter structure on approval.
- **Deliverables:**
  - `/app/projects/new` wizard
  - `/app/projects/[projectId]` overview hub
  - Project creation server actions

### Phase 4: Document Workspace
- **Milestones:**
  - 3-panel responsive layout (Navigator, Editor, AI Assistant).
  - Tiptap editor integration with formatting tools, tables, and citation marks.
  - Debounced autosave pipeline (1.5s) with local buffer and server persistence.
  - Section-level version snapshotting and restore.
  - Contextual AI assistant sidebar with paragraph improvements and diff previews.
- **Deliverables:**
  - `/app/projects/[projectId]/workspace`
  - Tiptap editor canvas and toolbars
  - Section save server actions

### Phase 5: Research Discovery & Citations
- **Milestones:**
  - OpenAlex and Crossref search integration with query normalization.
  - Research search UI with verified DOI badges and abstract previews.
  - Save to project reference library with student notes.
  - Deterministic APA 7 and Harvard citation formatting in TypeScript.
  - In-text citation insertion marker in Tiptap editor canvas.
- **Deliverables:**
  - `/app/projects/[projectId]/research`
  - Citation engine (`@/lib/citations/apa.ts`, `@/lib/citations/harvard.ts`)
  - Reference library manager

### Phase 6: Commercial Core & Mobile Money Payments
- **Milestones:**
  - Credit package definitions (Starter: 1,000 FCFA, Research: 2,500 FCFA, Project: 5,000 FCFA).
  - Fapshi API payment checkout integration for MTN MoMo and Orange Money.
  - Webhook listener with HMAC verification and idempotency locks.
  - Double-entry credit ledger and wallet mutations.
  - In-app payment status polling and confirmation modal.
  - Development payment simulator for offline/local testing.
- **Deliverables:**
  - `/app/credits` top-up center
  - `/app/transactions` ledger inspection
  - `/api/webhooks/fapshi` webhook route
  - Billing server actions

### Phase 7: Document Review & Multi-Format Export
- **Milestones:**
  - Pre-submission academic review scanner (objective consistency, orphan citations, missing required sections).
  - High-fidelity PDF generation engine preserving institutional margins, headers, and roman/arabic page numbering.
  - Clean DOCX generation mapping Tiptap nodes to native Microsoft Word styles.
  - Inngest background job execution for async compilation.
  - Export download center at `/app/projects/[projectId]/export`.
- **Deliverables:**
  - `/app/projects/[projectId]/review`
  - `/app/projects/[projectId]/export`
  - PDF & DOCX rendering pipelines

### Phase 8: Administration & Operations
- **Milestones:**
  - Admin dashboard at `/admin` with financial metrics, active students, and AI cost telemetry.
  - Student moderation (search, view profiles, suspend/reactivate).
  - Institutional template review and publishing workbench.
  - Payment inspection and manual reconciliation tool.
  - Background job queue health monitor.
  - Support ticket triage and response thread.
- **Deliverables:**
  - Complete `/admin` portal routes
  - Admin server actions with RBAC validation

### Phase 9: Launch Readiness & Quality Assurance
- **Milestones:**
  - Full mobile responsiveness audit on 360px, 768px, and 1024px screens.
  - Dark/light theme visual verification across all forms and panels.
  - Security audit: CSRF, IDOR tests, rate-limiting rules.
  - Production README with environment variables, database commands, and setup instructions.
- **Deliverables:**
  - Clean linting and typechecking
  - Comprehensive documentation and runbooks
