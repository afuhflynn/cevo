import type { Metadata } from "next";
import Link from "next/link";
import { PricingCards } from "@/components/public/pricing-cards";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { getPublicPackages } from "@/lib/public-pricing";

export const metadata: Metadata = {
  title: "Pricing — Credit packages in XAF",
  description:
    "Transparent prepaid credit packages in XAF. Pay with MTN MoMo or Orange Money. Credits allocate exactly once on confirmation.",
};

export default async function PricingPage() {
  const { packages, stale, failed } = await getPublicPackages();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Credit packages
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Prepaid credits power AI briefs, assistant runs, review scans, and
            exports. Pay in XAF with MTN MoMo or Orange Money. Credits land
            exactly once when Fapshi confirms your payment.
          </p>
        </div>

        {stale && (
          <p
            role="status"
            className="rounded-xl border border-amber-600/40 bg-amber-500/10 px-4 py-3 text-sm"
          >
            Fresh prices could not load. Showing last known prices.
          </p>
        )}
        {failed && packages.length === 0 && (
          <p
            role="status"
            className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground"
          >
            Pricing could not load right now. Check your connection and refresh.
          </p>
        )}

        <PricingCards packages={packages} />

        <section
          aria-label="Payment notes"
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-sm leading-relaxed"
        >
          <h2 className="font-medium">Before you pay</h2>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-muted-foreground">
            <li>
              After you tap Buy, approve the prompt on your phone with your MoMo
              PIN. Payment can take a few minutes on slow networks. This page
              checks automatically.
            </li>
            <li>
              Failed AI runs refund automatically. Expired unpaid payments never
              take credits.
            </li>
            <li>
              Prices refresh about once an hour. If a package was deactivated
              after you opened this page, checkout shows a kind message and a
              new choice.
            </li>
          </ul>
          <p className="text-muted-foreground">
            New here?{" "}
            <Link
              href="/sign-up"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Create an account
            </Link>{" "}
            first, then come back to buy.
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
