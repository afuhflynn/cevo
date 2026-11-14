import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import {
  EXPORT_DOWNLOAD_URL_TTL_SEC,
  buildExportFileName,
  exportMime,
  isExpired,
  logExportAudit,
} from "@/lib/exports";
import { db } from "@/lib/prisma";
import { presignDownloadUrl } from "@/lib/storage";
import { loadOwnedProject } from "@/lib/workspace";

type Ctx = { params: Promise<{ projectId: string; exportId: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId, exportId } = await params;
  const owned = await loadOwnedProject({ userId: user.id, role: user.role, projectId, allowAdminRead: true });
  if (!owned.ok) {
    const status = owned.error;
    if (status === 403) {
      await logExportAudit({ userId: user.id, action: "export.denied", targetType: "ExportJob", targetId: exportId, details: { projectId } });
    }
    return NextResponse.json({ error: status === 404 ? "NOT_FOUND" : "FORBIDDEN" }, { status });
  }
  const row = (await db.orm.public.ExportJob.where({ id: exportId }).first().catch(() => null)) as unknown as {
    id: string;
    projectId: string;
    format: "PDF" | "DOCX";
    status: string;
    s3Key: string | null;
    expiresAt: Date | string | null;
  } | null;
  if (!row || row.projectId !== projectId) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (row.status !== "COMPLETED" || !row.s3Key) {
    return NextResponse.json({ error: "NOT_READY", status: row.status }, { status: 409 });
  }
  if (row.expiresAt && isExpired(row.expiresAt)) {
    return NextResponse.json({ error: "EXPIRED" }, { status: 410 });
  }
  const project = owned.project as unknown as { title: string };
  const fileName = buildExportFileName({ title: project.title ?? "report", jobId: row.id, format: row.format });
  try {
    const signed = await presignDownloadUrl(row.s3Key, fileName, exportMime(row.format), EXPORT_DOWNLOAD_URL_TTL_SEC);
    return NextResponse.json({ downloadUrl: signed.url, expiresInSec: signed.expiresInSec, fileName });
  } catch (err) {
    return NextResponse.json(
      { error: "STORAGE_UNAVAILABLE", message: err instanceof Error ? err.message : "Storage is not configured." },
      { status: 503 },
    );
  }
}
