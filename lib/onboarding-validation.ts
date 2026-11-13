import { z } from "zod";

export const WELCOME_CREDITS = 50;
export const SEARCH_PAGE_SIZE = 20;

export const personalSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  country: z.string().trim().min(1, "Country is required").max(100),
  preferredLanguage: z.string().trim().min(1).max(10).default("en"),
});

export const qualificationSchema = z.enum([
  "HND",
  "BACHELORS",
  "MASTERS",
  "PHD",
  "OTHER",
]);

const sessionRegex = /^(\d{4})\/(\d{4})$/;

export const academicSessionSchema = z
  .string()
  .trim()
  .regex(sessionRegex, "Use format YYYY/YYYY, for example 2024/2025")
  .refine(
    (v) => {
      const m = sessionRegex.exec(v);
      if (!m) return false;
      const start = Number(m[1]);
      const end = Number(m[2]);
      return start >= 2000 && start <= 2030 && end === start + 1;
    },
    { message: "Session must span one year, for example 2024/2025" },
  );

export const academicSchema = z
  .object({
    institutionId: z.string().min(1).optional(),
    customInstitution: z.string().trim().max(200).optional(),
    facultyId: z.string().min(1).optional(),
    customFaculty: z.string().trim().max(200).optional(),
    departmentId: z.string().min(1).optional(),
    customDepartment: z.string().trim().max(200).optional(),
    programmeId: z.string().min(1).optional(),
    qualification: qualificationSchema,
    academicSession: academicSessionSchema,
  })
  .superRefine((v, ctx) => {
    if (!v.institutionId && !v.customInstitution?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["institutionId"],
        message: "Pick your university or suggest it",
      });
    }
    if (v.institutionId && v.customInstitution?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["customInstitution"],
        message: "Use either the list or a custom name, not both",
      });
    }
    if (!v.facultyId && !v.customFaculty?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["facultyId"],
        message: "Pick your faculty or suggest it",
      });
    }
    if (v.facultyId && v.customFaculty?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["customFaculty"],
        message: "Use either the list or a custom name, not both",
      });
    }
    if (!v.departmentId && !v.customDepartment?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["departmentId"],
        message: "Pick your department or suggest it",
      });
    }
    if (v.departmentId && v.customDepartment?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["customDepartment"],
        message: "Use either the list or a custom name, not both",
      });
    }
  });

export const preferencesSchema = z.object({
  preferredStyle: z.enum(["APA_7", "Harvard", "MLA"]),
  preferredLanguage: z.string().trim().min(1).max(10).default("en"),
});

export const searchSchema = z.object({
  query: z.string().trim().max(200).optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
});

export const suggestInstitutionSchema = z.object({
  name: z.string().trim().min(2).max(200),
  city: z.string().trim().max(100).optional(),
});

export const suggestChildSchema = z.object({
  name: z.string().trim().min(2).max(200),
});

export type PersonalInput = z.infer<typeof personalSchema>;
export type AcademicInput = z.infer<typeof academicSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;

export type FieldErrors = Record<string, string>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

export function firstGapStep(input: {
  student: {
    firstName: string;
    lastName: string;
    country: string;
  } | null;
  academic: {
    institutionId: string | null;
    customInstitution: string | null;
    facultyId: string | null;
    customFaculty: string | null;
    departmentId: string | null;
    customDepartment: string | null;
    qualification: string | null;
    academicSession: string | null;
  } | null;
  preferencesDone: boolean;
}): 1 | 2 | 3 | null {
  if (
    !input.student ||
    !input.student.firstName.trim() ||
    !input.student.lastName.trim() ||
    !input.student.country.trim()
  )
    return 1;
  const a = input.academic;
  const academicOk =
    !!a &&
    (!!a.institutionId || !!a.customInstitution?.trim()) &&
    (!!a.facultyId || !!a.customFaculty?.trim()) &&
    (!!a.departmentId || !!a.customDepartment?.trim()) &&
    !!a.qualification &&
    !!a.academicSession &&
    sessionRegex.test(a.academicSession);
  if (!academicOk) return 2;
  if (!input.preferencesDone) return 3;
  return null;
}
