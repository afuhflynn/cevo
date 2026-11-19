import { PlusIcon } from "lucide-react";
import { Suspense } from "react";
import { BillingCheckout } from "@/components/billing/billing-checkout";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth-helpers";
import { getBalance, listActivePackages } from "@/lib/billing";
import { db } from "@/lib/prisma";

export const instant = false;

async function LedgerPreview({ userId }: { userId: string }) {
  const wallet = await db.orm.public.CreditWallet.where({
    userId,
  }).first();
  if (!wallet) return null;
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
    .limit(10)
    .all()) as unknown as Array<{
    id: string;
    type: string;
    amount: number;
    balanceAfter: number;
    description: string;
    createdAt: Date | string;
  }>;
  if (rows.length === 0) return null;
  return (
    <section className="flex flex-col gap-3" aria-label="Payment history">
      <h2 className="text-xl font-bold tracking-tight">Payment history</h2>
      <ul className="flex flex-col gap-2">
        {rows.map((e) => (
          <li
            key={e.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 text-sm"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">
                {e.description}
              </span>
              <span className="block text-xs text-muted-foreground">
                {e.type.replaceAll("_", " ").toLowerCase()} ·{" "}
                {e.createdAt instanceof Date
                  ? e.createdAt.toLocaleDateString()
                  : new Date(e.createdAt).toLocaleDateString()}
              </span>
            </span>
            <span
              className={`font-medium tabular-nums ${e.amount >= 0 ? "text-green-600 dark:text-green-400" : ""}`}
            >
              {e.amount >= 0 ? `+${e.amount}` : e.amount}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  // Neon sleeps on inactivity and the first queries after wake can fail
  // inside the ORM. Degrade to an empty catalog + notice instead of 500.
  const [packagesResult, balanceResult] = await Promise.allSettled([
    listActivePackages(),
    getBalance(user.id),
  ]);
  const packages =
    packagesResult.status === "fulfilled" ? packagesResult.value : [];
  const { balance, lowBalance } =
    balanceResult.status === "fulfilled"
      ? balanceResult.value
      : { balance: 0, lowBalance: false };
  const billingDown =
    packagesResult.status === "rejected" || balanceResult.status === "rejected";
  const params = searchParams ? await searchParams : undefined;
  const rawPackageId = params?.packageId;
  const initialPackageId =
    typeof rawPackageId === "string"
      ? rawPackageId
      : Array.isArray(rawPackageId)
        ? (rawPackageId[0] ?? null)
        : null;
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
      <section
        aria-label="Your balance"
        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card p-6 sm:p-8"
      >
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Your Balance</p>
          <p
            className="text-4xl font-extrabold tracking-tight tabular-nums"
            aria-live="polite"
          >
            {balance.toLocaleString("en-US")} credits
          </p>
        </div>
        <a
          href="#packages"
          className={buttonVariants({ className: "h-11 rounded-xl px-5" })}
        >
          Buy Credits
          <PlusIcon aria-hidden="true" />
        </a>
      </section>

      {billingDown && (
        <output className="block rounded-xl border border-amber-600/40 bg-amber-500/10 px-4 py-3 text-sm">
          Billing is temporarily unreachable. Your balance and packages will
          reappear on refresh — no credits were lost.
        </output>
      )}

      {lowBalance && (
        <output className="block rounded-xl border border-amber-600/40 bg-amber-500/10 px-4 py-3 text-sm">
          Your balance is under 10 credits. Top up below so long runs never
          stall halfway.
        </output>
      )}

      <section
        aria-labelledby="packages-heading"
        className="flex flex-col gap-5"
      >
        <h2
          id="packages-heading"
          className="text-xl font-bold tracking-tight sm:text-2xl"
        >
          Available Packages
        </h2>
        <Suspense
          fallback={
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {["a", "b", "c"].map((id) => (
                <Skeleton key={id} className="h-72 w-full rounded-2xl" />
              ))}
            </div>
          }
        >
          <BillingCheckout
            packages={packages}
            initialPackageId={initialPackageId}
          />
        </Suspense>
      </section>

      <LedgerPreview userId={user.id} />
    </div>
  );
}
