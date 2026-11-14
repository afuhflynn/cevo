import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-api";
import { logAdminAudit } from "@/lib/admin";
import { db } from "@/lib/prisma";

const schema = z.object({ assigneeId: z.string().min(1).max(100).nullable() });

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
  const ticket = await db.orm.public.SupportTicket.where({ id }).first();
  if (!ticket)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (parsed.data.assigneeId) {
    const admin = (await db.orm.public.User.where({
      id: parsed.data.assigneeId,
    }).first()) as unknown as { role: string } | null;
    if (!admin || (admin.role !== "ADMIN" && admin.role !== "SUPER_ADMIN"))
      return NextResponse.json({ error: "INVALID_INPUT" }, { status: 422 });
  }
  await db.orm.public.SupportTicket.where({ id }).update({
    assigneeId: parsed.data.assigneeId,
  });
  await logAdminAudit({
    userId: gate.user.id,
    action: "ticket.assign",
    targetType: "SupportTicket",
    targetId: id,
    details: { assigneeId: parsed.data.assigneeId },
  });
  return NextResponse.json({ id, assigneeId: parsed.data.assigneeId });
}
