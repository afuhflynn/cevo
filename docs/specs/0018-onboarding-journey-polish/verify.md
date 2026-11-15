# Verify: onboarding journey polish · spec 0018 · updated 2026-11-14
_Steps derived from spec 0018 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Fresh account visits `/onboarding` → start screen shows value props plus 50 credit note plus Start CTA → AC-1
- [ ] Start → step 1 → save → step 2 → save → step 3 → complete → welcome shows credit amount plus Go to dashboard → dashboard → AC-1, AC-5
- [ ] Completed account visits `/onboarding` → lands on `/dashboard` → AC-1
- [ ] Refresh after step 1 (or new login) → resumes at step 2 with step 1 values intact → AC-2
- [ ] University picker: type 2+ chars → 200 ms debounce → results show name plus code plus city → More button appends next page → AC-3
- [ ] Pick university → faculty search filters by it; change university → faculty, department, programme clear → AC-3
- [ ] Suggest missing school inline (2 to 120 chars) → notice names saved value → custom text editable → save step → completion succeeds → AC-4
- [ ] Child under custom parent (e.g. faculty under suggested university) → no list search, suggest field only → AC-4
- [ ] Empty required field → inline field error under control plus step alert with Try again → repeat in dark theme → AC-6
- [ ] Slow search → skeleton rows mirroring list; empty search → empty pattern with suggest action; failed save → alert plus retry → AC-7
- [ ] Toast appears only for transient saves (4 s), spinner only inside submit control → AC-7
- [ ] Progress shows Personal details plus Academic place plus Preferences with position plus Saved indicator; combobox overlay fade plus scale, skeleton pulse only → AC-8
## Commands
- [ ] `npx tsc --noEmit -p tsconfig.json` → clean → AC-3, AC-6
## Acceptance-criteria coverage
- AC-1 … covered by steps 1, 2, 3 · AC-2 … covered by step 4 · AC-3 … covered by steps 5, 6 · AC-4 … covered by steps 7, 8 · AC-5 … covered by steps 2, 11 · AC-6 … covered by step 9 · AC-7 … covered by steps 10, 11 · AC-8 … covered by step 12
