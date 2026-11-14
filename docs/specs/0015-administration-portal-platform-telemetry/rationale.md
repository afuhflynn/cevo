# Rationale: 0015 administration portal and platform telemetry

## Context

Admins today work across separate pages with no shared home. Template review lives in one place, package control in another, and there is no single view for new users or payment health or AI cost or support load. Support questions about payments take long because ledger proof sits apart from payment rows. Template publishing risk grows because pending drafts have no shared queue with the rest of ops. Audit rows exist but there is no shared viewer, so review of who changed what is slow.

The forces shaping this choice are small ops team, money trust, and strict access control. The team needs boring reuse of existing tables and guards, not a new pipeline. Payments in XAF must reconcile exactly once against ledger entries. Student data is sensitive and list views must limit exposure. Every write by an admin must leave proof.

## Options considered

### Option 1: Extend current admin with live aggregates

Build the home plus queues inside the current `app/admin` tree, reuse guards and existing tables, compute KPIs with live aggregate queries with short cache.

### Option 2: Add nightly rollup table plus job

New table plus job plus backfill, more ops to own, data lags a day.

### Option 3: External analytics service

New vendor plus cost plus data sharing plus auth glue, overkill for six queues.

## Rationale

Chosen Option 1. The current admin already owns the guard pattern and template and billing pages, and the data model already stores the needed rows. Live aggregates answer the triage need with no new pipeline. Growth risk is contained through pagination and 60 second cache plus a follow up rollup when measured slowness appears.

## References

* Spec 0011 template engine, spec 0014 credit ledger and Fapshi checkout, spec 0002 auth guard and ADMIN_ACCESS_DENIED.
