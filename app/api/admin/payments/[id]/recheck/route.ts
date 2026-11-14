import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { logAdminAudit } from "@/lib/admin";
import { syncPaymentFromProvider } from "@/lib/billing";
import { db } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const { id } = await params;
  const existing = await db.orm.public.Payment.where({ id }).first();
  if (!existing)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const result = await syncPaymentFromProvider(id);
  await logAdminAudit({
    userId: gate.user.id,
    action: "payment.recheck",
    targetType: "Payment",
    targetId: id,
    details: { status: result.status },
  });
  return NextResponse.json(result);
}
