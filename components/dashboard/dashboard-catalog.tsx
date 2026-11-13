"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import * as React from "react";
import {
  archiveProject,
  duplicateProject,
  unarchiveProject,
} from "@/app/dashboard/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty } from "@/components/ui/empty";
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

export function DashboardStatsHeader({ stats }: { stats: DashboardStats }) {
  const cards = [
    { label: "Active projects", value: String(stats.totalActive) },
    { label: "Credits", value: `${stats.walletBalance}` },
    { label: "Overall progress", value: `${stats.overallProgress}%` },
    {
      label: "In progress",
      value: String(stats.countsByStatus.IN_PROGRESS ?? 0),
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader>
            <CardDescription>{c.label}</CardDescription>
            <CardTitle className="font-serif text-2xl">{c.value}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
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
          {activities.map((a) => (
            <li key={a.id} className="flex flex-col gap-0.5 text-sm">
              <Link
                href={`/dashboard/projects/${a.projectId}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {a.projectTitle}
              </Link>
              <span className="text-muted-foreground">{a.description}</span>
              <time className="text-xs text-muted-foreground">
                {new Date(a.createdAt).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

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
  const [busy, setBusy] = React.useState(false);

  async function run(
    fn: () => Promise<{ ok: boolean; error?: string; title?: string }>,
    messages: { ok: string; fail: string },
  ) {
    setBusy(true);
    try {
      const result = await fn();
      if (!result.ok) {
        toast.error(messages.fail);
        return;
      }
      toast.success(messages.ok);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard", "projects"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "activity"] }),
      ]);
      onChanged();
    } catch {
      toast.error(messages.fail);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <Link
              href={`/dashboard/projects/${project.id}`}
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
                  <DropdownMenuItem
                    onClick={() =>
                      run(() => duplicateProject({ projectId: project.id }), {
                        ok: "Project duplicated. Find the copy at the top of the list.",
                        fail: "Could not duplicate this project.",
                      })
                    }
                  >
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      run(() => archiveProject({ projectId: project.id }), {
                        ok: "Project archived.",
                        fail: "Could not archive this project.",
                      })
                    }
                  >
                    Archive
                  </DropdownMenuItem>
                </>
              )}
              {archived && (
                <DropdownMenuItem
                  onClick={() =>
                    run(() => unarchiveProject({ projectId: project.id }), {
                      ok: "Project restored with its prior status.",
                      fail: "Could not restore this project.",
                    })
                  }
                >
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

function useDebounced(value: string, ms = 300) {
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
  const debouncedSearch = useDebounced(search ?? "");
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
      pending={query.isPending}
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
  const debouncedSearch = useDebounced(search ?? "");
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
      pending={query.isPending}
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
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by title or programme"
          aria-label="Search projects"
          className="sm:max-w-sm"
        />
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

      {pending && <CatalogSkeleton />}
      {error && (
        <Card>
          <CardContent className="flex flex-col items-start gap-2 py-6">
            <p className="text-sm">Could not load projects. Try again.</p>
            <Button variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}
      {!pending && !error && catalog.projects.length === 0 && (
        <Empty>
          {search || (!archived && status !== "all") ? (
            <>
              <p className="text-sm text-muted-foreground">
                No projects match these filters.
              </p>
              <Button variant="outline" onClick={onClear}>
                Clear filters
              </Button>
            </>
          ) : archived ? (
            <>
              <p className="text-sm text-muted-foreground">
                Nothing archived yet. Archived projects rest here.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground"
              >
                Back to projects
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                You have no projects yet. Create your first report to get
                started.
              </p>
              <Link
                href="/dashboard/new"
                className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground"
              >
                Start a project
              </Link>
            </>
          )}
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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
    </div>
  );
}
