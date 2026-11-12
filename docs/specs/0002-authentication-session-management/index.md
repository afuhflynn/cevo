# 0002. Authentication and session management

**Date**: 2026-11-11
**Status**: Accepted

## Summary

This spec decides how Cevo handles student and administrator authentication. It uses Better Auth, the auth library already installed in the project, with PostgreSQL session storage. Students sign up with email and password, verify their email, sign in, access role guarded routes, sign out, and reset passwords by email. Administrator routes require the ADMIN or SUPER_ADMIN role and are denied with HTTP 403. The spec names every config value, route path, error code, rate limit, and TTL so the build can start without guessing.

## Requirements

**User stories**:
- As a student, I want to sign up with email, name, and password so I can create an account.
- As a student, I want to receive a verification email after signing up so I can confirm my address.
- As a student, I want to sign in securely with my email and password so I can access my projects.
- As a student, I want to reset my password by email so I can recover access if I forget it.
- As a student, I want to sign out from anywhere so I can end all my sessions.
- As an administrator, I want to access admin routes only when my role is ADMIN or SUPER_ADMIN so the platform stays secure.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: A new user can sign up with email, name, and password (no auto sign-in), receive a verification email, verify the address by clicking the link, then sign in with the same credentials (basis: scope row feature 4 done when).
- **AC-2**: Sign in accepts a valid email and password from an unverified user; unverified users cannot create projects or consume credits until verified (this feature proves sign-in is not blocked when unverified and ships a reusable `requireVerifiedEmail()` helper in `lib/auth` for features 6, 7, and 15 to call; basis: docs/SECURITY_AND_PRIVACY.md section 2.1).
- **AC-3**: Password reset sends a time limited token by email (verification link 24h, reset link 30–60 minutes) and lets the user set a new password; an expired token returns 410 and no password change occurs (basis: scope row feature 4 done when).
- **AC-4**: Session cookies are HttpOnly, Secure in production, SameSite Lax, Path=/, with 30 day sliding expiry (expiresIn 30d, updateAge 1d); the Secure flag is confirmed only against an HTTPS/production build, not localhost (basis: docs/SECURITY_AND_PRIVACY.md section 2.1).
- **AC-5**: Admin routes (/admin/...) return HTTP 403 for non admin users and log the attempt to AuditEvent with action ADMIN_ACCESS_DENIED, targetType ROUTE, targetId set to the pathname, and details carrying method, role, and reason (basis: docs/SECURITY_AND_PRIVACY.md section 2.3).
- **AC-6**: Sign up, sign in, reset, and resend-verification endpoints are rate limited via Arcjet: sign-in 5 per minute per (IP + email), sign-up 5 per hour per IP, reset 3 per hour per email plus 10 per hour per IP, resend 3 per hour per email; violations return 429 with the RATE_LIMITED error code; mode is LIVE in production and DRY_RUN in development (basis: docs/TECHNICAL_ARCHITECTURE.md section 2.1, Arcjet).

## Decision

**Chosen option**: Option 1: Better Auth (library you host yourself).

Better Auth is already installed, aligns with the Prisma PostgreSQL data model from spec 0001, and keeps student data inside Cevo's own database under Cameroon Law 2010/012 and ANTIC regulations.

**Implementation skills**: none (no installed community skill shapes this decision; standard Better Auth and Next.js practice).

## Feature design

**Data model sketch**:

| Entity | Key fields | Required or nullable | Relationships |
|---|---|---|---|
| User | id, email, name, emailVerified, passwordHash, role, isActive | email unique, name required, role default STUDENT, isActive default true | 1:N Session, Account, Verification, Project, Payment, CreditWallet |
| Session | id, userId, token, expiresAt, updatedAt, ipAddress, userAgent | token unique | N:1 User (onDelete Cascade) |
| Account | id, userId, providerId, accountId, password | (providerId, accountId) unique | N:1 User (onDelete Cascade) |
| Verification | id, identifier, value, expiresAt, createdAt | identifier indexed | standalone (identifier convention: `email-verification:<email>` and `reset-password:<email>`) |

Password hash is stored on Account.password when using email credentials. The Verification table doubles as the password reset token store. A unique constraint on (identifier, value) is added in an additive migration (see build plan) so lookups by (identifier, value) newest-first are deterministic and a reset token cannot satisfy a verification request.

**State transitions**:

- User: created unverified (emailVerified false, isActive true) → verified after email link click → active while isActive true → deactivated (soft, isActive false) by admin or self deletion; the row is never deleted so financial records survive
- Session: created at sign in → expires at expiresAt → renewed on activity (sliding 30 day expiry, DB refresh at most daily via updateAge 1d) → invalidated on sign out, password change, or revoke-all-sessions
- Verification: created at sign up or reset request → consumed once on verify/reset (row deleted in the same transaction) → expires unused after its TTL

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/auth/sign-up/email | POST | email (req), name (req), password (req) | userId, no auto session | public | 400 validation, 409 email exists (generic message to avoid enumeration) |
| /api/auth/sign-in/email | POST | email (req), password (req) | session cookie | public | 401 invalid credentials, 403 inactive account, 429 rate limited |
| /api/auth/sign-out | POST | none | cleared session cookie, revoke-all-sessions optional | authenticated | none expected |
| /api/auth/verify-email | GET | token (query param) | emailVerified true, redirect | public | 410 expired token, 404 invalid token |
| /api/auth/send-verification-email | POST | email (req) | resend link by email | public | 429 rate limited |
| /api/auth/request-password-reset | POST | email (req) | reset token sent by email | public | 200 always (no enumeration), 429 rate limited |
| /api/auth/reset-password | POST | token (req), newPassword (req) | new session cookie, token row deleted | public | 410 expired token, 400 weak password |

The auth routes are served by a single Better Auth route handler at `app/api/auth/[...all]/route.ts`. Error responses follow the `{success:false,error:{code,message}}` envelope in docs/API_DESIGN.md section 4, mapping Better Auth codes (RATE_LIMITED → 429, FORBIDDEN → 403, VALIDATION_ERROR → 422).

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Sign up | new User row with emailVerified false, isActive true | input params email, name, password (email trimmed + lowercased) |
| Sign up | verification token row | generated by Better Auth, identifier `email-verification:<email>` |
| Sign in | session cookie | credentials validated against User and Account, password hash compared with Argon2id cost 12 |
| Sign in | rejected when isActive false | User.isActive column |
| Verify email | emailVerified set to true | token value from Verification table, matched by (identifier, value) newest-first |
| Send verification email | resend link by email | Nodemailer using SMTP env vars |
| Request password reset | reset token row | generated by Better Auth, identifier `reset-password:<email>`, TTL 30–60min |
| Reset password | new password hash | input param newPassword, hashed by BetterAuth Argon2id cost 12, token row deleted in same transaction |
| Reset password | new session cookie | created after password change succeeds |
| Admin route access | HTTP 403 or allowed | session user role read from DB on every admin request, compared to ADMIN or SUPER_ADMIN |
| Admin access denied audit | AuditEvent row | action ADMIN_ACCESS_DENIED, targetType ROUTE, targetId pathname, details {method, role, reason}, userId nullable, ipAddress from request |
| Rate limit decision | allow or 429 RATE_LIMITED | Arcjet keyed on IP+email for credentials, IP for resend |

**Key invariants**:

- User.email is unique (already enforced by spec 0001 schema); email is trimmed and lowercased before storage so `A@x.com` and `a@x.com` cannot become two accounts.
- Session.token is unique (already enforced by spec 0001 schema).
- (providerId, accountId) is unique in Account (already enforced by spec 0001 schema).
- A verification or reset token is single use: the row is deleted inside the same transaction that verifies the email or changes the password.
- (identifier, value) is unique in Verification after the additive migration so token lookups are deterministic.
- Every session is bound to one User through userId with cascade delete.
- Financial records survive account deactivation: User rows are soft-deactivated (isActive false), never deleted, so CreditLedger and Payment rows are retained for audit and tax compliance. (Note: spec 0001's schema declares onDelete Cascade on Payment.user and CreditWallet.user; this spec corrects that expectation — deactivation, not deletion, is the supported path until a future account deletion feature revises it.)
- Role is read from the DB on every admin request, not trusted from a cached session cookie, so a demoted admin loses access immediately.

**Security model**:

- Sign up, sign in, verify email, send verification email, request password reset, and reset password are public endpoints; no session required.
- All `/app` and `/admin` routes require a valid session cookie; the public marketing site and auth pages themselves are unauthenticated.
- Admin routes (/admin/...) require session user role ADMIN or SUPER_ADMIN read from the DB; denied with HTTP 403 and logged to AuditEvent. Admin server actions use the same `requireAdmin()` wrapper.
- Session cookies are HttpOnly, Secure in production, SameSite Lax, Path=/, 30 day sliding expiry. `Partitioned` is dropped unless compliance literally mandates it (it is Chrome-only and cannot be Secure on `http://localhost`).
- Verification/reset tokens are sent in GET URLs; the verify route sends `Referrer-Policy: no-referrer` and `Cache-Control: no-store`, tokens are short lived (24h / 30–60min) and single use.
- Passwords are hashed with Argon2id cost 12 by Better Auth; minimum 12 characters, maximum 128 characters.
- Email verification is required before project creation or credit consumption (not before sign in).
- Rate limiting via Arcjet on all public auth endpoints.
- Compliance scope: Cameroon Law 2010/012 on cyber security and cyber criminality, ANTIC regulations; student personal data processed only to provide academic services, encrypted in transit and at rest.
- Account enumeration resistance: reset endpoints always return 200; sign-up returns a generic "check your email" style outcome rather than 409 email exists.

**Configuration required**:

- BETTER_AUTH_SECRET: Better Auth signing secret, already in .env.example, generate with openssl rand -hex 32.
- BETTER_AUTH_URL: base URL for auth callbacks and emails, already in .env.example; derived from NEXT_PUBLIC_APP_URL which is canonical for links.
- SMTP_HOST: Nodemailer SMTP host for verification and reset emails, new for this feature.
- SMTP_PORT: Nodemailer SMTP port, new for this feature.
- SMTP_USER: Nodemailer SMTP username, new for this feature.
- SMTP_PASS: Nodemailer SMTP password, new for this feature.
- SMTP_FROM: sender address and display name, e.g. "Cevo <no-reply@cevo.example>", new for this feature.
- ARCJET_KEY: Arcjet site key for rate limiting, already in .env.example.
- ARCJET_ENV is not used; Arcjet mode is set in code as `NODE_ENV === 'production' ? 'LIVE' : 'DRY_RUN'`.

**Critical test scenarios**:

- Happy path: sign up (no auto sign-in), receive verification email, click link, sign in, access a role guarded route, sign out; verifies AC-1, AC-4.
- Failure case: reset token expired before use returns 410 and no password change occurs; verifies AC-3.
- Auth/permission: a STUDENT user accessing /admin/... receives HTTP 403 and the attempt is logged to AuditEvent; an inactive (isActive false) user cannot sign in; verifies AC-5, AC-2.
- Rate limit edge: repeated failed sign ins from the same IP+email are blocked with 429 RATE_LIMITED; verifies AC-6.
- Dev email: Mailpit captures the verification link locally and the test asserts against it; verifies AC-1.

## Build plan

Build approach: Tracer Bullet (the project default from the scope header). Stand up the full thread end to end first (route handler, sign up, sign in, verify, reset, sign out, admin guard, rate limiting, email transport, dev mail capture), then thicken with tests and edge cases.

1. Spike (one hour): verify Better Auth's Prisma adapter binds to the repo's Prisma 8 RC stack (`prisma 8.0.0-rc`, `@prisma/orm-postgres`, `contract emit`) via a `lib/prisma.ts` client singleton; if incompatible, use Better Auth's custom-adapter hook over the existing client (satisfies AC-1, AC-4; addresses G29).
2. Install `nodemailer` and `@arcjet/next`; add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM to .env.example (satisfies AC-1, AC-3, AC-6; addresses G2, G14).
3. Create `app/api/auth/[...all]/route.ts` exporting the Better Auth handler with the Prisma adapter (satisfies AC-1, AC-2, AC-4; addresses G1).
4. Configure `emailAndPassword`: `autoSignIn: false`, password min 12 / max 128, Argon2id cost 12, send verification and reset emails via Nodemailer using SMTP env vars (satisfies AC-1, AC-3; addresses G6, G11, G25).
5. Configure sessions: `expiresIn: 30d`, `updateAge: 1d`, cookie name `__Secure-better-auth.session_token` in production, HttpOnly Secure SameSite Lax Path=/; verify Secure only on an HTTPS/production build (satisfies AC-4; addresses G7, G22).
6. Add verification identifier convention `email-verification:<email>` and `reset-password:<email>`; add a unique index on (identifier, value) via an additive migration; delete the token row in the same transaction that verifies or resets (satisfies AC-1, AC-3; addresses G3, G9, G10).
7. Add `/api/auth/send-verification-email` resend endpoint, rate limited (satisfies AC-1; addresses G23).
8. Add `requireAdmin()` guard in Node runtime used by the admin layout and a shared wrapper for admin server actions; audit payload action ADMIN_ACCESS_DENIED, targetType ROUTE, targetId pathname, details {method, role, reason}; read role from DB on every admin request; reject sign-in when isActive false (satisfies AC-5; addresses G13, G18, G19, G20).
9. Add Arcjet rate limiting: sign-in 5/min per (IP+email), sign-up 5/hour per IP, reset 3/hour per email + 10/hour per IP, resend 3/hour per email, 429 RATE_LIMITED, mode LIVE in production / DRY_RUN in development (satisfies AC-6; addresses G12).
10. Add Mailpit to docker-compose.yml for dev email capture; configure a console transport fallback so local tests can assert against the verification link (satisfies AC-1; addresses G28).
11. Build sign in, sign up, forgot password, reset password pages at `app/(auth)/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password` with loading, error, success states and accessibility labels; success redirects to `/app`, failure to `?error=expired` (satisfies AC-1, AC-2, AC-3; addresses G16, G17).
12. Verify end to end: sign up, verify email, sign in, access role guarded route, reset password, sign out from anywhere (revoke-all-sessions); confirm cookies HttpOnly Secure SameSite Lax on HTTPS/prod; confirm unverified user can sign in but is gated by `requireVerifiedEmail()`; confirm audit log on admin denial (satisfies AC-1 through AC-6; addresses G24).

## Consequences

**Positive**:
- One auth library for the whole project, no duplicated auth logic across features.
- Student identity and session data stay inside Cevo's PostgreSQL database under the project's compliance scope.
- Reuses the verified data model from spec 0001; only a small additive migration may be needed for the Verification unique index.
- Every security property is a pinned config value, not a Better Auth default that could violate policy.

**Negative or tradeoffs**:
- Cevo operates its own SMTP transport, so deliverability and spam folder placement are the team's responsibility.
- Arcjet is a new external dependency requiring an account and site key.
- Role reads hit the DB on every admin request (accepts a small read cost to avoid stale cached roles).
- Financial record retention on deactivation corrects a false assumption in spec 0001's cascade rules; a future account deletion feature must revisit this.

**Neutral**:
- BETTER_AUTH_SECRET, BETTER_AUTH_URL, and ARCJET_KEY already exist in .env.example; only SMTP vars and SMTP_FROM are new.
- `Partitioned` is dropped; if compliance later mandates it, the cookie attribute override must be added and Secure cannot be tested on localhost.
- The local PostgreSQL database from scope feature 18 must be running before the auth tables can be used.
- `ARCJET_ENV` is deliberately not added; mode is configured in code.

## Follow-up

- [ ] Capture the stack conventions (Prisma, PostgreSQL, Better Auth, biome, Arcjet, Nodemailer) in a root AGENTS.md since none exists at the project root (noted from spec 0001 Follow-up).
- [ ] Decide later whether to add social OAuth providers (Google, GitHub) beyond email and password.
- [ ] Monitor email deliverability for verification and reset emails in production.
- [ ] Revisit cascade rules on Payment.user and CreditWallet.user when the account deletion feature is built.
