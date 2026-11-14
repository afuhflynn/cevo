import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-api";
import { logBillingAudit } from "@/lib/billing";
import { db } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  priceXaf: z.number().int().min(100),
  credits: z.number().int().min(1),
  isPopular: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export async function GET(request: Request) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const url = new URL(request.url);
  const page = Math.max(
    1,
    Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1,
  );
  const rows = (await db.orm.public.CreditPackage.select(
    "id",
    "name",
    "priceXaf",
    "credits",
    "isPopular",
    "isActive",
    "sortOrder",
  )
    .orderBy((r) => r.sortOrder.asc())
    .limit(200)
    .all()) as unknown as Array<Record<string, unknown>>;
  const total = rows.length;
  const start = (page - 1) * 20;
  return NextResponse.json({
    packages: rows.slice(start, start + 20),
    page,
    limit: 20,
    total,
    hasMore: start + 20 < total,
  });
}

export async function POST(request: Request) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const created = (await db.orm.public.CreditPackage.create({
    name: parsed.data.name,
    priceXaf: parsed.data.priceXaf,
    credits: parsed.data.credits,
    isPopular: parsed.data.isPopular,
    isActive: parsed.data.isActive,
    sortOrder: parsed.data.sortOrder,
  })) as unknown as { id: string };
  await logBillingAudit({
    userId: gate.user.id,
    action: "package.created",
    targetType: "CreditPackage",
    targetId: created.id,
    details: {
      name: parsed.data.name,
      priceXaf: parsed.data.priceXaf,
      credits: parsed.data.credits,
    },
  });
  return NextResponse.json({ package: created }, { status: 201 });
}
