# Product Requirements Document (PRD): Cevo

## 1. Product Vision and Overview

**Product Name:** Cevo  
**Category:** AI-powered academic project development workspace  
**Core Promise:** Plan, research, develop, and present your academic project in one workspace.

Cevo guides university students through their academic project journey, from raw idea to a structured, thoroughly researched, supervisor-reviewed, institutionally formatted, and export-ready academic document (dissertation, capstone project report, or thesis).

### Target Audience
1. **Primary Launch Audience:**
   - Cameroon higher education students enrolled in Higher National Diploma (HND) and Bachelor's programmes (B.Sc., B.Tech, Licence).
   - Core initial disciplines: Computer Science, Software Engineering, Information Technology, Computer Networks, and related computing fields.
2. **Expansion Audiences:**
   - Master's degree students (M.Sc., M.Tech, Master Professionnel).
   - Students in engineering, business, social sciences, and health disciplines.
   - Independent academic researchers.
   - Academic departments, supervisors, and institutional administrators.

### Core Problems Addressed
1. **Tool Fragmentation:** Students juggle Microsoft Word, Google Docs, WhatsApp, Zotero, Mendeley, search engines, and untrusted chatbots without unified document state or revision history.
2. **Institutional Non-Compliance:** Every institution and department enforces specific formatting guidelines (font sizes, margins, chapter numbering, preliminary pages, declarations). Students lose marks due to non-compliant layouts.
3. **Hallucinated or Fabricated Citations:** Generic AI tools invent fake journals, fake authors, and nonexistent DOIs. Cevo enforces verified bibliographic retrieval via OpenAlex, Crossref, and Semantic Scholar.
4. **Weak Project Structuring:** Students struggle to formulate crisp problem statements, specific research questions, measurable objectives, and clear methodology blueprints.
5. **Payment Barrier:** Most international academic SaaS tools require credit cards. Students in Cameroon primarily use Mobile Money (MTN MoMo and Orange Money). Cevo natively supports Mobile Money via Fapshi in XAF (FCFA).
6. **Academic Integrity and Ethics:** Ghostwriting services cheat students out of learning. Cevo acts as an intelligent co-pilot and tutor, maintaining student authorship, transparent AI assistance, and verifiable citations.

---

## 2. Product Principles

1. **Academic Usefulness Over Novelty:** Prioritize genuine scholarly quality, clear prose, and sound structure over gimmick features.
2. **Document Reliability and Preservation:** Students cannot afford lost work. Changes autosave with clear status indicators, local cache fallbacks, and recoverable version snapshots.
3. **Transparent AI Assistance:** AI suggests improvements, drafts outlines, and checks compliance, but never secretly replaces student text without confirmation.
4. **Verified Research Sources:** Academic references must be anchored in real scholarly indexes with verified DOIs, authors, and publication years.
5. **Student Ownership:** Students retain full copyright and ownership of their work, with continuous export capability in standard formats (PDF and DOCX).
6. **Institution-Specific Rules:** Formatting rules are versioned, configurable, and driven by verified institutional templates.
7. **Affordable Local Pricing:** Transparent prepaid packages payable via mobile money without hidden recurring subscriptions.
8. **Sustainable Unit Economics:** All LLM operations are metered and priced in platform credits with strict token budgets and fallback routing.
9. **Simple, Maintainable Architecture:** A clean modular monolith built on Next.js 16, TypeScript, Tailwind CSS v4, Prisma, PostgreSQL, and Inngest.

---

## 3. Product Boundaries & Academic Integrity

- **Not an Essay Mill:** Cevo does not provide an "auto-generate entire thesis" button. It assists with brainstorming, outlining, literature discovery, paragraph polishing, structural review, and formatting.
- **Student Responsibility:** The student remains the author and takes responsibility for their project contents and final submissions.
- **Supervisor Collaboration:** The system structures documents to produce clear drafts that students can review with their academic advisors.

---

## 4. User Personas

### Persona 1: Emmanuel (Final Year HND Software Engineering Student, Douala)
- **Context:** Building an IoT-based smart poultry monitoring system. Needs to produce an HND defense report following strict Ministry and school guidelines.
- **Pain Point:** Has strong coding skills but struggles to structure academic chapters (Problem Statement, Literature Review, System Architecture, Implementation). Does not have an international credit card to pay for US tools.
- **Goal:** Use Cevo to generate a compliant project brief, organize his 5 chapters, find relevant scholarly articles, and export a clean PDF/DOCX conforming to his school's required font, margin, and preliminary page rules.

### Persona 2: Brenda (B.Sc. Computer Science Student, University of Buea)
- **Context:** Working on machine learning for crop disease detection. Her supervisor rejected her initial proposal for lacking clear research questions and verified citations.
- **Pain Point:** Struggling to format APA 7 citations properly and terrified of accidentally citing fake papers generated by generic chat models.
- **Goal:** Search legitimate open-access papers on Cevo, link citations directly to her methodology and related works section, and run structural checks against her department's formatting guidelines.

### Persona 3: Platform Administrator / Academic Lead
- **Context:** Cevo operations team member in charge of onboarding new university templates and monitoring platform health.
- **Goal:** Upload official department guidelines, review extracted formatting rules, publish validated templates, inspect payment reconciliation, and monitor AI token usage and costs.

---

## 5. Functional Requirements

### FR-1: Public Marketing & Informational Portal
- Modern, fast, responsive public website with dark/light theme support.
- Routes: `/` (Landing), `/how-it-works`, `/features`, `/pricing`, `/templates`, `/faq`, `/contact`, `/legal/terms`, `/legal/privacy`, `/legal/academic-integrity`, `/legal/refunds`.
- Hero with actual product interface preview, value proposition, and primary call to action.
- Transparent credit pricing tiers (Starter: 1,000 FCFA, Research: 2,500 FCFA, Project: 5,000 FCFA).

### FR-2: Authentication & Student Onboarding
- Email/password authentication, session management, email verification, password reset, and sign-out powered by Better Auth.
- Multi-step onboarding collecting:
  - Personal details: First Name, Last Name, Preferred Language, Country.
  - Academic details: Institution, Faculty, Department, Programme, Qualification (HND, Bachelor's, Master's), Academic Session.
  - Optional: Preferred referencing style (APA 7, Harvard, IEEE), referral source.
- Ability to suggest a new institution if not listed.
- Progress persistence so interrupted onboarding can resume.

### FR-3: Student Dashboard & Project Management
- Route: `/app` with academic profile summary, credit balance, active/completed project counts, recent projects, next recommended action, and quick project creation.
- Route: `/app/projects` with search, status filters (Draft, Planning, In Progress, Ready for Review, Completed, Archived), renaming, duplicating, archiving, and safe deletion.

### FR-4: Intelligent Project Creation Wizard
- 5-stage wizard at `/app/projects/new`:
  1. **Project Basics:** Working title, project type (Applied/Software vs. Research-based), qualification, programme, target submission deadline.
  2. **Conversational Idea Discovery:** Text prompt (and future voice input boundary) where AI asks targeted follow-up questions to understand the scope.
  3. **Detailed Framing:** Problem statement, aim, specific objectives, research questions, scope, limitations, target population/environment, and methodology.
  4. **Academic Requirements & Template Selection:** Select verified institutional template, upload custom PDF/DOCX supervisor guideline, or choose standard default.
  5. **Blueprint Approval:** AI generates a comprehensive structured Project Brief. Student reviews, edits, and explicitly approves before the project workspace and chapter tree are provisioned.

### FR-5: Three-Panel Document Workspace
- Route: `/app/projects/[projectId]/workspace`:
  - **Left Panel (Document Navigator):** Preliminary pages (Title, Declaration, Dedication, Acknowledgements, Abstract, Table of Contents), numbered chapters, sections, references, appendices.
  - **Centre Panel (Editor Canvas):** Rich text editor powered by Tiptap with typography controls, headings, tables, blockquotes, lists, images, captions, page breaks, and citation markers.
  - **Right Panel (Contextual AI Assistant):** Academic tutor co-pilot aware of student qualification, department, project brief, current active section, and attached references.
- Mobile/Tablet adaptive: Panels collapse into switchable bottom sheets or slide-over drawers on smaller viewports.
- Real-time autosave with status indicator (Unsaved, Saving, Saved, Save Failed), local storage debounce buffer, and offline resilience.
- Version history with timestamped snapshots, summary of changes, and restore capability.

### FR-6: Task-Specific AI Assistant Layer
- Centralized model routing via OpenRouter with cost and context controls.
- Distinct specialized operations:
  - Brainstorming and topic narrowing.
  - Project brief and chapter outline generation.
  - Academic writing assistance (expanding notes, academic tone polishing, grammar improvement, sentence clarity).
  - Chapter consistency and objective alignment review.
  - Template compliance analysis.
- Student-in-the-loop: AI suggestions render in preview diffs; student accepts, edits, or rejects. No silent overwriting.
- Token consumption metering and credit deduction with pre-execution cost confirmation. Free operations (typing, formatting, manual saves) never cost credits.

### FR-7: Verified Academic Research & Citations
- Route: `/app/projects/[projectId]/research`.
- Live integration with scholarly APIs: OpenAlex and Crossref (with Semantic Scholar and Firecrawl boundaries).
- Search by keyword, title, author, DOI, or publication year.
- Result cards show verified title, authors, venue, year, abstract, DOI, and open access status.
- Source verification states: Metadata Verified, DOI Verified, Full Text Available, Requires Review.
- Add to project reference library with custom student annotations.
- Deterministic citation formatting (APA 7th Edition, Harvard) without LLM fabrication.
- One-click citation insertion into the Tiptap document canvas.

### FR-8: Supporting File Management
- Route: `/app/projects/[projectId]/files`.
- Upload guidelines, supervisor briefs, datasets, architecture diagrams, and literature PDFs.
- Private S3-compatible storage with signed, short-lived URLs.
- Background text extraction using Inngest.

### FR-9: Template Engine & Rule Extraction
- Versioned institutional template repository matching institution, faculty, department, programme, and qualification.
- Formatting rules: Page size (A4), margins (top, bottom, left/binding, right), font families, font sizes for Headings 1-4, body line spacing (e.g., 1.5 or 2.0 lines), paragraph indentation, preliminary page requirements, and citation style.
- Automated extraction from uploaded supervisor guides with administrative review and validation.

### FR-10: Review Engine & High-Fidelity Export
- Document review scanner checking for missing mandatory sections, unmatched objectives/conclusions, orphaned citations, and formatting discrepancies.
- Export pipeline:
  - High-fidelity PDF generation honoring exact institutional margins, running headers, roman preliminary numbering, and arabic chapter numbering.
  - Clean DOCX generation with proper Word heading styles, margins, and embedded tables.
- Async export jobs handled via Inngest with progress reporting and download history.

### FR-11: Prepaid Credit System & Mobile Money Payments
- Immutable double-entry credit ledger (Wallets, Transactions, Allocations, Deductions, Refunds).
- Fapshi integration supporting MTN Mobile Money and Orange Money in Cameroon (XAF / FCFA).
- Webhook verification with idempotent signature verification and scheduled status reconciliation.
- Pre-execution cost dialog showing remaining balance and credit cost.
- Immediate automatic refund if an AI operation fails or aborts.
- Development payment simulator for local testing without live credentials.

### FR-12: Administration & Operations
- Protected routes under `/admin` with role-based access control (Super Admin, Admin, Support).
- Admin dashboard displaying registrations, active projects, net collections, AI spend vs. revenue, and background job health.
- Institution, faculty, and department directory management.
- Template ingestion, extraction review, and publishing workflows.
- Payment inspection, transaction reconciliation, and manual ledger adjustments with audit logs.
- AI token usage telemetry, provider latency, cost metrics, and error rates.
- Inngest job queue monitoring and failed job replay triggers.
- Support ticket handling and response system.

---

## 6. Non-Functional Requirements

- **Performance:** Sub-100ms UI interactions; editor typing latency under 16ms (60 FPS); page loads with LCP < 2.0s.
- **Reliability:** 99.9% uptime target; zero document data loss via debounced autosave and local backup storage.
- **Security:** Strict server-side authorization on all routes and server actions; multi-tenant project isolation; signed URLs for files; SQL injection prevention via Prisma; rate-limiting via Arcjet.
- **Accessibility:** WCAG 2.1 AA compliance across public marketing and student workspace; full keyboard navigation; high contrast support.
- **Mobile Responsiveness:** Fluid support for mobile phones (360px+), tablets (768px+), laptops (1024px+), and desktop monitors (1440px+).

---

## 7. MVP Scope vs. Future Roadmap

| Area | MVP Scope (Phase 1-9) | Future Releases |
|---|---|---|
| Target Markets | Cameroon (HND, Bachelor's in CS/IT) | CEMAC, Nigeria, Ghana, Pan-African, UK/US |
| Payment Gateway | Fapshi (MTN MoMo, Orange Money) | Stripe, Flutterwave, Paystack |
| Referencing Styles | APA 7th Edition, Harvard | IEEE, Chicago, Vancouver, MLA |
| Document Formats | PDF, DOCX export | LaTeX export, Slide Deck (PPTX) |
| Voice Input | Text-first, voice architecture boundary | In-browser speech-to-text recording |
| Collaboration | Single student ownership | Multi-student group projects, supervisor review portal |
| Plagiarism Check | Source verification, academic review | Native Turnitin/Copyleaks integration |
