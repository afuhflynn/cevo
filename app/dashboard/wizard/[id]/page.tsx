import { notFound, redirect } from "next/navigation";
import { WizardClient } from "@/components/wizard/wizard-client";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";

export const instant = false;

export default async function WizardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const rawStepValue = sp.step;
  const rawStep = Array.isArray(rawStepValue)
    ? rawStepValue[0]
    : rawStepValue;
  const parsed = Number.parseInt(rawStep ?? "", 10);
  const initialStep =
    Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : undefined;
  const session = await db.orm.public.WizardSession.where({ id }).first();
  if (!session || session.userId !== user.id) {
    notFound();
  }
  if (["APPROVED"].includes(session.status) && session.projectId) {
    redirect(`/dashboard/projects/${session.projectId}`);
  }
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <WizardClient sessionId={session.id} initialStep={initialStep} />
    </div>
  );
}
