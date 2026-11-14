---
name: make-deck
description: Build an HTML slide deck (1920×1080, keyboard nav, exportable) when user asks for a presentation, pitch deck, slides, or keynote. Uses deck_stage.js starter and Claude Design taste rules.
argument-hint: <brief or topic>
allowed-tools: Read Write Edit Glob Grep Bash(cp:*) Bash(open:*) Bash(mkdir:*) Bash(realpath:*) mcp__chrome-devtools__*
---

# Make a Deck

Build an HTML slide deck that looks designed, not AI-generated. Uses `starters/deck_stage.js` for keyboard nav, scaling, speaker notes, and print-to-PDF.

## Phase 0 — Context pre-flight (auto-detect, ONE question max)

Before asking design questions, detect context **silently** via auto-checks. Only ask the user if nothing is found.

### Auto-detect (no user input)
1. `Read .claude/design-tokens.json` — project tokens, if exist → load
2. `Bash(ls ~/.claude/design-systems/ 2>/dev/null)` — org-level registry. If the brief mentions a brand name matching a folder → auto-apply it (e.g. brief "Acme deck" + `~/.claude/design-systems/acme/` → use Acme)
3. `Glob **/tailwind.config.* **/theme.{ts,js,json} **/tokens.{css,scss} **/_variables.*` at project root — if found, note "codebase detected" and `Read` them
4. Scan user message/attachments for:
   - GitHub URL → invoke `Skill: ingest-github` first
   - Figma URL → invoke `Skill: ingest-figma` first
   - Image attachment → invoke `Skill: ingest-screenshot` first
   - `.md` / `.txt` / `.pdf` file attached → `Read` it (may contain brand refs or content)

### One-question fallback (only if nothing detected)
If no context found after auto-detect, use `AskUserQuestion` with **a single question**, text-options:
- **Use existing design system** — list names from `~/.claude/design-systems/` (if any)
- **From codebase** — "paste a local path or github URL"
- **From screenshot** — "attach an image"
- **From Figma** — "paste a figma URL (needs FIGMA_TOKEN)"
- **No context** — invoke `Skill: frontend-design` for aesthetic-from-scratch
- **Decide for me** — Claude picks frontend-design

Report what was found/chosen in one line: "Using <context>. Proceeding…"

## Phase 1 — Ambiguity gate

Check the user's brief (`$ARGUMENTS`) for these signals:
- **Audience** — "for X", "for investors", "team", "stakeholders", etc.
- **Style** — named aesthetic ("New Yorker", "WSJ", "minimal", "bold", "Apple-like") or brand reference
- **Length** — "N slides", "short", "quick"

If **≥2 of 3 present** → skip long questionnaire, proceed with max 1-2 clarifying questions.

If **<2 present** → invoke `AskUserQuestion` with:
- Audience (who's watching, emotional state, technical level)
- Tone (formal/casual, funny/serious)
- Length (slide count)
- Visuals (minimal/rich, photos/illustrations/charts)
- Variations (do they want 2-3 deck options or just one)

Ask at least 4 relevant questions even in gate-passed mode if anything is still unclear. **Do not** ask about brand context — Phase 0 already handled it.

## Phase 1.5 — Speaker-notes heuristic (agent decides, no toggle)

Instead of asking user "use speaker notes?", decide from signals:

| Signal in brief | → speaker notes |
|---|---|
| "quick", "standup", "lightning", "recap", <100 chars | **off** — self-sufficient slides, no notes |
| "for investors", "Board meeting", "keynote", "All Hands" | **on** — sparse slides, notes carry narrative |
| Attached PRD / long doc (>500 words) | **on** — slides distill, notes script |
| Only 1-3 slides requested | **off** |
| 10+ slides requested | **on** (probably a story arc) |
| Ambiguous / none of above | ask a single yes/no question |

If on: generate `<script type="application/json" id="speaker-notes">[...]</script>` at the end of `<body>` with one string per slide — full conversational narrative, not bullet-point summary. Keep slides visual-heavy.

If off: skip notes entirely; slides must stand alone.

## Phase 2 — Visual system

Using context gathered in Phase 0, commit to a visual system up front:
- Section-header layout, title layout, image layout
- Max 1-2 background colors across the deck
- Font hierarchy (display / H1 / body / caption)
- Palette (pull from loaded tokens, or generated via `Skill: frontend-design`)

Vocalize the system in one paragraph before writing slides.

## Phase 3 — Build

1. Create `artifacts/<slug>.html` with shell:
   ```html
   <!doctype html>
   <html lang="en">
   <head>
     <meta charset="utf-8"/>
     <title>{{deck title}}</title>
     <script src="./deck_stage.js"></script>
     <style>/* your tokens + slide styles */</style>
   </head>
   <body>
     <deck-stage width="1920" height="1080">
       <section><!-- slide 1 --></section>
       ...
     </deck-stage>
   </body>
   </html>
   ```
2. `Bash(cp starters/deck_stage.js "$(dirname <html>)/")` — copy starter into the **same dir as the HTML** (important for nested paths like `artifacts/foo/deck.html`)
3. Write all slides in one pass. Rules:
   - NO title-only slide as slide 1 (jump into content)
   - Text ≥ 24px on 1920×1080
   - `text-wrap: pretty`
   - Use CSS Grid for layouts
   - No gradients, no emoji, no Inter/Roboto/Arial — pick character fonts
   - No SVG-drawn imagery — placeholder divs with labels instead
   - Vary layout rhythm across slides (not all same template)
4. Speaker notes: follow Phase 1.5 decision — don't ask again.

### 3.1 Vertical budget — compute before you write (!)

`<deck-stage>` sections have `overflow: hidden` — overflow is visually **silent**, content just disappears. You must budget vertically up front.

Typical chrome layout on each slide consumes ~430px of the 1080 canvas:

| Item | Reserved |
|---|---|
| Section padding top | 96px |
| Chrome row (abs, but visual weight) | 24px |
| Kicker margin-top + kicker | 44 + 22 = 66px |
| `h2.section-title` (font-size 80–96px × 2 lines) | ~200px |
| h2 margin-bottom | 36px |
| Content grid margin-top | 16px |
| Section padding bottom | 96px |
| **Total reserved** | **~430px** |

**Content budget: 1080 − 430 = ~650px.** Any primary card, row, or media container in the content area must fit inside this.

Hard caps to keep you honest:
- Primary card `min-height`: **≤ 500px**
- Post-mock / deep-content column `min-height`: **≤ 620px**
- Max 5 anatomy rows at ~110px each, or 4 at ~130px each
- Short h2 (1 line, ≤ 60 chars) → 140px budget frees up; long h2 (2 lines) → use 200px
- If you need taller content, drop the kicker or merge kicker+h2 on one line — don't let cards grow

If a slide feels too busy — split it or cut content. Overflow is a design smell, not a typography problem.

### 3.2 Russian / long-word hyphenation

Set `hyphens: manual; -webkit-hyphens: manual;` on `<section>` to prevent browsers from inserting soft-hyphens mid-word (breaks long Russian words across lines in narrow columns).

## Phase 4 — Verify

1. `/done artifacts/<slug>.html` — opens in browser, checks console, saves screenshot
2. Fix any errors; re-run until clean
3. **Mandatory programmatic overflow audit** (blocks end-of-turn if any slide overflows or is too tight):

   ```js
   // Paste into mcp__chrome-devtools__evaluate_script
   async () => {
     const stage = document.querySelector('deck-stage');
     if (!stage) return { skipped: 'no deck-stage' };
     // Decoratives we deliberately ignore (bleed past section bounds by design):
     // glow halos, hero backdrops, chrome overlays, anything flagged data-decorative.
     const DECORATIVE = '.glow, .glow-2, .hero-glow, .chrome, [data-decorative], [aria-hidden="true"].backdrop';
     const isDecorative = (el) => {
       if (el.matches(DECORATIVE) || el.closest(DECORATIVE)) return true;
       const cs = getComputedStyle(el);
       // pointer-events:none + no text + low opacity → visual decoration, skip
       if (cs.pointerEvents === 'none' && !el.textContent?.trim() && parseFloat(cs.opacity) < 1) return true;
       return false;
     };
     const out = [];
     for (let i = 0; i < stage.totalSlides; i++) {
       stage.goToSlide(i);
       await new Promise(r => setTimeout(r, 80));
       const s = stage.querySelectorAll('section')[i];
       const sRect = s.getBoundingClientRect();
       const scale = 1080 / sRect.height;
       // Measure ALL elements (including position:absolute like .arrow-between, .save-cta,
       // .footer-row that ARE meaningful content) — only decoratives are skipped.
       let maxBottom = 0, culprit = null;
       for (const el of s.querySelectorAll('*')) {
         if (isDecorative(el)) continue;
         const cs = getComputedStyle(el);
         if (cs.display === 'none' || cs.visibility === 'hidden') continue;
         const r = el.getBoundingClientRect();
         if (r.height === 0 && r.width === 0) continue;
         const b = (r.bottom - sRect.top) * scale;
         if (b > maxBottom) { maxBottom = b; culprit = el.className?.toString?.().slice(0, 40) || el.tagName; }
       }
       const contentBottom = Math.round(maxBottom);
       const overflow = contentBottom - 1080;
       const headroom = 1080 - contentBottom;
       const status = overflow > 0 ? 'FAIL' : headroom < 40 ? 'WARN' : 'OK';
       out.push({ slide: i + 1, contentBottom, overflow, headroom, status, culprit });
     }
     stage.goToSlide(0);
     return out;
   }
   ```

   - `FAIL` (`overflow > 0`) — content clipped. **Do not claim done.** Shrink cards / fonts / padding, then re-run.
   - `WARN` (`headroom < 40px`) — visually too close to the edge (any small font-metric variance clips). Aim for ≥ 60px headroom.
   - `OK` — ship.

   Common fixes: reduce `min-height` on cards, shrink headline font, drop a row, merge kicker+title, tighten vertical gaps.

   > **If the browser shows an overflow that this script says doesn't exist**, hard-reload with cache-bust: `mcp__chrome-devtools__navigate_page({ type: "reload", ignoreCache: true })`. Most such disagreements come from a cached CSS state prior to your latest `Edit`.

4. Invoke `Skill: verify-artifact` silently in background (vision check on layout — it handles per-slide screenshots automatically when it detects `<deck-stage>`)
5. Reference `.claude/last-preview.png` in end-of-turn summary

## Phase 5 — Offer next steps

- `/export-pptx artifacts/<slug>.html` — native PPTX via screenshots
- `/export-pdf artifacts/<slug>.html` — PDF
- `/export-standalone artifacts/<slug>.html <dist>.html` — single-file offline HTML
- `/register-asset artifacts/<slug>.html` — add to `assets.html` overview
- Speaker notes mode → add `<script type="application/json" id="speaker-notes">[...]</script>`
- Tweakable mode → `/make-tweakable artifacts/<slug>.html`

## Anti-patterns — hard prohibited

- Title slide first
- Filler content
- AI-slop card patterns (rounded + left border accent)
- Generic gradient backgrounds
- Inventing numbers/stats
- Inventing colors (use `oklch()` to harmonize with existing palette)
