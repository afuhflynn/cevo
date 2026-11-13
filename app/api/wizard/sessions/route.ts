import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import { sessionExpiryDate } from "@/lib/wizard";
import { logWizardAudit } from "@/lib/wizard-credits";
import { createSessionSchema } from "@/lib/wizard-validation";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const idempotencyKey = `wizard:${user.id}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
  const qualificationEnum = [
    "HND",
    "BACHELORS",
    "MASTERS",
    "PHD",
    "OTHER",
  ].includes((parsed.data.qualification ?? "").trim().toUpperCase())
    ? ((parsed.data.qualification ?? "").trim().toUpperCase() as
        | "HND"
        | "BACHELORS"
        | "MASTERS"
        | "PHD"
        | "OTHER")
    : "BACHELORS";

  const created = await db.transaction(async (tx) => {
    const project = await tx.orm.public.Project.create({
      userId: user.id,
      title: parsed.data.title,
      qualification: qualificationEnum as never,
      programmeName: parsed.data.programme,
      status: "DRAFT",
      progressPercent: 0,
      isArchived: false,
    });
    const brief = await tx.orm.public.ProjectBrief.create({
      projectId: project.id,
      background: "",
      problemStatement: "",
      aim: "",
      objectives: [] as unknown as never,
      researchQuestions: [] as unknown as never,
      scope: "",
      limitations: "",
      methodology: "",
      expectedOutcomes: "",
      isApproved: false,
    });
    const session = await tx.orm.public.WizardSession.create({
      userId: user.id,
      projectId: project.id,
      currentStep: 1,
      status: "DRAFT",
      readiness: {},
      idempotencyKey,
      expiresAt: sessionExpiryDate(),
      currentBriefVersion: 0,
      title: parsed.data.title,
      qualification: parsed.data.qualification,
      departmentName: parsed.data.department,
      programmeName: parsed.data.programme,
    });
    return { project, brief, session };
  });

  await logWizardAudit({
    userId: user.id,
    action: "wizard.session.created",
    targetType: "WizardSession",
    targetId: created.session.id,
    details: { title: parsed.data.title },
  });

  return NextResponse.json(
    {
      sessionId: created.session.id,
      currentStep: created.session.currentStep,
      status: created.session.status,
      title: parsed.data.title,
      projectId: created.project.id,
    },
    { status: 201 },
  );
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const pageRaw = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const pageSize = 12;

  const all = await db.orm.public.WizardSession.select(
    "id",
    "currentStep",
    "status",
    "title",
    "updatedAt",
    "expiresAt",
    "currentBriefVersion",
  )
    .where((r) => r.userId.eq(user.id))
    .orderBy((r) => r.updatedAt.desc())
    .limit(200)
    .all();

  const filtered =
    status && status !== "all"
      ? all.filter((s) => s.status === status.toUpperCase())
      : all;
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = page > totalPages ? 1 : page;
  const slice = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return NextResponse.json({
    sessions: slice.map((s) => ({
      id: s.id,
      title: s.title,
      currentStep: s.currentStep,
      status: s.status,
      updatedAt: new Date(s.updatedAt).toISOString(),
      expiresAt: new Date(s.expiresAt).toISOString(),
      currentBriefVersion: s.currentBriefVersion,
      resumable: !["APPROVED", "ABANDONED", "EXPIRED"].includes(s.status),
    })),
    totalCount,
    totalPages,
    page: safePage,
  });
}
