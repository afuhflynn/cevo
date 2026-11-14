import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-api";
import { extractTextFromBytes } from "@/lib/file-extraction";
import { getObjectBytes } from "@/lib/storage";
import { db } from "@/lib/prisma";
import {
  EXTRACT_PDF_MAX_BYTES,
  EXTRACT_TEXT_MAX_CHARS,
  checkExtractCap,
  extractModel,
  extractPayloadSchema,
  logTemplateAudit,
} from "@/lib/templates";

const bodySchema = z.object({
  fileId: z.string().min(1).max(100).optional(),
  pastedText: z
    .string()
    .max(EXTRACT_TEXT_MAX_CHARS + 1)
    .optional(),
  templateId: z.string().min(1).max(100).optional(),
});

export async function POST(request: Request) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const { fileId, pastedText, templateId } = parsed.data;
  if (!fileId && !pastedText) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "Provide fileId or pastedText" },
      { status: 422 },
    );
  }
  if (pastedText && pastedText.length > EXTRACT_TEXT_MAX_CHARS) {
    return NextResponse.json(
      {
        error: "INVALID_INPUT",
        message: `Pasted text capped at ${EXTRACT_TEXT_MAX_CHARS} characters`,
      },
      { status: 422 },
    );
  }
  if (templateId) {
    const t = await db.orm.public.ProjectTemplate.where({
      id: templateId,
    }).first();
    if (!t)
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Template not found" },
        { status: 404 },
      );
  }

  const cap = await checkExtractCap(gate.user.id);
  if (!cap.allowed) {
    await logTemplateAudit({
      userId: gate.user.id,
      action: "template.extract.rate_limited",
      targetType: "TemplateDraft",
      targetId: "extract",
      details: { count: cap.count },
    });
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  let sourceText: string | null =
    pastedText?.slice(0, EXTRACT_TEXT_MAX_CHARS) ?? null;
  let sourceFileId: string | null = null;

  if (fileId) {
    const file = await db.orm.public.FileAsset.where({ id: fileId }).first();
    if (!file)
      return NextResponse.json(
        { error: "NOT_FOUND", message: "File not found" },
        { status: 404 },
      );
    const f = file as unknown as {
      id: string;
      fileSize: number;
      mimeType: string;
      s3Key: string;
      extractedText: string | null;
    };
    if (f.fileSize > EXTRACT_PDF_MAX_BYTES) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "PDF capped at 15 MB" },
        { status: 422 },
      );
    }
    sourceFileId = f.id;
    if (f.extractedText?.trim()) {
      sourceText = f.extractedText.slice(0, EXTRACT_TEXT_MAX_CHARS);
    } else {
      try {
        const bytes = await getObjectBytes(f.s3Key);
        if (bytes) {
          if (bytes.length > EXTRACT_PDF_MAX_BYTES) {
            return NextResponse.json(
              { error: "INVALID_INPUT", message: "PDF capped at 15 MB" },
              { status: 422 },
            );
          }
          const text = await extractTextFromBytes(f.mimeType, bytes);
          sourceText = text ? text.slice(0, EXTRACT_TEXT_MAX_CHARS) : null;
        }
      } catch {
        sourceText = null;
      }
    }
  }

  if (!sourceText || !sourceText.trim()) {
    const blank = await db.orm.public.TemplateDraft.create({
      templateId: (templateId ?? null) as unknown as never,
      sourceText: (sourceText ?? null) as unknown as never,
      sourceFileId: (sourceFileId ?? null) as unknown as never,
      payload: {
        empty: true,
        reason: "no-extractable-text",
      } as unknown as never,
      status: "open",
      createdBy: gate.user.id,
    });
    await logTemplateAudit({
      userId: gate.user.id,
      action: "template.extract",
      targetType: "TemplateDraft",
      targetId: (blank as unknown as { id: string }).id,
      details: {
        outcome: "blank",
        reason: "no-extractable-text",
        fileId: sourceFileId,
      },
    });
    return NextResponse.json(
      {
        draft: blank,
        blank: true,
        reason:
          "No extractable text found, blank draft created for manual entry.",
      },
      { status: 201 },
    );
  }

  if (!process.env["OPENROUTER_API_KEY"]) {
    const blank = await db.orm.public.TemplateDraft.create({
      templateId: (templateId ?? null) as unknown as never,
      sourceText: sourceText as unknown as never,
      sourceFileId: (sourceFileId ?? null) as unknown as never,
      payload: {
        empty: true,
        reason: "provider-not-configured",
      } as unknown as never,
      status: "open",
      createdBy: gate.user.id,
    });
    await logTemplateAudit({
      userId: gate.user.id,
      action: "template.extract",
      targetType: "TemplateDraft",
      targetId: (blank as unknown as { id: string }).id,
      details: { outcome: "blank", reason: "provider-not-configured" },
    });
    return NextResponse.json(
      {
        draft: blank,
        blank: true,
        reason: "Extraction provider not configured, blank draft created.",
      },
      { status: 201 },
    );
  }

  try {
    const openrouter = createOpenRouter({
      apiKey: process.env["OPENROUTER_API_KEY"],
    });
    const { object } = await generateObject({
      model: openrouter(extractModel()),
      schema: extractPayloadSchema,
      system:
        "Extract academic formatting rules from the guideline text. Return only confident values, leave the rest empty. Sections are title plus type (PRELIM, CHAPTER, POSTLIM). Never invent margins or fonts.",
      prompt: `Extract template rules and sections from this guideline (truncated to limits):\n\n${sourceText.slice(0, 60000)}`,
    });
    const draft = await db.orm.public.TemplateDraft.create({
      templateId: (templateId ?? null) as unknown as never,
      sourceText: sourceText as unknown as never,
      sourceFileId: (sourceFileId ?? null) as unknown as never,
      payload: (object ?? {}) as unknown as never,
      status: "open",
      createdBy: gate.user.id,
    });
    await logTemplateAudit({
      userId: gate.user.id,
      action: "template.extract",
      targetType: "TemplateDraft",
      targetId: (draft as unknown as { id: string }).id,
      details: { outcome: "drafted", fileId: sourceFileId },
    });
    return NextResponse.json({ draft, blank: false }, { status: 201 });
  } catch (e) {
    const blank = await db.orm.public.TemplateDraft.create({
      templateId: (templateId ?? null) as unknown as never,
      sourceText: sourceText as unknown as never,
      sourceFileId: (sourceFileId ?? null) as unknown as never,
      payload: { empty: true, reason: "provider-failure" } as unknown as never,
      status: "open",
      createdBy: gate.user.id,
    });
    await logTemplateAudit({
      userId: gate.user.id,
      action: "template.extract",
      targetType: "TemplateDraft",
      targetId: (blank as unknown as { id: string }).id,
      details: {
        outcome: "blank",
        reason: e instanceof Error ? e.message : "provider failure",
      },
    });
    return NextResponse.json(
      {
        draft: blank,
        blank: true,
        reason: "Provider failure, blank draft created for manual entry.",
      },
      { status: 201 },
    );
  }
}
