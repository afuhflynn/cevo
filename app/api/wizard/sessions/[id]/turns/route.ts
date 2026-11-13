import { NextResponse } from "next/server";
import { checkWizardRateLimit } from "@/lib/arcjet";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import {
  checkFieldSufficient,
  computeReadiness,
  enumToFieldKey,
  FIELD_PROMPTS,
  fieldKeyToEnum,
  followUpFor,
  WIZARD_FIELD_KEYS,
  type WizardFieldKey,
} from "@/lib/wizard";
import { logWizardAudit } from "@/lib/wizard-credits";
import { loadOwnedWizardSession } from "@/lib/wizard-guards";
import { turnSchema } from "@/lib/wizard-validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const { id } = await params;
  if (!(await checkWizardRateLimit(request, "wizard-turn"))) {
    await logWizardAudit({
      userId: user.id,
      action: "wizard.turn.rate_limited",
      targetType: "WizardSession",
      targetId: id,
    });
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
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
  if (["APPROVED", "ABANDONED", "EXPIRED"].includes(session.status)) {
    return NextResponse.json({ error: "SESSION_CLOSED" }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const parsed = turnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_FIELD", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const { fieldKey, answerText } = parsed.data;

  const prior = await db.orm.public.WizardTurn.select("id", "followupText")
    .where((r) => r.sessionId.eq(session.id))
    .where((r) => r.fieldKey.eq(fieldKeyToEnum(fieldKey) as never))
    .orderBy((r) => r.createdAt.desc())
    .limit(50)
    .all();
  const priorFollowUps = prior.filter((t) => t.followupText).length;

  const { sufficient } = checkFieldSufficient(
    fieldKey as WizardFieldKey,
    answerText,
  );
  const followupText =
    followUpFor(fieldKey as WizardFieldKey, answerText, priorFollowUps) ??
    undefined;

  const turn = await db.orm.public.WizardTurn.create({
    sessionId: session.id,
    fieldKey: fieldKeyToEnum(fieldKey) as never,
    promptText: FIELD_PROMPTS[fieldKey as WizardFieldKey].prompt,
    answerText,
    followupText,
    isSufficient: sufficient,
  });

  const latestTurns = await db.orm.public.WizardTurn.select(
    "fieldKey",
    "answerText",
  )
    .where((r) => r.sessionId.eq(session.id))
    .orderBy((r) => r.createdAt.asc())
    .limit(500)
    .all();
  const answersByField: Partial<Record<WizardFieldKey, string>> = {};
  for (const t of latestTurns) {
    const key = enumToFieldKey(String(t.fieldKey));
    if (key) answersByField[key] = t.answerText;
  }
  const readiness = computeReadiness(answersByField);

  const nextStatus = session.status === "DRAFT" ? "CHATTING" : session.status;
  const answeredCount = WIZARD_FIELD_KEYS.filter(
    (k) => (answersByField[k] ?? "").trim().length > 0,
  ).length;
  const nextStep =
    session.currentStep < 3 && answeredCount > 0
      ? 3
      : Math.max(session.currentStep, 1);

  await db.orm.public.WizardSession.where({ id: session.id }).update({
    readiness: readiness as unknown as never,
    status: nextStatus as never,
    currentStep: nextStep,
  });

  await logWizardAudit({
    userId: user.id,
    action: "wizard.turn.saved",
    targetType: "WizardSession",
    targetId: session.id,
    details: { fieldKey, sufficient },
  });

  return NextResponse.json(
    {
      turnId: turn.id,
      fieldKey,
      isSufficient: sufficient,
      followupText: followupText ?? null,
      readiness,
    },
    { status: 201 },
  );
}
