import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-api";
import { db } from "@/lib/prisma";
import {
  TEMPLATE_LIST_DEFAULT,
  TEMPLATE_LIST_MAX,
  logTemplateAudit,
  templateCreateSchema,
} from "@/lib/templates";

const listSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(TEMPLATE_LIST_DEFAULT === 20 ? 1 : 1),
  limit: z.coerce.number().int().min(1).max(TEMPLATE_LIST_MAX).default(20),
  q: z.string().max(200).nullish(),
  institutionId: z.string().max(100).nullish(),
  facultyId: z.string().max(100).nullish(),
  departmentId: z.string().max(100).nullish(),
  programmeId: z.string().max(100).nullish(),
  qualification: z.string().max(20).nullish(),
});

export async function GET(request: Request) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const url = new URL(request.url);
  const parsed = listSchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit:
      url.searchParams.get("limit") ??
      url.searchParams.get("pageSize") ??
      undefined,
    q: url.searchParams.get("q"),
    institutionId: url.searchParams.get("institutionId"),
    facultyId: url.searchParams.get("facultyId"),
    departmentId: url.searchParams.get("departmentId"),
    programmeId: url.searchParams.get("programmeId"),
    qualification: url.searchParams.get("qualification"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const { page, limit, q } = parsed.data;
  const all = (await db.orm.public.ProjectTemplate.select(
    "id",
    "title",
    "institutionId",
    "facultyId",
    "departmentId",
    "programmeId",
    "qualification",
    "isActive",
    "isOfficial",
    "createdAt",
  )
    .limit(500)
    .all()) as unknown as Array<{
    id: string;
    title: string;
    institutionId: string | null;
    facultyId: string | null;
    departmentId: string | null;
    programmeId: string | null;
    qualification: string;
    isActive: boolean;
    isOfficial: boolean;
    createdAt: Date | string;
  }>;

  let scoped = all;
  if (parsed.data.institutionId)
    scoped = scoped.filter(
      (t) => t.institutionId === parsed.data.institutionId,
    );
  if (parsed.data.facultyId)
    scoped = scoped.filter((t) => t.facultyId === parsed.data.facultyId);
  if (parsed.data.departmentId)
    scoped = scoped.filter((t) => t.departmentId === parsed.data.departmentId);
  if (parsed.data.programmeId)
    scoped = scoped.filter((t) => t.programmeId === parsed.data.programmeId);
  if (parsed.data.qualification)
    scoped = scoped.filter(
      (t) => String(t.qualification) === parsed.data.qualification,
    );
  if (q) {
    const needle = q.trim().toLowerCase();
    scoped = scoped.filter((t) => t.title.toLowerCase().includes(needle));
  }
  scoped = [...scoped].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const total = scoped.length;
  const start = (page - 1) * limit;
  const items = scoped.slice(start, start + limit);
  const versionRows =
    items.length > 0
      ? ((await db.orm.public.TemplateVersion.select(
          "id",
          "templateId",
          "version",
          "isPublished",
          "publishedAt",
        )
          .where((r) => r.templateId.in(items.map((i) => i.id)))
          .limit(200)
          .all()) as unknown as Array<{
          id: string;
          templateId: string;
          version: number;
          isPublished: boolean;
          publishedAt: Date | string | null;
        }>)
      : [];
  const latestByTemplate = new Map<
    string,
    { version: number; isPublished: boolean; publishedAt: string | Date | null }
  >();
  for (const v of versionRows) {
    const cur = latestByTemplate.get(v.templateId);
    if (!cur || v.version > cur.version)
      latestByTemplate.set(v.templateId, {
        version: v.version,
        isPublished: v.isPublished,
        publishedAt: v.publishedAt,
      });
  }
  return NextResponse.json({
    templates: items.map((t) => ({
      ...t,
      latestVersion: latestByTemplate.get(t.id) ?? null,
    })),
    page,
    limit,
    total,
    hasMore: start + limit < total,
  });
}

export async function POST(request: Request) {
  const gate = await requireAdminApi(request);
  if ("error" in gate) return gate.error;
  const body = await request.json().catch(() => ({}));
  const parsed = templateCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const data = parsed.data;

  for (const [key, model] of [
    ["institutionId", "Institution"],
    ["facultyId", "Faculty"],
    ["departmentId", "Department"],
    ["programmeId", "Programme"],
  ] as const) {
    const val = (data as unknown as Record<string, string | null | undefined>)[
      key
    ];
    if (val) {
      const row = await (
        db.orm.public as unknown as Record<
          string,
          { where: (f: unknown) => { first: () => Promise<unknown> } }
        >
      )
        [model]!.where({ id: val })
        .first();
      if (!row)
        return NextResponse.json(
          { error: "INVALID_INPUT", message: `${key} not found` },
          { status: 422 },
        );
    }
  }

  try {
    const created = await db.transaction(async (tx) => {
      const t = await tx.orm.public.ProjectTemplate.create({
        title: data.title,
        description: (data.description ?? null) as unknown as never,
        institutionId: (data.institutionId ?? null) as unknown as never,
        facultyId: (data.facultyId ?? null) as unknown as never,
        departmentId: (data.departmentId ?? null) as unknown as never,
        programmeId: (data.programmeId ?? null) as unknown as never,
        qualification: data.qualification as never,
        projectType: (data.projectType ?? "RESEARCH_ACADEMIC") as never,
        isOfficial: (data.isOfficial ?? false) as unknown as never,
        isActive: true as unknown as never,
      });
      const tid = (t as unknown as { id: string }).id;
      await tx.orm.public.TemplateVersion.create({
        templateId: tid,
        version: 1,
        isPublished: false,
        changelog: "Initial draft",
      });
      return t;
    });
    await logTemplateAudit({
      userId: gate.user.id,
      action: "template.create",
      targetType: "ProjectTemplate",
      targetId: (created as unknown as { id: string }).id,
      details: { title: data.title },
    });
    return NextResponse.json(
      { template: created, draftVersion: 1 },
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: "CREATE_FAILED",
        message: e instanceof Error ? e.message : "unknown",
      },
      { status: 500 },
    );
  }
}
