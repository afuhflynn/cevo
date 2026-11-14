---
name: export-pptx
description: Export an HTML deck to PPTX via per-slide screenshots. Requires Node + pptxgenjs + puppeteer (run /doctor first).
argument-hint: <deck.html> [output.pptx]
allowed-tools: Read Write Bash(node:*) Bash(realpath:*) Bash(mkdir:*) Bash(which:*) Bash(stat:*) Bash(ls:*)
---

# Export PPTX

Screenshot-based PPTX export — each `<section>` inside `<deck-stage>` becomes one slide (1920×1080 image + optional speaker notes).

## Preflight

1. `Bash(which node)` — if missing, tell user to install Node 20+
2. Check `package.json` has `pptxgenjs` + `puppeteer` — if not, run:
   ```
   Bash(npm install -D pptxgenjs puppeteer)
   ```
   (or tell user to run `/doctor` first)

## Steps

1. Resolve paths:
   - `$0` = deck HTML (required)
   - `$1` = output (default: basename + `.pptx`)

2. Run the export script:
   ```
   Bash(node scripts/export-pptx.mjs "<input>" "<output>")
   ```

3. Report size + path.

## Script dependencies

`scripts/export-pptx.mjs` must exist. If missing, create it (see template in spec §4.5 or ask user to run `/doctor`).

## What the script does

- Launches headless Chromium (puppeteer)
- Loads the deck HTML at 1920×1080
- Reads `<deck-stage>.totalSlides`
- For each slide: `goToSlide(i)`, set `noscale`, `page.screenshot` at clip 0,0,1920,1080
- Reads `#speaker-notes` JSON (if present) and attaches per-slide notes
- Builds `.pptx` with `pptxgenjs` (16:9 layout, one PNG-background slide each)

## Notes

- Images can be large — 5 MB per slide at 1920×1080 is normal
- For smaller files, pass `--jpeg 0.8` to the script (compress to JPEG at 80% quality)
- Not editable in PowerPoint — each slide is a raster image. For native-editable export, skill not supported in v3.
