# Verify: dashboard catalog journey polish · spec 0020 · updated 2026-11-15
_Steps derived from spec 0020 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Open `/dashboard` as a student with active projects → see four stat cards for active plus credits plus recent activity plus completion with serif values and a Buy credits link → AC-1, AC-7
- [ ] Type in catalog search → list filters by title plus programme name within 200 ms, URL updates, back button restores view → AC-2
- [ ] Change status filter to In progress then clear → page resets to 1, Clear filters appears only when a filter is active → AC-2
- [ ] Page beyond the last page via URL `?page=999` → clamps to page 1 with results → AC-2
- [ ] Open `/dashboard/archived` → archived twin keeps its own search plus page state, status filter hidden, Restore replaces Archive → AC-2
- [ ] On a card open Actions then Duplicate → dialog shows title plus consequence plus Cancel plus Duplicate project, confirm shows toast 4 s and list plus activity refresh → AC-3
- [ ] On a card open Actions then Archive → dialog confirms, success toasts, card leaves active list → AC-3
- [ ] In archived open Actions then Restore → dialog confirms, success toasts with prior status kept → AC-3
- [ ] Cancel a dialog → no write, list unchanged → AC-3
- [ ] Throttle network to slow 3G and reload `/dashboard` → StatsSkeleton mirrors four cards, CatalogSkeleton shows six cards, no blank space → AC-4
- [ ] Open `/dashboard/projects/<id>` cold → DetailSkeleton mirrors header plus progress plus two buttons → AC-4
- [ ] Empty new account dashboard → New project guidance shows Start a project → AC-5
- [ ] Filter to zero matches → No matches view shows Clear filters → AC-5
- [ ] Empty archived → Nothing archived yet shows Back to projects plus Restore hint → AC-5
- [ ] Block `/api/dashboard/projects` to force 500 → alert with Retry appears, Retry refetches → AC-5
- [ ] Open project detail → header shows status plus progress plus updated date plus open and done task counts, Open workspace plus Back to dashboard work → AC-6
- [ ] Open detail for missing id and for another user project → both map to not found → AC-6
- [ ] Milestones feed shows up to 10 rows each with label plus icon plus workspace link → AC-7
- [ ] Credit card shows balance plus Buy credits link to billing, balance at 20 or less shows low note → AC-7
- [ ] Open card menu and dialog in light then dark → overlay fade plus scale only, skeleton shimmer plus pulse only, spinner only inside confirm control, no page choreography → AC-8
- [ ] Search for `BUEA` versus `buea` → same matches, proves case neutral title plus programme match → AC-2
- [ ] Duplicate a project titled near 200 chars → copy is named Copy of title and capped at 200 chars → AC-3
- [ ] Double click dialog confirm while pending → second submit ignored, buttons disabled → AC-3
## Commands
- [ ] `pnpm typecheck` → passes with Inngest 4.26.2 triggers in options plus isDev on client → AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8
- [ ] `pnpm exec biome check components/dashboard/dashboard-catalog.tsx app/dashboard/page.tsx app/dashboard/archived/page.tsx "app/dashboard/projects/[id]/page.tsx" app/dashboard/new/page.tsx` → passes → AC-8
## Acceptance-criteria coverage
- AC-1 covered by stats card step · AC-2 covered by search plus filter plus pagination plus archived plus case steps · AC-3 covered by duplicate plus archive plus restore plus cancel plus title cap plus double submit steps · AC-4 covered by slow 3G skeleton plus detail skeleton steps · AC-5 covered by empty plus filtered plus archived plus error retry steps · AC-6 covered by detail header plus not found steps · AC-7 covered by milestones plus credit card plus low note steps · AC-8 covered by motion plus themes plus lint steps
