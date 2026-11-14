import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-api";
import { logAdminAudit } from "@/lib/admin";
import { db } from "@/lib/prisma";

const schema = z.object({ reason: z.string().max(2000).nullish() });

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
  const ticket = (await db.orm.public.SupportTicket.where({
    id,
  }).first()) as unknown as { status: string } | null;
  if (!ticket)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (ticket.status === "CLOSED")
    return NextResponse.json({ error: "CONFLICT" }, { status: 409 });
  await db.orm.public.SupportTicket.where({ id }).update({ status: "CLOSED" });
  await logAdminAudit({
    userId: gate.user.id,
    action: "ticket.close",
    targetType: "SupportTicket",
    targetId: id,
    details: { reason: parsed.data.reason ?? null },
  });
  return NextResponse.json({ id, status: "CLOSED" });
}
