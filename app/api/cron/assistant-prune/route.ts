import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth-helpers";
import {
  ASSISTANT_HISTORY_PAGE_SIZE,
  ASSISTANT_RETENTION_DAYS,
} from "@/lib/assistant";
import { db } from "@/lib/prisma";
import { logAssistantAudit } from "@/lib/assistant";

export async function POST(request: Request) {
  const cronSecret = process.env["CRON_SECRET"];
  const provided = request.headers.get("x-cron-secret");
  let authorized = false;
  if (cronSecret && provided === cronSecret) {
    authorized = true;
  } else {
    const admin = await getAdminUser("/api/cron/assistant-prune", "POST");
    authorized = admin !== null;
  }
  if (!authorized) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const cutoff = new Date(
    Date.now() - ASSISTANT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  // Collect candidate sections from runs older than retention.
  const oldRuns = await db.orm.public.AiAssistRun.select(
    "id",
    "sectionId",
    "createdAt",
  )
    .where((r) => r.createdAt.lt(cutoff))
    .limit(2000)
    .all();
  const bySection = new Map<string, { id: string; createdAt: Date }[]>();
  for (const r of oldRuns) {
    const list = bySection.get(r.sectionId) ?? [];
    list.push({ id: r.id, createdAt: new Date(r.createdAt) });
    bySection.set(r.sectionId, list);
  }
  let prunedRuns = 0;
  for (const [sectionId, olds] of bySection) {
    // Shield the newest 20 runs per section; prune only older overflow.
    const newest = await db.orm.public.AiAssistRun.select("id")
      .where((r) => r.sectionId.eq(sectionId))
      .orderBy((r) => r.createdAt.desc())
      .limit(ASSISTANT_HISTORY_PAGE_SIZE + olds.length)
      .all();
    const keep = new Set(
      newest.slice(0, ASSISTANT_HISTORY_PAGE_SIZE).map((r) => r.id),
    );
    for (const r of olds) {
      if (keep.has(r.id)) continue;
      const suggestions = await db.orm.public.AiSuggestion.select("id")
        .where((s) => s.runId.eq(r.id))
        .limit(500)
        .all();
      for (const s of suggestions) {
        await db.orm.public.AiSuggestion.where({ id: s.id }).delete();
      }
      await db.orm.public.AiAssistRun.where({ id: r.id }).delete();
      prunedRuns += 1;
    }
  }
  await logAssistantAudit({
    userId: null,
    action: "assistant.prune",
    targetType: "AiAssistRun",
    targetId: "schedule",
    details: { prunedRuns },
  });
  return NextResponse.json({ prunedRuns });
}
