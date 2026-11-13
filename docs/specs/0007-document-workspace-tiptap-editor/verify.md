# Verify: document workspace and tiptap editor canvas · spec 0007 · updated 2026-11-13
_Steps derived from spec 0007 acceptance criteria. /verify-release runs these; /test-engineer locks the durable ones._
## UI / manual
- [ ] Open /dashboard/projects/<id>/workspace with seeded chapters → tree lists in template order with one level nesting, first chapter opens, each row shows stored word count → AC-1
- [ ] With empty project → create prompt shows; with tree API failing → retry shows → AC-1
- [ ] Format text: H1 H2 H3 bold italic underline bullets numbered tasks alignment blockquote code code blocks link table undo redo → all work, live word count updates → AC-2
- [ ] Insert citation from toolbar and from bubble menu → bracket chip renders inline, edit or remove on click, free text capped at 500 chars → AC-3
- [ ] Type then pause 800ms → saved indicator shows; go offline → offline queued indicator; reconnect → replay with no loss → AC-4
- [ ] Reload after crash → draft mirror restores latest text; open second tab → refreshes from mirror → AC-5
- [ ] Two tabs save concurrently → second gets conflict banner with Keep mine confirm versus Load theirs → AC-5
- [ ] Rename add delete with subtree count confirm reorder nesting guard completion toggle → all persist and tree reflects result; new chapter titled Untitled chapter at end of level → AC-6
- [ ] Toggle light and dark themes → three rails 280px left 300px right collapsible, fixed toolbar plus bubble menu, correct contrast, keyboard focus visible; narrow viewport hides right rail then left rail → AC-7
- [ ] Select outline entry → canvas scrolls to heading → AC-7
## Commands
- [x] `pnpm typecheck` → clean → AC-2 AC-7
- [x] `pnpm build` → succeeds with tiptap 3.33.1 on React 19 → AC-2 AC-7
- [ ] `GET /api/projects/<id>/workspace/tree` as owner → nested sections; as non owner → 403 plus audit event → AC-1 AC-8
- [ ] `PUT /api/projects/<pid>/sections/<sid>` with stale version → 409 with currentVersion plus updatedAt → AC-5
- [ ] `PATCH` invalid move (own child, two level nesting) → 422 → AC-6
## Acceptance-criteria coverage
- AC-1 covered by tree open plus empty plus retry steps · AC-2 covered by format plus word count steps · AC-3 covered by citation steps · AC-4 covered by autosave plus offline steps · AC-5 covered by mirror plus conflict steps · AC-6 covered by tree ops steps · AC-7 covered by theme plus rails plus outline steps · AC-8 covered by 403 audit step ·
