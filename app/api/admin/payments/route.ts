import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { pageParams, paginate, utcDayRange } from "@/lib/admin";
import { db } from "@/lib/prisma";

export async function GET(request: Request) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const url = new URL(request.url);
  const paging = pageParams(url);
  if ("error" in paging)
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 422 });
  const status = url.searchParams.get("status");
  const provider = url.searchParams.get("provider");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const rows = (await db.orm.public.Payment.select(
    "id",
    "userId",
    "packageId",
    "amountXaf",
    "status",
    "provider",
    "providerTransId",
    "createdAt",
    "completedAt",
  )
    .limit(3000)
    .all()) as unknown as Array<{
    id: string;
    userId: string;
    packageId: string;
    amountXaf: number;
    status: string;
    provider: string;
    providerTransId: string | null;
    createdAt: Date | string;
    completedAt: Date | string | null;
  }>;

  let scoped = rows;
  if (status) scoped = scoped.filter((p) => p.status === status);
  if (provider) scoped = scoped.filter((p) => p.provider === provider);
  if (from) {
    const f = new Date(from);
    if (!Number.isNaN(f.getTime()))
      scoped = scoped.filter((p) => new Date(p.createdAt).getTime() >= f.getTime());
  }
  if (to) {
    const t = new Date(to);
    if (!Number.isNaN(t.getTime()))
      scoped = scoped.filter((p) => new Date(p.createdAt).getTime() <= t.getTime());
  }
  scoped = [...scoped].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const paged = paginate(scoped, paging.page, paging.limit);
  return NextResponse.json({
    ...paged,
    items: paged.items.map((p) => ({
      ...p,
      ledgerRef: `purchase:${p.id}`,
    })),
  });
}
