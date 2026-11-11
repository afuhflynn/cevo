# Scope: Cevo

Cevo is an academic project development workspace for university students. It guides students from an initial project idea to a structured, researched, verified, and exportable academic report following institutional guidelines.

**Build approach:** Tracer Bullet (vertical slices where each feature is built end to end through every layer, working).
**Workflow:** GA (after build, run verify, test, review, and documentation). The project default level of rigor for high trust academic documents, payments, and auth. `/solution-architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/feature-build` and skip `/solution-architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Stack & Design System Foundation | Foundation | done |
| 2 | Brand Assets & Central Logo Component | Foundation | done |
| 3 | Core Data Model & Schema Migration | Foundation | in-progress |
| 4 | Authentication & Session Management | Foundation | planned |
| 5 | Academic Onboarding & Institution Hierarchy | Slice 1 | planned |
| 6 | Student Dashboard & Project Catalog | Slice 2 | planned |
| 7 | Project Creation Wizard & Conversational Briefing | Slice 3 | planned |
| 8 | Document Workspace & Tiptap Editor Canvas | Slice 4 | planned |
| 9 | Contextual AI Assistant & Diff Previews | Slice 5 | planned |
| 10 | Verified Research Discovery & Citations | Slice 6 | planned |
| 11 | File Management & Private Storage | Slice 7 | planned |
| 12 | Institutional Template Engine & Rule Extraction | Slice 8 | planned |
| 13 | Pre-Submission Review & Academic Consistency | Slice 9 | planned |
| 14 | High-Fidelity PDF & DOCX Export Engine | Slice 10 | planned |
| 15 | Credit Ledger & Fapshi Mobile Money Checkout | Slice 11 | planned |
| 16 | Administration Portal & Platform Telemetry | Slice 12 | planned |
| 17 | Public Website & Marketing Pages | Slice 13 | planned |
| 18 | Local PostgreSQL via Docker Compose | Foundation | done |

## Foundations

### 1. Stack & Design System Foundation · done
Scaffold the Next.js 16 App Router environment with Tailwind CSS v4 OKLCH theme variables, font loaders for Inter, Source Serif 4, and JetBrains Mono, and shadcn component primitives.
**Done when:** the application boots cleanly with dark and light themes, typography variables load without circular references, and base UI primitives render properly.
- [x] Configure Tailwind CSS v4 and OKLCH color space
- [x] Setup Next.js Google font loaders in root layout
- [x] Wire global state providers and toast notifications: `/feature-build stack & design system foundation`
Code in `app/globals.css`, `app/layout.tsx`

### 2. Brand Assets & Central Logo Component · done
Provision Cevo geometric icon and wordmark brand assets, configure responsive sizing, and generate multi-size favicons.
**Done when:** favicon displays across browsers, touch icons work on mobile screens, and the central logo component handles expanded and collapsed states smoothly in dark and light modes.
- [x] Generate multi-size favicons and apple touch icons
- [x] Create centralized CevoLogo component with size presets and collapsed sidebar support
Code in `components/cevo-logo.tsx`, `public/branding/`, `app/favicon.ico`

### 3. Core Data Model & Schema Migration · in-progress
Define the normalized PostgreSQL schema via Prisma covering users, profiles, academic hierarchy, templates, projects, document sections, research sources, credit ledger, and audit events.
**Done when:** the Prisma schema passes validation, relations and cascading constraints are enforced, and initial migration applies cleanly to the PostgreSQL database.
Spec: [0001](docs/specs/0001-core-data-model-schema-migration.md)
- [x] Design it (spec): `/solution-architect core data model & schema migration`
- [ ] Build it: /feature-build core data model & schema migration
  - [ ] Create the Prisma schema and validate it (Satisfies AC-1, AC-2)
  - [ ] Apply the initial migration against local PostgreSQL (Satisfies AC-3)
  - [ ] Verify FK onDelete rules and financial record retention (Satisfies AC-2)
  - [ ] Wire up db:validate script and CI deploy step (Satisfies AC-1, AC-3)
- [ ] Verify it: /verify-release core data model & schema migration
- [ ] Test it: /test-engineer core data model & schema migration
- [ ] Review it (fresh model): /peer-review core data model & schema migration
- [ ] Document it: /tech-writer core data model & schema migration

### 18. Local PostgreSQL via Docker Compose · Foundation · done
Provision a local PostgreSQL database with Docker Compose, modeled on the genesyst setup (postgres:15-alpine, a dedicated cevo user and database, a ready healthcheck, and a persisted volume) so the Prisma migrations in feature 3 have a running database to apply against on localhost:5432.
**Done when:** `docker compose up` starts a healthy PostgreSQL reachable at the DATABASE_URL in `.env.example`, and `prisma migrate dev` applies cleanly against it.
- [x] Build it: `/feature-build local postgresql via docker compose`
Code in `docker-compose.yml`

**Verification:** `docker compose up` starts `cevo-db` (`postgres:15-alpine`) healthy on `localhost:5432`; `pg_isready -U cevo_user` passes and an authenticated connection as `cevo_user` to the `cevo` database succeeds, matching the `DATABASE_URL` in `.env.example`. The `postgres_data` volume persists data across restarts. `pnpm db:migrate` (Prisma 8's `contract emit → migration plan → db migrate` flow) applies the initial migration cleanly — `20261111T1145_init` with 163 ops, status "Up to date".
**Heads up:** I stopped `nightly-db` (another project's container on port 5432) to free the port cevo needs, and left `cevo-db` running. The `prisma.config.ts` was configured with `@prisma/orm-postgres` for Prisma 8, and `prisma/schema.prisma` was updated to Prisma 8 syntax (`// use prisma-8` directive, `@onCreate(cuid(2))` instead of `@default(cuid())`, `@onCreate(now()) @onUpdate(now())` instead of `@updatedAt`, `Text` type instead of `@db.Text`, `generator`/`datasource` blocks moved to `prisma.config.ts`).

### 4. Authentication & Session Management · needs a decision
Implement student and administrator authentication with Better Auth, including registration, email verification, password reset, and session cookies.
**Done when:** students can sign up with email and password, receive a verification email, sign in securely, and access role-guarded routes.
- [ ] Design it (spec): `/solution-architect authentication & session management`

## Slice 1: Academic Onboarding & Institution Hierarchy

### 5. Academic Onboarding & Institution Hierarchy · needs a decision
Guide new students through profile completion, capturing name, country, university, faculty, department, qualification level, and citation style preference.
**Done when:** onboarding progress saves progressively, students can select or suggest Cameroonian universities, and completing onboarding awards welcome credits and routes to the dashboard.
- [ ] Design it (spec): `/solution-architect academic onboarding & institution hierarchy`

## Slice 2: Student Dashboard & Project Catalog

### 6. Student Dashboard & Project Catalog · needs a decision
Provide a student home displaying active projects, credit balance, recent milestones, and project management controls such as search, filter, duplicate, and archive.
**Done when:** students can view real project statistics, search and filter projects by status, and navigate directly to active workspaces.
- [ ] Design it (spec): `/solution-architect student dashboard & project catalog`

## Slice 3: Project Creation Wizard & Conversational Briefing

### 7. Project Creation Wizard & Conversational Briefing · needs a decision
Build a 5-step wizard that turns an initial concept into an approved academic project brief with aims, objectives, research questions, and methodology.
**Done when:** conversational prompts gather sufficient project detail, the AI synthesizes a structured brief, and student approval provisions the project chapter tree.
- [ ] Design it (spec): `/solution-architect project creation wizard & conversational briefing`

## Slice 4: Document Workspace & Tiptap Editor Canvas

### 8. Document Workspace & Tiptap Editor Canvas · needs a decision
Implement the primary three panel workspace with a document tree, Tiptap rich text canvas, and debounced autosave.
**Done when:** students can navigate chapters, format text, insert tables and citations, and experience reliable autosave with local storage safety nets.
- [ ] Design it (spec): `/solution-architect document workspace & tiptap editor canvas`

## Slice 5: Contextual AI Assistant & Diff Previews

### 9. Contextual AI Assistant & Diff Previews · needs a decision
Provide an in-workspace academic co-pilot for tone revision, paragraph polishing, and consistency review with side-by-side diff previews.
**Done when:** students can request improvements with pre-calculated credit estimates, preview changes, and accept or discard edits without silent text replacement.
- [ ] Design it (spec): `/solution-architect contextual ai assistant & diff previews`

## Slice 6: Verified Research Discovery & Citations

### 10. Verified Research Discovery & Citations · needs a decision
Connect to OpenAlex and Crossref to search legitimate academic papers, save sources with notes, and format citations deterministically in APA 7 and Harvard styles.
**Done when:** students can search verified scholarly papers by DOI or topic, save them to project reference libraries, and insert deterministic citations directly into documents.
- [ ] Design it (spec): `/solution-architect verified research discovery & citations`

## Slice 7: File Management & Private Storage

### 11. File Management & Private Storage · needs a decision
Enable uploading supervisor instructions, datasets, figures, and guidelines into private S3 storage with presigned URLs and background text extraction.
**Done when:** files upload safely with type validation, previews render using temporary signed links, and text extracts in the background.
- [ ] Design it (spec): `/solution-architect file management & private storage`

## Slice 8: Institutional Template Engine & Rule Extraction

### 12. Institutional Template Engine & Rule Extraction · needs a decision
Maintain versioned academic formatting rules for universities, including margins, fonts, line spacing, and required preliminary pages.
**Done when:** templates match student qualification and department, extracted guideline rules are reviewable by administrators, and active projects stay locked to their chosen version.
- [ ] Design it (spec): `/solution-architect institutional template engine & rule extraction`

## Slice 9: Pre-Submission Review & Academic Consistency

### 13. Pre-Submission Review & Academic Consistency · needs a decision
Scan draft documents for missing required sections, uncited references, mismatched objectives, and formatting violations.
**Done when:** the scanner returns actionable warnings linked directly to the offending chapter paragraphs.
- [ ] Design it (spec): `/solution-architect pre-submission review & academic consistency`

## Slice 10: High-Fidelity PDF & DOCX Export Engine

### 14. High-Fidelity PDF & DOCX Export Engine · needs a decision
Compile complete academic reports into publication quality PDF and Microsoft Word DOCX formats with exact institutional margins, headers, and numbering.
**Done when:** background export jobs compile documents without server timeouts and deliver downloadable files with correct pagination.
- [ ] Design it (spec): `/solution-architect high-fidelity pdf & docx export engine`

## Slice 11: Credit Ledger & Fapshi Mobile Money Checkout

### 15. Credit Ledger & Fapshi Mobile Money Checkout · needs a decision
Implement prepaid credit packages in XAF with Fapshi mobile money collections (MTN MoMo and Orange Money), cryptographic webhook verification, and double entry ledger accounting.
**Done when:** students can purchase credit packages using mobile money, credits allocate exactly once upon payment confirmation, and failed AI runs trigger automatic refunds.
- [ ] Design it (spec): `/solution-architect credit ledger & fapshi mobile money checkout`

## Slice 12: Administration Portal & Platform Telemetry

### 16. Administration Portal & Platform Telemetry · needs a decision
Provide a protected administrative dashboard to monitor registrations, payments, AI token expenditures, template publishing, and support tickets.
**Done when:** administrators can inspect platform metrics, reconcile payments, review templates, and view audit events with strict role based access control.
- [ ] Design it (spec): `/solution-architect administration portal & platform telemetry`

## Slice 13: Public Website & Marketing Pages

### 17. Public Website & Marketing Pages · needs a decision
Deliver the public marketing website: a compelling landing page, transparent credit pricing cards mapped to Fapshi mobile money packages, a well-structured navigation bar, and legal terms conforming to Cameroon cyber law.
**Done when:** public routes load swiftly, the landing page communicates the core promise with real interface previews, pricing cards guide visitors into buying credits, and the navigation bar routes visitors to registration and key pages.
- [ ] Design it (spec): `/solution-architect public website & marketing pages`

## Deferred
Out of scope for initial launch, recorded so the plan remains honest.
- **In-browser voice transcription**: record supervisor meetings and project notes directly through Web Audio APIs · needs a decision
- **Group project collaboration**: multi-student shared editing on capstone projects · needs a decision · GA
- **Direct Turnitin integration**: institutional plagiarism index similarity scoring · needs a decision · GA
- **International payment methods**: Stripe and credit cards for overseas students · needs a decision
- **Capture stack conventions in root AGENTS.md**: Prisma, PostgreSQL, Better Auth, biome conventions · needs a decision · from spec 0001

## Legend

**The decision box.** Every feature carries one sub-task whose label ends with `(spec)`. It is the entry command to design the feature before building.

**Feature lifecycle**: the scope updates as a feature moves through the pipeline:

| State | Set by | What it shows |
|---|---|---|
| `planned` · needs a decision | `/scope-plan` | One box: `Design it (spec): /solution-architect <feature>` |
| `in-progress` (designed) | `/solution-architect` | `Design it` ticked; spec linked; `Build it: /feature-build <feature>` + milestone sub-tasks |
| `in-progress` (building) | `/feature-build` | Milestone boxes tick one by one; code pointer recorded |
| `in-progress` (verified) | `/verify-release` | Build milestones ticked; verification step ticked |
| `done` | You or the pipeline | All required boxes ticked; feature complete |

- **Next step** is always the first unticked box.
- **needs a decision** means run `/solution-architect` first.
