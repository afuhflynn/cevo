import { NextResponse } from "next/server";
import { checkBillingRateLimit } from "@/lib/arcjet";
import {
  allocateFromWebhook,
  logBillingAudit,
  mapProviderStatus,
  readWebhookSignature,
  verifyWebhookSignature,
} from "@/lib/billing";
import { db } from "@/lib/prisma";

/**
 * Fapshi webhook: verifies the HMAC signature over the raw body before
 * any balance change. Rejected webhooks still write an event row with
 * signatureValid false and change nothing.
 */
function strField(payload: Record<string, unknown>, key: string): string | null {
  const value: unknown = payload[key];
  return typeof value === "string" ? value : null;
}

export async function POST(request: Request) {
  if (!(await checkBillingRateLimit(request, "webhook"))) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  const rawBody = await request.text();
  const signature = readWebhookSignature(request);
  const valid = verifyWebhookSignature(rawBody, signature);

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const providerTransId =
    strField(payload, "transId") ??
    strField(payload, "transID") ??
    strField(payload, "providerTransId") ??
    strField(payload, "externalId");
  // externalId carries our payment id when Fapshi echoes it back.
  const echoedExternalId = strField(payload, "externalId");
  const paymentId =
    echoedExternalId !== null && echoedExternalId !== providerTransId
      ? echoedExternalId
      : (strField(payload, "paymentId") ?? strField(payload, "userId"));
  const rawStatus = strField(payload, "status") ?? "";

  if (!valid) {
    await db.orm.public.PaymentWebhookEvent.create({
      paymentId: paymentId ?? null,
      eventType: "webhook.rejected",
      payload: payload as never,
      isProcessed: false,
      signatureValid: false,
      providerTransId: providerTransId ?? null,
    } as never);
    await logBillingAudit({
      userId: null,
      action: "payment.webhook.received",
      targetType: "Payment",
      targetId: paymentId ?? providerTransId ?? "unknown",
      details: { rejected: true, reason: "invalid signature" },
    });
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  if (!providerTransId && !paymentId) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const mapped = mapProviderStatus(rawStatus);
  if (mapped === null) {
    // Still pending provider side: record the event, change nothing.
    await db.orm.public.PaymentWebhookEvent.create({
      paymentId: paymentId ?? null,
      eventType: "webhook.pending",
      payload: payload as never,
      isProcessed: true,
      signatureValid: true,
      providerTransId: providerTransId ?? null,
    } as never);
    return NextResponse.json({ accepted: true, outcome: "PENDING" });
  }

  const failureReason =
    mapped === "FAILED"
      ? (strField(payload, "message") ?? "Provider reported failure").slice(0, 300)
      : undefined;

  const result = await allocateFromWebhook({
    providerTransId,
    paymentId,
    status: mapped,
    failureReason,
    eventType: "webhook.verified",
    payload,
    signatureValid: true,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json({ accepted: true, outcome: result.outcome });
}
