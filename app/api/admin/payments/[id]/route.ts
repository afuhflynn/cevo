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
  const payment = (await db.orm.public.Payment.where({
    id,
  }).first()) as unknown as Record<string, unknown> | null;
  if (!payment)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const ledgers = (await db.orm.public.CreditLedger.select(
    "id",
    "type",
    "amount",
    "referenceId",
    "createdAt",
  )
    .limit(100)
    .all()) as unknown as Array<{
    id: string;
    type: string;
    amount: number;
    referenceId: string | null;
    createdAt: Date | string;
  }>;
  const linked = ledgers.filter((l) => l.referenceId === `purchase:${id}`);
  const events = (await db.orm.public.PaymentWebhookEvent.select(
    "id",
    "eventType",
    "isProcessed",
    "signatureValid",
    "createdAt",
  )
    .limit(50)
    .all()) as unknown as Array<{
    id: string;
    paymentId: string | null;
    eventType: string;
    isProcessed: boolean;
    signatureValid: boolean;
    createdAt: Date | string;
  }>;
  const mine = events.filter(
    (e) => (e as unknown as { paymentId: string | null }).paymentId === id,
  );
  return NextResponse.json({ payment, ledgers: linked, webhookEvents: mine });
}
