import type { Metadata } from "next";
import { LegalArticle } from "@/components/public/legal-article";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Refund policy",
  description: "When Cevo refunds credits or mobile money payments.",
  alternates: { canonical: "/refunds" },
};

const sections = [
  {
    id: "failed-runs",
    title: "1. Failed AI runs",
    body: "When an AI run fails after holding credits, the hold returns automatically as a refund ledger entry. You never pay for runs that did not complete.",
  },
  {
    id: "failed-payments",
    title: "2. Failed or expired payments",
    body: "Failed or expired mobile money payments never allocate credits and never charge beyond what your operator already rules. If money left your MoMo account but no credits arrived, contact support@cevo.example with your payment time and phone number so we can reconcile with Fapshi.",
  },
  {
    id: "used-credits",
    title: "3. Used credits",
    body: "Credits already spent on completed runs or exports are not refundable, because the work already ran. Unused credit balance stays on your wallet for future projects.",
  },
  {
    id: "how-to-ask",
    title: "4. How to ask",
    body: "Write to support@cevo.example within 14 days with your account email, package name, and payment reference. We answer within 3 business days.",
  },
];

export default function RefundsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <LegalArticle
          title="Refund policy"
          updated="November 2026"
          intro="Failed runs refund automatically. Failed payments never take credits. Used credits stay spent."
          sections={sections}
        />
      </main>
      <PublicFooter />
    </div>
  );
}
