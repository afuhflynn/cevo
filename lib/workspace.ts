import { headers } from "next/headers";
import { db } from "./prisma";

export type {
  WorkspaceTreeNode,
} from "./workspace-shared";
export {
  buildTree,
  countWordsFromText,
  countWordsFromTiptap,
  extractHeadings,
  slugifyTitle,
} from "./workspace-shared";

export type WorkspaceSectionRow = {
  id: string;
  projectId: string;
  parentId: string | null;
  orderIndex: number;
  title: string;
  sectionType: string;
  slug: string;
  content: unknown;
  wordCount: number;
  version: number;
  isCompleted: boolean;
  updatedAt: string;
};

export async function clientIp(): Promise<string | undefined> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? store.get("x-real-ip") ?? undefined;
  return ip ?? undefined;
}

export async function logWorkspaceAudit(input: {
  userId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  await db.orm.public.AuditEvent.create({
    userId: input.userId ?? undefined,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    details: (input.details ?? {}) as unknown as never,
    ipAddress: input.ipAddress,
  });
}

export async function loadOwnedProject(input: {
  userId: string;
  role: string;
  projectId: string;
  allowAdminRead: boolean;
}): Promise<
  | { ok: false; error: 403 | 404 }
  | { ok: true; project: Awaited<ReturnType<typeof fetchProject>>; readOnly?: boolean }
> {
  const project = await fetchProject(input.projectId);
  if (!project) return { ok: false, error: 404 as const };
  if (project.userId === input.userId) return { ok: true, project };
  const isAdmin = input.role === "ADMIN" || input.role === "SUPER_ADMIN";
  if (isAdmin && input.allowAdminRead) return { ok: true, project, readOnly: true as const };
  await logWorkspaceAudit({
    userId: input.userId,
    action: "workspace.access.denied",
    targetType: "Project",
    targetId: input.projectId,
    details: { reason: "cross-owner" },
    ipAddress: await clientIp(),
  });
  return { ok: false, error: 403 as const };
}

async function fetchProject(projectId: string) {
  return db.orm.public.Project.where({ id: projectId }).first();
}

export async function loadOwnedSection(input: {
  userId: string;
  role: string;
  projectId: string;
  sectionId: string;
  allowAdminRead: boolean;
}) {
  const owned = await loadOwnedProject({
    userId: input.userId,
    role: input.role,
    projectId: input.projectId,
    allowAdminRead: input.allowAdminRead,
  });
  if (!owned.ok) return owned;
  const section = await db.orm.public.ProjectSection.where({ id: input.sectionId }).first();
  if (!section || section.projectId !== input.projectId) return { ok: false as const, error: 404 as const };
  return { ...owned, section };
}
