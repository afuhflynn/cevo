import { FileTextIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import {
  InstitutionTabs,
  TemplateCard,
} from "@/components/dashboard/templates-browser";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth-helpers";
import {
  listTemplateInstitutions,
  listVisibleTemplates,
} from "@/lib/dashboard-templates";
import { loadTemplatesSearchParams } from "@/lib/search-params";

export const instant = false;

async function TemplatesLoader({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireUser();
  const { search, institution } = await loadTemplatesSearchParams(searchParams);
  const [templates, { institutions, otherCount }] = await Promise.all([
    listVisibleTemplates({ search, institutionId: institution }),
    listTemplateInstitutions(),
  ]);

  const tabs = [
    { value: "all", label: "All" },
    ...institutions.map((i) => ({ value: i.id, label: i.name })),
    ...(otherCount > 0 ? [{ value: "other", label: "Other" }] : []),
  ];
  const safeInstitution = tabs.some((t) => t.value === institution)
    ? institution
    : "all";
  const visible =
    safeInstitution === "all"
      ? templates
      : await listVisibleTemplates({ search, institutionId: safeInstitution });

  const hrefFor = (value: string) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (value !== "all") params.set("institution", value);
    const qs = params.toString();
    return qs ? `/dashboard/templates?${qs}` : "/dashboard/templates";
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <search aria-label="Search templates">
        <form
          action="/dashboard/templates"
          className="flex items-center gap-2 sm:gap-3"
        >
          {safeInstitution !== "all" && (
            <input type="hidden" name="institution" value={safeInstitution} />
          )}
          <div className="relative min-w-0 flex-1">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              name="search"
              defaultValue={search}
              placeholder="Search templates..."
              aria-label="Search templates"
              className="h-11 rounded-xl border-border/60 bg-muted/50 pr-4 pl-10"
            />
          </div>
        </form>
      </search>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Institutional Templates
      </h1>

      <InstitutionTabs tabs={tabs} active={safeInstitution} hrefFor={hrefFor} />

      <p className="sr-only" aria-live="polite">
        {visible.length === 0
          ? "No templates to show"
          : `${visible.length} template${visible.length === 1 ? "" : "s"}`}
      </p>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card px-6 py-12 text-center">
          <span
            className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <FileTextIcon className="size-6" />
          </span>
          <p className="text-lg font-bold">No templates match</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Try a shorter search or pick another institution. New templates
            appear here once published.
          </p>
          <Link
            href="/dashboard/templates"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Clear search and filters
          </Link>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-8 w-56" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {["a", "b", "c"].map((id) => (
              <Skeleton key={id} className="h-64 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      }
    >
      <TemplatesLoader searchParams={searchParams} />
    </Suspense>
  );
}
