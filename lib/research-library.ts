import { db } from "@/lib/prisma";

export type ResearchLibraryProject = { id: string; title: string };

export type ResearchLibraryGroup = {
  projectId: string;
  title: string;
  count: number;
};

export type ResearchLibrarySummary = {
  projects: ResearchLibraryProject[];
  groups: ResearchLibraryGroup[];
};

/**
 * Cross-project saved-source summary for one user. Two queries, no fan-out:
 * the user's active projects, then all of their source links counted in code.
 * Group membership is derived from ownership (Project.userId), never trusted
 * from the client.
 */
export async function getResearchLibrarySummary(
  userId: string,
): Promise<ResearchLibrarySummary> {
  const projects = (await db.orm.public.Project.select(
    "id",
    "title",
    "updatedAt",
  )
    .where((r) => r.userId.eq(userId))
    .where((r) => r.isArchived.eq(false))
    .orderBy((r) => r.updatedAt.desc())
    .limit(100)
    .all()) as unknown as { id: string; title: string; updatedAt: unknown }[];

  const byId = new Map(projects.map((p) => [p.id, p.title]));
  const ids = projects.map((p) => p.id);
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const first = ids[0] as string;
    const rest = ids.slice(1);
    const linkRows = (await db.orm.public.ProjectSource.select("projectId")
      .where((r) =>
        rest.length > 0
          ? r.projectId.in([first, ...rest])
          : r.projectId.eq(first),
      )
      .limit(2000)
      .all()) as unknown as { projectId: string }[];
    for (const row of linkRows) {
      if (!byId.has(row.projectId)) continue;
      counts.set(row.projectId, (counts.get(row.projectId) ?? 0) + 1);
    }
  }
  const groups = [...counts.entries()]
    .map(([projectId, count]) => ({
      projectId,
      title: byId.get(projectId) ?? "Untitled project",
      count,
    }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));

  return {
    projects: projects.map((p) => ({ id: p.id, title: p.title })),
    groups,
  };
}
