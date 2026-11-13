import { notFound, redirect } from "next/navigation";
import { WizardClient } from "@/components/wizard/wizard-client";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";

export const instant = false;

export default async function WizardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const session = await db.orm.public.WizardSession.where({ id }).first();
  if (!session || session.userId !== user.id) {
    notFound();
  }
  if (["APPROVED"].includes(session.status) && session.projectId) {
    redirect(`/dashboard/projects/${session.projectId}`);
  }
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <WizardClient sessionId={session.id} />
    </div>
  );
}
