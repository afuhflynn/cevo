import Link from "next/link";
import type { LedgerEntry } from "@/components/dashboard/settings-tabs";
import { buttonVariants } from "@/components/ui/button";

export function SettingsBillingPanel({
  balance,
  ledger,
}: {
  balance: number;
  ledger: LedgerEntry[];
}) {
  return (
    <section
      aria-label="Billing"
      className="flex flex-col gap-6 rounded-2xl border border-border/60 bg-card p-5 sm:p-8"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Billing
        </h1>
        <p className="text-sm text-muted-foreground">
          Your credit balance and recent activity.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/60 bg-muted/40 p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Your Balance</p>
          <p
            className="text-3xl font-extrabold tracking-tight tabular-nums"
            aria-live="polite"
          >
            {balance.toLocaleString("en-US")} credits
          </p>
        </div>
        <Link
          href="/dashboard/billing"
          className={buttonVariants({ className: "h-11 rounded-xl px-5" })}
        >
          Buy Credits
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-bold">Recent activity</h2>
        {ledger.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No billing activity yet. Your purchases and credit spending will
            appear here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ledger.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {e.description}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {e.type.replaceAll("_", " ").toLowerCase()} ·{" "}
                    {new Date(e.createdAt).toLocaleDateString()}
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
        )}
      </div>
    </section>
  );
}
