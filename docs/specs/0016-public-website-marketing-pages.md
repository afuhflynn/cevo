# 0016. Public website and marketing pages

**Date**: 2026-11-14
**Status**: In Progress

## Summary

Cevo needs public pages that explain the core promise in seconds and guide visitors to paid credits. This spec covers landing plus pricing plus legal with one shared header, live package data from the database, and fast static rendering. English only ships at launch with Cameroon cyber law legal pages included.

## Context

> Premise note: Scope asks for real interface previews. You chose text plus icons only for launch to keep load light. This spec honors that pick as approved scope reduction for launch and defers screenshots to a later polish slice. Pricing clarity stays, visual proof waits.

Visitors arrive with no account and little trust. They need to grasp the value, see honest pricing in XAF (the currency used in Cameroon, Base for mobile money), and find a clear path to signup. Current root page shows foundation tokens for developers, not a marketing story, so it cannot convert students.

Forces at play include speed on slow networks, trust around money, and legal clarity under Cameroon cyber law (the national rules for online services, data handling, and consumer notice). Pricing must stay truthful when admins edit packages. Navigation must route cleanly to signup and signin. No new storage is wanted, reuse is preferred, and launch scope is English only.

If this stays undecided, marketing stays a developer placeholder, pricing drifts from the ledger truth, and legal risk remains open.

## Requirements

**User stories**:
1. As a visitor, I want to grasp the core promise in seconds so that I know Cevo turns my idea into a verified exportable report.
2. As a visitor, I want to see transparent pricing in XAF with credit amounts so that I can choose a package with confidence.
3. As a visitor, I want to move from pricing to signup to billing without confusion so that I can buy credits with MoMo (mobile money on MTN and Orange).
4. As a visitor, I want to read terms plus privacy plus refunds so that I trust the platform under Cameroon law.

**Acceptance criteria**:
1. **AC-1**: Landing shows hero with idea to report promise plus how it works plus features plus pricing teaser plus final call plus footer in that story order.
2. **AC-2**: Pricing page reads active rows from CreditPackage table ordered by sortOrder and shows name plus price in XAF plus credits plus popular badge, hides inactive rows.
3. **AC-3**: Buy shows same link server side for all visitors with packageId param, then client check after paint swaps target. Logged out goes to signup with next carrying billing URL plus package id. Logged in goes direct to billing checkout with packageId preselected. Checkout uses route and param decided in spec 0014 with preselect support.
4. **AC-4**: Shared public header appears on all public pages with logo plus pricing plus sign in plus get started, and footer links to legal pages.
5. **AC-5**: Terms page plus privacy page plus refunds page exist as static routes with readable layout on mobile and desktop in dark and light themes.
6. **AC-6**: Public routes render static with revalidate 3600 seconds, include title plus description plus generated OG card plus canonical plus sitemap at app/sitemap.ts plus robots, base URL from site env value, and load fast on slow networks. SEO tags are static copy per page, package count stays out of tags.
7. **AC-7**: Empty packages state plus caught fetch failure with last known good cache else empty guidance plus slow payment note plus hamburger nav under medium breakpoint plus responsive and theme check all show kind guidance with no blank screen. Theme inherits existing provider with no forced theme.

## Options considered

### Option 1: Static marketing routes with live package read

One route group for public pages, static render with timed revalidate (auto refresh of cached data after a set interval), pricing reads active CreditPackage rows at render time. Legal pages are static files in code.

**Pros**:
1. Fast load with fresh pricing and no new tables.

**Cons**:
1. Needs cache interval choice, stale price possible for minutes after admin edit.

### Option 2: Fully baked build time copy

Hardcode the three tiers in page copy at build time, no database read on public side.

**Pros**:
1. Simplest build, fastest possible page.

**Cons**:
1. Price edits need code deploy, drift risk between marketing and ledger truth.

### Option 3: Client fetched pricing shell

Static shell paints first, then client fetches pricing in browser.

**Pros**:
1. Always fresh after paint, simple caching.

**Cons**:
1. Slower perceived pricing, layout shift and extra loading states, weaker SEO (search engine discovery) for price content.

## Decision

**Chosen option**: Option 1: Static marketing routes with live package read

Build public routes as static pages with revalidate 3600 seconds and server read of active packages with catch that renders last known good cache else empty state. Buy link is static server side with packageId param, then client check after paint swaps target by session. Keep legal copy static in code as three separate routes for clarity. Use current Tailwind plus shadcn look with new header plus hero plus pricing plus footer components. Header uses hamburger under medium breakpoint. OG card is generated from logo plus headline. Checkout shows kind inactive message if package was deactivated after cache.

## Rationale

Context demands speed plus truthful pricing plus legal trust with no new storage. Option 1 keeps one source of truth in CreditPackage while staying fast through static render. Option 2 risks drift between marketing and money truth. Option 3 hurts SEO and adds loading complexity for little gain. Timed refresh balances freshness and speed for a price list that changes rarely.

## Feature design

**Data model sketch**:
Reuse only, no migration, no new tables.

1. CreditPackage (existing, read only on public side): id text required, name text required, priceXaf integer required, credits integer required, isPopular boolean required, isActive boolean required, sortOrder integer required, createdAt timestamp, updatedAt timestamp.
2. Public read filter: where isActive true, ordered by sortOrder ascending.
3. Legal copy: static files in code, no database, versioned by deploy.
4. Relations: none on public side. Checkout linkage happens after signup through billing flow decided in spec 0014.

**State transitions**:
Omit, no state machine. Visitor is anonymous or logged in, package is active or inactive, both read at render time.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/billing/packages | GET | none | active packages ordered by sortOrder | authenticated read reused server side | 401 when no session on direct call |
| /pricing | GET page | none | cards with name price credits popular badge plus Buy link with packageId | public | empty state when zero active, caught error renders last known good |
| /dashboard/billing/checkout | GET page | packageId:text (opt) | checkout preselected when package active, kind inactive message when deactivated | authenticated | 404 package inactive, handled kindly |
| /sign-up | GET page | next:text (opt), packageId:text (opt) | signup then redirect to next URL with package preserved | public | 422 bad next URL |
| /terms | GET page | none | static terms copy | public | 404 on bad path |
| /privacy | GET page | none | static privacy copy | public | 404 on bad path |
| /refunds | GET page | none | static refund policy copy | public | 404 on bad path |

Note: public pages read packages server side during render using the same query as the billing read, so browsers never call the authenticated API directly.

**Value sourcing**:
| Action | Value produced or displayed | Source |
|---|---|---|
| Pricing card | name | DB column CreditPackage.name |
| Pricing card | price in XAF | DB column CreditPackage.priceXaf, formatted with XAF label |
| Pricing card | credits amount | DB column CreditPackage.credits |
| Pricing card | popular badge | DB column CreditPackage.isPopular |
| Pricing card | order on page | DB column CreditPackage.sortOrder ascending |
| Pricing card | MoMo and Orange labels | Static copy decided here, MTN MoMo and Orange Money |
| Buy routing | signup then billing URL with packageId plus next | Input param packageId plus session state plus static route decided here, checkout in spec 0014 |
| Header | pricing sign in get started links plus hamburger under medium breakpoint | Static routes decided here: /pricing, /sign-in, /sign-up |
| Legal pages | terms privacy refunds copy | Static files in code, aligned to Cameroon cyber law |
| SEO tags | title description OG canonical | Static copy per page decided here, OG image generated from logo plus headline, base URL from site env value, sitemap from app/sitemap.ts |
| Empty state | no packages message plus contact link to support mail | Static copy decided here plus derived from query returning zero active rows |
| Copy blocks | hero features final call slow payment note | Static copy decided here, short placeholder for build to refine |

**Key invariants**:
1. Public never shows inactive packages at render time.
2. Price and credits shown equal the database row at render time, never hardcoded.
3. Buy never starts payment on public side, it routes to signup or billing with packageId preserved.
4. Legal routes stay public and readable in both themes with inherited provider.
5. Package read uses active only filter every time with catch that keeps last known good cache.
6. Deactivated package after cache shows kind inactive message at checkout, never silent fail.

**Security model**:
Public pages open to all, no session required. No personal data collected on landing or pricing. Logged in visitor who hits public pricing sees Buy that goes direct to billing, logged out visitor goes to signup first. No admin UI here. No new compliance data beyond what billing already stores. Cameroon cyber law scope is notice and transparency: clear pricing, clear refunds, contact and legal links in footer. Rate limiting on public pages follows platform defaults, no custom auth rules.

**Configuration required**:
1. `SITE_URL`: base URL for canonical plus sitemap plus OG, used by app/sitemap.ts.
2. `PRICING_REVALIDATE_SECONDS`: fixed at 3600, override only in tests.

**Critical test scenarios**:
1. Happy path: visitor lands then views pricing with three live packages then clicks Buy then reaches signup then billing, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**.
2. Failure case: zero active packages shows kind empty guidance with contact link, verifies **AC-7**.
3. Failure case: package fetch fails at render uses last known good cache else empty guidance with no blank screen, verifies **AC-7**.
4. Failure case: cached package deactivated after cache shows kind inactive message at checkout with new choice, verifies **AC-2**, **AC-3**.
5. Auth and permission: logged in student sees direct to billing link, logged out sees signup first, both see same prices, verifies **AC-3**.
6. Legal and discovery: terms plus privacy plus refunds load on mobile and desktop in both themes with correct title and canonical, verifies **AC-5**, **AC-6**.

## Build plan

Ordered as Tracer Bullet (thin end to end thread through every layer first, then thicken). Each task names the ACs it satisfies.

1. Thin thread: route group plus shared header with hamburger plus footer plus landing hero with story order, satisfies **AC-1**, **AC-4**.
2. Pricing read plus cards from active packages plus Buy routing with packageId plus client session swap plus signup next handling, satisfies **AC-2**, **AC-3**.
3. Legal trio as static routes with readable layout in both themes, satisfies **AC-5**.
4. SEO basics plus generated OG plus sitemap at app/sitemap.ts plus robots plus revalidate 3600, satisfies **AC-6**.
5. Edge states with last known good cache plus hamburger plus theme inherit plus slow payment note, satisfies **AC-7**.

## Consequences

**Positive**:
1. One pricing truth shared with billing, no drift.
2. Fast static pages that suit slow networks and search discovery.
3. Clear legal footing for launch under Cameroon rules.

**Negative or tradeoffs**:
1. Text plus icons only means weaker visual proof until screenshots land, conversion may suffer.
2. Cached pricing can lag admin edits by up to the revalidate interval.
3. English only excludes French first students until localization lands.

**Neutral**:
1. New public route group lives beside auth and dashboard groups with no changes to existing guards.
2. Legal copy needs owner review before launch, wording is not legal advice.

## Follow-up

1. Confirm the three package values and popular flag with billing owner so marketing matches spec 0014 seed.
2. Have legal owner review terms plus privacy plus refunds for Cameroon cyber law fit before launch.
3. Later polish candidate: add real static screenshots and export sample when product UI stabilizes.
4. Later candidate: French version of landing plus pricing plus legal for Cameroon schools.
