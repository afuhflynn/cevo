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
  const feature = url.searchParams.get("feature");
  const model = url.searchParams.get("model");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const rows = (await db.orm.public.AiUsage.select(
    "id",
    "userId",
    "projectId",
    "operationType",
    "modelName",
    "inputTokens",
    "outputTokens",
    "providerCostUsd",
    "createdAt",
  )
    .limit(3000)
    .all()) as unknown as Array<{
    id: string;
    userId: string;
    projectId: string | null;
    operationType: string;
    modelName: string;
    inputTokens: number;
    outputTokens: number;
    providerCostUsd: number;
    createdAt: Date | string;
  }>;

  let scoped = rows;
  if (feature) scoped = scoped.filter((r) => r.operationType === feature);
  if (model) scoped = scoped.filter((r) => r.modelName === model);
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
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = scoped.filter(
    (r) => new Date(r.createdAt).getTime() >= sevenDaysAgo,
  );
  const byFeature: Record<string, { tokensIn: number; tokensOut: number; cost: number; runs: number }> = {};
  const byModel: Record<string, { tokensIn: number; tokensOut: number; cost: number; runs: number }> = {};
  for (const r of recent) {
    const f = byFeature[r.operationType] ?? { tokensIn: 0, tokensOut: 0, cost: 0, runs: 0 };
    f.tokensIn += r.inputTokens ?? 0;
    f.tokensOut += r.outputTokens ?? 0;
    f.cost += Number(r.providerCostUsd) ?? 0;
    f.runs += 1;
    byFeature[r.operationType] = f;
    const m = byModel[r.modelName] ?? { tokensIn: 0, tokensOut: 0, cost: 0, runs: 0 };
    m.tokensIn += r.inputTokens ?? 0;
    m.tokensOut += r.outputTokens ?? 0;
    m.cost += Number(r.providerCostUsd) ?? 0;
    m.runs += 1;
    byModel[r.modelName] = m;
  }
  for (const k of Object.keys(byFeature))
    byFeature[k]!.cost = Math.round(byFeature[k]!.cost * 100) / 100;
  for (const k of Object.keys(byModel))
    byModel[k]!.cost = Math.round(byModel[k]!.cost * 100) / 100;

  scoped = [...scoped].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const paged = paginate(scoped, paging.page, paging.limit);
  return NextResponse.json({
    ...paged,
    items: paged.items.map((r) => ({
      id: r.id,
      feature: r.operationType,
      model: r.modelName,
      tokensIn: r.inputTokens,
      tokensOut: r.outputTokens,
      costEst: Math.round(Number(r.providerCostUsd) * 100) / 100,
      userId: r.userId,
      project: r.projectId ?? "No project",
      createdAt: r.createdAt,
    })),
    totals7d: { byFeature, byModel },
  });
}
