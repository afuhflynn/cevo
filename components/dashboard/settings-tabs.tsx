"use client";

import Link from "next/link";
import { SettingsAcademicPanel } from "@/components/dashboard/settings-academic";
import { SettingsBillingPanel } from "@/components/dashboard/settings-billing";
import { SettingsHelpPanel } from "@/components/dashboard/settings-help";
import { SettingsNotificationsPanel } from "@/components/dashboard/settings-notifications";
import { SettingsProfilePanel } from "@/components/dashboard/settings-profile";
import { SettingsSecurityPanel } from "@/components/dashboard/settings-security";
import type { NotificationPreferenceState } from "@/lib/notification-preferences";
import { cn } from "@/lib/utils";

export type StudentInfo = {
  firstName: string;
  lastName: string;
  country: string;
  preferredLanguage: string;
} | null;

export type AcademicInfo = {
  institutionId: string | null;
  customInstitution: string | null;
  facultyId: string | null;
  customFaculty: string | null;
  departmentId: string | null;
  customDepartment: string | null;
  programmeId: string | null;
  qualification: string | null;
  academicSession: string | null;
  preferredStyle: string | null;
} | null;

export type LedgerEntry = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
};

const TABS = [
  { value: "profile", label: "Profile" },
  { value: "academic", label: "Academic" },
  { value: "notifications", label: "Notifications" },
  { value: "billing", label: "Billing" },
  { value: "security", label: "Security" },
  { value: "help", label: "Help" },
] as const;

export function SettingsTabs({
  initialTab,
  user,
  student,
  academic,
  academicNames,
  balance,
  preferences,
  ledger,
}: {
  initialTab: string;
  user: { name: string; email: string; emailVerified: boolean };
  student: StudentInfo;
  academic: AcademicInfo;
  academicNames: Record<string, string>;
  balance: number;
  preferences: NotificationPreferenceState;
  ledger: LedgerEntry[];
}) {
  const active = TABS.some((t) => t.value === initialTab)
    ? initialTab
    : "profile";
  return (
    <div className="flex flex-col gap-6">
      <nav
        className="flex min-w-0 items-center gap-1 overflow-x-auto"
        aria-label="Settings sections"
      >
        {TABS.map((t) => {
          const isActive = active === t.value;
          return (
            <Link
              key={t.value}
              href={
                t.value === "profile"
                  ? "/dashboard/settings"
                  : `/dashboard/settings?tab=${t.value}`
              }
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative shrink-0 rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors",
                isActive
                  ? "bg-primary/10 font-semibold text-primary"
                  : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {t.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-4 -bottom-[1px] h-0.5 rounded-full bg-primary"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {active === "profile" && (
        <SettingsProfilePanel user={user} student={student} />
      )}
      {active === "academic" && (
        <SettingsAcademicPanel
          academic={academic}
          academicNames={academicNames}
        />
      )}
      {active === "notifications" && (
        <SettingsNotificationsPanel initial={preferences} />
      )}
      {active === "billing" && (
        <SettingsBillingPanel balance={balance} ledger={ledger} />
      )}
      {active === "security" && (
        <SettingsSecurityPanel userEmail={user.email} />
      )}
      {active === "help" && <SettingsHelpPanel />}
    </div>
  );
}
