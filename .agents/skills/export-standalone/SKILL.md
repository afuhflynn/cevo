---
name: export-standalone
description: Bundle an HTML artifact into a single self-contained file with all CSS/JS/images inlined as data URLs. Requires `monolith` CLI (brew install monolith).
argument-hint: <input.html> [output.html]
allowed-tools: Read Write Bash(monolith:*) Bash(realpath:*) Bash(mkdir:*) Bash(which:*) Bash(ls:*) Bash(stat:*)
---

# Export Standalone

Produce a single HTML file that works offline (no external dependencies). Uses `monolith` — a Rust CLI that inlines everything.

## Preflight

1. `Bash(which monolith)` — check installed. If missing:
   - Tell user: "`monolith` not found. Install with `brew install monolith` (macOS) and rerun."
   - Stop.

## Steps

1. Resolve paths:
   - `$0` = input HTML (required)
   - `$1` = output HTML (default: `<input>-standalone.html`)
   - `Bash(mkdir -p $(dirname <output>))` if needed

2. Run monolith:
   ```
   Bash(monolith "<input>" --isolate --no-metadata -o "<output>")
   ```
   Flags:
   - `--isolate` — CSP to prevent any remote resource loads after bundling
   - `--no-metadata` — strip `<!-- saved from ... -->` metadata

3. Report:
   - `Bash(stat -f%z "<output>")` or `Bash(ls -la "<output>")` for size
   - "Bundled `<input>` → `<output>` (`<size>` KB). Works offline."

## Tradeoffs

- Pros: single file, drop in email/chat, no CDN dependency, survives archive
- Cons: larger file size (5-10× original), no HMR, fonts often inlined as base64 (bigger)
- Interactivity preserved (React + Babel still run at load time), but network fetches fail by design
