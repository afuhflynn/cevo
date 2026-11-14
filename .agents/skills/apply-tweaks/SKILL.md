---
name: apply-tweaks
description: Apply buffered tweaks from pending.yaml to the source HTML file. Invoked when user says "save tweaks", "apply tweaks", "persist panel changes", or runs /apply-tweaks.
argument-hint: <html-path>
allowed-tools: Read Write Edit Bash(ls:*) Bash(cat:*) Bash(mkdir:*) Bash(date:*) Bash(mv:*)
---

# Apply Tweaks

Persist queued tweak changes (in `pending.yaml`) back to the source HTML via `Edit`. Pattern from claude-pipe: **files are state, Claude is the writer**.

## Session lookup

`session-id` for `<html-path>` = `tweaks-{slugify(basename html-path without ext)}-{today YYYYMMDD}`.
Session dir: `artifacts/tweaks/<session-id>/`.

If skipping date match (e.g. resume from yesterday), `Bash(ls artifacts/tweaks/)` and find the most recent matching prefix.

## Pipeline

1. **Read session state:**
   ```
   Read artifacts/tweaks/<session-id>/state.yaml
   Read artifacts/tweaks/<session-id>/pending.yaml
   ```
   If `pending.yaml` is missing or empty — report "no pending tweaks" and stop.

2. **Read HTML + schema:**
   - `Read` the target HTML (path from state.yaml or `$0`)
   - Extract the `__tweak_schema` block (JSON inside `<script id="__tweak_schema">`)

3. **Validate each pending key:**
   - Every key in `pending.yaml` must exist in schema
   - Value type must match schema (color = hex, number = in [min..max], boolean)
   - If any key invalid: report which + stop (do not partially apply)

4. **Apply:** for each key → value in pending:
   - **Primary pattern — CSS var on `:root`:** find `--tweak-<key>: <old>;` and `Edit` to new value
   - **Secondary pattern — marker block:** find `<!-- tweak:<key> -->...<!-- /tweak:<key> -->` and `Edit` the content inside
   - If neither marker found → fail loudly (HTML didn't use `/make-tweakable` pattern)

5. **Atomic write via Edit:** each `Edit` is already atomic in Claude Code, so no tmp-rename dance needed.

6. **Append to log:**
   ```
   ts=$(date -u +%Y%m%dT%H%M%SZ)
   Write artifacts/tweaks/<session-id>/applied/$ts.yaml:
     applied_at: $ts
     changes:
       <copy of pending.yaml>
   ```

7. **Clear pending:** `Write artifacts/tweaks/<session-id>/pending.yaml` with empty content (or `{}`)

8. **Update state:**
   ```
   Edit artifacts/tweaks/<session-id>/state.yaml:
     phase: idle → idle (no-op but bump timestamp)
     last_applied_at: <ts>
   ```

9. **Verify:** `/done <html-path>` — confirms file still renders, new values visible in preview.

10. **Report:** "Applied N tweaks. Logged to `artifacts/tweaks/<session-id>/applied/<ts>.yaml`. Pending cleared."

## Revert path

If user says "revert last tweaks":
1. `Bash(ls -t artifacts/tweaks/<session-id>/applied/)` — get most recent
2. `Read` that file — get the delta
3. Reverse each change (find current value in HTML, restore previous)
4. Append a new applied entry with `type: revert` and reference to reverted file
5. `/done`
