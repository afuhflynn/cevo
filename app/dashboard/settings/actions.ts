"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { checkFilesCap } from "@/lib/file-uploads";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from "@/lib/notification-preferences";
import { personalSchema } from "@/lib/onboarding-validation";
import { db } from "@/lib/prisma";
import { headObjectSize, presignPutUrl } from "@/lib/storage";

async function requireOwner() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { error: "UNAUTHENTICATED" as const };
  }
  const row = await db.orm.public.User.where({
    id: session.user.id,
  }).first();
  if (!row || (row as unknown as { isActive: boolean }).isActive === false) {
    return { error: "UNAUTHENTICATED" as const };
  }
  return { userId: session.user.id };
}

export type SettingsActionResult = {
  ok: boolean;
  fieldErrors?: Record<string, string>;
  error?: string;
};

export type SettingsActionFailure = {
  ok: false;
  fieldErrors?: Record<string, string>;
  error?: string;
};

export async function saveProfile(
  input: unknown,
): Promise<SettingsActionResult> {
  const owner = await requireOwner();
  if ("error" in owner) return { ok: false, error: "401" };
  const parsed = personalSchema.safeParse(input);
  if (!parsed.success) {
    const out: Record<string, string> = {};
    for (const [key, issues] of Object.entries(
      parsed.error.flatten().fieldErrors,
    )) {
      if (issues?.[0]) out[key] = issues[0];
    }
    return { ok: false, fieldErrors: out };
  }
  const d = parsed.data;
  await db.orm.public.StudentProfile.where({ userId: owner.userId }).update({
    firstName: d.firstName,
    lastName: d.lastName,
    country: d.country,
    preferredLanguage: d.preferredLanguage,
  } as never);
  await db.orm.public.User.where({ id: owner.userId }).update({
    name: `${d.firstName} ${d.lastName}`.trim().slice(0, 200),
  } as never);
  return { ok: true };
}

export async function getPreferences() {
  const owner = await requireOwner();
  if ("error" in owner) return { ok: false as const, error: "401" };
  return {
    ok: true as const,
    preferences: await getNotificationPreferences(owner.userId),
  };
}

export async function savePreferences(
  input: unknown,
): Promise<SettingsActionResult> {
  const owner = await requireOwner();
  if ("error" in owner) return { ok: false, error: "401" };
  const result = await saveNotificationPreferences(owner.userId, input);
  if (!result.ok) {
    const out: Record<string, string> = {};
    for (const [key, issues] of Object.entries(result.issues)) {
      if (issues?.[0]) out[key] = issues[0];
    }
    return { ok: false, fieldErrors: out };
  }
  return { ok: true };
}

const ticketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  category: z.enum(["account", "billing", "technical", "other"]),
  message: z.string().trim().min(10).max(5000),
});

export async function openSupportTicket(
  input: unknown,
): Promise<SettingsActionResult & { ticketId?: string }> {
  const owner = await requireOwner();
  if ("error" in owner) return { ok: false, error: "401" };
  const parsed = ticketSchema.safeParse(input);
  if (!parsed.success) {
    const out: Record<string, string> = {};
    for (const [key, issues] of Object.entries(
      parsed.error.flatten().fieldErrors,
    )) {
      if (issues?.[0]) out[key] = issues[0];
    }
    return { ok: false, fieldErrors: out };
  }
  const ticket = (await db.orm.public.SupportTicket.create({
    userId: owner.userId,
    subject: parsed.data.subject,
    category: parsed.data.category,
  } as never)) as unknown as { id: string };
  await db.orm.public.SupportMessage.create({
    ticketId: ticket.id,
    senderId: owner.userId,
    isAdmin: false,
    message: parsed.data.message,
  } as never);
  return { ok: true, ticketId: ticket.id };
}

const AVATAR_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;
const AVATAR_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const avatarRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(AVATAR_MIME as unknown as [string, ...string[]]),
  fileSize: z.number().int().positive().max(AVATAR_MAX_BYTES),
});

export async function requestAvatarUpload(
  input: unknown,
): Promise<
  | { ok: true; key: string; url: string; expiresInSec: number }
  | SettingsActionFailure
> {
  const owner = await requireOwner();
  if ("error" in owner) return { ok: false, error: "401" };
  const parsed = avatarRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_FILE" };
  const cap = checkFilesCap(owner.userId, "request");
  if (!cap.allowed) return { ok: false, error: "RATE_LIMITED" };
  const dot = parsed.data.fileName.lastIndexOf(".");
  const ext = dot >= 0 ? parsed.data.fileName.slice(dot + 1).toLowerCase() : "";
  if (!ext || AVATAR_EXT[parsed.data.mimeType] !== ext) {
    return { ok: false, error: "INVALID_FILE" };
  }
  const key = `avatars/${owner.userId}/${randomUUID()}.${ext}`;
  try {
    const { url, expiresInSec } = await presignPutUrl(
      key,
      parsed.data.mimeType,
      parsed.data.fileSize,
    );
    return { ok: true, key, url, expiresInSec };
  } catch {
    return { ok: false, error: "UPLOAD_UNAVAILABLE" };
  }
}

export async function confirmAvatarUpload(
  input: unknown,
): Promise<{ ok: true; key: string } | SettingsActionFailure> {
  const owner = await requireOwner();
  if ("error" in owner) return { ok: false, error: "401" };
  const parsed = z.object({ key: z.string().min(1).max(500) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_FILE" };
  const key = parsed.data.key;
  if (!key.startsWith(`avatars/${owner.userId}/`) || key.includes("..")) {
    return { ok: false, error: "INVALID_FILE" };
  }
  const size = await headObjectSize(key);
  if (!size || size <= 0 || size > AVATAR_MAX_BYTES) {
    return { ok: false, error: "INVALID_FILE" };
  }
  await db.orm.public.User.where({ id: owner.userId }).update({
    image: key,
  } as never);
  return { ok: true, key };
}
