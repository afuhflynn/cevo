import { db } from "./prisma";

export const DASHBOARD_PAGE_SIZE = 12;
export const ACTIVITY_FEED_LIMIT = 10;

export const ACTIVE_STATUSES = [
  "DRAFT",
  "PLANNING",
  "IN_PROGRESS",
  "READY_FOR_REVIEW",
  "COMPLETED",
] as const;

export type DashboardProject = {
  id: string;
  title: string;
  programmeName: string | null;
  status: string;
  progressPercent: number;
  submissionDeadline: string | null;
  updatedAt: string;
  isApproved: boolean;
  openTasks: number;
  doneTasks: number;
};

export type DashboardActivity = {
  id: string;
  projectId: string;
  projectTitle: string;
  action: string;
  description: string;
  createdAt: string;
};

export type DashboardStats = {
  countsByStatus: Record<string, number>;
  totalActive: number;
  walletBalance: number;
  overallProgress: number;
};

export type DashboardCatalog = {
  projects: DashboardProject[];
  totalCount: number;
  totalPages: number;
  page: number;
};

function normalizeStatus(input: string | null | undefined): string | null {
  if (!input || input === "all") return null;
  const upper = input.toUpperCase();
  if ((ACTIVE_STATUSES as readonly string[]).includes(upper)) return upper;
  return null;
}

function matchesSearch(
  title: string,
  programme: string | null,
  q: string,
): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  if (title.toLowerCase().includes(needle)) return true;
  return (programme ?? "").toLowerCase().includes(needle);
}

export async function getDashboardStats(
  userId: string,
): Promise<DashboardStats> {
  const [projects, wallet] = await Promise.all([
    db.orm.public.Project.select("status", "progressPercent")
      .where((r) => r.userId.eq(userId))
      .where((r) => r.isArchived.eq(false))
      .limit(500)
      .all(),
    db.orm.public.CreditWallet.where({ userId }).first(),
  ]);
  const countsByStatus: Record<string, number> = {};
  for (const s of ACTIVE_STATUSES) countsByStatus[s] = 0;
  let progressSum = 0;
  for (const p of projects) {
    if (p.status in countsByStatus) countsByStatus[p.status] += 1;
    progressSum += p.progressPercent ?? 0;
  }
  return {
    countsByStatus,
    totalActive: projects.length,
    walletBalance: wallet?.balance ?? 0,
    overallProgress:
      projects.length === 0 ? 0 : Math.round(progressSum / projects.length),
  };
}

export async function getDashboardCatalog(input: {
  userId: string;
  search?: string;
  status?: string;
  page?: number;
  archived?: boolean;
}): Promise<DashboardCatalog> {
  const archived = input.archived ?? false;
  const pageRaw = input.page ?? 1;
  const page =
    Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const statusFilter = archived ? null : normalizeStatus(input.status);
  const q = (input.search ?? "").trim();

  const rows = await db.orm.public.Project.select(
    "id",
    "title",
    "programmeName",
    "status",
    "progressPercent",
    "submissionDeadline",
    "updatedAt",
  )
    .where((r) => r.userId.eq(input.userId))
    .where((r) => r.isArchived.eq(archived))
    .orderBy((r) => r.updatedAt.desc())
    .limit(500)
    .all();

  let filtered = rows;
  if (statusFilter)
    filtered = filtered.filter((r) => r.status === statusFilter);
  if (q)
    filtered = filtered.filter((r) =>
      matchesSearch(r.title, r.programmeName, q),
    );

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / DASHBOARD_PAGE_SIZE));
  const safePage = page > totalPages ? 1 : page;
  const start = (safePage - 1) * DASHBOARD_PAGE_SIZE;
  const slice = filtered.slice(start, start + DASHBOARD_PAGE_SIZE);

  const projects: DashboardProject[] = await Promise.all(
    slice.map(async (r) => {
      const [brief, tasks] = await Promise.all([
        db.orm.public.ProjectBrief.where({ projectId: r.id }).first(),
        db.orm.public.ProjectTask.select("isCompleted")
          .where((t) => t.projectId.eq(r.id))
          .limit(500)
          .all(),
      ]);
      const doneTasks = tasks.filter((t) => t.isCompleted).length;
      return {
        id: r.id,
        title: r.title,
        programmeName: r.programmeName,
        status: r.status,
        progressPercent: r.progressPercent ?? 0,
        submissionDeadline: r.submissionDeadline
          ? new Date(r.submissionDeadline).toISOString()
          : null,
        updatedAt: new Date(r.updatedAt).toISOString(),
        isApproved: brief?.isApproved ?? false,
        openTasks: tasks.length - doneTasks,
        doneTasks,
      };
    }),
  );

  return { projects, totalCount, totalPages, page: safePage };
}

export async function getDashboardActivities(
  userId: string,
): Promise<DashboardActivity[]> {
  const projects = await db.orm.public.Project.select("id", "title")
    .where((r) => r.userId.eq(userId))
    .where((r) => r.isArchived.eq(false))
    .limit(200)
    .all();
  if (projects.length === 0) return [];
  const titleById = new Map(projects.map((p) => [p.id, p.title]));
  const ids = projects.map((p) => p.id);

  const activities = await db.orm.public.ProjectActivity.select(
    "id",
    "projectId",
    "action",
    "description",
    "createdAt",
  )
    .where((r) => r.projectId.in(ids))
    .orderBy((r) => r.createdAt.desc())
    .limit(ACTIVITY_FEED_LIMIT)
    .all();

  return activities.map((a) => ({
    id: a.id,
    projectId: a.projectId,
    projectTitle: titleById.get(a.projectId) ?? "Project",
    action: a.action,
    description: a.description,
    createdAt: new Date(a.createdAt).toISOString(),
  }));
}

export function stripCopyPrefix(title: string): string {
  let out = title.trim();
  for (;;) {
    const lower = out.toLowerCase();
    if (lower.startsWith("copy of ")) {
      out = out.slice("copy of ".length).trim();
      continue;
    }
    break;
  }
  return out || "Untitled project";
}
