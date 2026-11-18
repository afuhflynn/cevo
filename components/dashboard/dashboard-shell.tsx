"use client";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar, type SidebarProject } from "./app-sidebar";
import { UserButton } from "./user-button";

export function DashboardShell({
  user,
  projects,
  children,
}: {
  user: { name: string; email: string };
  projects: SidebarProject[];
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar projects={projects} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <SidebarTrigger aria-label="Toggle sidebar" className="size-9" />
          <UserButton name={user.name} email={user.email} />
        </header>
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
