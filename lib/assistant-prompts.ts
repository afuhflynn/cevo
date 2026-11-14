import { z } from "zod";

export const ASSISTANT_PROMPT_VERSION = "2026-11-14.v1";

export const ASSISTANT_OPERATIONS = ["tone", "polish", "review"] as const;
export type AssistantOperation = (typeof ASSISTANT_OPERATIONS)[number];

export function isAssistantOperation(
  value: unknown,
): value is AssistantOperation {
  return (
    typeof value === "string" &&
    (ASSISTANT_OPERATIONS as readonly string[]).includes(value)
  );
}

export const ASSISTANT_SYSTEM_PROMPTS: Record<AssistantOperation, string> = {
  tone: "You are an academic tone editor. Rewrite each paragraph in a steady formal academic voice. Keep every fact, citation cue, and number exactly as written. Do not add new claims.",
  polish:
    "You are an academic copy editor. Fix grammar, spelling, and flow paragraph by paragraph. Keep meaning, facts, and citation cues unchanged.",
  review:
    "You are an academic consistency reviewer. Check each paragraph against the aims and objectives implied by the text. Flag drift, vague claims, and uncited assertions as warnings, and offer a short fix draft per flagged paragraph. Keep the revised text conservative: only smooth the language, never invent findings.",
};

export const assistantWarningSchema = z.object({
  issue: z.string().min(1).max(500),
  location: z.string().min(1).max(200).optional(),
  fixDraft: z.string().min(1).max(2000).optional(),
});

export const assistantParagraphSchema = z.object({
  paragraphIndex: z.number().int().min(0).max(500),
  originalText: z.string().min(1).max(12000),
  revisedText: z.string().min(1).max(12000),
  warnings: z.array(assistantWarningSchema).max(10).default([]),
});

export type AssistantParagraph = z.infer<typeof assistantParagraphSchema>;

export const assistantOutputSchema = z.object({
  paragraphs: z.array(assistantParagraphSchema).min(1).max(100),
});

export type AssistantOutput = z.infer<typeof assistantOutputSchema>;
