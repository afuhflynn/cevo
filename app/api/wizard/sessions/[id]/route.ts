import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import {
  answersToBriefInput,
  computeReadiness,
  emptyReadiness,
  enumToFieldKey,
  estimateSynthesisCredits,
  readinessBlockedFields,
} from "@/lib/wizard";
import { getWalletBalance } from "@/lib/wizard-credits";
import { loadOwnedWizardSession } from "@/lib/wizard-guards";
import { suggestTemplateSafe } from "@/lib/wizard-session-view";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const { id } = await params;
  const loaded = await loadOwnedWizardSession({
    userId: user.id,
    role: user.role,
    sessionId: id,
    allowAdminRead: true,
  });
  if ("error" in loaded) {
    const status = loaded.error;
    return NextResponse.json(
      { error: status === 404 ? "NOT_FOUND" : "FORBIDDEN" },
      { status },
    );
  }
  const { session } = loaded;

  const turns = await db.orm.public.WizardTurn.select(
    "id",
    "fieldKey",
    "promptText",
    "answerText",
    "followupText",
    "isSufficient",
    "createdAt",
  )
    .where((r) => r.sessionId.eq(session.id))
    .orderBy((r) => r.createdAt.asc())
    .limit(500)
    .all();

  const answersByField: Record<string, string> = {};
  const followUpCounts: Record<string, number> = {};
  for (const t of turns) {
    const key =
      enumToFieldKey(String(t.fieldKey)) ?? String(t.fieldKey).toLowerCase();
    answersByField[key] = t.answerText;
    if (t.followupText) followUpCounts[key] = (followUpCounts[key] ?? 0) + 1;
  }

  const readiness =
    session.readiness && typeof session.readiness === "object"
      ? {
          ...emptyReadiness(),
          ...computeReadiness(answersByField),
          ...(session.readiness as Record<string, boolean>),
        }
      : computeReadiness(answersByField);
  const blocked = readinessBlockedFields(
    readiness as unknown as Parameters<typeof readinessBlockedFields>[0],
  );
  const briefInput = answersToBriefInput(
    answersByField as unknown as Parameters<typeof answersToBriefInput>[0],
  );
  const estimate = estimateSynthesisCredits(briefInput.length);
  const balance = await getWalletBalance(user.id);
  const suggestion = await suggestTemplateSafe(session.id, user.id);

  return NextResponse.json({
    session: {
      id: session.id,
      currentStep: session.currentStep,
      status: session.status,
      readiness,
      blocked,
      estimate,
      balance,
      sufficientBalance: balance >= estimate,
      suggestedTemplate: suggestion,
      currentBriefVersion: session.currentBriefVersion,
      expiresAt: new Date(session.expiresAt).toISOString(),
      readOnly: "readOnly" in loaded ? true : undefined,
    },
    turns: turns.map((t) => ({
      id: t.id,
      fieldKey:
        enumToFieldKey(String(t.fieldKey)) ?? String(t.fieldKey).toLowerCase(),
      promptText: t.promptText,
      answerText: t.answerText,
      followupText: t.followupText,
      isSufficient: t.isSufficient,
      createdAt: new Date(t.createdAt).toISOString(),
    })),
  });
}
