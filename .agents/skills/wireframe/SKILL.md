---
name: wireframe
description: Explore 3+ design variations in low-fi/greyscale on a labeled canvas for comparison. Use when user asks for wireframes, lo-fi, ideas, variants, sketches, many options.
argument-hint: <what to wireframe>
allowed-tools: Read Write Edit Bash(cp:*) Bash(open:*) Bash(mkdir:*) mcp__chrome-devtools__*
---

# Wireframe

Low-fidelity exploration with ≥3 variations along different axes. Uses design_canvas.jsx for side-by-side presentation.

## Phase 0 — Context pre-flight (auto-detect, ONE question max)

Before exploring variations, silently check for context:
1. `Read .claude/design-tokens.json` if exists (but wireframes are greyscale — use only for layout hints)
2. `Bash(ls ~/.claude/design-systems/ 2>/dev/null)` — brand folder match
3. `Glob` codebase tokens at project root
4. Scan brief for github / Figma / image / `.md` attachments → dispatch ingestion skills

If nothing — ONE `AskUserQuestion`: design system / codebase / screenshot / Figma / none / decide. Report "Using <context>. Proceeding." — then proceed greyscale regardless (wireframes are pre-color).

## Rules

- **No color** — greyscale only (grays + single accent if needed)
- **Placeholders everywhere** for imagery, icons, labels — a placeholder is better than a bad attempt
- **Varying axes** — layout, interaction metaphor, visual treatment, density, hierarchy
- **Mix conservative and novel** — one "by-the-book", one exploring new territory

## Build

1. `artifacts/<slug>-wireframes.html` with React + Babel + `design_canvas.jsx`
2. `Bash(cp starters/design_canvas.jsx "$(dirname <html>)/")` — copy next to the HTML file
3. Shell:
   ```html
   <DesignCanvas columns={3} label="Options for {{thing}}">
     <DesignCanvas.Cell label="Option A — classic">...</DesignCanvas.Cell>
     <DesignCanvas.Cell label="Option B — dense">...</DesignCanvas.Cell>
     <DesignCanvas.Cell label="Option C — novel">...</DesignCanvas.Cell>
   </DesignCanvas>
   ```
4. Use dashed borders (`border: 1px dashed #999`) and greybox for placeholder content. Block letters or `[Image]` labels, not actual SVG.

## Verify + next steps

- Run `/serve` (needed because design_canvas.jsx is external), then `/done http://127.0.0.1:4567/artifacts/<slug>-wireframes.html`
- Fix → `Skill: verify-artifact` silently
- Ask user which direction(s) to develop → invoke `/interactive-prototype` on chosen option
