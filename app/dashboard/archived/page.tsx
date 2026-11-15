import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import {
  CatalogSkeleton,
  DashboardCatalogClient,
} from "@/components/dashboard/dashboard-catalog";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth-helpers";
import { getDashboardCatalog, getDashboardStats } from "@/lib/dashboard";
import { loadArchivedSearchParams } from "@/lib/search-params";

async function ArchivedLoader({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const { search, page } = await loadArchivedSearchParams(searchParams);
  const [stats, catalog] = await Promise.all([
    getDashboardStats(user.id),
    getDashboardCatalog({
      userId: user.id,
      search,
      status: "all",
      page,
      archived: true,
    }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">
            Archived projects
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tidied work rests here. Restoring brings back the prior status
            exactly. Nothing here is ever deleted.
          </p>
        </div>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ArrowLeftIcon aria-hidden="true" />
          Back to projects
        </Link>
      </div>
      <DashboardCatalogClient
        initial={{
          stats,
          catalog,
          activities: [],
          walletBalance: stats.walletBalance,
        }}
        archived
      />
    </div>
  );
}

export default function ArchivedPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
          <CatalogSkeleton />
        </div>
      }
    >
      <ArchivedLoader searchParams={searchParams} />
    </Suspense>
  );
}
