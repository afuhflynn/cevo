import type { Metadata } from "next";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Cevo handles your account, project, and payment data.",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <article className="flex flex-col gap-5">
          <h1 className="font-serif text-3xl">Privacy policy</h1>
          <p className="text-xs text-muted-foreground">
            Last updated: November 2026
          </p>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">1. Data we collect</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Account data (name, email, password hash), academic profile
              (university, faculty, department), project content you write,
              research sources you save, credit ledger entries, and payment
              records needed to allocate credits. Public marketing pages collect
              no personal data.
            </p>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">2. How we use it</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              To run your workspace, verify email, guard routes, process mobile
              money payments, prevent fraud, and keep audit trails for money and
              access events. We do not sell personal data.
            </p>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">3. Storage and sharing</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Project files live in private storage with short lived signed
              links. Payment processing goes through Fapshi, which sees the
              phone number and amount needed to collect. AI providers receive
              only the text needed for the run you request.
            </p>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">4. Your rights</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Ask for a copy, correction, or deletion of your account data at
              support@cevo.example. Financial and audit records stay as long as
              the law requires for reconciliation, then expire by policy.
            </p>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">5. Contact</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Privacy questions: support@cevo.example.
            </p>
          </section>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
