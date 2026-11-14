import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { logBillingAudit, syncPaymentFromProvider } from "@/lib/billing";
import { db } from "@/lib/prisma";
import { clientIp } from "@/lib/workspace";

type Ctx = { params: Promise<{ paymentId: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const { paymentId } = await params;
  const row = await db.orm.public.Payment.where({ id: paymentId }).first();
  const payment = row as unknown as {
    id: string;
    userId: string;
    packageId: string;
    amountXaf: number;
    creditsAllocated: number;
    status: string;
    payerPhone: string | null;
    failureReason: string | null;
    expiresAt: Date | string;
    createdAt: Date | string;
    completedAt: Date | string | null;
  } | null;
  if (!payment) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (payment.userId !== user.id) {
    await logBillingAudit({
      userId: user.id,
      action: "payment.access.denied",
      targetType: "Payment",
      targetId: paymentId,
      details: { ownerId: payment.userId },
      ipAddress: await clientIp(),
    });
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  // Server side sync: never trust client state alone per spec.
  const synced = await syncPaymentFromProvider(paymentId);
  const fresh =
    synced.status === "NOT_FOUND"
      ? null
      : ((await db.orm.public.Payment.where({
          id: paymentId,
        }).first()) as unknown as typeof payment);
  if (!fresh) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({
    payment: {
      id: fresh.id,
      packageId: fresh.packageId,
      amountXaf: fresh.amountXaf,
      creditsAllocated: fresh.creditsAllocated,
      status: fresh.status,
      payerPhone: fresh.payerPhone,
      failureReason: fresh.failureReason,
      expiresAt:
        fresh.expiresAt instanceof Date
          ? fresh.expiresAt.toISOString()
          : fresh.expiresAt,
      completedAt:
        fresh.completedAt instanceof Date
          ? fresh.completedAt.toISOString()
          : fresh.completedAt,
    },
  });
}
