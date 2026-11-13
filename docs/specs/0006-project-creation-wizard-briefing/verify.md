# Verify: project creation wizard & conversational briefing · spec 0006 · updated 2026-11-13
_Steps derived from spec 0006 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Visit `/dashboard/new` → start a briefing → land in the wizard at step 3 → AC-1
- [ ] Answer one field thinly → see a follow up and a Needs detail badge (max 2 follow ups per field) → AC-2
- [ ] Try synthesis with a thin field → blocked, names the field → AC-3
- [ ] With all fields sufficient, synthesize → live preview streams, draft saves with model and cost → AC-4
- [ ] Synthesize again, then restore v1 → version count grows, current pointer moves → AC-5
- [ ] Approve with an idempotency key → project plus outline plus chapters exist; approve again with the same key → same project, no duplicate tree → AC-6
- [ ] Note the estimate before synthesis; with balance below it see the top up prompt; fail the provider mid run and confirm the refund → AC-7
- [ ] Check the template suggestion and reason, override it, approve, confirm the locked version → AC-8
- [ ] Open the session as another student → 403 plus an audit row; as admin the GET reads but cannot write → AC-9
- [ ] Leave and resume from `/dashboard/new`; expired sessions show as expired → AC-10
## Commands
- [ ] `pnpm typecheck` → clean → AC-1…AC-10
- [ ] `pnpm build` → all wizard routes present → AC-1
- [ ] Unauthenticated `GET /api/wizard/sessions` → 401; cross owner `GET` → 403 plus `wizard.access.denied` → AC-9
## Acceptance-criteria coverage
- AC-1 … covered by step wizard order step, reserve banner step, build routes step · AC-2 … covered by thin answer step · AC-3 … covered by blocked synthesis step · AC-4 … covered by streaming synthesis step · AC-5 … covered by versions and restore step · AC-6 … covered by approval and idempotency step · AC-7 … covered by estimate, 402, and refund step · AC-8 … covered by template suggestion step · AC-9 … covered by 403 and audit step, commands 401/403 step · AC-10 … covered by resume and expiry step
