# Verify: file management & private storage · spec 0010 · updated 2026-11-14
_Steps derived from spec 0010 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Workspace Files tab shows guided empty state before first upload → AC-8
- [ ] Upload a PDF: progress climbs, row appears with name, size, category, upload date, extraction status → AC-1, AC-4, AC-8
- [ ] Upload a 26MB file: clear too-large message, no row created → AC-1, AC-8
- [ ] Upload an SVG: clear unsupported-type message, no row created → AC-1, AC-8
- [ ] Preview an image inline, a PDF in viewer, a TXT as text → AC-2
- [ ] Non-owner opening list, preview, delete gets 404 with no bytes leaking → AC-2, AC-6
- [ ] Corrupt PDF keeps its row, shows FAILED with retry action; retry resets to PENDING → AC-3, AC-7
- [ ] Delete a file: row gone, object gone from bucket → AC-7
## Commands
- [ ] `pnpm vitest run lib/files.test.ts` → 10 passed → AC-1, AC-3, AC-4
- [ ] MinIO smoke: request-upload → PUT 200 → complete → HEAD size matches requested → list shows row → preview GET 200 → AC-1, AC-2, AC-4
- [ ] Two parallel completes over quota: one 200, one 409 QUOTA_EXCEEDED → AC-5, AC-7
- [ ] Repeat complete with same clientToken inside 24h returns existing row; token older than 24h gets 400 STALE → AC-5
- [ ] Repeat upload with same non-null checksum in one project returns existing row with deduped flag → AC-5
- [ ] Request upload with stale clientToken gets 400; oversize gets 400; bad mime gets 400 → AC-1, AC-5
- [ ] 21st request-upload in a minute gets 429 with retry-after; 61st preview grant in a minute gets 429 → AC-6
- [ ] `AuditEvent` rows exist for files.request, files.complete, files.delete, and one per preview grant → AC-6
- [ ] `./node_modules/.bin/tsc --noEmit` clean; `./node_modules/.bin/next build` succeeds → build health
## Acceptance-criteria coverage
- AC-1 covered by upload UI steps, oversize/type rejections, smoke script, unit tests
- AC-2 covered by preview UI steps, non-owner 404 step, smoke GET step
- AC-3 covered by corrupt-PDF retry step, extraction unit test, Inngest run check
- AC-4 covered by list UI step, pagination cursor step, quota display step, cursor unit test
- AC-5 covered by parallel-complete, token-window, checksum-dedupe steps
- AC-6 covered by rate-limit steps, audit-row step, non-owner 404 step
- AC-7 covered by parallel-complete, corrupt-PDF, delete steps
- AC-8 covered by empty-state, skeleton, error-retry, per-file-progress UI steps
