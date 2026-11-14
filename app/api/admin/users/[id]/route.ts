import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { db } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminApi(_request);
  if ("error" in gate) return gate.error;
  const { id } = await params;
  const user = (await db.orm.public.User.where({ id }).first()) as unknown as {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: Date | string;
  } | null;
  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const wallet = (await db.orm.public.CreditWallet.where({
    userId: id,
  }).first()) as unknown as { balance: number } | null;
  const payments = (await db.orm.public.Payment.select(
    "id",
    "status",
    "amountXaf",
    "createdAt",
  )
    .limit(10)
    .all()) as unknown as Array<{
    id: string;
    userId: string;
    status: string;
    amountXaf: number;
    createdAt: Date | string;
  }>;
  const userPayments = payments
    .filter((p) => (p as unknown as { userId: string }).userId === id)
    .slice(0, 10);
  const tickets = (await db.orm.public.SupportTicket.select(
    "id",
    "subject",
    "status",
    "updatedAt",
  )
    .limit(200)
    .all()) as unknown as Array<{
    id: string;
    userId: string;
    subject: string;
    status: string;
    updatedAt: Date | string;
  }>;
  const userTickets = tickets
    .filter((t) => (t as unknown as { userId: string }).userId === id)
    .slice(0, 10);
  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
    wallet: { balance: wallet?.balance ?? 0 },
    payments: userPayments,
    tickets: userTickets,
  });
}
