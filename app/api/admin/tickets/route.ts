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
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const assigneeId = url.searchParams.get("assigneeId");
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";

  const rows = (await db.orm.public.SupportTicket.select(
    "id",
    "userId",
    "subject",
    "status",
    "priority",
    "assigneeId",
    "updatedAt",
    "createdAt",
  )
    .limit(2000)
    .all()) as unknown as Array<{
    id: string;
    userId: string;
    subject: string;
    status: string;
    priority: string;
    assigneeId: string | null;
    updatedAt: Date | string;
    createdAt: Date | string;
  }>;
  let scoped = rows;
  if (status) scoped = scoped.filter((t) => t.status === status);
  if (priority) scoped = scoped.filter((t) => t.priority === priority);
  if (assigneeId) scoped = scoped.filter((t) => t.assigneeId === assigneeId);
  if (q) scoped = scoped.filter((t) => t.subject.toLowerCase().includes(q));
  scoped = [...scoped].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  return NextResponse.json(paginate(scoped, paging.page, paging.limit));
}
