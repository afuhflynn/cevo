import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "./prisma";

export const LOW_BALANCE_THRESHOLD = Number.parseInt(
  process.env["LOW_BALANCE_THRESHOLD"] ?? "10",
  10,
);

export const PAYMENT_EXPIRY_MINUTES = Number.parseInt(
  process.env["PAYMENT_EXPIRY_MINUTES"] ?? "30",
  10,
);

export const FAPSHI_BASE_URL =
  process.env["FAPSHI_BASE_URL"] ?? "https://live.fapshi.com";
export const FAPSHI_CURRENCY = process.env["FAPSHI_CURRENCY"] ?? "XAF";

export type BillingPackage = {
  id: string;
  name: string;
  priceXaf: number;
  credits: number;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
};

/**
 * Normalize a Cameroonian phone number to 237XXXXXXXXX.
 * Accepts 9 digit local form (6XXXXXXXX) and 237 prefixed forms,
 * with spaces, dashes, plus signs, dots, and parentheses stripped.
 * Returns null when the input is not a valid Cameroonian mobile number.
 */
export function normalizePhoneTo237(input: string): string | null {
  const digits = input.replace(/[\s\-().+]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  let rest = digits;
  if (rest.startsWith("237")) rest = rest.slice(3);
  else if (rest.startsWith("00237")) rest = rest.slice(5);
  if (!/^[68]/.test(rest)) {
    // MTN and Orange Cameroon mobiles start with 6; 8 covers some
    // newer ranges. Anything else is rejected with 422.
    if (!/^6/.test(rest) && !/^8/.test(rest)) return null;
  }
  if (rest.length !== 9) return null;
  if (!/^[68]\d{8}$/.test(rest)) return null;
  return `237${rest}`;
}

export async function logBillingAudit(input: {
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

async function getOrCreateWallet(userId: string) {
  const existing = await db.orm.public.CreditWallet.where({ userId }).first();
  if (existing) return existing;
  return db.orm.public.CreditWallet.create({ userId, balance: 0 });
}

export async function getBalance(userId: string): Promise<{
  balance: number;
  lowBalance: boolean;
}> {
  const wallet = await db.orm.public.CreditWallet.where({ userId }).first();
  const balance = wallet?.balance ?? 0;
  const threshold =
    Number.isFinite(LOW_BALANCE_THRESHOLD) && LOW_BALANCE_THRESHOLD > 0
      ? LOW_BALANCE_THRESHOLD
      : 10;
  return { balance, lowBalance: balance < threshold };
}

export async function listActivePackages(): Promise<BillingPackage[]> {
  const rows = await db.orm.public.CreditPackage.select(
    "id",
    "name",
    "priceXaf",
    "credits",
    "isPopular",
    "isActive",
    "sortOrder",
  )
    .where((r) => r.isActive.eq(true))
    .orderBy((r) => r.sortOrder.asc())
    .limit(100)
    .all();
  return rows as unknown as BillingPackage[];
}

export async function seedBillingPackages(): Promise<BillingPackage[]> {
  const defaults = [
    {
      name: "Starter",
      priceXaf: 1000,
      credits: 50,
      isPopular: false,
      sortOrder: 1,
    },
    {
      name: "Standard",
      priceXaf: 2500,
      credits: 150,
      isPopular: true,
      sortOrder: 2,
    },
    {
      name: "Pro",
      priceXaf: 5000,
      credits: 350,
      isPopular: false,
      sortOrder: 3,
    },
  ];
  for (const d of defaults) {
    const existing = await db.orm.public.CreditPackage.where({
      name: d.name,
    }).first();
    if (!existing) {
      await db.orm.public.CreditPackage.create({
        name: d.name,
        priceXaf: d.priceXaf,
        credits: d.credits,
        isPopular: d.isPopular,
        isActive: true,
        sortOrder: d.sortOrder,
      });
    }
  }
  return listActivePackages();
}

// ---------------------------------------------------------------------------
// Fapshi provider client (direct collect). Field names follow the public
// Fapshi direct-pay API; confirm request shape and webhook signature header
// against the live sandbox before production traffic (spec 0014 follow-up).
// When API keys are missing (local dev without sandbox), the provider call
// is skipped and the payment stays PENDING with a null providerTransId.
// ---------------------------------------------------------------------------

export type FapshiCollectResult =
  | { ok: true; providerTransId: string }
  | { ok: false; error: string };

export async function fapshiCollect(input: {
  phone: string;
  amountXaf: number;
  externalId: string;
  message?: string;
}): Promise<FapshiCollectResult> {
  const apiKey = process.env["FAPSHI_API_KEY"];
  const apiUser = process.env["FAPSHI_API_USER"];
  if (!apiKey || !apiUser) {
    return { ok: false, error: "PROVIDER_NOT_CONFIGURED" };
  }
  try {
    const res = await fetch(
      `${FAPSHI_BASE_URL.replace(/\/$/, "")}/initiate-pay`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: apiKey,
          apiuser: apiUser,
        },
        body: JSON.stringify({
          amount: input.amountXaf,
          phone: input.phone,
          medium: input.phone.startsWith("23769") ? "orange" : "mtn",
          externalId: input.externalId,
          userId: input.externalId,
          message: input.message ?? "Cevo credit purchase",
        }),
      },
    );
    const data = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const transId =
      typeof data["transId"] === "string"
        ? (data["transId"] as string)
        : typeof data["transID"] === "string"
          ? (data["transID"] as string)
          : typeof data["id"] === "string"
            ? (data["id"] as string)
            : null;
    if (!res.ok || !transId) {
      const msg =
        typeof data["message"] === "string"
          ? (data["message"] as string)
          : `provider responded ${res.status}`;
      return { ok: false, error: msg.slice(0, 300) };
    }
    return { ok: true, providerTransId: transId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message.slice(0, 300) : "PROVIDER_ERROR",
    };
  }
}

export type FapshiStatusResult =
  | { ok: true; status: string; message?: string }
  | { ok: false; error: string };

export async function fapshiQueryStatus(
  providerTransId: string,
): Promise<FapshiStatusResult> {
  const apiKey = process.env["FAPSHI_API_KEY"];
  const apiUser = process.env["FAPSHI_API_USER"];
  if (!apiKey || !apiUser) {
    return { ok: false, error: "PROVIDER_NOT_CONFIGURED" };
  }
  try {
    const res = await fetch(
      `${FAPSHI_BASE_URL.replace(/\/$/, "")}/payment-status/${encodeURIComponent(providerTransId)}`,
      {
        headers: { apikey: apiKey, apiuser: apiUser },
      },
    );
    const data = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!res.ok) {
      return { ok: false, error: `provider responded ${res.status}` };
    }
    const status =
      typeof data["status"] === "string" ? (data["status"] as string) : "";
    const message =
      typeof data["message"] === "string"
        ? (data["message"] as string)
        : undefined;
    return { ok: true, status, message };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message.slice(0, 300) : "PROVIDER_ERROR",
    };
  }
}

/** Map a Fapshi provider status string to the local PaymentStatus. */
export function mapProviderStatus(
  status: string,
): "SUCCESSFUL" | "FAILED" | null {
  const s = status.trim().toLowerCase();
  if (["successful", "success", "completed", "complete", "paid"].includes(s))
    return "SUCCESSFUL";
  if (
    [
      "failed",
      "failure",
      "cancelled",
      "canceled",
      "expired",
      "rejected",
    ].includes(s)
  )
    return "FAILED";
  if (["pending", "processing", "created", "initiated"].includes(s))
    return null;
  // Unknown status maps to FAILED with a generic reason per spec.
  return "FAILED";
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret = process.env["FAPSHI_WEBHOOK_SECRET"];
  if (!secret || !signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signatureHeader.trim().toLowerCase());
  const b = Buffer.from(expected.toLowerCase());
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function readWebhookSignature(request: Request): string | null {
  const h = request.headers;
  return (
    h.get("x-fapshi-signature") ??
    h.get("fapshi-signature") ??
    h.get("x-webhook-signature") ??
    h.get("x-signature") ??
    null
  );
}

// ---------------------------------------------------------------------------
// Money path: start, allocate, sync, expire, refund. Every mutation that
// moves money runs inside one DB transaction and writes an AuditEvent.
// ---------------------------------------------------------------------------

export type StartPaymentResult =
  | { ok: true; paymentId: string; status: string; expiresAt: string }
  | { ok: false; error: string; status: number; existingPaymentId?: string };

export async function startPayment(input: {
  userId: string;
  packageId: string;
  phone: string;
  clientKey: string;
  ipAddress?: string;
}): Promise<StartPaymentResult> {
  const normalized = normalizePhoneTo237(input.phone);
  if (!normalized) return { ok: false, error: "INVALID_PHONE", status: 422 };
  if (!/^[0-9a-fA-F-]{8,64}$/.test(input.clientKey)) {
    return { ok: false, error: "INVALID_CLIENT_KEY", status: 422 };
  }
  const pkg = await db.orm.public.CreditPackage.where({
    id: input.packageId,
  }).first();
  if (!pkg || (pkg as unknown as { isActive: boolean }).isActive !== true) {
    return { ok: false, error: "PACKAGE_UNAVAILABLE", status: 404 };
  }
  const p = pkg as unknown as {
    id: string;
    priceXaf: number;
    credits: number;
    name: string;
  };

  const existing = await db.orm.public.CreditPackage.where({
    id: input.packageId,
  }).first();
  void existing;

  const dup = (await db.orm.public.Payment.where({
    userId: input.userId,
  })
    .where((r) => r.clientKey.eq(input.clientKey))
    .first()) as unknown as { id: string; status: string } | null;
  if (dup) {
    return {
      ok: false,
      error: "DUPLICATE_CLIENT_KEY",
      status: 409,
      existingPaymentId: dup.id,
    };
  }

  const minutes =
    Number.isFinite(PAYMENT_EXPIRY_MINUTES) && PAYMENT_EXPIRY_MINUTES > 0
      ? PAYMENT_EXPIRY_MINUTES
      : 30;
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

  let created: { id: string };
  try {
    created = (await db.orm.public.Payment.create({
      userId: input.userId,
      packageId: p.id,
      amountXaf: p.priceXaf,
      creditsAllocated: p.credits,
      status: "PENDING",
      provider: "fapshi",
      payerPhone: normalized,
      clientKey: input.clientKey,
      expiresAt,
    })) as unknown as { id: string };
  } catch {
    // Unique race on (userId, clientKey): return the existing row as 409.
    const raced = (await db.orm.public.Payment.where({
      userId: input.userId,
    })
      .where((r) => r.clientKey.eq(input.clientKey))
      .first()) as unknown as { id: string } | null;
    if (raced) {
      return {
        ok: false,
        error: "DUPLICATE_CLIENT_KEY",
        status: 409,
        existingPaymentId: raced.id,
      };
    }
    return { ok: false, error: "CREATE_FAILED", status: 500 };
  }

  await logBillingAudit({
    userId: input.userId,
    action: "payment.started",
    targetType: "Payment",
    targetId: created.id,
    details: {
      packageId: p.id,
      amountXaf: p.priceXaf,
      credits: p.credits,
      payerPhone: normalized,
    },
    ipAddress: input.ipAddress,
  });

  // Fire the Fapshi direct collect prompt. A provider failure here does
  // NOT fail the payment: the student can retry polling, and the expiry
  // job cleans up if the prompt never lands. The providerTransId is set
  // when Fapshi accepts; otherwise it stays null until the webhook links
  // by providerTransId.
  const collect = await fapshiCollect({
    phone: normalized,
    amountXaf: p.priceXaf,
    externalId: created.id,
    message: `Cevo ${p.name} package`,
  });
  if (collect.ok) {
    try {
      await db.orm.public.Payment.where({ id: created.id }).update({
        providerTransId: collect.providerTransId,
      });
    } catch {
      // Partial unique race on providerTransId: keep the payment PENDING
      // without the trans id; the webhook will link by payload lookup.
    }
  } else if (collect.error !== "PROVIDER_NOT_CONFIGURED") {
    await db.orm.public.Payment.where({ id: created.id }).update({
      failureReason: `collect prompt not delivered: ${collect.error}`,
    });
  }

  return {
    ok: true,
    paymentId: created.id,
    status: "PENDING",
    expiresAt: expiresAt.toISOString(),
  };
}

export type AllocateResult =
  | { ok: true; outcome: "CREDITED" | "ALREADY" | "TERMINAL" | "LATE_EXPIRY" }
  | { ok: false; error: string };

type BillingPaymentRow = {
  id: string;
  userId: string;
  status: string;
  creditsAllocated: number;
  packageId: string;
  amountXaf: number;
};

/**
 * Allocate credits for a verified webhook. Runs the PENDING to SUCCESSFUL
 * transition plus ledger write plus audit inside one transaction. The
 * ledger (walletId, referenceId, type) unique guard makes retries safe.
 */
export async function allocateFromWebhook(input: {
  providerTransId: string | null;
  paymentId: string | null;
  status: "SUCCESSFUL" | "FAILED";
  failureReason?: string;
  eventType: string;
  payload: Record<string, unknown>;
  signatureValid: boolean;
}): Promise<AllocateResult> {
  let payment: BillingPaymentRow | null = null;

  if (input.paymentId) {
    const row = await db.orm.public.Payment.where({
      id: input.paymentId,
    }).first();
    if (row) payment = row as unknown as BillingPaymentRow;
  }
  if (!payment && input.providerTransId) {
    const row = (await db.orm.public.Payment.where((r) =>
      r.providerTransId.eq(input.providerTransId as string),
    ).first()) as unknown as BillingPaymentRow | null;
    if (row) payment = row;
  }
  if (!payment) return { ok: false, error: "PAYMENT_NOT_FOUND" };

  const event = (await db.orm.public.PaymentWebhookEvent.create({
    paymentId: payment.id,
    eventType: input.eventType,
    payload: input.payload as unknown as never,
    isProcessed: false,
    signatureValid: input.signatureValid,
    providerTransId: input.providerTransId ?? null,
  })) as unknown as { id: string };

  await logBillingAudit({
    userId: null,
    action: "payment.webhook.received",
    targetType: "Payment",
    targetId: payment.id,
    details: {
      eventType: input.eventType,
      providerTransId: input.providerTransId,
      status: input.status,
    },
  });

  if (payment.status !== "PENDING") {
    await db.orm.public.PaymentWebhookEvent.where({ id: event.id }).update({
      isProcessed: true,
    });
    return { ok: true, outcome: "TERMINAL" };
  }

  if (input.status === "FAILED") {
    await db.transaction(async (tx) => {
      await tx.orm.public.Payment.where({ id: payment!.id }).update({
        status: "FAILED",
        failureReason: input.failureReason ?? "Provider reported failure",
        completedAt: new Date(),
      });
      await tx.orm.public.PaymentWebhookEvent.where({ id: event.id }).update({
        isProcessed: true,
      });
    });
    await logBillingAudit({
      userId: payment.userId,
      action: "payment.failed",
      targetType: "Payment",
      targetId: payment.id,
      details: {
        packageId: payment.packageId,
        amountXaf: payment.amountXaf,
        reason: input.failureReason ?? "Provider reported failure",
      },
    });
    return { ok: true, outcome: "TERMINAL" };
  }

  // SUCCESSFUL path: single transaction flips payment, writes ledger, audits.
  const outcome = await db.transaction(async (tx) => {
    const current = await tx.orm.public.Payment.where({
      id: payment!.id,
    }).first();
    const c = current as unknown as { status: string } | null;
    if (!c || c.status !== "PENDING") return "ALREADY" as const;
    const wallet = await tx.orm.public.CreditWallet.where({
      userId: payment!.userId,
    }).first();
    let walletId: string;
    let balance: number;
    if (!wallet) {
      const created = (await tx.orm.public.CreditWallet.create({
        userId: payment!.userId,
        balance: 0,
      })) as unknown as { id: string; balance: number };
      walletId = created.id;
      balance = created.balance;
    } else {
      const w = wallet as unknown as { id: string; balance: number };
      walletId = w.id;
      balance = w.balance;
    }
    const referenceId = `purchase:${payment!.id}`;
    const dup = (await tx.orm.public.CreditLedger.where({
      walletId,
    })
      .where((r) => r.referenceId.eq(referenceId))
      .first()) as unknown as { id: string } | null;
    if (dup) {
      await tx.orm.public.Payment.where({ id: payment!.id }).update({
        status: "SUCCESSFUL",
        webhookVerifiedAt: new Date(),
        completedAt: new Date(),
      });
      return "ALREADY" as const;
    }
    const balanceAfter = balance + payment!.creditsAllocated;
    try {
      await tx.orm.public.CreditWallet.where({ id: walletId }).update({
        balance: balanceAfter,
      });
      await tx.orm.public.CreditLedger.create({
        walletId,
        type: "CREDIT_PURCHASE",
        amount: payment!.creditsAllocated,
        balanceAfter,
        description: "Credit package purchase via mobile money",
        referenceId,
        metadata: {
          paymentId: payment!.id,
          packageId: payment!.packageId,
          amountXaf: payment!.amountXaf,
          providerTransId: input.providerTransId,
        } as unknown as never,
      });
    } catch {
      return "ALREADY" as const;
    }
    await tx.orm.public.Payment.where({ id: payment!.id }).update({
      status: "SUCCESSFUL",
      webhookVerifiedAt: new Date(),
      completedAt: new Date(),
      failureReason: null,
    });
    await tx.orm.public.PaymentWebhookEvent.where({ id: event.id }).update({
      isProcessed: true,
    });
    return "CREDITED" as const;
  });

  if (outcome === "CREDITED") {
    await logBillingAudit({
      userId: payment.userId,
      action: "payment.credited",
      targetType: "Payment",
      targetId: payment.id,
      details: {
        packageId: payment.packageId,
        amountXaf: payment.amountXaf,
        credits: payment.creditsAllocated,
      },
    });
  }
  return { ok: true, outcome };
}

/**
 * Server side status sync for the poll endpoint: query Fapshi when the
 * payment has a providerTransId, apply the mapping, never trust client.
 */
export async function syncPaymentFromProvider(paymentId: string): Promise<{
  status: string;
  failureReason: string | null;
}> {
  const row = await db.orm.public.Payment.where({ id: paymentId }).first();
  const p = row as unknown as {
    id: string;
    status: string;
    providerTransId: string | null;
    failureReason: string | null;
  } | null;
  if (!p) return { status: "NOT_FOUND", failureReason: null };
  if (p.status !== "PENDING" || !p.providerTransId) {
    return { status: p.status, failureReason: p.failureReason };
  }
  const queried = await fapshiQueryStatus(p.providerTransId);
  if (!queried.ok) return { status: p.status, failureReason: p.failureReason };
  const mapped = mapProviderStatus(queried.status);
  if (mapped === null) {
    return { status: p.status, failureReason: p.failureReason };
  }
  if (mapped === "SUCCESSFUL") {
    const res = await allocateFromWebhook({
      providerTransId: p.providerTransId,
      paymentId: p.id,
      status: "SUCCESSFUL",
      eventType: "status-sync.success",
      payload: { providerTransId: p.providerTransId, via: "poll" },
      signatureValid: true,
    });
    void res;
    const fresh = (await db.orm.public.Payment.where({
      id: paymentId,
    }).first()) as unknown as { status: string; failureReason: string | null };
    return { status: fresh.status, failureReason: fresh.failureReason };
  }
  await db.orm.public.Payment.where({ id: paymentId }).update({
    status: "FAILED",
    failureReason: queried.message ?? "Provider reported failure",
    completedAt: new Date(),
  });
  await logBillingAudit({
    userId: null,
    action: "payment.failed",
    targetType: "Payment",
    targetId: paymentId,
    details: {
      via: "poll",
      providerTransId: p.providerTransId,
      reason: queried.message ?? "Provider reported failure",
    },
  });
  return {
    status: "FAILED",
    failureReason: queried.message ?? "Provider reported failure",
  };
}

/** Expire unpaid payments past expiresAt. Never allocates credits. */
export async function expireOverduePayments(): Promise<{ expired: number }> {
  const now = new Date();
  const rows = (await db.orm.public.Payment.select("id", "providerTransId")
    .where((r) => r.status.eq("PENDING"))
    .limit(200)
    .all()) as unknown as Array<{ id: string; providerTransId: string | null }>;
  let expired = 0;
  for (const row of rows) {
    const full = (await db.orm.public.Payment.where({
      id: row.id,
    }).first()) as unknown as {
      id: string;
      userId: string;
      status: string;
      expiresAt: Date | string;
      providerTransId: string | null;
      packageId: string;
      amountXaf: number;
    } | null;
    if (!full || full.status !== "PENDING") continue;
    if (new Date(full.expiresAt).getTime() > now.getTime()) continue;
    // Last chance server side query before expiring.
    if (full.providerTransId) {
      const queried = await fapshiQueryStatus(full.providerTransId);
      if (queried.ok) {
        const mapped = mapProviderStatus(queried.status);
        if (mapped === "SUCCESSFUL") {
          await allocateFromWebhook({
            providerTransId: full.providerTransId,
            paymentId: full.id,
            status: "SUCCESSFUL",
            eventType: "expiry-check.success",
            payload: {
              providerTransId: full.providerTransId,
              via: "expiry-job",
            },
            signatureValid: true,
          });
          continue;
        }
        if (mapped === null) continue; // still pending provider side
      }
    }
    await db.orm.public.Payment.where({ id: full.id }).update({
      status: "EXPIRED",
      failureReason: "Payment window of 30 minutes elapsed",
      completedAt: new Date(),
    });
    await logBillingAudit({
      userId: full.userId,
      action: "payment.expired",
      targetType: "Payment",
      targetId: full.id,
      details: {
        packageId: full.packageId,
        amountXaf: full.amountXaf,
      },
    });
    expired += 1;
  }
  return { expired };
}

/**
 * Refund a failed AI run: writes one REFUND row keyed as
 * refund:<debitReference> and restores the held credits. A duplicate
 * attempt is a no op. Works for wizard, assistant, and review holds,
 * which all use OPERATION_DEBIT rows with the run id as referenceId.
 */
export async function refundFailedRun(input: {
  userId: string;
  debitReferenceId: string;
  description?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: true; refunded: boolean }> {
  const wallet = await getOrCreateWallet(input.userId);
  const w = wallet as unknown as { id: string; balance: number };
  const refundReferenceId = `refund:${input.debitReferenceId}`;
  const existing = (await db.orm.public.CreditLedger.where({
    walletId: w.id,
  })
    .where((r) => r.referenceId.eq(refundReferenceId))
    .first()) as unknown as { id: string } | null;
  if (existing) return { ok: true, refunded: false };
  const debit = (await db.orm.public.CreditLedger.where({
    walletId: w.id,
  })
    .where((r) => r.referenceId.eq(input.debitReferenceId))
    .first()) as unknown as { amount: number } | null;
  if (!debit) return { ok: true, refunded: false };
  const amount = Math.abs(debit.amount);
  if (amount <= 0) return { ok: true, refunded: false };
  await db.transaction(async (tx) => {
    const live = (await tx.orm.public.CreditWallet.where({
      id: w.id,
    }).first()) as unknown as { balance: number };
    const balanceAfter = live.balance + amount;
    await tx.orm.public.CreditWallet.where({ id: w.id }).update({
      balance: balanceAfter,
    });
    try {
      await tx.orm.public.CreditLedger.create({
        walletId: w.id,
        type: "REFUND",
        amount,
        balanceAfter,
        description: input.description ?? "Refund after failed AI run",
        referenceId: refundReferenceId,
        metadata: {
          debitReferenceId: input.debitReferenceId,
          ...(input.metadata ?? {}),
        },
      });
    } catch {
      // Unique race: another worker already refunded.
    }
  });
  await logBillingAudit({
    userId: input.userId,
    action: "payment.refunded",
    targetType: "CreditLedger",
    targetId: refundReferenceId,
    details: {
      debitReferenceId: input.debitReferenceId,
      amount,
    },
  });
  return { ok: true, refunded: true };
}
