import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import { logWizardAudit } from "@/lib/wizard-credits";

export async function POST(request: Request) {
  const cronSecret = process.env["CRON_SECRET"];
  const provided = request.headers.get("x-cron-secret");
  let authorized = false;
  if (cronSecret && provided === cronSecret) {
    authorized = true;
  } else {
    const admin = await getAdminUser("/api/wizard/prune", "POST");
    authorized = admin !== null;
  }
  if (!authorized) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const ttlDays = Number.parseInt(
    process.env["WIZARD_SESSION_TTL_DAYS"] ?? "30",
    10,
  );
  const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000);
  const active = await db.orm.public.WizardSession.select(
    "id",
    "status",
    "updatedAt",
  )
    .where((r) =>
      r.status.in([
        "DRAFT",
        "CHATTING",
        "SYNTHESIZING",
        "AWAITING_APPROVAL",
      ] as never),
    )
    .where((r) => r.updatedAt.lt(cutoff))
    .limit(500)
    .all();

  let expired = 0;
  for (const s of active) {
    await db.orm.public.WizardSession.where({ id: s.id }).update({
      status: "EXPIRED" as never,
    });
    expired += 1;
  }

  const pruneCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const oldApproved = await db.orm.public.WizardSession.select("id")
    .where((r) => r.status.eq("APPROVED" as never))
    .where((r) => r.updatedAt.lt(pruneCutoff))
    .limit(500)
    .all();
  let prunedTurns = 0;
  for (const s of oldApproved) {
    const turns = await db.orm.public.WizardTurn.select("id")
      .where((r) => r.sessionId.eq(s.id))
      .limit(1000)
      .all();
    for (const t of turns) {
      await db.orm.public.WizardTurn.where({ id: t.id }).delete();
      prunedTurns += 1;
    }
  }

  await logWizardAudit({
    userId: null,
    action: "wizard.prune",
    targetType: "WizardSession",
    targetId: "schedule",
    details: { expired, prunedTurns },
  });

  return NextResponse.json({ expired, prunedTurns });
}
