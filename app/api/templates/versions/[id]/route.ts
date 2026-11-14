import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import { logTemplateAudit, matchTemplateForUser } from "@/lib/templates";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { id } = await params;

  const version = await db.orm.public.TemplateVersion.where({ id }).first();
  if (!version)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const v = version as unknown as {
    id: string;
    templateId: string;
    version: number;
    isPublished: boolean;
    changelog: string | null;
    publishedAt: Date | null;
  };

  const allowed = await isAllowed(user.id, v.id);
  if (!allowed) {
    await logTemplateAudit({
      userId: user.id,
      action: "template.read.denied",
      targetType: "TemplateVersion",
      targetId: id,
      details: { reason: "not-matched-or-locked" },
    });
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const template = await db.orm.public.ProjectTemplate.where({
    id: v.templateId,
  }).first();
  const rules = await db.orm.public.TemplateRule.where({
    templateVersionId: v.id,
  }).first();
  const sections = await db.orm.public.TemplateSection.select(
    "id",
    "orderIndex",
    "title",
    "sectionType",
    "description",
  )
    .where((r) => r.templateVersionId.eq(v.id))
    .orderBy((r) => r.orderIndex.asc())
    .limit(200)
    .all();

  return NextResponse.json({
    version: {
      id: v.id,
      version: v.version,
      isPublished: v.isPublished,
      changelog: v.changelog,
      publishedAt: v.publishedAt,
    },
    template: template
      ? {
          id: (template as unknown as { id: string }).id,
          title: (template as unknown as { title: string }).title,
        }
      : null,
    rules,
    sections,
  });
}

async function isAllowed(userId: string, versionId: string): Promise<boolean> {
  const user = await db.orm.public.User.where({ id: userId }).first();
  if (
    user &&
    ((user as unknown as { role: string }).role === "ADMIN" ||
      (user as unknown as { role: string }).role === "SUPER_ADMIN")
  ) {
    return true;
  }
  const match = await matchTemplateForUser(userId);
  if (match.templateVersionId === versionId) return true;
  const locked = await db.orm.public.Project.select("id")
    .where({ userId } as never)
    .where((r) => r.templateVersionId.eq(versionId))
    .limit(1)
    .all();
  return locked.length > 0;
}
