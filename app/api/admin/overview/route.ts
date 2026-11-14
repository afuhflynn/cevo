import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import {
  readFreshOverviewCache,
  readOverviewCache,
  writeOverviewCache,
} from "@/lib/admin";
import { db } from "@/lib/prisma";

export async function GET(request: Request) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;

  const fresh = readFreshOverviewCache();
  if (fresh) return NextResponse.json({ ...fresh, cached: true });

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const users = (await db.orm.public.User.select("id", "createdAt")
      .limit(5000)
      .all()) as unknown as Array<{ id: string; createdAt: Date | string }>;
    const newUsers7d = users.filter(
      (u) => new Date(u.createdAt).getTime() >= sevenDaysAgo.getTime(),
    ).length;

    const payments = (await db.orm.public.Payment.select(
      "id",
      "status",
      "amountXaf",
      "completedAt",
      "createdAt",
    )
      .limit(5000)
      .all()) as unknown as Array<{
      id: string;
      status: string;
      amountXaf: number;
      completedAt: Date | string | null;
      createdAt: Date | string;
    }>;
    const successfulRecent = payments.filter(
      (p) =>
        p.status === "SUCCESSFUL" &&
        p.completedAt &&
        new Date(p.completedAt).getTime() >= sevenDaysAgo.getTime(),
    );
    const revenue7d = successfulRecent.reduce(
      (sum, p) => sum + (p.amountXaf ?? 0),
      0,
    );

    const aiRows = (await db.orm.public.AiUsage.select(
      "id",
      "inputTokens",
      "outputTokens",
      "providerCostUsd",
      "createdAt",
    )
      .limit(5000)
      .all()) as unknown as Array<{
      id: string;
      inputTokens: number;
      outputTokens: number;
      providerCostUsd: number;
      createdAt: Date | string;
    }>;
    const aiRecent = aiRows.filter(
      (r) => new Date(r.createdAt).getTime() >= sevenDaysAgo.getTime(),
    );
    const aiTokensIn7d = aiRecent.reduce((s, r) => s + (r.inputTokens ?? 0), 0);
    const aiTokensOut7d = aiRecent.reduce(
      (s, r) => s + (r.outputTokens ?? 0),
      0,
    );
    const aiCost7d = aiRecent.reduce(
      (s, r) => s + (Number(r.providerCostUsd) ?? 0),
      0,
    );

    const tickets = (await db.orm.public.SupportTicket.select("id", "status")
      .limit(2000)
      .all()) as unknown as Array<{ id: string; status: string }>;
    const openTickets = tickets.filter(
      (t) => t.status === "OPEN" || t.status === "IN_PROGRESS",
    ).length;

    const versions = (await db.orm.public.TemplateVersion.select(
      "id",
      "isPublished",
    )
      .limit(2000)
      .all()) as unknown as Array<{ id: string; isPublished: boolean }>;
    const unpublishedVersions = versions.filter((v) => !v.isPublished).length;
    const drafts = (await db.orm.public.TemplateDraft.select("id", "status")
      .limit(2000)
      .all()) as unknown as Array<{ id: string; status: string }>;
    const openDrafts = drafts.filter((d) => d.status === "open").length;

    // Mismatch check: today UTC confirmed credits vs allocated ledger credits.
    const todayStr = new Date().toISOString().slice(0, 10);
    const dayStart = new Date(`${todayStr}T00:00:00.000Z`).getTime();
    const dayEnd = new Date(`${todayStr}T23:59:59.999Z`).getTime();
    const confirmedToday = payments.filter(
      (p) =>
        p.status === "SUCCESSFUL" &&
        p.completedAt &&
        new Date(p.completedAt).getTime() >= dayStart &&
        new Date(p.completedAt).getTime() <= dayEnd,
    );
    const fullPayments = (await db.orm.public.Payment.select(
      "id",
      "creditsAllocated",
      "status",
      "completedAt",
    )
      .limit(5000)
      .all()) as unknown as Array<{
      id: string;
      creditsAllocated: number;
      status: string;
      completedAt: Date | string | null;
    }>;
    const confirmedCredits = fullPayments
      .filter(
        (p) =>
          p.status === "SUCCESSFUL" &&
          p.completedAt &&
          new Date(p.completedAt).getTime() >= dayStart &&
          new Date(p.completedAt).getTime() <= dayEnd,
      )
      .reduce((s, p) => s + (p.creditsAllocated ?? 0), 0);
    const ledgers = (await db.orm.public.CreditLedger.select(
      "id",
      "type",
      "amount",
      "createdAt",
    )
      .limit(5000)
      .all()) as unknown as Array<{
      id: string;
      type: string;
      amount: number;
      createdAt: Date | string;
    }>;
    const allocatedToday = ledgers
      .filter(
        (l) =>
          l.type === "CREDIT_PURCHASE" &&
          new Date(l.createdAt).getTime() >= dayStart &&
          new Date(l.createdAt).getTime() <= dayEnd,
      )
      .reduce((s, l) => s + (l.amount ?? 0), 0);
    const mismatch = confirmedCredits !== allocatedToday;
    // 15 minute grace past day close: only raise while today is still open
    // or within grace; at this scope home shows live flag without date param.
    const mismatchAlert = mismatch && confirmedToday.length > 0;

    const audits = (await db.orm.public.AuditEvent.select(
      "id",
      "action",
      "targetType",
      "targetId",
      "createdAt",
      "userId",
    )
      .limit(20)
      .all()) as unknown as Array<{
      id: string;
      action: string;
      targetType: string;
      targetId: string;
      createdAt: Date | string;
      userId: string | null;
    }>;
    const recentAudit = [...audits]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 20);

    const payload = {
      newUsers7d,
      revenue7d,
      aiTokensIn7d,
      aiTokensOut7d,
      aiCost7d: Math.round(aiCost7d * 100) / 100,
      openTickets,
      pendingTemplates: {
        unpublishedVersions,
        openDrafts,
      },
      mismatchAlert,
      mismatchDetail: mismatch
        ? { confirmedCredits, allocatedToday, date: todayStr }
        : null,
      recentAudit,
      lastComputedAt: new Date().toISOString(),
      stale: false,
    };
    writeOverviewCache(payload);
    return NextResponse.json({ ...payload, cached: false });
  } catch {
    const stale = readOverviewCache();
    if (stale)
      return NextResponse.json({ ...stale, stale: true, cached: true });
    return NextResponse.json({ error: "OVERVIEW_FAILED" }, { status: 500 });
  }
}
