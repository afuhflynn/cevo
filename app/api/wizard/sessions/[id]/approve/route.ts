import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import { matchTemplateForUser } from "@/lib/templates";
import { computeReadiness, readinessBlockedFields } from "@/lib/wizard";
import { logWizardAudit } from "@/lib/wizard-credits";
import { clientIp, loadOwnedWizardSession } from "@/lib/wizard-guards";
import { approveSchema } from "@/lib/wizard-validation";

const DEFAULT_CHAPTERS = [
  "Introduction",
  "Literature Review",
  "Methodology",
  "System Design and Implementation",
  "Results and Discussion",
  "Conclusion and Recommendations",
];

function slugify(title: string, orderIndex: number): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || `chapter-${orderIndex + 1}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const { id } = await params;
  const loaded = await loadOwnedWizardSession({
    userId: user.id,
    role: user.role,
    sessionId: id,
    allowAdminRead: false,
  });
  if ("error" in loaded) {
    const status = loaded.error;
    return NextResponse.json(
      { error: status === 404 ? "NOT_FOUND" : "FORBIDDEN" },
      { status },
    );
  }
  const { session } = loaded;

  const idempotencyKey = request.headers.get("x-idempotency-key")?.trim();
  if (!idempotencyKey || idempotencyKey.length < 8) {
    return NextResponse.json(
      { error: "IDEMPOTENCY_KEY_REQUIRED" },
      { status: 422 },
    );
  }

  if (session.status === "APPROVED") {
    return NextResponse.json(
      {
        error: "ALREADY_APPROVED",
        projectId: session.projectId,
      },
      { status: 409 },
    );
  }
  if (["ABANDONED", "EXPIRED"].includes(session.status)) {
    return NextResponse.json({ error: "SESSION_CLOSED" }, { status: 409 });
  }

  if (session.approvalKey && session.approvalKey !== idempotencyKey) {
    // A different key on a non-approved session: treat as conflict-free retry
    // only when the stored key already provisioned; otherwise continue.
  }
  if (session.approvalKey === idempotencyKey && session.projectId) {
    return NextResponse.json(
      { projectId: session.projectId, deduped: true },
      { status: 200 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = approveSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  if (!session.projectId) {
    return NextResponse.json({ error: "NO_PROJECT" }, { status: 422 });
  }
  const brief = await db.orm.public.ProjectBrief.where({
    projectId: session.projectId,
  }).first();
  if (!brief || (brief.version ?? 0) < 1) {
    return NextResponse.json({ error: "NO_SYNTHESIS_YET" }, { status: 422 });
  }
  if (
    parsed.data.briefVersion !== (brief.version ?? session.currentBriefVersion)
  ) {
    // Allow approving the current draft or the latest saved version; a stale
    // pointer is only valid when it equals the current draft.
    if (parsed.data.briefVersion !== session.currentBriefVersion) {
      return NextResponse.json(
        { error: "STALE_VERSION", current: session.currentBriefVersion },
        { status: 422 },
      );
    }
  }

  const readiness = computeReadiness({
    background: brief.background,
    problem: brief.problemStatement,
    aim: brief.aim,
    objectives: Array.isArray(brief.objectives)
      ? (brief.objectives as string[]).join("\n")
      : "",
    questions: Array.isArray(brief.researchQuestions)
      ? (brief.researchQuestions as string[]).join("\n")
      : "",
    scope: brief.scope,
    limitations: brief.limitations,
    methodology: brief.methodology,
    outcomes: brief.expectedOutcomes,
  });
  const blocked = readinessBlockedFields(readiness);
  if (blocked.length > 0) {
    return NextResponse.json(
      { error: "READINESS_FAILED", blocked },
      { status: 422 },
    );
  }

  let templateVersionId = parsed.data.templateVersionId;
  if (!templateVersionId) {
    const match = await matchTemplateForUser(user.id);
    templateVersionId = match.templateVersionId ?? undefined;
  } else {
    const chosen = await db.orm.public.TemplateVersion.where({
      id: templateVersionId,
    }).first();
    const stillValid = await (async () => {
      if (!chosen) return false;
      const c = chosen as unknown as {
        isPublished: boolean;
        templateId: string;
      };
      if (!c.isPublished) return false;
      const t = await db.orm.public.ProjectTemplate.where({
        id: c.templateId,
      }).first();
      return !!t && (t as unknown as { isActive: boolean }).isActive === true;
    })();
    if (!stillValid) {
      const rematch = await matchTemplateForUser(user.id);
      templateVersionId = rematch.templateVersionId ?? undefined;
    }
  }
  let templateSections: {
    orderIndex: number;
    title: string;
    sectionType: string;
  }[] = [];
  if (templateVersionId) {
    const rows = await db.orm.public.TemplateSection.select(
      "orderIndex",
      "title",
      "sectionType",
    )
      .where((r) => r.templateVersionId.eq(templateVersionId as string))
      .orderBy((r) => r.orderIndex.asc())
      .limit(100)
      .all();
    templateSections = rows;
  }

  const chapterTitles =
    templateSections.length > 0
      ? templateSections.map((s) => ({
          title: s.title,
          sectionType: s.sectionType,
        }))
      : DEFAULT_CHAPTERS.map((title) => ({ title, sectionType: "CHAPTER" }));

  try {
    const result = await db.transaction(async (tx) => {
      const fresh = await tx.orm.public.WizardSession.where({
        id: session.id,
      }).first();
      if (!fresh) throw new Error("SESSION_GONE");
      if (fresh.status === "APPROVED") {
        return { projectId: fresh.projectId as string, deduped: true };
      }
      const existingKey = await tx.orm.public.WizardSession.where({
        approvalKey: idempotencyKey,
      }).first();
      if (existingKey?.projectId) {
        return { projectId: existingKey.projectId, deduped: true };
      }

      await tx.orm.public.ProjectBrief.where({ id: brief.id }).update({
        isApproved: true,
        approvedAt: new Date(),
      });
      await tx.orm.public.ProjectOutline.create({
        projectId: session.projectId as string,
        structure: {
          chapters: chapterTitles.map((c, i) => ({
            order: i + 1,
            title: c.title,
          })),
          templateVersionId: templateVersionId ?? null,
        } as unknown as never,
      });
      for (let i = 0; i < chapterTitles.length; i += 1) {
        const chapter = chapterTitles[i];
        if (!chapter) continue;
        await tx.orm.public.ProjectSection.create({
          projectId: session.projectId as string,
          orderIndex: i,
          title: chapter.title,
          sectionType: chapter.sectionType,
          slug: slugify(chapter.title, i),
          wordCount: 0,
          isCompleted: false,
        });
      }
      await tx.orm.public.Project.where({
        id: session.projectId as string,
      }).update({
        status: "PLANNING",
        templateVersionId: templateVersionId ?? undefined,
      });
      await tx.orm.public.ProjectActivity.create({
        projectId: session.projectId as string,
        action: "wizard.approved",
        description: "Brief approved and chapter tree provisioned",
      });
      await tx.orm.public.WizardSession.where({ id: session.id }).update({
        status: "APPROVED" as never,
        currentStep: 5,
        approvalKey: idempotencyKey,
        projectId: session.projectId as string,
      });
      return { projectId: session.projectId as string, deduped: false };
    });

    await logWizardAudit({
      userId: user.id,
      action: "wizard.approved",
      targetType: "WizardSession",
      targetId: session.id,
      details: {
        projectId: result.projectId,
        sectionCount: chapterTitles.length,
        templateVersionId: templateVersionId ?? null,
        deduped: result.deduped,
      },
      ipAddress: await clientIp(),
    });

    return NextResponse.json(
      {
        projectId: result.projectId,
        briefId: brief.id,
        sectionCount: chapterTitles.length,
        deduped: result.deduped,
      },
      { status: result.deduped ? 200 : 201 },
    );
  } catch (error) {
    await logWizardAudit({
      userId: user.id,
      action: "wizard.approve.failed",
      targetType: "WizardSession",
      targetId: session.id,
      details: {
        reason: error instanceof Error ? error.message : "unknown",
      },
      ipAddress: await clientIp(),
    });
    return NextResponse.json({ error: "APPROVAL_FAILED" }, { status: 500 });
  }
}
