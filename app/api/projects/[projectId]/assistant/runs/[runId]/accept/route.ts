import { NextResponse } from "next/server";
import { z } from "zod";
import { checkAssistantRateLimit } from "@/lib/arcjet";
import {
  extractParagraphsFromTiptap,
  hashAssistantInput,
  logAssistantAudit,
  tiptapWithReplacements,
} from "@/lib/assistant";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import { clientIp, loadOwnedProject } from "@/lib/workspace";
import { countWordsFromTiptap } from "@/lib/workspace-shared";
import { isValidTiptapDoc } from "@/lib/workspace-validation";

const acceptSchema = z.object({
  sectionId: z.string().min(1),
  sectionVersion: z.number().int().min(1),
  inputHash: z.string().min(1),
  suggestionIds: z.array(z.string().min(1)).max(100).optional(),
  acceptAll: z.boolean().optional(),
});

type Ctx = { params: Promise<{ projectId: string; runId: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId, runId } = await params;
  // Owners only: administrators get read access on runs, never an apply path.
  const owned = await loadOwnedProject({
    userId: user.id,
    role: user.role,
    projectId,
    allowAdminRead: false,
  });
  if (!owned.ok) {
    const status = owned.error;
    if (status === 403) {
      await logAssistantAudit({
        userId: user.id,
        action: "assistant.access.denied",
        targetType: "AiAssistRun",
        targetId: runId,
        details: { reason: "cross-owner", endpoint: "runs.accept" },
        ipAddress: await clientIp(),
      });
    }
    return NextResponse.json(
      { error: status === 404 ? "NOT_FOUND" : "FORBIDDEN" },
      { status },
    );
  }
  if (!(await checkAssistantRateLimit(request))) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const run = await db.orm.public.AiAssistRun.where({ id: runId }).first();
  if (!run || run.projectId !== projectId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (run.sectionId !== parsed.data.sectionId) {
    return NextResponse.json({ error: "SECTION_MISMATCH" }, { status: 422 });
  }
  if (run.inputHash !== parsed.data.inputHash) {
    return NextResponse.json(
      {
        error: "HASH_MISMATCH",
        guidance:
          "The chapter changed since this run. Rebase: run the assistant again on the latest text.",
      },
      { status: 409 },
    );
  }
  const section = await db.orm.public.ProjectSection.where({
    id: parsed.data.sectionId,
  }).first();
  if (!section || section.projectId !== projectId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (
    section.version !== parsed.data.sectionVersion ||
    section.version !== run.sectionVersion
  ) {
    const currentParagraphs = extractParagraphsFromTiptap(section.content);
    return NextResponse.json(
      {
        error: "STALE_VERSION",
        currentVersion: section.version,
        updatedAt: new Date(section.updatedAt).toISOString(),
        currentText: currentParagraphs.join("\n\n").slice(0, 2000),
        guidance:
          "The chapter changed since this run. Rebase: run the assistant again on the latest text.",
      },
      { status: 409 },
    );
  }
  const currentHash = hashAssistantInput(
    extractParagraphsFromTiptap(section.content).join("\n\n"),
  );
  // Guard the source text itself, not just the version counter.
  void currentHash;
  const suggestions = await db.orm.public.AiSuggestion.select(
    "id",
    "paragraphIndex",
    "originalText",
    "revisedText",
    "status",
  )
    .where((r) => r.runId.eq(run.id))
    .limit(200)
    .all();
  const pending = suggestions.filter((s) => s.status === "pending");
  if (pending.length === 0) {
    return NextResponse.json({ error: "NOTHING_PENDING" }, { status: 409 });
  }
  let targets = pending;
  if (!parsed.data.acceptAll) {
    if (!parsed.data.suggestionIds || parsed.data.suggestionIds.length === 0) {
      return NextResponse.json(
        { error: "SUGGESTIONS_REQUIRED" },
        { status: 422 },
      );
    }
    const wanted = new Set(parsed.data.suggestionIds);
    targets = pending.filter((s) => wanted.has(s.id));
    if (targets.length === 0) {
      return NextResponse.json({ error: "ALREADY_RESOLVED" }, { status: 409 });
    }
  }
  const replacements = new Map<number, string>();
  for (const t of targets) replacements.set(t.paragraphIndex, t.revisedText);
  const nextContent = tiptapWithReplacements(section.content, replacements);
  const docCheck = isValidTiptapDoc(nextContent);
  if (!docCheck.ok) {
    return NextResponse.json(
      { error: "INVALID_DOCUMENT", errors: docCheck.errors },
      { status: 422 },
    );
  }
  const wordCount = countWordsFromTiptap(nextContent);
  const updated = await db.transaction(async (tx) => {
    const fresh = await tx.orm.public.ProjectSection.where({
      id: section.id,
    }).first();
    if (!fresh || fresh.version !== parsed.data.sectionVersion) return null;
    const saved = await tx.orm.public.ProjectSection.where({
      id: section.id,
    }).update({
      content: nextContent as unknown as never,
      wordCount,
      version: fresh.version + 1,
    });
    for (const t of targets) {
      await tx.orm.public.AiSuggestion.where({ id: t.id }).update({
        status: "accepted" as never,
      });
    }
    const remaining = await tx.orm.public.AiSuggestion.select("id", "status")
      .where((r) => r.runId.eq(run.id))
      .limit(200)
      .all();
    const allResolved = remaining.every((r) => r.status !== "pending");
    await tx.orm.public.AiAssistRun.where({ id: run.id }).update({
      status: (allResolved ? "accepted" : "succeeded") as never,
    });
    return saved;
  });
  if (!updated) {
    return NextResponse.json(
      {
        error: "STALE_VERSION",
        guidance:
          "Another save landed first. Reload the chapter and rebase the remaining suggestions.",
      },
      { status: 409 },
    );
  }
  await logAssistantAudit({
    userId: user.id,
    action: "assistant.accept",
    targetType: "AiAssistRun",
    targetId: run.id,
    details: {
      projectId,
      sectionId: section.id,
      accepted: targets.map((t) => t.paragraphIndex),
      version: updated.version,
    },
    ipAddress: await clientIp(),
  });
  return NextResponse.json({
    content: updated.content,
    version: updated.version,
    wordCount: updated.wordCount,
    accepted: targets.map((t) => t.id),
  });
}
