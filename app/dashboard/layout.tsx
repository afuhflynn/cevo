import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { getOnboardingState } from "@/lib/onboarding";

export const instant = false;

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const state = await getOnboardingState(user.id);
  if (!state.completed) {
    const gap = state.gap ?? 1;
    redirect(`/onboarding?step=${gap}`);
  }
  return <>{children}</>;
}
