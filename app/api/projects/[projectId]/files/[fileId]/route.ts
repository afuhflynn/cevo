import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import { deleteStorageObject } from "@/lib/storage";
import { clientIp, loadOwnedProject, logWorkspaceAudit } from "@/lib/workspace";

type Ctx = { params: Promise<{ projectId: string; fileId: string }> };

function ownerOnly(error: 403 | 404, role: string): { status: 403 | 404 } {
  if (error === 404) return { status: 404 };
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  return { status: isAdmin ? 403 : 404 };
}

export async function DELETE(_request: Request, { params }: Ctx) {
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
  const s3Deleted = await deleteStorageObject(row.s3Key);
  await db.orm.public.FileAsset.where({ id: fileId }).delete();
  await logWorkspaceAudit({
    userId: user.id,
    action: "files.delete",
    targetType: "FileAsset",
    targetId: fileId,
    details: { projectId, fileName: row.fileName, s3Deleted },
    ipAddress: await clientIp(),
  });
  return NextResponse.json({ ok: true, s3Deleted });
}
