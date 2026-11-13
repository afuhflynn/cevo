import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import {
  getDashboardActivities,
  getDashboardCatalog,
  getDashboardStats,
} from "@/lib/dashboard";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? "";
  const status = url.searchParams.get("status") ?? "all";
  const archived = url.searchParams.get("archived") === "true";
  const pageRaw = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const [stats, catalog, activities] = await Promise.all([
    getDashboardStats(user.id),
    getDashboardCatalog({ userId: user.id, search, status, page, archived }),
    archived ? Promise.resolve([]) : getDashboardActivities(user.id),
  ]);

  return NextResponse.json({
    stats,
    catalog,
    activities,
    walletBalance: stats.walletBalance,
  });
}
