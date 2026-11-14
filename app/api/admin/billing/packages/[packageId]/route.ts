import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-api";
import { logBillingAudit } from "@/lib/billing";
import { db } from "@/lib/prisma";

const patchSchema = z.object({
  priceXaf: z.number().int().min(100).optional(),
  credits: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  name: z.string().min(1).max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

type Ctx = { params: Promise<{ packageId: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const { packageId } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const existing = await db.orm.public.CreditPackage.where({
    id: packageId,
  }).first();
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const updated = (await db.orm.public.CreditPackage.where({
    id: packageId,
  }).update(parsed.data as never)) as unknown as { id: string };
  await logBillingAudit({
    userId: gate.user.id,
    action: "package.updated",
    targetType: "CreditPackage",
    targetId: packageId,
    details: parsed.data as Record<string, unknown>,
  });
  return NextResponse.json({ package: updated });
}
