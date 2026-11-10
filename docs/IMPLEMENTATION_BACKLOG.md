# Implementation Backlog: Cevo

## 1. Backlog Summary

| Epic ID | Epic Name | Priority | Status |
|---|---|---|---|
| **EPIC-01** | Core Foundation, Identity & Branding | P0 | IN PROGRESS |
| **EPIC-02** | Academic Onboarding & Institution Hierarchy | P0 | PLANNED |
| **EPIC-03** | Project Wizard & Blueprint Synthesis | P0 | PLANNED |
| **EPIC-04** | Document Workspace & Tiptap Authoring | P0 | PLANNED |
| **EPIC-05** | Verified Academic Research & Citations | P0 | PLANNED |
| **EPIC-06** | Credit Accounting & Fapshi Mobile Money | P0 | PLANNED |
| **EPIC-07** | Document Review & PDF/DOCX Export | P1 | PLANNED |
| **EPIC-08** | Administration & Telemetry Portal | P1 | PLANNED |
| **EPIC-09** | Public Marketing & Legal Pages | P1 | PLANNED |

---

## 2. Epics & User Stories

### EPIC-01: Core Foundation, Identity & Branding
- **US-1.1: Design Tokens & Typography**
  - *Description:* Implement OKLCH brand variables, custom font variables (`--font-sans`, `--font-serif`, `--font-mono`), and dark/light variants.
  - *Acceptance Criteria:* Colors match primary `oklch(0.6231 0.1880 259.8145)`; Inter, Source Serif 4, and JetBrains Mono load with zero circular CSS variable warnings.
  - *Status:* Completed.
- **US-1.2: Centralized Cevo Logo Component**
  - *Description:* Create `components/cevo-logo.tsx` with full, icon, and collapsed sidebar states.
  - *Acceptance Criteria:* Renders cleanly in all sizes (xs to xl), adapts to dark/light backgrounds, supports collapsed sidebar mode with icon only.
  - *Status:* Completed.
- **US-1.3: Multi-Size Favicons & Icons**
  - *Description:* Generate and mount `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, and `apple-touch-icon.png`.
  - *Acceptance Criteria:* Root layout and browsers correctly display Cevo brand mark in browser tabs and mobile home screens.
  - *Status:* Completed.
- **US-1.4: Database Schema Foundation**
  - *Description:* Define full Prisma schema with PostgreSQL models for User, Session, Account, StudentProfile, AcademicProfile, CreditWallet, and CreditLedger.
  - *Acceptance Criteria:* Prisma schema validates cleanly; relations and foreign keys are strongly typed.
  - *Status:* In Progress.

### EPIC-02: Academic Onboarding & Institution Hierarchy
- **US-2.1: Institutional Data Model & Seeds**
  - *Description:* Model and seed Cameroon universities and faculties (UB, UY1, UBa, PKFokam, CUIB).
  - *Acceptance Criteria:* Students can select their institution, faculty, department, and programme from structured dropdowns.
  - *Status:* Planned.
- **US-2.2: Progressive Student Onboarding Wizard**
  - *Description:* Multi-step form at `/onboarding` capturing personal details, academic affiliation, and referencing style preference.
  - *Acceptance Criteria:* Progress persists to database; completing onboarding awards 50 starter welcome credits and redirects to `/app`.
  - *Status:* Planned.

### EPIC-03: Project Wizard & Blueprint Synthesis
- **US-3.1: 5-Stage Creation Wizard**
  - *Description:* Wizard at `/app/projects/new` guiding students through Basics, Idea Discovery, Framing, Template Selection, and Blueprint Approval.
  - *Acceptance Criteria:* Conversational AI prompts clarify student objectives; blueprint approves and generates structured project tree.
  - *Status:* Planned.
- **US-3.2: Project Overview Hub**
  - *Description:* Route `/app/projects/[projectId]` summarizing project status, approved brief, chapter checklist, and quick navigation.
  - *Acceptance Criteria:* Displays real persisted status, task checklist, and word counts.
  - *Status:* Planned.

### EPIC-04: Document Workspace & Tiptap Authoring
- **US-4.1: 3-Panel Document Workspace**
  - *Description:* Left document tree, center Tiptap canvas, right contextual AI assistant.
  - *Acceptance Criteria:* Smooth section switching without full reload; responsive bottom sheets on mobile devices.
  - *Status:* Planned.
- **US-4.2: Resilient Autosave Pipeline**
  - *Description:* 1.5s debounced autosave with visual status (Unsaved, Saving, Saved, Failed) and local storage recovery cache.
  - *Acceptance Criteria:* Zero lost keystrokes during temporary network disconnects.
  - *Status:* Planned.
- **US-4.3: Contextual AI Assistant with Diff Previews**
  - *Description:* AI assistant capable of academic tone polishing, objective consistency review, and side-by-side diff previews.
  - *Acceptance Criteria:* Shows credit cost before running; student must explicitly accept or reject suggestions.
  - *Status:* Planned.

### EPIC-05: Verified Academic Research & Citations
- **US-5.1: Scholarly Literature Search**
  - *Description:* Search OpenAlex and Crossref APIs with verified DOI badges and author metadata.
  - *Acceptance Criteria:* Returns real, verifiable academic papers; deduplicates by DOI; zero fabricated references.
  - *Status:* Planned.
- **US-5.2: Reference Library & Citation Generator**
  - *Description:* Save sources to project library; deterministic APA 7 and Harvard citation formatting; one-click insertion into Tiptap.
  - *Acceptance Criteria:* In-text citations insert cleanly; References section at document end updates automatically.
  - *Status:* Planned.

### EPIC-06: Credit Accounting & Fapshi Mobile Money
- **US-6.1: Immutable Double-Entry Credit Ledger**
  - *Description:* CreditWallet and CreditLedger models with transactional allocations, deductions, and refunds.
  - *Acceptance Criteria:* Wallet balance strictly equals sum of ledger entries; failed AI operations refund automatically.
  - *Status:* Planned.
- **US-6.2: Fapshi Mobile Money Integration**
  - *Description:* Checkout flow for MTN MoMo and Orange Money in Cameroon (XAF).
  - *Acceptance Criteria:* Webhook HMAC signature verification; duplicate protection; development payment simulator.
  - *Status:* Planned.

### EPIC-07: Document Review & PDF/DOCX Export
- **US-7.1: Pre-Submission Review Engine**
  - *Description:* Scan project for missing required sections, unreferenced citations, and mismatched objectives.
  - *Acceptance Criteria:* Returns actionable warning cards linked directly to affected document sections.
  - *Status:* Planned.
- **US-7.2: High-Fidelity PDF & DOCX Export**
  - *Description:* Async background job compiling formatted dissertation honoring institutional margins, headers, and numbering.
  - *Acceptance Criteria:* Produces valid, downloadable PDF and DOCX files.
  - *Status:* Planned.

### EPIC-08: Administration & Telemetry Portal
- **US-8.1: Admin Dashboard & Telemetry**
  - *Description:* Protected `/admin` routes showing active students, gross revenue, AI provider spend, and background job health.
  - *Acceptance Criteria:* Accessible only to users with `ADMIN` or `SUPER_ADMIN` role.
  - *Status:* Planned.
- **US-8.2: Template Management Workbench**
  - *Description:* Upload university guidelines, review AI-extracted formatting parameters, and publish versioned templates.
  - *Acceptance Criteria:* Admins can inspect and edit rules before publishing.
  - *Status:* Planned.

### EPIC-09: Public Marketing & Legal Pages
- **US-9.1: Public Website & Pricing Cards**
  - *Description:* Fast, modern public website (`/`, `/features`, `/pricing`, `/how-it-works`, `/faq`, `/contact`).
  - *Acceptance Criteria:* Clear value proposition, actual UI preview, transparent credit pricing in FCFA, mobile responsive.
  - *Status:* Planned.
- **US-9.2: Legal & Academic Integrity Documents**
  - *Description:* Legal routes (`/legal/terms`, `/legal/privacy`, `/legal/academic-integrity`, `/legal/refunds`).
  - *Acceptance Criteria:* Complies with Cameroon Law No. 2010/012; reinforces student authorship and ethical AI use.
  - *Status:* Planned.
