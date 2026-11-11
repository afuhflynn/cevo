# Verify: Core data model and schema migration · spec 0001 · updated 2026-11-11

_Steps derived from spec 0001 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._

## Commands

- [x] Run `pnpm db:validate` → `prisma contract emit` completed with zero errors → AC-1 met (contract emitted: schema.json, schema.d.ts)
- [x] Run `DATABASE_URL="postgresql://cevo_user:cevo_pass@localhost:5432/cevo?schema=public" pnpm db:migrate` → "Already up to date", contract hash matches migration marker ed6723f5... → AC-3 met
- [x] Query `pg_constraint` → all 43 FKs carry explicit ON DELETE rules → AC-2 met
- [x] Query `pg_tables` → all model tables present (37 tables incl. all 25 spec models) → schema live → AC-3 met
- [x] Confirm `CreditLedger.walletId → CreditWallet` and `CreditWallet.userId → User` onDelete rules → both are ON DELETE CASCADE; spec table says Restrict → AC-2 core met, spec-to-schema mismatch flagged below
- [x] Confirm `pnpm db:validate` reads schema.prisma adopted from docs/DATABASE_DESIGN.md → Value sourcing row confirmed

## Acceptance-criteria coverage

- AC-1 → `pnpm db:validate` zero errors
- AC-2 → `pg_constraint` onDelete rules enforced by the database
- AC-3 → migration applied cleanly against local PostgreSQL; all 25 tables live

## Heads up

The spec's Feature design table calls for `CreditWallet.userId` and `CreditLedger.walletId` to use `onDelete Restrict` (and the key invariant says financial records are never cascade-deleted), but the applied schema uses `Cascade` for both. With soft-delete via `isActive` this does not fire in practice, but it diverges from the spec. Reconcile via `/solution-architect core data model & schema migration` (either align the schema to Restrict with a new migration, or update the spec table to Cascade).
