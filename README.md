# Cevo — Academic Project Development Workspace

<div align="center">
  <img src="public/branding/cevo-logo.png" alt="Cevo Logo" width="320" />
  <p><strong>Plan, research, develop, and present your academic project in one workspace.</strong></p>
  <p>From initial idea to a structured, thoroughly researched, verified, and institutionally formatted academic report.</p>
</div>

---

## 1. Product Overview

**Cevo** is a SaaS platform engineered to help university students (initially HND and Bachelor's students in Cameroon and expanding internationally) plan, research, write, review, and export academic dissertations and capstone project reports.

### Key Capabilities
- **5-Stage Intelligent Project Wizard:** Conversational idea discovery, academic framing (problem statement, aim, measurable objectives, research questions, methodology), and blueprint approval.
- **Three-Panel Document Workspace:** Hierarchical chapter navigator (preliminaries, chapters, post-matter), Tiptap-powered rich text canvas, and contextual AI academic tutor co-pilot.
- **Verified Research & Citations:** Direct integration with OpenAlex and Crossref scholarly APIs. Eliminates fabricated AI citations through real metadata retrieval and deterministic APA 7 / Harvard citation generation.
- **Institutional Template Engine:** Versioned academic formatting guidelines enforcing exact margins, font hierarchies, line spacings, and preliminary sequences for institutions (e.g. University of Buea, University of Yaoundé I, PKFokam Institute).
- **Prepaid Mobile Money Credits:** Native integration with Fapshi supporting MTN Mobile Money and Orange Money in XAF (FCFA). Transparent credit metering with automatic refunds on failed AI runs.
- **High-Fidelity Document Production:** Background generation of publication-ready PDF and DOCX reports.
- **Platform Administration & Telemetry:** Multi-tenant project oversight, template extraction and publishing workbench, AI token cost telemetry, and payment reconciliation.

---

## 2. Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Framework** | Next.js 16.4 (App Router) | React 19, Server Components, Server Actions, Turbopack |
| **Language** | TypeScript | Strict mode, no untyped `any` |
| **Package Manager** | `pnpm` (v11.9.0) | Fast, deterministic workspace dependency management |
| **Styling** | Tailwind CSS v4 | `@theme inline` OKLCH color space, dark/light variants |
| **UI Components** | shadcn/ui + Base UI | Standardized primitives exclusively in `@/components/ui` |
| **Authentication** | Better Auth | Session cookies, email verification, role-based access |
| **Database & ORM** | PostgreSQL + Prisma (v8) | Type-safe migrations, strict relational integrity |
| **Editor Canvas** | Tiptap (ProseMirror core) | Canonical ProseMirror JSON structure per section |
| **AI Layer** | Vercel AI SDK + OpenRouter | Tiered model routing (Economical vs Advanced reasoning) |
| **Background Jobs** | Inngest | Durable workflows for exports, file extraction, reconciliation |
| **Payments** | Fapshi | MTN Mobile Money, Orange Money (XAF / FCFA) |
| **Research APIs** | OpenAlex & Crossref | Verified scholarly publication index and DOI verification |
| **Object Storage** | S3-Compatible Cloud Storage | Private buckets with short-lived presigned URLs |
| **Security & Limits** | Arcjet | Application firewall, rate limiting, bot protection |

---

## 3. Brand Assets & Logo Usage

Cevo uses an abstract geometric symbol independent of the wordmark.

### Central Logo Component
Import the centralized logo component across all layouts:

```tsx
import { CevoLogo } from "@/components/cevo-logo";

// Full logo with wordmark (default)
<CevoLogo size="md" href="/app" />

// Icon only (ideal for collapsed sidebars and mobile)
<CevoLogo variant="icon" size="sm" />

// With role or environment badge
<CevoLogo size="md" badge="Admin" href="/admin" />

// Collapsed state bound to sidebar trigger
<CevoLogo collapsed={isSidebarCollapsed} href="/app" />
```

### Brand Files in `public/branding/`
- `public/branding/cevo-icon.png` (Transparent geometric icon)
- `public/branding/cevo-logo.png` (Transparent full logo with wordmark)
- `public/branding/cevo-icon-white-bg.png` (Icon with background)
- `public/branding/cevo-logo-white-bg.jpg` (Full logo with background)
- `app/favicon.ico`, `public/favicon-16x16.png`, `public/favicon-32x32.png`, `public/apple-touch-icon.png`

---

## 4. Development Rules & Engineering Standards

1. **Strict TypeScript:** Avoid `any` unless documented with explicit justification.
2. **UI Component Rule:** Use **shadcn/ui** exclusively for UI components (date pickers, dialogs, dropdowns, sidebars, sheets). Customize them to maintain Cevo's minimal, modern academic aesthetic. Do not install conflicting UI libraries.
3. **Build Command Rule:** **Never run `pnpm build`, `npm run build`, or any build command during active development.** Use targeted checks (`pnpm lint`, `pnpm format`, TypeScript checks in IDE/compiler) to preserve development speed.
4. **Data Isolation:** All database queries must enforce server-side multi-tenant ownership checks against the active session's `userId`.
5. **Double-Entry Financial Accounting:** Every credit alteration must write to both `CreditWallet` and an immutable `CreditLedger` entry inside a database transaction.
6. **No Fabricated References:** AI models must never generate fake citations. Scholarly references must come from OpenAlex/Crossref.

---

## 5. Getting Started & Local Setup

### Prerequisites
- Node.js 20+ (LTS recommended)
- `pnpm` (`npm install -g pnpm`)
- PostgreSQL instance (local or hosted e.g. Neon, Supabase, Prisma Postgres)

### Installation
```bash
# 1. Clone repository and install dependencies
pnpm install

# 2. Configure environment variables
cp .env.example .env
# Edit .env with your PostgreSQL credentials and API keys

# 3. Push database schema
npx prisma db push

# 4. Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Environment Variables (`.env`)

```env
# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/cevo?schema=public"

# Authentication (Better Auth)
BETTER_AUTH_SECRET="your-32-character-secret-key-here"
BETTER_AUTH_URL="http://localhost:3000"

# OpenRouter (AI Model Gateway)
OPENROUTER_API_KEY="sk-or-v1-..."
AI_DEFAULT_ECONOMICAL_MODEL="openai/gpt-4o-mini"
AI_DEFAULT_ADVANCED_MODEL="anthropic/claude-3.5-sonnet"

# Fapshi (Mobile Money in Cameroon)
FAPSHI_API_KEY="your-fapshi-api-key"
FAPSHI_API_USER="your-fapshi-api-user"
FAPSHI_BASE_URL="https://live.fapshi.com" # or sandbox for testing
FAPSHI_WEBHOOK_SECRET="your-webhook-secret"

# S3 Compatible Private Storage
S3_ENDPOINT="https://..."
S3_REGION="auto"
S3_BUCKET_NAME="cevo-private-assets"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"

# Inngest Background Jobs
INNGEST_EVENT_KEY="your-inngest-event-key"
INNGEST_SIGNING_KEY="your-inngest-signing-key"

# Arcjet Rate Limiting
ARCJET_KEY="ajkey_..."
```

---

## 7. Project Documentation Index

Comprehensive engineering and product documentation is available in [`/docs`](file:///home/afuhflynn/Projects/FlynnSphere/cevo/docs):

- [`docs/PRODUCT_REQUIREMENTS.md`](file:///home/afuhflynn/Projects/FlynnSphere/cevo/docs/PRODUCT_REQUIREMENTS.md) — Product vision, personas, problem statements, acceptance criteria, and MVP boundaries.
- [`docs/INFORMATION_ARCHITECTURE.md`](file:///home/afuhflynn/Projects/FlynnSphere/cevo/docs/INFORMATION_ARCHITECTURE.md) — Complete route map, public pages, student app, and administration hierarchy.
- [`docs/USER_FLOWS.md`](file:///home/afuhflynn/Projects/FlynnSphere/cevo/docs/USER_FLOWS.md) — End-to-end user journeys (onboarding, project wizard, workspace autosave, payments, export).
- [`docs/TECHNICAL_ARCHITECTURE.md`](file:///home/afuhflynn/Projects/FlynnSphere/cevo/docs/TECHNICAL_ARCHITECTURE.md) — Modular monolith structure, adapters, external providers, and Inngest workflows.
- [`docs/DATABASE_DESIGN.md`](file:///home/afuhflynn/Projects/FlynnSphere/cevo/docs/DATABASE_DESIGN.md) — 9 entity groups, Prisma models, constraints, and financial integrity rules.
- [`docs/API_DESIGN.md`](file:///home/afuhflynn/Projects/FlynnSphere/cevo/docs/API_DESIGN.md) — Server actions, route handlers, request/response contracts, and error envelopes.
- [`docs/AI_DESIGN.md`](file:///home/afuhflynn/Projects/FlynnSphere/cevo/docs/AI_DESIGN.md) — Task-specific operations, model routing, context pruning, and token accounting.
- [`docs/BACKGROUND_JOBS.md`](file:///home/afuhflynn/Projects/FlynnSphere/cevo/docs/BACKGROUND_JOBS.md) — Inngest background job inventory, triggers, and retry policies.
- [`docs/SECURITY_AND_PRIVACY.md`](file:///home/afuhflynn/Projects/FlynnSphere/cevo/docs/SECURITY_AND_PRIVACY.md) — Authentication, multi-tenant authorization, private S3 storage, and Cameroon Law compliance.
- [`docs/IMPLEMENTATION_PLAN.md`](file:///home/afuhflynn/Projects/FlynnSphere/cevo/docs/IMPLEMENTATION_PLAN.md) — 9 execution phases, dependencies, milestones, and deliverables.
- [`docs/IMPLEMENTATION_BACKLOG.md`](file:///home/afuhflynn/Projects/FlynnSphere/cevo/docs/IMPLEMENTATION_BACKLOG.md) — Epics, user stories, tasks, priorities, and acceptance criteria.
- [`docs/DECISIONS.md`](file:///home/afuhflynn/Projects/FlynnSphere/cevo/docs/DECISIONS.md) — Architectural decision records (ADRs) and engineering rules.
- [`docs/scope/scope.md`](file:///home/afuhflynn/Projects/FlynnSphere/cevo/docs/scope/scope.md) — Coarse living feature scope for agentic development.

---

## 8. License

Copyright © 2026 Cevo. All rights reserved.
