import type { Metadata } from "next";
import { LegalArticle } from "@/components/public/legal-article";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "Cevo terms of service under Cameroon cyber law.",
  alternates: { canonical: "/terms" },
};

const sections = [
  {
    id: "what-cevo-provides",
    title: "1. What Cevo provides",
    body: "Cevo is an academic workspace for university students. It helps you brief, research, draft, review, and export project reports. AI output is a draft aid, not academic advice, and you remain responsible for the accuracy and originality of work you submit.",
  },
  {
    id: "accounts",
    title: "2. Accounts",
    body: "You need an account with a valid email to use Cevo. Keep your password private. You must be eligible to contract under Cameroonian law, or have consent from a parent or guardian.",
  },
  {
    id: "credits-payments",
    title: "3. Credits and payments",
    body: "Credits are prepaid in XAF through Fapshi mobile money (MTN MoMo and Orange Money). Prices display on the pricing page and match the ledger at purchase time. Credits allocate exactly once when payment confirms. Expired or failed payments never take credits.",
  },
  {
    id: "acceptable-use",
    title: "4. Acceptable use",
    body: "Do not submit another person's work as your own, do not attempt to bypass access controls, and do not misuse research or export features. We may suspend accounts that abuse the service or break the law.",
  },
  {
    id: "cameroon-law",
    title: "5. Cameroon cyber law notice",
    body: "These terms follow Cameroon's framework for electronic communications, electronic transactions, and consumer notice: clear pricing, clear refunds, and reachable support at support@cevo.example. This page is general information, not legal advice.",
  },
  {
    id: "contact",
    title: "6. Contact",
    body: "Questions about these terms: support@cevo.example.",
  },
];

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <LegalArticle
          title="Terms of service"
          updated="November 2026"
          intro="The rules for using Cevo, in plain language. Prices, payments, and refunds stay visible before you pay."
          sections={sections}
        />
      </main>
      <PublicFooter />
    </div>
  );
}
