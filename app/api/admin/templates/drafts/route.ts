import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-api";
import { db } from "@/lib/prisma";
import { TEMPLATE_LIST_DEFAULT, TEMPLATE_LIST_MAX } from "@/lib/templates";

const querySchema = z.object({
  status: z.enum(["open", "applied", "discarded"]).nullish(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(TEMPLATE_LIST_MAX)
    .default(TEMPLATE_LIST_DEFAULT),
});

export async function GET(request: Request) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    status: url.searchParams.get("status"),
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const all = (await db.orm.public.TemplateDraft.select(
    "id",
    "templateId",
    "status",
    "createdBy",
    "createdAt",
  )
    .limit(500)
    .all()) as unknown as Array<{
    id: string;
    templateId: string | null;
    status: string;
    createdBy: string;
    createdAt: Date | string;
  }>;
  let scoped = all;
  if (parsed.data.status)
    scoped = scoped.filter((d) => d.status === parsed.data.status);
  scoped = [...scoped].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const total = scoped.length;
  const start = (parsed.data.page - 1) * parsed.data.limit;
  return NextResponse.json({
    drafts: scoped.slice(start, start + parsed.data.limit),
    page: parsed.data.page,
    limit: parsed.data.limit,
    total,
    hasMore: start + parsed.data.limit < total,
  });
}
