---
name: register-asset
description: Register a design artifact in design-assets.json, capture a thumbnail, and regenerate assets.html overview grid. Use when an artifact is ready for review, or user says "add to overview", "register", "track this".
argument-hint: <html-path> [--asset "Name"] [--group Type|Colors|Spacing|Components|Brand] [--subtitle "..."] [--status needs-review|approved|changes-requested]
allowed-tools: Read Write Edit Bash(mkdir:*) Bash(node:*) Bash(realpath:*) mcp__chrome-devtools__*
---

# Register Asset

Add an artifact to `design-assets.json` and refresh the visual overview at `assets.html`.

## Argument parsing

From `$ARGUMENTS`:
- Positional 0: html-path (required)
- `--asset "<name>"`: display name (default: derive from filename, Title Cased)
- `--group <X>`: one of Type, Colors, Spacing, Components, Brand (default: Components)
- `--subtitle "<text>"`: short description
- `--status <X>`: needs-review | approved | changes-requested (default: needs-review)
- `--auto`: silent mode called by `/done` — skip thumbnail capture (reuses `.claude/last-preview.png`), don't print confirmation prompts, one-line report only

## Steps

1. **Capture thumbnail:**
   - If `--auto` and `.claude/last-preview.png` exists: `Bash(cp .claude/last-preview.png assets/thumbs/<slug>-<ts>.png)` — reuse
   - Otherwise: `/preview <html-path>` → wait 500ms → `mcp__chrome-devtools__take_screenshot` → save to `assets/thumbs/<slug>-<ts>.png` (`Bash(mkdir -p assets/thumbs)` first)

2. **Read existing `design-assets.json`:**
   - If missing → create with `{"items": []}`

3. **Upsert entry:**
   - Key on (asset, path) pair
   - If exists → update fields + thumbnail + bump `updated_at`
   - If new → append

   Schema:
   ```json
   {
     "items": [
       {
         "asset": "Primary button",
         "path": "artifacts/button.html",
         "group": "Components",
         "status": "approved",
         "subtitle": "Filled variant with hover state",
         "thumbnail": "assets/thumbs/button-20260420T120000Z.png",
         "registered_at": "2026-04-20T12:00:00Z",
         "updated_at": "2026-04-20T12:00:00Z"
       }
     ]
   }
   ```

4. **Write `design-assets.json`** with formatted JSON (2-space indent).

5. **Regenerate `assets.html`:**
   - `Bash(node scripts/make-assets-index.mjs)` — see script below
   - If user didn't run `/doctor` and node is missing, fall back to inline generation via `Write` tool with HTML template

6. **Report:** "Registered `<asset>` in `<group>`. View at `assets.html`."

## assets.html layout

Sections by group. Each card shows:
- Thumbnail (clickable → opens source HTML in new tab)
- Asset name (bold)
- Subtitle (muted)
- Status badge (color-coded: green=approved, amber=needs-review, red=changes-requested)
- Updated date
- Mini-menu: approve, request-changes, unregister

The HTML is static — no server. Status changes happen via Claude (user says "approve the button asset" → Claude re-runs `/register-asset ... --status approved`).
