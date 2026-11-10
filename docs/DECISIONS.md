# Architectural Decision Records (ADRs): Cevo

## 1. ADR-001: Next.js 16 App Router as Modular Monolith

### Context
Cevo requires rapid full-stack iteration, server-side data isolation, high-performance streaming for AI co-pilot responses, and SEO-friendly public pages.

### Decision
Adopt **Next.js 16 (App Router)** as a **Modular Monolith** using React 19 Server Components, Server Actions for mutations, and Route Handlers for streaming and webhooks.

### Alternatives Considered
- *Microservices (Nest.js backend + Vite frontend):* Rejected due to distributed deployment complexity, CORS overhead, multiple CI/CD pipelines, and duplicated data contracts.
- *Remix / React Router 7:* Strong alternative, but Next.js 16 ecosystem offers deeper integration with Turbopack, Vercel AI SDK, and shadcn/ui.

### Consequences
- Single unified TypeScript codebase (`pnpm`).
- Zero API boilerplate for authenticated client-to-server operations via Server Actions.
- Strict requirement to enforce business logic boundaries in `@/server/...` rather than embedding SQL queries inside UI components.

---

## 2. ADR-002: Tailwind CSS v4 with OKLCH Brand Color Space

### Context
The user provided specific OKLCH color definitions centered around primary blue `oklch(0.6231 0.1880 259.8145)`, with light/dark theme definitions and custom font variables (Inter, Source Serif 4, JetBrains Mono).

### Decision
Use **Tailwind CSS v4** with `@theme inline` mappings and `@custom-variant dark (&:is(.dark *))` in `app/globals.css`.

### Font Variable Circular Mapping Prevention
To prevent circular CSS variable references (`--font-sans: var(--font-sans)`), font definitions in `app/layout.tsx` inject `--font-sans`, `--font-serif`, and `--font-mono`, while `globals.css` provides defensive fallbacks (`var(--font-sans, Inter, sans-serif)`).

---

## 3. ADR-003: UI Primitives & Component Strategy (shadcn/ui Only)

### Context
The platform needs modern, accessible, customized, and consistent interactive elements (calendars, dialogs, dropdowns, sidebars, sheets, accordions, comboboxes).

### Decision
Use **shadcn/ui** primitives exclusively for UI component building blocks (date pickers, dropdowns, dialogs, drawers, sidebars). Do not install competing UI component libraries (e.g. MUI, Chakra, Ant Design). All components reside in `@/components/ui` and are customized to match Cevo brand tokens and minimalism.

---

## 4. ADR-004: Tiptap / ProseMirror for Academic Document Authoring

### Context
The document workspace requires fine-grained formatting, section-by-section hierarchical editing, embedded citations, captions, page breaks, and structural validation.

### Decision
Implement the editor using **Tiptap 2.x (built on ProseMirror)**.
- Document content is stored as canonical ProseMirror JSON per section (`ProjectSection.content`).
- Avoid storing entire theses in a single monolithic markdown or HTML string.

### Consequences
- Enables deterministic citation markers (`data-source-id`).
- Supports structured diffing and safe surgical AI replacements.
- Enables high-fidelity export by walking the ProseMirror AST directly.

---

## 5. ADR-005: Model Routing via OpenRouter & Vercel AI SDK

### Context
AI operations vary in complexity: paragraph rewrites require low latency and low cost, whereas project blueprint synthesis and institutional guideline extraction require advanced reasoning and schema compliance.

### Decision
Route all AI operations through **OpenRouter** using the **Vercel AI SDK** with a two-tier model strategy:
1. **Economical Tier:** Fast, low-cost models (`gpt-4o-mini`, `claude-3.5-haiku`, `gemini-flash-1.5`) for rewrites and brainstorms.
2. **Advanced Tier:** High-reasoning models (`claude-3.5-sonnet`, `gpt-4o`, `gemini-1.5-pro`) for blueprint generation, chapter review, and template parsing.

### Cost Control & Refund Policy
- Every paid AI operation shows its credit cost before execution.
- If an AI call fails, times out, or produces invalid output, reserved credits are immediately and automatically refunded to the student's wallet.

---

## 6. ADR-006: Deterministic Scholarly Research via OpenAlex & Crossref

### Context
Generic LLMs frequently hallucinate scholarly citations, producing fake DOIs, nonexistent authors, and invented publication venues.

### Decision
- Research search queries live academic indexes: **OpenAlex REST API** and **Crossref API** (with Semantic Scholar boundary).
- In-text and bibliographic citations are generated deterministically in pure TypeScript using exact metadata (APA 7 and Harvard specifications).
- The LLM is **never** used as an authority for bibliographic facts or citations.

---

## 7. ADR-007: Fapshi Gateway for Mobile Money in Cameroon (XAF)

### Context
Over 90% of university students in Cameroon rely on Mobile Money (MTN MoMo and Orange Money) rather than credit cards.

### Decision
Use **Fapshi** as the primary payment gateway for XAF collections.
- Webhooks are cryptographically verified using HMAC signatures.
- Webhook idempotency is enforced at the database level via unique constraints on `CreditLedger(walletId, referenceId, type)`.
- Scheduled Inngest cron job reconciles any dropped webhooks every 15 minutes.
- A built-in Development Payment Simulator is provided for local testing without live provider credentials.

---

## 8. ADR-008: Inngest for Background Processing & Exports

### Context
Long-running jobs (PDF rendering, DOCX compilation, guideline extraction, payment reconciliation) exceed serverless function execution timeouts.

### Decision
Use **Inngest** for all durable background workflows.
- Eliminates the need to self-host and monitor Redis queues.
- Provides automatic retries with exponential backoff and step checkpointing.

---

## 9. ADR-009: Strict Build Command Rule

### Rule
**Never run `pnpm build`, `npm run build`, or any build command.**
- Verification, typechecking, and linting are performed via targeted checks (`biome check`, TypeScript language service / IDE checks, unit and integration tests) rather than triggering full production builds during active iterative development.
