# Verify: administration portal and platform telemetry · spec 0015 · updated 2026-11-14
_Steps derived from spec 0015 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Visit `/admin` as ADMIN → see 6 KPI cards plus mismatch area plus recent audit 20 newest first, each card links into its queue → AC-1
- [ ] Open `/admin` with a date whose confirmed credits differ from allocated credits → see mismatch banner with row ids; within 15 min past day close with late webhook → no false alarm → AC-1, AC-3
- [ ] Visit `/admin/users` → search name and email case insensitive, filter role and active flag and institution, page 20 per page; open detail → full email plus wallet plus last 10 payments plus last 10 tickets; list shows masked `x***@domain` → AC-2
- [ ] Visit `/admin/payments` → filter status and provider and date; open SUCCESSFUL row → see linked `purchase:<id>` ledger entries plus webhook events; POST recheck refreshes via provider → AC-3
- [ ] Visit `/admin/reconcile?date=YYYY-MM-DD` → UTC day totals show confirmed credits plus allocated sum plus zero tolerance diff plus payment ids plus ledger refs; grace suppresses alert ≤15 min past close → AC-3
- [ ] Visit `/admin/ai-usage` → per run feature plus model plus tokens in and out plus cost plus user plus project or No project plus timestamp, page 20; 7 day totals by feature and by model; costs 2 decimals → AC-4
- [ ] Visit `/admin/templates` and drafts from home and nav → existing pages load; home shows unpublished version count plus open draft count as separate lines → AC-5
- [ ] Visit `/admin/tickets` → filter status and priority and assignee; open detail → thread oldest first page 50; assign admin id and null unassign and self assign; close with reason; reopen returns to IN_PROGRESS → AC-6
- [ ] Visit `/admin/audit` → filter action and actor and date, page 20 newest first; perform role change and ticket assign → one audit row each; open detail views → no new rows; signed out request → audit row with null actor and target path → AC-7
- [ ] Signed out visit `/admin/users` → redirect to sign in with next param (page guard keeps forbidden per auth spec; API returns 401 plus audit); student API request → 403 plus audit; ADMIN role change → 403; SUPER_ADMIN → succeeds; self role change → 403 → AC-8
- [ ] Empty each queue → guidance text naming next action; throttle to slow 300ms → skeletons; overview older than 5 min → freshness badge with last computed time; refetch within 60s → cached, error keeps prior value → AC-9
- [ ] Change viewer timezone → dates render local with UTC fallback; payments show XAF grouped with zero decimals; AI cost 2 decimals from stored column → AC-10
## Commands
- [ ] `pnpm prisma db verify` → marker and schema match contract (assigneeId applied) → AC-6
- [ ] `pnpm typecheck` → clean → all
- [ ] `pnpm vitest run app/admin/layout.test.tsx lib/auth-helpers.test.ts` → pass → AC-8
## Acceptance-criteria coverage
- AC-1 covered by home KPIs plus mismatch steps · AC-2 by users steps · AC-3 by payments plus reconcile steps · AC-4 by AI usage steps · AC-5 by templates link steps · AC-6 by tickets steps · AC-7 by audit steps · AC-8 by auth steps · AC-9 by empty plus skeleton plus freshness steps · AC-10 by dates plus money steps
## Value sourcing checks
- Overview KPIs from live User, Payment, AiUsage, SupportTicket, TemplateVersion, TemplateDraft aggregates; vary date window and confirm counts move
- Mismatch diff from confirmed Payment credits vs allocated CreditLedger for the UTC date; vary date across UTC midnight and confirm buckets
- lastComputedAt updates only on success; force overview error and confirm prior value kept
- Masked email from User.email server mapper; try short and invalid emails and confirm `***@invalid` fallback never leaks full address in list payload
- AI cost from providerCostUsd with 2 decimals; confirm UI never recomputes
