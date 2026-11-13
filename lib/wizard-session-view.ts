import { db } from "./prisma";
import { suggestTemplate } from "./wizard-template";

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
