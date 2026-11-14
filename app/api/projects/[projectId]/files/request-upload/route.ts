import { NextResponse } from "next/server";
import { z } from "zod";
import { checkFilesRateLimit } from "@/lib/arcjet";
import { getCurrentUser } from "@/lib/auth-helpers";
import { checkFilesCap, savePendingUpload } from "@/lib/file-uploads";
import {
  buildS3Key,
  FILE_CATEGORIES,
  FILE_QUOTA_BYTES,
  isTokenStale,
  toIso,
  validateFileSize,
  validateFileType,
} from "@/lib/files";
import { db } from "@/lib/prisma";
import { presignPutUrl } from "@/lib/storage";
import { clientIp, loadOwnedProject, logWorkspaceAudit } from "@/lib/workspace";

type Ctx = { params: Promise<{ projectId: string }> };

const requestSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(200),
  fileSize: z.number().int().positive(),
  category: z.enum(FILE_CATEGORIES),
  checksumSha256: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/)
    .nullish(),
  clientToken: z.string().min(1).max(128),
});

function ownerOnly(error: 403 | 404, role: string): { status: 403 | 404 } {
  if (error === 404) return { status: 404 };
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  return { status: isAdmin ? 403 : 404 };
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
    const mapped = ownerOnly(owned.error, user.role);
    return NextResponse.json(
      { error: mapped.status === 404 ? "NOT_FOUND" : "FORBIDDEN" },
      { status: mapped.status },
    );
  }
  const cap = checkFilesCap(user.id, "request");
  if (!cap.allowed) {
    return NextResponse.json(
      { error: "RATE_LIMITED", retryAfterSeconds: cap.retryAfterSeconds },
      {
        status: 429,
        headers: { "retry-after": String(cap.retryAfterSeconds) },
      },
    );
  }
  if (!(await checkFilesRateLimit(request, "request"))) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const {
    fileName,
    mimeType,
    fileSize,
    category,
    checksumSha256,
    clientToken,
  } = parsed.data;

  const typeCheck = validateFileType(mimeType, fileName);
  if (!typeCheck.ok) {
    return NextResponse.json(
      { error: "INVALID_TYPE", message: typeCheck.message },
      { status: 400 },
    );
  }
  const sizeCheck = validateFileSize(fileSize);
  if (!sizeCheck.ok) {
    return NextResponse.json(
      { error: "FILE_TOO_LARGE", message: sizeCheck.message },
      { status: 400 },
    );
  }

  const existingToken = await db.orm.public.FileAsset.where({
    clientToken,
  }).first();
  if (existingToken) {
    if (existingToken.projectId !== projectId) {
      return NextResponse.json(
        {
          error: "INVALID_TOKEN",
          message: "Token belongs to another project.",
        },
        { status: 400 },
      );
    }
    if (isTokenStale(existingToken.createdAt)) {
      return NextResponse.json(
        {
          error: "STALE_TOKEN",
          message: "Upload token expired. Request a new upload.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json({
      uploadUrl: null,
      fileId: existingToken.id,
      s3Key: existingToken.s3Key,
      expiresInSec: 0,
      quotaWouldExceed: false,
      deduplicated: true,
      file: serializeRow(existingToken),
    });
  }

  let quotaUsedBytes = 0;
  try {
    const rows = (await db.orm.public.FileAsset.select("id", "fileSize")
      .where({ projectId } as never)
      .limit(500)
      .all()) as unknown as Array<{ fileSize: number | null }>;
    quotaUsedBytes = rows.reduce((n, r) => n + (r.fileSize ?? 0), 0);
  } catch {
    quotaUsedBytes = 0;
  }
  const quotaWouldExceed = quotaUsedBytes + fileSize > FILE_QUOTA_BYTES;

  const fileId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  const s3Key = buildS3Key(projectId, fileId, fileName);
  savePendingUpload({
    fileId,
    projectId,
    userId: user.id,
    fileName,
    mimeType,
    fileSize,
    s3Key,
    category,
    checksumSha256: checksumSha256 ?? null,
    clientToken,
    createdAt: Date.now(),
  });

  let uploadUrl: string | null = null;
  try {
    const signed = await presignPutUrl(s3Key, mimeType, fileSize);
    uploadUrl = signed.url;
  } catch (err) {
    return NextResponse.json(
      {
        error: "STORAGE_UNAVAILABLE",
        message:
          err instanceof Error ? err.message : "Storage is not configured.",
      },
      { status: 503 },
    );
  }

  await logWorkspaceAudit({
    userId: user.id,
    action: "files.request",
    targetType: "Project",
    targetId: projectId,
    details: { fileId, fileName, mimeType, fileSize, category },
    ipAddress: await clientIp(),
  });

  return NextResponse.json({
    uploadUrl,
    fileId,
    s3Key,
    expiresInSec: 15 * 60,
    quotaWouldExceed,
  });
}

function serializeRow(row: {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  extractionStatus: string;
  extractionError: string | null;
  createdAt: Date | string;
}) {
  return {
    id: row.id,
    fileName: row.fileName,
    fileSize: row.fileSize,
    mimeType: row.mimeType,
    category: row.category,
    extractionStatus: row.extractionStatus,
    extractionError: row.extractionError,
    createdAt: toIso(row.createdAt),
  };
}
