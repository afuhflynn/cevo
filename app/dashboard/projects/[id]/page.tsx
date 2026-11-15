import { ArrowLeftIcon, FolderOpenIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DetailSkeleton } from "@/components/dashboard/dashboard-catalog";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PLANNING: "Planning",
  IN_PROGRESS: "In progress",
  READY_FOR_REVIEW: "Ready for review",
  COMPLETED: "Completed",
};

async function ProjectDetail({ id }: { id: string }) {
  const user = await requireUser();
  const project = await db.orm.public.Project.where({ id }).first();
  if (!project || project.userId !== user.id || project.isArchived) notFound();

  const tasks = await db.orm.public.ProjectTask.select("isCompleted")
    .where((t) => t.projectId.eq(project.id))
    .limit(500)
    .all();
  const done = tasks.filter((t) => t.isCompleted).length;
  const open = tasks.length - done;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {STATUS_LABEL[project.status] ?? project.status.toLowerCase()}
            </Badge>
            {done + open > 0 && (
              <span className="text-xs text-muted-foreground">
                {open} open · {done} done
              </span>
            )}
          </div>
          <CardTitle className="font-serif text-2xl text-balance">
            {project.title}
          </CardTitle>
          <CardDescription>
            {project.programmeName ?? "No programme"} · Updated{" "}
            {new Date(project.updatedAt).toLocaleDateString()} ·{" "}
            {project.progressPercent ?? 0}% complete
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Progress value={project.progressPercent ?? 0} />
          <p className="text-sm text-muted-foreground">
            {open} task{open === 1 ? "" : "s"} open, {done} done. Open the
            workspace to continue writing where you stopped.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/dashboard/projects/${project.id}/workspace`}
              className={buttonVariants()}
            >
              <FolderOpenIcon aria-hidden="true" />
              Open workspace
            </Link>
            <Link
              href="/dashboard"
              className={buttonVariants({ variant: "outline" })}
            >
              <ArrowLeftIcon aria-hidden="true" />
              Back to dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
          <DetailSkeleton />
        </div>
      }
    >
      <ProjectDetail id={id} />
    </Suspense>
  );
}
