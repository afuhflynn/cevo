# 0022. Public site polish

**Date**: 2026-11-15
**Status**: In Progress

## Summary

This spec polishes the public path so a visitor grasps the core promise in seconds and moves to signup with trust. It keeps the story and pricing truth from spec 0016 and adds honest product mocks plus clearer pricing guidance plus calmer legal reading plus a shared Docs calm font across the app. Building stays static and fast with no new tables and no new libraries.

## Requirements

**User stories**:
1. As a visitor, I want to grasp the core promise in seconds so that I know Cevo turns my idea into a verified exportable report.
2. As a visitor, I want to see honest previews of the workspace so that I trust the product before I sign up.
3. As a visitor, I want pricing that guides me to the right credit pack so that I can pay with mobile money with confidence.
4. As a visitor, I want nav that routes cleanly to signup so that I never stall on the public path.
5. As a visitor, I want terms plus privacy plus refunds that read well on phone and desktop so that I trust the platform under Cameroon law.

**Acceptance criteria**:
- **AC-1**: Landing shows hero with core promise plus proof mock plus how it works plus features plus pricing teaser plus final call plus footer in that order.
- **AC-2**: Proof band shows live styled JSX mocks of workspace plus citation plus export shapes using real data shapes, with alt text and no screenshot files.
- **AC-3**: Pricing page reads active CreditPackage rows ordered by sortOrder and shows name plus price in XAF plus credits plus popular badge plus one usage hint line per card.
- **AC-4**: Shared header shows logo plus pricing plus sign in plus get started, footer shows terms plus privacy plus refunds plus support mail, hamburger appears under medium breakpoint.
- **AC-5**: Terms plus privacy plus refunds use narrow prose with section anchors, stacked on mobile and anchored on desktop, readable in light and dark themes.
- **AC-6**: Grids collapse to one column on small screens, mock stacks above copy, pricing cards stack, no horizontal overflow, no blank blocks.
- **AC-7**: Public routes stay static with revalidate 3600 seconds, with title plus description plus generated OG card plus canonical plus sitemap plus robots, and load fast on slow networks.
- **AC-8**: Body text across the app uses Roboto weights 400 plus 500 plus 700 through next/font in app/layout.tsx consumed in app/globals.css, serif stays Source Serif 4 for long reading, mono stays JetBrains Mono for code.
- **AC-9**: Auth pages keep spec 0019 cards and logic, only font and spacing rhythm align with the new public polish.
- **AC-10**: Empty packages plus fetch fail plus deactivated package plus slow payment show kind guidance with contact link and last known good cache where possible, never a blank screen.
- **AC-11**: Motion stays inside the foundation allow list from spec 0017, no new library and no scroll linked effects.
- **AC-12**: Each of landing plus pricing plus nav plus legal carries Firecrawl pattern notes applied at build time inside foundation primitives, no links ship in code.

## Decision

**Chosen option**: Option 1: Live styled mocks with static truth

Polish the public routes in place with a new proof band plus usage hints plus narrow legal layout plus global Roboto, reusing foundation primitives and keeping static render with timed refresh.

## Feature design

**Data model sketch**:
Reuse only, no migration, no new tables.

1. CreditPackage (existing, read only on public side): id text required, name text required, priceXaf integer required, credits integer required, isPopular boolean required, isActive boolean required, sortOrder integer required, createdAt timestamp, updatedAt timestamp.
2. Public read filter: where isActive true, ordered by sortOrder ascending.
3. Legal copy: static files in code, no database, versioned by deploy.
4. Usage hint line: static copy in code per price band, not a new column.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| / | GET page | none | hero plus mock plus steps plus features plus teaser plus final call | public | none |
| /pricing | GET page | none | cards with price plus credits plus popular plus hint plus Buy with packageId | public | empty state when zero active |
| /terms | GET page | none | static terms copy | public | 404 on bad path |
| /privacy | GET page | none | static privacy copy | public | 404 on bad path |
| /refunds | GET page | none | static refund copy | public | 404 on bad path |
| Buy link | client swap | packageId:text (opt), session state | logged out goes to signup with next carrying billing URL plus packageId, logged in goes to billing checkout with packageId preselected | public with session read | 404 package inactive at checkout with kind message |
| Buy targets | GET page | packageId:text (opt), next:text (opt) | signup target /sign-up with next set to /dashboard/billing/checkout plus packageId, billing target /dashboard/billing/checkout plus packageId | public then auth | 422 bad next falls back to onboarding |

Note: public pages read packages server side during render using the same query as the billing read, so browsers never call the authenticated API directly. Session swap runs after paint, so first paint shows the static signup target and never flashes a broken link. Last known good means the previous successful getPublicPackages render kept by Next cache under revalidate 3600 seconds, not a new store.

**Value sourcing**:
| Action | Value produced or displayed | Source |
|---|---|---|
| Landing hero | headline plus subcopy plus CTAs | Static copy decided here, promise kept from spec 0016 |
| Proof mock | workspace plus citation plus export shapes | Static JSX in code mirroring real data shapes, no DB read |
| Pricing card | name | DB column CreditPackage.name |
| Pricing card | price in XAF | DB column CreditPackage.priceXaf with XAF label |
| Pricing card | credits amount | DB column CreditPackage.credits |
| Pricing card | popular badge | DB column CreditPackage.isPopular |
| Pricing card | order on page | DB column CreditPackage.sortOrder ascending |
| Pricing card | usage hint | Static copy in code per price band decided here |
| Pricing card | MoMo and Orange labels | Static copy decided here, MTN MoMo and Orange Money |
| Buy routing | signup then billing URL with packageId plus next | Input param packageId plus session state plus static route decided here, checkout in spec 0014 |
| Header | pricing sign in get started links plus hamburger under medium breakpoint | Static routes decided here: /pricing, /sign-in, /sign-up |
| Footer | legal plus support links | Static routes decided here plus support mail constant |
| Legal pages | terms privacy refunds copy with anchors | Static files in code aligned to Cameroon cyber law |
| SEO tags | title description OG canonical | Static copy per page decided here, OG from logo plus headline, base URL from site env value, sitemap from app/sitemap.ts |
| Empty state | no packages message plus contact link | Static copy decided here plus query returning zero active rows |
| Font | body face plus fallback | Roboto weights 400 plus 500 plus 700 latin via next/font in app/layout.tsx, CSS variable in app/globals.css, fallback stack in code |
| Auth touch | aligned rhythm | Spec 0019 cards unchanged, only font variable and spacing tokens reused |

**Key invariants**:
1. Public never shows inactive packages at render time.
2. Price and credits shown equal the database row at render time, never hardcoded.
3. Buy never starts payment on public side, it routes to signup or billing with packageId preserved.
4. Legal routes stay public and readable in both themes with inherited provider.
5. Package read uses active only filter every time with catch that keeps last known good cache.
6. Deactivated package after cache shows kind inactive message at checkout, never silent fail.
7. Preview mocks use foundation primitives only, no new control styles.
8. Auth logic and stored data stay untouched, screens only gain font and rhythm alignment.
9. Firecrawl ideas stay inside approved primitives, no custom input or dialog or toast style.
10. SortOrder ties break by createdAt then id, so card order is stable.
11. At most one popular badge shows, the first popular row by sortOrder wins, none shows when no row is flagged.
12. Usage hints are static bands by card position, first card is starter, second is standard, third and later are large, copy only guides and never promises exact output counts.

**Copy blocks** (locked strings, build refines wording only without changing promise):
1. Hero badge: Academic project workspace plus Cameroon.
2. Hero headline: From idea to verified exportable report.
3. Hero subcopy: Cevo guides you from a rough project idea to a structured, researched, verified report that follows your institutional guidelines.
4. Hero primary CTA: Start your project. Hero secondary CTA: See pricing in XAF. Hero microcopy: No payment to explore.
5. Steps titles: Brief your idea, Research with proof, Write and export, with bodies kept from current page.
6. Features: six cards kept from current page for templates plus verified research plus review before submit plus assistant plus export plus MoMo.
7. Pricing teaser headline: Transparent pricing in XAF. Final call headline: Ready when your idea is.
8. Footer tagline: From idea to verified exportable report. Support mail: support@cevo.example.
9. Empty packages: No credit packages are available right now, with contact link and Create an account anyway action.
10. Stale notice: Showing last known prices while fresh data loads. Fetch fail: Pricing could not load right now. Slow payment note: Approve the prompt on your phone with your MoMo PIN, payment can take a few minutes on slow networks.
11. Deactivated at checkout: This package is no longer available, choose another pack, with link back to pricing.
12. Buy control label comes from the existing BuyButton component, no new label invented here.

**Mock spec** (what the proof band shows):
1. Workspace frame: chapter tree with three chapters plus Tiptap paragraph plus citation chip in APA 7 style plus export badge for PDF and DOCX.
2. Sample topic is generic academic work, no real student data, no personal facts.
3. Alt text: Preview of the Cevo workspace with chapters plus citations plus export options. Pricing mock alt: Sample credit pack card with price plus credits plus Buy action.
4. Mocks render in both themes with muted borders and pass contrast check, no new colors.

**Security model**:
Public pages open to all, no session required. No personal data collected on landing or pricing. Logged in visitor who hits public pricing sees Buy that goes direct to billing, logged out visitor goes to signup first. No admin UI here. Cameroon cyber law scope is notice and transparency: clear pricing, clear refunds, contact and legal links in footer. Rate limiting follows platform defaults, no custom auth rules.

**Configuration required**:
1. `SITE_URL`: base URL for canonical plus sitemap plus OG, used by app/sitemap.ts. Build fails closed with kind guidance when unset, never a broken link.
2. `PRICING_REVALIDATE_SECONDS`: fixed at 3600, override only in tests.

**Layout tokens** (no new values):
1. Header uses existing PublicHeader with CevoLogo size sm plus ThemeToggle, sticky with blur, hamburger under md breakpoint with aria expanded plus close on navigate plus visible focus.
2. Footer uses existing PublicFooter with product plus legal nav and support mail link.
3. Legal body uses max prose measure around 65 characters with section anchors, stacked on mobile and anchored on desktop.
4. Grids use sm breakpoint for stacking and md breakpoint for header, long words break so no horizontal overflow occurs.
5. SEO per page reuses current title plus description in app/page.tsx and app/pricing/page.tsx, OG card generated from logo plus headline, sitemap at app/sitemap.ts plus robots.
6. Font uses --font-sans for Roboto plus --font-serif for Source Serif 4 plus --font-mono for JetBrains Mono, with system fallback stack in globals, display swap, no layout shift.
7. AC-12 is verified by reviewer check that mocks plus cards plus nav use foundation primitives only with no new control styles.

**Critical test scenarios**:
- Happy path: visitor lands then sees promise plus mock then views pricing with live packs then taps Buy then reaches signup then billing, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**.
- Guidance path: each card shows usage hint that matches its credit band, verifies **AC-3**.
- Legal path: terms plus privacy plus refunds load on mobile and desktop in both themes with anchors, verifies **AC-5**, **AC-6**.
- Load path: cold load on slow network paints hero fast with static cache and revalidate, verifies **AC-7**.
- Font path: cold load shows Roboto body with serif and mono intact in both themes with no layout shift, verifies **AC-8**.
- Auth path: auth pages read as same family with aligned rhythm and unchanged flows, verifies **AC-9**.
- Failure case: zero active packages shows kind empty guidance, fetch fail uses last known good else empty guidance, verifies **AC-10**.
- Failure case: cached package deactivated after open shows kind inactive message at checkout with new choice, verifies **AC-10**.
- Auth and permission: anonymous can open all public pages, signed in visit sees direct billing target, verifies **AC-4**.
- Motion guard: no scroll linked effects and no new library in bundle, verifies **AC-11**.

## Build plan

Ordered as Tracer Bullet (thin end to end thread through every layer first, then thicken). Each task names the ACs it satisfies.

1. Thin thread: shared header with hamburger plus footer plus landing hero with promise plus proof mock placeholder plus final call, satisfies **AC-1**, **AC-2**, **AC-4**.
2. Pricing read plus cards with live rows plus usage hints plus Buy routing with packageId plus client session swap plus signup next handling, satisfies **AC-3**, **AC-4**, **AC-7**.
3. Proof band plus features plus teaser plus Firecrawl per page notes for landing plus pricing applied inside foundation primitives, satisfies **AC-2**, **AC-12**.
4. Legal trio as narrow prose with anchors plus responsive plus both themes pass, satisfies **AC-5**, **AC-6**.
5. Font global plus auth rhythm alignment plus SEO plus revalidate plus edge states with last known good cache plus motion allow list check, satisfies **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**.

Motion allow list approval (only these may ship, nothing else without a new decision):
- Overlay open and close fade plus scale from primitive defaults for any popover use
- Loading shimmer and pulse on skeleton, spin on spinner
- Duration around 100 to 200 milliseconds for control transitions
- No page transition choreography, no layout animation, no spring physics, no scroll linked effects, no looping decorative animation, no new motion library

Firecrawl per page notes (taste guidance for build, no links ship):
- Landing hero: Docs calm headline scale, generous whitespace, single primary CTA plus quiet secondary, badge above title for context
- Landing proof: ChatGPT style product frame with muted border, Claude style calm card grid for steps, Grok style compact stat row for trust
- Pricing: Dribbble style tier cards with popular highlight, usage hint under credits, MoMo note with phone PIN guidance
- Nav: minimal top bar with logo left and two actions right, hamburger under medium breakpoint, sticky with blur on scroll without layout shift
- Legal: narrow measure for reading, anchored headings, muted secondary text, same card tokens in both themes

## Consequences

**Positive**:
1. One pricing truth shared with billing, no drift.
2. Honest mocks give proof without image weight for slow networks.
3. Docs calm font and shared rhythm make public plus auth read as one product.
4. Clear legal footing for launch under Cameroon rules.

**Negative or tradeoffs**:
1. Mocks need manual upkeep when workspace changes or they drift from reality.
2. Cached pricing can lag admin edits by up to the revalidate interval.
3. English only excludes French first students until localization lands.
4. Usage hints are static copy and can mislead if credit costs change without a copy update.

**Neutral**:
1. New public polish lives beside auth and dashboard groups with no changes to existing guards.
2. Legal copy needs owner review before launch, wording is not legal advice.

## Follow-up

- [ ] Confirm the three package values and popular flag plus usage hint bands with billing owner so marketing matches spec 0014 seed.
- [ ] Have legal owner review terms plus privacy plus refunds for Cameroon cyber law fit before launch.
- [ ] Update scope row 25 to in progress with spec link plus build tasks on confirm.
- [ ] Record approved motion uses above at build time so each use stays visible.
- [ ] Later candidate: French version of landing plus pricing plus legal for Cameroon schools.
- [ ] Later candidate: replace styled mocks with real screenshots plus export sample when product UI stabilizes.
