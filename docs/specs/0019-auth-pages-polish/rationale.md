# 0019. Auth pages polish rationale

## Context

The auth path works today and guards real account access. Sign in plus sign up plus forgot plus reset plus verify screens each grew at a different time, so spacing plus input style plus error copy plus loading feel differ from screen to screen. The app body still uses Inter while the request asks for a Docs style Roboto feel across the whole app. Without a frozen call on the card family plus password help plus font wiring, each screen will keep drifting and the auth path will read as five separate products. That drift costs trust at the exact moment a new student decides to stay.

The base is settled. Spec 0017 froze primitives plus tokens plus the motion allow list. Spec 0002 shipped the auth logic plus session plus rate limits plus mail flows. The polish must reuse that base with zero logic or stored data change. Outside ideas from AI products plus Dribbble can inform spacing and copy at build time, but the build must stay inside the foundation card and input patterns. The request also asks for a full app font move, which raises the blast radius from five screens to every screen, so the spec must name that cost plainly.

## Options considered

### Option 1: Fix in place per screen

Touch only the rough edges on each screen such as copy tweaks plus missing show and hide plus alert alignment, and leave structure and font as today.

**Pros**:
* Smallest diff with almost no review load
* Zero risk to global styles since globals stay untouched

**Cons**:
* Screens still differ in spacing and rhythm, so the family feel never lands
* Font request stays unmet, so a second pass is needed later

### Option 2: Replace presentation directly

Remake all five screens on the shared card family plus add shared password help with meter plus checklist plus wire Roboto body across the app via next/font, with zero logic or schema change and Firecrawl ideas applied at build time inside foundation patterns.

**Pros**:
* One pass lands the family feel plus password help plus font
* Reuses the frozen base, so no new primitives and no new libraries

**Cons**:
* Global font swap needs review across onboarding plus dashboard plus admin plus public plus workspace
* Stricter client checklist can block users whose old strong passwords lack a symbol

### Option 3: Rebuild with a new auth kit

Lift in a fresh auth screen kit with its own inputs plus cards plus motion plus font stack, then restyle the app around it.

**Pros**:
* Fastest visual change if the kit already looks polished

**Cons**:
* Adds a second visual language beside the frozen base from spec 0017
* New motion and new styles raise upkeep cost and break the allow list
* Migration risk with little gain since current logic already works

## Rationale

Option 2 fits the forces in Context. The problem is drift plus an explicit font ask, not broken logic, so a targeted remake on the frozen base solves it with the least new upkeep. Shared AuthCard plus PasswordField ship first so the five screens cannot drift again, and sign in stays exempt from the checklist so no existing user locks out. Option 1 leaves drift and punts the font ask. Option 3 buys novelty at the price of a second language and allow list breakage. The spec accepts global font review cost and the stricter client checklist as conscious tradeoffs, and it keeps Firecrawl ideas as build time guidance inside foundation patterns so taste input cannot spawn new primitives.
