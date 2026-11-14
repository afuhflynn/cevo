# Verify: pre submission review and academic consistency · spec 0012 · updated 2026-11-14
_Steps derived from spec 0012 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Open a project workspace → Review tab → Run consistency review → four groups appear with counts        → AC-1
- [ ] Template requires sections absent from the draft → each named by title and order        → AC-2
- [ ] Claim paragraph with no nearby citation → flagged with excerpt and reason; orphan mark with no library row → flagged        → AC-3
- [ ] Chapter text drifts from an objective → drift warning names the objective and the chapter        → AC-4
- [ ] Formatting break detectable from stored content → warning names the expected value; margins and fonts → marked skipped, never passed        → AC-5
- [ ] Open a warning → chapter title plus excerpt capped at 500 chars shows; Jump to paragraph moves the workspace to that paragraph; after editing the chapter, the warning shows a stale notice with the saved excerpt        → AC-6
- [ ] With warnings present → export to PDF or DOCX stays allowed        → AC-7
- [ ] Run reviews repeatedly → history lists the last 20 with counts; any run opens with its warning snapshot; runs past 20 are pruned        → AC-8
- [ ] As a non owner open review data → 403 plus audit row; as admin read runs but POST and retry answer 403; unknown project answers 404        → AC-9
- [ ] With the provider down → structural warnings still save and semantic groups show skipped with a retry action; past 10 runs per project per hour → 429 with Retry After        → AC-10
- [ ] Missing section warning carries null sectionId and names the expected title and order        → value sourcing, missing check
- [ ] Drift warning accepted only for an objectiveId from the project brief; unknown model excerpts dropped, never saved        → value sourcing, drift check
- [ ] Counts equal stored warning rows grouped by checkType, warn counted and info shown as guidance        → value sourcing, complete run
- [ ] Run snapshots the locked templateVersionId; with no version locked the run records the matched fallback and names it        → value sourcing, start run
## Commands
- [ ] `pnpm typecheck` → clean        → AC-1
- [ ] `npx prisma db verify` → marker and schema match contract        → AC-8
- [ ] `pnpm test` → only pre-existing sign-in redirect failure remains        → AC-1
## Acceptance-criteria coverage
- AC-1 covered by step four groups · AC-2 covered by step missing sections · AC-3 covered by step uncited claims · AC-4 covered by step drift · AC-5 covered by step formatting · AC-6 covered by step open warning · AC-7 covered by step export allowed · AC-8 covered by step history · AC-9 covered by step ownership · AC-10 covered by step provider and limit
