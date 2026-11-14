import { NextResponse } from "next/server";
import { checkFilesRateLimit } from "@/lib/arcjet";
import { getCurrentUser } from "@/lib/auth-helpers";
import { checkFilesCap } from "@/lib/file-uploads";
import { db } from "@/lib/prisma";
import { presignPreviewUrl } from "@/lib/storage";
import { clientIp, loadOwnedProject, logWorkspaceAudit } from "@/lib/workspace";

type Ctx = { params: Promise<{ projectId: string; fileId: string }> };

function ownerOnly(error: 403 | 404, role: string): { status: 403 | 404 } {
  if (error === 404) return { status: 404 };
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  return { status: isAdmin ? 403 : 404 };
}

export async function GET(request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId, fileId } = await params;
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
  const cap = checkFilesCap(user.id, "preview");
  if (!cap.allowed) {
    return NextResponse.json(
      { error: "RATE_LIMITED", retryAfterSeconds: cap.retryAfterSeconds },
      {
        status: 429,
        headers: { "retry-after": String(cap.retryAfterSeconds) },
      },
    );
  }
  if (!(await checkFilesRateLimit(request, "preview"))) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  const row = await db.orm.public.FileAsset.where({ id: fileId }).first();
  if (!row || row.projectId !== projectId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  let previewUrl: string;
  try {
    const signed = await presignPreviewUrl(
      row.s3Key,
      row.fileName,
      row.mimeType,
    );
    previewUrl = signed.url;
    await logWorkspaceAudit({
      userId: user.id,
      action: "files.preview",
      targetType: "FileAsset",
      targetId: row.id,
      details: { projectId },
      ipAddress: await clientIp(),
    });
    return NextResponse.json({ previewUrl, expiresInSec: signed.expiresInSec });
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
}
