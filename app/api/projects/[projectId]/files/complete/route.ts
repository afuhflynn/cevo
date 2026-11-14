import { NextResponse } from "next/server";
import { z } from "zod";
import { checkFilesRateLimit } from "@/lib/arcjet";
import { getCurrentUser } from "@/lib/auth-helpers";
import { sendExtractionEvent } from "@/lib/file-events";
import {
  checkFilesCap,
  dropPendingUpload,
  takePendingUpload,
} from "@/lib/file-uploads";
import {
  FILE_QUOTA_BYTES,
  initialExtractionStatus,
  isTokenStale,
  sniffMime,
  toIso,
} from "@/lib/files";
import { db } from "@/lib/prisma";
import {
  deleteStorageObject,
  getObjectHeadBytes,
  headObjectSize,
} from "@/lib/storage";
import { clientIp, loadOwnedProject, logWorkspaceAudit } from "@/lib/workspace";

type Ctx = { params: Promise<{ projectId: string }> };

const completeSchema = z.object({
  fileId: z.string().min(1).max(64),
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
  const cap = checkFilesCap(user.id, "complete");
  if (!cap.allowed) {
    return NextResponse.json(
      { error: "RATE_LIMITED", retryAfterSeconds: cap.retryAfterSeconds },
      {
        status: 429,
        headers: { "retry-after": String(cap.retryAfterSeconds) },
      },
    );
  }
  if (!(await checkFilesRateLimit(request, "complete"))) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const { fileId, clientToken } = parsed.data;

  const existingById = await db.orm.public.FileAsset.where({
    id: fileId,
  }).first();
  if (existingById) {
    if (existingById.projectId !== projectId) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (existingById.clientToken !== clientToken) {
      return NextResponse.json(
        {
          error: "TOKEN_MISMATCH",
          message: "Client token does not match this file.",
        },
        { status: 400 },
      );
    }
    if (isTokenStale(existingById.createdAt)) {
      return NextResponse.json(
        {
          error: "STALE_TOKEN",
          message: "Upload token expired. Request a new upload.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json({
      file: serializeRow(existingById),
      deduplicated: false,
      extractionStatus: existingById.extractionStatus,
    });
  }

  const pending = takePendingUpload(fileId);
  if (
    !pending ||
    pending.projectId !== projectId ||
    pending.clientToken !== clientToken
  ) {
    return NextResponse.json(
      {
        error: "UNKNOWN_UPLOAD",
        message:
          "No pending upload matches this file. Request a new upload URL.",
      },
      { status: 404 },
    );
  }
  if (Date.now() - pending.createdAt > 24 * 60 * 60 * 1000) {
    dropPendingUpload(fileId);
    return NextResponse.json(
      {
        error: "STALE_TOKEN",
        message: "Upload token expired. Request a new upload.",
      },
      { status: 400 },
    );
  }

  const landedSize = await headObjectSize(pending.s3Key);
  if (landedSize === null) {
    return NextResponse.json(
      {
        error: "BYTES_MISSING",
        message:
          "No bytes landed for this upload yet. PUT the file first, then complete.",
      },
      { status: 400 },
    );
  }
  if (landedSize !== pending.fileSize) {
    await deleteStorageObject(pending.s3Key).catch(() => false);
    return NextResponse.json(
      {
        error: "SIZE_MISMATCH",
        message: `Landed size ${landedSize} does not match requested size ${pending.fileSize}.`,
      },
      { status: 400 },
    );
  }

  const head = await getObjectHeadBytes(pending.s3Key);
  if (head && !sniffMime(head, pending.mimeType)) {
    await deleteStorageObject(pending.s3Key).catch(() => false);
    return NextResponse.json(
      {
        error: "INVALID_TYPE",
        message: "File bytes do not match the declared type.",
      },
      { status: 400 },
    );
  }

  const created = await db.transaction(async (tx) => {
    const existingRows = (await tx.orm.public.FileAsset.select(
      "id",
      "fileSize",
      "checksumSha256",
      "clientToken",
      "createdAt",
    )
      .where({ projectId } as never)
      .limit(500)
      .all()) as unknown as Array<{
      id: string;
      fileSize: number | null;
      checksumSha256: string | null;
      clientToken: string;
      createdAt: Date | string;
    }>;

    const byToken = existingRows.find((r) => r.clientToken === clientToken);
    if (byToken) {
      if (isTokenStale(byToken.createdAt)) return { kind: "stale" as const };
      const full = await tx.orm.public.FileAsset.where({
        id: byToken.id,
      }).first();
      return { kind: "token" as const, row: full };
    }

    if (pending.checksumSha256) {
      const dupe = existingRows.find(
        (r) => r.checksumSha256 === pending.checksumSha256,
      );
      if (dupe) {
        const full = await tx.orm.public.FileAsset.where({
          id: dupe.id,
        }).first();
        return { kind: "dedupe" as const, row: full };
      }
    }

    const used = existingRows.reduce((n, r) => n + (r.fileSize ?? 0), 0);
    if (used + pending.fileSize > FILE_QUOTA_BYTES)
      return { kind: "quota" as const, used };

    const row = await tx.orm.public.FileAsset.create({
      id: pending.fileId,
      projectId,
      uploadedByUserId: user.id,
      fileName: pending.fileName,
      fileSize: pending.fileSize,
      mimeType: pending.mimeType,
      s3Key: pending.s3Key,
      category: pending.category as never,
      checksumSha256: pending.checksumSha256 ?? undefined,
      clientToken: pending.clientToken,
      extractionStatus: initialExtractionStatus(pending.mimeType),
    } as never);
    return { kind: "created" as const, row };
  });

  if (created.kind === "stale") {
    return NextResponse.json(
      {
        error: "STALE_TOKEN",
        message: "Upload token expired. Request a new upload.",
      },
      { status: 400 },
    );
  }
  if (created.kind === "quota") {
    await deleteStorageObject(pending.s3Key).catch(() => false);
    dropPendingUpload(fileId);
    return NextResponse.json(
      {
        error: "QUOTA_EXCEEDED",
        message: "Project storage quota of 200MB would be exceeded.",
        quotaUsedBytes: created.used,
      },
      { status: 409 },
    );
  }
  if ((created.kind === "token" || created.kind === "dedupe") && created.row) {
    if (created.kind === "dedupe") {
      await deleteStorageObject(pending.s3Key).catch(() => false);
    }
    dropPendingUpload(fileId);
    return NextResponse.json({
      file: serializeRow(created.row),
      deduplicated: created.kind === "dedupe",
      extractionStatus: created.row.extractionStatus,
    });
  }
  if (!created.row) {
    return NextResponse.json({ error: "COMPLETE_FAILED" }, { status: 500 });
  }

  dropPendingUpload(fileId);

  await logWorkspaceAudit({
    userId: user.id,
    action: "files.complete",
    targetType: "FileAsset",
    targetId: created.row.id,
    details: {
      projectId,
      fileName: pending.fileName,
      fileSize: pending.fileSize,
    },
    ipAddress: await clientIp(),
  });

  if (created.row.extractionStatus === "PENDING") {
    await sendExtractionEvent({ fileId: created.row.id, projectId }).catch(
      () => undefined,
    );
  }

  return NextResponse.json({
    file: serializeRow(created.row),
    deduplicated: false,
    extractionStatus: created.row.extractionStatus,
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
