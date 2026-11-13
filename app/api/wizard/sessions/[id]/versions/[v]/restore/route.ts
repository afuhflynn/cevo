import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import { briefPayloadSchema } from "@/lib/wizard";
import { logWizardAudit } from "@/lib/wizard-credits";
import { loadOwnedWizardSession } from "@/lib/wizard-guards";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; v: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const { id, v } = await params;
  const versionNum = Number.parseInt(v, 10);
  if (!Number.isFinite(versionNum) || versionNum < 1) {
    return NextResponse.json({ error: "INVALID_VERSION" }, { status: 422 });
  }
  const loaded = await loadOwnedWizardSession({
    userId: user.id,
    role: user.role,
    sessionId: id,
    allowAdminRead: false,
  });
  if ("error" in loaded) {
    const status = loaded.error;
    return NextResponse.json(
      { error: status === 404 ? "NOT_FOUND" : "FORBIDDEN" },
      { status },
    );
  }
  const { session } = loaded;
  if (session.status === "APPROVED") {
    return NextResponse.json({ error: "ALREADY_APPROVED" }, { status: 409 });
  }
  if (!session.projectId) {
    return NextResponse.json({ error: "NO_PROJECT" }, { status: 422 });
  }
  const brief = await db.orm.public.ProjectBrief.where({
    projectId: session.projectId,
  }).first();
  if (!brief) {
    return NextResponse.json({ error: "NO_BRIEF" }, { status: 404 });
  }
  const source = await db.orm.public.BriefVersion.where({
    briefId: brief.id,
  })
    .where((r) => r.version.eq(versionNum))
    .first();
  if (!source) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const payloadCheck = briefPayloadSchema.safeParse(source.payload);
  if (!payloadCheck.success) {
    return NextResponse.json({ error: "CORRUPT_VERSION" }, { status: 422 });
  }
  const nextVersion = (brief.version ?? 0) + 1;
  const payload = payloadCheck.data;

  await db.transaction(async (tx) => {
    await tx.orm.public.BriefVersion.create({
      briefId: brief.id,
      version: nextVersion,
      payload: source.payload as unknown as never,
      modelId: source.modelId ?? undefined,
      tokenCost: source.tokenCost ?? 0,
    });
    await tx.orm.public.ProjectBrief.where({ id: brief.id }).update({
      background: payload.background,
      problemStatement: payload.problemStatement,
      aim: payload.aim,
      objectives: payload.objectives as unknown as never,
      researchQuestions: payload.researchQuestions as unknown as never,
      scope: payload.scope,
      limitations: payload.limitations,
      methodology: payload.methodology,
      expectedOutcomes: payload.expectedOutcomes,
      version: nextVersion,
    });
    await tx.orm.public.WizardSession.where({ id: session.id }).update({
      currentBriefVersion: nextVersion,
      status: "AWAITING_APPROVAL" as never,
    });
  });

  await logWizardAudit({
    userId: user.id,
    action: "wizard.version.restored",
    targetType: "WizardSession",
    targetId: session.id,
    details: { from: versionNum, to: nextVersion },
  });

  return NextResponse.json({ version: nextVersion }, { status: 201 });
}
