import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { db } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const { id } = await params;
  const ticket = (await db.orm.public.SupportTicket.where({
    id,
  }).first()) as unknown as Record<string, unknown> | null;
  if (!ticket)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const messages = (await db.orm.public.SupportMessage.select(
    "id",
    "ticketId",
    "senderId",
    "isAdmin",
    "message",
    "createdAt",
  )
    .limit(200)
    .all()) as unknown as Array<{
    id: string;
    ticketId: string;
    senderId: string;
    isAdmin: boolean;
    message: string;
    createdAt: Date | string;
  }>;
  const thread = messages
    .filter((m) => m.ticketId === id)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    .slice(0, 50);
  return NextResponse.json({ ticket, thread });
}
