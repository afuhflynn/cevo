import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { pageParams, paginate } from "@/lib/admin";
import { db } from "@/lib/prisma";

export async function GET(request: Request) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const url = new URL(request.url);
  const paging = pageParams(url);
  if ("error" in paging)
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 422 });
  const action = url.searchParams.get("action");
  const actorId = url.searchParams.get("actorId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const rows = (await db.orm.public.AuditEvent.select(
    "id",
    "userId",
    "action",
    "targetType",
    "targetId",
    "createdAt",
  )
    .limit(2000)
    .all()) as unknown as Array<{
    id: string;
    userId: string | null;
    action: string;
    targetType: string;
    targetId: string;
    createdAt: Date | string;
  }>;
  let scoped = rows;
  if (action) scoped = scoped.filter((r) => r.action === action);
  if (actorId) scoped = scoped.filter((r) => r.userId === actorId);
  if (from) {
    const f = new Date(from);
    if (!Number.isNaN(f.getTime()))
      scoped = scoped.filter(
        (r) => new Date(r.createdAt).getTime() >= f.getTime(),
      );
  }
  if (to) {
    const t = new Date(to);
    if (!Number.isNaN(t.getTime()))
      scoped = scoped.filter(
        (r) => new Date(r.createdAt).getTime() <= t.getTime(),
      );
  }
  scoped = [...scoped].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const userIds = [...new Set(scoped.slice(0, 200).map((r) => r.userId).filter(Boolean))] as string[];
  const users = userIds.length
    ? ((await db.orm.public.User.select("id", "name", "email", "role")
        .limit(500)
        .all()) as unknown as Array<{
        id: string;
        name: string;
        email: string;
        role: string;
      }>).filter((u) => userIds.includes(u.id))
    : [];
  const byId = new Map(users.map((u) => [u.id, u]));
  const paged = paginate(scoped, paging.page, paging.limit);
  return NextResponse.json({
    ...paged,
    items: paged.items.map((r) => ({
      ...r,
      actor: r.userId ? (byId.get(r.userId) ?? { id: r.userId }) : null,
    })),
  });
}
