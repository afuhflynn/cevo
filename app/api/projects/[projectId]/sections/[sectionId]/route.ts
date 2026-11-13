import { NextResponse } from "next/server";
import { checkWorkspaceRateLimit } from "@/lib/arcjet";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import {
  clientIp,
  loadOwnedSection,
  logWorkspaceAudit,
} from "@/lib/workspace";
import { countWordsFromTiptap } from "@/lib/workspace-shared";
import {
  isValidTiptapDoc,
  sectionPatchSchema,
  sectionPutSchema,
} from "@/lib/workspace-validation";

type Ctx = { params: Promise<{ projectId: string; sectionId: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId, sectionId } = await params;
  const loaded = await loadOwnedSection({
    userId: user.id,
    role: user.role,
    projectId,
    sectionId,
    allowAdminRead: true,
  });
  if (!loaded.ok) {
    const status = loaded.error;
    return NextResponse.json({ error: status === 404 ? "NOT_FOUND" : "FORBIDDEN" }, { status });
  }
  const { section } = loaded;
  return NextResponse.json({
    section: {
      id: section.id,
      title: section.title,
      content: section.content ?? { type: "doc", content: [{ type: "paragraph" }] },
      version: section.version,
      wordCount: section.wordCount,
      isCompleted: section.isCompleted,
      parentId: section.parentId ?? null,
      orderIndex: section.orderIndex,
      updatedAt: new Date(section.updatedAt).toISOString(),
    },
    readOnly: loaded.readOnly ? true : undefined,
  });
}

export async function PUT(request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId, sectionId } = await params;
  const loaded = await loadOwnedSection({
    userId: user.id,
    role: user.role,
    projectId,
    sectionId,
    allowAdminRead: false,
  });
  if (!loaded.ok) {
    const status = loaded.error;
    return NextResponse.json({ error: status === 404 ? "NOT_FOUND" : "FORBIDDEN" }, { status });
  }
  if (!(await checkWorkspaceRateLimit(request))) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = sectionPutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.flatten() }, { status: 422 });
  }
  const docCheck = isValidTiptapDoc(parsed.data.content);
  if (!docCheck.ok) {
    return NextResponse.json({ error: "INVALID_DOCUMENT", errors: docCheck.errors }, { status: 422 });
  }
  const current = await db.orm.public.ProjectSection.where({ id: sectionId }).first();
  if (!current || current.projectId !== projectId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (current.version !== parsed.data.version) {
    return NextResponse.json(
      {
        error: "VERSION_CONFLICT",
        currentVersion: current.version,
        updatedAt: new Date(current.updatedAt).toISOString(),
      },
      { status: 409 },
    );
  }
  const wordCount = countWordsFromTiptap(parsed.data.content);
  const updated = await db.orm.public.ProjectSection.where({ id: sectionId }).update({
    content: parsed.data.content as unknown as never,
    wordCount,
    version: current.version + 1,
  });
  if (!updated) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  await logWorkspaceAudit({
    userId: user.id,
    action: "workspace.section.save",
    targetType: "ProjectSection",
    targetId: sectionId,
    details: { projectId, version: updated.version, wordCount },
    ipAddress: await clientIp(),
  });
  return NextResponse.json({
    section: {
      id: updated.id,
      content: updated.content,
      version: updated.version,
      wordCount: updated.wordCount,
      updatedAt: new Date(updated.updatedAt).toISOString(),
    },
  });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId, sectionId } = await params;
  const loaded = await loadOwnedSection({
    userId: user.id,
    role: user.role,
    projectId,
    sectionId,
    allowAdminRead: false,
  });
  if (!loaded.ok) {
    const status = loaded.error;
    return NextResponse.json({ error: status === 404 ? "NOT_FOUND" : "FORBIDDEN" }, { status });
  }
  if (!(await checkWorkspaceRateLimit(request))) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = sectionPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.flatten() }, { status: 422 });
  }
  const data = parsed.data ?? {};
  const section = loaded.section;
  if (data.title !== undefined || data.isCompleted !== undefined) {
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch["title"] = data.title.trim();
    if (data.isCompleted !== undefined) patch["isCompleted"] = data.isCompleted;
    const updated = await db.orm.public.ProjectSection.where({ id: sectionId }).update(patch as never);
    if (!updated) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    await logWorkspaceAudit({
      userId: user.id,
      action: "workspace.section.update",
      targetType: "ProjectSection",
      targetId: sectionId,
      details: { projectId, ...patch },
      ipAddress: await clientIp(),
    });
    return NextResponse.json({
      section: {
        id: updated.id,
        title: updated.title,
        parentId: updated.parentId ?? null,
        orderIndex: updated.orderIndex,
        isCompleted: updated.isCompleted,
        wordCount: updated.wordCount,
        version: updated.version,
      },
    });
  }
  const newParentId = data.parentId !== undefined ? (data.parentId ?? null) : (section.parentId ?? null);
  const newOrder = data.orderIndex ?? section.orderIndex;
  if (newParentId === sectionId) {
    return NextResponse.json({ error: "INVALID_MOVE", issues: ["a chapter can never be its own child"] }, { status: 422 });
  }
  if (newParentId) {
    const parent = await db.orm.public.ProjectSection.where({ id: newParentId }).first();
    if (!parent || parent.projectId !== projectId) {
      return NextResponse.json({ error: "INVALID_PARENT" }, { status: 422 });
    }
    if (parent.parentId) {
      return NextResponse.json({ error: "INVALID_MOVE", issues: ["nesting is limited to one level"] }, { status: 422 });
    }
    const children = await db.orm.public.ProjectSection.select("id")
      .where((r) => r.parentId.eq(sectionId))
      .limit(100)
      .all();
    if (children.length > 0) {
      return NextResponse.json({ error: "INVALID_MOVE", issues: ["chapters with children cannot be nested"] }, { status: 422 });
    }
  }
  const oldParent = section.parentId ?? null;
  if (oldParent !== (newParentId ?? null)) {
    const levelRows = await db.orm.public.ProjectSection.select("id", "parentId", "orderIndex")
      .where((r) => r.projectId.eq(projectId))
      .limit(500)
      .all();
    const oldLevel = levelRows.filter((r) => (r.parentId ?? null) === oldParent && r.id !== sectionId).sort((a, b) => a.orderIndex - b.orderIndex);
    for (let i = 0; i < oldLevel.length; i++) {
      await db.orm.public.ProjectSection.where({ id: oldLevel[i]!.id }).update({ orderIndex: i } as never);
    }
    const newLevel = levelRows.filter((r) => (r.parentId ?? null) === (newParentId ?? null) && r.id !== sectionId).sort((a, b) => a.orderIndex - b.orderIndex);
    const clamped = Math.max(0, Math.min(newOrder, newLevel.length));
    for (let i = newLevel.length - 1; i >= clamped; i--) {
      await db.orm.public.ProjectSection.where({ id: newLevel[i]!.id }).update({ orderIndex: i + 1 } as never);
    }
    const updated = await db.orm.public.ProjectSection.where({ id: sectionId }).update({
      parentId: newParentId ?? undefined,
      orderIndex: clamped,
    } as never);
    if (!updated) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    await logWorkspaceAudit({
      userId: user.id, action: "workspace.section.move", targetType: "ProjectSection", targetId: sectionId,
      details: { projectId, parentId: newParentId, orderIndex: clamped }, ipAddress: await clientIp(),
    });
    return NextResponse.json({ section: { id: updated.id, parentId: updated.parentId ?? null, orderIndex: updated.orderIndex, title: updated.title, isCompleted: updated.isCompleted, wordCount: updated.wordCount, version: updated.version } });
  }
  if (data.orderIndex !== undefined) {
    const siblings = await db.orm.public.ProjectSection.select("id", "parentId", "orderIndex")
      .where((r) => r.projectId.eq(projectId))
      .limit(500)
      .all();
    const level = siblings.filter((r) => (r.parentId ?? null) === (newParentId ?? null) && r.id !== sectionId).sort((a, b) => a.orderIndex - b.orderIndex);
    const clamped = Math.max(0, Math.min(newOrder, level.length));
    for (let i = level.length - 1; i >= clamped; i--) {
      await db.orm.public.ProjectSection.where({ id: level[i]!.id }).update({ orderIndex: i + 1 } as never);
    }
    const updated = await db.orm.public.ProjectSection.where({ id: sectionId }).update({ orderIndex: clamped } as never);
    if (!updated) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    await logWorkspaceAudit({
      userId: user.id, action: "workspace.section.reorder", targetType: "ProjectSection", targetId: sectionId,
      details: { projectId, orderIndex: clamped }, ipAddress: await clientIp(),
    });
    return NextResponse.json({ section: { id: updated.id, parentId: updated.parentId ?? null, orderIndex: updated.orderIndex, title: updated.title, isCompleted: updated.isCompleted, wordCount: updated.wordCount, version: updated.version } });
  }
  return NextResponse.json({ section: { id: section.id, title: section.title, parentId: section.parentId ?? null, orderIndex: section.orderIndex, isCompleted: section.isCompleted, wordCount: section.wordCount, version: section.version } });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId, sectionId } = await params;
  const loaded = await loadOwnedSection({
    userId: user.id,
    role: user.role,
    projectId,
    sectionId,
    allowAdminRead: false,
  });
  if (!loaded.ok) {
    const status = loaded.error;
    return NextResponse.json({ error: status === 404 ? "NOT_FOUND" : "FORBIDDEN" }, { status });
  }
  const all = await db.orm.public.ProjectSection.select("id", "parentId", "orderIndex")
    .where((r) => r.projectId.eq(projectId))
    .limit(500)
    .all();
  const toDelete = new Set<string>([sectionId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of all) {
      if (r.parentId && toDelete.has(r.parentId) && !toDelete.has(r.id)) {
        toDelete.add(r.id);
        grew = true;
      }
    }
  }
  for (const id of toDelete) {
    try {
      await db.orm.public.Citation.where({ sectionId: id }).deleteAll();
    } catch {
      /* best effort */
    }
    await db.orm.public.ProjectSection.where({ id }).delete().catch(() => undefined);
  }
  const remaining = await db.orm.public.ProjectSection.select("id", "parentId", "orderIndex")
    .where((r) => r.projectId.eq(projectId))
    .limit(500)
    .all();
  const byParent = new Map<string | null, typeof remaining>();
  for (const r of remaining) {
    const k = r.parentId ?? null;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)?.push(r);
  }
  for (const [, level] of byParent) {
    level.sort((a, b) => a.orderIndex - b.orderIndex);
    for (let i = 0; i < level.length; i++) {
      if (level[i]!.orderIndex !== i) {
        await db.orm.public.ProjectSection.where({ id: level[i]!.id }).update({ orderIndex: i } as never);
      }
    }
  }
  await logWorkspaceAudit({
    userId: user.id, action: "workspace.section.delete", targetType: "ProjectSection", targetId: sectionId,
    details: { projectId, deletedCount: toDelete.size }, ipAddress: await clientIp(),
  });
  return NextResponse.json({ ok: true, deletedCount: toDelete.size });
}
