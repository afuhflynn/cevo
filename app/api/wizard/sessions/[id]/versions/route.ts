import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import { loadOwnedWizardSession } from "@/lib/wizard-guards";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const { id } = await params;
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
    return NextResponse.json({ versions: [], totalCount: 0 });
  }
  const brief = await db.orm.public.ProjectBrief.where({
    projectId: session.projectId,
  }).first();
  if (!brief) {
    return NextResponse.json({ versions: [], totalCount: 0 });
  }

  const url = new URL(request.url);
  const pageRaw = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const pageSize = 10;

  const all = await db.orm.public.BriefVersion.select(
    "id",
    "version",
    "modelId",
    "tokenCost",
    "createdAt",
  )
    .where((r) => r.briefId.eq(brief.id))
    .orderBy((r) => r.version.desc())
    .limit(200)
    .all();

  const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
  const safePage = page > totalPages ? 1 : page;
  const slice = all.slice((safePage - 1) * pageSize, safePage * pageSize);

  return NextResponse.json({
    versions: slice.map((v) => ({
      id: v.id,
      version: v.version,
      modelId: v.modelId,
      tokenCost: v.tokenCost,
      createdAt: new Date(v.createdAt).toISOString(),
      current: v.version === session.currentBriefVersion,
    })),
    totalCount: all.length,
    totalPages,
    page: safePage,
  });
}
