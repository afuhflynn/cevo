import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { sendExtractionEvent } from "@/lib/file-events";
import { toIso } from "@/lib/files";
import { db } from "@/lib/prisma";
import { loadOwnedProject } from "@/lib/workspace";

type Ctx = { params: Promise<{ projectId: string; fileId: string }> };

function ownerOnly(error: 403 | 404, role: string): { status: 403 | 404 } {
  if (error === 404) return { status: 404 };
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  return { status: isAdmin ? 403 : 404 };
}

export async function POST(_request: Request, { params }: Ctx) {
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
  const row = await db.orm.public.FileAsset.where({ id: fileId }).first();
  if (!row || row.projectId !== projectId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (row.extractionStatus === "COMPLETED") {
    return NextResponse.json({
      file: serializeRow(row),
      extractionStatus: "COMPLETED",
    });
  }
  await db.orm.public.FileAsset.where({ id: fileId }).update({
    extractionStatus: "PENDING",
    extractionError: null,
  } as never);
  await sendExtractionEvent({ fileId, projectId }).catch(() => undefined);
  const fresh = await db.orm.public.FileAsset.where({ id: fileId }).first();
  return NextResponse.json({
    file: fresh ? serializeRow(fresh) : serializeRow(row),
    extractionStatus: "PENDING",
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
