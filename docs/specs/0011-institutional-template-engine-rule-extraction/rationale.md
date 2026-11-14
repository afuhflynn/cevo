# 0011 rationale

## Context

Cevo serves students across many universities, faculties, departments, and programmes, and each of these can require different margins, fonts, spacing, opening pages, and chapter order. Today the data model holds template rows but no admin lifecycle fills them, no extraction turns guideline documents into rules, and matching only weighs qualification plus department. Without this decision every project risks starting from wrong formatting, and the later review and export features have no stable rule contract to read.

The wizard already suggests a template and locks a version at approval, so this feature must extend that behavior rather than replace it. Extraction quality is the central risk: model output can read confident while wrong, which is why admin review stays mandatory. Live enforcement in the editor is out of scope; this feature stores versioned rules and locks projects to them, leaving enforcement to later features.

## Options considered

### Option 1: Full lifecycle with assisted extraction

Admin CRUD plus version states plus model drafted rules plus a shared hierarchy matcher. Drafts live in a new TemplateDraft row that an admin reviews before anything reaches a version; publish is guarded; matching is one shared function used by every caller.

**Pros**:
* One path serves manual and assisted creation, and admin review stays mandatory before publish.
* Typed rule columns keep validation strict and easy for export and review to read later.

**Cons**:
* More to build than manual entry alone (draft rows plus an extraction route plus review UI).
* Draft quality depends on model output, so review discipline carries real weight.

### Option 2: Manual entry only with minimal matcher

Admins type every rule by hand into version rows; matching stays inside the wizard approve route with qualification plus department scoring only.

**Pros**:
* Smallest build, no model cost, fewer failure modes.

**Cons**:
* Rule entry is slow and error prone for long guideline documents.
* Matcher logic copied per caller drifts over time.

### Option 3: Flexible JSON rules with transient extraction

Rules stored as one JSON payload per version; extraction runs inline and returns a payload without storing a draft row.

**Pros**:
* The schema evolves without migrations and the extraction path is stateless.

**Cons**:
* No typed validation at the database layer, so export must defensively handle missing keys.
* Lost drafts on failure force re upload with no audit trail.

## Rationale

Programmes differ in required opening pages, margins, and chapter order, so matching must weigh the full academic hierarchy rather than qualification alone. Guideline documents are long, which makes pure manual entry slow, while blind trust in model output would be reckless, so extraction drafts into a stored row and publish stays blocked until an admin reviews. Typed columns reuse the TemplateRule shape already in the schema, which keeps export and the later review feature on a stable contract. One shared matcher removes drift between the wizard suggestion and the approval lock. On one tension the engineer preferred matching inputs from the student profile only, while spec 0006 AC-8 already ships an explicit templateVersionId override at approval, so this spec reads matching inputs from the profile and preserves the shipped override path, with a follow up to reconcile the two specs into one rule.
