# Verify: institutional template engine and rule extraction · spec 0011 · updated 2026-11-14
_Steps derived from spec 0011 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Visit `/admin/templates` as admin → create template with title plus qualification → draft v1 appears → AC-1
- [ ] Open template detail → edit sections (one title per line) → publish blocked until rules plus 1 section exist → AC-3
- [ ] Paste guideline text → Extract to draft → open `/admin/templates/drafts` → review rules plus sections → Apply to version → AC-2
- [ ] Publish version → second publish returns 409, edits to published version return 409 → AC-3, AC-7
- [ ] Archive template via detail → leaves matching, locked owners keep read access, reactivation works → AC-8
- [ ] Empty list shows empty state, loading shows skeletons, failed fetch shows retry, both themes read clean → AC-1, AC-2, AC-6, AC-8
## Commands
- [ ] `pnpm typecheck` → clean → AC-1, AC-3
- [ ] `pnpm build` → admin plus api template routes present → AC-1, AC-2
- [ ] `pnpm exec tsx --env-file=.env scripts/seed-platform-template.ts` → platform default version id → AC-4
- [ ] `GET /api/templates/match` unauthenticated → 401 → AC-6
- [ ] `POST /api/admin/templates` as student → 403 plus AuditEvent row → AC-6
- [ ] `GET /api/templates/versions/:id` for unrelated version as student → 403 plus audit → AC-6
- [ ] `POST /api/admin/templates/extract` with pastedText over 500000 chars → 422 → AC-2
- [ ] `POST /api/admin/templates/extract` with fileId over 15 MB → 422 → AC-2
## Acceptance-criteria coverage
- AC-1 covered by create template plus version 1 plus list step
- AC-2 covered by extract plus blank fallback plus caps steps
- AC-3 covered by publish guards plus immutable plus apply validation steps
- AC-4 covered by match scoring plus tie break plus platform default fallback steps
- AC-5 covered by approval lock revalidation plus chapter copy steps
- AC-6 covered by 401 plus 403 plus audit steps
- AC-7 covered by concurrent publish plus version unique steps
- AC-8 covered by scope edit plus archive plus pagination plus q search steps
## Value sourcing checks
- Create template → templateId plus draft v1 from DB columns, version 1
- Extract → proposed rules from model Output.object validated by zod
- Extract failure → blank TemplateDraft row status open
- Apply draft → new version from payload plus max plus 1
- Publish → publishedAt from server clock, guards from version rows
- Match → templateId plus versionId from shared matcher over AcademicProfile plus Programme qualification
- Match no winner → PLATFORM_DEFAULT_TEMPLATE_VERSION_ID or implicit platform template
- Reason text names matched scope
- Approval lock → templateVersionId on Project plus ProjectSection copy, revalidated or rematched
- Audit rows → actor plus action plus target, actions template.publish template.apply template.extract template.archive
