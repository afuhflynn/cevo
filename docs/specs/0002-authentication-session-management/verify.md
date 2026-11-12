# Verify: Authentication & session management · spec 0002 · updated 2026-11-12
_Steps derived from spec 0002 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._

## UI / manual
- [x] Sign up at `/sign-up` → no auto sign-in, "Check your inbox" panel, verification email lands in Mailpit (`:8025`) → AC-1
- [x] Click the Mailpit verify link → lands `/sign-in?verified=1` with the "Email verified" notice → AC-1
- [x] Sign in at `/sign-in` with an unverified account → succeeds; unverified users are gated later by `requireVerifiedEmail()`, not at sign-in → AC-2
- [x] Reset flow: `/forgot-password` → Mailpit reset link → `/reset-password?token=…` → new password signs in, old password rejected → AC-3
- [x] Expired reset link → `POST /api/auth/reset-password` returns 410 `TOKEN_EXPIRED` envelope, password unchanged → AC-3
- [x] Reuse a consumed reset link → 400 `INVALID_TOKEN` (single use, row deleted in the same transaction) → AC-3
- [x] Student session hits a role-guarded route → 403 plus an `AuditEvent` row (`ADMIN_ACCESS_DENIED`, targetType `ROUTE`, details carry method, role, reason) → AC-5
- [x] Deactivated (`isActive false`) user signs in → 403 `ACCOUNT_INACTIVE` → AC-2
- [x] Duplicate sign-up with an existing email → generic 200 success-shaped response, no account enumeration → spec API surface
- [x] Sign out → session reads back null; `POST /api/auth/revoke-sessions` ends every session → AC-1
- [x] With `ARCJET_KEY` set (staging/prod only): exceed a limit (6th sign-in per minute) → 429 `RATE_LIMITED` envelope → AC-6

## Commands
- [x] `./node_modules/.bin/tsc --noEmit` clean → build integrity
- [x] `pnpm build` succeeds (sign-in/reset-password partial-prerender, auth API dynamic) → build integrity
- [x] `./node_modules/.bin/prisma db verify` marker matches contract → data layer live
- [x] Fresh sign-in `Set-Cookie`: HttpOnly, `Path=/`, `SameSite=Lax`, `Max-Age=2592000`, no Secure on plain http → AC-4
- [ ] On an https/prod build the cookie gains `Secure` and the `__Secure-` name prefix → AC-4
- [x] DB check: `Account.password` starts with `$argon2id$` → password hashing
- [x] Case check: sign up as `MixedCase@example.com` → stored lowercase; sign-in with any case works → value sourcing (email normalization)
- [x] Freshness check: promote a signed-in student to ADMIN mid-session → guard allows at once; demote → denied at once → value sourcing (role read from DB)
- [x] Token TTL check: verification links expire after 24h, reset links after 60min (`emailVerification.expiresIn`, `resetPasswordTokenExpiresIn`) → value sourcing

## Acceptance-criteria coverage
- AC-1 covered by steps sign-up, verify link, sign-out/revoke
- AC-2 covered by steps unverified sign-in, inactive sign-in, case check
- AC-3 covered by steps reset flow, expired link, consumed link, TTL check
- AC-4 covered by steps cookie attrs, Secure-on-https, Argon2id hash
- AC-5 covered by steps guard denial, audit row, role freshness
- AC-6 covered by step 429 with key; without a key the handler fails open and lets the request through
