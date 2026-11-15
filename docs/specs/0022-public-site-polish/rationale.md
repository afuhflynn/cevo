# Rationale: 0022 Public site polish

Decision history for spec 0022. Build spec lives in `index.md`. This file holds the deliberation record only.

## Context

Visitors arrive with no account and little trust. They need to grasp the value in seconds, see honest proof, find transparent pricing in XAF for mobile money, and reach signup without stall. Current pages tell the story with text plus icons only, so visual proof is thin and pricing guidance is plain. Legal pages exist but read as flat files with no calm measure for long reading.

Forces at play include speed on slow networks, trust around money, legal clarity under Cameroon cyber law for online services, and one shared calm base across public plus auth. Pricing must stay truthful when admins edit packages. Nav must route cleanly to signup and signin. No new storage is wanted, reuse is preferred, and launch scope is English only.

If this stays undecided, marketing stays plain, pricing gives no guidance, previews stay abstract, and auth plus public drift into two visual dialects.

## Options considered

### Option 1: Live styled mocks with static truth

Build preview bands as static JSX that mirrors real workspace shapes, keep pricing read from live rows, keep legal as static files, keep static render with timed refresh.

**Pros**:
- Fast load with honest visual proof and no image weight
- Pricing stays truthful to ledger rows

**Cons**:
- Mocks can drift from real workspace if workspace changes and no one updates them

### Option 2: Real screenshots for proof

Capture actual workspace plus dashboard plus PDF export as image files and show them on landing.

**Pros**:
- Strongest proof because it shows the real product

**Cons**:
- Heavy files hurt slow networks, captures go stale fast, alt and theme work grows

### Option 3: Copy polish only with icons

Keep icons only, sharpen headlines and pricing copy, skip visual proof entirely.

**Pros**:
- Smallest build, fastest page

**Cons**:
- Visitors get no visual proof, conversion likely stays soft

## Rationale

Context demands speed on slow networks plus trust around money plus legal clarity, with no new storage and English only at launch. Option 1 gives visual proof without image weight, keeps one pricing truth shared with billing, and respects the calm academic base. Option 2 proves more but costs load and upkeep the team cannot afford now. Option 3 ships fast but leaves the proof gap that motivated this polish.
