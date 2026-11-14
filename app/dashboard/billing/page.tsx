import { BillingCheckout } from "@/components/billing/billing-checkout";
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
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Recent activity</h2>
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((e) => (
          <li
            key={e.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm"
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

export default async function BillingPage() {
  const user = await requireUser();
  const [packages, { balance, lowBalance }] = await Promise.all([
    listActivePackages(),
    getBalance(user.id),
  ]);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Buy credits</h1>
          <p className="text-sm text-muted-foreground">
            Pay with MTN MoMo or Orange Money. Credits land when the payment
            confirms.
          </p>
        </div>
        <p
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium"
          aria-live="polite"
        >
          Balance: {balance} credits
        </p>
      </div>

      {lowBalance && (
        <p
          role="status"
          className="rounded-xl border border-amber-600/40 bg-amber-500/10 px-4 py-3 text-sm"
        >
          Your balance is under 10 credits. Top up below so long runs never
          stall halfway.
        </p>
      )}

      <BillingCheckout packages={packages} />

      <LedgerPreview userId={user.id} />
    </div>
  );
}
