import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./prisma";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  role: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
  isActive: boolean;
};

async function getClientIp(): Promise<string | null> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return store.get("x-real-ip") ?? store.get("x-vercel-forwarded-for") ?? null;
}

async function logAdminAccessDenied(input: {
  userId: string | null;
  pathname: string;
  method: string;
  role: string | null;
  reason: string;
}): Promise<void> {
  await db.orm.public.AuditEvent.create({
    userId: input.userId,
    action: "ADMIN_ACCESS_DENIED",
    targetType: "ROUTE",
    targetId: input.pathname,
    details: {
      method: input.method,
      role: input.role,
      reason: input.reason,
    },
    ipAddress: await getClientIp(),
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return null;
  }
  const row = await db.orm.public.User.where({
    id: session.user.id,
  }).first();
  if (!row || row.isActive === false) {
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    emailVerified: row.emailVerified,
    role: row.role,
    isActive: row.isActive,
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }
  return user;
}

export async function requireVerifiedEmail(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.emailVerified) {
    redirect("/sign-in?error=verification-required");
  }
  return user;
}

async function readAdminUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return null;
  }
  const row = await db.orm.public.User.where({
    id: session.user.id,
  }).first();
  if (!row || row.isActive === false) {
    return null;
  }
  if (row.role !== "ADMIN" && row.role !== "SUPER_ADMIN") {
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    emailVerified: row.emailVerified,
    role: row.role,
    isActive: row.isActive,
  };
}

export async function requireAdmin(
  pathname: string,
  method = "GET",
): Promise<CurrentUser> {
  const admin = await readAdminUser();
  if (admin) {
    return admin;
  }
  const session = await auth.api.getSession({ headers: await headers() });
  const roleRow = session?.user
    ? await db.orm.public.User.where({ id: session.user.id }).first()
    : null;
  await logAdminAccessDenied({
    userId: session?.user?.id ?? null,
    pathname,
    method,
    role: roleRow?.role ?? null,
    reason: session?.user ? "role-not-admin" : "no-session",
  });
  forbidden();
}

export async function getAdminUser(
  pathname: string,
  method = "GET",
): Promise<CurrentUser | null> {
  const admin = await readAdminUser();
  if (admin) {
    return admin;
  }
  const session = await auth.api.getSession({ headers: await headers() });
  const roleRow = session?.user
    ? await db.orm.public.User.where({ id: session.user.id }).first()
    : null;
  await logAdminAccessDenied({
    userId: session?.user?.id ?? null,
    pathname,
    method,
    role: roleRow?.role ?? null,
    reason: session?.user ? "role-not-admin" : "no-session",
  });
  return null;
}
