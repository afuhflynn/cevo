import { Suspense } from "react";
import { ResearchBrowser } from "@/components/dashboard/research-browser";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth-helpers";
import { getResearchLibrarySummary } from "@/lib/research-library";

export const instant = false;

async function ResearchLoader() {
  const user = await requireUser();
  const summary = await getResearchLibrarySummary(user.id);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <ResearchBrowser initialSummary={summary} />
    </div>
  );
}

export default function ResearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      }
    >
      <ResearchLoader />
    </Suspense>
  );
}
