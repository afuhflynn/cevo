# Rationale: 0009 Verified research discovery and citations

## Context

Cevo guides students from idea to exportable academic report. Reports need legitimate sources plus correctly formatted citations, and supervisors reject work built on invented references. The schema already holds `ResearchSource` (global paper row) plus `ProjectSource` (project library link) plus `Citation` (section insert) from spec 0001, and the workspace already shows placeholder citation marks from spec 0007, but no verified search plus save plus format flow exists yet.

Forces shaping this choice are trust plus determinism plus politeness. Trust means every result must show where its metadata came from and whether its DOI (digital object identifier, the permanent paper ID) is confirmed. Determinism means the same source plus the same style must always produce the same string, with no model drafting involved, so marks are defensible. Politeness means provider calls must carry a contact email and stay cached plus capped, since both providers are shared public goods with fair use expectations. Not deciding leaves students pasting unverified references by hand, which breaks the credibility promise of the whole workspace.

## Options considered

### Option 1: Minimal single provider plus single style

One provider (OpenAlex only) plus APA 7 only plus no cache, with hand rolled formatter and direct fetch from one route.

**Pros**:
* Fewest moving parts, fastest to ship and easiest to operate.

**Cons**:
* No Crossref enrich means weaker DOI trust plus missing publisher fields.
* Single style forces a later breaking change when Harvard is required.

### Option 2: Direct fetch both providers plus hand rolled formatter plus server cache

Server routes call OpenAlex plus Crossref REST directly with contact email as `mailto` query for OpenAlex and `User-Agent` contact for Crossref, merge on DOI first then OpenAlex ID with title plus year plus author fallback at save, cache 5 minutes on server, format with an owned pure function for APA 7 plus Harvard Cite Them Right with snapshot tests.

**Pros**:
* Full trust signal from both public indexes with no new dependency to operate.
* Deterministic output owned in repo, easy to test and to extend when template rules land.

**Cons**:
* Team owns formatter edge cases such as long author lists plus missing fields.
* Merge plus cache logic lives in app code and needs careful timeout handling.

### Option 3: SDK plus citation library

Add a search SDK wrapper plus a citation formatting library to parse and format many styles.

**Pros**:
* Faster style coverage beyond APA plus Harvard, less formatter code to own.

**Cons**:
* New dependency with its own parsing quirks plus larger bundle plus upgrade burden.
* Output exactness depends on upstream releases, harder to freeze for academic marking.

## Rationale

The core risk is fake or sloppy references, so trust plus exactness outrank breadth of styles. Direct fetch gives both indexes with full control over timeouts plus partial failure plus polite contact, which a wrapper would hide. Owned formatting gives byte exact strings tied to `Project.referencingStyle`, with snapshot tests locking APA 7 plus Harvard Cite Them Right behavior for long author lists and missing fields. Server cache plus per user caps keep the shared providers fast without a new store to operate. A library would trade this control for style breadth the scope does not yet need. Crossref enrich runs only for the top 10 OpenAlex hits to hold the 12s budget, and title fallback covers the DOI miss path.
