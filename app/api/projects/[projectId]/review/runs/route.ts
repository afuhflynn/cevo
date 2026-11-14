import { NextResponse } from "next/server";
import { z } from "zod";
import { checkReviewRateLimit } from "@/lib/arcjet";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import { checkReviewCap, peekReviewCap } from "@/lib/review";
import { runReviewScan } from "@/lib/review-scan";
import { clientIp, loadOwnedProject, logWorkspaceAudit } from "@/lib/workspace";

type Ctx = { params: Promise<{ projectId: string }> };

const postSchema = z.object({
  clientRunKey: z.string().trim().min(1).max(128).optional(),
});

function serializeRun(row: {
  id: string;
  status: string;
  missingCount: number;
  uncitedCount: number;
  driftCount: number;
  formattingCount: number;
  skippedSemantic: boolean;
  skipReason?: string | null;
  truncated?: boolean | null;
  templateVersionId?: string | null;
  createdAt: Date | string;
}) {
  return {
    id: row.id,
    status: row.status,
    counts: {
      missing: row.missingCount,
      uncited: row.uncitedCount,
      drift: row.driftCount,
      formatting: row.formattingCount,
    },
    skippedSemantic: row.skippedSemantic,
    skipReason: row.skipReason ?? null,
    truncated: row.truncated ?? false,
    templateVersionId: row.templateVersionId ?? null,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

export async function POST(request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId } = await params;
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
      targetType: "Project",
      targetId: projectId,
      details: { reason: "admin-post-denied", endpoint: "review.runs.create" },
      ipAddress: await clientIp(),
    }).catch(() => undefined);
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const project = owned.project as unknown as {
    id: string;
    templateVersionId: string | null;
  };

  const body = await request.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const clientRunKey = parsed.data.clientRunKey?.trim() || undefined;

  if (clientRunKey) {
    const existing = await db.orm.public.ReviewRun.where({
      projectId,
    })
      .where((r) => r.clientRunKey.eq(clientRunKey))
      .first()
      .catch(() => null);
    if (existing) {
      const row = existing as unknown as Parameters<typeof serializeRun>[0];
      return NextResponse.json(
        { error: "DUPLICATE_CLIENT_RUN_KEY", run: serializeRun(row) },
        { status: 409 },
      );
    }
  }

  const cap = peekReviewCap(projectId);
  if (!cap.allowed) {
    await logWorkspaceAudit({
      userId: user.id,
      action: "review.run.rate_limited",
      targetType: "Project",
      targetId: projectId,
      details: { cap: "hourly" },
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
    await logWorkspaceAudit({
      userId: user.id,
      action: "review.run.rate_limited",
      targetType: "Project",
      targetId: projectId,
      details: { cap: "burst" },
      ipAddress: await clientIp(),
    }).catch(() => undefined);
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  // Count this run against the hourly cap now that burst checks passed.
  checkReviewCap(projectId);

  const run = (await db.orm.public.ReviewRun.create({
    projectId,
    templateVersionId: project.templateVersionId ?? undefined,
    status: "running",
    missingCount: 0,
    uncitedCount: 0,
    driftCount: 0,
    formattingCount: 0,
    skippedSemantic: false,
    clientRunKey: clientRunKey ?? undefined,
    createdBy: user.id,
  })) as unknown as Parameters<typeof serializeRun>[0] & { id: string };

  try {
    const result = await runReviewScan({
      projectId,
      userId: user.id,
      templateVersionId: project.templateVersionId ?? null,
      runId: run.id,
    });
    const fresh = (await db.orm.public.ReviewRun.where({
      id: run.id,
    }).first()) as unknown as Parameters<typeof serializeRun>[0];
    return NextResponse.json(
      {
        run: serializeRun(fresh),
        isFallback: result.isFallback,
        versionId: result.versionId,
      },
      { status: 201 },
    );
  } catch (error) {
    await db.orm.public.ReviewRun.where({ id: run.id })
      .update({ status: "failed" })
      .catch(() => undefined);
    const message = error instanceof Error ? error.message : "scan failed";
    return NextResponse.json(
      { error: "SCAN_FAILED", message: message.slice(0, 300) },
      { status: 500 },
    );
  }
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
  const page = Math.max(
    1,
    Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1,
  );
  const rawSize = Number.parseInt(url.searchParams.get("pageSize") ?? "10", 10);
  const pageSize = Math.min(
    20,
    Math.max(1, Number.isFinite(rawSize) ? rawSize : 10),
  );
  const offset = (page - 1) * pageSize;
  const rows = (await db.orm.public.ReviewRun.select(
    "id",
    "status",
    "missingCount",
    "uncitedCount",
    "driftCount",
    "formattingCount",
    "skippedSemantic",
    "skipReason",
    "truncated",
    "templateVersionId",
    "createdAt",
  )
    .where((r) => r.projectId.eq(projectId))
    .orderBy((r) => r.createdAt.desc())
    .limit(pageSize + 1)
    .offset(offset)
    .all()) as unknown as Parameters<typeof serializeRun>[0][];
  const page_rows = rows.slice(0, pageSize);
  const nextPage = rows.length > pageSize ? page + 1 : null;
  return NextResponse.json({
    runs: page_rows.map(serializeRun),
    page,
    pageSize,
    nextPage,
    readOnly: owned.readOnly ? true : undefined,
  });
}
