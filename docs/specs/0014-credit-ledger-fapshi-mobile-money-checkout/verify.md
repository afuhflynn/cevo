# Verify: credit ledger and Fapshi mobile money checkout · spec 0014 · updated 2026-11-14
_Steps derived from spec 0014 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Visit `/dashboard/billing` as a student: three packages show (Starter 1000 XAF for 50, Standard 2500 XAF for 150 marked popular, Pro 5000 XAF for 350); picking one starts a checkout → AC-1
- [ ] Enter `612345678`, start payment, approve the phone prompt: page polls and flips to confirmed without a second credit → AC-2, AC-3
- [ ] With balance under 10, the low balance banner shows with a buy link; header badge and dashboard card show the live balance → AC-6
- [ ] Open a FAILED or EXPIRED payment: reason shows with a retry action that creates a new payment row; the old row stays terminal → AC-5
- [ ] As admin, open `/admin/billing`: create a package, edit price and credits, deactivate one; the inactive package disappears from `/dashboard/billing` while open PENDING checkouts keep working → AC-8
## Commands
- [ ] `pnpm dlx tsx scripts/seed-billing-packages.ts` → `Billing packages ready: Starter (1000 XAF -> 50), Standard (2500 XAF -> 150), Pro (5000 XAF -> 350)` → AC-1
- [ ] POST `/api/billing/payments` twice with the same `clientKey` → second returns 409 with the existing payment id, one row exists → AC-3
- [ ] POST a verified webhook twice for one payment → one `CREDIT_PURCHASE` ledger row, second outcome is not CREDITED → AC-3, AC-9
- [ ] POST an unsigned webhook → 401, event row has `signatureValid` false, no balance change → AC-9
- [ ] Backdate a PENDING payment past `expiresAt`, POST `/api/cron/payments-expire` with the cron secret → row is EXPIRED, no ledger row → AC-4
- [ ] GET another student's `/api/billing/payments/:id` → 403 plus an audit row → AC-9
- [ ] Read one student's onboarding grant plus one paid purchase in `/api/billing/ledger` → `PROMOTIONAL_CREDIT` and `CREDIT_PURCHASE` rows coexist → AC-7
- [ ] Trigger a failed assistant run twice → one `REFUND` row keyed `refund:<runId>`, second attempt changes nothing → AC-10
- [ ] Query `AuditEvent` for one payment → `payment.started`, `payment.webhook.received`, `payment.credited` (or `payment.failed` / `payment.expired`), each carrying payment id, package id, amount, actor → AC-9
## Acceptance-criteria coverage
- AC-1 covered by package list plus seed steps · AC-2 by phone plus polling steps · AC-3 by webhook plus replay steps · AC-4 by expiry step · AC-5 by failed retry step · AC-6 by balance banner step · AC-7 by ledger coexistence step · AC-8 by admin step · AC-9 by unsigned webhook, forbidden read, and audit steps · AC-10 by refund step · AC-11 by sandbox to live runbook (`docs/runbooks/fapshi-sandbox-to-live.md`)
## Value sourcing (one step per row)
- Start payment persists `amountXaf` and `creditsAllocated` copied from `CreditPackage` at start; edit the package afterwards and confirm the open payment keeps its snapshots → AC-1
- Enter `237612345678`, `612345678`, and `+237 612 34 56 78`: all normalize to `237612345678`; enter `12345` and confirm 422 → AC-2
- Start a payment and read `expiresAt`: it equals `createdAt` plus 30 minutes → AC-4
- After a credited webhook, read the ledger row: `balanceAfter` equals the wallet balance after commit → AC-3
- Read the purchase ledger row: `referenceId` is `purchase:<paymentId>` → AC-3
- Poll a PENDING payment with no provider answer: status and `failureReason` come from the `Payment` row, never from client state → AC-2
- Read `/api/billing/balance` at 9 and 10 credits: `lowBalance` flips at 10 → AC-6
- Read `/api/billing/ledger` with `page` and `type`: pages of at most 100, newest first, each row carrying its running `balanceAfter` → AC-6
