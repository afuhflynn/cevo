import { z } from "zod";

export const sectionTitleSchema = z.string().trim().min(1, "Title is required").max(200, "Title must be 200 characters or fewer");

export const sectionCreateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional().default("Untitled chapter"),
  parentId: z.string().min(1).nullable().optional(),
});

export const sectionPatchSchema = z.object({
  title: sectionTitleSchema.optional(),
  orderIndex: z.number().int().min(0).max(10000).optional(),
  parentId: z.string().min(1).nullable().optional(),
  isCompleted: z.boolean().optional(),
});

export const sectionPutSchema = z.object({
  content: z.unknown(),
  version: z.number().int().min(1),
});

export function isValidTiptapDoc(content: unknown): { ok: boolean; errors: string[] } {
  if (!content || typeof content !== "object") {
    return { ok: false, errors: ["content must be a Tiptap JSON document"] };
  }
  const doc = content as Record<string, unknown>;
  if (doc["type"] !== "doc") {
    return { ok: false, errors: ["content.type must be 'doc'"] };
  }
  if (doc["content"] !== undefined && !Array.isArray(doc["content"])) {
    return { ok: false, errors: ["content.content must be an array"] };
  }
  const json = JSON.stringify(content);
  if (json.length > 500_000) {
    return { ok: false, errors: ["content exceeds 500KB limit"] };
  }
  return { ok: true, errors: [] };
}

export function validateCitationPayload(input: unknown): { ok: boolean; errors: string[] } {
  if (!input || typeof input !== "object") return { ok: false, errors: ["citation payload required"] };
  const p = input as Record<string, unknown>;
  const sourceId = p["sourceId"];
  const freeText = p["freeText"];
  if (sourceId !== undefined && typeof sourceId !== "string") {
    return { ok: false, errors: ["sourceId must be a string"] };
  }
  if (freeText !== undefined) {
    if (typeof freeText !== "string") return { ok: false, errors: ["freeText must be a string"] };
    if (freeText.length > 500) return { ok: false, errors: ["freeText capped at 500 characters"] };
  }
  if (!sourceId && !freeText) return { ok: false, errors: ["sourceId or freeText required"] };
  return { ok: true, errors: [] };
}
