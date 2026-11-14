# 0017. UI Foundation Refresh and Primitive Audit

**Date**: 2026-11-14
**Status**: Proposed

## Summary

Cevo already owns a complete interface base built on shadcn primitives styled with Tailwind and OKLCH color tokens (a modern way to describe color with lightness and hue). This spec freezes that base so later interface work shares one calm academic look. Every named primitive stays as is and only usage guidance is added. Future pages reuse the same inputs, dialogs, skeletons, empty views, toasts, and motion limits with no new libraries.

## Context

Later journeys polish full user paths for onboarding, auth, dashboard, workspace, and the public site. Each journey touches inputs, pickers, dialogs, loading views, and empty views. Without a frozen base, each journey can drift into its own spacing, its own empty view, and its own animation style. That drift is expensive because it reads as low trust in academic work and it forces rework across pages that should look like one family.

The base already exists and it is coherent. The project runs Next 16 App Router with Tailwind v4 and OKLCH theme tokens, class based dark mode through a theme provider, and shadcn style primitives built on a headless UI library. The component folder holds 62 files. Standard primitives cover form, overlay, navigation, and feedback. A small set of custom primitives supports chat and workspace needs. Toasts use a custom toast primitive. Dates use a calendar primitive inside a popover with date utilities. Motion today comes only from CSS animation utilities plus open and close transitions on overlays. There is no motion library and no form library beyond URL state plus schema validation. The scope asks that the Tailwind setup stays intact.

If this base is left unnamed, every journey makes its own call on which select to use, which empty view to use, and which animation is allowed. The result is five journeys with five dialects. A short written standard plus a per primitive verdict prevents that outcome with almost no code change.

## Options considered

### Option 1: Document plus enforce going forward

Write the verdict list and the usage rules now. Apply them to all new journey work. Treat existing code as already compliant since every verdict here is keep. Add a light review check that new pages import only from the approved primitive list.

**Pros**:
- Ships fastest because no code migration is needed
- Keeps the current coherent base stable for all later journeys

**Cons**:
- Relies on review discipline since no lint rule blocks a new custom pattern yet

### Option 2: Document plus single migration pass

Write the same verdict list, then run one coordinated pass that touches every primitive file for polish such as softer borders, adjusted spacing, or new skeleton presets.

**Pros**:
- Gives a visible refresh in one place

**Cons**:
- Touches dozens of files that already work in both themes for no measured user problem
- Creates review noise and regression risk across dashboard, admin, and workspace before the journeys even start

### Option 3: Document only with no enforcement

Write the verdict list as guidance and rely on each journey to follow it voluntarily.

**Pros**:
- Least process overhead

**Cons**:
- Guidance without a review check drifts quickly once five journeys run in sequence
- Custom one off patterns can enter quietly and the standard loses meaning

## Decision

**Chosen option**: Option 1: Document plus enforce going forward

Freeze the current base as the standard. Record keep for every primitive group, document which select and which overlay to use when, and apply the rules to all new journey work with a review check.

## Rationale

The inventory shows a coherent base with no broken primitive. Tokens are settled, both themes render, and dashboard plus admin already use the skeleton and empty views well. The forces in Context point to stability over novelty: the scope asks that Tailwind setup stays intact, the team chose calm academic trust over flashy motion, and no new library is wanted. Option 1 respects those forces because it locks in what works and spends effort on usage rules instead of restyling. Option 2 would churn working files for taste level gains. Option 3 would leave the standard unenforced across five journeys, which is where drift returns.

## Standard definition

**Canonical pattern**:
```tsx
// The one right way for a form field with label, input, and error
import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

<Field>
  <FieldLabel>University</FieldLabel>
  <Input placeholder="Select your university" />
  <FieldDescription>Used to match your institutional template.</FieldDescription>
  <FieldError>Choose a university to continue.</FieldError>
</Field>

// The one right way for an empty view
import { Empty, EmptyTitle, EmptyDescription, EmptyMedia, EmptyAction } from "@/components/ui/empty";

<Empty>
  <EmptyMedia />
  <EmptyTitle>No projects yet</EmptyTitle>
  <EmptyDescription>Create your first project to begin.</EmptyDescription>
  <EmptyAction>Create project</EmptyAction>
</Empty>
```

Primitive verdicts (keep means no styling change, usage guidance only):

- `button.tsx` plus `button-group.tsx`: keep. Primary action uses the primary button. Quiet actions use the muted button. Destructive actions use the destructive button.
- `input.tsx` plus `textarea.tsx` plus `label.tsx` plus `field.tsx`: keep. Every labeled control uses the field wrapper with label plus input plus optional description plus inline error. Focus ring stays on the theme ring token.
- `select.tsx` plus `native-select.tsx` plus `combobox.tsx`: keep all three. Simple fixed lists use the native select. Styled lists inside custom layouts use the select. Searchable lists use the combobox. Academic pickers with search use the combobox.
- Date pattern: keep `calendar.tsx` inside `popover.tsx` plus a read only text input as trigger, with date utilities for formatting. No dedicated date picker wrapper is added. No new date library.
- `dropdown-menu.tsx` plus `context-menu.tsx` plus `menubar.tsx` plus `navigation-menu.tsx`: keep. Card and row actions use the dropdown menu. No custom menu styling per journey.
- `dialog.tsx` plus `alert-dialog.tsx` plus `sheet.tsx` plus `drawer.tsx`: keep. Confirming a safe action uses the dialog. Confirming a destructive action uses the alert dialog. Side editing uses the sheet. Mobile full takeover uses the drawer.
- `skeleton.tsx` plus `spinner.tsx` plus `progress.tsx`: keep. Page and card loading uses the skeleton with layout that mirrors the final content. Short waits use the spinner. Long known waits use progress.
- `toast.tsx` (custom toast): keep. Success plus error plus loading notices use this toast. No migration to an outside toast library.
- `empty.tsx`: keep as the single empty standard with title plus description plus media slot plus one action. Both themes must read well.
- `alert.tsx`: keep for page and card level errors with a retry action. Inline field errors use the field error. Full page failure uses alert plus retry.
- `card.tsx` plus `table.tsx` plus `pagination.tsx` plus `tabs.tsx` plus `accordion.tsx`: keep for dashboard and admin surfaces.
- `avatar.tsx` plus `badge.tsx` plus `tooltip.tsx` plus `hover-card.tsx` plus `separator.tsx` plus `scroll-area.tsx`: keep as is.
- `checkbox.tsx` plus `radio-group.tsx` plus `switch.tsx` plus `slider.tsx` plus `input-otp.tsx` plus `input-group.tsx`: keep as is.
- `calendar.tsx` plus `carousel.tsx` plus `chart.tsx` plus `command.tsx` plus `combobox.tsx`: keep as is. Carousel and chart stay scoped to surfaces that already use them.
- `popover.tsx` plus `collapsible.tsx` plus `resizable.tsx`: keep as is.
- `sidebar.tsx` plus `breadcrumb.tsx` plus `kbd.tsx`: keep as is.
- Custom workspace primitives (`attachment.tsx`, `bubble.tsx`, `message.tsx`, `message-scroller.tsx`, `questionnaire.tsx`, `trace.tsx`, `code-block.tsx`, `marker.tsx`, `direction.tsx`, `item.tsx`): keep scoped to workspace and assistant surfaces only. Journeys must not reuse them as general patterns.

Token verdicts (all locked, no change):

- Colors: keep the full OKLCH token set in `app/globals.css` for background, foreground, card, popover, primary blue, secondary, muted, accent, destructive, border, input, ring, chart scale, and sidebar scale, in both light and dark themes.
- Radius: keep `0.375rem` base with derived small, medium, large, and extra large steps.
- Shadow: keep the full shadow scale from extra small through double extra large.
- Typography: keep Inter for interface text, Source Serif 4 for long form reading surfaces, and JetBrains Mono for code, all loaded in `app/layout.tsx`.
- Dark mode: keep class based switching through the theme provider with system preference support.

State pattern verdicts:

- Loading: skeleton that mirrors the coming layout for pages, stats, lists, and detail. Spinner only for short waits inside a control.
- Empty: the empty primitive with one clear next action. No plain unstyled text blocks for empty views.
- Error: alert with retry for blocks and pages, inline field error for forms, toast for transient failures only.

Motion allow list (approved, nothing else without a new decision):

- Overlay open and close: fade plus scale or slide from the headless primitive defaults.
- Accordion and collapsible: height animation from the animation utilities.
- Loading shimmer and pulse on skeleton, spin on spinner, blink on caret.
- Duration around 100 to 200 milliseconds for control transitions.
- Not allowed: page transition choreography, layout animation, spring physics, scroll linked effects, parallax, looping decorative animation. No motion library is added.

**Replaces**:
- Any per journey custom input, select, dialog, skeleton, empty view, or toast styling that duplicates an approved primitive
- Any new animation library or custom keyframe set added for journey polish
- Any new date picker library or bespoke date wrapper outside calendar inside popover
- Any migration to an outside toast library for journey work

**Enforcement**:
Review convention plus scope linkage. Each journey spec in the 21 to 25 range names this spec as its base and lists any allowed deviation for approval. No lint rule is added now because every verdict is keep and there is nothing to migrate. A later spec may add a lint rule if custom duplicates appear.

**Rollout**:
New code immediately. All journeys from onboarding polish onward build on this standard. Existing code is already compliant so no migration pass is needed.

**Exceptions**:
Custom workspace and assistant primitives stay scoped to those surfaces and are not general journey patterns. Marketing surfaces may compose approved primitives into richer layouts but must not invent new control styles. Any deviation needs explicit approval recorded in that journey spec.

## Consequences

**Positive**:
- Later journeys share one base, so onboarding through public site reads as one product
- Almost no code churn because the audit verdict is keep across the board
- Both themes and the Tailwind setup stay stable while polish work moves fast

**Negative / tradeoffs**:
- Taste level refresh is deferred, so small visual quirks stay until a journey justifies a change
- Review discipline carries the enforcement load since no automated rule blocks custom duplicates yet
- The custom toast stays bespoke, so future maintainers own it instead of an outside library

**Neutral**:
- A future spec can propose token tweaks or a motion library if a journey shows a measured need

## Follow-up

- [ ] Record approved motion use per journey spec in the 21 to 25 range so each approval stays visible at build time
- [ ] Add import guidance for select versus native select versus combobox into the onboarding journey spec where academic pickers are heaviest
- [ ] Consider a lint rule against duplicate empty or toast patterns if review finds custom copies during journey builds
