# 0008 rationale. AI assistant with diff previews

## Context

The workspace from spec 0007 gives students a calm canvas with a tree, guarded autosave, and local backup. The wizard from spec 0006 proved the credit pattern: estimate shown before the run, hold at confirm, debit on actual usage, refund on failure. What remains open in Slice 5 is the in workspace copilot. Students draft long chapters and need help with tone, polishing, and consistency, but academic work cannot tolerate silent text replacement. Every AI change must be previewed and chosen.

The forces are trust, cost, and fit. Trust means no auto apply and a clear draft label. Cost means the estimate must appear before confirm and the ledger must stay exact. Fit means the panel must sit in the existing three rail layout without a new editor, and applies must reuse the guarded save with version checks so concurrent edits never lose work.

## Options considered

### Option 1: Free text stream with copy only

The model returns raw markdown in one stream and the student copies text by hand into the canvas.

**Pros**:
* Smallest build with no new tables and no apply logic.

**Cons**:
* No per paragraph accept, so large rewrites are hard to use.
* No history, cost record, or audit trail beyond the ledger.

### Option 2: Structured paragraphs with explicit confirm and guarded apply

The model returns typed paragraphs with warnings through the wizard routing and SSE shape. The panel diffs per paragraph, estimates from OperationPricing, holds at confirm, and applies through version checked writes with hash guard.

**Pros**:
* Preview plus per paragraph accept matches the done when clause exactly.
* Reuses proven patterns from specs 0006 and 0007, so behavior stays coherent.

**Cons**:
* Higher per run cost and latency than a single cheap call.
* Needs two new tables plus a prune job.

### Option 3: Inline tracked changes in the canvas

Edits appear directly in Tiptap as insertions and deletions with per chunk accept.

**Pros**:
* Feels immediate because the change sits where it will land.

**Cons**:
* Complex editor surgery with higher risk of corrupting Tiptap JSON.
* Harder to show cost before confirm and to keep a clean history.

## Rationale

Option 2 fits the forces best. The done when clause asks for estimates, previews, and accept or discard without silent replacement, and only structured paragraphs give per paragraph control with word highlights. Reuse matters for day 180 upkeep (basis: your existing wizard routing and ledger pattern, boring technology wins). The wizard already solved estimate, hold, and refund, and the workspace already solved guarded saves, so the assistant composes both instead of inventing new machinery. The extra latency and storage cost are accepted because trust and audit matter more for academic text. Option 1 was rejected because copy only cannot satisfy preview and accept at paragraph grain. Option 3 was rejected because inline surgery risks document corruption for little gain over a side panel.

## References

**Project sources** (verifiable, in this repo):
* docs/scope/scope.md Slice 5 intent and done when clause
* spec 0006 project creation wizard and briefing, estimate plus hold plus SSE pattern
* spec 0007 document workspace and Tiptap editor canvas, tree plus guarded save plus version checks
* spec 0001 core data model and schema migration, CreditWallet plus CreditLedger plus AiUsage plus OperationPricing
* .agents/skills/ai-sdk/, model call and structured output conventions

**Practices & standards**:
* idempotency keys for money operations
* estimate before confirm for prepaid spend
* no silent writes for AI assisted editing
* optimistic concurrency with version checks
* audit logs for money and access decisions
