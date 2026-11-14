import type { Metadata } from "next";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "Cevo terms of service under Cameroon cyber law.",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <article className="flex flex-col gap-5">
          <h1 className="font-serif text-3xl">Terms of service</h1>
          <p className="text-xs text-muted-foreground">
            Last updated: November 2026
          </p>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">1. What Cevo provides</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Cevo is an academic workspace for university students. It helps
              you brief, research, draft, review, and export project reports. AI
              output is a draft aid, not academic advice, and you remain
              responsible for the accuracy and originality of work you submit.
            </p>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">2. Accounts</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You need an account with a valid email to use Cevo. Keep your
              password private. You must be eligible to contract under
              Cameroonian law, or have consent from a parent or guardian.
            </p>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">3. Credits and payments</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Credits are prepaid in XAF through Fapshi mobile money (MTN MoMo
              and Orange Money). Prices display on the pricing page and match
              the ledger at purchase time. Credits allocate exactly once when
              payment confirms. Expired or failed payments never take credits.
            </p>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">4. Acceptable use</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Do not submit another person&apos;s work as your own, do not
              attempt to bypass access controls, and do not misuse research or
              export features. We may suspend accounts that abuse the service or
              break the law.
            </p>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">
              5. Cameroon cyber law notice
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              These terms follow Cameroon&apos;s framework for electronic
              communications, electronic transactions, and consumer notice:
              clear pricing, clear refunds, and reachable support at
              support@cevo.example. This page is general information, not legal
              advice.
            </p>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">6. Contact</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Questions about these terms: support@cevo.example.
            </p>
          </section>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
