import { headers } from "next/headers";
import { db } from "./prisma";
import { logWizardAudit } from "./wizard-credits";

export async function clientIp(): Promise<string | undefined> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ?? store.get("x-real-ip") ?? undefined;
  return ip ?? undefined;
}

export async function loadOwnedWizardSession(input: {
  userId: string;
  role: string;
  sessionId: string;
  allowAdminRead: boolean;
}) {
  const session = await db.orm.public.WizardSession.where({
    id: input.sessionId,
  }).first();
  if (!session) return { error: 404 as const };
  if (session.userId === input.userId) return { session };
  const isAdmin = input.role === "ADMIN" || input.role === "SUPER_ADMIN";
  if (isAdmin && input.allowAdminRead) return { session, readOnly: true };
  await logWizardAudit({
    userId: input.userId,
    action: "wizard.access.denied",
    targetType: "WizardSession",
    targetId: input.sessionId,
    details: { reason: "cross-owner" },
    ipAddress: await clientIp(),
  });
  return { error: 403 as const };
}
