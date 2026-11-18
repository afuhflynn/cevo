import { formatDistanceToNow } from "date-fns";
import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth-helpers";
import { getDashboardCatalog, getDashboardStats } from "@/lib/dashboard";
import { getOnboardingState } from "@/lib/onboarding";

export const instant = false;

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
  PLANNING: { label: "Planning", className: "bg-primary/10 text-primary" },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-primary/10 text-primary",
  },
  READY_FOR_REVIEW: {
    label: "Ready for review",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
};

function statusBadge(status: string) {
  const pretty = status
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return (
    STATUS_STYLES[status] ?? {
      label: pretty,
      className: "bg-secondary text-secondary-foreground",
    }
  );
}

function editedAgo(iso: string): string {
  try {
    return `Last edited ${formatDistanceToNow(new Date(iso), { addSuffix: true })}`;
  } catch {
    return "Last edited recently";
  }
}

export default async function DashboardHomePage() {
  const user = await requireUser();
  const [stats, catalog, state] = await Promise.all([
    getDashboardStats(user.id),
    getDashboardCatalog({ userId: user.id, page: 1 }),
    getOnboardingState(user.id),
  ]);
  const firstName = state.student?.firstName?.trim();
  const recent = catalog.projects.slice(0, 3);
  const completed = stats.countsByStatus.COMPLETED ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            Welcome back{firstName ? `, ${firstName}` : ""} 👋
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Let&rsquo;s make your next project exceptional.
          </p>
        </div>
        <div
          aria-hidden="true"
          className="relative hidden justify-self-end lg:block"
        >
          <div className="absolute inset-x-4 top-4 bottom-0 rounded-full bg-primary/10 blur-2xl" />
          <Image
            src="/dashboard-student.png"
            alt=""
            width={646}
            height={386}
            priority
            className="relative h-auto w-56 object-contain"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1 rounded-2xl bg-primary p-6 text-white shadow-[0_24px_50px_-24px_var(--color-primary)]">
          <p className="text-sm font-medium text-white/80">Available Credits</p>
          <p className="text-3xl font-extrabold tracking-tight">
            {stats.walletBalance.toLocaleString("en-US")}
          </p>
          <Link href="/dashboard/billing" className="mt-4">
            <Button className="h-10 rounded-lg bg-white px-5 text-sm font-semibold text-primary hover:bg-white/90">
              Buy Credits
            </Button>
          </Link>
        </div>
        <div className="flex flex-col justify-center gap-1 rounded-2xl border border-border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Projects</p>
          <p className="text-3xl font-extrabold tracking-tight">
            {stats.totalActive}
          </p>
        </div>
        <div className="flex flex-col justify-center gap-1 rounded-2xl border border-border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Completed</p>
          <p className="text-3xl font-extrabold tracking-tight">{completed}</p>
        </div>
      </div>

      <section aria-labelledby="recent-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="recent-heading"
            className="text-lg font-bold tracking-tight sm:text-xl"
          >
            Your Recent Projects
          </h2>
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            View all
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <p className="font-medium">No projects yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Brief your first project and Cevo will turn it into chapters,
              research, and an exportable report.
            </p>
            <Link href="/dashboard/new">
              <Button className="h-11 rounded-xl px-6 text-[15px]">
                Start a project
              </Button>
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {recent.map((p) => {
              const badge = statusBadge(p.status);
              return (
                <li key={p.id}>
                  <Link
                    href={`/dashboard/projects/${p.id}`}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-4 transition-colors hover:border-primary/40 sm:px-5"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-base font-bold text-primary"
                    >
                      {p.title.trim().charAt(0).toUpperCase() || "P"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">
                      {p.title}
                    </span>
                    <Badge className={`shrink-0 ${badge.className}`}>
                      {badge.label}
                    </Badge>
                    <span className="hidden shrink-0 text-xs text-muted-foreground md:block">
                      {editedAgo(p.updatedAt)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
