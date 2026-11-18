"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArchiveIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  CopyIcon,
  EllipsisVerticalIcon,
  FileTextIcon,
  InboxIcon,
  ListFilterIcon,
  PlusIcon,
  SearchIcon,
  TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import * as React from "react";
import { archiveProject, duplicateProject } from "@/app/dashboard/actions";
import {
  type CatalogResponse,
  fetchCatalog,
} from "@/components/dashboard/dashboard-catalog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { dashboardSearchParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";

type CatalogProject = CatalogResponse["catalog"]["projects"][number];

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "PLANNING", label: "Planning" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "READY_FOR_REVIEW", label: "Ready for Review" },
  { value: "COMPLETED", label: "Completed" },
] as const;

const STATUS_PILL: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PLANNING: "bg-accent text-accent-foreground",
  IN_PROGRESS: "bg-primary/10 text-primary",
  READY_FOR_REVIEW: "bg-secondary text-secondary-foreground",
  COMPLETED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

function statusPill(status: string) {
  return STATUS_PILL[status] ?? "bg-muted text-muted-foreground";
}

function statusLabel(value: string) {
  return STATUS_TABS.find((t) => t.value === value)?.label ?? "All";
}

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "recently";
  const seconds = Math.round((then - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const divisions = [
    { amount: 60, name: "second" },
    { amount: 60, name: "minute" },
    { amount: 24, name: "hour" },
    { amount: 7, name: "day" },
    { amount: 4.34524, name: "week" },
    { amount: 12, name: "month" },
    { amount: Number.POSITIVE_INFINITY, name: "year" },
  ] as const;
  let duration = seconds;
  for (const { amount, name } of divisions) {
    if (Math.abs(duration) < amount) {
      return rtf.format(Math.round(duration), name);
    }
    duration /= amount;
  }
  return rtf.format(Math.round(duration), "year");
}

function useDebounced(value: string, ms = 200) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

type ConfirmKind = "duplicate" | "archive" | null;

function ProjectRowMenu({
  project,
  onChanged,
}: {
  project: CatalogProject;
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = React.useState<ConfirmKind>(null);
  const [busy, setBusy] = React.useState(false);

  async function run(
    fn: () => Promise<{ ok: boolean; error?: string; title?: string }>,
    messages: { ok: string; fail: string },
  ) {
    setBusy(true);
    try {
      const result = await fn();
      if (!result.ok) {
        toast.error(messages.fail, { timeout: 4000 });
        return;
      }
      toast.success(messages.ok, { timeout: 4000 });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard", "projects"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "activity"] }),
      ]);
      onChanged();
    } catch {
      toast.error(messages.fail, { timeout: 4000 });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const dialogCopy =
    confirm === "duplicate"
      ? {
          title: `Duplicate "${project.title}"?`,
          body: "A full copy is made with its own brief, chapters, and tasks. The copy is named Copy of title and capped at 200 characters.",
          confirmLabel: "Duplicate project",
        }
      : {
          title: `Restore "${project.title}"?`,
          body: "It returns to the active list with its prior status exactly as archived.",
          confirmLabel: "Restore project",
        };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={busy}
              aria-label={`Actions for ${project.title}`}
            >
              <EllipsisVerticalIcon aria-hidden="true" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            render={
              <Link href={`/dashboard/projects/${project.id}/workspace`} />
            }
          >
            <ArrowRightIcon aria-hidden="true" />
            Open
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirm("duplicate")}>
            <CopyIcon aria-hidden="true" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirm("archive")}>
            <ArchiveIcon aria-hidden="true" />
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={confirm !== null}
        onOpenChange={(o) => {
          if (!o && !busy) setConfirm(null);
        }}
      >
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {confirm === "archive"
                ? `Archive "${project.title}"?`
                : dialogCopy.title}
            </DialogTitle>
            <DialogDescription>
              {confirm === "archive"
                ? "It leaves the active list and rests in Archived with its prior status kept. Restore any time, nothing is deleted."
                : dialogCopy.body}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirm(null)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              variant={confirm === "archive" ? "destructive" : "default"}
              disabled={busy}
              aria-busy={busy}
              onClick={() => {
                if (confirm === "duplicate")
                  void run(() => duplicateProject({ projectId: project.id }), {
                    ok: "Project duplicated. Find the copy at the top of the list.",
                    fail: "Could not duplicate this project.",
                  });
                if (confirm === "archive")
                  void run(() => archiveProject({ projectId: project.id }), {
                    ok: "Project archived.",
                    fail: "Could not archive this project.",
                  });
              }}
            >
              {busy && <Spinner aria-hidden="true" />}
              {confirm === "archive"
                ? "Archive project"
                : dialogCopy.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProjectRow({
  project,
  onChanged,
}: {
  project: CatalogProject;
  onChanged: () => void;
}) {
  const complete = project.progressPercent >= 100;
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-4 sm:px-5 md:grid-cols-[32px_minmax(0,1fr)_150px_200px_100px_28px] md:gap-x-4">
      <span
        className="flex size-8 items-center justify-center rounded-lg border border-border/70 bg-muted/50 text-muted-foreground"
        aria-hidden="true"
      >
        <FileTextIcon className="size-4" />
      </span>
      <Link
        href={`/dashboard/projects/${project.id}/workspace`}
        className="truncate text-[15px] font-medium underline-offset-4 hover:underline"
      >
        {project.title}
      </Link>
      <span className="justify-self-end md:col-start-6 md:row-start-1">
        <ProjectRowMenu project={project} onChanged={onChanged} />
      </span>
      <div className="col-span-3 mt-3 flex flex-col gap-2.5 md:mt-0 md:contents">
        <span className="flex items-center justify-between gap-3 md:justify-start">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
              statusPill(project.status),
            )}
          >
            {project.status === "COMPLETED" ? (
              <CheckCircle2Icon className="size-3.5" aria-hidden="true" />
            ) : (
              <span
                className="size-1.5 rounded-full bg-current"
                aria-hidden="true"
              />
            )}
            {statusLabel(project.status)}
          </span>
          <time
            dateTime={project.updatedAt}
            className="text-xs whitespace-nowrap text-muted-foreground tabular-nums md:hidden"
          >
            {timeAgo(project.updatedAt)}
          </time>
        </span>
        <span className="flex items-center gap-2 md:min-w-0">
          <Progress
            value={project.progressPercent}
            aria-label={`Progress ${project.progressPercent}%`}
            className={cn(
              "min-w-0 flex-1 [&_[data-slot=progress-track]]:h-1.5",
              complete && "[&_[data-slot=progress-indicator]]:bg-emerald-500",
            )}
          />
          <span
            className={cn(
              "w-10 shrink-0 text-right text-xs tabular-nums",
              complete
                ? "font-medium text-emerald-700"
                : "text-muted-foreground",
            )}
          >
            {project.progressPercent}%
          </span>
        </span>
        <time
          dateTime={project.updatedAt}
          className="hidden text-xs whitespace-nowrap text-muted-foreground tabular-nums md:block"
        >
          {timeAgo(project.updatedAt)}
        </time>
      </div>
    </li>
  );
}

export function ProjectsListSkeleton() {
  return (
    <output className="flex flex-col gap-4" aria-label="Loading projects">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 flex-1 rounded-xl" />
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-48" />
      <div className="overflow-hidden rounded-2xl border border-border/60">
        {["row-a", "row-b", "row-c", "row-d", "row-e"].map((id) => (
          <div
            key={id}
            className="flex items-center gap-3 border-b border-border/40 px-4 py-4 last:border-0 sm:px-5"
          >
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="hidden h-6 w-24 rounded-full md:block" />
            <Skeleton className="hidden h-1.5 w-40 rounded-full md:block" />
            <Skeleton className="hidden h-4 w-14 md:block" />
          </div>
        ))}
      </div>
    </output>
  );
}

export function ActiveProjectsList({ initial }: { initial: CatalogResponse }) {
  const [{ search, status, page }, setFilters] = useQueryStates(
    dashboardSearchParams,
    { history: "push", shallow: false },
  );
  const debouncedSearch = useDebounced(search ?? "", 200);
  const safeSearch = search ?? "";
  const safeStatus = status ?? "all";
  const safePage = page ?? 1;

  const query = useQuery({
    queryKey: [
      "dashboard",
      "projects",
      {
        search: debouncedSearch,
        status: safeStatus,
        page: safePage,
        archived: false,
      },
    ],
    queryFn: () =>
      fetchCatalog({
        search: debouncedSearch,
        status: safeStatus,
        page: safePage,
        archived: false,
      }),
    initialData: debouncedSearch === safeSearch ? initial : undefined,
    placeholderData: (prev) => prev,
  });

  const queryClient = useQueryClient();
  async function refresh() {
    await queryClient.invalidateQueries({
      queryKey: ["dashboard", "projects"],
    });
  }

  const catalog = (query.data ?? initial).catalog;
  const pending = query.isPending && !query.data;
  const error = query.isError;
  const filtered = safeSearch !== "" || safeStatus !== "all";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={safeSearch}
            onChange={(e) =>
              void setFilters({ search: e.target.value, page: 1 })
            }
            placeholder="Search projects..."
            aria-label="Search projects"
            className="h-11 rounded-xl border-border/60 bg-muted/50 pr-4 pl-10"
          />
        </div>
        <Link
          href="/dashboard/new"
          className={buttonVariants({
            className: "h-11 shrink-0 rounded-xl px-4 sm:px-5",
          })}
        >
          <span className="hidden sm:inline">Create Project</span>
          <span className="sm:hidden">Create</span>
          <PlusIcon aria-hidden="true" />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label="More actions"
                className="h-11 w-11 shrink-0 rounded-xl"
              >
                <EllipsisVerticalIcon aria-hidden="true" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href="/dashboard/archived" />}>
              <ArchiveIcon aria-hidden="true" />
              Archived projects
            </DropdownMenuItem>
            {filtered && (
              <DropdownMenuItem
                onClick={() =>
                  void setFilters({ search: "", status: "all", page: 1 })
                }
              >
                Clear filters
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        My Projects
      </h1>

      <div className="flex items-center gap-1">
        <div
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
          role="toolbar"
          aria-label="Filter by status"
        >
          {STATUS_TABS.map((t) => {
            const active = safeStatus === t.value;
            return (
              <button
                key={t.value}
                type="button"
                aria-pressed={active}
                onClick={() => void setFilters({ status: t.value, page: 1 })}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary/10 font-semibold text-primary"
                    : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label="Filter options"
                className="h-9 w-9 shrink-0 rounded-xl"
              >
                <ListFilterIcon aria-hidden="true" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" aria-label="Status filter">
            {STATUS_TABS.map((t) => (
              <DropdownMenuItem
                key={t.value}
                onClick={() => void setFilters({ status: t.value, page: 1 })}
              >
                {safeStatus === t.value ? (
                  <CheckCircle2Icon aria-hidden="true" />
                ) : (
                  <span className="size-4" aria-hidden="true" />
                )}
                {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="sr-only" aria-live="polite">
        {pending
          ? "Loading projects"
          : catalog.totalCount === 0
            ? "No projects to show"
            : `${catalog.totalCount} project${catalog.totalCount === 1 ? "" : "s"} · Page ${catalog.page} of ${catalog.totalPages}`}
      </p>

      {pending && <ProjectsListSkeleton />}
      {error && (
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertTitle>Could not load projects</AlertTitle>
          <AlertDescription>
            Check your connection and try again. Your work is safe.
          </AlertDescription>
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </div>
        </Alert>
      )}
      {!pending && !error && catalog.projects.length === 0 && (
        <Empty className="border border-border/60">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <InboxIcon aria-hidden="true" />
            </EmptyMedia>
            {filtered ? (
              <>
                <EmptyTitle>No matches for these filters</EmptyTitle>
                <EmptyDescription>
                  Try a shorter search or clear the filters to see everything.
                </EmptyDescription>
              </>
            ) : (
              <>
                <EmptyTitle>No projects yet</EmptyTitle>
                <EmptyDescription>
                  Create your first project to get started. The guided briefing
                  turns an idea into an approved brief.
                </EmptyDescription>
              </>
            )}
          </EmptyHeader>
          <div className="flex gap-2">
            {filtered ? (
              <Button
                variant="outline"
                onClick={() =>
                  void setFilters({ search: "", status: "all", page: 1 })
                }
              >
                Clear filters
              </Button>
            ) : (
              <Link href="/dashboard/new" className={buttonVariants()}>
                Start a project
              </Link>
            )}
          </div>
        </Empty>
      )}

      {!pending && !error && catalog.projects.length > 0 && (
        <section
          aria-label="Projects"
          className="overflow-hidden rounded-2xl border border-border/60 bg-card"
        >
          <div
            aria-hidden="true"
            className="hidden grid-cols-[32px_minmax(0,1fr)_150px_200px_100px_28px] gap-x-4 border-b border-border/60 px-4 py-3 text-xs font-medium text-muted-foreground sm:px-5 md:grid"
          >
            <span>Project</span>
            <span />
            <span>Status</span>
            <span>Progress</span>
            <span>Updated</span>
            <span />
          </div>
          <ul className="divide-y divide-border/40">
            {catalog.projects.map((p) => (
              <ProjectRow
                key={p.id}
                project={p}
                onChanged={() => void refresh()}
              />
            ))}
          </ul>
        </section>
      )}

      {catalog.totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={catalog.page <= 1}
                onClick={(e) => {
                  e.preventDefault();
                  if (catalog.page > 1)
                    void setFilters({ page: catalog.page - 1 });
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-3 text-sm text-muted-foreground">
                Page {catalog.page} of {catalog.totalPages} ·{" "}
                {catalog.totalCount} projects
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={catalog.page >= catalog.totalPages}
                onClick={(e) => {
                  e.preventDefault();
                  if (catalog.page < catalog.totalPages)
                    void setFilters({ page: catalog.page + 1 });
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
