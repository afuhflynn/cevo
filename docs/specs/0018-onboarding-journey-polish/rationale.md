# Rationale: 0018 onboarding journey polish

_Decision record. Build spec lives in `index.md`. Written by `/solution-architect`, never edited by `/feature-build`._

## Context

The onboarding flow already works in code. Spec 0004 defined the three steps plus the guards plus the welcome grant, and the wizard in `app/onboarding/wizard.tsx` implements it. What remains is presentation debt. The current screen uses plain labels plus basic inputs plus a button list for schools plus raw selects for qualification and style. It has no start screen, no welcome close, no calm progress names, no skeleton that mirrors coming content, and no consistent field plus error pattern.

Later journeys depend on this one to set the tone. If onboarding ships with its own inputs plus its own empty view plus its own animation, every later journey will copy that drift. Spec 0017 froze the base to stop that outcome. This polish applies that base to the full path from start plus personal details plus academic pickers plus preferences to welcome plus resume. The consequence of not deciding is a working but uneven first run that reads as low trust on day one.

## Options considered

### Option 1: Fix in place

Restyle the current wizard file with foundation primitives, keep the layout and the button list pickers and the raw selects, add skeletons and alerts around it.

**Pros**:
* Smallest diff, fastest to review
* No risk to picker logic that already works

**Cons**:
* Keeps the picker pattern the foundation says to replace with combobox for searchable lists
* Keeps raw selects that bypass the field wrapper, so later journeys copy two patterns

### Option 2: Rebuild presentation alongside old with strangler

Build the new polished wizard as a parallel component, route traffic incrementally, retire the old file after proof.

**Pros**:
* Safe cutover with parallel proof
* Old path stays live during the remake

**Cons**:
* Two wizards to maintain during the cutover for a presentation only change with no logic risk
* Extra routing plus flag cost for a single page with no live data migration

### Option 3: Replace presentation directly

Replace the wizard presentation in one pass with foundation primitives plus combobox pickers plus inline suggest plus start plus welcome, keep all Server Actions unchanged.

**Pros**:
* One pattern going forward, matches the foundation verdicts for select versus combobox and field plus error
* Scope stays small because logic plus schema plus guards stay untouched

**Cons**:
* Larger single diff than a restyle, needs careful review of picker wiring
* No parallel fallback during review, relies on tests plus manual pass

## Rationale

The forces in Context point to one clean pattern, not two coexisting ones. The picker load is the deciding force. Searchable academic lists are exactly what the foundation reserves for combobox, and the current button list shows only an id fragment after pick, which reads as broken. A restyle in place would preserve that wrong pattern. A parallel build would carry two wizards for a change with no data risk and no contract change. Direct replacement fits because the scope is one page, the actions stay stable, and the resume plus guard behavior is already proven. The risk is review load, which the build plan answers with thin slices plus mapped test scenarios.
