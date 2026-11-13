# Verify: student dashboard and project catalog · spec 0005 · updated 2026-11-13
_Steps derived from spec 0005 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Sign in as a finished onboarding student with several projects → header shows true per status counts, credit balance, overall progress, and recent activity → AC-1
- [ ] Type in search, pick a status, flip pages → URL holds `?search=&status=&page=`, results filter, back and forward restore the view → AC-2
- [ ] Page through to the end → twelve cards per page, page past the last resets to page one, later pages feel instant from cache → AC-3
- [ ] Click a project card title → lands on its workspace route → AC-4
- [ ] Duplicate a card → a `Copy of X` card appears, progress reads 0, toast confirms, student stays on the dashboard → AC-5
- [ ] Archive a card → it leaves the main list; open `/dashboard/archived` → it is there with its own search; restore → it returns with its prior status → AC-6
- [ ] Confirm no button anywhere on the dashboard or archived page deletes a project → AC-7
- [ ] Empty catalog → creation entry pointing at `/dashboard/new`; empty search → clear filters prompt; loading → Skeleton cards → AC-9
- [ ] Credit balance has no buy, top up, or checkout control anywhere on the surface → AC-10
## Commands
- [ ] `pnpm typecheck` → clean → AC-1…AC-10 (build integrity)
- [ ] `pnpm build` → dashboard, archived, new, and projects/[id] routes compile → AC-4
- [ ] Live check against local DB: stats mean (40+100)/2=70, search `solar` hits 1 with approved badge and 1 open/1 done task, page 99 resets to 1 → AC-1, AC-2, AC-3
- [ ] `project.access.denied` AuditEvent row written on cross owner projectId attempt; archive sets only `isArchived`, status untouched through restore → AC-8, AC-6
## Acceptance-criteria coverage
- AC-1 covered by steps header stats + live check · AC-2 covered by search/filter URL step + live check · AC-3 covered by paging step + live check · AC-4 covered by card link + build steps · AC-5 covered by duplicate step · AC-6 covered by archive/restore step + audit step · AC-7 covered by no delete step · AC-8 covered by audit step · AC-9 covered by empty/skeleton step · AC-10 covered by display only step
