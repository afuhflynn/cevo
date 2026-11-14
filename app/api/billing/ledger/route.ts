import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const LEDGER_TYPES = new Set([
  "CREDIT_PURCHASE",
  "OPERATION_DEBIT",
  "PROMOTIONAL_CREDIT",
  "REFUND",
  "ADMIN_ADJUSTMENT",
]);

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const url = new URL(request.url);
  const page = Math.max(
    1,
    Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1,
  );
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      Number.parseInt(
        url.searchParams.get("limit") ?? String(DEFAULT_PAGE_SIZE),
        10,
      ) || DEFAULT_PAGE_SIZE,
    ),
  );
  const type = url.searchParams.get("type");
  if (type !== null && !LEDGER_TYPES.has(type)) {
    return NextResponse.json({ error: "INVALID_TYPE" }, { status: 422 });
  }

  const wallet = await db.orm.public.CreditWallet.where({
    userId: user.id,
  }).first();
  if (!wallet) {
    return NextResponse.json({ entries: [], page, limit, total: 0 });
  }
  const w = wallet as unknown as { id: string; balance: number };

  const all = (await db.orm.public.CreditLedger.select(
    "id",
    "type",
    "amount",
    "balanceAfter",
    "description",
    "referenceId",
    "createdAt",
  )
    .where((r) => r.walletId.eq(w.id))
    .orderBy((r) => r.createdAt.desc())
    .limit(500)
    .all()) as unknown as Array<{
    id: string;
    type: string;
    amount: number;
    balanceAfter: number;
    description: string;
    referenceId: string | null;
    createdAt: Date | string;
  }>;
  const scoped = type ? all.filter((e) => e.type === type) : all;
  const total = scoped.length;
  const start = (page - 1) * limit;
  const entries = scoped.slice(start, start + limit).map((e) => ({
    ...e,
    createdAt:
      e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
  }));

  return NextResponse.json({
    entries,
    page,
    limit,
    total,
    balance: w.balance,
    hasMore: start + limit < total,
  });
}
