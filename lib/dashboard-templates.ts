import { db } from "@/lib/prisma";

export type VisibleTemplate = {
  id: string;
  title: string;
  versionId: string;
  version: number;
  institutionId: string | null;
  institutionName: string | null;
};

export type TemplateInstitution = {
  id: string;
  name: string;
  count: number;
};

type TemplateRow = {
  id: string;
  title: string;
  institutionId: string | null;
};

type VersionRow = {
  id: string;
  templateId: string;
  version: number;
  isPublished: boolean;
  publishedAt: unknown;
};

async function latestPublishedByTemplate(): Promise<Map<string, VersionRow>> {
  const versions = (await db.orm.public.TemplateVersion.select(
    "id",
    "templateId",
    "version",
    "isPublished",
    "publishedAt",
  )
    .where((r) => r.isPublished.eq(true))
    .limit(500)
    .all()) as unknown as VersionRow[];
  const latest = new Map<string, VersionRow>();
  for (const v of versions) {
    const cur = latest.get(v.templateId);
    if (!cur) {
      latest.set(v.templateId, v);
      continue;
    }
    const curTime = cur.publishedAt
      ? new Date(cur.publishedAt as string).getTime()
      : 0;
    const vTime = v.publishedAt
      ? new Date(v.publishedAt as string).getTime()
      : 0;
    if (vTime > curTime || (vTime === curTime && v.id > cur.id)) {
      latest.set(v.templateId, v);
    }
  }
  return latest;
}

/**
 * Templates a student can actually use: active templates with at least one
 * published version (same visibility rule as matchTemplateForUser).
 */
export async function listVisibleTemplates(input: {
  search?: string;
  institutionId?: string | null;
}): Promise<VisibleTemplate[]> {
  const q = (input.search ?? "").trim().toLowerCase();
  const institutionFilter = input.institutionId ?? null;
  const templates = (await db.orm.public.ProjectTemplate.select(
    "id",
    "title",
    "institutionId",
    "isActive",
  )
    .where((r) => r.isActive.eq(true))
    .limit(200)
    .all()) as unknown as (TemplateRow & { isActive: boolean })[];

  const latest = await latestPublishedByTemplate();
  let rows = templates.filter((t) => latest.has(t.id));
  if (institutionFilter === "other") {
    rows = rows.filter((t) => !t.institutionId);
  } else if (institutionFilter) {
    rows = rows.filter((t) => t.institutionId === institutionFilter);
  }
  if (q) {
    rows = rows.filter((t) => t.title.toLowerCase().includes(q));
  }

  const institutionIds = [
    ...new Set(rows.map((t) => t.institutionId).filter(Boolean)),
  ] as string[];
  const nameById = new Map<string, string>();
  if (institutionIds.length > 0) {
    const first = institutionIds[0] as string;
    const rest = institutionIds.slice(1);
    const institutions = (await db.orm.public.Institution.select("id", "name")
      .where((r) =>
        rest.length > 0 ? r.id.in([first, ...rest]) : r.id.eq(first),
      )
      .limit(100)
      .all()) as unknown as { id: string; name: string }[];
    for (const inst of institutions) nameById.set(inst.id, inst.name);
  }

  return rows
    .map((t) => {
      const v = latest.get(t.id) as VersionRow;
      return {
        id: t.id,
        title: t.title,
        versionId: v.id,
        version: v.version,
        institutionId: t.institutionId,
        institutionName: t.institutionId
          ? (nameById.get(t.institutionId) ?? null)
          : null,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, 60);
}

export async function listTemplateInstitutions(): Promise<{
  institutions: TemplateInstitution[];
  otherCount: number;
}> {
  const templates = (await db.orm.public.ProjectTemplate.select(
    "id",
    "institutionId",
    "isActive",
  )
    .where((r) => r.isActive.eq(true))
    .limit(200)
    .all()) as unknown as { id: string; institutionId: string | null }[];
  const latest = await latestPublishedByTemplate();
  const usable = templates.filter((t) => latest.has(t.id));
  const counts = new Map<string, number>();
  let otherCount = 0;
  for (const t of usable) {
    if (t.institutionId)
      counts.set(t.institutionId, (counts.get(t.institutionId) ?? 0) + 1);
    else otherCount += 1;
  }
  const ids = [...counts.keys()];
  const nameById = new Map<string, string>();
  if (ids.length > 0) {
    const first = ids[0] as string;
    const rest = ids.slice(1);
    const institutions = (await db.orm.public.Institution.select("id", "name")
      .where((r) =>
        rest.length > 0 ? r.id.in([first, ...rest]) : r.id.eq(first),
      )
      .limit(100)
      .all()) as unknown as { id: string; name: string }[];
    for (const inst of institutions) nameById.set(inst.id, inst.name);
  }
  const institutions = [...counts.entries()]
    .map(([id, count]) => ({
      id,
      name: nameById.get(id) ?? "Unknown institution",
      count,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { institutions, otherCount };
}

/**
 * Validate a gallery-chosen version for the Basics chip: only published
 * versions of active templates resolve. Anything else → null, and the
 * new-project flow proceeds without a template (never a 500).
 */
export async function getVisibleTemplateVersion(versionId: string): Promise<{
  versionId: string;
  templateId: string;
  title: string;
  version: number;
} | null> {
  const version = (await db.orm.public.TemplateVersion.where({
    id: versionId,
  }).first()) as unknown as {
    id: string;
    templateId: string;
    version: number;
    isPublished: boolean;
  } | null;
  if (!version || !version.isPublished) return null;
  const template = (await db.orm.public.ProjectTemplate.where({
    id: version.templateId,
  }).first()) as unknown as {
    id: string;
    title: string;
    isActive: boolean;
  } | null;
  if (!template || !template.isActive) return null;
  return {
    versionId: version.id,
    templateId: template.id,
    title: template.title,
    version: version.version,
  };
}
