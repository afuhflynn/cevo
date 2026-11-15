import { ArchiveIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import {
  CatalogSkeleton,
  CreditBalanceCard,
  DashboardCatalogClient,
  DashboardStatsHeader,
  MilestonesFeed,
  StatsSkeleton,
} from "@/components/dashboard/dashboard-catalog";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth-helpers";
import {
  getDashboardActivities,
  getDashboardCatalog,
  getDashboardStats,
} from "@/lib/dashboard";
import { getOnboardingState } from "@/lib/onboarding";
import { loadDashboardSearchParams } from "@/lib/search-params";

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
          <h1 className="font-serif text-3xl tracking-tight">
            Welcome{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You hold {stats.walletBalance} credits.{" "}
            <Link
              href="/dashboard/billing"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Buy more
            </Link>
            .
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/archived"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ArchiveIcon aria-hidden="true" />
            Archived
          </Link>
          <Link
            href="/dashboard/new"
            className={buttonVariants({ size: "sm" })}
          >
            <PlusIcon aria-hidden="true" />
            Start a project
          </Link>
        </div>
      </div>

      <DashboardStatsHeader stats={stats} activityCount={activities.length} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex min-w-0 flex-col gap-3" aria-label="Projects">
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

        <aside className="flex min-w-0 flex-col gap-4" aria-label="Sidebar">
          <CreditBalanceCard balance={stats.walletBalance} />
          <section
            className="flex flex-col gap-3"
            aria-label="Recent milestones"
          >
            <h2 className="text-lg font-medium">Milestones</h2>
            <MilestonesFeed activities={activities} />
          </section>
        </aside>
      </div>
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
          <StatsSkeleton />
          <CatalogSkeleton />
        </div>
      }
    >
      <DashboardLoader searchParams={searchParams} />
    </Suspense>
  );
}
