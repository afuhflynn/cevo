import { NextResponse } from "next/server";
import { z } from "zod";
import { checkAssistantRateLimit } from "@/lib/arcjet";
import {
  ASSISTANT_DAILY_CAP,
  ASSISTANT_HISTORY_MAX_PAGE_SIZE,
  ASSISTANT_HISTORY_PAGE_SIZE,
  ASSISTANT_MAX_INPUT_CHARS,
  assistantExpiryDate,
  assistantScopeLabel,
  estimateAssistantCredits,
  getAssistantWalletBalance,
  hashAssistantInput,
  holdAssistantCredits,
  logAssistantAudit,
} from "@/lib/assistant";
import {
  ASSISTANT_PROMPT_VERSION,
  isAssistantOperation,
} from "@/lib/assistant-prompts";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import { clientIp, loadOwnedProject } from "@/lib/workspace";

const createSchema = z.object({
  sectionId: z.string().min(1),
  operation: z.string().min(1),
  inputText: z.string().min(1),
  sectionVersion: z.number().int().min(1),
  scope: z.enum(["selection", "chapter"]).optional(),
});

type Ctx = { params: Promise<{ projectId: string }> };

function readIdempotencyKey(request: Request): string | null {
  const key =
    request.headers.get("x-idempotency-key") ??
    request.headers.get("idempotency-key");
  return key && key.trim().length > 0 ? key.trim().slice(0, 128) : null;
}

export async function POST(request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId } = await params;
  // Only owners may create runs that place a credit hold; admins get read-only access.
  const owned = await loadOwnedProject({
    userId: user.id,
    role: user.role,
    projectId,
    allowAdminRead: false,
  });
  if (!owned.ok) {
    const status = owned.error;
    if (status === 403) {
      await logAssistantAudit({
        userId: user.id,
        action: "assistant.access.denied",
        targetType: "Project",
        targetId: projectId,
        details: { reason: "cross-owner", endpoint: "runs.create" },
        ipAddress: await clientIp(),
      });
    }
    return NextResponse.json(
      { error: status === 404 ? "NOT_FOUND" : "FORBIDDEN" },
      { status },
    );
  }
  if (!(await checkAssistantRateLimit(request))) {
    await logAssistantAudit({
      userId: user.id,
      action: "assistant.run.rate_limited",
      targetType: "Project",
      targetId: projectId,
      details: {},
      ipAddress: await clientIp(),
    });
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  const idempotencyKey = readIdempotencyKey(request);
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: "IDEMPOTENCY_KEY_REQUIRED" },
      { status: 422 },
    );
  }
  const existingByKey = await db.orm.public.AiAssistRun.where({
    idempotencyKey,
  }).first();
  if (existingByKey) {
    if (
      existingByKey.projectId !== projectId ||
      existingByKey.userId !== user.id
    ) {
      return NextResponse.json(
        { error: "IDEMPOTENCY_KEY_CONFLICT" },
        { status: 409 },
      );
    }
    return NextResponse.json({
      run: {
        id: existingByKey.id,
        status: existingByKey.status,
        estimateCredits: existingByKey.estimateCredits,
        inputHash: existingByKey.inputHash,
      },
      deduplicated: true,
    });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  if (!isAssistantOperation(parsed.data.operation)) {
    return NextResponse.json({ error: "INVALID_OPERATION" }, { status: 422 });
  }
  const inputChars = parsed.data.inputText.length;
  if (inputChars > ASSISTANT_MAX_INPUT_CHARS) {
    return NextResponse.json(
      {
        error: "INPUT_TOO_LARGE",
        inputChars,
        maxChars: ASSISTANT_MAX_INPUT_CHARS,
        guidance:
          "Split the chapter into smaller parts and run the assistant on each part.",
      },
      { status: 422 },
    );
  }
  const section = await db.orm.public.ProjectSection.where({
    id: parsed.data.sectionId,
  }).first();
  if (!section || section.projectId !== projectId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (section.version !== parsed.data.sectionVersion) {
    return NextResponse.json(
      {
        error: "STALE_SECTION",
        currentVersion: section.version,
        updatedAt: new Date(section.updatedAt).toISOString(),
      },
      { status: 409 },
    );
  }
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentRuns = await db.orm.public.AiUsage.select("id")
    .where((r) => r.userId.eq(user.id))
    .where((r) => r.operationType.eq("assistant_run"))
    .where((r) => r.createdAt.gte(dayAgo))
    .limit(ASSISTANT_DAILY_CAP + 1)
    .all();
  if (recentRuns.length >= ASSISTANT_DAILY_CAP) {
    await logAssistantAudit({
      userId: user.id,
      action: "assistant.run.rate_limited",
      targetType: "Project",
      targetId: projectId,
      details: { cap: ASSISTANT_DAILY_CAP },
      ipAddress: await clientIp(),
    });
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  const { estimateCredits } = await estimateAssistantCredits(
    parsed.data.operation,
    inputChars,
  );
  const balance = await getAssistantWalletBalance(user.id);
  if (balance < estimateCredits) {
    return NextResponse.json(
      {
        error: "INSUFFICIENT_CREDITS",
        estimateCredits,
        balance,
        topUpPrompt:
          "Your balance is short for this run. Top up credits, then try again.",
      },
      { status: 402 },
    );
  }
  const scope = parsed.data.scope ?? "chapter";
  const inputHash = hashAssistantInput(parsed.data.inputText);
  const run = await db.orm.public.AiAssistRun.create({
    projectId,
    sectionId: parsed.data.sectionId,
    userId: user.id,
    operation: parsed.data.operation,
    promptVersion: ASSISTANT_PROMPT_VERSION,
    scope,
    sectionVersion: parsed.data.sectionVersion,
    inputHash,
    inputText: parsed.data.inputText.slice(0, ASSISTANT_MAX_INPUT_CHARS),
    inputChars,
    estimateCredits,
    actualCredits: 0,
    status: "held",
    idempotencyKey,
    expiresAt: assistantExpiryDate(),
  });
  const hold = await holdAssistantCredits(user.id, run.id, estimateCredits, {
    projectId,
    sectionId: parsed.data.sectionId,
    operation: parsed.data.operation,
    estimate: estimateCredits,
  });
  if (!hold.ok) {
    await db.orm.public.AiAssistRun.where({ id: run.id }).update({
      status: "expired" as never,
    });
    return NextResponse.json(
      { error: "INSUFFICIENT_CREDITS", estimateCredits, balance },
      { status: 402 },
    );
  }
  await logAssistantAudit({
    userId: user.id,
    action: "assistant.run",
    targetType: "AiAssistRun",
    targetId: run.id,
    details: {
      projectId,
      operation: parsed.data.operation,
      estimateCredits,
      inputChars,
    },
    ipAddress: await clientIp(),
  });
  return NextResponse.json(
    {
      run: {
        id: run.id,
        status: "held",
        estimateCredits,
        inputHash,
        scope: assistantScopeLabel(scope),
        expiresAt: run.expiresAt,
      },
    },
    { status: 201 },
  );
}

export async function GET(request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId } = await params;
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
  const url = new URL(request.url);
  const sectionId = url.searchParams.get("sectionId");
  if (!sectionId) {
    return NextResponse.json({ error: "SECTION_REQUIRED" }, { status: 422 });
  }
  const cursor = url.searchParams.get("cursor");
  const rawPageSize = Number.parseInt(
    url.searchParams.get("pageSize") ?? "",
    10,
  );
  const pageSize = Number.isFinite(rawPageSize)
    ? Math.min(Math.max(1, rawPageSize), ASSISTANT_HISTORY_MAX_PAGE_SIZE)
    : ASSISTANT_HISTORY_PAGE_SIZE;
  let query = db.orm.public.AiAssistRun.where((r) =>
    r.projectId.eq(projectId),
  ).where((r) => r.sectionId.eq(sectionId));
  if (cursor) {
    const cursorDate = new Date(cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      query = query.where((r) => r.createdAt.lt(cursorDate));
    }
  }
  const rows = await query
    .orderBy((r) => r.createdAt.desc())
    .limit(pageSize + 1)
    .all();
  const page = rows.slice(0, pageSize);
  const nextCursor =
    rows.length > pageSize
      ? new Date(page[page.length - 1]!.createdAt).toISOString()
      : null;
  const runIds = page.map((r) => r.id);
  const suggestionsByRun = new Map<string, unknown[]>();
  if (runIds.length > 0) {
    const suggestions = await db.orm.public.AiSuggestion.select(
      "id",
      "runId",
      "paragraphIndex",
      "originalText",
      "revisedText",
      "warnings",
      "status",
    )
      .where((r) => r.runId.in(runIds as [string, ...string[]]))
      .limit(1000)
      .all();
    for (const s of suggestions) {
      const list = suggestionsByRun.get(s.runId) ?? [];
      list.push({
        id: s.id,
        paragraphIndex: s.paragraphIndex,
        originalText: s.originalText,
        revisedText: s.revisedText,
        warnings: s.warnings ?? [],
        status: s.status,
      });
      suggestionsByRun.set(s.runId, list);
    }
  }
  return NextResponse.json({
    runs: page.map((r) => ({
      id: r.id,
      operation: r.operation,
      scope: r.scope,
      sectionVersion: r.sectionVersion,
      inputHash: r.inputHash,
      inputChars: r.inputChars,
      estimateCredits: r.estimateCredits,
      actualCredits: r.actualCredits,
      modelId: r.modelId ?? null,
      tokenCost: r.tokenCost,
      status: r.status,
      promptVersion: r.promptVersion,
      createdAt: new Date(r.createdAt).toISOString(),
      suggestions: (suggestionsByRun.get(r.id) ?? []).sort(
        (a, b) =>
          (a as { paragraphIndex: number }).paragraphIndex -
          (b as { paragraphIndex: number }).paragraphIndex,
      ),
    })),
    nextCursor,
    readOnly: owned.readOnly ? true : undefined,
  });
}
