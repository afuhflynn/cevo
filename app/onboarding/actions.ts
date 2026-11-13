"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ensureProfiles, logOnboardingAudit } from "@/lib/onboarding";
import {
  academicSchema,
  personalSchema,
  preferencesSchema,
  SEARCH_PAGE_SIZE,
  searchSchema,
  suggestChildSchema,
  suggestInstitutionSchema,
  toFieldErrors,
  WELCOME_CREDITS,
} from "@/lib/onboarding-validation";
import { db } from "@/lib/prisma";

async function requireOwner() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { error: "UNAUTHENTICATED" as const };
  }
  const row = await db.orm.public.User.where({
    id: session.user.id,
  }).first();
  if (!row || row.isActive === false) {
    return { error: "UNAUTHENTICATED" as const };
  }
  await ensureProfiles(row.id);
  return { userId: row.id };
}

export type ActionResult = {
  ok: boolean;
  fieldErrors?: Record<string, string>;
  error?: string;
  onboardingStep?: number;
  redirectTo?: string;
  walletBalance?: number;
};

export async function savePersonalStep(input: unknown): Promise<ActionResult> {
  const owner = await requireOwner();
  if ("error" in owner) return { ok: false, error: "401" };
  const parsed = personalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  await db.orm.public.StudentProfile.where({ userId: owner.userId }).update({
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    country: parsed.data.country,
    preferredLanguage: parsed.data.preferredLanguage,
    onboardingStep: 2,
  });
  return { ok: true, onboardingStep: 2 };
}

export async function saveAcademicStep(input: unknown): Promise<ActionResult> {
  const owner = await requireOwner();
  if ("error" in owner) return { ok: false, error: "401" };
  const parsed = academicSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  const d = parsed.data;

  if (d.institutionId) {
    const inst = await db.orm.public.Institution.where({
      id: d.institutionId,
    }).first();
    if (!inst)
      return {
        ok: false,
        error: "404",
        fieldErrors: { institutionId: "Pick a valid university" },
      };
  }
  if (d.facultyId) {
    const fac = await db.orm.public.Faculty.where({ id: d.facultyId }).first();
    if (!fac)
      return {
        ok: false,
        error: "404",
        fieldErrors: { facultyId: "Pick a valid faculty" },
      };
    if (d.institutionId && fac.institutionId !== d.institutionId) {
      return {
        ok: false,
        error: "422",
        fieldErrors: {
          facultyId: "This faculty does not belong to the chosen university",
        },
      };
    }
  }
  if (d.departmentId) {
    const dep = await db.orm.public.Department.where({
      id: d.departmentId,
    }).first();
    if (!dep)
      return {
        ok: false,
        error: "404",
        fieldErrors: { departmentId: "Pick a valid department" },
      };
    if (d.facultyId && dep.facultyId !== d.facultyId) {
      return {
        ok: false,
        error: "422",
        fieldErrors: {
          departmentId: "This department does not belong to the chosen faculty",
        },
      };
    }
  }
  if (d.programmeId) {
    const prog = await db.orm.public.Programme.where({
      id: d.programmeId,
    }).first();
    if (!prog)
      return {
        ok: false,
        error: "404",
        fieldErrors: { programmeId: "Pick a valid programme" },
      };
    if (d.departmentId && prog.departmentId !== d.departmentId) {
      return {
        ok: false,
        error: "422",
        fieldErrors: {
          programmeId:
            "This programme does not belong to the chosen department",
        },
      };
    }
  }

  await db.orm.public.AcademicProfile.where({ userId: owner.userId }).update({
    institutionId: d.institutionId ?? null,
    customInstitution: d.institutionId
      ? null
      : d.customInstitution?.trim() || null,
    facultyId: d.facultyId ?? null,
    customFaculty: d.facultyId ? null : d.customFaculty?.trim() || null,
    departmentId: d.departmentId ?? null,
    customDepartment: d.departmentId
      ? null
      : d.customDepartment?.trim() || null,
    programmeId: d.programmeId ?? null,
    qualification: d.qualification,
    academicSession: d.academicSession,
  });
  await db.orm.public.StudentProfile.where({ userId: owner.userId }).update({
    onboardingStep: 3,
  });
  return { ok: true, onboardingStep: 3 };
}

export async function savePreferencesStep(
  input: unknown,
): Promise<ActionResult> {
  const owner = await requireOwner();
  if ("error" in owner) return { ok: false, error: "401" };
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  await db.orm.public.AcademicProfile.where({ userId: owner.userId }).update({
    preferredStyle: parsed.data.preferredStyle,
  });
  await db.orm.public.StudentProfile.where({ userId: owner.userId }).update({
    preferredLanguage: parsed.data.preferredLanguage,
  });
  return { ok: true, onboardingStep: 3 };
}

export async function searchInstitutions(input: unknown) {
  const owner = await requireOwner();
  if ("error" in owner) return { ok: false as const, error: "401" };
  const parsed = searchSchema.safeParse(input ?? {});
  const q = (parsed.success ? parsed.data.query : "").trim().toLowerCase();
  const page = parsed.success ? parsed.data.page : 1;
  const all = await db.orm.public.Institution.select(
    "id",
    "name",
    "code",
    "city",
  )
    .orderBy((r) => r.name.asc())
    .limit(200)
    .all();
  const filtered = q
    ? all.filter((r) => r.name.toLowerCase().includes(q))
    : all;
  const start = (page - 1) * SEARCH_PAGE_SIZE;
  const items = filtered.slice(start, start + SEARCH_PAGE_SIZE);
  return {
    ok: true as const,
    items,
    hasMore: start + SEARCH_PAGE_SIZE < filtered.length,
  };
}

export async function searchFaculties(input: unknown) {
  const owner = await requireOwner();
  if ("error" in owner) return { ok: false as const, error: "401" };
  const raw = (input ?? {}) as Record<string, unknown>;
  if (typeof raw["institutionId"] !== "string" || !raw["institutionId"]) {
    return { ok: false as const, error: "404" };
  }
  const institution = await db.orm.public.Institution.where({
    id: raw["institutionId"] as string,
  }).first();
  if (!institution) return { ok: false as const, error: "404" };
  const parsed = searchSchema.safeParse({
    query: raw["query"],
    page: raw["page"],
  });
  const q = (parsed.success ? parsed.data.query : "").trim().toLowerCase();
  const page = parsed.success ? parsed.data.page : 1;
  const all = await db.orm.public.Faculty.select("id", "name", "code")
    .where((r) => r.institutionId.eq(raw["institutionId"] as string))
    .orderBy((r) => r.name.asc())
    .limit(200)
    .all();
  const filtered = q
    ? all.filter((r) => r.name.toLowerCase().includes(q))
    : all;
  const start = (page - 1) * SEARCH_PAGE_SIZE;
  const items = filtered.slice(start, start + SEARCH_PAGE_SIZE);
  return {
    ok: true as const,
    items,
    hasMore: start + SEARCH_PAGE_SIZE < filtered.length,
  };
}

export async function searchDepartments(input: unknown) {
  const owner = await requireOwner();
  if ("error" in owner) return { ok: false as const, error: "401" };
  const raw = (input ?? {}) as Record<string, unknown>;
  if (typeof raw["facultyId"] !== "string" || !raw["facultyId"]) {
    return { ok: false as const, error: "404" };
  }
  const faculty = await db.orm.public.Faculty.where({
    id: raw["facultyId"] as string,
  }).first();
  if (!faculty) return { ok: false as const, error: "404" };
  const parsed = searchSchema.safeParse({
    query: raw["query"],
    page: raw["page"],
  });
  const q = (parsed.success ? parsed.data.query : "").trim().toLowerCase();
  const page = parsed.success ? parsed.data.page : 1;
  const all = await db.orm.public.Department.select("id", "name", "code")
    .where((r) => r.facultyId.eq(raw["facultyId"] as string))
    .orderBy((r) => r.name.asc())
    .limit(200)
    .all();
  const filtered = q
    ? all.filter((r) => r.name.toLowerCase().includes(q))
    : all;
  const start = (page - 1) * SEARCH_PAGE_SIZE;
  const items = filtered.slice(start, start + SEARCH_PAGE_SIZE);
  return {
    ok: true as const,
    items,
    hasMore: start + SEARCH_PAGE_SIZE < filtered.length,
  };
}

export async function searchProgrammes(input: unknown) {
  const owner = await requireOwner();
  if ("error" in owner) return { ok: false as const, error: "401" };
  const raw = (input ?? {}) as Record<string, unknown>;
  if (typeof raw["departmentId"] !== "string" || !raw["departmentId"]) {
    return { ok: false as const, error: "404" };
  }
  const dept = await db.orm.public.Department.where({
    id: raw["departmentId"] as string,
  }).first();
  if (!dept) return { ok: false as const, error: "404" };
  const parsed = searchSchema.safeParse({
    query: raw["query"],
    page: raw["page"],
  });
  const q = (parsed.success ? parsed.data.query : "").trim().toLowerCase();
  const page = parsed.success ? parsed.data.page : 1;
  const all = await db.orm.public.Programme.select(
    "id",
    "name",
    "qualification",
  )
    .where((r) => r.departmentId.eq(raw["departmentId"] as string))
    .orderBy((r) => r.name.asc())
    .limit(200)
    .all();
  const filtered = q
    ? all.filter((r) => r.name.toLowerCase().includes(q))
    : all;
  const start = (page - 1) * SEARCH_PAGE_SIZE;
  const items = filtered.slice(start, start + SEARCH_PAGE_SIZE);
  return {
    ok: true as const,
    items,
    hasMore: start + SEARCH_PAGE_SIZE < filtered.length,
  };
}

export async function suggestInstitution(
  input: unknown,
): Promise<ActionResult & { name?: string; city?: string }> {
  const owner = await requireOwner();
  if ("error" in owner) return { ok: false, error: "401" };
  const parsed = suggestInstitutionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  await logOnboardingAudit({
    userId: owner.userId,
    action: "onboarding.suggestion.created",
    targetId: owner.userId,
  });
  return {
    ok: true,
    name: parsed.data.name.trim(),
    city: parsed.data.city?.trim(),
  };
}

export async function suggestFaculty(
  input: unknown,
): Promise<ActionResult & { name?: string }> {
  const owner = await requireOwner();
  if ("error" in owner) return { ok: false, error: "401" };
  const parsed = suggestChildSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  await logOnboardingAudit({
    userId: owner.userId,
    action: "onboarding.suggestion.created",
    targetId: owner.userId,
  });
  return { ok: true, name: parsed.data.name.trim() };
}

export async function suggestDepartment(
  input: unknown,
): Promise<ActionResult & { name?: string }> {
  const owner = await requireOwner();
  if ("error" in owner) return { ok: false, error: "401" };
  const parsed = suggestChildSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  await logOnboardingAudit({
    userId: owner.userId,
    action: "onboarding.suggestion.created",
    targetId: owner.userId,
  });
  return { ok: true, name: parsed.data.name.trim() };
}

export async function completeOnboarding(): Promise<ActionResult> {
  const owner = await requireOwner();
  if ("error" in owner) return { ok: false, error: "401" };
  const student = await db.orm.public.StudentProfile.where({
    userId: owner.userId,
  }).first();
  const academic = await db.orm.public.AcademicProfile.where({
    userId: owner.userId,
  }).first();
  if (!student || !academic) return { ok: false, error: "422" };
  if (student.onboardingCompleted) {
    const wallet = await db.orm.public.CreditWallet.where({
      userId: owner.userId,
    }).first();
    return {
      ok: true,
      redirectTo: "/dashboard",
      walletBalance: wallet?.balance ?? 0,
    };
  }
  const hasInstitution =
    !!academic.institutionId || !!academic.customInstitution?.trim();
  const hasFaculty = !!academic.facultyId || !!academic.customFaculty?.trim();
  const hasDepartment =
    !!academic.departmentId || !!academic.customDepartment?.trim();
  const namesOk =
    !!student.firstName.trim() &&
    !!student.lastName.trim() &&
    !!student.country.trim();
  const sessionOk =
    !!academic.academicSession &&
    /^\d{4}\/\d{4}$/.test(academic.academicSession);
  if (
    !namesOk ||
    !hasInstitution ||
    !hasFaculty ||
    !hasDepartment ||
    !sessionOk ||
    !academic.qualification
  ) {
    return { ok: false, error: "422" };
  }
  if (academic.institutionId) {
    const inst = await db.orm.public.Institution.where({
      id: academic.institutionId,
    }).first();
    if (!inst)
      return {
        ok: false,
        error: "422",
        fieldErrors: {
          institutionId: "Pick your university again, the list changed",
        },
      };
  }
  if (academic.facultyId) {
    const fac = await db.orm.public.Faculty.where({
      id: academic.facultyId,
    }).first();
    if (
      !fac ||
      (academic.institutionId && fac.institutionId !== academic.institutionId)
    ) {
      return {
        ok: false,
        error: "422",
        fieldErrors: { facultyId: "Pick your faculty again, the list changed" },
      };
    }
  }
  if (academic.departmentId) {
    const dep = await db.orm.public.Department.where({
      id: academic.departmentId,
    }).first();
    if (!dep || (academic.facultyId && dep.facultyId !== academic.facultyId)) {
      return {
        ok: false,
        error: "422",
        fieldErrors: {
          departmentId: "Pick your department again, the list changed",
        },
      };
    }
  }
  if (academic.programmeId) {
    const prog = await db.orm.public.Programme.where({
      id: academic.programmeId,
    }).first();
    if (
      !prog ||
      (academic.departmentId && prog.departmentId !== academic.departmentId)
    ) {
      return {
        ok: false,
        error: "422",
        fieldErrors: {
          programmeId: "Pick your programme again, the list changed",
        },
      };
    }
  }

  const result = await db.transaction(async (tx) => {
    const locked = await tx.orm.public.StudentProfile.where({
      userId: owner.userId,
    }).first();
    if (!locked) throw new Error("missing-profile");
    if (locked.onboardingCompleted) {
      const existingWallet = await tx.orm.public.CreditWallet.where({
        userId: owner.userId,
      }).first();
      return { already: true, balance: existingWallet?.balance ?? 0 };
    }
    let wallet = await tx.orm.public.CreditWallet.where({
      userId: owner.userId,
    }).first();
    if (!wallet) {
      wallet = await tx.orm.public.CreditWallet.create({
        userId: owner.userId,
        balance: 0,
      });
    }
    const referenceId = `welcome:${owner.userId}`;
    const existing = await tx.orm.public.CreditLedger.where({
      walletId: wallet.id,
    })
      .where((r) => r.referenceId.eq(referenceId))
      .first();
    let balance = wallet.balance;
    if (!existing) {
      balance = wallet.balance + WELCOME_CREDITS;
      await tx.orm.public.CreditLedger.create({
        walletId: wallet.id,
        type: "PROMOTIONAL_CREDIT",
        amount: WELCOME_CREDITS,
        balanceAfter: balance,
        description: "Welcome credit grant",
        referenceId,
        metadata: { source: "onboarding" },
      });
      await tx.orm.public.CreditWallet.where({ userId: owner.userId }).update({
        balance,
      });
    }
    await tx.orm.public.StudentProfile.where({ userId: owner.userId }).update({
      onboardingCompleted: true,
      onboardingStep: 4,
    });
    return { already: false, balance };
  });

  await logOnboardingAudit({
    userId: owner.userId,
    action: "onboarding.completed",
    targetId: owner.userId,
  });
  if (!result.already) {
    await logOnboardingAudit({
      userId: owner.userId,
      action: "credits.welcome.granted",
      targetId: owner.userId,
    });
  }
  return { ok: true, redirectTo: "/dashboard", walletBalance: result.balance };
}
