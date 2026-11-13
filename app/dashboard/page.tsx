import Link from "next/link";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import {
  CatalogSkeleton,
  DashboardCatalogClient,
  DashboardStatsHeader,
  MilestonesFeed,
} from "@/components/dashboard/dashboard-catalog";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth-helpers";
import {
  getDashboardActivities,
  getDashboardCatalog,
  getDashboardStats,
} from "@/lib/dashboard";
import { getOnboardingState } from "@/lib/onboarding";
import { loadDashboardSearchParams } from "@/lib/search-params";

export const instant = false;

async function DashboardLoader({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const { search, status, page } =
    await loadDashboardSearchParams(searchParams);
  const [stats, catalog, activities, state] = await Promise.all([
    getDashboardStats(user.id),
    getDashboardCatalog({ userId: user.id, search, status, page }),
    getDashboardActivities(user.id),
    getOnboardingState(user.id),
  ]);
  const firstName = state.student?.firstName;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">
            Welcome{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="text-sm text-muted-foreground">
            You hold {stats.walletBalance} credits. Buying more arrives with the
            payments slice.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/archived"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium"
          >
            Archived
          </Link>
          <Link
            href="/dashboard/new"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground"
          >
            Start a project
          </Link>
        </div>
      </div>

      <DashboardStatsHeader stats={stats} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Your projects</h2>
        <DashboardCatalogClient
          initial={{
            stats,
            catalog,
            activities,
            walletBalance: stats.walletBalance,
          }}
          archived={false}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Milestones</h2>
        <MilestonesFeed activities={activities} />
      </section>
    </div>
  );
}

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Loading your dashboard…
            </CardContent>
          </Card>
          <CatalogSkeleton />
        </div>
      }
    >
      <DashboardLoader searchParams={searchParams} />
    </Suspense>
  );
}
