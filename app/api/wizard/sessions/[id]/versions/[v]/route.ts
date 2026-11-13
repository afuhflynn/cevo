import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import { loadOwnedWizardSession } from "@/lib/wizard-guards";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; v: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const { id, v } = await params;
  const versionNum = Number.parseInt(v, 10);
  if (!Number.isFinite(versionNum) || versionNum < 1) {
    return NextResponse.json({ error: "INVALID_VERSION" }, { status: 422 });
  }
  const loaded = await loadOwnedWizardSession({
    userId: user.id,
    role: user.role,
    sessionId: id,
    allowAdminRead: true,
  });
  if ("error" in loaded) {
    const status = loaded.error;
    return NextResponse.json(
      { error: status === 404 ? "NOT_FOUND" : "FORBIDDEN" },
      { status },
    );
  }
  const { session } = loaded;
  if (!session.projectId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const brief = await db.orm.public.ProjectBrief.where({
    projectId: session.projectId,
  }).first();
  if (!brief) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const row = await db.orm.public.BriefVersion.where({ briefId: brief.id })
    .where((r) => r.version.eq(versionNum))
    .first();
  if (!row) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({
    version: row.version,
    payload: row.payload,
    modelId: row.modelId,
    tokenCost: row.tokenCost,
    createdAt: new Date(row.createdAt).toISOString(),
    current: row.version === session.currentBriefVersion,
  });
}
