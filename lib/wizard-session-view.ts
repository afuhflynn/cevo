import { db } from "./prisma";
import { suggestTemplate, type TemplateSuggestion } from "./wizard-template";

export async function suggestTemplateSafe(sessionId: string, userId: string) {
  const session = await db.orm.public.WizardSession.where({
    id: sessionId,
  }).first();
  let qualification = session?.qualification ?? null;
  let department = session?.departmentName ?? null;
  if (!qualification || !department) {
    const profile = await db.orm.public.AcademicProfile.where({
      userId,
    }).first();
    if (profile) {
      qualification = qualification ?? String(profile.qualification ?? "");
      if (!department && profile.departmentId) {
        const dept = await db.orm.public.Department.where({
          id: profile.departmentId,
        }).first();
        department = department ?? dept?.name ?? null;
      }
    }
  }
  return suggestTemplate({ qualification, department });
}

/**
 * Explicit gallery choice wins over auto-suggestion: when the session's
 * project already carries a template version (chosen on the templates page
 * via ?template=) and that version is still published + active, surface it
 * as the suggestion so the briefing preselects it. Otherwise fall back to
 * the profile-based suggestion.
 */
export async function resolveSessionTemplate(
  session: { id: string; projectId: unknown },
  userId: string,
): Promise<TemplateSuggestion> {
  const projectId =
    typeof session.projectId === "string" ? session.projectId : null;
  if (projectId) {
    const project = (await db.orm.public.Project.where({
      id: projectId,
    }).first()) as unknown as {
      templateId: string | null;
      templateVersionId: string | null;
    } | null;
    const versionId = project?.templateVersionId ?? null;
    if (versionId) {
      const version = (await db.orm.public.TemplateVersion.where({
        id: versionId,
      }).first()) as unknown as {
        id: string;
        templateId: string;
        version: number;
        isPublished: boolean;
      } | null;
      const template = version
        ? ((await db.orm.public.ProjectTemplate.where({
            id: version.templateId,
          }).first()) as unknown as {
            id: string;
            title: string;
            isActive: boolean;
          } | null)
        : null;
      if (version?.isPublished && template?.isActive) {
        return {
          templateId: template.id,
          templateVersionId: version.id,
          title: template.title,
          reason:
            "Chosen from the template gallery. You can keep it or pick another template.",
        };
      }
    }
  }
  return suggestTemplateSafe(session.id, userId);
}
