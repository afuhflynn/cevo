import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";

export const instant = false;

export default async function ProjectWorkspacePlaceholder({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const project = await db.orm.public.Project.where({ id }).first();
  if (!project || project.userId !== user.id) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">{project.title}</CardTitle>
          <CardDescription>
            Status {project.status.toLowerCase()} · {project.progressPercent}%
            complete. The document workspace arrives with the next slice; your
            project row, brief, and tasks are already stored.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Link
            href="/dashboard"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground"
          >
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
