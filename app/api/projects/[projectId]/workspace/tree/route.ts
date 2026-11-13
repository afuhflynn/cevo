import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import { buildTree } from "@/lib/workspace-shared";
import { loadOwnedProject } from "@/lib/workspace";

export async function GET(
  _request: Request,
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
    allowAdminRead: true,
  });
  if (!loaded.ok) {
    const status = loaded.error;
    return NextResponse.json(
      { error: status === 404 ? "NOT_FOUND" : "FORBIDDEN" },
      { status },
    );
  }
  const rows = await db.orm.public.ProjectSection.select(
    "id",
    "parentId",
    "orderIndex",
    "title",
    "isCompleted",
    "wordCount",
  )
    .where((r) => r.projectId.eq(projectId))
    .limit(500)
    .all();
  const tree = buildTree(
    rows.map((r) => ({
      id: r.id,
      parentId: r.parentId ?? null,
      orderIndex: r.orderIndex,
      title: r.title,
      isCompleted: r.isCompleted,
      wordCount: r.wordCount ?? 0,
    })),
  );
  return NextResponse.json({
    sections: tree,
    readOnly: "readOnly" in loaded ? true : undefined,
  });
}
