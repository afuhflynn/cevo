import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import { WorkspaceClient } from "@/components/workspace/workspace-client";

export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const project = await db.orm.public.Project.where({ id }).first();
  if (!project) notFound();
  const isOwner = project.userId === user.id;
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  if (!isOwner && !isAdmin) notFound();

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-4">
      <header className="cevo-ws-head">
        <div>
          <p className="cevo-muted">Document workspace</p>
          <h1 className="font-serif text-2xl">{project.title}</h1>
        </div>
        <span className="cevo-save cevo-save-saved">{isOwner ? "Owner" : "Read only"}</span>
      </header>
      <Suspense fallback={<p className="cevo-muted">Loading workspace…</p>}>
        <WorkspaceClient projectId={id} initialReadOnly={!isOwner} />
      </Suspense>
    </div>
  );
}
