import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import {
  ActiveProjectsList,
  ProjectsListSkeleton,
} from "@/components/dashboard/projects-list";
import { requireUser } from "@/lib/auth-helpers";
import {
  getDashboardActivities,
  getDashboardCatalog,
  getDashboardStats,
} from "@/lib/dashboard";
import { loadDashboardSearchParams } from "@/lib/search-params";

export const instant = false;

async function ProjectsLoader({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const { search, status, page } =
    await loadDashboardSearchParams(searchParams);
  const [stats, catalog, activities] = await Promise.all([
    getDashboardStats(user.id),
    getDashboardCatalog({ userId: user.id, search, status, page }),
    getDashboardActivities(user.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <ActiveProjectsList
        initial={{
          stats,
          catalog,
          activities,
          walletBalance: stats.walletBalance,
        }}
      />
    </div>
  );
}

export default function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
          <ProjectsListSkeleton />
        </div>
      }
    >
      <ProjectsLoader searchParams={searchParams} />
    </Suspense>
  );
}
