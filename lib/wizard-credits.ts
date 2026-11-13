import { db } from "./prisma";

export async function getWalletBalance(userId: string): Promise<number> {
  const wallet = await db.orm.public.CreditWallet.where({ userId }).first();
  return wallet?.balance ?? 0;
}

async function getOrCreateWallet(userId: string) {
  const existing = await db.orm.public.CreditWallet.where({ userId }).first();
  if (existing) return existing;
  return db.orm.public.CreditWallet.create({ userId, balance: 0 });
}

export async function debitSynthesis(
  userId: string,
  referenceId: string,
  amount: number,
  metadata: Record<string, unknown>,
): Promise<{ ok: true; balanceAfter: number } | { ok: false; reason: string }> {
  const wallet = await getOrCreateWallet(userId);
  const existing = await db.orm.public.CreditLedger.where({
    walletId: wallet.id,
  })
    .where({ referenceId })
    .first();
  if (existing) {
    return { ok: true, balanceAfter: existing.balanceAfter };
  }
  if (wallet.balance < amount) {
    return { ok: false, reason: "INSUFFICIENT" };
  }
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
      description: "Wizard brief synthesis",
      referenceId,
      metadata: metadata as unknown as never,
    });
  });
  return { ok: true, balanceAfter };
}

export async function refundSynthesis(
  userId: string,
  debitReferenceId: string,
  amount: number,
  metadata: Record<string, unknown>,
): Promise<void> {
  const wallet = await getOrCreateWallet(userId);
  const refundReferenceId = `refund:${debitReferenceId}`;
  const existing = await db.orm.public.CreditLedger.where({
    walletId: wallet.id,
  })
    .where({ referenceId: refundReferenceId })
    .first();
  if (existing) return;
  const debit = await db.orm.public.CreditLedger.where({
    walletId: wallet.id,
  })
    .where({ referenceId: debitReferenceId })
    .first();
  if (!debit) return;
  const balanceAfter = wallet.balance + amount;
  await db.transaction(async (tx) => {
    await tx.orm.public.CreditWallet.where({ id: wallet.id }).update({
      balance: balanceAfter,
    });
    await tx.orm.public.CreditLedger.create({
      walletId: wallet.id,
      type: "REFUND",
      amount,
      balanceAfter,
      description: "Wizard synthesis refund after provider failure",
      referenceId: refundReferenceId,
      metadata: metadata as unknown as never,
    });
  });
}

export async function logWizardAudit(input: {
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
