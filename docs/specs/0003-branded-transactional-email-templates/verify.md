# Verify: branded transactional email templates · spec 0003 · updated 2026-11-13
_Steps derived from spec 0003 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Sign up in dev with Mailpit running → open http://localhost:8025 → verification mail shows logo header, Cevo wordmark, blue button with the verification URL, 24 hour wording, support/terms/privacy footer → AC-1
- [ ] Request a password reset → reset mail shows the same layout with reset heading and button, 60 minute wording, same footer → AC-2
- [ ] Open each mail's text part in Mailpit → carries the same action link and expiry wording as the HTML → AC-3
- [ ] Preview both mails with images blocked at narrow phone width → heading, button text, fallback link, wordmark, footer stay readable; layout caps at 600px on white → AC-4
## Commands
- [ ] `pnpm vitest run lib/email.test.ts` → 3 passed → AC-1, AC-3
- [ ] `pnpm tsc --noEmit` → clean → AC-5
- [ ] `git diff lib/auth.ts` → only added `text` fields; subjects, URLs, lifetimes, triggers untouched → AC-5
## Acceptance-criteria coverage
- AC-1 covered by manual verification-mail step · AC-2 covered by manual reset-mail step · AC-3 covered by text-part step · AC-4 covered by blocked-images step · AC-5 covered by diff and typecheck steps
