# Rationale: 0012 pre submission review and academic consistency

Decision record for spec 0012. Build spec lives in `index.md`. Verify steps live in `verify.md`.

## Context

Students build long reports across many chapters in the workspace, with content, citations, and structure evolving over weeks. Near the end they must judge whether the draft is ready to export and submit to their institution. Today that judgment rests on memory and manual rereading, which misses gaps and creates anxiety before export.

The draft already carries rich structure to check against. The project locks a template version at approval with required sections and formatting rules, the brief holds agreed aims plus objectives plus research questions, and the research slice holds saved sources plus citation marks inside chapter text. A reviewer can compare the live chapters to those anchors and name concrete gaps.

The cost of a wrong design here is noise and mistrust. If the scan flags too much, invents issues, or blocks export on weak evidence, students will ignore it. If it runs slowly, costs credits, or loses history across runs, it will feel like a tax instead of a guide. The spec must stay fast, free, advisory, and precise in its links to text.

## Options considered

### Option 1: Deterministic checks only, no AI

Run only structural rules in a server action with no model call. Missing sections come from template comparison, orphans from citation table joins, formatting from rule comparison, claims from keyword lists.

**Pros**:
- Fast, free, and fully predictable with no provider dependency.

**Cons**:
- Cannot judge objective drift or real claim language, so two of the four promised groups stay shallow and students lose the most valuable signal.

### Option 2: Full four checks in a sync action with reuse of OpenRouter

Run structural checks locally plus semantic checks (drift plus claim spotting) through the existing OpenRouter setup in one server action, save the snapshot, and show it in a workspace Review tab.

**Pros**:
- Covers all four groups in one pass with the provider the project already operates.
- Sync flow keeps the build small with no queue, worker, or polling states.

**Cons**:
- Large drafts plus a slow provider can push response times up, so caps, truncation, and a partial save path are required.

### Option 3: Background job with progress polling

Queue each review in a background worker with queued plus running plus done states, poll for progress, and notify on completion.

**Pros**:
- Handles very large drafts without request timeouts and allows richer AI passes.

**Cons**:
- Adds a queue, job states, polling UI, and failure recovery for a scan that fits comfortably in a single request with caps. Operational cost exceeds the gain for v1.

## Rationale

The scope promises four groups, and only Option 2 delivers all four without new infrastructure. Context stresses trust and speed over depth, which maps to a manual trigger, a free run, advisory output, and precise paragraph links. The project already pays the operating cost of OpenRouter in the wizard and assistant slices, so reuse keeps secrets, caps, and audit patterns consistent. A background job can arrive later if drafts grow past the caps, but v1 should ship the thin end to end thread first.
