import { db } from "./prisma";

export type TemplateSuggestion = {
  templateId: string;
  templateVersionId: string;
  title: string;
  reason: string;
} | null;

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export async function suggestTemplate(input: {
  qualification?: string | null;
  department?: string | null;
}): Promise<TemplateSuggestion> {
  const qualification = norm(input.qualification);
  const department = norm(input.department);
  if (!qualification && !department) return null;

  const templates = await db.orm.public.ProjectTemplate.select(
    "id",
    "title",
    "qualification",
    "departmentId",
  )
    .where((r) => r.isActive.eq(true))
    .limit(100)
    .all();
  if (templates.length === 0) return null;

  const departments = await db.orm.public.Department.select("id", "name")
    .where((r) =>
      r.id.in(templates.map((t) => t.departmentId ?? "").filter(Boolean)),
    )
    .limit(100)
    .all();
  const deptNameById = new Map(departments.map((d) => [d.id, d.name]));

  let best: (typeof templates)[number] | null = null;
  let bestScore = 0;
  for (const t of templates) {
    let score = 0;
    if (qualification && norm(String(t.qualification)) === qualification)
      score += 2;
    const deptName = norm(
      t.departmentId ? deptNameById.get(t.departmentId) : null,
    );
    if (department && deptName && deptName === department) score += 2;
    else if (department && deptName && deptName.includes(department))
      score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  if (!best || bestScore === 0) return null;

  const version = await db.orm.public.TemplateVersion.where({
    templateId: best.id,
  })
    .where((r) => r.isPublished.eq(true))
    .orderBy((r) => r.version.desc())
    .first();
  if (!version) return null;

  const parts: string[] = [];
  if (qualification) parts.push(`matches your ${input.qualification} level`);
  const deptName = best.departmentId
    ? deptNameById.get(best.departmentId)
    : null;
  if (deptName) parts.push(`used by ${deptName}`);
  return {
    templateId: best.id,
    templateVersionId: version.id,
    title: best.title,
    reason:
      parts.length > 0
        ? `Suggested because it ${parts.join(" and ")}. You can keep it or pick another template.`
        : "Suggested as the closest active template. You can keep it or pick another template.",
  };
}

export async function listActiveTemplateVersions(
  limit = 50,
): Promise<{ id: string; title: string; version: number }[]> {
  const versions = await db.orm.public.TemplateVersion.select(
    "id",
    "templateId",
    "version",
  )
    .where((r) => r.isPublished.eq(true))
    .orderBy((r) => r.version.desc())
    .limit(limit)
    .all();
  if (versions.length === 0) return [];
  const templates = await db.orm.public.ProjectTemplate.select("id", "title")
    .where((r) => r.id.in(versions.map((v) => v.templateId)))
    .limit(limit)
    .all();
  const titleById = new Map(templates.map((t) => [t.id, t.title]));
  return versions.map((v) => ({
    id: v.id,
    title: titleById.get(v.templateId) ?? "Template",
    version: v.version,
  }));
}
