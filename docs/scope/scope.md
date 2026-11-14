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
| 4 | Authentication & Session Management | Foundation | done |
| 5 | Academic Onboarding & Institution Hierarchy | Slice 1 | in-progress |
| 6 | Student Dashboard & Project Catalog | Slice 2 | in-progress |
| 7 | Project Creation Wizard & Conversational Briefing | Slice 3 | in-progress |
| 8 | Document Workspace & Tiptap Editor Canvas | Slice 4 | in-progress |
| 9 | Contextual AI Assistant & Diff Previews | Slice 5 | in-progress |
| 10 | Verified Research Discovery & Citations | Slice 6 | in-progress |
| 11 | File Management & Private Storage | Slice 7 | planned |
| 12 | Institutional Template Engine & Rule Extraction | Slice 8 | planned |
| 13 | Pre-Submission Review & Academic Consistency | Slice 9 | planned |
| 14 | High-Fidelity PDF & DOCX Export Engine | Slice 10 | planned |
| 15 | Credit Ledger & Fapshi Mobile Money Checkout | Slice 11 | planned |
| 16 | Administration Portal & Platform Telemetry | Slice 12 | planned |
| 17 | Public Website & Marketing Pages | Slice 13 | planned |
| 18 | Local PostgreSQL via Docker Compose | Foundation | done |
| 19 | Branded Transactional Email Templates | Foundation | in-progress |
| 20 | UI Foundation Refresh and Primitive Audit | Foundation | planned |
| 21 | Onboarding Journey Polish | Journey A | planned |
| 22 | Auth Pages Polish | Journey B | planned |
| 23 | Dashboard Catalog Journey Polish | Journey C | planned |
| 24 | Workspace and Future Pages Guardrails | Journey D | planned |
| 25 | Public Site Polish | Journey E | planned |

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
Spec: [0001](docs/specs/0001-core-data-model-schema-migration/index.md)
- [x] Design it (spec): `/solution-architect core data model & schema migration`
- [x] Build it: /feature-build core data model & schema migration
  - [x] Create the Prisma schema and validate it (Satisfies AC-1, AC-2)
  - [x] Apply the initial migration against local PostgreSQL (Satisfies AC-3)
  - [x] Verify FK onDelete rules and financial record retention (Satisfies AC-2)
  - [x] Wire up db:validate script and CI deploy step (Satisfies AC-1, AC-3)
Code in `prisma/schema.prisma`
- [x] Verify it: /verify-release core data model & schema migration
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

### 4. Authentication & Session Management · done
Implement student and administrator authentication with Better Auth, including registration, email verification, password reset, and session cookies.
**Done when:** students can sign up with email and password, receive a verification email, sign in securely, and access role-guarded routes.
Spec: [0002](../specs/0002-authentication-session-management/index.md)
Code in app/api/auth/[...all]/route.ts, lib/auth.ts, lib/auth-adapter.ts, lib/auth-helpers.ts, lib/auth-client.ts, lib/arcjet.ts, lib/email.ts, lib/prisma.ts, lib/search-params.ts, app/(auth)/, app/admin/layout.tsx, app/forbidden.tsx, docker-compose.yml (mailpit), docs/SEARCH_PARAMS.md
- [x] Design it (spec): `/solution-architect authentication & session management`
- [x] Build it: `/feature-build authentication & session management`
  - [x] Foundation & adapter: spike Prisma 8 adapter binding, install nodemailer/@arcjet/next, create the auth route handler (Satisfies AC-1, AC-2, AC-4)
  - [x] Email verification & password reset: configure emailAndPassword with Argon2id cost 12, session sliding expiry, verification identifier convention and additive migration, single-use tokens (Satisfies AC-1, AC-3, AC-4)
  - [x] Authorization & rate limiting: requireAdmin guard reading role from DB, AuditEvent logging on denial, Arcjet rate limits with 429 RATE_LIMITED (Satisfies AC-5, AC-6)
  - [x] UI pages & end-to-end verification: sign in/sign up/forgot/reset pages, Mailpit dev mail capture, full sign up → verify → sign in → guard → reset → sign out flow (Satisfies AC-1, AC-2, AC-3, AC-5, AC-6)
- [x] Verify it: /verify-release authentication & session management
- [x] Test it: /test-engineer authentication & session management
- [x] Review it (fresh model): /peer-review authentication & session management
- [x] Document it: /tech-writer authentication & session management

### 19. Branded Transactional Email Templates · in-progress
Build a reusable branded email layout with Cevo logo, primary color, and footer so every transactional email looks like it belongs to the platform and increases trust.
**Done when:** verification and password reset emails render with logo header, primary action button in Cevo blue, footer with support and legal links, plain text fallback, and inbox safe HTML verified in Mailpit previews.
Spec: [0003](../specs/0003-branded-transactional-email-templates/index.md)
- [x] Design it (spec): `/solution-architect branded transactional email templates`
- [x] Build it: `/feature-build branded transactional email templates`
  - [x] Branded verification mail end to end: layout helper, text part, extended send function, Mailpit preview (Satisfies AC-1, AC-3, AC-4)
  - [x] Branded reset mail plus logo header and footer wiring: support contact, legal links, wordmark fallback (Satisfies AC-1, AC-2, AC-3, AC-4)
  - [x] Unit asserts plus Mailpit preview checklist and presentation only confirm (Satisfies AC-4, AC-5)
Code in `lib/email.ts`, `lib/auth.ts`
- [ ] Verify it: /verify-release branded transactional email templates
- [ ] Test it: /test-engineer branded transactional email templates
- [ ] Review it (fresh model): /peer-review branded transactional email templates
- [ ] Document it: /tech-writer branded transactional email templates

## Slice 1: Academic Onboarding & Institution Hierarchy

### 5. Academic Onboarding & Institution Hierarchy · in-progress
Guide new students through profile completion, capturing name, country, university, faculty, department, qualification level, and citation style preference.
**Done when:** onboarding progress saves progressively, students can select or suggest Cameroonian universities, and completing onboarding awards welcome credits and routes to the dashboard.
Spec: [0004](../specs/0004-academic-onboarding-institution-hierarchy/index.md)
- [x] Design it (spec): `/solution-architect academic onboarding & institution hierarchy`
- [x] Build it: `/feature-build academic onboarding & institution hierarchy`
  - [x] Seed plus search foundation with conditional migration and Cameroonian data (Satisfies AC-3, AC-4)
  - [x] Wizard shell plus personal step with shared validation and resume (Satisfies AC-2)
  - [x] Academic pickers plus suggest flow with parent filtering and revalidation (Satisfies AC-3, AC-4, AC-7)
  - [x] Preferences plus complete transaction with welcome grant and route guards (Satisfies AC-1, AC-5, AC-6, AC-7)
Code in `app/onboarding/`, `app/dashboard/`, `lib/onboarding*.ts`, `proxy.ts`, `scripts/seed-institutions.ts`, `prisma/schema.prisma`
- [ ] Verify it: /verify-release academic onboarding & institution hierarchy
- [ ] Test it: /test-engineer academic onboarding & institution hierarchy
- [ ] Review it (fresh model): /peer-review academic onboarding & institution hierarchy
- [ ] Document it: /tech-writer academic onboarding & institution hierarchy

## Slice 2: Student Dashboard & Project Catalog

### 6. Student Dashboard & Project Catalog · in-progress
Provide a student home displaying active projects, credit balance, recent milestones, and project management controls such as search, filter, duplicate, and archive.
**Done when:** students can view real project statistics, search and filter projects by status, and navigate directly to active workspaces.
Spec: [0005](../specs/0005-student-dashboard-project-catalog/index.md)
- [x] Design it (spec): `/solution-architect student dashboard & project catalog`
- [x] Build it: `/feature-build student dashboard & project catalog`
  - [x] Read thread with stats, catalog page one, and milestones feed from real rows (Satisfies AC-1, AC-4)
  - [x] Search, filter, and pagination through nuqs plus cached queries (Satisfies AC-2, AC-3)
  - [x] Card actions for duplicate, archive, and restore plus the archived page (Satisfies AC-5, AC-6, AC-7)
  - [x] Polish and guards: credit display, empty states, owner scoping with audit (Satisfies AC-8, AC-9, AC-10)
Code in `app/dashboard/`, `app/api/dashboard/projects/route.ts`, `lib/dashboard.ts`, `lib/search-params.ts`, `components/dashboard/` (nuqs 2.10.3, @tanstack/react-query 5.107.1; invalidation rule in `components/dashboard/query-provider.tsx`)
- [ ] Verify it: /verify-release student dashboard & project catalog
- [ ] Test it: /test-engineer student dashboard & project catalog
- [ ] Review it (fresh model): /peer-review student dashboard & project catalog
- [ ] Document it: /tech-writer student dashboard & project catalog

## Slice 3: Project Creation Wizard & Conversational Briefing

### 7. Project Creation Wizard & Conversational Briefing · in-progress
Build a 5-step wizard that turns an initial concept into an approved academic project brief with aims, objectives, research questions, and methodology.
**Done when:** conversational prompts gather sufficient project detail, the AI synthesizes a structured brief, and student approval provisions the project chapter tree.
Spec: [0006](../specs/0006-project-creation-wizard-briefing/index.md)
- [x] Design it (spec): `/solution-architect project creation wizard & conversational briefing`
- [x] Build it: `/feature-build project creation wizard & conversational briefing`
  - [x] Thin thread plus resume: sessions, turns, server readiness, session list (Satisfies AC-1, AC-2, AC-10)
  - [x] Synthesis plus versions: OpenRouter Output.object stream, estimate, version list and restore (Satisfies AC-3, AC-4, AC-5)
  - [x] Credits plus approval: hold and refund, atomic brief plus outline plus chapters, template lock (Satisfies AC-6, AC-7, AC-8)
  - [x] Guards plus polish: owner scoping, admin read, audit, Arcjet caps, expiry and prune, states (Satisfies AC-9, AC-10)
- [ ] Verify it: /verify-release project creation wizard & conversational briefing
- [ ] Test it: /test-engineer project creation wizard & conversational briefing
- [ ] Review it (fresh model): /peer-review project creation wizard & conversational briefing
- [ ] Document it: /tech-writer project creation wizard & conversational briefing
Code in `app/api/wizard/`, `app/dashboard/wizard/`, `app/dashboard/new/`, `components/wizard/`, `lib/wizard*.ts`, `prisma/schema.prisma`

## Slice 4: Document Workspace & Tiptap Editor Canvas

### 8. Document Workspace & Tiptap Editor Canvas · in-progress
Implement the primary three panel workspace with a document tree, Tiptap rich text canvas, and debounced autosave.
**Done when:** students can navigate chapters, format text, insert tables and citations, and experience reliable autosave with local storage safety nets.
Spec: [0007](../specs/0007-document-workspace-tiptap-editor/index.md)
- [x] Design it (spec): `/solution-architect document workspace & tiptap editor canvas`
- [x] Build it: `/feature-build document workspace & tiptap editor canvas`
  - [x] Thin thread plus editor: workspace shell, tree read, Tiptap copy restyled to theme with fixed and bubble toolbars (Satisfies AC-1, AC-2, AC-7)
  - [x] Tree operations: add, rename, delete with subtree confirm, reorder, nesting guard, completion toggle (Satisfies AC-1, AC-6)
  - [x] Autosave plus citations: 800ms save, offline queue, conflict banner, local mirror, placeholder citation marks (Satisfies AC-3, AC-4, AC-5)
  - [x] Inspector plus guards: outline, word counts, save state, owner scoping, audit, keyboard support (Satisfies AC-7, AC-8)
Code in `app/dashboard/projects/[id]/workspace/`, `app/api/projects/[projectId]/`, `components/workspace/`, `lib/workspace*.ts` (tiptap 3.33.1, React 19 verified via typecheck plus build)
- [ ] Verify it: /verify-release document workspace & tiptap editor canvas
- [ ] Test it: /test-engineer document workspace & tiptap editor canvas
- [ ] Review it (fresh model): /peer-review document workspace & tiptap editor canvas
- [ ] Document it: /tech-writer document workspace & tiptap editor canvas

## Slice 5: Contextual AI Assistant & Diff Previews

### 9. Contextual AI Assistant & Diff Previews · in-progress
Provide an in-workspace academic co-pilot for tone revision, paragraph polishing, and consistency review with side-by-side diff previews.
**Done when:** students can request improvements with pre-calculated credit estimates, preview changes, and accept or discard edits without silent text replacement.
Spec: [0008](../specs/0008-ai-assistant-diff-previews/index.md)
- [x] Design it (spec): `/solution-architect contextual ai assistant & diff previews`
- [x] Build it: `/feature-build contextual ai assistant & diff previews`
  - [x] Migration plus estimate plus runs skeleton with hold and 402 path (Satisfies AC-3, AC-7)
  - [x] Thin thread with stream, panel diff, and single paragraph accept (Satisfies AC-1, AC-2, AC-4, AC-6)
  - [x] Review warnings plus bulk actions plus history with pruning (Satisfies AC-4, AC-5, AC-7)
  - [x] Guards plus panel states plus audit and telemetry (Satisfies AC-8, AC-9, AC-10)
Code in `prisma/schema.prisma`, `lib/assistant.ts`, `lib/assistant-prompts.ts`, `app/api/projects/[projectId]/assistant/`, `app/api/cron/assistant-prune/`, `components/workspace/assistant-tab.tsx`, `components/workspace/workspace-client.tsx`
- [ ] Verify it: /verify-release contextual ai assistant & diff previews
- [ ] Test it: /test-engineer contextual ai assistant & diff previews
- [ ] Review it (fresh model): /peer-review contextual ai assistant & diff previews
- [ ] Document it: /tech-writer contextual ai assistant & diff previews

## Slice 6: Verified Research Discovery & Citations

### 10. Verified Research Discovery & Citations · in-progress
Connect to OpenAlex and Crossref to search legitimate academic papers, save sources with notes, and format citations deterministically in APA 7 and Harvard styles.
**Done when:** students can search verified scholarly papers by DOI or topic, save them to project reference libraries, and insert deterministic citations directly into documents.
Spec: [0009](../specs/0009-verified-research-discovery-citations/index.md)
- [x] Design it (spec): `/solution-architect verified research discovery & citations`
- [x] Build it: `/feature-build verified research discovery & citations`
  - [x] Migration plus formatter core with APA 7 plus Harvard Cite Them Right snapshots (Satisfies AC-4, AC-8)
  - [x] Thin search thread with merge plus cache plus caps plus partial failure (Satisfies AC-1, AC-5, AC-7)
  - [x] Save plus library thread with dedupe plus detail plus audit (Satisfies AC-2, AC-3, AC-6)
  - [x] Insert plus bibliography thread with reuse plus orphan prune plus audit (Satisfies AC-4, AC-6)
Code in `lib/research.ts`, `lib/research.test.ts`, `app/api/projects/[projectId]/research/`, `app/api/projects/[projectId]/sections/[sectionId]/citations/`, `components/workspace/research-tab.tsx`, `components/workspace/workspace-client.tsx`, `prisma/schema.prisma`
- [ ] Verify it: /verify-release verified research discovery & citations
- [ ] Test it: /test-engineer verified research discovery & citations
- [ ] Review it (fresh model): /peer-review verified research discovery & citations
- [ ] Document it: /tech-writer verified research discovery & citations

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

## UI Polish Foundation

### 20. UI Foundation Refresh and Primitive Audit · Journey · Beta · needs a decision
Audit what you own today in `components/ui` plus `app/globals.css` plus `app/layout.tsx` so later journeys share one modern base. Record which primitives stay, which need refresh for inputs plus selects plus date pickers plus dropdowns plus dialogs plus skeletons plus toasts plus empty states, plus motion rules that need your confirm, all while Tailwind setup stays intact.
**Done when:** audit list exists for each primitive plus token plus radius plus shadow, skeleton and empty and error patterns are agreed, motion allow list is approved by you, and future journeys have a clear base to reuse.
- [ ] Design it (spec): `/solution-architect ui foundation refresh and primitive audit`

## Journey A: Onboarding Complete

### 21. Onboarding Journey Polish · Journey · Beta · needs a decision
Rebuild the full onboarding path in `app/onboarding/page.tsx` from start plus personal details plus academic pickers plus preferences to welcome plus resume, with calm progress, clear validation, sane suggest flow, and kind empty plus loading plus error states using shadcn skeletons. Each page spec carries per page Firecrawl notes from ChatGPT plus Claude plus Antigravity style research plus frontend skill guidance.
**Done when:** a new student can complete onboarding with no confusion, progress saves and resumes, pickers filter cleanly, skeletons feel smooth, and each motion use has your approval recorded in the spec.
- [ ] Design it (spec): `/solution-architect onboarding journey polish`

## Journey B: Auth Complete

### 22. Auth Pages Polish · Journey · Beta · needs a decision
Polish the full auth path in `app/(auth)/sign-in/page.tsx` plus sign up plus forgot plus reset plus verify, with consistent inputs plus password feedback plus show and hide plus clear error plus success plus loading states in both themes. Each page spec carries per page Firecrawl notes plus frontend skill guidance.
**Done when:** sign in plus sign up plus reset plus verify all read as one family, errors guide recovery, loading uses skeletons or spinner patterns from the foundation, and no visual drift remains between auth pages.
- [ ] Design it (spec): `/solution-architect auth pages polish`

## Journey C: Dashboard Complete

### 23. Dashboard Catalog Journey Polish · Journey · Beta · needs a decision
Polish the full dashboard path in `app/dashboard/page.tsx` plus new plus archived plus project detail, covering stats plus catalog plus search plus filter plus pagination plus duplicate plus archive plus restore plus milestones plus credit display, with shadcn cards plus tables plus pagination plus skeletons for every loading pause. Each page spec carries per page Firecrawl notes plus frontend skill guidance.
**Done when:** stats scan fast, search plus filter plus pagination feel instant with URL reflected, card actions confirm kindly, skeletons cover stats plus list plus detail, and empty plus error states guide next action.
- [ ] Design it (spec): `/solution-architect dashboard catalog journey polish`

## Journey D: Workspace and Future Pages Complete

### 24. Workspace and Future Pages Guardrails · Journey · Beta · needs a decision
Set guardrails in `components/ui` plus shared layout so creation wizard plus document workspace plus assistant plus research plus files plus review plus export plus billing plus admin all start modern when built, reusing inputs plus pickers plus dialogs plus skeletons plus toasts from the foundation with no new visual language. Each future page spec will carry per page Firecrawl notes plus frontend skill guidance at build time.
**Done when:** guardrail list names allowed primitives plus patterns plus motion limits, existing planned features point to it, and a new page can start from it with no custom styles.
- [ ] Design it (spec): `/solution-architect workspace and future pages guardrails`

## Journey E: Public Site Complete

### 25. Public Site Polish · Journey · Beta · needs a decision
Polish the full public path in `app/page.tsx` covering landing plus pricing plus nav plus legal, with responsive layout, honest previews, clear calls to join, and fast load using foundation patterns. Spec carries per page Firecrawl notes plus frontend skill guidance.
**Done when:** landing tells the core promise in seconds, pricing guides to credits, nav routes cleanly to sign up, legal reads well on mobile plus desktop, and load feels instant.
- [ ] Design it (spec): `/solution-architect public site polish`

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
