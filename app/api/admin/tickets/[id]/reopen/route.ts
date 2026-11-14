import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { logAdminAudit } from "@/lib/admin";
import { db } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const { id } = await params;
  const ticket = (await db.orm.public.SupportTicket.where({
    id,
  }).first()) as unknown as { status: string } | null;
  if (!ticket)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (ticket.status !== "CLOSED" && ticket.status !== "RESOLVED")
    return NextResponse.json({ error: "CONFLICT" }, { status: 409 });
  await db.orm.public.SupportTicket.where({ id }).update({
    status: "IN_PROGRESS",
  });
  await logAdminAudit({
    userId: gate.user.id,
    action: "ticket.reopen",
    targetType: "SupportTicket",
    targetId: id,
    details: {},
  });
  return NextResponse.json({ id, status: "IN_PROGRESS" });
}
