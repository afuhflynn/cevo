import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { SettingsTabs } from "@/components/dashboard/settings-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth-helpers";
import { getBalance } from "@/lib/billing";
import { getNotificationPreferences } from "@/lib/notification-preferences";
import { getOnboardingState } from "@/lib/onboarding";
import { db } from "@/lib/prisma";
import { loadSettingsSearchParams } from "@/lib/search-params";

export const instant = false;

type LedgerEntry = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
};

async function SettingsLoader({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const { tab } = await loadSettingsSearchParams(searchParams);
  const [state, balanceResult, preferences, ledger] = await Promise.all([
    getOnboardingState(user.id),
    getBalance(user.id).catch(() => ({ balance: 0, lowBalance: false })),
    getNotificationPreferences(user.id),
    (async (): Promise<LedgerEntry[]> => {
      try {
        const wallet = await db.orm.public.CreditWallet.where({
          userId: user.id,
        }).first();
        if (!wallet) return [];
        const w = wallet as unknown as { id: string };
        const rows = (await db.orm.public.CreditLedger.select(
          "id",
          "type",
          "amount",
          "balanceAfter",
          "description",
          "createdAt",
        )
          .where((r) => r.walletId.eq(w.id))
          .orderBy((r) => r.createdAt.desc())
          .limit(5)
          .all()) as unknown as Array<{
          id: string;
          type: string;
          amount: number;
          balanceAfter: number;
          description: string;
          createdAt: Date | string;
        }>;
        return rows.map((e) => ({
          id: e.id,
          type: e.type,
          amount: e.amount,
          balanceAfter: e.balanceAfter,
          description: e.description,
          createdAt:
            e.createdAt instanceof Date
              ? e.createdAt.toISOString()
              : new Date(e.createdAt).toISOString(),
        }));
      } catch {
        return [];
      }
    })(),
  ]);

  const academic = state.academic;
  const names = await (async () => {
    const out: Record<string, string> = {};
    async function nameOf(
      table: "Institution" | "Faculty" | "Department" | "Programme",
      id: string | null,
    ) {
      if (!id) return null;
      try {
        if (table === "Institution") {
          const row = (await db.orm.public.Institution.where({
            id,
          }).first()) as unknown as { name: string } | null;
          return row?.name ?? null;
        }
        if (table === "Faculty") {
          const row = (await db.orm.public.Faculty.where({
            id,
          }).first()) as unknown as { name: string } | null;
          return row?.name ?? null;
        }
        if (table === "Department") {
          const row = (await db.orm.public.Department.where({
            id,
          }).first()) as unknown as { name: string } | null;
          return row?.name ?? null;
        }
        const row = (await db.orm.public.Programme.where({
          id,
        }).first()) as unknown as { name: string } | null;
        return row?.name ?? null;
      } catch {
        return null;
      }
    }
    const [institution, faculty, department, programme] = await Promise.all([
      nameOf("Institution", academic?.institutionId ?? null),
      nameOf("Faculty", academic?.facultyId ?? null),
      nameOf("Department", academic?.departmentId ?? null),
      nameOf("Programme", academic?.programmeId ?? null),
    ]);
    if (institution) out.institution = institution;
    if (faculty) out.faculty = faculty;
    if (department) out.department = department;
    if (programme) out.programme = programme;
    return out;
  })();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <SettingsTabs
        initialTab={tab}
        user={{
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
        }}
        student={state.student}
        academic={state.academic}
        academicNames={names}
        balance={balanceResult.balance}
        preferences={preferences}
        ledger={ledger}
      />
    </div>
  );
}

export default function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
          <Skeleton className="h-11 w-full max-w-2xl rounded-xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      }
    >
      <SettingsLoader searchParams={searchParams} />
    </Suspense>
  );
}
