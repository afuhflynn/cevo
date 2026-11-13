import { z } from "zod";

export const wizardFieldKeys = [
  "background",
  "problem",
  "aim",
  "objectives",
  "questions",
  "scope",
  "limitations",
  "methodology",
  "outcomes",
] as const;

export type WizardFieldKeyInput = (typeof wizardFieldKeys)[number];

export const createSessionSchema = z.object({
  title: z.string().trim().min(3).max(200),
  qualification: z.string().trim().max(50).optional(),
  department: z.string().trim().max(120).optional(),
  programme: z.string().trim().max(120).optional(),
});

export const turnSchema = z.object({
  fieldKey: z.enum(wizardFieldKeys),
  answerText: z.string().trim().min(1).max(8000),
});

export const approveSchema = z.object({
  briefVersion: z.number().int().min(1),
  templateVersionId: z.string().min(1).optional(),
});

export const idempotencyHeaderSchema = z.string().min(8).max(128);

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type TurnInput = z.infer<typeof turnSchema>;
export type ApproveInput = z.infer<typeof approveSchema>;

export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
