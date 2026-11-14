---
name: ingest-github
description: Clone a GitHub repo and extract design tokens (colors, fonts, spacing) from its codebase. Use when user gives a github.com URL and wants a design system or design work rooted in the repo's style.
argument-hint: <github-url>
allowed-tools: Read Write Glob Grep Bash(gh:*) Bash(mkdir:*) Bash(rm:*) Bash(realpath:*) Bash(basename:*)
---

# Ingest GitHub

Pull a repo into a temp location and extract design tokens. No manual `git clone` required for the user — uses `gh` CLI.

## Preflight

1. `Bash(which gh)` — if missing, tell user: `brew install gh && gh auth login`
2. Check `$ARGUMENTS` matches `github.com/owner/repo[/(tree|blob)/ref/path]`

## Steps

1. **Parse URL** into `{owner, repo, ref, subpath}`.
   - Bare repo: `github.com/foo/bar` → `{owner:foo, repo:bar, ref:default, subpath:''}`
   - Tree: `github.com/foo/bar/tree/main/src` → `{owner:foo, repo:bar, ref:main, subpath:'src'}`

2. **Clone shallow** into a temp dir under `/tmp/cd-ingest-<slug>-<timestamp>`:
   ```
   Bash(mkdir -p /tmp/cd-ingest-<slug>)
   Bash(gh repo clone <owner>/<repo> /tmp/cd-ingest-<slug>/<repo> -- --depth 1 --branch <ref>)
   ```

3. **Find token files via Glob** (in clone path):
   - `**/theme.{ts,tsx,js,jsx,json}`
   - `**/tokens.{css,scss,json}`
   - `**/tailwind.config.{js,ts,cjs,mjs}`
   - `**/_variables.{css,scss}`
   - `**/colors.{ts,js,json}`
   - `**/*.tokens.json` (W3C DTCG format)
   - `**/design-tokens.*`
   - `**/palette.*`

4. **Read candidate files** (cap at 20 biggest) and extract:
   - **Colors**: regex `#[0-9a-fA-F]{3,8}`, `rgb\(...\)`, `oklch\(...\)`, `hsl\(...\)` + the var/key they're assigned to
   - **Fonts**: `font-family:` values, named font stacks
   - **Spacing**: numeric scales in Tailwind config, CSS vars with `--space-*` / `--spacing-*` / `--gap-*`
   - **Radii**: CSS vars with `--radius-*` / `--rounded-*`, Tailwind `borderRadius` config

5. **Write structured output:**
   ```
   artifacts/ingested/<repo>-tokens.json
   ```
   Schema:
   ```json
   {
     "source": { "url": "...", "ref": "...", "ingested_at": "2026-04-20T..." },
     "colors": { "primary": "#...", "accent": "#...", "bg": "#...", "text": "#...", "semantic": {...}, "all": {...} },
     "fonts": { "display": "...", "body": "...", "mono": "...", "stacks": [...] },
     "spacing": [...],
     "radii": { "sm": 4, "md": 8, "lg": 16 },
     "shadows": [...],
     "components": { "Button": { "found_at": "src/.../Button.tsx" }, ... }
   }
   ```

6. **Summarize to user:**
   - "Found N colors, M fonts, spacing scale [...], K radii. Saved to `artifacts/ingested/<repo>-tokens.json`."
   - Offer: `/create-design-system` to turn into visual style guide, or start `/make-deck` / `/interactive-prototype` with these tokens pre-loaded.

7. **Cleanup:** optionally `Bash(rm -rf /tmp/cd-ingest-<slug>)` — or keep for further exploration.

## Failure modes

- No `gh` → clear error + install instruction
- Repo private + no auth → `gh auth login` prompt
- No tokens found → report "repo has no clear design tokens; suggest manual `AskUserQuestion` fallback or try a specific subpath"
- Huge repo (>500MB) → warn user, offer `--subpath` to narrow
