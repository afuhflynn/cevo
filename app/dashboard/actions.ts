"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { stripCopyPrefix } from "@/lib/dashboard";
import { db } from "@/lib/prisma";

const idSchema = z.object({ projectId: z.string().min(1) });

export type DashboardActionResult = {
  ok: boolean;
  error?: string;
  newProjectId?: string;
  title?: string;
};

async function requireOwner() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: "UNAUTHENTICATED" as const };
  const row = await db.orm.public.User.where({ id: session.user.id }).first();
  if (!row || row.isActive === false)
    return { error: "UNAUTHENTICATED" as const };
  return { userId: row.id };
}

async function logAccessDenied(input: { userId: string; projectId: string }) {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? store.get("x-real-ip");
  await db.orm.public.AuditEvent.create({
    userId: input.userId,
    action: "project.access.denied",
    targetType: "Project",
    targetId: input.projectId,
    details: { reason: "cross-owner" } as unknown as never,
    ipAddress: ip ?? undefined,
  });
}

async function loadOwnedProject(userId: string, projectId: string) {
  const project = await db.orm.public.Project.where({ id: projectId }).first();
  if (!project || project.userId !== userId) return null;
  return project;
}

export async function duplicateProject(
  input: unknown,
): Promise<DashboardActionResult> {
  const owner = await requireOwner();
  if ("error" in owner) return { ok: false, error: "401" };
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "422" };
  const source = await loadOwnedProject(owner.userId, parsed.data.projectId);
  if (!source) {
    await logAccessDenied({
      userId: owner.userId,
      projectId: parsed.data.projectId,
    });
    return { ok: false, error: "403" };
  }

  const baseTitle = stripCopyPrefix(source.title);
  const newTitle = `Copy of ${baseTitle}`.slice(0, 200);

  const created = await db.transaction(async (tx) => {
    const project = await tx.orm.public.Project.create({
      userId: owner.userId,
      templateId: source.templateId,
      templateVersionId: source.templateVersionId,
      title: newTitle,
      projectType: source.projectType,
      qualification: source.qualification,
      programmeName: source.programmeName,
      submissionDeadline: undefined,
      status: source.status === "ARCHIVED" ? "PLANNING" : source.status,
      progressPercent: 0,
      referencingStyle: source.referencingStyle,
      isArchived: false,
    });

    const brief = await tx.orm.public.ProjectBrief.where({
      projectId: source.id,
    }).first();
    if (brief) {
      await tx.orm.public.ProjectBrief.create({
        projectId: project.id,
        background: brief.background,
        problemStatement: brief.problemStatement,
        aim: brief.aim,
        objectives: brief.objectives as unknown as never,
        researchQuestions: brief.researchQuestions as unknown as never,
        scope: brief.scope,
        limitations: brief.limitations,
        methodology: brief.methodology,
        expectedOutcomes: brief.expectedOutcomes,
        targetEnvironment: brief.targetEnvironment,
        isApproved: false,
      });
    }

    const outline = await tx.orm.public.ProjectOutline.where({
      projectId: source.id,
    }).first();
    if (outline) {
      await tx.orm.public.ProjectOutline.create({
        projectId: project.id,
        structure: outline.structure as unknown as never,
      });
    }

    const sections = await tx.orm.public.ProjectSection.select(
      "id",
      "parentId",
      "orderIndex",
      "title",
      "sectionType",
      "slug",
      "content",
      "wordCount",
    )
      .where((r) => r.projectId.eq(source.id))
      .orderBy((r) => r.orderIndex.asc())
      .limit(500)
      .all();
    const idMap = new Map<string, string>();
    for (const s of sections.sort((a, b) => {
      if (a.parentId === null && b.parentId !== null) return -1;
      if (a.parentId !== null && b.parentId === null) return 1;
      return a.orderIndex - b.orderIndex;
    })) {
      const created2 = await tx.orm.public.ProjectSection.create({
        projectId: project.id,
        parentId: s.parentId ? (idMap.get(s.parentId) ?? undefined) : undefined,
        orderIndex: s.orderIndex,
        title: s.title,
        sectionType: s.sectionType,
        slug: s.slug,
        content: (s.content ?? undefined) as unknown as never,
        wordCount: s.wordCount ?? 0,
        isCompleted: false,
      });
      idMap.set(s.id, created2.id);
    }

    const tasks = await tx.orm.public.ProjectTask.select(
      "title",
      "description",
      "dueDate",
      "orderIndex",
    )
      .where((r) => r.projectId.eq(source.id))
      .orderBy((r) => r.orderIndex.asc())
      .limit(200)
      .all();
    for (const t of tasks) {
      await tx.orm.public.ProjectTask.create({
        projectId: project.id,
        title: t.title,
        description: t.description ?? undefined,
        isCompleted: false,
        orderIndex: t.orderIndex ?? 0,
      });
    }

    await tx.orm.public.ProjectActivity.create({
      projectId: project.id,
      action: "project.duplicated",
      description: `Duplicated from "${source.title}"`,
    });
    return project;
  });

  revalidatePath("/dashboard");
  return { ok: true, newProjectId: created.id, title: newTitle };
}

export async function archiveProject(
  input: unknown,
): Promise<DashboardActionResult> {
  const owner = await requireOwner();
  if ("error" in owner) return { ok: false, error: "401" };
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "422" };
  const project = await loadOwnedProject(owner.userId, parsed.data.projectId);
  if (!project) {
    await logAccessDenied({
      userId: owner.userId,
      projectId: parsed.data.projectId,
    });
    return { ok: false, error: "403" };
  }
  await db.orm.public.Project.where({ id: project.id }).update({
    isArchived: true,
  });
  await db.orm.public.ProjectActivity.create({
    projectId: project.id,
    action: "project.archived",
    description: `Archived "${project.title}"`,
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/archived");
  return { ok: true };
}

export async function unarchiveProject(
  input: unknown,
): Promise<DashboardActionResult> {
  const owner = await requireOwner();
  if ("error" in owner) return { ok: false, error: "401" };
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "422" };
  const project = await loadOwnedProject(owner.userId, parsed.data.projectId);
  if (!project) {
    await logAccessDenied({
      userId: owner.userId,
      projectId: parsed.data.projectId,
    });
    return { ok: false, error: "403" };
  }
  await db.orm.public.Project.where({ id: project.id }).update({
    isArchived: false,
  });
  await db.orm.public.ProjectActivity.create({
    projectId: project.id,
    action: "project.unarchived",
    description: `Restored "${project.title}"`,
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/archived");
  return { ok: true };
}
