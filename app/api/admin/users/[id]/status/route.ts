import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-api";
import { logAdminAudit } from "@/lib/admin";
import { db } from "@/lib/prisma";

const schema = z.object({ isActive: z.boolean() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 422 });
  const existing = await db.orm.public.User.where({ id }).first();
  if (!existing)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  await db.orm.public.User.where({ id }).update({
    isActive: parsed.data.isActive,
  });
  await logAdminAudit({
    userId: gate.user.id,
    action: "user.status.change",
    targetType: "User",
    targetId: id,
    details: { isActive: parsed.data.isActive },
  });
  return NextResponse.json({ id, isActive: parsed.data.isActive });
}
