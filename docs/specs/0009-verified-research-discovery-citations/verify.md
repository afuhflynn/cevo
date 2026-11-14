# Verify: Verified research discovery and citations · spec 0009 · updated 2026-11-14
_Steps derived from spec 0009 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Open a project workspace, switch to the Research tab, search `machine learning` → merged hits show title plus authors plus year plus venue plus DOI state plus open access badge plus provider origin → AC-1
- [ ] Search a bogus DOI such as `10.9999/does-not-exist` → helpful miss card with typo tips plus nearby title fallback hits → AC-5, AC-8
- [ ] Save a hit with a note → 201 plus library row shows the note; save the same hit again → 200 with deduped true and no duplicate row → AC-2
- [ ] In the library, type a text filter, then a tag filter, pin one item → pinned first, newest link first, filtered total updates, cursor pages → AC-3
- [ ] Expand a library item Detail → abstract plus PDF link plus provider origin plus last fetch date → AC-3
- [ ] With a chapter open, Insert citation on a library item → parenthetical marker lands in the chapter and the chapter reference list shows the formatted reference; insert the same source again → reused true, still one reference entry → AC-4
- [ ] Set the project `referencingStyle` to HARVARD and insert a 4-author source → marker reads `(First et al., year)`; APA 7 with 20 authors lists all 20, 21 plus renders et al; a sourceless year renders n.d.; two same-author same-year sources render a and b ordered by title → AC-4
- [ ] As a non owner, open the search and save URLs → 404 with no project detail; as an admin, open the library → read only view, and POST a save → 403 → AC-6
- [ ] Attempt to save a title-only result with no DOI or OpenAlex ID → 400 unresolvable with guidance → AC-2
- [ ] POST an insert for a source not linked to the project → 400 unknown source → AC-4
- [ ] Remove a library item that a chapter cites → chapter text keeps the frozen citation → AC-6
- [ ] Delete a citation, then remove its marker from the chapter and save → orphan row pruned, bibliography reorders alphabetically → AC-4, AC-6
## Commands
- [ ] `pnpm vitest run lib/research.test.ts` → 8 passed, formatter snapshots byte exact → AC-4, AC-8
- [ ] `pnpm typecheck` → clean → AC-4
- [ ] `pnpm prisma db verify` → database marker and schema match contract → AC-8
- [ ] `pnpm build` → all five research and citation routes compile → AC-1, AC-2, AC-4
## Acceptance-criteria coverage
- AC-1 covered by search UI step plus build routes step · AC-2 covered by save plus dedupe plus title-only steps · AC-3 covered by filter plus detail steps · AC-4 covered by insert plus style plus orphan steps · AC-5 covered by miss plus debounce plus skeleton behavior · AC-6 covered by non-owner plus admin plus unsave steps · AC-7 covered by partial failure notice behavior (one provider slow or down) · AC-8 covered by formatter tests plus verification badges
