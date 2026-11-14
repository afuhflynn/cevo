import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { logExportAudit, serializeExportJob } from "@/lib/exports";
import { db } from "@/lib/prisma";
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
  const row = (await db.orm.public.ExportJob.where({ id: exportId }).first().catch(() => null)) as unknown as Parameters<
    typeof serializeExportJob
  >[0] | null;
  if (!row || (row as unknown as { projectId: string }).projectId !== projectId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ job: serializeExportJob(row) });
}
