import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { db } from "@/lib/prisma";
import { logTemplateAudit, versionEditSchema } from "@/lib/templates";

type Ctx = { params: Promise<{ id: string; v: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const { id, v } = await params;
  const versionNum = Number.parseInt(v, 10);
  if (!Number.isFinite(versionNum))
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 422 });

  const version = await db.orm.public.TemplateVersion.where({
    templateId: id,
  } as never)
    .where((r) => r.version.eq(versionNum))
    .first();
  if (!version)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const ver = version as unknown as { id: string; isPublished: boolean };
  if (ver.isPublished)
    return NextResponse.json(
      { error: "IMMUTABLE", message: "Published versions cannot be edited" },
      { status: 409 },
    );

  const body = await request.json().catch(() => ({}));
  const parsed = versionEditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  if (parsed.data.rules) {
    const existing = await db.orm.public.TemplateRule.where({
      templateVersionId: ver.id,
    }).first();
    const rulePatch = parsed.data.rules as Record<string, unknown>;
    if (existing) {
      await db.orm.public.TemplateRule.where({
        templateVersionId: ver.id,
      }).update(rulePatch as never);
    } else {
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
        ...rulePatch,
      };
      await db.orm.public.TemplateRule.create({
        templateVersionId: ver.id,
        ...full,
      } as never);
    }
  }
  if (parsed.data.sections) {
    const list = parsed.data.sections.map((s, i) => ({
      orderIndex:
        typeof s.order === "number"
          ? s.order
          : typeof s.orderIndex === "number"
            ? s.orderIndex
            : i,
      title: s.title,
      sectionType: s.sectionType,
      description: s.description ?? null,
    }));
    const prev = await db.orm.public.TemplateSection.select("id")
      .where((r) => r.templateVersionId.eq(ver.id))
      .limit(300)
      .all();
    await db.transaction(async (tx) => {
      for (const p of prev as unknown as Array<{ id: string }>) {
        await tx.orm.public.TemplateSection.where({ id: p.id }).delete();
      }
      for (const s of list) {
        await tx.orm.public.TemplateSection.create({
          templateVersionId: ver.id,
          orderIndex: s.orderIndex,
          title: s.title,
          sectionType: s.sectionType,
          description: s.description as unknown as never,
        });
      }
      if (
        parsed.data.changelog !== undefined &&
        parsed.data.changelog !== null
      ) {
        await tx.orm.public.TemplateVersion.where({ id: ver.id }).update({
          changelog: parsed.data.changelog,
        });
      }
    });
  } else if (parsed.data.changelog !== undefined) {
    await db.orm.public.TemplateVersion.where({ id: ver.id }).update({
      changelog: parsed.data.changelog as unknown as never,
    });
  }

  await logTemplateAudit({
    userId: gate.user.id,
    action: "template.version.update",
    targetType: "TemplateVersion",
    targetId: ver.id,
    details: { templateId: id, version: versionNum },
  });
  return NextResponse.json({ ok: true, versionId: ver.id });
}
