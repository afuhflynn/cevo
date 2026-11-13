import { firstGapStep } from "./onboarding-validation";
import { db } from "./prisma";

export type OnboardingState = {
  student: {
    firstName: string;
    lastName: string;
    country: string;
    preferredLanguage: string;
    onboardingCompleted: boolean;
    onboardingStep: number;
  } | null;
  academic: {
    institutionId: string | null;
    customInstitution: string | null;
    facultyId: string | null;
    customFaculty: string | null;
    departmentId: string | null;
    customDepartment: string | null;
    programmeId: string | null;
    qualification: string | null;
    academicSession: string | null;
    preferredStyle: string | null;
  } | null;
  gap: 1 | 2 | 3 | null;
  completed: boolean;
};

export async function ensureProfiles(userId: string): Promise<void> {
  const student = await db.orm.public.StudentProfile.where({
    userId,
  }).first();
  if (!student) {
    await db.orm.public.StudentProfile.create({
      userId,
      firstName: "",
      lastName: "",
      preferredLanguage: "en",
      country: "Cameroon",
      onboardingCompleted: false,
      onboardingStep: 1,
    });
  }
  const academic = await db.orm.public.AcademicProfile.where({
    userId,
  }).first();
  if (!academic) {
    await db.orm.public.AcademicProfile.create({
      userId,
      qualification: "BACHELORS",
      academicSession: "2024/2025",
      preferredStyle: "APA_7",
    });
  }
}

export async function getOnboardingState(
  userId: string,
): Promise<OnboardingState> {
  await ensureProfiles(userId);
  const student = await db.orm.public.StudentProfile.where({
    userId,
  }).first();
  const academic = await db.orm.public.AcademicProfile.where({
    userId,
  }).first();
  if (!student) {
    return { student: null, academic: null, gap: 1, completed: false };
  }
  if (student.onboardingCompleted) {
    return {
      student: {
        firstName: student.firstName,
        lastName: student.lastName,
        country: student.country,
        preferredLanguage: student.preferredLanguage,
        onboardingCompleted: true,
        onboardingStep: student.onboardingStep,
      },
      academic: academic
        ? {
            institutionId: academic.institutionId,
            customInstitution: academic.customInstitution,
            facultyId: academic.facultyId,
            customFaculty: academic.customFaculty,
            departmentId: academic.departmentId,
            customDepartment: academic.customDepartment,
            programmeId: academic.programmeId,
            qualification: academic.qualification,
            academicSession: academic.academicSession,
            preferredStyle: academic.preferredStyle,
          }
        : null,
      gap: null,
      completed: true,
    };
  }
  const preferencesDone =
    !!academic?.preferredStyle && !!student.preferredLanguage;
  const gap = firstGapStep({
    student: {
      firstName: student.firstName,
      lastName: student.lastName,
      country: student.country,
    },
    academic: academic
      ? {
          institutionId: academic.institutionId,
          customInstitution: academic.customInstitution,
          facultyId: academic.facultyId,
          customFaculty: academic.customFaculty,
          departmentId: academic.departmentId,
          customDepartment: academic.customDepartment,
          qualification: academic.qualification,
          academicSession: academic.academicSession,
        }
      : null,
    preferencesDone,
  });
  return {
    student: {
      firstName: student.firstName,
      lastName: student.lastName,
      country: student.country,
      preferredLanguage: student.preferredLanguage,
      onboardingCompleted: false,
      onboardingStep: student.onboardingStep,
    },
    academic: academic
      ? {
          institutionId: academic.institutionId,
          customInstitution: academic.customInstitution,
          facultyId: academic.facultyId,
          customFaculty: academic.customFaculty,
          departmentId: academic.departmentId,
          customDepartment: academic.customDepartment,
          programmeId: academic.programmeId,
          qualification: academic.qualification,
          academicSession: academic.academicSession,
          preferredStyle: academic.preferredStyle,
        }
      : null,
    gap,
    completed: false,
  };
}

export async function logOnboardingAudit(input: {
  userId: string;
  action:
    | "onboarding.completed"
    | "credits.welcome.granted"
    | "onboarding.suggestion.created";
  targetId: string;
  details?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  await db.orm.public.AuditEvent.create({
    userId: input.userId,
    action: input.action,
    targetType: input.action.startsWith("credits") ? "CREDIT" : "ONBOARDING",
    targetId: input.targetId,
    details: (input.details ?? {}) as unknown as never,
  });
}
