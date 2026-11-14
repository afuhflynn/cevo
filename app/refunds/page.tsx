import type { Metadata } from "next";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";

export const metadata: Metadata = {
  title: "Refund policy",
  description: "When Cevo refunds credits or mobile money payments.",
};

export default function RefundsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <article className="flex flex-col gap-5">
          <h1 className="font-serif text-3xl">Refund policy</h1>
          <p className="text-xs text-muted-foreground">
            Last updated: November 2026
          </p>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">1. Failed AI runs</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              When an AI run fails after holding credits, the hold returns
              automatically as a refund ledger entry. You never pay for runs
              that did not complete.
            </p>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">
              2. Failed or expired payments
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Failed or expired mobile money payments never allocate credits and
              never charge beyond what your operator already rules. If money
              left your MoMo account but no credits arrived, contact
              support@cevo.example with your payment time and phone number so we
              can reconcile with Fapshi.
            </p>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">3. Used credits</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Credits already spent on completed runs or exports are not
              refundable, because the work already ran. Unused credit balance
              stays on your wallet for future projects.
            </p>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">4. How to ask</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Write to support@cevo.example within 14 days with your account
              email, package name, and payment reference. We answer within 3
              business days.
            </p>
          </section>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
