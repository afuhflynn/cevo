# Verify: AI assistant with diff previews · spec 0008 · updated 2026-11-14
_Steps derived from spec 0008 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Open a chapter, pick tone revision, estimate, confirm, stream to done, accept one paragraph → canvas updates with new version → AC-1, AC-4, AC-6
- [ ] Select text in the canvas, estimate → panel names scope Selected text; clear selection, estimate → Whole chapter → AC-2
- [ ] Paste input over 12000 chars, estimate → 422 with split guidance and no hold placed → AC-2, AC-3
- [ ] Confirm a run → panel shows credits from OperationPricing before streaming starts → AC-3
- [ ] Drain wallet below estimate, confirm → 402 with top up prompt and no hold row → AC-3
- [ ] During streaming, original beside revised renders per paragraph with word highlights; canvas stays unchanged until accept → AC-4
- [ ] Run consistency review → each warning links to its paragraph with a fix draft; accept one, skip another → AC-5
- [ ] Edit the chapter after streaming, then accept → 409 with rebase prompt; reload, rerun, accept → version increments and word count recomputes → AC-6
- [ ] Accept all, then discard a second run → paragraphs resolve, history reflects both → AC-4
- [ ] Open history with 21 runs → newest 20 listed, oldest pruned past 30 days, paging works → AC-7
- [ ] Sign in as a second student, call estimate and accept on the first student's project → 403 plus audit event; admin reads history but accept is denied → AC-8
- [ ] Walk panel states idle, estimating, streaming, review, applied, error, empty history in light and dark themes; skeletons show while loading → AC-9
- [ ] Force provider failure mid stream → partial paragraphs kept, hold released with refund, retry offered → AC-3, AC-9
- [ ] Confirm the AI draft needs review banner is visible and no edit ever lands without an explicit accept → AC-4, AC-10
## Commands
- [ ] `pnpm typecheck` → clean → AC-1…AC-10 (build integrity)
- [ ] `pnpm build` → assistant estimate, runs, stream, accept, discard, prune routes compile → AC-1…AC-10
- [ ] `npx prisma db verify` → contract matches live database with AiAssistRun plus AiSuggestion tables → AC-3, AC-7
- [ ] Retry POST runs with the same `x-idempotency-key` → same run returned, single hold row → value hold idempotency
- [ ] Query `AiUsage` plus `AuditEvent` after a run, accept, and discard → model plus tokens plus cost recorded; actions assistant.run, assistant.accept, assistant.discard present → AC-10
- [ ] Seed only two of three `assistant_*` pricing rows, estimate the third operation → fallback rate used, no crash → value estimate display
## Acceptance-criteria coverage
- AC-1 covered by operation run step · AC-2 covered by scope and cap steps · AC-3 covered by estimate, hold, 402, refund steps · AC-4 covered by diff, accept, discard steps · AC-5 covered by review step · AC-6 covered by rebase and version steps · AC-7 covered by history step · AC-8 covered by permission step · AC-9 covered by states and timeout steps · AC-10 covered by usage, audit, banner steps ·
