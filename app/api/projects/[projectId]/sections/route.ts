import { NextResponse } from "next/server";
import { checkWorkspaceRateLimit } from "@/lib/arcjet";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import { clientIp, loadOwnedProject, logWorkspaceAudit, slugifyTitle } from "@/lib/workspace";
import { sectionCreateSchema } from "@/lib/workspace-validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const { projectId } = await params;
  const loaded = await loadOwnedProject({
    userId: user.id,
    role: user.role,
    projectId,
    allowAdminRead: false,
  });
  if (!loaded.ok) {
    const status = loaded.error;
    return NextResponse.json(
      { error: status === 404 ? "NOT_FOUND" : "FORBIDDEN" },
      { status },
    );
  }
  if (!(await checkWorkspaceRateLimit(request))) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = sectionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const rawTitle = parsed.data.title?.trim() || "Untitled chapter";
  const title = rawTitle.slice(0, 200);
  const parentId = parsed.data.parentId ?? null;
  if (parentId) {
    const parent = await db.orm.public.ProjectSection.where({ id: parentId }).first();
    if (!parent || parent.projectId !== projectId) {
      return NextResponse.json({ error: "INVALID_PARENT" }, { status: 422 });
    }
    if (parent.parentId) {
      return NextResponse.json(
        { error: "INVALID_MOVE", issues: ["nesting is limited to one level"] },
        { status: 422 },
      );
    }
  }
  const siblings = await db.orm.public.ProjectSection.select("orderIndex")
    .where((r) => r.projectId.eq(projectId))
    .limit(500)
    .all();
  const sameLevel = parentId
    ? siblings.filter(() => true)
    : siblings;
  void sameLevel;
  const levelRows = await db.orm.public.ProjectSection.select("id", "parentId", "orderIndex")
    .where((r) => r.projectId.eq(projectId))
    .limit(500)
    .all();
  const inLevel = levelRows.filter((r) => (r.parentId ?? null) === parentId);
  const maxOrder = inLevel.reduce((m, r) => Math.max(m, r.orderIndex), -1);
  const orderIndex = maxOrder + 1;
  const created = await db.orm.public.ProjectSection.create({
    projectId,
    parentId: parentId ?? undefined,
    orderIndex,
    title,
    sectionType: "CHAPTER",
    slug: `${slugifyTitle(title)}-${Date.now().toString(36)}`,
    content: { type: "doc", content: [{ type: "paragraph" }] } as unknown as never,
    wordCount: 0,
    version: 1,
    isCompleted: false,
  });
  await logWorkspaceAudit({
    userId: user.id,
    action: "workspace.section.create",
    targetType: "ProjectSection",
    targetId: created.id,
    details: { projectId, parentId },
    ipAddress: await clientIp(),
  });
  return NextResponse.json(
    {
      section: {
        id: created.id,
        parentId: created.parentId ?? null,
        orderIndex: created.orderIndex,
        title: created.title,
        isCompleted: created.isCompleted,
        wordCount: created.wordCount,
        version: created.version,
      },
    },
    { status: 201 },
  );
}
