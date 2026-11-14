import { z } from "zod";
import { headers } from "next/headers";
import { db } from "./prisma";

export const TEMPLATE_LIST_DEFAULT = 20;
export const TEMPLATE_LIST_MAX = 100;

export const EXTRACT_PDF_MAX_PAGES = 100;
export const EXTRACT_PDF_MAX_BYTES = 15 * 1024 * 1024;
export const EXTRACT_TEXT_MAX_CHARS = 500000;

export function extractDailyCap(): number {
  const raw = process.env["TEMPLATE_EXTRACT_DAILY_CAP"];
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : 20;
}

export function platformDefaultVersionId(): string | null {
  const v = process.env["PLATFORM_DEFAULT_TEMPLATE_VERSION_ID"]?.trim();
  return v ? v : null;
}

export function extractModel(): string {
  return (
    process.env["OPENROUTER_EXTRACT_MODEL"] ??
    process.env["OPENROUTER_DRAFT_MODEL"] ??
    "deepseek/deepseek-v4.1-flash-1017"
  );
}

export const ruleSchema = z.object({
  pageSize: z.enum(["A4", "LETTER"]),
  marginTopMm: z.number().min(0).max(50),
  marginBottomMm: z.number().min(0).max(50),
  marginLeftMm: z.number().min(0).max(50),
  marginRightMm: z.number().min(0).max(50),
  fontFamily: z.string().trim().min(1).max(80),
  fontSizeBodyPt: z.number().min(8).max(18),
  lineSpacing: z.number().min(1.0).max(3.0),
  paragraphIndentMm: z.number().min(0).max(25.4),
  heading1FontPt: z.number().min(10).max(28),
  heading1Style: z.string().trim().max(40),
  heading2FontPt: z.number().min(10).max(28),
  heading2Style: z.string().trim().max(40),
  citationStyle: z.enum(["APA_7", "HARVARD"]),
  requirePrelims: z.record(z.string(), z.unknown()),
});

export const sectionInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  order: z.number().int().min(0).max(500).optional(),
  orderIndex: z.number().int().min(0).max(500).optional(),
  sectionType: z.string().trim().min(1).max(40),
  description: z.string().trim().max(2000).nullable().optional(),
});

export const versionEditSchema = z.object({
  rules: ruleSchema.partial().optional(),
  sections: z.array(sectionInputSchema).min(1).max(100).optional(),
  changelog: z.string().trim().max(2000).nullable().optional(),
});

export const extractPayloadSchema = z.object({
  rules: ruleSchema
    .partial()
    .extend({
      pageSize: z.enum(["A4", "LETTER"]).nullable().optional(),
      fontFamily: z.string().max(80).nullable().optional(),
      citationStyle: z.enum(["APA_7", "HARVARD"]).nullable().optional(),
    })
    .optional(),
  sections: z
    .array(
      z.object({
        title: z.string().max(200),
        order: z.number().int().min(0).max(500).nullable().optional(),
        sectionType: z.string().max(40),
      }),
    )
    .max(100)
    .optional(),
});

export type ExtractPayload = z.infer<typeof extractPayloadSchema>;

export const templateCreateSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  institutionId: z.string().min(1).nullable().optional(),
  facultyId: z.string().min(1).nullable().optional(),
  departmentId: z.string().min(1).nullable().optional(),
  programmeId: z.string().min(1).nullable().optional(),
  qualification: z.enum(["HND", "BACHELORS", "MASTERS", "PHD", "OTHER"]),
  projectType: z.enum(["APPLIED_SOFTWARE", "RESEARCH_ACADEMIC"]).optional(),
  isOfficial: z.boolean().optional(),
});

export const templatePatchSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  institutionId: z.string().min(1).nullable().optional(),
  facultyId: z.string().min(1).nullable().optional(),
  departmentId: z.string().min(1).nullable().optional(),
  programmeId: z.string().min(1).nullable().optional(),
  qualification: z
    .enum(["HND", "BACHELORS", "MASTERS", "PHD", "OTHER"])
    .optional(),
  projectType: z.enum(["APPLIED_SOFTWARE", "RESEARCH_ACADEMIC"]).optional(),
  isOfficial: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function clientIp(): Promise<string | undefined> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ?? store.get("x-real-ip") ?? undefined
  );
}

export async function logTemplateAudit(input: {
  userId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  await db.orm.public.AuditEvent.create({
    userId: input.userId ?? undefined,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    details: (input.details ?? {}) as unknown as never,
    ipAddress: await clientIp().catch(() => undefined),
  });
}

export type MatchResult = {
  templateId: string | null;
  templateVersionId: string | null;
  title: string | null;
  reason: string;
  isFallback: boolean;
};

type TemplateRow = {
  id: string;
  title: string;
  institutionId: string | null;
  facultyId: string | null;
  departmentId: string | null;
  programmeId: string | null;
  qualification: string;
  isActive: boolean;
};

type VersionRow = {
  id: string;
  templateId: string;
  version: number;
  isPublished: boolean;
  publishedAt: Date | string | null;
};

export async function matchTemplateForUser(
  userId: string,
): Promise<MatchResult> {
  const profile = await db.orm.public.AcademicProfile.where({ userId }).first();
  const fallback = await loadPlatformDefault();

  if (!profile) {
    if (fallback) {
      return {
        templateId: fallback.templateId,
        templateVersionId: fallback.versionId,
        title: fallback.title,
        reason:
          "No academic profile found, using the platform default template.",
        isFallback: true,
      };
    }
    return {
      templateId: null,
      templateVersionId: null,
      title: null,
      reason: "No academic profile found and no default template is available.",
      isFallback: true,
    };
  }

  let programmeQualification: string | null = null;
  if (profile.programmeId) {
    const prog = await db.orm.public.Programme.where({
      id: profile.programmeId as string,
    }).first();
    if (prog) programmeQualification = String(prog.qualification ?? "");
  }
  const profileQualification = String(profile.qualification ?? "");

  const templates = (await db.orm.public.ProjectTemplate.select(
    "id",
    "title",
    "institutionId",
    "facultyId",
    "departmentId",
    "programmeId",
    "qualification",
    "isActive",
  )
    .where((r) => r.isActive.eq(true))
    .limit(200)
    .all()) as unknown as TemplateRow[];

  if (templates.length === 0) {
    if (fallback) {
      return {
        templateId: fallback.templateId,
        templateVersionId: fallback.versionId,
        title: fallback.title,
        reason:
          "No active templates found, using the platform default template.",
        isFallback: true,
      };
    }
    return {
      templateId: null,
      templateVersionId: null,
      title: null,
      reason: "No active templates available.",
      isFallback: true,
    };
  }

  const templateIds = templates.map((t) => t.id);
  const versions = (await db.orm.public.TemplateVersion.select(
    "id",
    "templateId",
    "version",
    "isPublished",
    "publishedAt",
  )
    .where((r) => r.templateId.in(templateIds))
    .where((r) => r.isPublished.eq(true))
    .limit(400)
    .all()) as unknown as VersionRow[];

  const latestByTemplate = new Map<string, VersionRow>();
  for (const v of versions) {
    const cur = latestByTemplate.get(v.templateId);
    if (!cur) {
      latestByTemplate.set(v.templateId, v);
      continue;
    }
    const curTime = cur.publishedAt ? new Date(cur.publishedAt).getTime() : 0;
    const vTime = v.publishedAt ? new Date(v.publishedAt).getTime() : 0;
    if (vTime > curTime || (vTime === curTime && v.id > cur.id)) {
      latestByTemplate.set(v.templateId, v);
    }
  }

  let best: TemplateRow | null = null;
  let bestScore = -1;
  let bestPublishedAt = -1;
  let bestVersionId = "";
  let bestReasonScope = "";

  for (const t of templates) {
    const ver = latestByTemplate.get(t.id);
    if (!ver) continue;
    let score = 0;
    let scope = "";
    if (
      t.programmeId &&
      profile.programmeId &&
      t.programmeId === profile.programmeId
    ) {
      score += 4;
      scope = "programme";
    } else if (
      t.departmentId &&
      profile.departmentId &&
      t.departmentId === profile.departmentId
    ) {
      score += 3;
      scope = "department";
    } else if (
      t.facultyId &&
      profile.facultyId &&
      t.facultyId === profile.facultyId
    ) {
      score += 2;
      scope = "faculty";
    } else if (
      t.institutionId &&
      profile.institutionId &&
      t.institutionId === profile.institutionId
    ) {
      score += 1;
      scope = "institution";
    }
    const tq = String(t.qualification ?? "");
    if (
      (profileQualification && tq === profileQualification) ||
      (programmeQualification && tq === programmeQualification)
    ) {
      score += 1;
    }
    if (score === 0) continue;
    const pubTime = ver.publishedAt ? new Date(ver.publishedAt).getTime() : 0;
    if (
      score > bestScore ||
      (score === bestScore &&
        (pubTime > bestPublishedAt ||
          (pubTime === bestPublishedAt && ver.id > bestVersionId)))
    ) {
      best = t;
      bestScore = score;
      bestPublishedAt = pubTime;
      bestVersionId = ver.id;
      bestReasonScope = scope;
    }
  }

  if (best) {
    const ver = latestByTemplate.get(best.id)!;
    const scopeLabel = bestReasonScope || "programme";
    return {
      templateId: best.id,
      templateVersionId: ver.id,
      title: best.title,
      reason: `Matched your ${scopeLabel} with qualification ${profileQualification || "level"}.`,
      isFallback: false,
    };
  }

  if (fallback) {
    return {
      templateId: fallback.templateId,
      templateVersionId: fallback.versionId,
      title: fallback.title,
      reason:
        "No specific template matched your programme, using the platform default template.",
      isFallback: true,
    };
  }
  return {
    templateId: null,
    templateVersionId: null,
    title: null,
    reason: "No template matched your programme and no default is available.",
    isFallback: true,
  };
}

export async function loadPlatformDefault(): Promise<{
  templateId: string;
  versionId: string;
  title: string;
} | null> {
  const configured = platformDefaultVersionId();
  if (configured) {
    const v = await db.orm.public.TemplateVersion.where({
      id: configured,
    }).first();
    if (v && (v as unknown as VersionRow).isPublished) {
      const t = await db.orm.public.ProjectTemplate.where({
        id: (v as unknown as { templateId: string }).templateId,
      }).first();
      if (t && (t as unknown as TemplateRow).isActive) {
        return {
          templateId: (t as unknown as TemplateRow).id,
          versionId: (v as unknown as VersionRow).id,
          title: (t as unknown as TemplateRow).title,
        };
      }
    }
  }
  const platform = (await db.orm.public.ProjectTemplate.select(
    "id",
    "title",
    "institutionId",
  )
    .where((r) => r.isActive.eq(true))
    .where((r) => r.institutionId.isNull())
    .limit(20)
    .all()) as unknown as Array<{
    id: string;
    title: string;
    institutionId: string | null;
  }>;
  if (platform.length > 0) {
    const ids = platform.map((p) => p.id);
    const vers = (await db.orm.public.TemplateVersion.select(
      "id",
      "templateId",
      "publishedAt",
    )
      .where((r) => r.templateId.in(ids))
      .where((r) => r.isPublished.eq(true))
      .limit(40)
      .all()) as unknown as Array<{
      id: string;
      templateId: string;
      publishedAt: Date | string | null;
    }>;
    if (vers.length > 0) {
      const sorted = [...vers].sort((a, b) => {
        const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        if (ta === tb) return b.id.localeCompare(a.id);
        return tb - ta;
      });
      const top = sorted[0]!;
      const tmpl = platform.find((p) => p.id === top.templateId);
      if (tmpl)
        return { templateId: tmpl.id, versionId: top.id, title: tmpl.title };
    }
  }
  return null;
}

export async function checkExtractCap(
  adminId: string,
): Promise<{ allowed: boolean; count: number }> {
  const cap = extractDailyCap();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db.orm.public.TemplateDraft.select("id")
    .where((r) => r.createdBy.eq(adminId))
    .where((r) => r.createdAt.gte(since))
    .limit(cap + 1)
    .all();
  return { allowed: rows.length < cap, count: rows.length };
}

export function scopeFilters(input: {
  institutionId?: string | null;
  facultyId?: string | null;
  departmentId?: string | null;
  programmeId?: string | null;
  qualification?: string | null;
}): Record<string, string> {
  const out: Record<string, string> = {};
  if (input.institutionId) out["institutionId"] = input.institutionId;
  if (input.facultyId) out["facultyId"] = input.facultyId;
  if (input.departmentId) out["departmentId"] = input.departmentId;
  if (input.programmeId) out["programmeId"] = input.programmeId;
  if (input.qualification) out["qualification"] = input.qualification;
  return out;
}

export function isMissingTableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /TemplateDraft|relation.*does not exist|table.*does not exist/i.test(
    msg,
  );
}
