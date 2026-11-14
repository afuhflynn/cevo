import { NextResponse } from "next/server";
import { z } from "zod";
import { checkExportRateLimit } from "@/lib/arcjet";
import { getCurrentUser } from "@/lib/auth-helpers";
import {
  EXPORT_LIST_DEFAULT,
  EXPORT_LIST_MAX,
  EXPORT_MAX_ACTIVE_PER_PROJECT,
  EXPORT_MAX_WORDS,
  expiryFromNow,
  isActiveStatus,
  logExportAudit,
  sendExportEvent,
  serializeExportJob,
} from "@/lib/exports";
import { countWordsFromTiptap } from "@/lib/workspace-shared";
import { db } from "@/lib/prisma";
import { clientIp, loadOwnedProject } from "@/lib/workspace";

type Ctx = { params: Promise<{ projectId: string }> };

const postSchema = z.object({
  format: z.enum(["PDF", "DOCX"]),
  clientKey: z.string().trim().min(1).max(128),
});

export async function POST(request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId } = await params;
  const owned = await loadOwnedProject({ userId: user.id, role: user.role, projectId, allowAdminRead: false });
  if (!owned.ok) {
    if (owned.error === 404) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    await logExportAudit({
      userId: user.id,
      action: "export.denied",
      targetType: "Project",
      targetId: projectId,
      details: { endpoint: "exports.create" },
    });
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (!(await checkExportRateLimit(request))) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.flatten() }, { status: 422 });
  }
  const { format, clientKey } = parsed.data;

  const existing = (await db.orm.public.ExportJob.where({ projectId })
    .where((r) => r.format.eq(format))
    .where((r) => r.clientKey.eq(clientKey))
    .first()
    .catch(() => null)) as unknown as {
    id: string;
    status: string;
    projectId: string;
    format: string;
    s3Key: string | null;
    fileSize: number | null;
    errorMessage: string | null;
    createdAt: Date | string;
  } | null;

  if (existing && isActiveStatus(existing.status)) {
    return NextResponse.json({ job: serializeExportJob(existing as never), deduplicated: true }, { status: 409 });
  }

  if (existing && existing.status === "FAILED") {
    const bumped = (await db.orm.public.ExportJob.where({ id: existing.id }).update({
      status: "QUEUED",
      errorMessage: null,
      s3Key: null,
      attemptCount: ((existing as unknown as { attemptCount: number | null }).attemptCount ?? 0) + 1,
      expiresAt: expiryFromNow(),
    } as never)) as unknown as Parameters<typeof serializeExportJob>[0];
    await logExportAudit({ userId: user.id, action: "export.start", targetType: "ExportJob", targetId: existing.id, details: { format, clientKey, retry: true } });
    await sendExportEvent(existing.id);
    return NextResponse.json({ job: serializeExportJob(bumped), retried: true }, { status: 200 });
  }

  let activeRows: Array<{ id: string }> = [];
  try {
    activeRows = (await db.orm.public.ExportJob.select("id")
      .where((r) => r.projectId.eq(projectId))
      .where((r) => r.status.in(["QUEUED", "PROCESSING"]))
      .limit(EXPORT_MAX_ACTIVE_PER_PROJECT + 1)
      .all()) as unknown as Array<{ id: string }>;
  } catch {
    activeRows = [];
  }
  if (activeRows.length >= EXPORT_MAX_ACTIVE_PER_PROJECT) {
    return NextResponse.json({ error: "TOO_MANY_ACTIVE_EXPORTS" }, { status: 422 });
  }

  const project = owned.project as unknown as { id: string; title: string; templateVersionId: string | null };
  let sectionRows: Array<{ content: unknown }> = [];
  try {
    sectionRows = (await db.orm.public.ProjectSection.select("id", "content")
      .where((r) => r.projectId.eq(projectId))
      .limit(500)
      .all()) as unknown as Array<{ content: unknown }>;
  } catch {
    sectionRows = [];
  }
  let totalWords = 0;
  for (const s of sectionRows) totalWords += countWordsFromTiptap(s.content);
  if (totalWords > EXPORT_MAX_WORDS) {
    return NextResponse.json({ error: "DOCUMENT_OVERSIZE", words: totalWords }, { status: 422 });
  }

  const templateVersionId = project.templateVersionId ?? null;
  if (!templateVersionId) {
    const { loadPlatformDefault } = await import("@/lib/templates");
    const fallback = await loadPlatformDefault().catch(() => null);
    if (!fallback) return NextResponse.json({ error: "NO_LOCKED_TEMPLATE" }, { status: 422 });
  }

  const created = (await db.orm.public.ExportJob.create({
    projectId,
    format: format as never,
    status: "QUEUED",
    requestedBy: user.id,
    templateVersionId: templateVersionId ?? undefined,
    clientKey,
    attemptCount: 0,
    expiresAt: expiryFromNow(),
  } as never)) as unknown as Parameters<typeof serializeExportJob>[0];

  await logExportAudit({
    userId: user.id,
    action: "export.start",
    targetType: "ExportJob",
    targetId: (created as unknown as { id: string }).id,
    details: { format, clientKey, projectId },
    ...(await clientIp().then((ip) => ({ ipAddress: ip })).catch(() => ({})) as object),
  } as never);

  await sendExportEvent((created as unknown as { id: string }).id);
  return NextResponse.json({ job: serializeExportJob(created) }, { status: 201 });
}

export async function GET(request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId } = await params;
  const owned = await loadOwnedProject({ userId: user.id, role: user.role, projectId, allowAdminRead: true });
  if (!owned.ok) {
    const status = owned.error;
    return NextResponse.json({ error: status === 404 ? "NOT_FOUND" : "FORBIDDEN" }, { status });
  }
  const url = new URL(request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const rawSize = Number.parseInt(url.searchParams.get("pageSize") ?? String(EXPORT_LIST_DEFAULT), 10);
  const pageSize = Math.min(EXPORT_LIST_MAX, Math.max(1, Number.isFinite(rawSize) ? rawSize : EXPORT_LIST_DEFAULT));
  const format = url.searchParams.get("format");
  const offset = (page - 1) * pageSize;

  let query = db.orm.public.ExportJob.select(
    "id",
    "projectId",
    "format",
    "status",
    "s3Key",
    "fileSize",
    "errorMessage",
    "templateVersionId",
    "clientKey",
    "attemptCount",
    "expiresAt",
    "createdAt",
    "completedAt",
  ).where((r) => r.projectId.eq(projectId));
  if (format === "PDF" || format === "DOCX") {
    query = query.where((r) => r.format.eq(format as never));
  }
  const rows = (await query
    .orderBy((r) => r.createdAt.desc())
    .limit(pageSize + 1)
    .offset(offset)
    .all()) as unknown as Parameters<typeof serializeExportJob>[0][];
  const pageRows = rows.slice(0, pageSize);
  return NextResponse.json({
    jobs: pageRows.map(serializeExportJob),
    page,
    pageSize,
    nextPage: rows.length > pageSize ? page + 1 : null,
    readOnly: (owned as { readOnly?: boolean }).readOnly ? true : undefined,
  });
}
