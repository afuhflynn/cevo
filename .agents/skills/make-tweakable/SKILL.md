---
name: make-tweakable
description: Add an in-artifact floating Tweaks panel that lets the user adjust colors, fonts, spacing, layout variants live in the preview. Persists via claude-pipe pattern (pending.yaml + apply-tweaks skill).
argument-hint: <html-path> [keys to expose]
allowed-tools: Read Write Edit Glob Grep Bash(mkdir:*) mcp__chrome-devtools__*
---

# Make Tweakable

Inject a floating Tweaks panel into an existing HTML artifact. Panel lives in-artifact (no iframe), uses File System Access API for persistence (with copy-paste fallback).

## Pattern

1. Wrap tweakable defaults in CSS custom properties with `--tweak-` prefix on `:root`
2. Add marker block `<script id="__tweak_schema" type="application/json">{...}</script>` with the defaults
3. Inject floating panel (`<div id="tweaks-panel">`) with controls bound to each key
4. Panel writes updates to `pending.yaml` via File System Access API (asks user to select target file on first use)
5. `Shift+T` toggles panel visibility
6. User invokes `/apply-tweaks <html-path>` or says "save tweaks" — Claude reads `pending.yaml`, edits HTML via `Edit` tool, clears pending

## Phase 1 — Decide keys

If user specified keys (`$ARGUMENTS`), use those. Otherwise infer from the artifact:
- Colors (primaryColor, accentColor, bgColor, textColor)
- Typography (fontFamily, fontSize, lineHeight)
- Spacing (gap, padding)
- Layout variants (dense/comfortable/spacious)
- Dark mode toggle

Keep it tight — 4-7 knobs, not 20.

## Phase 2 — Refactor HTML to use `--tweak-` vars

For each key, find hard-coded values in the HTML and replace with `var(--tweak-keyName)`. Set defaults on `:root`:

```css
:root {
  --tweak-primaryColor: #D97757;
  --tweak-fontSize: 16px;
  --tweak-density: 1;  /* multiplier */
}
```

Add schema block:
```html
<script id="__tweak_schema" type="application/json">
{
  "primaryColor": { "type": "color", "default": "#D97757" },
  "fontSize": { "type": "number", "default": 16, "min": 12, "max": 32, "step": 1, "unit": "px" },
  "density": { "type": "number", "default": 1, "min": 0.75, "max": 1.5, "step": 0.05 },
  "dark": { "type": "boolean", "default": false }
}
</script>
```

## Phase 3 — Inject Tweaks panel

Append before `</body>`:

```html
<script>
(async () => {
  const schemaEl = document.getElementById('__tweak_schema');
  if (!schemaEl) return;
  const schema = JSON.parse(schemaEl.textContent);
  const values = Object.fromEntries(Object.entries(schema).map(([k, v]) => [k, v.default]));

  // Restore from localStorage for in-browser state
  const lsKey = '__tweaks_' + location.pathname;
  try { Object.assign(values, JSON.parse(localStorage.getItem(lsKey) || '{}')); } catch {}

  const panel = document.createElement('div');
  panel.id = 'tweaks-panel';
  panel.hidden = true;
  panel.style.cssText = `
    position: fixed; right: 16px; bottom: 16px; z-index: 99999;
    font: 13px/1.4 ui-sans-serif, system-ui;
    background: #fff; color: #111;
    border: 1px solid #ddd; border-radius: 10px;
    padding: 14px; min-width: 240px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  `;

  const applyValues = () => {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(values)) {
      const meta = schema[k];
      if (meta.type === 'color' || meta.type === 'string') root.style.setProperty('--tweak-' + k, v);
      else if (meta.type === 'number') root.style.setProperty('--tweak-' + k, v + (meta.unit || ''));
      else if (meta.type === 'boolean') root.classList.toggle('tweak-' + k, !!v);
    }
    try { localStorage.setItem(lsKey, JSON.stringify(values)); } catch {}
  };

  const header = document.createElement('div');
  header.style.cssText = 'font-weight:600;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center';
  header.innerHTML = `<span>Tweaks</span><span style="opacity:0.5;font-weight:400;font-size:11px">Shift+T to toggle</span>`;
  panel.appendChild(header);

  for (const [key, meta] of Object.entries(schema)) {
    const row = document.createElement('label');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:12px;margin:8px 0';
    const label = document.createElement('span');
    label.textContent = key;
    label.style.cssText = 'font-family:ui-monospace,Menlo;font-size:11px;opacity:0.7';
    row.appendChild(label);

    let input;
    if (meta.type === 'color') {
      input = document.createElement('input');
      input.type = 'color';
      input.value = values[key];
    } else if (meta.type === 'number') {
      input = document.createElement('input');
      input.type = 'range';
      input.min = meta.min; input.max = meta.max; input.step = meta.step;
      input.value = values[key];
      input.style.width = '100px';
    } else if (meta.type === 'boolean') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!values[key];
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.value = values[key];
    }
    input.addEventListener('input', () => {
      values[key] = meta.type === 'boolean' ? input.checked :
                    meta.type === 'number' ? Number(input.value) : input.value;
      applyValues();
      scheduleWrite();
    });
    row.appendChild(input);
    panel.appendChild(row);
  }

  // Persistence buttons
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:6px;margin-top:10px;padding-top:10px;border-top:1px solid #eee';
  const linkBtn = document.createElement('button');
  linkBtn.textContent = 'Link pending.yaml';
  linkBtn.style.cssText = 'flex:1;padding:6px 8px;font-size:11px;background:#f5f5f5;border:1px solid #ddd;border-radius:4px;cursor:pointer';
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy YAML';
  copyBtn.style.cssText = linkBtn.style.cssText;
  actions.appendChild(linkBtn);
  actions.appendChild(copyBtn);
  panel.appendChild(actions);

  const status = document.createElement('div');
  status.style.cssText = 'margin-top:8px;font-size:10px;color:#888';
  status.textContent = 'Not persisted';
  panel.appendChild(status);

  let fsHandle = null;
  let writeTimer = null;
  const yamlFor = (v) => Object.entries(v).map(([k,val]) => `${k}: ${JSON.stringify(val)}`).join('\n') + '\n';
  const scheduleWrite = () => {
    if (!fsHandle) return;
    clearTimeout(writeTimer);
    writeTimer = setTimeout(async () => {
      try {
        const w = await fsHandle.createWritable();
        await w.write(yamlFor(values));
        await w.close();
        status.textContent = 'Written to pending.yaml @ ' + new Date().toLocaleTimeString();
      } catch (e) {
        status.textContent = 'Write failed: ' + e.message;
      }
    }, 300);
  };

  linkBtn.addEventListener('click', async () => {
    if (!window.showSaveFilePicker) {
      status.textContent = 'File System Access API not available — use Copy YAML instead';
      return;
    }
    try {
      fsHandle = await window.showSaveFilePicker({
        suggestedName: 'pending.yaml',
        types: [{ description: 'YAML', accept: { 'text/yaml': ['.yaml'] } }],
      });
      status.textContent = 'Linked. Writing live.';
      scheduleWrite();
    } catch (e) {
      status.textContent = 'Link cancelled';
    }
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(yamlFor(values));
      status.textContent = 'Copied YAML to clipboard. Paste to Claude and say "apply tweaks"';
    } catch (e) {
      status.textContent = 'Copy failed: ' + e.message;
    }
  });

  document.body.appendChild(panel);
  applyValues();

  window.addEventListener('keydown', (e) => {
    if (e.shiftKey && (e.key === 'T' || e.key === 't')) {
      panel.hidden = !panel.hidden;
    }
  });
})();
</script>
```

## Phase 4 — Session state file

```
Bash(mkdir -p artifacts/tweaks/<session-id>/applied)
Write artifacts/tweaks/<session-id>/state.yaml:
  target_html: <path>
  phase: idle
  last_applied_at: null
```

`session-id` = `tweaks-{slug}-{YYYYMMDD}`.

Return to user: "Tweaks enabled. Press Shift+T in the preview to open. Click 'Link pending.yaml' → select `artifacts/tweaks/<session-id>/pending.yaml` — panel now writes live on every change. When happy, say 'apply tweaks' or run `/apply-tweaks <html-path>`."

## Phase 5 — Verify

Run `/serve` (needed if artifact uses external `.jsx` starters), then `/done http://127.0.0.1:4567/<html-path>` → panel appears, Shift+T toggles, no console errors.

**Note on persistence:** File System Access API requires http origin (works on `file://` in Chrome >= 2024 but with caveats). Recommend always serving tweakable artifacts over http.
