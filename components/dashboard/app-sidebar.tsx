"use client";

import {
  ChevronRightIcon,
  FileSearchIcon,
  FolderIcon,
  HomeIcon,
  LayoutTemplateIcon,
  LifeBuoyIcon,
  SettingsIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CevoLogo } from "@/components/cevo-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export type SidebarProject = { id: string; title: string };

function ProjectGroup({
  label,
  icon: Icon,
  projects,
  openByDefault,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  projects: SidebarProject[];
  openByDefault: boolean;
}) {
  const [open, setOpen] = useState(openByDefault);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={label}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Icon className="size-4" />
        <span>{label}</span>
        <ChevronRightIcon
          className={`ml-auto size-4 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </SidebarMenuButton>
      {open ? (
        <SidebarMenuSub>
          {projects.map((p) => (
            <SidebarMenuSubItem key={p.id}>
              <SidebarMenuSubButton
                href={`/dashboard/projects/${p.id}/workspace`}
              >
                <span>{p.title}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
          {projects.length === 0 ? (
            <SidebarMenuSubItem>
              <span className="px-2 py-1.5 text-xs text-muted-foreground">
                No projects yet
              </span>
            </SidebarMenuSubItem>
          ) : null}
          <SidebarMenuSubItem>
            <SidebarMenuSubButton href="/dashboard/projects">
              <span className="font-medium">All projects</span>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        </SidebarMenuSub>
      ) : null}
    </SidebarMenuItem>
  );
}

export function AppSidebar({
  projects,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  projects: SidebarProject[];
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex h-12 items-center px-2">
          <div className="group-data-[collapsible=icon]/sidebar-wrapper:hidden">
            <CevoLogo size="sm" href="/dashboard" />
          </div>
          <div className="hidden group-data-[collapsible=icon]/sidebar-wrapper:block">
            <CevoLogo variant="icon" size="sm" href="/dashboard" />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/dashboard" />}
                  isActive={pathname === "/dashboard"}
                  tooltip="Home"
                >
                  <HomeIcon className="size-4" />
                  <span>Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/dashboard/projects" />}
                  isActive={
                    pathname === "/dashboard/projects" ||
                    pathname.startsWith("/dashboard/projects/") ||
                    pathname.startsWith("/dashboard/archived") ||
                    pathname.startsWith("/dashboard/new")
                  }
                  tooltip="Projects"
                >
                  <FolderIcon className="size-4" />
                  <span>Projects</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/dashboard/research" />}
                  isActive={pathname.startsWith("/dashboard/research")}
                  tooltip="Research"
                >
                  <FileSearchIcon className="size-4" />
                  <span>Research</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/dashboard/templates" />}
                  isActive={pathname.startsWith("/dashboard/templates")}
                  tooltip="Templates"
                >
                  <LayoutTemplateIcon className="size-4" />
                  <span>Templates</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <ProjectGroup
                label="Files"
                icon={FolderIcon}
                projects={projects}
                openByDefault={false}
              />
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/dashboard/billing" />}
                  isActive={pathname.startsWith("/dashboard/billing")}
                  tooltip="Credits"
                >
                  <WalletIcon className="size-4" />
                  <span>Credits</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/dashboard/settings" />}
                  isActive={pathname.startsWith("/dashboard/settings")}
                  tooltip="Settings"
                >
                  <SettingsIcon className="size-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/dashboard/help" />}
                  isActive={pathname.startsWith("/dashboard/help")}
                  tooltip="Help"
                >
                  <LifeBuoyIcon className="size-4" />
                  <span>Help</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
