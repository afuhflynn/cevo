# AI Architecture & Operations Design: Cevo

## 1. AI Vision & Principles

The AI layer in Cevo acts as an **Academic Project Co-Pilot and Tutor**, designed to scaffold student thinking rather than replace student authorship. 

### Core Tenets:
1. **Academic Rigor:** Prompts encourage critical thinking, methodology precision, objective formulation, and academic vocabulary.
2. **Deterministic Citations:** The LLM is NEVER used as a bibliographic database. Literature references come exclusively from verified scholarly APIs (OpenAlex/Crossref).
3. **Context Pruning:** Full 50-page documents are never sent into model context. Instead, structured context snippets (brief objectives + current active section) are injected to optimize token costs and speed.
4. **Student in the Loop:** AI suggestions are presented as side-by-side diff previews. No AI generation silently replaces student text.
5. **Fail-Safe Financial Policy:** If an AI run fails to generate a usable output or the provider times out, the user is never charged credits.

---

## 2. Centralized Model Routing (OpenRouter)

Model selection is centrally managed in `@/server/ai/config.ts` and can be adjusted by administrators without redeploying application code.

### Tier 1: Economical / Fast Tier
- **Default Models:** `openai/gpt-4o-mini`, `anthropic/claude-3.5-haiku`, `google/gemini-flash-1.5`
- **Use Cases:**
  - Paragraph rewriting and tone polishing
  - Grammar and academic style checking
  - Conversational brainstorming in the project creation wizard
  - Keyword and search query extraction
- **Characteristics:** Low latency (< 1.5s), very low token cost ($0.15 - $0.25 per 1M tokens), high throughput.

### Tier 2: Advanced / Synthesis Tier
- **Default Models:** `anthropic/claude-3.5-sonnet`, `openai/gpt-4o`, `google/gemini-1.5-pro`
- **Use Cases:**
  - Project Brief synthesis from raw idea
  - Structural chapter outline generation
  - Chapter consistency review against Chapter 1 Aim and Objectives
  - Institutional guideline extraction from uploaded syllabi
- **Characteristics:** Deep reasoning, adherence to complex structural constraints, high schema compliance.

---

## 3. AI Operations Inventory & Credit Costs

| Operation Type | Operation ID | Model Tier | Default Credit Cost | Context Strategy |
|---|---|---|---|---|
| Idea Exploration | `IDEA_EXPLORE` | Economical | 2 Credits | Working title + 10-message chat history |
| Project Brief Synthesis | `BRIEF_SYNTHESIS` | Advanced | 15 Credits | Title, Type, Qualification, Student responses |
| Outline Generation | `OUTLINE_GEN` | Advanced | 10 Credits | Approved brief + Template required sections |
| Paragraph Polishing | `PARAGRAPH_POLISH` | Economical | 2 Credits | Active paragraph + Style prompt |
| Academic Tone Revision | `TONE_REVISION` | Economical | 2 Credits | Active paragraph + Qualification level |
| Section Drafting Support | `SECTION_DRAFT` | Economical | 5 Credits | Section heading + Brief objectives + Student bullet points |
| Consistency Review | `CONSISTENCY_CHECK` | Advanced | 8 Credits | Chapter 1 Objectives + Target chapter text |
| Template Compliance Scan | `TEMPLATE_COMPLIANCE`| Advanced | 8 Credits | Document structure + Template rules |

---

## 4. Context Management & Token Pruning

To keep API calls fast and unit economics profitable, Cevo implements a strict context pruning algorithm:

```typescript
export function buildSectionPromptContext(params: {
  brief: ProjectBrief;
  activeSection: ProjectSection;
  userPrompt: string;
}) {
  return {
    system: `You are Cevo Academic Co-Pilot for a ${params.brief.project.qualification} project. 
Enforce strict academic rigor. Never fabricate citations or sources.`,
    context: {
      projectTitle: params.brief.project.title,
      projectAim: params.brief.aim,
      projectObjectives: params.brief.objectives,
      currentChapter: params.activeSection.title,
      selectedText: params.activeSection.selectedText ?? params.activeSection.plainText.slice(0, 1500)
    },
    userInstruction: params.userPrompt
  };
}
```

Maximum input tokens are capped at 3,000 tokens for Economical operations and 6,000 tokens for Advanced operations.

---

## 5. Structured Outputs & Zod Validation

All structured outputs use Vercel AI SDK `generateObject` with strict Zod schemas:

### Example: Project Brief Schema
```typescript
export const ProjectBriefOutputSchema = z.object({
  background: z.string().min(100),
  problemStatement: z.string().min(100),
  aim: z.string().min(30),
  objectives: z.array(z.string()).min(3).max(6),
  researchQuestions: z.array(z.string()).min(3).max(6),
  scope: z.string().min(50),
  limitations: z.string().min(50),
  methodology: z.string().min(100),
  expectedOutcomes: z.string().min(50),
  targetEnvironment: z.string().optional()
});
```

---

## 6. Financial Ledger Settlement & Fail-Safe Refund

```
1. Verify user wallet balance >= operation price
2. Reserve credits: balance = balance - cost (Transaction 1)
3. Execute OpenRouter API call via Vercel AI SDK
   ├── SUCCESS:
   │     Record AiUsage (tokens, duration, costUsd)
   │     Commit credit reservation
   └── FAILURE / TIMEOUT / ABORT:
         Rollback: refund reserved credits to wallet
         Record failed AiUsage entry with error message
         Notify student with clear error explanation
```
