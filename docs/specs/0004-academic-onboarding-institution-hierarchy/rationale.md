# Rationale: 0004 Academic onboarding and institution hierarchy

Decision history, not build input. The build spec lives in `index.md`.

## Context

Cevo serves university students who sign up with email and password (a login method using an address plus a secret). After verification (a check that the email belongs to the student) and sign in, the platform knows nothing about their school, faculty, department, programme (a course of study), qualification (a degree level such as Bachelors), or citation style (a rule set for formatting references such as APA 7).

Without this decision, later features (project creation, templates, exports) lack the academic context they need to match rules to the right school and level. The build approach for this project is Tracer Bullet (thin working slices built end to end through every layer). The stack in use is Next.js App Router (a web framework that renders pages on the server) plus Prisma (a database toolkit) plus PostgreSQL (a relational database) plus Better Auth (a login library). The schema already holds StudentProfile, AcademicProfile, Institution, Faculty, Department, Programme, CreditWallet, and CreditLedger. Auth and session handling are decided and built. The linked scope feature is number 5, planned, with welcome credits and routing to the dashboard as its done state.

## Options considered

### Option 1: Three step wizard with per step save and strict guard

A centered card flow with three screens, each step saved by its own Server Action (a server function called directly from the form), dashboard locked by server layout check (a check in the page layout on the server) plus proxy check (a request filter in proxy.ts). Pickers filter by parent with paging. Suggestions store as custom text.

**Pros**:
- Matches the scope intent and keeps data complete before projects begin.
- Resume works across devices since state lives in the database.

**Cons**:
- More actions and guards to build than a single form.
- Strict lock can annoy if seed data misses a school, needs a smooth suggest path.

### Option 2: Single long form with soft prompt

All fields on one page, dashboard open with a reminder banner, one submit at the end.

**Pros**:
- Fewest components and fastest initial build.

**Cons**:
- No clean resume, partial data stays in the browser only.
- Students skip setup, later features receive empty academic context.

### Option 3: One question per screen with autosave per field

Conversational screens with animated transitions, every keystroke saved after a short delay.

**Pros**:
- Feels friendly on mobile and reduces perceived effort.

**Cons**:
- Many more writes and states to test, slower to complete.
- Harder to review and correct academic picks as a set.

## Rationale

The scope asks for progressive saving, selectable or suggestible Cameroonian universities, welcome credits, and routing to the dashboard. Only Option 1 gives all four with data the rest of the platform can trust. A single form loses resume and lets students skip. A conversational flow adds writes and complexity with no extra value for structured academic data. The strict guard is safe because the suggest path removes the block risk. Reuse of existing tables keeps the change small and consistent with the auth and data model that already exist.

## Follow-up

- [ ] Curate the initial Cameroonian institution seed list with an education stakeholder before build step 1.
- [ ] Design admin review for suggested institutions in the admin portal spec, custom entries stay pending until then.
- [ ] Confirm academicSession pattern YYYY/YYYY with registrar examples, current choice is a simple pattern check.
