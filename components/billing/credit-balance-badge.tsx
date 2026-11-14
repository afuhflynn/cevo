import { getCurrentUser } from "@/lib/auth-helpers";
import { getBalance } from "@/lib/billing";

export async function CreditBalanceBadge() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { balance, lowBalance } = await getBalance(user.id);
  return (
    <a
      href="/dashboard/billing"
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium"
      aria-label={`Credit balance: ${balance} credits${lowBalance ? ", low balance" : ""}`}
    >
      <span aria-hidden="true">◉</span>
      <span>{balance}</span>
      <span className="text-muted-foreground">credits</span>
      {lowBalance && (
        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
          Low
        </span>
      )}
    </a>
  );
}
