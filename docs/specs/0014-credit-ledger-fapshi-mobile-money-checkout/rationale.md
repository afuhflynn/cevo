# 0014 rationale · credit ledger and Fapshi mobile money checkout

_Decision record for spec 0014. Build spec lives in `index.md`._

## Context

Cevo spends credits on AI work (wizard synthesis, assistant runs, review scans, exports are free per spec 0013). The data model already holds `CreditWallet`, `CreditLedger`, `CreditPackage`, `Payment`, and `PaymentWebhookEvent`, plus hold and refund helpers for wizard and assistant flows. What is missing is the money in path: a real checkout that turns XAF paid by mobile money into credits a student can spend.

Forces shaping this choice: payments carry real money so exactly once crediting is load bearing; Fapshi webhooks arrive over the open internet so verification is required before any balance change; students pay from Cameroonian phones so number entry must accept local forms; unpaid prompts must not linger forever; admins must reconcile money against credits; the build must run on the current stack (Next.js App Router, Prisma 8, Postgres, Better Auth) with no new infrastructure.

## Options considered

### Option 1: Direct collect prompt with polling

Student stays on Cevo, enters a phone number, Fapshi pushes a collect prompt to the phone, Cevo polls payment status. One screen, no redirect.

**Pros**:
* Shortest path for students on phones, fewer drop offs.
* Full control of UX, balance, and retry states in one place.

**Cons**:
* Cevo must handle polling, timeouts, and prompt failures gracefully.
* Phone number validation and operator quirks live in our code.

### Option 2: Fapshi hosted payment page with return URL

Student leaves Cevo for a Fapshi page, pays there, returns to Cevo.

**Pros**:
* Fapshi owns number entry and operator handling.
* Less validation logic in Cevo.

**Cons**:
* Redirect breaks context and hurts completion on slow networks.
* Return handling adds a second confirmation path to secure.

### Option 3: Both with hosted page as fallback

Direct collect by default, hosted page when collect fails or the operator needs it.

**Pros**:
* Highest completion across operators and failure shapes.

**Cons**:
* Two flows to build, verify, and support in one slice.
* Larger test surface for money movement.

## Rationale

The engineer chose direct collect, three tier packages, the single ledger, sandbox first, and refunds for failed AI runs only. That matches the forces in Context: students pay from phones on uneven networks so staying on one Cevo screen beats a redirect; the schema already guards exactly once crediting so reuse keeps money logic in one audited place; sandbox first proves webhook verification before live money moves. The Both option would raise completion slightly but doubles the money paths to verify in a GA rigor slice, so it waits as a Follow-up.
