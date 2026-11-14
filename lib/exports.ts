export const EXPORT_MAX_WORDS = 20000;
export const EXPORT_MAX_ACTIVE_PER_PROJECT = 3;
export const EXPORT_FILE_TTL_DAYS = 7;
export const EXPORT_DOWNLOAD_URL_TTL_SEC = 900;
export const EXPORT_LIST_DEFAULT = 20;
export const EXPORT_LIST_MAX = 100;
export const EXPORT_POLL_INTERVAL_MS = 3000;
export const EXPORT_WORKER_RETRIES = 3;
export const EXPORT_ATTEMPT_CAP_MS = 10 * 60 * 1000;
export const EXPORT_PENDING_NOTE =
  "Content for this chapter is still pending. Add text in the workspace then run a fresh export.";
export const EXPORT_ORPHAN_WARNING =
  "One or more citations have no source record. The marked text is kept and needs review.";

export type ExportFormatInput = "PDF" | "DOCX";

export function exportMime(format: ExportFormatInput): string {
  return format === "PDF"
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

export function exportExtension(format: ExportFormatInput): string {
  return format === "PDF" ? "pdf" : "docx";
}

export function slugifyExportTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return base || "report";
}

export function buildExportS3Key(input: {
  projectId: string;
  jobId: string;
  title: string;
  format: ExportFormatInput;
}): string {
  const date = new Date().toISOString().slice(0, 10);
  const slug = slugifyExportTitle(input.title);
  const short = input.jobId.slice(-6);
  return `projects/${input.projectId}/exports/${date}_${slug}_${short}.${exportExtension(input.format)}`;
}

export function buildExportFileName(input: {
  title: string;
  jobId: string;
  format: ExportFormatInput;
}): string {
  const slug = slugifyExportTitle(input.title);
  const short = input.jobId.slice(-6);
  return `${slug}_${short}.${exportExtension(input.format)}`;
}

export function sanitizeExportName(name: string): string {
  return name.replace(/["\\\r\n]/g, "_").slice(0, 120) || "file";
}

export function expiryFromNow(days = EXPORT_FILE_TTL_DAYS): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function isExpired(expiresAt: Date | string): boolean {
  const t = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  return Date.now() > t;
}

export type ExportJobRow = {
  id: string;
  projectId: string;
  format: string;
  status: string;
  s3Key: string | null;
  fileSize: number | null;
  errorMessage: string | null;
  requestedBy?: string | null;
  templateVersionId?: string | null;
  clientKey?: string | null;
  attemptCount?: number | null;
  expiresAt?: Date | string | null;
  createdAt: Date | string;
  completedAt?: Date | string | null;
};

export function serializeExportJob(row: ExportJobRow) {
  return {
    id: row.id,
    projectId: row.projectId,
    format: row.format,
    status: row.status,
    s3Key: undefined,
    fileSize: row.fileSize ?? null,
    errorMessage: row.errorMessage ?? null,
    templateVersionId: row.templateVersionId ?? null,
    clientKey: row.clientKey ?? null,
    attemptCount: row.attemptCount ?? 0,
    expiresAt:
      row.expiresAt instanceof Date
        ? row.expiresAt.toISOString()
        : (row.expiresAt ?? null),
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    completedAt:
      row.completedAt instanceof Date
        ? row.completedAt.toISOString()
        : (row.completedAt ?? null),
    expired: row.expiresAt ? isExpired(row.expiresAt) : false,
    downloadable: row.status === "COMPLETED" && !!row.s3Key && !(row.expiresAt ? isExpired(row.expiresAt) : false),
  };
}

export function isActiveStatus(status: string): boolean {
  return status === "QUEUED" || status === "PROCESSING";
}

export async function logExportAudit(input: {
  userId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { db } = await import("./prisma");
    const { headers } = await import("next/headers");
    let ip: string | undefined;
    try {
      const store = await headers();
      const fwd = store.get("x-forwarded-for");
      ip = fwd?.split(",")[0]?.trim() ?? store.get("x-real-ip") ?? undefined;
    } catch {
      ip = undefined;
    }
    await db.orm.public.AuditEvent.create({
      userId: input.userId ?? undefined,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      details: (input.details ?? {}) as never,
      ipAddress: ip,
    });
  } catch {
    return;
  }
}

export async function sendExportEvent(exportId: string): Promise<boolean> {
  const eventKey = process.env["INNGEST_EVENT_KEY"];
  if (!eventKey || eventKey === "local-dev-event-key") return false;
  try {
    const { Inngest } = await import("inngest");
    const client = new Inngest({ id: "cevo", eventKey });
    await client.send({ name: "export/run", data: { exportId } });
    return true;
  } catch {
    return false;
  }
}
