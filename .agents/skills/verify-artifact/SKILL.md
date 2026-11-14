---
name: verify-artifact
description: Screenshot + console sweep + visual inspection of an artifact for layout/color/typography regressions. Silent on pass, reports only on issues. Use after /done reports clean and before end-of-turn.
argument-hint: <html-path-or-url>
allowed-tools: mcp__chrome-devtools__take_screenshot mcp__chrome-devtools__list_console_messages mcp__chrome-devtools__evaluate_script mcp__chrome-devtools__navigate_page Read Bash(date:*)
---

# Verify Artifact

Deeper check than `/done` — uses vision on the actual rendering and flags visual problems, not just console errors.

## Pipeline

1. **Ensure preview is live:** if `$0` isn't already open in Chrome DevTools MCP, navigate there first via `/preview $0`.

2. **Deck-aware pre-check (if `<deck-stage>` present).** Decks have `overflow: hidden` on sections — vertical overflow is visually silent, so vision alone will miss it. Before screenshot, also **hard-reload with cache-bust** to make sure the browser is rendering the current on-disk CSS, not a cached state from before the last edit:

   ```js
   mcp__chrome-devtools__navigate_page({ type: "reload", ignoreCache: true })
   ```

   Then run the programmatic audit:

   ```js
   // mcp__chrome-devtools__evaluate_script
   async () => {
     const stage = document.querySelector('deck-stage');
     if (!stage) return { isDeck: false };
     const DECORATIVE = '.glow, .glow-2, .hero-glow, .chrome, [data-decorative], [aria-hidden="true"].backdrop';
     const isDecorative = (el) => {
       if (el.matches(DECORATIVE) || el.closest(DECORATIVE)) return true;
       const cs = getComputedStyle(el);
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
     return { isDeck: true, slides: out };
   }
   ```

   Severity:
   - `FAIL` (`overflow > 0`) — **P0**. Content silently clipped. Report list of slides + culprit class; skip rest of verify, tell Claude to fix.
   - `WARN` (`headroom < 40`) — **P1**. Visually tight against edge (font-metric variance can push over). Report as soft issue.
   - `OK` — proceed.

3. **Take a fresh screenshot** to a timestamped path:
   ```
   ts=$(Bash(date -u +%Y%m%dT%H%M%SZ))
   mcp__chrome-devtools__take_screenshot({ filePath: `.claude/verify-${ts}.png`, fullPage: true })
   ```

   For decks that passed the overflow audit, also sample slides at positions `[0, mid, last]` and save as `.claude/verify-${ts}-slide-${n}.png` — vision-check each rather than just the current viewport.

3. **Read the screenshot with vision:** use the `Read` tool on `.claude/verify-<ts>.png` — Claude is multimodal and will see the image as input.

4. **Grab console:** `mcp__chrome-devtools__list_console_messages` — collect all severities.

5. **Reason over the image + console.** Check against the Claude Design taste rules:
   - **Typography**: text ≥ 24px on 1920×1080 slides, ≥ 12pt on print, ≥ 44px for mobile hit targets, legible hierarchy, no AI-slop fonts (Inter, Roboto, Arial, Fraunces)
   - **Layout**: no overflow/clipping/misalignment, consistent spacing rhythm
   - **Color**: contrast ≥ 4.5:1 on body text, palette from brand/design system, no invented colors
   - **Content**: no Lorem ipsum or TODO markers still visible, no filler
   - **AI-slop tropes**: no aggressive gradients, no rounded-card-with-left-border-accent, no emoji without brand justification, no SVG-drawn imagery (should be placeholders)
   - **Console**: errors, React hydration mismatches, CORS, missing assets

6. **Severity rubric:**
   - **P0** — artifact is broken (crashes, blank page, major overflow)
   - **P1** — looks wrong (contrast failure, typography violation, layout bug)
   - **P2** — could be better (inconsistent spacing, minor color drift)
   - **P3** — nitpick

7. **Silent-on-pass:** if no P0/P1 issues **and** console is clean, respond with a single line: `verify-artifact: OK`.
   - Do NOT print anything else on a clean pass. This is noise otherwise.

8. **Report:** if issues found, list them by severity with screenshot coordinates or element descriptions precise enough for Claude to fix:
   ```
   [P1] Header h1 at top-left is 18px — should be ≥ 32px for slide context
   [P2] Footer contrast 3.2:1 vs 4.5:1 minimum — lighten text or darken bg
   ```

9. **Auto-fix loop** (only if user requested): address each P0/P1, then re-run `verify-artifact`.

## Optional deep-dive

If the user asks for a deep check, run:
- `mcp__chrome-devtools__performance_start_trace` — LCP/CLS/INP
- `mcp__chrome-devtools__lighthouse_audit` — a11y / best-practices / SEO

These are opt-in; default verify is just screenshot + console + vision.

## Alternative: parallel background check

For truly large artifacts (20+ slides) where verify latency matters, consider forking a subagent via the Agent tool (built into Claude Code) to run the visual inspection in parallel while you continue working. Pass the screenshot path + console dump in the prompt. This is optional — most artifacts benefit from inline verification.
