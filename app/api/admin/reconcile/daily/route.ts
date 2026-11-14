import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { utcDayRange } from "@/lib/admin";
import { db } from "@/lib/prisma";

export async function GET(request: Request) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const range = utcDayRange(date);
  if (!range)
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 422 });

  const payments = (await db.orm.public.Payment.select(
    "id",
    "status",
    "amountXaf",
    "creditsAllocated",
    "completedAt",
  )
    .limit(5000)
    .all()) as unknown as Array<{
    id: string;
    status: string;
    amountXaf: number;
    creditsAllocated: number;
    completedAt: Date | string | null;
  }>;
  const confirmed = payments.filter(
    (p) =>
      p.status === "SUCCESSFUL" &&
      p.completedAt &&
      new Date(p.completedAt).getTime() >= range.start.getTime() &&
      new Date(p.completedAt).getTime() <= range.end.getTime(),
  );
  const confirmedCredits = confirmed.reduce(
    (s, p) => s + (p.creditsAllocated ?? 0),
    0,
  );
  const confirmedXaf = confirmed.reduce((s, p) => s + (p.amountXaf ?? 0), 0);

  const ledgers = (await db.orm.public.CreditLedger.select(
    "id",
    "type",
    "amount",
    "referenceId",
    "createdAt",
  )
    .limit(5000)
    .all()) as unknown as Array<{
    id: string;
    type: string;
    amount: number;
    referenceId: string | null;
    createdAt: Date | string;
  }>;
  const allocated = ledgers.filter(
    (l) =>
      l.type === "CREDIT_PURCHASE" &&
      new Date(l.createdAt).getTime() >= range.start.getTime() &&
      new Date(l.createdAt).getTime() <= range.end.getTime(),
  );
  const allocatedSum = allocated.reduce((s, l) => s + (l.amount ?? 0), 0);

  // 15 minute grace past day close suppresses the alert for late webhooks.
  const now = Date.now();
  const graceCutoff = range.end.getTime() + 15 * 60 * 1000;
  const inGrace = now <= graceCutoff;
  const diff = confirmedCredits - allocatedSum;
  const alert = diff !== 0 && !inGrace;

  return NextResponse.json({
    date,
    confirmedCredits,
    confirmedXaf,
    allocatedSum,
    diff,
    alert,
    inGrace,
    paymentIds: confirmed.map((p) => p.id),
    ledgerRefs: allocated.map((l) => l.referenceId),
  });
}
