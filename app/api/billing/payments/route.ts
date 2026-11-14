import { NextResponse } from "next/server";
import { z } from "zod";
import { checkBillingRateLimit } from "@/lib/arcjet";
import { getCurrentUser } from "@/lib/auth-helpers";
import { startPayment } from "@/lib/billing";
import { clientIp } from "@/lib/workspace";

const startSchema = z.object({
  packageId: z.string().min(1).max(100),
  phone: z.string().min(5).max(30),
  clientKey: z.string().min(8).max(64),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (!(await checkBillingRateLimit(request, "start"))) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const result = await startPayment({
    userId: user.id,
    packageId: parsed.data.packageId,
    phone: parsed.data.phone,
    clientKey: parsed.data.clientKey,
    ipAddress: await clientIp(),
  });
  if (!result.ok) {
    if (result.error === "DUPLICATE_CLIENT_KEY") {
      return NextResponse.json(
        { error: result.error, paymentId: result.existingPaymentId },
        { status: 409 },
      );
    }
    const status =
      result.status === 404 ? 404 : result.status === 422 ? 422 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(
    {
      paymentId: result.paymentId,
      status: result.status,
      expiresAt: result.expiresAt,
    },
    { status: 201 },
  );
}
