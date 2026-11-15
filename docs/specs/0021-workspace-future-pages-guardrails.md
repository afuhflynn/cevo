# 0021. Workspace and Future Pages Guardrails

**Date**: 2026-11-15
**Status**: Proposed

## Summary

Cevo still has nine surfaces to polish: the creation wizard, the document workspace with its assistant, research, files, review and export tabs, plus billing and admin. This spec sets the shared guardrails for all of them, so each one reuses the approved inputs, dialogs, skeletons, empty views and toasts from the foundation spec 0017, inside three named layout shells. The document canvas keeps the current editor (Tiptap, the rich text editing library) restyled to the theme, and motion stays within the existing allow list. A future page built under these rules needs no new styles and no new libraries.

## Context

Journeys 21 through 23 are rebuilding onboarding, auth and dashboard on one shared base defined in 0017. Journey D covers everything that remains: the five step creation wizard, the three panel document workspace, the assistant and research and files and review and export tabs inside it, and the billing and admin surfaces beside it. Each of these is a complex surface with trees, streaming text, search results, uploads, background jobs and money totals. Without written guardrails, each one can drift into its own spacing, its own empty view and its own animation style, and the product will read as several products instead of one.

The base to build on already exists and it is coherent. The project runs Next 16 with Tailwind v4 and OKLCH color tokens (a modern way to describe color with lightness and hue), theme classes for dark mode, and 63 shadcn style primitives covering form, overlay, navigation and feedback. The dashboard and admin surfaces already use the card plus table plus pagination plus skeleton plus empty patterns well. The workspace already has its shell, its tree, its themed editor with fixed and bubble toolbars, and its tab set for assistant, research, files, review and export.

The consequence of leaving this undecided is rework. A new input style in billing, a new dialog style in review, or a new loading shimmer in research would each force a later pass to reunite them, and academic users read visual drift as low trust. Naming the allowed shells, the allowed primitives, the state patterns and the motion limits now prevents that outcome with almost no code change.

## Options considered

### Option 1: Document plus enforce going forward

Write the guardrail list now: three named shells, the allowed primitive for each use, the frozen editor treatment, the state patterns and the motion limits. Apply it to all new Journey D work and treat existing workspace code as already compliant. Review checks that each future page spec names this spec as its base and records any deviation for approval.

**Pros**:
* Ships fastest because no code migration is needed
* Keeps the current coherent workspace and dashboard composition stable while polish work moves fast

**Cons**:
* Relies on review discipline since no lint rule blocks a new custom pattern yet

### Option 2: Document plus single migration pass

Write the same guardrail list, then run one coordinated pass that restyles the workspace header, the tree, the tab set and the billing and admin shells to a refreshed look.

**Pros**:
* Gives a visible refresh in one place across all nine surfaces

**Cons**:
* Touches working surfaces in both themes for taste level gains with no measured user problem
* Creates review noise and regression risk across the editor canvas and money surfaces before the journeys even start

### Option 3: Document only with no enforcement

Write the guardrail list as guidance and let each future page follow it voluntarily.

**Pros**:
* Least process overhead for the team

**Cons**:
* Guidance without a review check drifts quickly once nine surfaces build in sequence
* Custom one off patterns can enter quietly and the standard loses meaning

## Decision

**Chosen option**: Option 1: Document plus enforce going forward

Freeze the foundation from 0017 as the visual language for all nine Journey D surfaces, with three named shells and the themed editor treatment, enforced by review.

## Rationale

The inventory in Context shows a coherent base with no broken primitive: tokens are settled, both themes render, and dashboard, admin and workspace already compose the same card, skeleton and empty patterns. The scope asks for no new visual language, and the engineer confirmed all nine surfaces plus the three shells plus the scoped chat primitives plus review enforcement in the design interview. Option 1 respects those forces because it locks in what works and spends effort on usage rules instead of restyling. Option 2 would churn working editor and money surfaces for taste level gains. Option 3 would leave the standard unenforced across nine surfaces, which is where drift returns.

## Standard definition

**Canonical pattern**:
```tsx
// The one right way: a future workspace tab page on the workspace shell
import { Suspense } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyTitle, EmptyDescription, EmptyAction } from "@/components/ui/empty";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function ReviewTabPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-4">
      <Card>
        <CardHeader>
          <CardTitle>Review</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="warnings">
            <TabsList>
              <TabsTrigger value="warnings">Warnings</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="warnings">
              <Suspense
                fallback={
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                }
              >
                <ReviewWarnings />
              </Suspense>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewWarnings({ items, failed, onRetry }: { items: string[]; failed: boolean; onRetry: () => void }) {
  if (failed) {
    return (
      <Alert>
        <AlertTitle>Review failed</AlertTitle>
        <AlertDescription>Something went wrong while running the checks.</AlertDescription>
        <Button onClick={onRetry}>Retry checks</Button>
      </Alert>
    );
  }
  if (items.length === 0) {
    return (
      <Empty>
        <EmptyTitle>No issues found</EmptyTitle>
        <EmptyDescription>Your draft passes every check so far.</EmptyDescription>
        <EmptyAction>
          <Button>Back to editor</Button>
        </EmptyAction>
      </Empty>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
```

**Shell and primitive rules**:
* Wizard shell: step plus progress composition from the creation wizard, field wrapper with label plus input plus description plus inline error for every control, dialog for safe confirms and alert dialog for destructive confirms
* Workspace shell: tree plus canvas plus inspector tab composition from the workspace page, themed Tiptap copy with fixed and bubble toolbars only, the ten workspace chat primitives (`attachment.tsx`, `bubble.tsx`, `message.tsx`, `message-scroller.tsx`, `questionnaire.tsx`, `trace.tsx`, `code-block.tsx`, `marker.tsx`, `direction.tsx`, `item.tsx`) scoped to workspace and assistant surfaces only
* Ledger shell for billing and admin: dashboard card plus table plus pagination composition, dropdown menu for row actions, toast for transient success and failure notices only
* Picker rule in wizard and workspace shells: simple fixed lists use the native select, styled lists use the select, searchable lists including academic pickers use the combobox, dates use the calendar inside a popover with a read only text input trigger
* Assistant streaming: message plus bubble plus message scroller composition, skeleton only before the first chunk arrives, alert with retry in place when a stream fails, never toast for stream errors
* Files: input plus attachment composition for uploads, progress for every upload, alert for quota and blocked type errors, never toast for quota or failure
* Export jobs: progress or skeleton in the export tab while a job runs, persistent alert with retry when a job fails, toast only as a completion ping beside the tab state
* Money mapping in the ledger shell: package and balance totals live in the card footer, ledger rows live in the table with pagination, destructive money confirms use the alert dialog, failed charges use alert with retry and never toast
* Shell coverage: template pickers live in the wizard shell, research split views and review diff views and review history lists live in the workspace shell, files dropzones live in the workspace shell with the files pattern, billing and admin empty states use the ledger shell with the empty primitive
* State patterns in every shell: skeleton mirroring the coming layout for pages and lists, spinner only for short waits inside a control, alert with retry for blocks and pages, empty primitive with one clear action, no plain unstyled text blocks for empty views
* Motion limits in every shell: the 0017 allow list unchanged, which is overlay fade plus scale, accordion height animation, skeleton shimmer, spinner spin, and control transitions around 100 to 200ms, with nothing else added without a new decision

**Replaces**:
* Any new input, select, dialog, skeleton, empty view or toast style that duplicates an approved primitive
* Any new editor library or toolbar style beside the themed Tiptap setup with fixed and bubble toolbars
* Any new animation library or custom keyframe set outside the 0017 allow list
* Any reuse of the ten workspace chat primitives as general patterns outside workspace and assistant surfaces

**Enforcement**:
Review convention plus scope linkage. Each future Journey D page spec names this spec as its base and lists any allowed deviation for approval. Review also checks that quota, payment and export failures use alert with retry, since toast only notices for those failures drift in quietly. No lint rule is added now because every verdict is reuse and there is nothing to migrate. A later spec may add a lint rule if review finds custom duplicates during Journey D builds.

**Rollout**:
New code immediately. All Journey D page specs build on these guardrails from approval onward. Existing workspace, billing and admin code is already compliant so no migration pass is needed.

**Exceptions**:
The ten workspace chat primitives stay scoped to workspace and assistant surfaces and are never general journey patterns. Billing and admin reuse dashboard card plus table plus pagination patterns and add only money specific content such as package totals and ledger rows. Public marketing composition is out of scope here and belongs to the public site spec. Any other deviation needs explicit approval recorded in that page spec.

## Consequences

**Positive**:
* Nine remaining surfaces read as one product with onboarding, auth and dashboard instead of several dialects
* Almost no code churn because the verdict is reuse across the board
* Future page specs start faster since shells, primitives, states and motion are already named

**Negative / tradeoffs**:
* Taste level refresh is deferred, so small visual quirks stay until a page spec justifies a change
* Review discipline carries the enforcement load since no automated rule blocks custom duplicates yet
* The custom toast stays bespoke, so future maintainers own it instead of an outside library

**Neutral**:
* A future spec can propose token tweaks or a motion addition if a page shows a measured need

## Follow-up

* [ ] Link each Journey D page spec (wizard, workspace tabs, billing, admin) to this spec as its base at build time
* [ ] Record approved motion use per Journey D page spec so each approval stays visible
* [ ] Consider a lint rule against duplicate empty or toast patterns if review finds custom copies during Journey D builds
* [ ] Audit existing workspace plus files plus export toast use and move quota, payment and job failures to alert with retry
