import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { db } from "@/lib/prisma";
import { logTemplateAudit } from "@/lib/templates";

type Ctx = { params: Promise<{ id: string; v: string }> };

export async function POST(request: Request, { params }: Ctx) {
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
  const ver = version as unknown as {
    id: string;
    isPublished: boolean;
    publishedAt: Date | null;
  };
  if (ver.isPublished)
    return NextResponse.json({ error: "ALREADY_PUBLISHED" }, { status: 409 });

  const rules = await db.orm.public.TemplateRule.where({
    templateVersionId: ver.id,
  }).first();
  if (!rules)
    return NextResponse.json(
      { error: "RULELESS", message: "Add rules before publishing" },
      { status: 422 },
    );
  const sections = await db.orm.public.TemplateSection.select("id")
    .where((r) => r.templateVersionId.eq(ver.id))
    .limit(2)
    .all();
  if (sections.length < 1)
    return NextResponse.json(
      {
        error: "SECTIONLESS",
        message: "Add at least one section before publishing",
      },
      { status: 422 },
    );

  try {
    await db.transaction(async (tx) => {
      const fresh = await tx.orm.public.TemplateVersion.where({
        id: ver.id,
      }).first();
      const f = fresh as unknown as { isPublished: boolean };
      if (f.isPublished) throw new Error("ALREADY_PUBLISHED_RACE");
      const res = (await tx.orm.public.TemplateVersion.where({
        id: ver.id,
        isPublished: false,
      } as never).update({
        isPublished: true as unknown as never,
        publishedAt: new Date() as unknown as never,
      })) as unknown;
      if (!res) throw new Error("ALREADY_PUBLISHED_RACE");
      return res;
    });
    await logTemplateAudit({
      userId: gate.user.id,
      action: "template.publish",
      targetType: "TemplateVersion",
      targetId: ver.id,
      details: { templateId: id, version: versionNum },
    });
    void 0;
    const final = await db.orm.public.TemplateVersion.where({
      id: ver.id,
    }).first();
    return NextResponse.json({
      version: final,
      publishedAt: (final as unknown as { publishedAt: Date }).publishedAt,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "ALREADY_PUBLISHED_RACE") {
      return NextResponse.json({ error: "ALREADY_PUBLISHED" }, { status: 409 });
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (/already/i.test(msg))
      return NextResponse.json({ error: "ALREADY_PUBLISHED" }, { status: 409 });
    return NextResponse.json(
      { error: "PUBLISH_FAILED", message: msg },
      { status: 500 },
    );
  }
}
