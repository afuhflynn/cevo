import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-api";
import { db } from "@/lib/prisma";
import { logTemplateAudit } from "@/lib/templates";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  fromDraftId: z.string().min(1).optional(),
  cloneFromVersion: z.number().int().min(1).optional(),
});

export async function POST(request: Request, { params }: Ctx) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const { id } = await params;
  const template = await db.orm.public.ProjectTemplate.where({ id }).first();
  if (!template)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const existing = await db.orm.public.TemplateVersion.select("version")
    .where((r) => r.templateId.eq(id))
    .orderBy((r) => r.version.desc())
    .limit(1)
    .all();
  const nextVersion =
    existing.length > 0
      ? (existing[0] as unknown as { version: number }).version + 1
      : 1;

  if (parsed.data.fromDraftId) {
    const draft = await db.orm.public.TemplateDraft.where({
      id: parsed.data.fromDraftId,
    }).first();
    if (!draft)
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Draft not found" },
        { status: 404 },
      );
    const d = draft as unknown as {
      status: string;
      payload: {
        rules?: Record<string, unknown>;
        sections?: Array<{
          title: string;
          sectionType: string;
          order?: number;
        }>;
      } | null;
    };
    if (d.status !== "open")
      return NextResponse.json(
        { error: "CONFLICT", message: "Draft already applied" },
        { status: 409 },
      );
    return applyPayload(
      id,
      nextVersion,
      d.payload,
      gate.user.id,
      parsed.data.fromDraftId,
    );
  }

  if (parsed.data.cloneFromVersion) {
    const src = await db.orm.public.TemplateVersion.where({
      templateId: id,
    } as never)
      .where((r) => r.version.eq(parsed.data.cloneFromVersion as number))
      .first();
    if (!src)
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Source version not found" },
        { status: 404 },
      );
    const srcId = (src as unknown as { id: string }).id;
    const [rules, sections] = await Promise.all([
      db.orm.public.TemplateRule.where({ templateVersionId: srcId }).first(),
      db.orm.public.TemplateSection.select(
        "orderIndex",
        "title",
        "sectionType",
        "description",
      )
        .where((r) => r.templateVersionId.eq(srcId))
        .orderBy((r) => r.orderIndex.asc())
        .limit(200)
        .all(),
    ]);
    try {
      const created = await db.transaction(async (tx) => {
        const v = await tx.orm.public.TemplateVersion.create({
          templateId: id,
          version: nextVersion,
          isPublished: false,
          changelog: `Cloned from v${parsed.data.cloneFromVersion}`,
        });
        const vid = (v as unknown as { id: string }).id;
        if (rules) {
          const r = rules as unknown as Record<string, unknown>;
          const rest: Record<string, unknown> = {};
          for (const [k, val] of Object.entries(r)) {
            if (k === "id" || k === "templateVersionId") continue;
            rest[k] = val;
          }
          await tx.orm.public.TemplateRule.create({
            templateVersionId: vid,
            ...rest,
          } as never);
        }
        for (const s of sections as unknown as Array<{
          orderIndex: number;
          title: string;
          sectionType: string;
          description: string | null;
        }>) {
          await tx.orm.public.TemplateSection.create({
            templateVersionId: vid,
            orderIndex: s.orderIndex,
            title: s.title,
            sectionType: s.sectionType,
            description: s.description,
          });
        }
        return v;
      });
      await logTemplateAudit({
        userId: gate.user.id,
        action: "template.version.create",
        targetType: "TemplateVersion",
        targetId: (created as unknown as { id: string }).id,
        details: {
          templateId: id,
          version: nextVersion,
          cloneFrom: parsed.data.cloneFromVersion,
        },
      });
      return NextResponse.json({ version: created }, { status: 201 });
    } catch (e) {
      if (isUnique(e))
        return NextResponse.json({ error: "ALREADY_EXISTS" }, { status: 409 });
      throw e;
    }
  }

  try {
    const created = await db.orm.public.TemplateVersion.create({
      templateId: id,
      version: nextVersion,
      isPublished: false,
      changelog: "Blank draft",
    });
    await logTemplateAudit({
      userId: gate.user.id,
      action: "template.version.create",
      targetType: "TemplateVersion",
      targetId: (created as unknown as { id: string }).id,
      details: { templateId: id, version: nextVersion },
    });
    return NextResponse.json({ version: created }, { status: 201 });
  } catch (e) {
    if (isUnique(e))
      return NextResponse.json({ error: "ALREADY_EXISTS" }, { status: 409 });
    throw e;
  }
}

async function applyPayload(
  templateId: string,
  nextVersion: number,
  payload: {
    rules?: Record<string, unknown>;
    sections?: Array<{ title: string; sectionType: string; order?: number }>;
  } | null,
  adminId: string,
  draftId: string,
) {
  if (
    !payload ||
    (!payload.rules && (!payload.sections || payload.sections.length === 0))
  ) {
    return NextResponse.json(
      {
        error: "INVALID_INPUT",
        message: "Draft payload is empty, fill rules manually",
      },
      { status: 422 },
    );
  }
  if (payload.rules) {
    const { ruleSchema } = await import("@/lib/templates");
    const check = ruleSchema.partial().safeParse(payload.rules);
    if (!check.success) {
      return NextResponse.json(
        { error: "INVALID_INPUT", issues: check.error.flatten() },
        { status: 422 },
      );
    }
  }
  try {
    const created = await db.transaction(async (tx) => {
      const v = await tx.orm.public.TemplateVersion.create({
        templateId,
        version: nextVersion,
        isPublished: false,
        changelog: `Applied from draft ${draftId}`,
      });
      const vid = (v as unknown as { id: string }).id;
      if (payload.rules && Object.keys(payload.rules).length > 0) {
        const full = withRuleDefaults(payload.rules);
        await tx.orm.public.TemplateRule.create({
          templateVersionId: vid,
          ...full,
        } as never);
      }
      const secs = payload.sections ?? [];
      for (let i = 0; i < secs.length; i += 1) {
        const s = secs[i]!;
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
      userId: adminId,
      action: "template.apply",
      targetType: "TemplateVersion",
      targetId: (created as unknown as { id: string }).id,
      details: { templateId, version: nextVersion, draftId },
    });
    return NextResponse.json({ version: created }, { status: 201 });
  } catch (e) {
    if (isUnique(e))
      return NextResponse.json({ error: "ALREADY_EXISTS" }, { status: 409 });
    throw e;
  }
}

function withRuleDefaults(
  partial: Record<string, unknown>,
): Record<string, unknown> {
  return {
    pageSize: partial["pageSize"] ?? "A4",
    marginTopMm: partial["marginTopMm"] ?? 25.4,
    marginBottomMm: partial["marginBottomMm"] ?? 25.4,
    marginLeftMm: partial["marginLeftMm"] ?? 38.1,
    marginRightMm: partial["marginRightMm"] ?? 25.4,
    fontFamily: partial["fontFamily"] ?? "Times New Roman",
    fontSizeBodyPt: partial["fontSizeBodyPt"] ?? 12,
    lineSpacing: partial["lineSpacing"] ?? 1.5,
    paragraphIndentMm: partial["paragraphIndentMm"] ?? 12.7,
    heading1FontPt: partial["heading1FontPt"] ?? 16,
    heading1Style: partial["heading1Style"] ?? "BOLD_UPPERCASE",
    heading2FontPt: partial["heading2FontPt"] ?? 14,
    heading2Style: partial["heading2Style"] ?? "BOLD_TITLECASE",
    citationStyle: partial["citationStyle"] ?? "APA_7",
    requirePrelims: (partial["requirePrelims"] as unknown) ?? {
      titlePage: true,
    },
  };
}

function isUnique(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /unique|Unique|already exists|ALREADY_EXISTS/i.test(msg);
}
