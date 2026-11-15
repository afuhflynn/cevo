# 0020. Rationale: dashboard catalog journey polish

## Context

The dashboard path already works. Spec 0005 built stats plus catalog plus search plus filter plus pagination plus card actions plus archived plus milestones plus credit display, with URL state through nuqs (a library that syncs interface state with URL search params) and data caching through TanStack Query (a client data cache with background refetch). Students can find projects and manage them.

What remains is presentation. The scout map shows the gaps plainly. The dashboard shell has a basic loading card, the archived page has only a catalog skeleton, the project detail page is a placeholder card, and the workspace loading view is text only with no shadcn skeleton. Stats plus list plus detail do not yet share one card language, and empty plus error views do not yet guide the next action in every case.

Three sibling journeys set the pattern. Spec 0017 froze the foundation so later journeys share one base. Spec 0018 polished onboarding with zero logic change. Spec 0019 polished auth and moved the app body to Roboto (a clean sans face from Google Fonts, loaded with next/font) to echo the Docs feel while keeping serif for long reading and mono for code. This spec closes the dashboard leg the same way. It remakes screens only, reuses the same queries and guards, and applies per page Firecrawl notes (short style notes gathered from the live web with the Firecrawl read tool) plus frontend skill guidance at build time without shipping links in the spec.

## Options considered

### Option 1: Leave dashboard as built in spec 0005

Keep the current screens exactly as shipped and move on to workspace guardrails.

**Pros**:
* Zero build cost and zero review risk
* Current queries plus guards stay untouched

**Cons**:
* Placeholder detail plus thin loading plus uneven empty views remain the first thing students see after onboarding
* Later journeys inherit no dashboard pattern, so drift risk grows

### Option 2: Replace presentation directly

Remake screens in `app/dashboard` plus `components/dashboard` on the frozen base with zero logic or schema change. This is the chosen path.

**Pros**:
* One reviewable diff that brings stats plus catalog plus archived plus detail into one family
* Zero migration risk since queries plus guards plus URL state stay as today
* Matches the proven shape of specs 0018 plus 0019, so the team repeats a known play

**Cons**:
* Larger presentation diff needs careful review of cache refresh plus dialog wiring
* Mirroring skeletons add markup that must track card layout changes

### Option 3: Rebuild catalog data flow with server filtering plus new tables

Add cover plus pinned fields, move filtering to the server, and rework the catalog reads.

**Pros**:
* Cleaner query shape for very large catalogs

**Cons**:
* Migration plus API churn for a polish goal, with real regression risk to search plus pagination
* Solves a scale need the current 500 row in memory pass has not shown, so cost with no measured gain

## Rationale

Option 2 fits the forces. The problem is look and feel, not data shape, so a presentation remake carries the least risk. Option 1 leaves the placeholder detail in place at the exact moment students decide to trust the app. Option 3 rebuilds a working data flow with no measured need, which repeats the premature optimisation failure mode. The staged answers confirmed the load bearing calls. Keep the four stat cards, keep card grid with pagination, gate actions with dialogs, mirror skeletons per surface, reuse tables with no migration, and keep motion inside the foundation allow list. Auth stays in spec 0019 and the Roboto wiring stays untouched.

## Codebase map (scout read, build time reference)

* `app/dashboard/layout.tsx`: gate with onboarding redirect, wraps in query provider, no skeleton
* `app/dashboard/page.tsx`: shell with stats plus catalog plus milestones through Suspense, basic loading card plus catalog skeleton, no error view
* `app/dashboard/archived/page.tsx`: same pattern for archived only, skeleton only loading
* `app/dashboard/new/page.tsx`: header plus wizard entry, no loading or empty or error
* `app/dashboard/projects/[id]/page.tsx`: placeholder detail card with status plus progress, not found for missing or unowned, no skeleton
* `components/dashboard/dashboard-catalog.tsx`: stats header plus milestones feed plus project card with menu plus toasts plus catalog view with search plus select plus pagination, skeletons plus empty variants plus retry present here
* `lib/dashboard.ts`: page size 12 plus activity limit 10, stats plus catalog plus activity reads with owner scoping
* `lib/search-params.ts`: dashboard plus archived parsers with loaders
* `app/globals.css` plus `app/layout.tsx`: Roboto body plus Source Serif 4 plus JetBrains Mono through next/font, serif used for headings and stat values
* `app/(auth)/layout.tsx`: two pane shell, untouched by this spec
