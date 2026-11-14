import { createHash } from "node:crypto";
import { db } from "./prisma";
import {
  ASSISTANT_OPERATIONS,
  type AssistantOperation,
  ASSISTANT_PROMPT_VERSION,
} from "./assistant-prompts";

export const ASSISTANT_MAX_INPUT_CHARS = 12_000;
export const ASSISTANT_STREAM_TIMEOUT_MS = 90_000;
export const ASSISTANT_HISTORY_PAGE_SIZE = 20;
export const ASSISTANT_HISTORY_MAX_PAGE_SIZE = 50;
export const ASSISTANT_RETENTION_DAYS = 30;
export const ASSISTANT_HOLD_EXPIRY_MINUTES = Number.parseInt(
  process.env["ASSISTANT_HOLD_EXPIRY_MINUTES"] ??
    process.env["WIZARD_HOLD_EXPIRY_MINUTES"] ??
    "15",
  10,
);
export const ASSISTANT_DAILY_CAP = Number.parseInt(
  process.env["ASSISTANT_DAILY_CAP"] ??
    process.env["WIZARD_SYNTHESIS_DAILY_CAP"] ??
    "10",
  10,
);

export const ASSISTANT_ALLOWED_OUTPUT_CHARS: Record<
  AssistantOperation,
  number
> = {
  tone: 2000,
  polish: 2000,
  review: 1500,
};

const FALLBACK_RATE_PER_1K: Record<AssistantOperation, number> = {
  tone: 2,
  polish: 2,
  review: 3,
};

export function normalizeAssistantText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function hashAssistantInput(text: string): string {
  return createHash("sha256")
    .update(normalizeAssistantText(text))
    .digest("hex");
}

export function assistantScopeLabel(scope: string): string {
  return scope === "selection" ? "Selected text" : "Whole chapter";
}

export async function getAssistantRate(
  operation: AssistantOperation,
): Promise<number> {
  try {
    const row = await db.orm.public.OperationPricing.where({
      operationType: `assistant_${operation}`,
    }).first();
    if (row && Number.isFinite(row.creditCost) && row.creditCost > 0) {
      return row.creditCost;
    }
  } catch {
    // fall through to fallback rate when pricing table is not seeded yet
  }
  return FALLBACK_RATE_PER_1K[operation];
}

export async function estimateAssistantCredits(
  operation: AssistantOperation,
  inputChars: number,
): Promise<{ estimateCredits: number; allowedOutputChars: number }> {
  const allowedOutputChars = ASSISTANT_ALLOWED_OUTPUT_CHARS[operation];
  const rate = await getAssistantRate(operation);
  const estimate = Math.max(
    1,
    Math.ceil(((inputChars + allowedOutputChars) / 1000) * rate),
  );
  return { estimateCredits: estimate, allowedOutputChars };
}

export function actualCreditsFromUsage(
  estimate: number,
  inputTokens: number,
  outputTokens: number,
  ratePer1k: number,
): number {
  const actual = Math.max(
    1,
    Math.ceil(((inputTokens + outputTokens) / 1000) * ratePer1k),
  );
  return Math.min(estimate, actual);
}

export async function ensureAssistantPricingRows(): Promise<void> {
  const rows: {
    operationType: string;
    displayName: string;
    creditCost: number;
    defaultModel: string;
  }[] = [
    {
      operationType: "assistant_tone",
      displayName: "Assistant tone revision",
      creditCost: 2,
      defaultModel: "openrouter-default",
    },
    {
      operationType: "assistant_polish",
      displayName: "Assistant paragraph polishing",
      creditCost: 2,
      defaultModel: "openrouter-default",
    },
    {
      operationType: "assistant_review",
      displayName: "Assistant consistency review",
      creditCost: 3,
      defaultModel: "openrouter-default",
    },
  ];
  for (const row of rows) {
    try {
      const existing = await db.orm.public.OperationPricing.where({
        operationType: row.operationType,
      }).first();
      if (!existing) {
        await db.orm.public.OperationPricing.create({
          operationType: row.operationType,
          displayName: row.displayName,
          creditCost: row.creditCost,
          defaultModel: row.defaultModel,
        });
      }
    } catch {
      // best effort seed; estimate falls back when rows are missing
    }
  }
}

export function splitAssistantParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 100);
}

function textFromNode(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;
  if (typeof n["text"] === "string") return n["text"] as string;
  const content = n["content"];
  if (Array.isArray(content)) return content.map(textFromNode).join("");
  return "";
}

export function extractParagraphsFromTiptap(content: unknown): string[] {
  if (!content || typeof content !== "object") return [];
  const doc = content as Record<string, unknown>;
  const blocks = Array.isArray(doc["content"])
    ? (doc["content"] as unknown[])
    : [];
  const out: string[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    const type = (block as Record<string, unknown>)["type"];
    if (type === "paragraph" || type === "heading") {
      const text = textFromNode(block).trim();
      if (text) out.push(text);
    }
  }
  return out;
}

export function tiptapWithReplacements(
  content: unknown,
  replacements: Map<number, string>,
): unknown {
  const doc = (
    content && typeof content === "object"
      ? (content as Record<string, unknown>)
      : { type: "doc", content: [] }
  ) as Record<string, unknown>;
  const blocks = Array.isArray(doc["content"])
    ? [...(doc["content"] as unknown[])]
    : [];
  let paragraphIndex = -1;
  const next = blocks.map((block) => {
    if (!block || typeof block !== "object") return block;
    const type = (block as Record<string, unknown>)["type"];
    if (type !== "paragraph" && type !== "heading") return block;
    const text = textFromNode(block).trim();
    if (!text) return block;
    paragraphIndex += 1;
    const revised = replacements.get(paragraphIndex);
    if (revised === undefined) return block;
    const b = block as Record<string, unknown>;
    if (type === "heading") {
      return { ...b, content: [{ type: "text", text: revised }] };
    }
    return { ...b, content: [{ type: "text", text: revised }] };
  });
  return { ...doc, type: "doc", content: next };
}

export async function getAssistantWalletBalance(
  userId: string,
): Promise<number> {
  const wallet = await db.orm.public.CreditWallet.where({ userId }).first();
  return wallet?.balance ?? 0;
}

async function getOrCreateAssistantWallet(userId: string) {
  const existing = await db.orm.public.CreditWallet.where({ userId }).first();
  if (existing) return existing;
  return db.orm.public.CreditWallet.create({ userId, balance: 0 });
}

export async function holdAssistantCredits(
  userId: string,
  runId: string,
  amount: number,
  metadata: Record<string, unknown>,
): Promise<{ ok: true; balanceAfter: number } | { ok: false; reason: string }> {
  const wallet = await getOrCreateAssistantWallet(userId);
  const existing = await db.orm.public.CreditLedger.where({
    walletId: wallet.id,
  })
    .where({ referenceId: runId })
    .first();
  if (existing) return { ok: true, balanceAfter: existing.balanceAfter };
  if (wallet.balance < amount) return { ok: false, reason: "INSUFFICIENT" };
  const balanceAfter = wallet.balance - amount;
  await db.transaction(async (tx) => {
    await tx.orm.public.CreditWallet.where({ id: wallet.id }).update({
      balance: balanceAfter,
    });
    await tx.orm.public.CreditLedger.create({
      walletId: wallet.id,
      type: "OPERATION_DEBIT",
      amount: -amount,
      balanceAfter,
      description: "Assistant run hold",
      referenceId: runId,
      metadata: metadata as unknown as never,
    });
  });
  return { ok: true, balanceAfter };
}

export async function settleAssistantHold(
  userId: string,
  runId: string,
  estimate: number,
  actual: number,
  metadata: Record<string, unknown>,
): Promise<void> {
  const overage = Math.max(0, estimate - actual);
  if (overage <= 0) return;
  const wallet = await getOrCreateAssistantWallet(userId);
  const refundReferenceId = `refund:${runId}`;
  const existing = await db.orm.public.CreditLedger.where({
    walletId: wallet.id,
  })
    .where({ referenceId: refundReferenceId })
    .first();
  if (existing) return;
  const balanceAfter = wallet.balance + overage;
  await db.transaction(async (tx) => {
    await tx.orm.public.CreditWallet.where({ id: wallet.id }).update({
      balance: balanceAfter,
    });
    await tx.orm.public.CreditLedger.create({
      walletId: wallet.id,
      type: "REFUND",
      amount: overage,
      balanceAfter,
      description: "Assistant hold overage refund",
      referenceId: refundReferenceId,
      metadata: metadata as unknown as never,
    });
  });
}

export async function refundAssistantHold(
  userId: string,
  runId: string,
  estimate: number,
  metadata: Record<string, unknown>,
): Promise<void> {
  await settleAssistantHold(userId, runId, estimate, 0, metadata);
}

export async function logAssistantAudit(input: {
  userId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  await db.orm.public.AuditEvent.create({
    userId: input.userId ?? undefined,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    details: (input.details ?? {}) as unknown as never,
    ipAddress: input.ipAddress,
  });
}

export function assistantExpiryDate(from: Date = new Date()): Date {
  const minutes =
    Number.isFinite(ASSISTANT_HOLD_EXPIRY_MINUTES) &&
    ASSISTANT_HOLD_EXPIRY_MINUTES > 0
      ? ASSISTANT_HOLD_EXPIRY_MINUTES
      : 15;
  return new Date(from.getTime() + minutes * 60 * 1000);
}

export function isAssistantOperationValue(
  value: unknown,
): value is AssistantOperation {
  return (
    typeof value === "string" &&
    (ASSISTANT_OPERATIONS as readonly string[]).includes(value)
  );
}

export { ASSISTANT_PROMPT_VERSION };
export type { AssistantOperation };
