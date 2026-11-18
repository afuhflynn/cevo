import Image from "next/image";
import { redirect } from "next/navigation";
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
  if (state.completed) redirect("/dashboard");
  const sp = (await searchParams) ?? {};
  const rawStep = Array.isArray(sp["step"]) ? sp["step"][0] : sp["step"];
  const requested = rawStep === "2" || rawStep === "3" ? Number(rawStep) : null;
  const gap = state.gap ?? 1;
  const initialStep = requested && requested > gap ? gap : (requested ?? gap);

  return (
    <main className="flex min-h-screen bg-background text-foreground">
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:py-12">
        <div
          aria-hidden="true"
          className="relative hidden justify-center lg:flex"
        >
          <div className="ob-drift absolute inset-x-8 top-1/2 h-72 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
          <Image
            src="/onboarding-student.png"
            alt=""
            width={477}
            height={524}
            priority
            className="ob-float relative w-full max-w-[420px] object-contain"
          />
        </div>
        <OnboardingWizard
          initialStep={initialStep as 1 | 2 | 3}
          initialStudent={state.student}
          initialAcademic={state.academic}
        />
      </div>
    </main>
  );
}
