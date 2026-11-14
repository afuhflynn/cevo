import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-api";
import { logAdminAudit } from "@/lib/admin";
import { db } from "@/lib/prisma";

const schema = z.object({
  role: z.enum(["STUDENT", "ADMIN", "SUPER_ADMIN"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  if (gate.user.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await params;
  if (id === gate.user.id)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 422 });
  const existing = await db.orm.public.User.where({ id }).first();
  if (!existing)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  await db.orm.public.User.where({ id }).update({ role: parsed.data.role });
  await logAdminAudit({
    userId: gate.user.id,
    action: "user.role.change",
    targetType: "User",
    targetId: id,
    details: { role: parsed.data.role },
  });
  return NextResponse.json({ id, role: parsed.data.role });
}
