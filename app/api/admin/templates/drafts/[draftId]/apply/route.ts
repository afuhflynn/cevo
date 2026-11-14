import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-api";
import { db } from "@/lib/prisma";
import {
  extractPayloadSchema,
  logTemplateAudit,
  ruleSchema,
} from "@/lib/templates";

type Ctx = { params: Promise<{ draftId: string }> };

const bodySchema = z.object({
  targetTemplateId: z.string().min(1).optional(),
  rules: ruleSchema.partial().optional(),
  sections: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        sectionType: z.string().min(1).max(40),
        order: z.number().int().min(0).max(500).optional(),
      }),
    )
    .max(100)
    .optional(),
});

export async function POST(request: Request, { params }: Ctx) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const { draftId } = await params;
  const draft = await db.orm.public.TemplateDraft.where({
    id: draftId,
  }).first();
  if (!draft) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const d = draft as unknown as {
    id: string;
    status: string;
    templateId: string | null;
    payload: {
      rules?: Record<string, unknown>;
      sections?: Array<{ title: string; sectionType: string; order?: number }>;
    } | null;
  };
  if (d.status !== "open")
    return NextResponse.json(
      {
        error: "ALREADY_APPLIED",
        message: "Draft already applied or discarded",
      },
      { status: 409 },
    );

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const targetTemplateId = parsed.data.targetTemplateId ?? d.templateId;
  if (!targetTemplateId) {
    return NextResponse.json(
      {
        error: "INVALID_INPUT",
        message:
          "Provide targetTemplateId to create a new template shell is not yet supported, pass an existing template id",
      },
      { status: 422 },
    );
  }
  const template = await db.orm.public.ProjectTemplate.where({
    id: targetTemplateId,
  }).first();
  if (!template)
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Target template not found" },
      { status: 404 },
    );

  const storedRules = (d.payload?.rules ?? {}) as Record<string, unknown>;
  const storedSections = (d.payload?.sections ?? []) as Array<{
    title: string;
    sectionType: string;
    order?: number;
  }>;
  const mergedRules = { ...storedRules, ...(parsed.data.rules ?? {}) };
  const mergedSections = parsed.data.sections ?? storedSections;

  const ruleCheck = ruleSchema.partial().safeParse(mergedRules);
  if (!ruleCheck.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: ruleCheck.error.flatten() },
      { status: 422 },
    );
  }
  if (Object.keys(mergedRules).length === 0) {
    return NextResponse.json(
      {
        error: "INVALID_INPUT",
        message: "Draft has no rules, fill them before applying",
      },
      { status: 422 },
    );
  }
  if (mergedSections.length === 0) {
    return NextResponse.json(
      {
        error: "INVALID_INPUT",
        message: "Draft has no sections, add at least one",
      },
      { status: 422 },
    );
  }
  const sectionCheck =
    extractPayloadSchema.shape.sections.safeParse(mergedSections);
  if (!sectionCheck.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: sectionCheck.error.flatten() },
      { status: 422 },
    );
  }

  const existing = await db.orm.public.TemplateVersion.select("version")
    .where((r) => r.templateId.eq(targetTemplateId))
    .orderBy((r) => r.version.desc())
    .limit(1)
    .all();
  const nextVersion =
    existing.length > 0
      ? (existing[0] as unknown as { version: number }).version + 1
      : 1;

  try {
    const created = await db.transaction(async (tx) => {
      const v = await tx.orm.public.TemplateVersion.create({
        templateId: targetTemplateId,
        version: nextVersion,
        isPublished: false,
        changelog: `Applied from draft ${draftId}`,
      });
      const vid = (v as unknown as { id: string }).id;
      const full = {
        pageSize: "A4",
        marginTopMm: 25.4,
        marginBottomMm: 25.4,
        marginLeftMm: 38.1,
        marginRightMm: 25.4,
        fontFamily: "Times New Roman",
        fontSizeBodyPt: 12,
        lineSpacing: 1.5,
        paragraphIndentMm: 12.7,
        heading1FontPt: 16,
        heading1Style: "BOLD_UPPERCASE",
        heading2FontPt: 14,
        heading2Style: "BOLD_TITLECASE",
        citationStyle: "APA_7",
        requirePrelims: { titlePage: true },
        ...mergedRules,
      };
      await tx.orm.public.TemplateRule.create({
        templateVersionId: vid,
        ...full,
      } as never);
      for (let i = 0; i < mergedSections.length; i += 1) {
        const s = mergedSections[i]!;
        await tx.orm.public.TemplateSection.create({
          templateVersionId: vid,
          orderIndex: typeof s.order === "number" ? s.order : i,
          title: String(s.title).slice(0, 200),
          sectionType: String(s.sectionType || "CHAPTER").slice(0, 40),
        });
      }
      await tx.orm.public.TemplateDraft.where({ id: draftId }).update({
        status: "applied",
      });
      return v;
    });
    await logTemplateAudit({
      userId: gate.user.id,
      action: "template.apply",
      targetType: "TemplateVersion",
      targetId: (created as unknown as { id: string }).id,
      details: { draftId, templateId: targetTemplateId, version: nextVersion },
    });
    return NextResponse.json({ version: created }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/unique/i.test(msg))
      return NextResponse.json({ error: "ALREADY_EXISTS" }, { status: 409 });
    throw e;
  }
}
