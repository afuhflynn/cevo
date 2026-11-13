# Rationale: 0005 student dashboard and project catalog

_Decision record for spec 0005. The build spec lives in `index.md`._

## Context

The dashboard route today is a placeholder with a greeting, a credit line, and two static cards. Scope slice 2 asks for a real student home: active projects, credit balance, recent milestones, and management controls for search, filter, duplicate, and archive. The foundation specs already give this feature everything it stands on: the Project model with status, archive flag, and progress columns (spec 0001), owner guarded session helpers and denial audit logging (spec 0002), and the onboarding flow that routes finished students to this page (spec 0004). The design source is the existing interface, so no new visual direction is needed. The build approach is Tracer Bullet, so the first slice should stand up a thin read path through every layer, then thicken it with actions and polish.

## Options considered

### Option 1: Server rendered list with plain URL params

One server component reads raw search params, queries Prisma directly, and renders the list with no client cache. Pagination is links that reload the page.

**Pros**:
- Fewest moving parts and no new packages.

**Cons**:
- Every keystroke navigation reloads from the server, and filter plus page combinations need hand parsed params that grow brittle.

### Option 2: TanStack Query plus nuqs with server prefetch and pagination

URL state is typed through nuqs parsers, list data flows through cached queries whose first page the server prefetches, and duplicate, archive, and unarchive run as Server Actions (server functions called directly from the interface) with cache invalidation (marking cached data stale so it refetches).

**Pros**:
- Fast first paint plus instant later pages, shareable filtered URLs, and a cache that survives navigation.

**Cons**:
- Two new packages to learn and a cache invalidation contract the build must honor on every mutation.

### Option 3: Client dashboard over GET route handlers

A client page fetches JSON from dedicated GET endpoints and manages all state in memory.

**Pros**:
- Familiar fetch based data flow with no server component data plumbing.

**Cons**:
- Loses shareable URLs unless rebuilt by hand, duplicates the Server Action transport already chosen for mutations, and first paint waits on client fetches.

## Rationale

The placeholder proves the page needs real data, not a new look, so the load bearing choice is the data flow. Option 1 keeps the stack smallest but turns every filter change into a full server round trip and hand parsing once search, status, and page combine. Option 3 rebuilds URL state by hand and splits reads and writes across two transports. Option 2 matches the forces directly: nuqs carries the three way param state with types, the query cache makes paging feel instant for students with many reports, and Server Actions keep mutations on the single transport the project already favors. The cost is real, two packages and an invalidation discipline, and the build plan carries a task that pins versions and the invalidation rule so the cost stays contained.
