# Fapshi sandbox to live runbook (spec 0014, AC-11)

Sandbox keys drive test traffic and live keys drive production with no code
change beyond environment values.

## Sandbox pass

1. Create a Fapshi sandbox merchant account and note the API key, API user,
   base URL, and webhook secret.
2. Set `FAPSHI_API_KEY`, `FAPSHI_API_USER`, `FAPSHI_BASE_URL` (sandbox URL),
   and `FAPSHI_WEBHOOK_SECRET` in `.env`. Keep `FAPSHI_CURRENCY=XAF`.
3. Point the sandbox dashboard webhook at
   `https://<your-tunnel-or-preview>/api/billing/webhooks/fapshi`
   (local dev: tunnel `http://localhost:3000`, e.g. via `vercel dev` or
   ngrok, because Fapshi cannot reach localhost).
4. Confirm against the live sandbox before trusting production traffic:
   the direct collect request shape (`POST <base>/initiate-pay` with
   `apikey` / `apiuser` headers), the status query
   (`GET <base>/payment-status/<transId>`), the exact webhook signature
   header name (the app checks `x-fapshi-signature`, `fapshi-signature`,
   `x-webhook-signature`, then `x-signature`), and the success / failure
   status strings (the app maps common variants; add any new one to
   `mapProviderStatus` in `lib/billing.ts`).
5. Buy the cheapest package with a test number, approve the prompt, and
   confirm exactly one `CREDIT_PURCHASE` ledger row per payment. Replay the
   webhook from the sandbox dashboard and confirm the balance does not move.

## Live cutover

1. Generate live keys in the Fapshi live dashboard (new webhook secret).
2. Set the four values in production env. Nothing else changes.
3. Point the live dashboard webhook at
   `https://<production-domain>/api/billing/webhooks/fapshi`.
4. Schedule the expiry job: `POST /api/cron/payments-expire` with
   `Authorization: Bearer <CRON_SECRET>` every 5 minutes.
5. Run one live purchase for a small amount (Starter, 1000 XAF), reconcile
   the `Payment` row against the `CreditLedger` row and the Fapshi
   dashboard, then announce.

## Reconcile

Every money event writes an `AuditEvent` (`payment.started`,
`payment.webhook.received`, `payment.credited`, `payment.failed`,
`payment.expired`, `payment.refunded`) carrying payment id, package id,
amount, and actor. A late SUCCESSFUL webhook arriving after EXPIRED
allocates nothing and is flagged for manual reconcile.
