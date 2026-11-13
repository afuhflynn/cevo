# 0005. Student dashboard and project catalog

**Date**: 2026-11-13
**Status**: In Progress

## Summary

This spec designs the student home as a stats header, a searchable project catalog, and a milestones feed, plus a separate archived projects page. Students see real counts, balances, and activity, and they can open, duplicate, archive, and restore projects from per card menus. Search, filter, and pagination state lives in the URL (managed with nuqs, a library that syncs interface state with URL search params) while project data is fetched and cached with TanStack Query (a client data cache with background refetch), prefetched on the server for a fast first paint. No database change is needed because every column already exists.

## Requirements

**User stories**:
- As a student, I want a home that shows my projects, credits, and recent activity so that I know where my work stands.
- As a student, I want to search, filter, and page through my projects so that I can find any report fast.
- As a student, I want to duplicate, archive, and restore projects so that I can reuse structures and tidy finished work.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: The header shows real per student signals: project counts by status, credit balance, recent activity items, and overall progress.
- **AC-2**: Students can search projects by title and programme and filter by status, with the state reflected in shareable URL params.
- **AC-3**: The catalog paginates at twelve projects per page with cached queries and a server prefetched first page.
- **AC-4**: Each project card links directly to its workspace.
- **AC-5**: Duplicating a project creates a deep copy titled Copy of X with progress reset, and the student stays on the dashboard with a confirm toast.
- **AC-6**: Archiving sets only the archive flag; archived projects live on their own page with search and restore; unarchive brings back the prior status exactly.
- **AC-7**: No dashboard control permanently deletes a project.
- **AC-8**: Students see and change only their own projects; cross owner attempts are denied and logged as audit events.
- **AC-9**: Loading states use Skeleton placeholders; an empty catalog shows the creation entry; empty search shows a clear filters prompt; failed mutations toast and roll back.
- **AC-10**: The credit balance is display only; buying credits arrives with the later payments slice.

## Decision

**Chosen option**: Option 2: TanStack Query plus nuqs with server prefetch and pagination.

A cached query layer with typed URL state fits a management surface students will page and filter daily, and prefetch keeps the first paint server fast. Reads run through a GET route handler so the query cache has an idiomatic fetch target; mutations stay Server Actions on the single write transport the project already favors.

## Feature design

**Data model sketch** (no migration, all columns exist per spec 0001):

| Entity | Key fields used | Relation to the feature |
|---|---|---|
| Project | id, userId, title, programmeName, status, isArchived, progressPercent, submissionDeadline, updatedAt | Catalog rows, status counts, search and filter targets, duplicate source, archive flag |
| ProjectBrief | projectId, isApproved | Approved badge on the card |
| ProjectActivity | projectId, action, description, createdAt | Milestones feed plus rows written by duplicate, archive, and unarchive |
| ProjectTask | projectId, isCompleted | Open versus done task counts on the card |
| CreditWallet | userId, balance | Credit balance signal, read only |

**State transitions**:
- Archive toggle: isArchived false becomes true, status untouched; unarchive reverses it with the prior status intact.
- Duplicate: source row unchanged; a new row starts with the source status, progressPercent 0, isArchived false, and fresh child rows.
- Archived rows never appear in the main catalog or the active counts; the milestones feed covers active projects only.
- The ARCHIVED enum value is unused. Archive sets only the isArchived flag, and filter chips plus status counts exclude the ARCHIVED value entirely.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| GET /api/dashboard/projects | read | search:string (opt), status:enum (opt), page:number, archived:boolean | projects page, totalCount, statusCounts, walletBalance, activities | session owner | none on the list itself, it returns owned rows only |
| duplicateProject (Server Action) | mutate | projectId:string (req) | newProjectId, title | session owner | denied plus audit on foreign id |
| archiveProject (Server Action) | mutate | projectId:string (req) | projectId, isArchived true | session owner | denied plus audit on foreign id |
| unarchiveProject (Server Action) | mutate | projectId:string (req) | projectId, isArchived false | session owner | denied plus audit on foreign id |

Reads run through the query cache with the first page prefetched on the server; the three mutations invalidate the project and activity queries. The catalog sorts by updatedAt descending and the feed by createdAt descending capped at ten items; a page number past the last page resets to page one. Archive and unarchive apply optimistic updates (interface applies instantly, rolls back on failure) with rollback; duplicate waits for the server because it creates rows.

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):

| Action | Value produced / displayed | Source |
|---|---|---|
| Header stats | counts by status | aggregate query over Project scoped to session userId and isArchived false, ignoring any active search or status filter, ARCHIVED value excluded |
| Header stats | credit balance | CreditWallet.balance column for the session userId, display only, 0 when no wallet row exists |
| Header stats | overall progress | whole percent mean of Project.progressPercent over active owned projects, neutral empty display at zero projects |
| Header stats | greeting | existing StudentProfile.firstName line stays as is |
| Milestones feed | recent items | ProjectActivity rows for owned active projects ordered by createdAt descending, capped at ten, each linking its parent project |
| Catalog card | title, programme, status, deadline, progress | Project columns directly, cards link to the planned /dashboard/projects/[id] |
| Catalog card | approved badge | ProjectBrief.isApproved column |
| Catalog card | task counts | count of ProjectTask rows by isCompleted for the project |
| Search and filter | search text, status, page | nuqs parsers in the URL, text debounced about 300ms, case insensitive contains, null programme treated as empty text, page resets to 1 on any search or status change |
| Archived page | archived list plus its search | same query shape with archived true at the /dashboard/archived route, separate restore control |
| Creation entry | new project path | points at the planned /dashboard/new until the wizard slice owns it |
| Duplicate | new title | strip any leading Copy of prefixes from the source title, then add one, so repeated copies never stack |
| Duplicate | new content rows | copies brief, outline, sections, and tasks only; never sources, citations, versions, files, export jobs, or activity |
| Duplicate | new completion state | all completion flags reset: task isCompleted false plus completedAt null, section isCompleted false, brief isApproved false plus approvedAt null; content measures such as wordCount carry over |
| Duplicate | new structure | section parentId values remapped to the new row ids; submissionDeadline cleared to null |
| Mutations | milestone rows | new ProjectActivity rows with actions project.duplicated, project.archived, and project.unarchived, each description naming the affected project title |

**Key invariants**:
- Every project read and mutation filters by session userId; no shared or admin view in this slice.
- Archive never changes status and never deletes rows; no hard delete path exists on this surface.
- A duplicate always resets progressPercent to 0 and isArchived to false, inherits the source status, and copies brief, outline, sections, and tasks. It resets every completion flag, never copies sources, citations, versions, files, export jobs, or activity, remaps section parent ids to the new rows, and clears the submission deadline.
- The balance shown is never mutated here; credit movement belongs to the later payments slice.
- progressPercent is read from its stored column; recomputation belongs to the workspace slices.

**Security model**:
Owner only. All reads and Server Actions resolve the caller through the session helper from spec 0002 and scope by userId at the query layer. A caller passing another owner's projectId is denied and the denial is logged as an AuditEvent with action project.access.denied, targetType Project, and the attempted projectId as targetId. No roles beyond student exist on this surface; the admin portal is a separate slice.

**Configuration required**:
No new environment variables or credentials. New packages to pin at build time: nuqs and @tanstack/react-query.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: student with several projects loads the home and sees true counts, balance, activity, and cards, verifies **AC-1**
- Happy path: search plus status filter plus page two compose through shareable URLs from cache, verifies **AC-2**, **AC-3**
- Happy path: duplicate then archive then restore from the archived page keeps data intact, verifies **AC-5**, **AC-6**
- Failure case: archive mutation fails and the card rolls back with a toast, verifies **AC-9**
- Auth/permission: logged in student requests another owner's projectId and is denied with an audit row, verifies **AC-8**

## Build plan

1. Stand up the thin read thread: GET route handler plus query provider plus prefetched server page rendering stats, catalog page one, and the milestones feed from real rows, satisfies **AC-1**, **AC-4**
2. Add nuqs search plus status filter plus twelve per page pagination with Skeleton loading states, satisfies **AC-2**, **AC-3**, **AC-9**
3. Add per card menu with duplicate and archive Server Actions, optimistic toggles with rollback, activity rows, and toasts, satisfies **AC-5**, **AC-6**, **AC-9**
4. Build the separate archived route with its own search, restore action, and empty state, satisfies **AC-6**, **AC-7**
5. Wire the read only credit display plus the creation entry card pointing at the future wizard route, satisfies **AC-1**, **AC-10**
6. Cover empty catalog, no results with clear filters, and mutation failure toasts, satisfies **AC-9**
7. Enforce owner scoping on every read and mutation with denial audit logging, satisfies **AC-8**

## Consequences

**Positive**:
- Students get a real home with truthful numbers and one place to manage every report.
- Cached paged queries keep the surface fast as project counts grow.
- Typed URL state makes any filtered view shareable and restorable.

**Negative / tradeoffs**:
- Two new packages add learning cost and version upkeep.
- Every future project mutation must invalidate the dashboard queries or the cache shows stale rows.
- The archived page duplicates list plumbing that one list component must serve twice.

**Neutral**:
- The workspace route the cards link to is defined by a later slice, so cards point at its planned path until then.
- No migration ships with this slice; the first schema touching feature will validate the no change assumption.

## Follow-up

- [x] Pin nuqs and TanStack Query versions and record the query invalidation rule where dashboard code lives before implementation begins. (nuqs 2.10.3, @tanstack/react-query 5.107.1; rule in `components/dashboard/query-provider.tsx`)
- [ ] Confirm the workspace route path from the document workspace slice so card links land correctly.
- [ ] The credit purchase entry point stays a placeholder until the credit ledger slice designs checkout.
- [ ] Record dashboard query conventions in the dashboard area context file once the code exists so later slices reuse the cache discipline.
