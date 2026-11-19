import { z } from "zod";
import { db } from "./prisma";

export const notificationPreferenceSchema = z.object({
  productUpdates: z.boolean(),
  billingAlerts: z.boolean(),
  researchDigests: z.boolean(),
});

export type NotificationPreferenceInput = z.infer<
  typeof notificationPreferenceSchema
>;

export type NotificationPreferenceState = {
  productUpdates: boolean;
  billingAlerts: boolean;
  researchDigests: boolean;
};

const DEFAULTS: NotificationPreferenceState = {
  productUpdates: true,
  billingAlerts: true,
  researchDigests: false,
};

type PreferenceRow = {
  productUpdates: boolean;
  billingAlerts: boolean;
  researchDigests: boolean;
};

/**
 * READ THIS before emitting a user-facing notification: load the recipient's
 * preferences with getNotificationPreferences and honor the matching flag.
 * A toggle with no reader is theater; every flag below must gate an emitter.
 */
export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferenceState> {
  const row = (await db.orm.public.NotificationPreference.where({
    userId,
  }).first()) as unknown as PreferenceRow | null;
  if (!row) return { ...DEFAULTS };
  return {
    productUpdates: row.productUpdates,
    billingAlerts: row.billingAlerts,
    researchDigests: row.researchDigests,
  };
}

export async function saveNotificationPreferences(
  userId: string,
  input: unknown,
): Promise<{ ok: true } | { ok: false; issues: Record<string, string[]> }> {
  const parsed = notificationPreferenceSchema.safeParse(input);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return { ok: false, issues: flat.fieldErrors as Record<string, string[]> };
  }
  const existing = (await db.orm.public.NotificationPreference.where({
    userId,
  }).first()) as unknown as { id: string } | null;
  if (existing) {
    await db.orm.public.NotificationPreference.where({
      id: existing.id,
    }).update({ ...parsed.data } as never);
  } else {
    await db.orm.public.NotificationPreference.create({
      userId,
      ...parsed.data,
    } as never);
  }
  return { ok: true };
}
