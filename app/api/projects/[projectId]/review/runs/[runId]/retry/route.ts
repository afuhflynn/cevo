import { NextResponse } from "next/server";
import { checkReviewRateLimit } from "@/lib/arcjet";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import {
  checkReviewCap,
  excerptOf,
  extractReviewParagraphs,
  peekReviewCap,
  pruneReviewRuns,
  REVIEW_MODEL_TIMEOUT_MS,
  resolveGroundTruth,
  runSemanticChecks,
} from "@/lib/review";
import { clientIp, loadOwnedProject, logWorkspaceAudit } from "@/lib/workspace";

type Ctx = { params: Promise<{ projectId: string; runId: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId, runId } = await params;
  const owned = await loadOwnedProject({
    userId: user.id,
    role: user.role,
    projectId,
    allowAdminRead: false,
  });
  if (!owned.ok) {
    if (owned.error === 404)
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    await logWorkspaceAudit({
      userId: user.id,
      action: "review.access.denied",
      targetType: "ReviewRun",
      targetId: runId,
      details: { reason: "admin-retry-denied", endpoint: "review.runs.retry" },
      ipAddress: await clientIp(),
    }).catch(() => undefined);
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const run = (await db.orm.public.ReviewRun.where({
    id: runId,
  }).first()) as unknown as {
    id: string;
    projectId: string;
    status: string;
    skippedSemantic: boolean;
    missingCount: number;
    uncitedCount: number;
    driftCount: number;
    formattingCount: number;
    templateVersionId: string | null;
  } | null;
  if (!run || run.projectId !== projectId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (!run.skippedSemantic) {
    return NextResponse.json(
      {
        error: "NOTHING_SKIPPED",
        message: "This run has no skipped semantic groups to retry.",
      },
      { status: 409 },
    );
  }
  const cap = peekReviewCap(projectId);
  if (!cap.allowed) {
    await logWorkspaceAudit({
      userId: user.id,
      action: "review.run.rate_limited",
      targetType: "ReviewRun",
      targetId: runId,
      details: { cap: "hourly", endpoint: "retry" },
      ipAddress: await clientIp(),
    }).catch(() => undefined);
    return NextResponse.json(
      { error: "RATE_LIMITED", retryAfterSeconds: cap.retryAfterSeconds },
      {
        status: 429,
        headers: { "retry-after": String(cap.retryAfterSeconds) },
      },
    );
  }
  if (!(await checkReviewRateLimit(request))) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  checkReviewCap(projectId);

  const project = owned.project as unknown as {
    templateVersionId: string | null;
  };
  const ground = await resolveGroundTruth({
    projectId,
    userId: user.id,
    templateVersionId: project.templateVersionId ?? run.templateVersionId,
  });
  const sectionRows = (await db.orm.public.ProjectSection.select(
    "id",
    "title",
    "version",
    "content",
  )
    .where((r) => r.projectId.eq(projectId))
    .orderBy((r) => r.orderIndex.asc())
    .limit(50)
    .all()) as unknown as {
    id: string;
    title: string;
    version: number;
    content: unknown;
  }[];
  const paragraphs = extractReviewParagraphs(sectionRows);
  const semantic = await runSemanticChecks({
    paragraphs,
    objectives: ground.objectives,
    maxChars: 200000,
    timeoutMs: 25000,
  });
  if (!semantic.ok) {
    await db.orm.public.ReviewRun.where({ id: runId }).update({
      skipReason: semantic.reason,
    });
    return NextResponse.json(
      {
        run: { id: runId, status: "done", skippedSemantic: true },
        error: "SEMANTIC_STILL_SKIPPED",
        reason: semantic.reason,
        retryable: true,
      },
      { status: 200 },
    );
  }
  const objectiveIds = new Set(ground.objectives.map((o) => o.id));
  const paraByKey = new Map(
    paragraphs.map((p) => [`${p.sectionTitle}::${p.blockIndex}`, p]),
  );
  let addedDrift = 0;
  for (const d of semantic.drift) {
    if (!objectiveIds.has(d.objectiveId)) continue;
    const para = paraByKey.get(`${d.sectionTitle}::${d.blockIndex}`);
    const objective = ground.objectives.find((o) => o.id === d.objectiveId);
    if (!para || !objective) continue;
    await db.orm.public.ReviewWarning.create({
      runId,
      checkType: "objective_drift",
      severity: "warn",
      message:
        `Possible drift from ${objective.id} ("${objective.text.slice(0, 120)}") in "${para.sectionTitle}": ${d.note}`.slice(
          0,
          2000,
        ),
      sectionId: para.sectionId,
      blockIndex: para.blockIndex,
      excerpt: excerptOf(para.text).slice(0, 500),
      sectionVersion: para.sectionVersion,
    });
    addedDrift += 1;
  }
  for (const c of semantic.claims.slice(0, 30)) {
    const para = paraByKey.get(`${c.sectionTitle}::${c.blockIndex}`);
    if (!para || para.hasCitation) continue;
    await db.orm.public.ReviewWarning.create({
      runId,
      checkType: "uncited",
      severity: "warn",
      message:
        `Model flagged a claim needing a citation in "${para.sectionTitle}": ${c.reason}`.slice(
          0,
          2000,
        ),
      sectionId: para.sectionId,
      blockIndex: para.blockIndex,
      excerpt: excerptOf(para.text).slice(0, 500),
      sectionVersion: para.sectionVersion,
    });
  }
  const freshWarnings = (await db.orm.public.ReviewWarning.select(
    "checkType",
    "severity",
  )
    .where((r) => r.runId.eq(runId))
    .limit(300)
    .all()) as unknown as { checkType: string; severity: string }[];
  const count = (t: string) =>
    freshWarnings.filter((w) => w.checkType === t && w.severity === "warn")
      .length;
  await db.orm.public.ReviewRun.where({ id: runId }).update({
    status: "done",
    missingCount: count("missing_section"),
    uncitedCount: count("uncited"),
    driftCount: count("objective_drift"),
    formattingCount: count("formatting"),
    skippedSemantic: false,
    skipReason: undefined,
  });
  await pruneReviewRuns(projectId).catch(() => undefined);
  await logWorkspaceAudit({
    userId: user.id,
    action: "review.run",
    targetType: "ReviewRun",
    targetId: runId,
    details: { projectId, retry: true, addedDrift },
    ipAddress: await clientIp(),
  }).catch(() => undefined);
  void REVIEW_MODEL_TIMEOUT_MS;
  return NextResponse.json({
    run: { id: runId, status: "done", skippedSemantic: false },
    refreshed: { addedDrift },
  });
}
