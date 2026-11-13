import { requireUser } from "@/lib/auth-helpers";
import { getOnboardingState } from "@/lib/onboarding";
import { OnboardingWizard } from "./wizard";

export const instant = false;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const state = await getOnboardingState(user.id);
  const sp = (await searchParams) ?? {};
  const rawStep = Array.isArray(sp["step"]) ? sp["step"][0] : sp["step"];
  const requested = rawStep === "2" || rawStep === "3" ? Number(rawStep) : null;
  const gap = state.gap ?? 1;
  const initialStep = requested && requested > gap ? gap : (requested ?? gap);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10 sm:px-6">
        <OnboardingWizard
          initialStep={initialStep as 1 | 2 | 3}
          initialStudent={state.student}
          initialAcademic={state.academic}
        />
      </div>
    </div>
  );
}
