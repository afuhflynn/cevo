# Information Architecture: Cevo

## 1. System Map & Overview

Cevo is organized into four distinct architectural zones:
1. **Public Marketing & Institutional Portal (`/`, `/features`, `/pricing`, `/legal/...`)**
2. **Authentication & Identity Flow (`/auth/...`)**
3. **Student Workspace & Account Portal (`/app/...`)**
4. **Platform Administration & Telemetry Portal (`/admin/...`)**

Each zone has dedicated layout components, middleware guards, and navigation hierarchies.

```
                    ┌──────────────────────────────────┐
                    │            Cevo Root             │
                    └──────────────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
┌──────────────────┐        ┌──────────────────┐         ┌──────────────────┐
│  Public Zone     │        │ Authentication   │         │ Protected Zones  │
│  (Marketing,     │        │ (Sign In, Up,    │         │ (Student & Admin)│
│  Docs, Legal)    │        │ Password, Reset) │         └─────────┬────────┘
└──────────────────┘        └──────────────────┘                   │
                                                  ┌────────────────┴────────────────┐
                                                  ▼                                 ▼
                                      ┌───────────────────────┐         ┌───────────────────────┐
                                      │ Student Portal (/app) │         │ Admin Portal (/admin) │
                                      │ (Role: Student, User) │         │ (Role: Admin, Super)  │
                                      └───────────────────────┘         └───────────────────────┘
```

---

## 2. Complete Route Map

### 2.1 Public Zone (Unauthenticated / Public Layout)

| Route | Page Name | Core Responsibilities & Key Components |
|---|---|---|
| `/` | Landing Page | Hero with product preview, problem statement, workflow walkthrough, feature showcases, verified research explainer, institutional formatting preview, pricing cards, FAQs, and global footer. |
| `/how-it-works` | How It Works | Deep dive into the 5-step Cevo project development methodology (Idea -> Framing -> Structure -> Research -> Export). |
| `/features` | Features | In-depth breakdown of editor, AI assistant, verified research integration, template engine, and exports. |
| `/pricing` | Pricing & Credits | Dynamic credit packages, unit costs per AI operation, mobile money payment guide, refund guarantee, and FAQ. |
| `/templates` | Academic Templates | Directory of verified Cameroonian institutions (UB, UBa, UY1, UY2, PKFokam, CUIB, etc.) and departmental templates. |
| `/faq` | FAQ | Frequently asked questions organized by category (Academic Integrity, Payments, Templates, AI, Privacy). |
| `/contact` | Contact & Support | Contact form, support email, office hours, and technical support ticketing access. |
| `/legal/terms` | Terms of Service | User agreement, acceptable use, student authorship acknowledgement, and payment terms. |
| `/legal/privacy` | Privacy Policy | Data retention, personal data processing, compliance with Cameroon Law No. 2010/012 on Cyber-security and Cyber-criminality. |
| `/legal/academic-integrity` | Academic Integrity | Anti-plagiarism rules, ethical AI guidelines, and academic defense responsibility. |
| `/legal/refunds` | Refund Policy | Credit refund criteria, failed transaction resolution, and dispute procedures. |

### 2.2 Authentication Zone (`/auth/...`)

| Route | Page Name | Core Responsibilities |
|---|---|---|
| `/auth/sign-in` | Sign In | Email and password login form, "remember me", link to forgot password, redirect to return URL. |
| `/auth/sign-up` | Sign Up | Account registration (Name, Email, Password, Terms acceptance), instant email verification trigger. |
| `/auth/verify-email` | Verify Email | Token verification handler and status display with resend option. |
| `/auth/forgot-password` | Forgot Password | Email submission to receive password reset link. |
| `/auth/reset-password` | Reset Password | Secure password reset entry using validated one-time token. |

### 2.3 Student Onboarding (`/onboarding`)

| Route | Step | Core Responsibilities |
|---|---|---|
| `/onboarding` | Student Onboarding Wizard | Multi-step progressive onboarding capturing: <br>1. Personal info (Names, Language, Country) <br>2. Academic profile (Institution, Faculty, Department, Programme, Qualification, Session) <br>3. Referencing preference (APA 7, Harvard) & referral source. <br>State persisted to database so students can resume. |

### 2.4 Student Portal (`/app/...`)

Protected by `StudentAuthGuard`. Redirects unauthenticated users to `/auth/sign-in` and incomplete profiles to `/onboarding`.

| Route | Page Name | Core Responsibilities |
|---|---|---|
| `/app` | Student Dashboard | Metric cards (Available Credits, Active Projects, Completed Projects), recent projects grid, next action prompt, quick start actions. |
| `/app/projects` | All Projects | Project catalog with search, status filters (Draft, Planning, In Progress, Ready for Review, Completed, Archived), sort by updated date, project actions menu (Rename, Duplicate, Archive, Delete). |
| `/app/projects/new` | New Project Wizard | 5-step intelligent project creation wizard (Basics -> Conversational Idea Exploration -> Detailed Framing -> Academic Template -> Approved Brief). |
| `/app/projects/[projectId]` | Project Overview | High-level project hub: approved project brief, chapter progress checklist, template specifications, linked research summary, quick links to workspace/research/files/export. |
| `/app/projects/[projectId]/workspace` | Document Workspace | Primary product interface. 3-panel responsive layout: <br>• Left: Hierarchical document tree (Prelims, Chapters 1-N, References, Appendices) <br>• Center: Tiptap rich-text canvas with full formatting bar, citation tools, and autosave indicators <br>• Right: Contextual AI tutor co-pilot with prompt presets and change preview. |
| `/app/projects/[projectId]/research` | Research & Citations | Scholarly literature search (OpenAlex, Crossref), result cards with verified DOIs, project reference library management, student annotations, and citation generator. |
| `/app/projects/[projectId]/files` | File Manager | Upload guidelines, supervisor briefs, figures, datasets, and literature PDFs. Private S3 storage with signed access URLs. |
| `/app/projects/[projectId]/review` | Academic Review | Pre-submission scanner: objective alignment, missing required sections, unreferenced citations, formatting consistency check. |
| `/app/projects/[projectId]/export` | Export Center | Format selector (PDF and DOCX), preview generator, async build status tracking, and download history. |
| `/app/projects/[projectId]/settings` | Project Settings | Project metadata, deadline, referencing style, assigned template, and archival controls. |
| `/app/credits` | Credits & Top-Up | Credit balance overview, purchase package cards (Starter, Research, Project), Fapshi mobile money checkout modal. |
| `/app/transactions` | Transaction History | Filterable ledger of credit purchases, usage debits with operation tags, and automatic refunds. |
| `/app/notifications` | Notifications | User notification feed (Payment confirmed, Export ready, Review completed, Template updated). |
| `/app/settings/profile` | Personal Settings | Profile details, email preferences, password change, account deletion request. |
| `/app/settings/academic` | Academic Settings | Update current institution, faculty, department, qualification, or academic session. |
| `/app/help` | Help & Support | Searchable knowledge base, FAQs, contact support form, and support ticket tracking. |

### 2.5 Admin Portal (`/admin/...`)

Protected by `AdminAuthGuard` (Roles: `ADMIN`, `SUPER_ADMIN`).

| Route | Page Name | Core Responsibilities |
|---|---|---|
| `/admin` | Admin Dashboard | Real-time platform pulse: active students, project count, gross revenue, net collections, AI provider cost, background job health, and security alerts. |
| `/admin/students` | Student Management | Student directory, account search, academic affiliations, credit balances, suspension toggle, and audit log. |
| `/admin/institutions` | Institutions | CRUD management for institutions, faculties, departments, and programmes. |
| `/admin/templates` | Template Catalog | Repository of verified institutional project templates with versioning and publishing controls. |
| `/admin/template-review` | Template Review Desk | Extracted guideline review workbench: inspect AI-extracted rules from uploaded PDF/DOCX syllabi, verify parameters, and publish. |
| `/admin/projects` | Project Oversight | Platform-wide project metadata inspector (status, qualification, activity level; private document text is shielded). |
| `/admin/payments` | Payment Management | Fapshi payment records, transaction statuses, gateway references, manual reconciliation trigger, discrepancy flags. |
| `/admin/credits` | Credit Management | Package price configuration, AI operation pricing table, promotional credit grants, and audited ledger adjustments. |
| `/admin/ai-usage` | AI Cost & Telemetry | Live telemetry: token consumption by model, latency percentiles, cost per user/project, and provider error monitoring. |
| `/admin/jobs` | Background Jobs | Inngest background queue status, active runs, failed executions, and manual retry triggers. |
| `/admin/support` | Support Desk | Student support ticket triage, categorization, status management, and administrator response thread. |
| `/admin/analytics` | Growth & Funnel Analytics | Onboarding conversion, blueprint approval rate, export volume, retention, and credit repurchase velocity. |
| `/admin/audit-logs` | Security Audit Logs | Immutable security event log (permission changes, credit adjustments, account suspensions, sensitive data views). |
| `/admin/settings` | Platform Settings | System flags, maintenance mode toggle, OpenRouter default model routing, Fapshi API environment mode. |

---

## 3. Navigation Hierarchy & Layout Architecture

```
Root Layout (`app/layout.tsx`)
├── Font Loaders (Inter, Source Serif 4, JetBrains Mono)
├── Global Providers (Theme, Auth, QueryClient, Toast, NuqsAdapter)
│
├── Public Layout (`app/(public)/layout.tsx`)
│   ├── Public Header (Brand Logo, Nav Links, Theme Switcher, Auth CTA Buttons)
│   ├── Main Page Content
│   └── Public Footer (Product, Resources, Legal, Institutional Links, Copyright)
│
├── Auth Layout (`app/(auth)/layout.tsx`)
│   ├── Minimal Header with Centered Cevo Brand Logo
│   └── Centered Glassmorphic Authentication Card
│
├── Student App Layout (`app/app/layout.tsx`)
│   ├── Collapsible Left App Sidebar
│   │   ├── Brand & Workspace Switcher
│   │   ├── Navigation Menu (Dashboard, Projects, Credits, Notifications, Settings)
│   │   ├── User Credit Badge (Live Balance + "Buy Credits" button)
│   │   └── User Profile Menu (Account, Theme, Sign Out)
│   └── Main Workspace Area
│       ├── Top App Header (Breadcrumbs, Search, Notifications Bell, Help)
│       └── Page Canvas
│
└── Admin Layout (`app/admin/layout.tsx`)
    ├── Admin Sidebar (Dashboard, Students, Institutions, Templates, Payments, Credits, AI Usage, Jobs, Logs)
    ├── Admin Header (Environment Indicator, Role Badge, Quick Actions)
    └── Admin Content Canvas
```
