import { NextResponse } from "next/server";
import { z } from "zod";
import { checkAssistantRateLimit } from "@/lib/arcjet";
import { logAssistantAudit } from "@/lib/assistant";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import { clientIp, loadOwnedProject } from "@/lib/workspace";

const discardSchema = z.object({
  sectionId: z.string().min(1).optional(),
});

type Ctx = { params: Promise<{ projectId: string; runId: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId, runId } = await params;
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
        details: { reason: "cross-owner", endpoint: "runs.discard" },
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
  discardSchema.safeParse(body);
  const run = await db.orm.public.AiAssistRun.where({ id: runId }).first();
  if (!run || run.projectId !== projectId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const pending = await db.orm.public.AiSuggestion.select("id")
    .where((r) => r.runId.eq(run.id))
    .where((r) => r.status.eq("pending"))
    .limit(200)
    .all();
  for (const s of pending) {
    await db.orm.public.AiSuggestion.where({ id: s.id }).update({
      status: "discarded" as never,
    });
  }
  await db.orm.public.AiAssistRun.where({ id: run.id }).update({
    status: "discarded" as never,
  });
  await logAssistantAudit({
    userId: user.id,
    action: "assistant.discard",
    targetType: "AiAssistRun",
    targetId: run.id,
    details: { projectId, discarded: pending.length },
    ipAddress: await clientIp(),
  });
  return NextResponse.json({ ok: true, discarded: pending.length });
}
