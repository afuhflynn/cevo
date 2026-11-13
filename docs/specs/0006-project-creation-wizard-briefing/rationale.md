# 0006 rationale · Project creation wizard and conversational briefing

**Date**: 2026-11-13

## Context

Cevo guides students from an initial project idea to a structured report that follows institutional rules. Slice 3 owns the entry to that journey. Before this spec, creation had no guided path, so briefs risked missing aims or methods, and chapter trees had no approved source to grow from.

The wizard must fit the existing stack (Next.js App Router plus Prisma 8 plus Postgres plus Better Auth) and the existing records (Project plus ProjectBrief plus ProjectOutline plus ProjectSection). It must also fit the credit ledger model from Slice 11, where paid AI work debits exactly once and failed runs refund. Conversation state needs server persistence so students can leave and resume, while raw turns stay prunable so the database stays lean after approval.


## Options considered

### Option 1: Structured prompts with gated synthesis

Guided prompts per brief field, sufficiency flags per turn, synthesis allowed only when all core fields pass. Drafts versioned in place.

**Pros**:
* Maps directly to ProjectBrief columns, so completeness is checkable
* Review and audit read one consistent shape from preview to approved

**Cons**:
* Feels less freeform than open chat for expressive students
* Needs careful prompt copy so gates feel helpful, not blocking

### Option 2: Open chat with AI judged readiness

One open conversation where the model asks follow ups and judges when coverage is enough.

**Pros**:
* Feels natural and conversational
* Fewer hardcoded rules to maintain

**Cons**:
* Readiness is opaque and harder to verify in tests
* Thin briefs can slip through when the judge is lenient

### Option 3: Template only assembly with no model

Deterministic assembly of answers into a brief with no model call and no credit spend.

**Pros**:
* Zero model cost and zero failure modes from providers
* Fully predictable output

**Cons**:
* Briefs read flat and need heavy student editing
* Wastes the model routing already planned for research and assistant slices


## Rationale

The scope demands sufficient detail before synthesis and an approved brief before chapters exist. Structured prompts plus explicit gates make sufficiency testable (basis: your scope row for feature 7 plus the ProjectBrief shape in spec 0001). Open chat was rejected because readiness would rest on model judgment that tests cannot pin. Template only output was rejected because it underuses the paid model path the ledger and assistant slices already assume. The cheap draft plus frontier review route keeps quality high while holding cost down (basis: OpenRouter model routing docs plus AI SDK structured output docs, both web verified in References).


## References

**Project sources** (verifiable, in this repo):
* `docs/scope/scope.md`, feature 7 row plus Tracer Bullet default plus GA rigor tag (basis: scope intent and build approach)
* spec 0001 core data model, Project plus ProjectBrief plus ProjectOutline plus ProjectSection shapes (basis: reuse targets)
* spec 0002 auth plus Arcjet plus audit conventions (basis: security model)
* spec 0004 onboarding wizard plus resume patterns (basis: step plus resume UX)
* spec 0005 dashboard catalog plus nuqs plus React Query patterns (basis: wizard shell choice)
* Installed skill `ai-sdk` at `.agents/skills/ai-sdk/` (basis: streaming plus structured output pattern)

**Practices & standards**:
* Idempotency keys for money and provisioning operations (basis: atomic approval plus credit holds)
* Audit logs for access denials and paid runs (basis: security model)
* Pagination on turn and version lists even in MVP (basis: list endpoint safety)
* Owner scoped queries with admin read only support path (basis: multi student isolation)

**Links** (web verified only):
* OpenRouter Vercel AI SDK guide: https://openrouter.ai/docs/guides/community/vercel-ai-sdk
* AI SDK OpenRouter provider: https://ai-sdk.dev/providers/community-providers/openrouter
* OpenRouter model routing and fallbacks: https://openrouter.ai/docs/features/model-routing
* AI SDK generating structured data (Output.object): https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
* OpenRouter 2026 model rankings and pricing survey: https://www.teamday.ai/blog/top-ai-models-openrouter-2026
