import { redirect } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardQueryProvider } from "@/components/dashboard/query-provider";
import { requireUser } from "@/lib/auth-helpers";
import { getDashboardCatalog } from "@/lib/dashboard";
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
  const catalog = await getDashboardCatalog({ userId: user.id, page: 1 });
  const projects = catalog.projects
    .slice(0, 5)
    .map((p) => ({ id: p.id, title: p.title }));

  return (
    <DashboardQueryProvider>
      <NuqsAdapter>
        <DashboardShell
          user={{ name: user.name, email: user.email }}
          projects={projects}
        >
          {children}
        </DashboardShell>
      </NuqsAdapter>
    </DashboardQueryProvider>
  );
}
