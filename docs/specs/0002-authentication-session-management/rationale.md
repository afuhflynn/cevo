# 0002 · Rationale: Authentication and session management

Decision record for spec 0002 (deliberated in `/solution-architect`). The
build spec lives in `index.md`; the durable verify checklist lives in
`verify.md`.

## Context

Cevo is an academic project development workspace for university students. No authentication exists in code yet. The data model for auth already exists in Prisma (spec 0001): User with email, emailVerified, role, isActive, and name, plus Session, Account, and Verification tables. Better Auth is installed as a dependency. The project runs Next.js 16 App Router with server actions and route handlers. Security policy requires HttpOnly Secure SameSite Lax session cookies with 30 day sliding expiry, email verification before project creation or credit consumption, Argon2id or bcrypt password hashing at cost 12, and role based access control on admin routes. Compliance scope is Cameroon Law 2010/012 and ANTIC regulations. Without this decision every later feature would invent its own inconsistent auth.

## Options considered

### Option 1: Better Auth (library you host yourself)

Better Auth is already installed (`better-auth ^1.7.18`). It plugs into the existing Prisma PostgreSQL schema, uses the Session Account and Verification tables already defined in spec 0001, and runs inside the Next.js app as a route handler at `app/api/auth/[...all]/route.ts`.

**Pros**:
- Reuses the installed library and the already designed data model, no new provider or migration beyond a possible additive one.
- Native TypeScript types and Prisma adapter match the project stack.
- Every security property in AC-4 through AC-6 is a config value the spec pins explicitly.

**Cons**:
- The team operates the SMTP transport for verification and reset emails itself (Nodemailer), so deliverability setup falls on Cevo.
- Session and token storage live in the Cevo database, so the team owns backup and rotation.

### Option 2: A hosted auth provider (e.g. Clerk or Auth0)

A third party service hosts user identity, sessions, and email delivery. Cevo calls the provider's SDK and maps provider users to Cevo rows.

**Pros**:
- Email delivery, session management, and brute force protection are handled by the provider.
- Faster initial setup with prebuilt UI components.

**Cons**:
- Adds a new external dependency and cost not present in the current stack.
- Requires syncing provider users to the Cevo Prisma schema, duplicating the User table spec 0001 already owns.
- Student personal data would flow through a third party, adding compliance review under Cameroon Law 2010/012.

### Option 3: Roll our own auth

Build sign up, sign in, sessions, email verification, and password reset from scratch with Prisma and Next.js.

**Pros**:
- Full control over every detail, no external dependency.

**Cons**:
- High risk: password hashing, session fixation, token timing attacks, and email deliverability are easy to get wrong.
- Duplicates what Better Auth already provides, contrary to the project's reuse preference.
- Would need its own security audit before launch.

## Rationale

Better Auth wins because it is already installed, reuses the User Session Account and Verification tables spec 0001 already defines, and avoids adding a third party identity provider that would add cost and compliance review. The tradeoff is that Cevo operates its own SMTP transport for emails, which the team accepts because Nodemailer is simple and keeps email delivery in house.

## References

**Project sources** (verifiable, in this repo):
- docs/TECHNICAL_ARCHITECTURE.md — Better Auth with PostgreSQL adapter, Arcjet for rate limiting, stack layer table
- docs/SECURITY_AND_PRIVACY.md — session cookie policy, password hashing, email verification gating, role based access control, compliance scope
- docs/API_DESIGN.md — error response envelope {success:false,error:{code,message}} section 4
- docs/scope/scope.md — feature 4 intent and done when criteria
- spec 0001-core-data-model-schema-migration — User, Session, Account, Verification data model already applied

**Practices & standards**:
- session cookie security: HttpOnly Secure SameSite Lax Path=/ with sliding expiry
- rate limiting public endpoints keyed on IP+email to prevent brute force abuse
- single-use tokens deleted in the same transaction as the consuming mutation

**Links** (web verified only, sources+links level only):
- none verified
