import { NextResponse } from "next/server";
import { z } from "zod";
import { checkAssistantRateLimit } from "@/lib/arcjet";
import {
  ASSISTANT_MAX_INPUT_CHARS,
  assistantScopeLabel,
  ensureAssistantPricingRows,
  estimateAssistantCredits,
  getAssistantWalletBalance,
  logAssistantAudit,
} from "@/lib/assistant";
import { isAssistantOperation } from "@/lib/assistant-prompts";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import { clientIp, loadOwnedProject } from "@/lib/workspace";

const estimateSchema = z.object({
  sectionId: z.string().min(1),
  operation: z.string().min(1),
  inputText: z.string().min(1),
  sectionVersion: z.number().int().min(1),
  scope: z.enum(["selection", "chapter"]).optional(),
});

type Ctx = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId } = await params;
  if (!(await checkAssistantRateLimit(request))) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  const owned = await loadOwnedProject({
    userId: user.id,
    role: user.role,
    projectId,
    allowAdminRead: true,
  });
  if (!owned.ok) {
    const status = owned.error;
    return NextResponse.json(
      { error: status === 404 ? "NOT_FOUND" : "FORBIDDEN" },
      { status },
    );
  }
  const body = await request.json().catch(() => ({}));
  const parsed = estimateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  if (!isAssistantOperation(parsed.data.operation)) {
    return NextResponse.json({ error: "INVALID_OPERATION" }, { status: 422 });
  }
  const inputChars = parsed.data.inputText.length;
  if (inputChars > ASSISTANT_MAX_INPUT_CHARS) {
    return NextResponse.json(
      {
        error: "INPUT_TOO_LARGE",
        inputChars,
        maxChars: ASSISTANT_MAX_INPUT_CHARS,
        guidance:
          "Split the chapter into smaller parts and run the assistant on each part.",
      },
      { status: 422 },
    );
  }
  const section = await db.orm.public.ProjectSection.where({
    id: parsed.data.sectionId,
  }).first();
  if (!section || section.projectId !== projectId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (section.version !== parsed.data.sectionVersion) {
    return NextResponse.json(
      {
        error: "STALE_SECTION",
        currentVersion: section.version,
        updatedAt: new Date(section.updatedAt).toISOString(),
      },
      { status: 409 },
    );
  }
  const scope = parsed.data.scope ?? "chapter";
  await ensureAssistantPricingRows();
  const { estimateCredits, allowedOutputChars } =
    await estimateAssistantCredits(parsed.data.operation, inputChars);
  const balance = await getAssistantWalletBalance(user.id);
  await logAssistantAudit({
    userId: user.id,
    action: "assistant.estimate",
    targetType: "ProjectSection",
    targetId: parsed.data.sectionId,
    details: {
      projectId,
      operation: parsed.data.operation,
      estimateCredits,
      inputChars,
    },
    ipAddress: await clientIp(),
  });
  return NextResponse.json({
    estimateCredits,
    inputChars,
    allowedOutputChars,
    scope: assistantScopeLabel(scope),
    balance,
    readOnly: owned.readOnly ? true : undefined,
  });
}
