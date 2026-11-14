import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { logAdminAudit, maskEmail, pageParams, paginate } from "@/lib/admin";
import { db } from "@/lib/prisma";

export async function GET(request: Request) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const url = new URL(request.url);
  const paging = pageParams(url);
  if ("error" in paging)
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 422 });
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const role = url.searchParams.get("role");
  const status = url.searchParams.get("status");
  const institutionId = url.searchParams.get("institutionId");

  const users = (await db.orm.public.User.select(
    "id",
    "name",
    "email",
    "role",
    "isActive",
    "createdAt",
  )
    .limit(2000)
    .all()) as unknown as Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: Date | string;
  }>;

  const wallets = (await db.orm.public.CreditWallet.select(
    "userId",
    "balance",
  )
    .limit(5000)
    .all()) as unknown as Array<{ userId: string; balance: number }>;
  const balanceByUser = new Map(wallets.map((w) => [w.userId, w.balance]));

  let institutionUserIds: Set<string> | null = null;
  if (institutionId) {
    const profiles = (await db.orm.public.AcademicProfile.select(
      "userId",
      "institutionId",
    )
      .limit(5000)
      .all()) as unknown as Array<{
      userId: string;
      institutionId: string | null;
    }>;
    institutionUserIds = new Set(
      profiles
        .filter((p) => p.institutionId === institutionId)
        .map((p) => p.userId),
    );
  }

  let scoped = users;
  if (q)
    scoped = scoped.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  if (role) scoped = scoped.filter((u) => u.role === role);
  if (status === "active") scoped = scoped.filter((u) => u.isActive);
  if (status === "suspended") scoped = scoped.filter((u) => !u.isActive);
  if (institutionUserIds)
    scoped = scoped.filter((u) => institutionUserIds!.has(u.id));
  scoped = [...scoped].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const paged = paginate(scoped, paging.page, paging.limit);
  return NextResponse.json({
    ...paged,
    items: paged.items.map((u) => ({
      id: u.id,
      name: u.name,
      emailMasked: maskEmail(u.email),
      role: u.role,
      isActive: u.isActive,
      institutionId: null,
      createdAt: u.createdAt,
      balance: balanceByUser.get(u.id) ?? 0,
    })),
  });
}
