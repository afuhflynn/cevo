"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActivityIcon,
  ArchiveIcon,
  CheckCircle2Icon,
  CopyIcon,
  FolderKanbanIcon,
  GaugeIcon,
  InboxIcon,
  RotateCcwIcon,
  SearchIcon,
  SparklesIcon,
  TriangleAlertIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import * as React from "react";
import {
  archiveProject,
  duplicateProject,
  unarchiveProject,
} from "@/app/dashboard/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import type {
  DashboardActivity,
  DashboardCatalog,
  DashboardStats,
} from "@/lib/dashboard";
import {
  archivedSearchParams,
  dashboardSearchParams,
} from "@/lib/search-params";

type CatalogResponse = {
  stats: DashboardStats;
  catalog: DashboardCatalog;
  activities: DashboardActivity[];
  walletBalance: number;
};

async function fetchCatalog(params: {
  search: string;
  status: string;
  page: number;
  archived: boolean;
}): Promise<CatalogResponse> {
  const sp = new URLSearchParams({
    search: params.search,
    status: params.status,
    page: String(params.page),
    archived: String(params.archived),
  });
  const res = await fetch(`/api/dashboard/projects?${sp.toString()}`);
  if (!res.ok) throw new Error("Failed to load projects");
  return (await res.json()) as CatalogResponse;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PLANNING", label: "Planning" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "READY_FOR_REVIEW", label: "Ready for review" },
  { value: "COMPLETED", label: "Completed" },
];

function statusLabel(status: string) {
  return (
    STATUS_OPTIONS.find((o) => o.value === status)?.label ??
    status.toLowerCase()
  );
}

const ACTIVITY_META: Record<
  string,
  { label: string; Icon: typeof ActivityIcon }
> = {
  "project.created": { label: "Created", Icon: SparklesIcon },
  "project.duplicated": { label: "Duplicated", Icon: CopyIcon },
  "project.archived": { label: "Archived", Icon: ArchiveIcon },
  "project.unarchived": { label: "Restored", Icon: RotateCcwIcon },
  "project.completed": { label: "Completed", Icon: CheckCircle2Icon },
};

function activityMeta(action: string) {
  return ACTIVITY_META[action] ?? { label: "Updated", Icon: ActivityIcon };
}

export function DashboardStatsHeader({
  stats,
  activityCount,
}: {
  stats: DashboardStats;
  activityCount?: number;
}) {
  const recent = activityCount ?? 0;
  const low = stats.walletBalance <= 20;
  const cards = [
    {
      label: "Active projects",
      value: String(stats.totalActive),
      hint: "Not archived",
      Icon: FolderKanbanIcon,
    },
    {
      label: "Credit balance",
      value: String(stats.walletBalance),
      hint: low ? "Low balance, top up soon" : "Ready to spend",
      Icon: WalletIcon,
      action: (
        <Link
          href="/dashboard/billing"
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          Buy credits
        </Link>
      ),
    },
    {
      label: "Recent activity",
      value: String(recent),
      hint: "Last 10 events",
      Icon: ActivityIcon,
    },
    {
      label: "Completion",
      value: `${stats.overallProgress}%`,
      hint: "Mean across active",
      Icon: GaugeIcon,
    },
  ];
  return (
    <section
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="Dashboard statistics"
    >
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="gap-2">
            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <c.Icon className="size-4" aria-hidden="true" />
              {c.label}
            </span>
            <CardTitle className="font-serif text-2xl">{c.value}</CardTitle>
            <CardDescription className="flex items-center justify-between gap-2 text-xs">
              <span>{c.hint}</span>
              {c.action}
            </CardDescription>
          </CardHeader>
        </Card>
      ))}
    </section>
  );
}

export function StatsSkeleton() {
  return (
    <output
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="Loading statistics"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list never reorders
        <Card key={`stats-skeleton-${i}`}>
          <CardHeader className="gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </CardHeader>
        </Card>
      ))}
    </output>
  );
}

export function CreditBalanceCard({ balance }: { balance: number }) {
  const low = balance <= 20;
  return (
    <Card>
      <CardHeader className="gap-1.5">
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <WalletIcon className="size-4" aria-hidden="true" />
          Credits
        </span>
        <CardTitle className="font-serif text-2xl">{balance}</CardTitle>
        <CardDescription className="text-xs">
          {low
            ? "Balance is low. Top up to keep research running."
            : "Spend on research, drafting, and review."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          href="/dashboard/billing"
          className={buttonVariants({ size: "sm", className: "w-full" })}
        >
          Buy credits
        </Link>
      </CardContent>
    </Card>
  );
}

export function MilestonesFeed({
  activities,
}: {
  activities: DashboardActivity[];
}) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>
            Milestones from your active projects will appear here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>
          Latest milestones across active projects.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {activities.map((a) => {
            const meta = activityMeta(a.action);
            return (
              <li key={a.id} className="flex gap-2.5 text-sm">
                <span
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                  aria-hidden="true"
                >
                  <meta.Icon className="size-3.5" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <Link
                      href={`/dashboard/projects/${a.projectId}`}
                      className="truncate font-medium underline-offset-4 hover:underline"
                    >
                      {a.projectTitle}
                    </Link>
                    <Badge variant="secondary" className="text-[11px]">
                      {meta.label}
                    </Badge>
                  </span>
                  <span className="text-muted-foreground">{a.description}</span>
                  <time className="text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString()}
                  </time>
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

type ConfirmKind = "duplicate" | "archive" | "restore" | null;

function ProjectCard({
  project,
  archived,
  onChanged,
}: {
  project: CatalogResponse["catalog"]["projects"][number];
  archived: boolean;
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
      : confirm === "archive"
        ? {
            title: `Archive "${project.title}"?`,
            body: "It leaves the active list and rests in Archived with its prior status kept. Restore any time, nothing is deleted.",
            confirmLabel: "Archive project",
          }
        : {
            title: `Restore "${project.title}"?`,
            body: "It returns to the active list with its prior status exactly as archived.",
            confirmLabel: "Restore project",
          };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-1">
              <Link
                href={
                  archived
                    ? `/dashboard/projects/${project.id}`
                    : `/dashboard/projects/${project.id}/workspace`
                }
                className="truncate font-medium underline-offset-4 hover:underline"
              >
                {project.title}
              </Link>
              <CardDescription className="truncate">
                {project.programmeName ?? "No programme"} ·{" "}
                {project.doneTasks + project.openTasks} tasks
                {project.isApproved ? " · Approved" : ""}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="sm" disabled={busy} />}
              >
                Actions
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {!archived && (
                  <>
                    <DropdownMenuItem onClick={() => setConfirm("duplicate")}>
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setConfirm("archive")}>
                      Archive
                    </DropdownMenuItem>
                  </>
                )}
                {archived && (
                  <DropdownMenuItem onClick={() => setConfirm("restore")}>
                    Restore
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="secondary">{statusLabel(project.status)}</Badge>
            {project.isApproved && <Badge>Approved</Badge>}
            {project.submissionDeadline && (
              <span className="text-xs text-muted-foreground">
                Due {new Date(project.submissionDeadline).toLocaleDateString()}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Progress value={project.progressPercent} />
          <span className="text-xs text-muted-foreground">
            {project.progressPercent}% · {project.openTasks} open /{" "}
            {project.doneTasks} done
          </span>
        </CardContent>
      </Card>

      <Dialog
        open={confirm !== null}
        onOpenChange={(o) => {
          if (!o && !busy) setConfirm(null);
        }}
      >
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{dialogCopy.title}</DialogTitle>
            <DialogDescription>{dialogCopy.body}</DialogDescription>
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
                if (confirm === "restore")
                  void run(() => unarchiveProject({ projectId: project.id }), {
                    ok: "Project restored with its prior status.",
                    fail: "Could not restore this project.",
                  });
              }}
            >
              {busy && <Spinner aria-hidden="true" />}
              {dialogCopy.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DashboardCatalogClient({
  initial,
  archived,
}: {
  initial: CatalogResponse;
  archived: boolean;
}) {
  if (archived) return <ArchivedCatalog initial={initial} />;
  return <ActiveCatalog initial={initial} />;
}

function useDebounced(value: string, ms = 200) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function ActiveCatalog({ initial }: { initial: CatalogResponse }) {
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

  return (
    <CatalogView
      catalog={(query.data ?? initial).catalog}
      search={safeSearch}
      status={safeStatus}
      archived={false}
      pending={query.isPending && !query.data}
      error={query.isError}
      onRetry={() => void query.refetch()}
      onSearch={(next) => void setFilters({ search: next, page: 1 })}
      onStatus={(v) => void setFilters({ status: v ?? "all", page: 1 })}
      onClear={() => void setFilters({ search: "", status: "all", page: 1 })}
      onPage={(p) => void setFilters({ page: p })}
    />
  );
}

function ArchivedCatalog({ initial }: { initial: CatalogResponse }) {
  const [{ search, page }, setFilters] = useQueryStates(archivedSearchParams, {
    history: "push",
    shallow: false,
  });
  const debouncedSearch = useDebounced(search ?? "", 200);
  const safeSearch = search ?? "";
  const safePage = page ?? 1;

  const query = useQuery({
    queryKey: [
      "dashboard",
      "projects",
      {
        search: debouncedSearch,
        status: "all",
        page: safePage,
        archived: true,
      },
    ],
    queryFn: () =>
      fetchCatalog({
        search: debouncedSearch,
        status: "all",
        page: safePage,
        archived: true,
      }),
    initialData: debouncedSearch === safeSearch ? initial : undefined,
    placeholderData: (prev) => prev,
  });

  return (
    <CatalogView
      catalog={(query.data ?? initial).catalog}
      search={safeSearch}
      status="all"
      archived
      pending={query.isPending && !query.data}
      error={query.isError}
      onRetry={() => void query.refetch()}
      onSearch={(next) => void setFilters({ search: next, page: 1 })}
      onStatus={() => {}}
      onClear={() => void setFilters({ search: "", page: 1 })}
      onPage={(p) => void setFilters({ page: p })}
    />
  );
}

function CatalogView({
  catalog,
  search,
  status,
  archived,
  pending,
  error,
  onRetry,
  onSearch,
  onStatus,
  onClear,
  onPage,
}: {
  catalog: CatalogResponse["catalog"];
  search: string;
  status: string;
  archived: boolean;
  pending: boolean;
  error: boolean;
  onRetry: () => void;
  onSearch: (next: string) => void;
  onStatus: (v: string | null) => void;
  onClear: () => void;
  onPage: (p: number) => void;
}) {
  const queryClient = useQueryClient();
  async function refresh() {
    await queryClient.invalidateQueries({
      queryKey: ["dashboard", "projects"],
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-sm sm:flex-1">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by title or programme"
            aria-label="Search projects"
            className="pl-8"
          />
        </div>
        {!archived && (
          <Select value={status} onValueChange={onStatus}>
            <SelectTrigger className="sm:w-52" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {(search !== "" || (!archived && status !== "all")) && (
          <Button variant="ghost" onClick={onClear}>
            Clear filters
          </Button>
        )}
      </div>

      {!pending && !error && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {catalog.totalCount === 0
            ? "No projects to show"
            : `${catalog.totalCount} project${catalog.totalCount === 1 ? "" : "s"} · Page ${catalog.page} of ${catalog.totalPages}`}
        </p>
      )}

      {pending && <CatalogSkeleton />}
      {error && (
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertTitle>Could not load projects</AlertTitle>
          <AlertDescription>
            Check your connection and try again. Your work is safe.
          </AlertDescription>
          <div className="mt-2">
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        </Alert>
      )}
      {!pending && !error && catalog.projects.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <InboxIcon aria-hidden="true" />
            </EmptyMedia>
            {search || (!archived && status !== "all") ? (
              <>
                <EmptyTitle>No matches for these filters</EmptyTitle>
                <EmptyDescription>
                  Try a shorter search or clear the filters to see everything.
                </EmptyDescription>
              </>
            ) : archived ? (
              <>
                <EmptyTitle>Nothing archived yet</EmptyTitle>
                <EmptyDescription>
                  Tidy finished work here. Restoring brings back the prior
                  status exactly.
                </EmptyDescription>
              </>
            ) : (
              <>
                <EmptyTitle>No projects yet</EmptyTitle>
                <EmptyDescription>
                  Create your first report to get started. The guided briefing
                  turns an idea into an approved brief.
                </EmptyDescription>
              </>
            )}
          </EmptyHeader>
          <div className="flex gap-2">
            {search || (!archived && status !== "all") ? (
              <Button variant="outline" onClick={onClear}>
                Clear filters
              </Button>
            ) : archived ? (
              <Link href="/dashboard" className={buttonVariants()}>
                Back to projects
              </Link>
            ) : (
              <Link href="/dashboard/new" className={buttonVariants()}>
                Start a project
              </Link>
            )}
          </div>
        </Empty>
      )}

      {!pending && !error && catalog.projects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {catalog.projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              archived={archived}
              onChanged={() => void refresh()}
            />
          ))}
        </div>
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
                  if (catalog.page > 1) onPage(catalog.page - 1);
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
                    onPage(catalog.page + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

export function CatalogSkeleton() {
  return (
    <output
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      aria-label="Loading projects"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list never reorders
        <Card key={`skeleton-${i}`}>
          <CardHeader className="flex flex-col gap-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-4 w-1/3" />
          </CardContent>
        </Card>
      ))}
    </output>
  );
}

export function DetailSkeleton() {
  return (
    <output className="flex flex-col gap-4" aria-label="Loading project">
      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-32" />
          </div>
        </CardContent>
      </Card>
    </output>
  );
}
