---
name: ingest-figma
description: Pull design tokens + frame structure from a Figma URL via the Figma REST API. Requires FIGMA_TOKEN env var.
argument-hint: <figma-url>
allowed-tools: Read Write Bash(curl:*) Bash(mkdir:*) Bash(realpath:*)
---

# Ingest Figma

Extract design system from a Figma file using the REST API. Falls back to SVG-import if no token available.

## Preflight

1. `Bash(test -n "$FIGMA_TOKEN" && echo has-token || echo no-token)` — check env var
2. If `no-token`:
   - Tell user: "No `FIGMA_TOKEN` found. Two options: (a) Get a token at https://www.figma.com/developers/api#access-tokens and `export FIGMA_TOKEN=...` in your shell, or (b) export the frame as SVG in Figma (Right-click frame → Copy as → Copy as SVG) and paste the file to `artifacts/ingested/` — I'll parse the SVG."
   - Stop; wait for user response.

## Parse URL

Figma URL format: `https://www.figma.com/(file|design|proto)/<fileKey>/<name>?node-id=<nodeId>`

Extract:
- `fileKey` — alphanumeric after `/file/` or `/design/`
- `nodeId` — query param `node-id` (URL-decoded, often contains `:`)

## Steps (token path)

1. **Fetch file nodes:**
   ```
   Bash(curl -H "X-FIGMA-TOKEN: $FIGMA_TOKEN" \
     "https://api.figma.com/v1/files/<fileKey>/nodes?ids=<nodeId>&depth=2" \
     -o /tmp/figma-<ts>.json)
   ```

2. **Fetch style definitions:**
   ```
   Bash(curl -H "X-FIGMA-TOKEN: $FIGMA_TOKEN" \
     "https://api.figma.com/v1/files/<fileKey>/styles" \
     -o /tmp/figma-styles-<ts>.json)
   ```

3. **Parse JSON:**
   - Colors: walk `document.children` → find `fills` with `type === 'SOLID'` → extract `color {r,g,b}` → convert to hex
   - Effects (shadows): find `effects` with `type === 'DROP_SHADOW'`
   - Text styles: find `style` with `fontFamily`, `fontSize`, `fontWeight`, `lineHeightPx`
   - Components: traverse for `type === 'COMPONENT'` and `type === 'COMPONENT_SET'`
   - Local styles from `/styles`: styles endpoint returns named variables

4. **Write:**
   ```
   artifacts/ingested/figma-<fileKey>-tokens.json
   ```
   Same schema as `ingest-github`, plus `"source": { "figma_url": "...", "file_key": "...", "node_id": "..." }`.

5. **Offer next step:**
   - "Extracted X colors, Y text styles, Z components from Figma. Saved to `artifacts/ingested/figma-<fileKey>-tokens.json`."
   - Continue with `/create-design-system` or start artifact skill.

## Steps (SVG fallback path)

1. User drops SVG file in `artifacts/ingested/`
2. `Read` the SVG content
3. Extract `fill="#..."` / `stroke="#..."` / `style="...color..."` attributes
4. Recognize `<text>` elements for font info (`font-family`, `font-size`, `font-weight`)
5. Build partial tokens.json with `"source": { "svg": "<path>" }` + confidence flags
6. Note: SVG export loses component structure, only visual primitives

## Rate limits

Figma API: 50 req/min for free tier. Fetching one frame + styles = 2 requests, well under limit.

## Security

`FIGMA_TOKEN` in env only — never written to disk or logged.
