import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { db } from "@/lib/prisma";
import { logTemplateAudit } from "@/lib/templates";

type Ctx = { params: Promise<{ draftId: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const { draftId } = await params;
  const draft = await db.orm.public.TemplateDraft.where({
    id: draftId,
  }).first();
  if (!draft) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const d = draft as unknown as { id: string; status: string };
  if (d.status !== "open")
    return NextResponse.json({ error: "ALREADY_APPLIED" }, { status: 409 });
  await db.orm.public.TemplateDraft.where({ id: draftId }).update({
    status: "discarded",
  });
  await logTemplateAudit({
    userId: gate.user.id,
    action: "template.discard",
    targetType: "TemplateDraft",
    targetId: draftId,
    details: {},
  });
  return NextResponse.json({ ok: true, status: "discarded" });
}
