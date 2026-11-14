# 0009. Verified research discovery and citations

**Date**: 2026-11-14
**Status**: In Progress

## Summary

Students need trusted papers they can cite without fear of fake references. This spec connects OpenAlex (open paper index) plus Crossref (official DOI registry) so search returns verified records, saves them to a project library with notes, and inserts exact APA 7 plus Harvard citations into the editor. Build runs as a thin live slice first, then thickens with curation plus guards.

## Requirements

**User stories**:
* As a student, I want to search verified papers by topic or DOI so that I cite real work.
* As a student, I want to save papers to my project library with notes so that I remember why each source matters.
* As a student, I want to insert citations into chapters so that inline markers plus the reference list stay consistent.

**Acceptance criteria**:
* **AC-1**: Student enters keyword plus DOI plus title in one search box. Server detects DOI by pattern plus strips URL prefix plus lowercases, else treats input as keyword with title match. Results merge exact DOI first then title exact then provider relevance with year desc tiebreak. Each hit shows title plus authors plus year plus venue plus DOI state plus open access state plus provider origin. Page size is 10 per provider merged to 20 max with one opaque cursor.
* **AC-2**: Student saves a result to the project library. Server always refetches by ID, client payload is hint only. Save creates or reuses one global source row plus one project link holding student note plus tags plus pin, with duplicate save returning the existing link with 200 plus deduped flag. DOI stored canonical. Save requires DOI or OpenAlex ID, title only hits cannot be saved until resolved.
* **AC-3**: Library list supports text filter over title plus authors plus venue plus note plus tag filter case insensitive OR plus pin sort with newest link first plus `createdAt` plus `id` tiebreak plus paged cursor plus filtered total. Detail by link ID shows abstract plus PDF link when available plus provider origin derived from `rawMetadata` plus last fetch date. Tags are array of strings, max 10, max 24 chars each.
* **AC-4**: Insert from a linked library source creates one citation row per section spot using `Project.referencingStyle` with allowed values APA 7 plus Harvard Cite Them Right. Same source in one section reuses one reference list entry and returns the existing row. Reference list sorts alphabetically by first author then year then title. Inline marker is parenthetical in version one with APA 7 up to 20 then et al and Harvard up to 3 then et al, missing year renders n.d., same author same year adds a b c ordered by title. Output is byte exact across rerenders.
* **AC-5**: Search input is debounced 400ms plus server cached 5 minutes in runtime cache keyed on normalized query plus cursor plus capped at 30 searches per minute per user and 60 saves per minute per user with 429 plus retry after seconds, with skeleton cards while loading plus guided empty state plus helpful miss state for unknown DOI with title fallback hits.
* **AC-6**: Only the project owner may search plus save plus edit plus insert, otherwise 404. Admins get read only library plus detail view for support, admin write receives 403. Every save plus unsave plus note edit plus pin plus insert plus citation delete writes an `AuditEvent` with named actions `research.save` plus `research.unsave` plus `research.update` plus `citation.insert` plus `citation.delete`.
* **AC-7**: Each provider gets 10s timeout inside 12s overall budget. Slow or failed provider returns partial results from the healthy provider with a clear notice plus cursor for that provider only. No failed call blocks the editor or corrupts saved data.
* **AC-8**: Verification state starts at metadata verified then moves to DOI verified on DOI match, to incomplete metadata when title or authors or year are missing, to requires review when DOI or year or first author disagree across providers, to full text available when `pdfUrl` is reachable at save. Provider calls send contact email as `mailto` query for OpenAlex and `User-Agent` contact for Crossref.

## Decision

**Chosen option**: Option 2: Direct fetch both providers plus hand rolled formatter plus server cache

The app calls both providers directly from server routes, merges on stable IDs with a save time title match fallback, caches 5 minutes, and formats with owned code. This keeps trust high and output exact while adding zero new runtime dependencies.

## Feature design

**Data model sketch**:
* `ResearchSource` (global, one row per paper): keep `doi` unique plus `openAlexId` unique plus title plus authors JSON plus `publicationYear` plus venue plus volume plus issue plus pages plus publisher plus abstract plus `pdfUrl` plus `isOpenAccess` plus `verificationState` plus `rawMetadata` JSON. Authors store array of family plus given plus optional affiliation. Title match uses lowercased trimmed form. Add `formattedApa` text plus `formattedHarvard` text plus `lastVerifiedAt` timestamp as speed caches only, rebuilt on read when missing or when the formatter version changes. No new required columns, migration is additive.
* `ProjectSource` (library link, unique on `projectId` plus `sourceId`): keep `studentNote` text plus `tags` JSON plus `isPinned` plus timestamps. Tags are array of strings, max 10 per link, max 24 chars each, stored lowercased trimmed. No new curation flags in version one.
* `Citation` (section insert, one row per source per section): keep `sectionId` plus `sourceId` plus `inlineText` plus `citationKey`. Add `style` text plus `formattedText` text plus `anchorId` text linking the editor mark to the row for orphan prune. `citationKey` is unique per project plus source with short hash suffix on clash. Editor JSON is truth for marker placement, the row is truth for rendered text.
* Relations: `Project` one to many `ProjectSource` with cascade on project delete, global `ResearchSource` stays. `ProjectSection` one to many `Citation` with cascade on section delete. `ResearchSource` one to many `Citation` for bibliography grouping.

**State transitions**:
* `ResearchSource.verificationState`: metadata verified to DOI verified when canonical DOI present, to incomplete metadata when title or authors or year are missing, to requires review when DOI or year or first author disagree across providers, to full text available when `pdfUrl` is reachable at save. No delete transition, global rows persist for reuse. `lastVerifiedAt` set on every successful provider confirm.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/projects/[projectId]/research/search` | GET | `q`:string (req), `cursor`:string (opt) | hits plus `nextCursor` plus `providerNotices` | owner | 400 invalid query, 404 no project, 429 capped |
| `/api/projects/[projectId]/research/sources` | POST | `doi`:string (opt), `openAlexId`:string (opt), `payload`:object (opt) | `sourceId` plus `projectSourceId` plus deduped flag | owner | 400 invalid payload or unresolvable, 404 no project, 429 capped |
| `/api/projects/[projectId]/research/sources` | GET | `filter`:string (opt), `tag`:string (opt), `cursor`:string (opt) | library page plus `nextCursor` plus total | owner plus admin read | 404 no project |
| `/api/projects/[projectId]/research/sources/[linkId]` | GET | none | link plus joined source plus provider origin | owner plus admin read | 404 no link |
| `/api/projects/[projectId]/research/sources/[linkId]` | PATCH | `studentNote`:string (opt), `tags`:array (opt), `isPinned`:bool (opt) | updated link | owner | 400 invalid tags, 403 admin write, 404 no link |
| `/api/projects/[projectId]/research/sources/[linkId]` | DELETE | none | ok plus unlink only, citations stay frozen | owner | 403 admin write, 404 no link |
| `/api/projects/[projectId]/sections/[sectionId]/citations` | POST | `sourceId`:string (req) | `citationId` plus `inlineText` plus `formattedText` plus `citationKey` plus reused flag | owner | 400 unknown source or source not linked, 404 no section |
| `/api/projects/[projectId]/sections/[sectionId]/citations/[citationId]` | DELETE | none | ok plus bibliography reorder | owner | 403 admin write, 404 no citation |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Search | merged hit list plus trust badge | OpenAlex response plus Crossref enrich on top 10, merged exact DOI first then title exact then relevance with year desc tiebreak, badge from `verificationState` plus DOI present plus open access flag |
| Search | open access flag plus PDF link | provider payload at search time, persisted to `ResearchSource.isOpenAccess` plus `pdfUrl` only on save |
| Search | next page cursor | opaque cursor encoding both provider cursors, healthy provider cursor only on partial failure |
| Search | provider notices | fixed strings per provider plus timeout plus partial plus miss |
| Search | nearby title hits on DOI miss | OpenAlex title fallback call |
| Save | global `sourceId` | server refetch by ID, upsert on canonical DOI first then OpenAlex ID then title plus year plus first author merge at save, else new `ResearchSource` row, save refused without DOI or OpenAlex ID |
| Save | canonical DOI | lowercased trimmed plus URL prefix stripped |
| Save | note plus tags plus pin | request body stored on `ProjectSource`, tags normalized lowercased trimmed |
| Library read | ordered filtered page plus total | `ProjectSource` plus joined `ResearchSource`, pinned first then newest link with `createdAt` plus `id` tiebreak, text over title plus authors plus venue plus note, total counted after filters |
| Library detail | abstract plus PDF plus origin | joined `ResearchSource` row, origin from `rawMetadata` provider plus `lastVerifiedAt` |
| Insert | style used | `Project.referencingStyle` at insert time with allowed APA 7 plus Harvard Cite Them Right, stored on `Citation.style`, unknown value rejected 400 |
| Insert | inline marker | parenthetical per style, APA 7 up to 20 then et al, Harvard up to 3 then et al, org author by name, missing year as n.d., same author same year a b c ordered by title |
| Insert | formatted reference string | owned pure formatter from `ResearchSource` fields, `Citation.formattedText` is render truth, source caches are speed only rebuilt when missing |
| Insert | citation key | first author plus year plus short title hash, unique per project plus source |
| Render | bibliography order | per section grouped by source, sorted alphabetically by first author then year then title |
| Render | marker placement plus orphan prune | editor JSON holds placement via `anchorId`, section save prunes `Citation` rows with no matching anchor |
| Audit | actor plus action | session user plus named action plus `targetType` plus `targetId` written to `AuditEvent` |

**Key invariants**:
* One `ProjectSource` per project plus source, enforced by the existing unique guard, duplicate save returns 200 with the existing link and deduped true.
* Global `ResearchSource` deduped on canonical DOI first then OpenAlex ID then title plus year plus first author merge at save, provider payloads merged into `rawMetadata` with Crossref preferred on conflict. Save requires DOI or OpenAlex ID.
* Same source plus same style always yields the same formatted string, verified by snapshot tests. `Citation.formattedText` is render truth, source level caches are speed only.
* `sourceId` must already link to the project before insert, else 400, so no cross project cite.
* Same source in one section reuses one reference list entry, later inserts return the existing row with reused true.
* Unsave keeps existing citations frozen with a visible unlinked flag, so no rendered chapter loses text.
* Every save plus unsave plus note edit plus pin plus insert plus citation delete writes an audit row with named action, search reads do not.
* Library plus insert rows are strictly project scoped, global source rows never leak across projects except as shared bibliographic facts.

**Security model**:
* Student must own the project for search plus save plus edit plus insert plus delete, otherwise 404 with no existence leak.
* Admins get read only library plus detail access for support, no save plus no insert plus no curation, admin write receives 403.
* Search plus save carry per user per minute caps at 30 searches and 60 saves with 429 plus retry after seconds. Cache hits count toward the cap.
* Student notes are private to the project owner plus read only admins, never exposed to other students.
* Client payload is hint only, server refetches by ID before storing, so forged records cannot enter the library.
* No regulated data in scope, standard student project privacy applies.

**Configuration required**:
* `RESEARCH_CONTACT_EMAIL`: contact email sent as `mailto` query for OpenAlex and `User-Agent` contact for Crossref.

**Critical test scenarios**:
* Happy path: keyword search to save with note to insert with both styles rendering, verifies **AC-1**, **AC-2**, **AC-4**.
* Failure case: one provider times out after 10s inside 12s budget yet partial list renders with notice, verifies **AC-7**.
* Failure case: unknown DOI shows helpful miss with tips plus OpenAlex title fallback hits, verifies **AC-5**, **AC-8**.
* Failure case: double save returns 200 with existing link and no duplicate row, verifies **AC-2**.
* Failure case: unlinked source insert rejected 400, verifies **AC-4**.
* Auth/permission: non owner receives 404 on search plus save plus insert, admin write receives 403, verifies **AC-6**.

## Build plan

Ordered as a Tracer Bullet (thin live slice through every layer first, then thicken), so search plus save plus insert works end to end before polish.

1. Migration plus formatter core: add `formattedApa` plus `formattedHarvard` plus `lastVerifiedAt` to `ResearchSource` and `style` plus `formattedText` plus `anchorId` to `Citation`, ship owned APA 7 plus Harvard Cite Them Right pure function with snapshot tests for author limits plus org author plus n.d. plus a b c suffix plus missing fields, satisfies **AC-4**, **AC-8**.
2. Thin search thread: GET search route with direct fetch to OpenAlex plus Crossref top 10 enrich, 10s timeout per provider inside 12s overall, DOI detect plus canonical form, opaque merged cursor, partial plus notice on failure, contact email as query plus agent, 5 minute runtime cache plus per user caps, minimal results UI in workspace research tab, satisfies **AC-1**, **AC-5**, **AC-7**.
3. Save plus library thread: POST upsert with server refetch plus DOI first dedupe plus title match fallback plus merge into `rawMetadata`, GET filtered library with text plus tag plus pin sort plus cursor plus total, GET detail by link ID, PATCH note plus tags plus pin, DELETE unlink keeping global row and freezing citations, audit rows for save plus unsave plus update, satisfies **AC-2**, **AC-3**, **AC-6**.
4. Insert plus bibliography thread: POST citation under section only for linked sources with reuse per source per section, citation key per project plus source, Tiptap parenthetical marker via `anchorId` plus alphabetical section reference list, DELETE citation with reorder, orphan prune on section save, audit rows for insert plus delete, satisfies **AC-4**, **AC-6**.
5. Trust plus empty plus guards polish: verification state transitions plus badge UI, helpful DOI miss card with title fallback, skeleton plus guided empty states, owner 404 plus admin read only plus 403 plus 429 paths, satisfies **AC-5**, **AC-6**, **AC-7**, **AC-8**.

## Consequences

**Positive**:
* Students cite only verified records with a visible trust signal, raising report credibility.
* Deterministic owned formatting removes model invention risk from marks bearing pages.
* Zero new runtime dependencies keeps install plus bundle plus ops burden flat.

**Negative / tradeoffs**:
* Team owns formatter edge cases for names plus dates plus missing fields, with snapshot upkeep on every tweak.
* Merge plus timeout plus partial failure logic adds app code that must be tested against flaky providers.
* Five minute server cache means very fresh provider edits can lag by the cache window.
* Frozen citation text means a later project style change leaves old marks mismatched until the planned reformat follow up ships.

**Neutral**:
* Upload plus PDF text pull stays in the storage feature, this slice links to `pdfUrl` only.
* Template governed styles arrive later, `Project.referencingStyle` with APA 7 plus Harvard Cite Them Right is the version one source of truth.

## Follow-up

* [ ] Decide bibliography placement when export engine lands, per section alphabetical list now versus compiled front matter later.
* [ ] Reformat path when `Project.referencingStyle` changes after inserts, with migration for frozen `formattedText`.
* [ ] Consider BibTeX plus RIS export once library curation is proven in use.
* [ ] Capture formatter conventions in the workspace area context file before build, so editor plus research stay consistent.
