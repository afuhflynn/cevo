# 0007. Document workspace and Tiptap editor canvas

> Build spec. Decision record lives in rationale.md.

**Date**: 2026-11-13
**Status**: In Progress

## Summary

This spec designs the primary writing surface where students build their academic report chapter by chapter. It pairs a document tree with a rich text canvas and an inspector rail, saving each chapter automatically with a local backup so no work is lost. The canvas reuses the open MIT simple editor from the Tiptap component library, restyled to the project theme tokens so light and dark modes match the rest of the app.

## Requirements

**User stories**:
- As a student, I want to move through my chapters in a tree so that I always know where I am in the report.
- As a student, I want to format text, tables, and links in a calm canvas so that drafting feels like writing, not fighting a tool.
- As a student, I want my work saved automatically with a local safety copy so that a dropped connection never loses a paragraph.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: Given an approved project with provisioned sections, when the student opens the workspace, then the tree shows chapters in template order with one level of nesting, the first chapter opens by default, each tree row shows its stored word count, and selecting a node loads its content into the canvas. Loading shows skeletons, an empty project shows a create prompt, and a failed load shows a retry.
- **AC-2**: Given content loaded in the canvas, when the student formats text, then headings levels 1 to 3, bold, italic, underline, bullet lists, ordered lists, checkable task lists, alignment, blockquote, inline code and code blocks, links through a popover, tables capped at 10 columns by 50 rows, undo, and redo all work, with a live word count visible. Word count uses one shared helper on client and server so the two never disagree.
- **AC-3**: Given the canvas, when the student inserts a citation, then a placeholder marker is stored as a Tiptap mark holding either a source id or free text capped at 500 characters, renders inline as a bracket chip without breaking the document, inserts from the toolbar and the bubble menu, opens edit or remove on click, and remains resolvable by the later research slice.
- **AC-4**: Given edits in the canvas, when the student pauses typing, then the chapter saves automatically 800ms after the last keystroke, the save indicator covers saving, saved, offline, and error with retry, the server recomputes the stored word count, and while offline saves queue in order capped at 50 operations and coalesced per section, then replay on reconnect.
- **AC-5**: Given a crash, a reload, or a version conflict, when the student returns, then the local draft mirror restores their latest text from a per section browser key with a 30 day expiry, a second tab refreshes from it, and a version mismatch shows a restore banner offering Keep mine with a confirm versus Load theirs, so no work is silently lost.
- **AC-6**: Given any chapter, when the student performs tree operations, then rename, add, delete with confirm, reorder, one level nesting, and completion toggle all persist and the tree reflects the result. New chapters are titled Untitled chapter and appended at the end of their level. Titles are required and capped at 200 characters. Deleting a chapter with children names the count in its confirm and removes the whole subtree. Reorder uses buttons plus keyboard with drag deferred. A chapter can never become its own child.
- **AC-7**: Given the workspace in either theme, when the student reads and writes, then layout uses three rails with a slim fixed toolbar plus a floating bubble menu on selection, all styled from the project OKLCH tokens with correct contrast in light and dark, usable by keyboard with visible focus. The left rail is 280px and the right rail is 300px, both collapsible. Below large screens the right rail hides and below medium the left rail becomes a drawer. The toolbar pins under the header. The bubble menu holds bold, italic, link, heading, and cite. Selecting an outline entry scrolls the canvas to that heading.
- **AC-8**: Given a project owned by another student, when a non owner requests its sections, then the API denies the write with 403 and records an audit event.

## Decision

**Chosen option**: Option 1: Copy simple editor source and restyle to theme tokens

The workspace copies the MIT simple editor source into owned components, remaps styling to project tokens, ships tree plus canvas plus inspector with fixed and bubble toolbars, stores Tiptap JSON in the existing section table, and keeps citations as owned placeholder marks that later slices resolve.

## Feature design

**Data model sketch**:
- Reuse `ProjectSection` (no new table): `content` holds the Tiptap document JSON, `wordCount` is recomputed on each save, `version` guards concurrent writes with optimistic checks, `parentId` carries one level of nesting, `orderIndex` carries tree order, `isCompleted` carries the done toggle.
- Reuse `DocumentVersion`: written only on milestones (approval, export, major restore points), not on every keystroke.
- Citation placeholders: Tiptap marks inside `content` JSON with payload `{ sourceId?: string, freeText?: string }`, free text capped at 500 characters, rendered as inline bracket chips; resolved into formatted citations by the later research slice.
- Local mirror: browser localStorage keyed `cevo:draft:{sectionId}`, holding `{ content, version, updatedAt }` with a 30 day expiry; a cache, never the source of truth. A second open tab refreshes from it on focus.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/projects/:projectId/workspace/tree | GET | projectId:path (req) | nested sections: id, title, orderIndex, parentId, isCompleted, wordCount | session, owner or admin read | 403 forbidden, 404 unknown project |
| /api/projects/:projectId/sections/:sectionId | GET | sectionId:path (req) | content JSON, version, wordCount, updatedAt | session, owner or admin read | 403 forbidden, 404 unknown section |
| /api/projects/:projectId/sections/:sectionId | PUT | content:JSON (req), version:number (req) | content JSON, version, wordCount | session, owner only | 403 forbidden, 409 conflict with `{ currentVersion, updatedAt }`, 422 invalid document with `{ errors[] }` |
| /api/projects/:projectId/sections/:sectionId | PATCH | title:string (opt), orderIndex:number (opt), parentId:string or null (opt), isCompleted:boolean (opt) | updated section row | session, owner only | 403 forbidden, 422 invalid move with `{ errors[] }` |
| /api/projects/:projectId/sections | POST | title:string (req), parentId:string (opt) | new section row, orderIndex set to max plus one in its level | session, owner only | 403 forbidden, 422 invalid parent with `{ errors[] }` |
| /api/projects/:projectId/sections/:sectionId | DELETE | sectionId:path (req) | `{ ok:true }`, whole subtree removed | session, owner only | 403 forbidden, 404 unknown section |

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):
| Action | Value produced / displayed | Source |
|---|---|---|
| Tree read | nested chapter list with order and completion | `ProjectSection` rows scoped by `projectId`, ordered by `orderIndex` within each parent level, nested by `parentId` |
| Workspace open | default open chapter | first `ProjectSection` by `orderIndex` at the top level |
| Section create | position of the new chapter | `orderIndex` set to max plus one within its parent level |
| Section read | canvas document plus version | `ProjectSection.content` and `ProjectSection.version` |
| Section save | new version number | server increments `ProjectSection.version` on accepted write |
| Section save | stored word count | server recomputes from saved `content` JSON |
| Save indicator | saving, saved, offline | client editor state plus network state, confirmed by PUT response |
| Local restore | draft text after crash | browser localStorage keyed by section id |
| Conflict banner | notice plus restore choice | 409 response carrying current server version against local version |
| Citation marker | inline marker with reference | editor mark holding `ResearchSource` id or free text string |
| Inspector outline | headings of open chapter | derived from open `content` JSON headings |
| Inspector word count | chapter total | `ProjectSection.wordCount` after save, client live count while typing |
| Tree ops | new order and nesting | PATCH inputs for `orderIndex` and `parentId`, validated server side |

**Key invariants**:
- Every section write is scoped to its owning project; cross project access is denied.
- A PUT with a stale version is rejected with 409 and never overwrites silently.
- The server recomputes word count on every save with the shared helper; the client count is display only.
- `orderIndex` is scoped per parent level; a move renumbers the affected levels without gaps.
- Titles are required and capped at 200 characters; nesting is one level and acyclic.
- Deleting a section removes its whole subtree; milestone snapshots in `DocumentVersion` are never deleted by tree operations.

**Security model**:
Owner only writes; the project owner reads and writes all sections in their project. Administrators get read access for support with no write path in this feature. All other users receive 403. Mutations carry the existing rate limits used by the dashboard and wizard. Section reads and writes emit audit events in the existing `AuditEvent` stream.

**Configuration required**:
- No new environment variables. Image upload stays stubbed with a local placeholder until the storage slice provides a real endpoint.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: open workspace, switch chapters, format text and a table, autosave completes with saved indicator, verifies **AC-1**, **AC-2**, **AC-4**
- Failure case: two tabs save concurrently, second gets 409 plus restore banner with local draft intact, verifies **AC-5**
- Offline case: connection drops, edits queue with offline indicator, replay on reconnect with no loss, verifies **AC-4**, **AC-5**
- Auth/permission: non owner requests a section and receives 403 with an audit event, verifies **AC-8**

## Build plan

Ordered as thin thread first, per the project Tracer Bullet approach: stand up the full path narrowly, then thicken it.

1. Thin thread: workspace route shell with three rails, tree read from existing sections, single section render in a plain canvas, manual save round trip with version check, satisfies **AC-1**, **AC-4** (narrow), **AC-7** (layout narrow)
2. Tiptap integration: copy simple editor source, remap style variables to OKLCH tokens, verify light and dark contrast, fixed toolbar plus bubble menu, pin versions and run React 19 regression pass, satisfies **AC-2**, **AC-7**
3. Tree operations: add, rename, delete with confirm, reorder, one level nesting, completion toggle, all persisted through POST, PATCH, DELETE, satisfies **AC-1**, **AC-6**
4. Autosave plus safety net: debounced save at 800ms, saving and saved and offline and error states with retry, localStorage draft mirror with 30 day expiry, 409 conflict banner with Keep mine confirm and Load theirs, offline queue capped at 50 ops and coalesced per section with ordered replay, server word count recompute with the shared helper, satisfies **AC-4**, **AC-5**
5. Citation placeholders: owned Tiptap mark for source id or free text, insert affordance in toolbar plus bubble, inline render, forward compatible payload for the research slice, satisfies **AC-3**
6. Inspector rail: chapter outline from headings, live and stored word counts, save state, reserved slots where the assistant and research panels will dock, satisfies **AC-7**
7. Guards and audit: owner scoping on every endpoint, admin read path, 403 handling, audit events on section mutation, rate limit parity with existing workspace endpoints, keyboard traversal with visible focus, satisfies **AC-7**, **AC-8**

## Consequences

**Positive**:
- Students get a calm owned writing surface with trustworthy saving from the first release
- Source ownership means citations, assistant actions, and template rules all extend the same editor without rework
- No new storage, services, or environment variables keeps operating cost flat

**Negative / tradeoffs**:
- React 19 plus Next.js 16 runs ahead of the kit docs, so a focused regression pass is mandatory and upgrades need care
- Style remapping is hand work; any token change later needs a matching editor check in both themes
- Image upload stays a stub, so figures wait for the storage slice

**Neutral**:
- The fancier slash menu and AI menu stay deferred; the owned structure accepts them later with no rewrite
- Live collaboration stays deferred per scope; version guard plus local mirror is the conflict story for v1

## Follow-up

- [ ] Verify pinned Tiptap package versions against React 19 and Next.js 16 during build and record the working set in the build notes
- [ ] Confirm the debounce interval and offline replay window with real typing sessions before locking the constants
- [ ] Agree the citation mark payload with the research slice owner so placeholders resolve without migration
- [ ] Point scope feature 8 at this spec and mark it designed
