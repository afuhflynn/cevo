import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import { loadOwnedProject } from "@/lib/workspace";

type Ctx = { params: Promise<{ projectId: string; runId: string }> };

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
  const run = (await db.orm.public.ReviewRun.where({
    id: runId,
  }).first()) as unknown as {
    id: string;
    projectId: string;
    status: string;
    missingCount: number;
    uncitedCount: number;
    driftCount: number;
    formattingCount: number;
    skippedSemantic: boolean;
    skipReason: string | null;
    truncated: boolean | null;
    templateVersionId: string | null;
    createdAt: Date | string;
  } | null;
  if (!run || run.projectId !== projectId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const warnings = (await db.orm.public.ReviewWarning.select(
    "id",
    "checkType",
    "severity",
    "message",
    "sectionId",
    "blockIndex",
    "excerpt",
    "sectionVersion",
  )
    .where((r) => r.runId.eq(runId))
    .orderBy((r) => r.createdAt.asc())
    .limit(300)
    .all()) as unknown as {
    id: string;
    checkType: string;
    severity: string;
    message: string;
    sectionId: string | null;
    blockIndex: number | null;
    excerpt: string | null;
    sectionVersion: number | null;
  }[];

  // Attach chapter titles for the panel without extra round trips per warning.
  const sectionIds = [
    ...new Set(warnings.map((w) => w.sectionId).filter(Boolean)),
  ] as string[];
  let titles = new Map<string, string>();
  if (sectionIds.length > 0) {
    const sections = (await db.orm.public.ProjectSection.select("id", "title")
      .where((r) => r.id.in(sectionIds as [string, ...string[]]))
      .limit(100)
      .all()) as unknown as { id: string; title: string }[];
    titles = new Map(sections.map((s) => [s.id, s.title]));
  }

  return NextResponse.json({
    run: {
      id: run.id,
      status: run.status,
      counts: {
        missing: run.missingCount,
        uncited: run.uncitedCount,
        drift: run.driftCount,
        formatting: run.formattingCount,
      },
      skippedSemantic: run.skippedSemantic,
      skipReason: run.skipReason ?? null,
      truncated: run.truncated ?? false,
      templateVersionId: run.templateVersionId ?? null,
      createdAt: new Date(run.createdAt).toISOString(),
    },
    warnings: warnings.map((w) => ({
      id: w.id,
      checkType: w.checkType,
      severity: w.severity,
      message: w.message,
      sectionId: w.sectionId,
      sectionTitle: w.sectionId ? (titles.get(w.sectionId) ?? null) : null,
      blockIndex: w.blockIndex,
      excerpt: w.excerpt,
      sectionVersion: w.sectionVersion,
    })),
    readOnly: owned.readOnly ? true : undefined,
  });
}
