import { headers } from "next/headers";
import { db } from "./prisma";

export const ADMIN_PAGE_SIZE_DEFAULT = 20;
export const ADMIN_PAGE_SIZE_MAX = 100;

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***@invalid";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local || !domain) return "***@invalid";
  return `${local[0]}***@${domain}`;
}

export async function logAdminAudit(input: {
  userId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const store = await headers().catch(() => null);
  const forwarded = store?.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ??
    store?.get("x-real-ip") ??
    undefined;
  await db.orm.public.AuditEvent.create({
    userId: input.userId ?? undefined,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    details: (input.details ?? {}) as unknown as never,
    ipAddress: ip,
  });
}

export function pageParams(
  url: URL,
): { page: number; limit: number } | { error: string } {
  const rawPage = url.searchParams.get("page");
  const rawLimit =
    url.searchParams.get("limit") ?? url.searchParams.get("pageSize");
  const page = rawPage == null || rawPage === "" ? 1 : Number(rawPage);
  const limit =
    rawLimit == null || rawLimit === "" ? 20 : Number(rawLimit);
  if (!Number.isInteger(page) || page < 1)
    return { error: "INVALID_PAGE" };
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > ADMIN_PAGE_SIZE_MAX
  )
    return { error: "INVALID_LIMIT" };
  return { page, limit };
}

export function paginate<T>(
  items: T[],
  page: number,
  limit: number,
): { items: T[]; page: number; limit: number; total: number; hasMore: boolean } {
  const total = items.length;
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    page,
    limit,
    total,
    hasMore: start + limit < total,
  };
}

export function utcDayRange(dateStr: string): {
  start: Date;
  end: Date;
} | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return null;
  return { start, end };
}

export function formatXaf(amount: number): string {
  return `${new Intl.NumberFormat("en-US").format(amount)} XAF`;
}

// In memory 60s overview cache with stale fallback.
type OverviewPayload = Record<string, unknown> & {
  lastComputedAt: string;
};
let overviewCache: { at: number; data: OverviewPayload } | null = null;
export const OVERVIEW_TTL_MS = 60_000;

export function readOverviewCache(): OverviewPayload | null {
  if (!overviewCache) return null;
  if (Date.now() - overviewCache.at > OVERVIEW_TTL_MS) return overviewCache.data;
  return overviewCache.data;
}

export function readFreshOverviewCache(): OverviewPayload | null {
  if (!overviewCache) return null;
  if (Date.now() - overviewCache.at > OVERVIEW_TTL_MS) return null;
  return overviewCache.data;
}

export function writeOverviewCache(data: OverviewPayload): void {
  overviewCache = { at: Date.now(), data };
}
