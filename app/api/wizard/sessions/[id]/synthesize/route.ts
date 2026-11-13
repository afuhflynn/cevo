import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { Output, streamText } from "ai";
import { NextResponse } from "next/server";
import { checkWizardRateLimit } from "@/lib/arcjet";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import {
  answersToBriefInput,
  briefPayloadSchema,
  computeReadiness,
  enumToFieldKey,
  estimateSynthesisCredits,
  readinessBlockedFields,
  WIZARD_SYNTHESIS_DAILY_CAP,
  type WizardFieldKey,
} from "@/lib/wizard";
import {
  debitSynthesis,
  getWalletBalance,
  logWizardAudit,
  refundSynthesis,
} from "@/lib/wizard-credits";
import { clientIp, loadOwnedWizardSession } from "@/lib/wizard-guards";

const DRAFT_MODEL =
  process.env["OPENROUTER_DRAFT_MODEL"] ?? "deepseek/deepseek-v4.1-flash-1017";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const { id } = await params;
  if (!(await checkWizardRateLimit(request, "wizard-synthesis"))) {
    await logWizardAudit({
      userId: user.id,
      action: "wizard.synthesis.rate_limited",
      targetType: "WizardSession",
      targetId: id,
      details: { tier: "hourly-burst" },
      ipAddress: await clientIp(),
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
  if (session.status === "APPROVED") {
    return NextResponse.json({ error: "ALREADY_APPROVED" }, { status: 409 });
  }
  if (["ABANDONED", "EXPIRED"].includes(session.status)) {
    return NextResponse.json({ error: "SESSION_CLOSED" }, { status: 409 });
  }
  if (!session.projectId) {
    return NextResponse.json({ error: "NO_PROJECT" }, { status: 422 });
  }

  const turns = await db.orm.public.WizardTurn.select("fieldKey", "answerText")
    .where((r) => r.sessionId.eq(session.id))
    .orderBy((r) => r.createdAt.asc())
    .limit(500)
    .all();
  const answersByField = {} as Record<WizardFieldKey, string>;
  for (const t of turns) {
    const key = enumToFieldKey(String(t.fieldKey));
    if (key) answersByField[key] = t.answerText;
  }
  const readiness = computeReadiness(answersByField);
  const blocked = readinessBlockedFields(readiness);
  if (blocked.length > 0) {
    await logWizardAudit({
      userId: user.id,
      action: "wizard.synthesis.blocked",
      targetType: "WizardSession",
      targetId: session.id,
      details: { blocked },
      ipAddress: await clientIp(),
    });
    return NextResponse.json(
      { error: "INSUFFICIENT_DETAIL", blocked },
      { status: 422 },
    );
  }

  const briefInput = answersToBriefInput(answersByField);
  const estimate = estimateSynthesisCredits(briefInput.length);
  const balance = await getWalletBalance(user.id);
  if (balance < estimate) {
    return NextResponse.json(
      { error: "INSUFFICIENT_CREDITS", estimate, balance },
      { status: 402 },
    );
  }

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentRuns = await db.orm.public.AiUsage.select("id")
    .where((r) => r.userId.eq(user.id))
    .where((r) => r.operationType.eq("wizard_synthesis"))
    .where((r) => r.createdAt.gte(dayAgo))
    .limit(WIZARD_SYNTHESIS_DAILY_CAP + 1)
    .all();
  if (recentRuns.length >= WIZARD_SYNTHESIS_DAILY_CAP) {
    await logWizardAudit({
      userId: user.id,
      action: "wizard.synthesis.rate_limited",
      targetType: "WizardSession",
      targetId: session.id,
      details: { cap: WIZARD_SYNTHESIS_DAILY_CAP },
      ipAddress: await clientIp(),
    });
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const briefRow = await db.orm.public.ProjectBrief.where({
    projectId: session.projectId,
  }).first();
  if (!briefRow) {
    return NextResponse.json({ error: "NO_BRIEF" }, { status: 422 });
  }
  const nextVersion = (briefRow.version ?? 0) + 1;
  const referenceId = `wizard:${session.id}:v${nextVersion}`;

  const debit = await debitSynthesis(user.id, referenceId, estimate, {
    sessionId: session.id,
    version: nextVersion,
    estimate,
  });
  if (!debit.ok) {
    return NextResponse.json(
      { error: "INSUFFICIENT_CREDITS", estimate, balance },
      { status: 402 },
    );
  }

  await db.orm.public.WizardSession.where({ id: session.id }).update({
    status: "SYNTHESIZING" as never,
    currentStep: Math.max(session.currentStep, 4),
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (obj: unknown) =>
        controller.enqueue(
          new TextEncoder().encode(`${JSON.stringify(obj)}\n`),
        );
      const startedAt = Date.now();
      try {
        if (!process.env["OPENROUTER_API_KEY"]) {
          throw new Error("PROVIDER_NOT_CONFIGURED");
        }
        const openrouter = createOpenRouter({
          apiKey: process.env["OPENROUTER_API_KEY"],
        });
        const result = streamText({
          model: openrouter(DRAFT_MODEL),
          output: Output.object({ schema: briefPayloadSchema }),
          system:
            "You are an academic writing assistant. Synthesize the student's notes into a polished project brief. Keep each field faithful to their words, fix grammar, and expand thin spots modestly without inventing new facts.",
          prompt: `Synthesize this student material into a structured project brief:\n\n${briefInput}`,
        });
        for await (const partial of result.partialOutputStream) {
          if (request.signal.aborted) break;
          encode({ type: "partial", partial });
        }
        if (request.signal.aborted) {
          encode({ type: "aborted" });
          controller.close();
          return;
        }
        const output = await result.output;
        const usage = await result.totalUsage;
        const tokenCost = (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);

        const saved = await db.transaction(async (tx) => {
          const versionRow = await tx.orm.public.BriefVersion.create({
            briefId: briefRow.id,
            version: nextVersion,
            payload: output as unknown as never,
            modelId: DRAFT_MODEL,
            tokenCost,
          });
          await tx.orm.public.ProjectBrief.where({ id: briefRow.id }).update({
            background: output.background,
            problemStatement: output.problemStatement,
            aim: output.aim,
            objectives: output.objectives as unknown as never,
            researchQuestions: output.researchQuestions as unknown as never,
            scope: output.scope,
            limitations: output.limitations,
            methodology: output.methodology,
            expectedOutcomes: output.expectedOutcomes,
            version: nextVersion,
            modelId: DRAFT_MODEL,
            synthesisCost: estimate,
          });
          await tx.orm.public.WizardSession.where({ id: session.id }).update({
            status: "AWAITING_APPROVAL" as never,
            currentBriefVersion: nextVersion,
            currentStep: Math.max(session.currentStep, 4),
          });
          return versionRow;
        });

        await db.orm.public.AiUsage.create({
          userId: user.id,
          projectId: session.projectId ?? undefined,
          operationType: "wizard_synthesis",
          provider: "openrouter",
          modelName: DRAFT_MODEL,
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          totalTokens: tokenCost,
          providerCostUsd: 0,
          creditsCharged: estimate,
          durationMs: Date.now() - startedAt,
          status: "completed",
        });

        await logWizardAudit({
          userId: user.id,
          action: "wizard.synthesis.completed",
          targetType: "WizardSession",
          targetId: session.id,
          details: {
            version: nextVersion,
            modelId: DRAFT_MODEL,
            tokenCost,
            credits: estimate,
          },
        });

        encode({
          type: "done",
          version: saved.version,
          modelId: DRAFT_MODEL,
          tokenCost,
          credits: estimate,
        });
        controller.close();
      } catch (error) {
        await refundSynthesis(user.id, referenceId, estimate, {
          sessionId: session.id,
          version: nextVersion,
          reason: error instanceof Error ? error.message : "provider failure",
        });
        await db.orm.public.WizardSession.where({ id: session.id }).update({
          status: "CHATTING" as never,
        });
        await logWizardAudit({
          userId: user.id,
          action: "wizard.synthesis.failed",
          targetType: "WizardSession",
          targetId: session.id,
          details: {
            version: nextVersion,
            reason: error instanceof Error ? error.message : "unknown",
          },
        });
        try {
          encode({
            type: "error",
            code: "PROVIDER_FAILURE",
            message:
              "Synthesis failed and your credits were refunded. Try again.",
          });
          controller.close();
        } catch {
          // stream already torn down
        }
      }
    },
    cancel() {
      void (async () => {
        await refundSynthesis(user.id, referenceId, estimate, {
          sessionId: session.id,
          version: nextVersion,
          reason: "client-abort",
        }).catch(() => undefined);
        await db.orm.public.WizardSession.where({ id: session.id })
          .update({ status: "CHATTING" as never })
          .catch(() => undefined);
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
}
