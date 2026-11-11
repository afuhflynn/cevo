# 0001 · Core data model and schema migration

**Date**: 2026-11-11
**Status**: In Progress

## Summary

This spec defines the normalized PostgreSQL schema for Cevo using Prisma ORM. It covers identity, academic hierarchy, templates, projects, research sources, credits, payments, and audit events, and it is adopted from the existing project design so every later feature builds on one data model. The build task is to create schema.prisma, run prisma validate, and apply the initial migration cleanly against the local PostgreSQL database.

## Context

Cevo is an academic project development workspace for university students. Every later feature (authentication, onboarding, projects, documents, research, credits, payments) writes to or reads from one relational database. Today no schema.prisma or migration exists, so the platform has no persisted data model at all.

The stack was already chosen in earlier foundation work: Next.js 16 App Router, Prisma ORM version 8, PostgreSQL, Better Auth, pnpm, and biome (basis: docs/TECHNICAL_ARCHITECTURE.md, docs/DECISIONS.md). The database runs locally on PostgreSQL at DATABASE_URL, defined in .env.example, and a separate scope feature provisions local PostgreSQL with Docker Compose (basis: docs/scope/scope.md).

The schema holds student personal data and financial credit records, so it must satisfy Cameroon Law 2010/012 on cyber security and cyber criminality and the ANTIC regulations, including audit logging and retention of financial records when an account is deleted (basis: docs/SECURITY_AND_PRIVACY.md). Without this decision no feature can store data, and every later feature would invent its own inconsistent tables.

## Requirements

User stories:
- As a developer, I want a validated Prisma schema so all features share one type safe data model.
- As a developer, I want relations with enforced cascading constraints so deletes behave predictably and financial records survive.
- As a developer, I want an initial migration that applies cleanly to PostgreSQL so a fresh local database is ready to use.

Acceptance criteria (the contract, each independently checkable):
- AC-1: prisma validate passes with zero errors against schema.prisma.
- AC-2: Every relation carries a foreign key with an explicit onDelete rule (Cascade, SetNull, or Restrict), enforced by the database (basis: relational integrity).
- AC-3: The initial migration applies cleanly against PostgreSQL at DATABASE_URL, using prisma migrate dev locally and prisma migrate deploy in production.

## Decision

Chosen option: Option 1. Adopt docs/DATABASE_DESIGN.md as the schema target in prisma/schema.prisma, with one initial migration named init_core_schema.

Migration name: init_core_schema (descriptive, not date coupled). Runner up: a timestamped name such as 20260101000000_init, rejected because date coupled names hide the migration's purpose.

Validation script: add "db:validate": "prisma validate" to package.json so prisma validate runs in verification. Runner up: run prisma validate manually only, rejected because a script makes the check repeatable in CI and by the team.

Implementation skills: none (no installed community skill shapes this decision; standard Prisma and PostgreSQL practice).

## Feature design

Data model sketch:

| Group | Entity | Primary key | Outgoing foreign keys | Cardinality |
|---|---|---|---|---|
| Identity, auth, profiles | User | id (cuid) | none (root identity) | 1:1 StudentProfile and AcademicProfile; 1:N Project, Session, Account, Payment, CreditWallet, AuditEvent |
| Identity, auth, profiles | Session | id (cuid) | userId to User.id (onDelete Cascade) | N:1 User |
| Identity, auth, profiles | Account | id (cuid) | userId to User.id (Cascade); unique (providerId, accountId) | N:1 User |
| Identity, auth, profiles | Verification | id (cuid) | none | standalone, indexed by identifier |
| Identity, auth, profiles | StudentProfile | id (cuid) | userId to User.id (Cascade, unique) | 1:1 User |
| Identity, auth, profiles | AcademicProfile | id (cuid) | userId to User.id (Cascade, unique); institutionId to Institution.id (onDelete SetNull); facultyId to Faculty.id (onDelete SetNull); departmentId to Department.id (onDelete SetNull); programmeId to Programme.id (onDelete SetNull) | 1:1 User; N:1 Institution, Faculty, Department, Programme |
| Academic hierarchy | Institution | id (cuid) | none | 1:N Faculty, Department, ProjectTemplate, AcademicProfile |
| Academic hierarchy | Faculty | id (cuid) | institutionId to Institution.id (Cascade); unique (institutionId, name) | N:1 Institution; 1:N Department, Programme, ProjectTemplate, AcademicProfile |
| Academic hierarchy | Department | id (cuid) | facultyId to Faculty.id (Cascade); unique (facultyId, name) | N:1 Faculty; 1:N Programme, ProjectTemplate, AcademicProfile |
| Academic hierarchy | Programme | id (cuid) | departmentId to Department.id (Cascade); unique (departmentId, name, qualification) | N:1 Department; 1:N ProjectTemplate, AcademicProfile |
| Templates | ProjectTemplate | id (cuid) | institutionId to Institution.id (onDelete SetNull); facultyId to Faculty.id (onDelete SetNull); departmentId to Department.id (onDelete SetNull); programmeId to Programme.id (onDelete SetNull) (all optional) | 1:N TemplateVersion, Project |
| Templates | TemplateVersion | id (cuid) | templateId to ProjectTemplate.id (Cascade); unique (templateId, version) | N:1 ProjectTemplate; 1:N TemplateRule, TemplateSection, Project |
| Templates | TemplateRule | id (cuid) | templateVersionId to TemplateVersion.id (Cascade, unique) | 1:1 TemplateVersion |
| Templates | TemplateSection | id (cuid) | templateVersionId to TemplateVersion.id (Cascade); index (templateVersionId, orderIndex) | N:1 TemplateVersion |
| Projects | Project | id (cuid) | userId to User.id (onDelete Cascade); templateId to ProjectTemplate.id (onDelete SetNull); templateVersionId to ProjectTemplate.id (onDelete SetNull) (both optional) | N:1 User; 1:N sections, tasks, activities, sources, files, export jobs; 1:1 brief, outline |
| Projects | ProjectBrief | id (cuid) | projectId to Project.id (Cascade, unique) | 1:1 Project |
| Projects | ProjectOutline | id (cuid) | projectId to Project.id (Cascade, unique) | 1:1 Project |
| Projects | ProjectSection | id (cuid) | projectId to Project.id (Cascade); parentId to ProjectSection.id (Cascade, self relation) | N:1 Project; self hierarchy 1:N children |
| Projects | DocumentVersion | id (cuid) | sectionId to ProjectSection.id (Cascade); index (sectionId, versionNumber) | N:1 ProjectSection |
| Projects | ProjectTask | id (cuid) | projectId to Project.id (Cascade) | N:1 Project |
| Projects | ProjectActivity | id (cuid) | projectId to Project.id (Cascade) | N:1 Project |
| Research, citations | ResearchSource | id (cuid) | doi, openAlexId, semanticScholarId optional unique each | 1:N ProjectSource, Citation |
| Research, citations | ProjectSource | id (cuid) | projectId to Project.id (Cascade); sourceId to ResearchSource.id (Cascade); unique (projectId, sourceId) | N:1 Project; N:1 ResearchSource |
| Research, citations | Citation | id (cuid) | sectionId to ProjectSection.id (Cascade); sourceId to ResearchSource.id (Cascade) | N:1 each |
| Files, exports | FileAsset | id (cuid) | projectId to Project.id (Cascade); s3Key unique | N:1 Project |
| Files, exports | ExportJob | id (cuid) | projectId to Project.id (Cascade) | N:1 Project |
| AI telemetry | AiUsage | id (cuid) | userId to User.id (onDelete Cascade); projectId to Project.id (onDelete SetNull) (optional) | indexed by userId, operationType, modelName |
| AI telemetry | OperationPricing | id (cuid) | operationType unique | standalone |
| Billing, credits, payments | CreditWallet | id (cuid) | userId to User.id (onDelete Restrict, unique) | 1:1 User; 1:N CreditLedger |
| Billing, credits, payments | CreditLedger | id (cuid) | walletId to CreditWallet.id (onDelete Restrict); unique (walletId, referenceId, type) | N:1 CreditWallet |
| Billing, credits, payments | CreditPackage | id (cuid) | none | 1:N Payment |
| Billing, credits, payments | Payment | id (cuid) | userId to User.id (onDelete Cascade); packageId to CreditPackage.id (onDelete Restrict); providerTransId optional unique | N:1 User, CreditPackage; 1:N PaymentWebhookEvent |
| Billing, credits, payments | PaymentWebhookEvent | id (cuid) | paymentId to Payment.id (onDelete SetNull) (optional) | N:1 Payment |
| Operations | Notification | id (cuid) | userId to User.id (Cascade) | N:1 User |
| Operations | SupportTicket | id (cuid) | userId to User.id (Cascade) | N:1 User; 1:N SupportMessage |
| Operations | SupportMessage | id (cuid) | ticketId to SupportTicket.id (Cascade) | N:1 SupportTicket |
| Operations | AuditEvent | id (cuid) | userId to User.id (onDelete SetNull) (optional) | N:1 User, optional actor |

All ids are CUID strings; every model has createdAt and updatedAt. The full field level Prisma schema is in docs/DATABASE_DESIGN.md (basis: docs/DATABASE_DESIGN.md). Every field-level value (column type, nullability, default, unique constraint, enum member) is sourced from docs/DATABASE_DESIGN.md; this spec defines none beyond the onDelete rules above.

State transitions:
- Project status: DRAFT to PLANNING to IN_PROGRESS to READY_FOR_REVIEW to COMPLETED to ARCHIVED (ProjectStatus enum).
- Payment status: PENDING to SUCCESSFUL, FAILED, or EXPIRED (PaymentStatus enum).
- Export job: QUEUED to PROCESSING to COMPLETED or FAILED (JobStatus enum).

API surface:
This feature has no HTTP endpoints. Its interface is the Prisma schema file and the migration commands:

| Interface | Command | Purpose | Auth | Errors |
|---|---|---|---|---|
| prisma/schema.prisma | n/a | The data model target; all 25 models, relations, cascades | n/a | schema validation errors |
| prisma validate | n/a | Type and relation check; zero error result required | n/a | validation errors |
| prisma migrate dev | prisma migrate dev --name init_core_schema | Creates and applies the initial migration locally | local development DATABASE_URL | migration SQL errors |
| prisma migrate deploy | prisma migrate deploy | Applies migrations against the target DATABASE_URL | production or CI DATABASE_URL | migration apply errors |

Value sourcing (every value this feature produces names where it comes from):

| Action | Value produced or displayed | Source |
| Create schema.prisma | full data model: 25 models, relations, cascades | docs/DATABASE_DESIGN.md (this spec's confirmed model) |
| Run prisma validate | zero error result | schema.prisma itself |
| Create initial migration | migration SQL with FK onDelete rules | schema.prisma plus this spec (AC-2) |
| Apply migration | clean apply against PostgreSQL | DATABASE_URL env var in .env.example |

Key invariants (rules that must always hold, enforced at application or DB layer):
- Every CreditLedger change is paired with a CreditWallet balance update inside the same database transaction; a balance never changes in isolation (basis: docs/DATABASE_DESIGN.md financial invariant).
- CreditLedger (walletId, referenceId, type) is unique so a payment can never credit a wallet twice (idempotency key for money ops, basis: idempotency keys for money ops).
- Payment.providerTransId is unique so a Fapshi webhook is processed once.
- (projectId, sourceId) is unique in ProjectSource.
- User.email is unique.
- Financial records (CreditLedger, Payment) are never cascaded deleted; they are retained for audit and tax compliance (basis: docs/DATABASE_DESIGN.md, docs/SECURITY_AND_PRIVACY.md; audit and tax compliance).
- User deletion is soft via isActive (financial records retained; full purge is the later account deletion feature).
- ProjectSection includes an integer version column for optimistic concurrency to prevent lost updates.
- Every owned resource references userId and/or projectId with foreign key constraints (explicit ownership).

Security model:
Authorization is enforced in the application layer: every read or mutation of user owned resources (Project, ProjectSection, FileAsset, ProjectSource, and so on) filters by userId, with CUID ids preventing IDOR (basis: docs/SECURITY_AND_PRIVACY.md). Roles STUDENT, ADMIN, and SUPER_ADMIN guard admin routes; non admin access to admin routes is denied with HTTP 403 and logged to AuditEvent. Student document contents are not routinely visible to administrators. No Postgres row level security is used.
Compliance scope: Cameroon Law 2010/012 on cyber security and cyber criminality and the ANTIC regulations; student personal data processed only to provide academic services, encrypted in transit (TLS 1.3) and at rest (AES-256); financial records retained on account deletion; audit events record who did what and when (basis: docs/SECURITY_AND_PRIVACY.md).

Configuration required:
- DATABASE_URL: local source is .env.example (Docker Compose local PostgreSQL provisioned by scope feature 18); production source is the Vercel project environment variables; no new credentials or secrets are needed for this feature. Before any migration command, confirm DATABASE_URL is set and the server responds.

Critical test scenarios (each maps to an acceptance criterion):
- Happy path: prisma validate passes with zero errors and prisma migrate dev applies init_core_schema cleanly against a fresh local PostgreSQL at DATABASE_URL; verifies AC-1 and AC-3.
- Failure case: applying a migration against a database without DATABASE_URL fails fast with a clear error, and re-running prisma migrate dev in local development is idempotent; verifies AC-3 and the edge case rules.
- Auth permission: a migration that would cascade-delete CreditLedger or Payment rows is rejected so financial records are preserved; verifies AC-2.

## Build plan

Build approach: Tracer Bullet (the project default from the scope header). Stand up the full thread end to end first (schema file, validation, migration, clean apply), then thicken with validation wiring and prerequisite notes.

1. Create prisma/schema.prisma at the repo root with the full 25 model data model from docs/DATABASE_DESIGN.md (datasource postgresql, url = env DATABASE_URL). Satisfies AC-1, AC-2.
2. Run prisma validate and fix until it reports zero errors. Satisfies AC-1.
3. Confirm dot env example DATABASE_URL points to a reachable local PostgreSQL; scope feature 18 (local PostgreSQL via Docker Compose) provisions it separately and is a prerequisite for this step. Satisfies AC-3.
4. Generate and apply the initial migration with prisma migrate dev --name init_core_schema against the local PostgreSQL. Satisfies AC-3.
5. Verify the applied migration enforces every FK onDelete rule (Cascade, SetNull, Restrict) by inspecting pg_constraint / information_schema on the applied local database with psql, and confirms CreditLedger and Payment rows survive user or project deletion. Satisfies AC-2.
6. Add the "db:validate": "prisma validate" script to package.json so prisma validate runs in verification, and record the local PostgreSQL prerequisite. Satisfies AC-1.
7. Record the CI/deploy step that runs prisma migrate deploy after the build against the production DATABASE_URL (Vercel project environment variables), and document prisma migrate repair as the recovery for a failed apply. Satisfies AC-3.

## Consequences

Positive:
- One type safe data model for all features, generated by Prisma Client.
- Referential integrity and cascading deletes enforced by the database, not only in application code.
- Financial immutability (ledger entries never deleted, double entry in a transaction) supports audit and tax compliance.
- Tenant scoped ownership (userId on every owned resource) is ready for the authentication and authorization feature.

Negative or tradeoffs:
- The first migration is large (25 models); later changes need disciplined additive migrations and occasional review of migration history.
- Ownership enforcement lives in the application layer (every query filters by userId); there is no Postgres row level safety net, so a missed filter is an IDOR bug.
- Soft delete via isActive on User means queries must restrict to active users (isActive true), or deleted users leak into results.
- CUID string ids are larger than integers and cost more in indexes and joins.

Neutral:
- prisma.config.ts already exists at the repo root and does not override the schema path, so schema.prisma at root is the Prisma default.
- The local PostgreSQL dependency is provisioned by a separate scope feature (local PostgreSQL via Docker Compose); this feature assumes it is running before the migration applies.

## Follow-up

- Re-run prisma migrate dev whenever the schema changes during the build so migrations stay in sync.
- Decide later whether a seed script is needed (none in this feature).
- Capture the stack conventions (Prisma, PostgreSQL, Better Auth, biome) in an AGENTS.md since none exists at the project root.
