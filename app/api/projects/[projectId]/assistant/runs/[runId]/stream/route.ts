import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { Output, streamText } from "ai";
import { NextResponse } from "next/server";
import {
  ASSISTANT_STREAM_TIMEOUT_MS,
  actualCreditsFromUsage,
  getAssistantRate,
  hashAssistantInput,
  logAssistantAudit,
  refundAssistantHold,
  settleAssistantHold,
} from "@/lib/assistant";
import {
  ASSISTANT_SYSTEM_PROMPTS,
  assistantOutputSchema,
  isAssistantOperation,
  type AssistantOperation,
} from "@/lib/assistant-prompts";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import { clientIp, loadOwnedProject } from "@/lib/workspace";

const DRAFT_MODEL =
  process.env["OPENROUTER_DRAFT_MODEL"] ?? "deepseek/deepseek-v4.1-flash-1017";

type Ctx = { params: Promise<{ projectId: string; runId: string }> };

function toParagraphEvents(output: { paragraphs?: unknown[] }) {
  const list = Array.isArray(output.paragraphs) ? output.paragraphs : [];
  return list.filter(
    (
      p,
    ): p is {
      paragraphIndex: number;
      originalText: string;
      revisedText: string;
      warnings?: unknown[];
    } =>
      !!p &&
      typeof p === "object" &&
      typeof (p as Record<string, unknown>)["originalText"] === "string" &&
      typeof (p as Record<string, unknown>)["revisedText"] === "string" &&
      typeof (p as Record<string, unknown>)["paragraphIndex"] === "number",
  );
}

export async function GET(_request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId, runId } = await params;
  const owned = await loadOwnedProject({
    userId: user.id,
    role: user.role,
    projectId,
    allowAdminRead: true,
  });
  if (!owned.ok) {
    const status = owned.error;
    return NextResponse.json(
      { error: status === 404 ? "NOT_FOUND" : "FORBIDDEN" },
      { status },
    );
  }
  const run = await db.orm.public.AiAssistRun.where({ id: runId }).first();
  if (!run || run.projectId !== projectId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (!isAssistantOperation(run.operation)) {
    return NextResponse.json({ error: "INVALID_OPERATION" }, { status: 422 });
  }
  const operation = run.operation as AssistantOperation;

  // Reconnect path: a finished run replays its stored paragraphs so refresh
  // never loses visible suggestions.
  if (
    run.status === "succeeded" ||
    run.status === "accepted" ||
    run.status === "discarded"
  ) {
    const stored = await db.orm.public.AiSuggestion.select(
      "paragraphIndex",
      "originalText",
      "revisedText",
      "warnings",
      "status",
    )
      .where((r) => r.runId.eq(run.id))
      .orderBy((r) => r.paragraphIndex.asc())
      .limit(200)
      .all();
    const stream = new ReadableStream({
      start(controller) {
        const encode = (obj: unknown) =>
          controller.enqueue(
            new TextEncoder().encode(`${JSON.stringify(obj)}\n`),
          );
        for (const s of stored) {
          encode({
            type: "paragraph",
            paragraphIndex: s.paragraphIndex,
            originalText: s.originalText,
            revisedText: s.revisedText,
            warnings: s.warnings ?? [],
          });
        }
        encode({
          type: "done",
          modelId: run.modelId ?? DRAFT_MODEL,
          tokenCost: run.tokenCost,
          actualCredits: run.actualCredits,
          replayed: true,
        });
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
      },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (obj: unknown) =>
        controller.enqueue(
          new TextEncoder().encode(`${JSON.stringify(obj)}\n`),
        );
      const startedAt = Date.now();
      const aborter = new AbortController();
      const timeout = setTimeout(
        () => aborter.abort(),
        ASSISTANT_STREAM_TIMEOUT_MS,
      );
      const seen = new Map<
        number,
        { originalText: string; revisedText: string; warnings: unknown[] }
      >();
      try {
        if (!process.env["OPENROUTER_API_KEY"]) {
          throw new Error("PROVIDER_NOT_CONFIGURED");
        }
        await db.orm.public.AiAssistRun.where({ id: run.id }).update({
          status: "streaming" as never,
        });
        const openrouter = createOpenRouter({
          apiKey: process.env["OPENROUTER_API_KEY"],
        });
        const numbered = run.inputText
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p, i) => `[${i}] ${p}`)
          .join("\n\n");
        const result = streamText({
          model: openrouter(DRAFT_MODEL),
          output: Output.object({ schema: assistantOutputSchema }),
          abortSignal: aborter.signal,
          system: `${ASSISTANT_SYSTEM_PROMPTS[operation]} Return one entry per input paragraph with its index, the original text copied exactly, a revised text, and warnings (empty for tone and polish; real flags for review). Never merge or reorder paragraphs.`,
          prompt: `Operation: ${operation}\nScope: ${run.scope}\nRevise these paragraphs:\n\n${numbered}`,
        });
        for await (const partial of result.partialOutputStream) {
          if (aborter.signal.aborted) break;
          const parsed = assistantOutputSchema.safeParse(partial);
          if (!parsed.success) continue;
          for (const p of toParagraphEvents(parsed.data)) {
            if (seen.has(p.paragraphIndex)) continue;
            seen.set(p.paragraphIndex, {
              originalText: p.originalText,
              revisedText: p.revisedText,
              warnings: Array.isArray(p.warnings) ? p.warnings : [],
            });
            encode({
              type: "paragraph",
              paragraphIndex: p.paragraphIndex,
              originalText: p.originalText,
              revisedText: p.revisedText,
              warnings: Array.isArray(p.warnings) ? p.warnings : [],
            });
          }
        }
        clearTimeout(timeout);
        if (aborter.signal.aborted) {
          await persistPartial(run.id, seen, "failed");
          await failRun(
            run.id,
            run.userId,
            projectId,
            run.estimateCredits,
            "STREAM_TIMEOUT",
          );
          encode({
            type: "error",
            code: "STREAM_TIMEOUT",
            message:
              "The run hit the 90 second cap. Partial paragraphs were kept; retry for the rest.",
            partialKept: true,
          });
          controller.close();
          return;
        }
        const output = await result.output;
        for (const p of toParagraphEvents(output)) {
          if (seen.has(p.paragraphIndex)) continue;
          seen.set(p.paragraphIndex, {
            originalText: p.originalText,
            revisedText: p.revisedText,
            warnings: Array.isArray(p.warnings)
              ? (p.warnings as unknown[])
              : [],
          });
          encode({
            type: "paragraph",
            paragraphIndex: p.paragraphIndex,
            originalText: p.originalText,
            revisedText: p.revisedText,
            warnings: Array.isArray(p.warnings) ? p.warnings : [],
          });
        }
        const usage = await result.totalUsage;
        const inputTokens = usage.inputTokens ?? 0;
        const outputTokens = usage.outputTokens ?? 0;
        const tokenCost = inputTokens + outputTokens;
        const rate = await getAssistantRate(operation);
        const actual = actualCreditsFromUsage(
          run.estimateCredits,
          inputTokens,
          outputTokens,
          rate,
        );
        await persistPartial(run.id, seen, "succeeded");
        await db.orm.public.AiAssistRun.where({ id: run.id }).update({
          status: "succeeded" as never,
          modelId: DRAFT_MODEL,
          tokenCost,
          actualCredits: actual,
        });
        await settleAssistantHold(
          user.id,
          run.id,
          run.estimateCredits,
          actual,
          {
            projectId,
            operation,
            tokenCost,
          },
        );
        await db.orm.public.AiUsage.create({
          userId: user.id,
          projectId,
          operationType: "assistant_run",
          provider: "openrouter",
          modelName: DRAFT_MODEL,
          inputTokens,
          outputTokens,
          totalTokens: tokenCost,
          providerCostUsd: 0,
          creditsCharged: actual,
          durationMs: Date.now() - startedAt,
          status: "completed",
        });
        await logAssistantAudit({
          userId: user.id,
          action: "assistant.run",
          targetType: "AiAssistRun",
          targetId: run.id,
          details: {
            projectId,
            operation,
            modelId: DRAFT_MODEL,
            tokenCost,
            actualCredits: actual,
          },
          ipAddress: await clientIp(),
        });
        encode({
          type: "done",
          modelId: DRAFT_MODEL,
          tokenCost,
          actualCredits: actual,
        });
        controller.close();
      } catch (error) {
        clearTimeout(timeout);
        const message = error instanceof Error ? error.message : "unknown";
        try {
          await persistPartial(run.id, seen, "failed");
        } catch {
          // keep the error path alive even when partial persist fails
        }
        await failRun(
          run.id,
          run.userId,
          projectId,
          run.estimateCredits,
          message,
        );
        try {
          encode({
            type: "error",
            code: "PROVIDER_FAILURE",
            message:
              "The assistant run failed and the hold was released. Partial paragraphs were kept; retry when ready.",
            partialKept: seen.size > 0,
          });
          controller.close();
        } catch {
          // stream already torn down
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
}

async function persistPartial(
  runId: string,
  seen: Map<
    number,
    { originalText: string; revisedText: string; warnings: unknown[] }
  >,
  status: string,
) {
  void status;
  for (const [paragraphIndex, p] of seen) {
    const existing = await db.orm.public.AiSuggestion.where((r) =>
      r.runId.eq(runId),
    )
      .where((r) => r.paragraphIndex.eq(paragraphIndex))
      .first();
    if (existing) continue;
    await db.orm.public.AiSuggestion.create({
      runId,
      paragraphIndex,
      originalText: p.originalText.slice(0, 12000),
      revisedText: p.revisedText.slice(0, 12000),
      warnings: (p.warnings ?? []) as unknown as never,
      status: "pending",
    });
  }
}

async function failRun(
  runId: string,
  userId: string,
  projectId: string,
  estimate: number,
  reason: string,
) {
  await refundAssistantHold(userId, runId, estimate, { projectId, reason });
  await db.orm.public.AiAssistRun.where({ id: runId }).update({
    status: "failed" as never,
  });
  await db.orm.public.AiUsage.create({
    userId,
    projectId,
    operationType: "assistant_run",
    provider: "openrouter",
    modelName: DRAFT_MODEL,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    providerCostUsd: 0,
    creditsCharged: 0,
    durationMs: 0,
    status: "failed",
    errorMessage: reason.slice(0, 500),
  });
  await logAssistantAudit({
    userId,
    action: "assistant.run",
    targetType: "AiAssistRun",
    targetId: runId,
    details: { projectId, status: "failed", reason: reason.slice(0, 300) },
    ipAddress: await clientIp(),
  });
  void hashAssistantInput;
}
