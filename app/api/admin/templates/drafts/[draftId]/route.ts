import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { db } from "@/lib/prisma";

type Ctx = { params: Promise<{ draftId: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const { draftId } = await params;
  const draft = await db.orm.public.TemplateDraft.where({
    id: draftId,
  }).first();
  if (!draft) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ draft });
}
