# 0001 · Core data model and schema migration — rationale

**Date**: 2026-11-11
**Status**: In Progress

## Context

Cevo is an academic project development workspace for university students. Every later feature (authentication, onboarding, projects, documents, research, credits, payments) writes to or reads from one relational database. Today no schema.prisma or migration exists, so the platform has no persisted data model at all.

The stack was already chosen in earlier foundation work: Next.js 16 App Router, Prisma ORM version 8, PostgreSQL, Better Auth, pnpm, and biome (basis: docs/TECHNICAL_ARCHITECTURE.md, docs/DECISIONS.md). The database runs locally on PostgreSQL at DATABASE_URL, defined in .env.example, and a separate scope feature provisions local PostgreSQL with Docker Compose (basis: docs/scope/scope.md).

The schema holds student personal data and financial credit records, so it must satisfy Cameroon Law 2010/012 on cyber security and cyber criminality and the ANTIC regulations, including audit logging and retention of financial records when an account is deleted (basis: docs/SECURITY_AND_PRIVACY.md). Without this decision no feature can store data, and every later feature would invent its own inconsistent tables.

## Options considered

### Option 1: Adopt docs/DATABASE_DESIGN.md as the schema (chosen)
Use the existing 25 model normalized design in docs/DATABASE_DESIGN.md as the schema.prisma target, exactly as documented (basis: docs/DATABASE_DESIGN.md).
Pros: single source of truth already aligned with the stack, security, and financial docs; no new design debt; matches the relations, cascades, and invariants the rest of the project assumes.
Cons: inherits any design gaps in the source doc; the schema is large (25 models) for a first migration.

### Option 2: Design a smaller subset schema now and extend later
Ship only the tables needed for the next slice (users, profiles, projects) and add the rest incrementally.
Pros: smaller initial migration, faster to validate.
Cons: fractures the coherent data model; later additions risk breaking migrations and contradict the one target model principle; duplicate design work.

### Option 3: Use a non relational store for part of the model
Keep academic hierarchy and credits in PostgreSQL but move documents or research sources to a document store.
Pros: flexible document storage for rich text.
Cons: loses relational integrity, ACID transactions, and foreign key cascades across the domain; wrong for a double entry credit ledger and academic relations (basis: relational data needs ACID guarantees and constraints).

## Decision

Chosen option: Option 1. Adopt docs/DATABASE_DESIGN.md as the schema target in prisma/schema.prisma, with one initial migration named init_core_schema.

Migration name: init_core_schema (descriptive, not date coupled). Runner up: a timestamped name such as 20260101000000_init, rejected because date coupled names hide the migration's purpose.

Validation script: add "db:validate": "prisma validate" to package.json so prisma validate runs in verification. Runner up: run prisma validate manually only, rejected because a script makes the check repeatable in CI and by the team.

Implementation skills: none (no installed community skill shapes this decision; standard Prisma and PostgreSQL practice).

## Rationale

The project already records the stack and a complete reviewed database design in docs/TECHNICAL_ARCHITECTURE.md, docs/DECISIONS.md, docs/DATABASE_DESIGN.md, and docs/SECURITY_AND_PRIVACY.md (basis: docs/TECHNICAL_ARCHITECTURE.md, docs/DECISIONS.md, docs/DATABASE_DESIGN.md, docs/SECURITY_AND_PRIVACY.md). Adopting that design as the schema avoids re-deciding entities, fields, relations, cascades, and financial invariants the rest of the project already assumes. A smaller subset or a non relational store would either fragment the single source of truth or give up the ACID guarantees and foreign key cascades the credit ledger and tenant scoped ownership model depend on.

## References

Project sources (verifiable in this repo):
- docs/scope/scope.md: feature 3 Core Data Model and Schema Migration, intent, done when criteria, and the Tracer Bullet build approach (basis: docs/scope/scope.md)
- docs/DATABASE_DESIGN.md: the complete 25 model Prisma schema, relations, cascades, and financial invariants adopted as the schema target (basis: docs/DATABASE_DESIGN.md)
- docs/TECHNICAL_ARCHITECTURE.md: modular monolith stack, Prisma version 8, PostgreSQL, Better Auth, Inngest, Fapshi choices (basis: docs/TECHNICAL_ARCHITECTURE.md)
- docs/DECISIONS.md: architecture decision records including Next.js 16 App Router, Prisma, Fapshi, Inngest, and the no build command rule (basis: docs/DECISIONS.md)
- docs/SECURITY_AND_PRIVACY.md: application layer userId ownership, roles, CUID ids, compliance scope, financial retention (basis: docs/SECURITY_AND_PRIVACY.md)
- .env.example: DATABASE_URL definition (basis: .env.example)

Practices and standards:
- double entry ledger accounting with idempotency keys for money operations (basis: idempotency keys for money ops)
- foreign key cascades and referential integrity enforced by the database (basis: relational integrity)
- soft delete versus hard delete for financial record retention (basis: audit and tax compliance)
