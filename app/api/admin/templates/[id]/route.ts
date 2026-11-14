import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { db } from "@/lib/prisma";
import { logTemplateAudit, templatePatchSchema } from "@/lib/templates";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const { id } = await params;
  const template = await db.orm.public.ProjectTemplate.where({ id }).first();
  if (!template)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const versions = await db.orm.public.TemplateVersion.select(
    "id",
    "templateId",
    "version",
    "isPublished",
    "changelog",
    "publishedAt",
    "createdAt",
  )
    .where((r) => r.templateId.eq(id))
    .orderBy((r) => r.version.asc())
    .limit(100)
    .all();
  let rules: unknown[] = [];
  let sections: unknown[] = [];
  if (versions.length > 0) {
    const ids = versions.map((v) => (v as unknown as { id: string }).id);
    rules = await db.orm.public.TemplateRule.select(
      "id",
      "templateVersionId",
      "pageSize",
      "marginTopMm",
      "marginBottomMm",
      "marginLeftMm",
      "marginRightMm",
      "fontFamily",
      "fontSizeBodyPt",
      "lineSpacing",
      "paragraphIndentMm",
      "heading1FontPt",
      "heading1Style",
      "heading2FontPt",
      "heading2Style",
      "citationStyle",
      "requirePrelims",
    )
      .where((r) => r.templateVersionId.in(ids))
      .limit(100)
      .all();
    sections = await db.orm.public.TemplateSection.select(
      "id",
      "templateVersionId",
      "orderIndex",
      "title",
      "sectionType",
      "description",
    )
      .where((r) => r.templateVersionId.in(ids))
      .orderBy((r) => r.orderIndex.asc())
      .limit(300)
      .all();
  }
  return NextResponse.json({ template, versions, rules, sections });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const { id } = await params;
  const template = await db.orm.public.ProjectTemplate.where({ id }).first();
  if (!template)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const parsed = templatePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  for (const [key, model] of [
    ["institutionId", "Institution"],
    ["facultyId", "Faculty"],
    ["departmentId", "Department"],
    ["programmeId", "Programme"],
  ] as const) {
    const val = (parsed.data as Record<string, string | null | undefined>)[key];
    if (val) {
      const row = await (
        db.orm.public as unknown as Record<
          string,
          { where: (f: unknown) => { first: () => Promise<unknown> } }
        >
      )
        [model]!.where({ id: val })
        .first();
      if (!row)
        return NextResponse.json(
          { error: "INVALID_INPUT", message: `${key} not found` },
          { status: 422 },
        );
    }
  }
  const updated = await db.orm.public.ProjectTemplate.where({ id }).update({
    ...(parsed.data.title ? { title: parsed.data.title } : {}),
    ...(parsed.data.description !== undefined
      ? { description: parsed.data.description }
      : {}),
    ...(parsed.data.institutionId !== undefined
      ? { institutionId: parsed.data.institutionId }
      : {}),
    ...(parsed.data.facultyId !== undefined
      ? { facultyId: parsed.data.facultyId }
      : {}),
    ...(parsed.data.departmentId !== undefined
      ? { departmentId: parsed.data.departmentId }
      : {}),
    ...(parsed.data.programmeId !== undefined
      ? { programmeId: parsed.data.programmeId }
      : {}),
    ...(parsed.data.qualification
      ? { qualification: parsed.data.qualification }
      : {}),
    ...(parsed.data.projectType
      ? { projectType: parsed.data.projectType }
      : {}),
    ...(parsed.data.isOfficial !== undefined
      ? { isOfficial: parsed.data.isOfficial }
      : {}),
    ...(parsed.data.isActive !== undefined
      ? { isActive: parsed.data.isActive }
      : {}),
  } as never);
  await logTemplateAudit({
    userId: gate.user.id,
    action:
      parsed.data.isActive === false ? "template.archive" : "template.update",
    targetType: "ProjectTemplate",
    targetId: id,
    details: { patch: parsed.data },
  });
  return NextResponse.json({ template: updated });
}
