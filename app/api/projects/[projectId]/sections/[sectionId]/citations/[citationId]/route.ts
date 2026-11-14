import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import { clientIp, loadOwnedSection, logWorkspaceAudit } from "@/lib/workspace";

type Ctx = {
  params: Promise<{ projectId: string; sectionId: string; citationId: string }>;
};

export async function DELETE(_request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId, sectionId, citationId } = await params;
  const loaded = await loadOwnedSection({
    userId: user.id, role: user.role, projectId, sectionId, allowAdminRead: false,
  });
  if (!loaded.ok) {
    if (loaded.error === 404)
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
    if (isAdmin)
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (loaded.readOnly)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const row = await db.orm.public.Citation.where({ id: citationId }).first();
  if (!row || row.sectionId !== sectionId) {
    const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
    if (isAdmin && row)
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  await db.orm.public.Citation.where({ id: citationId }).delete().catch(() => undefined);
  await logWorkspaceAudit({
    userId: user.id,
    action: "citation.delete",
    targetType: "Citation",
    targetId: citationId,
    details: { projectId, sectionId, sourceId: row.sourceId },
    ipAddress: await clientIp(),
  });
  return NextResponse.json({ ok: true });
}
