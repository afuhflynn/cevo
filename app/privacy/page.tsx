import type { Metadata } from "next";
import { LegalArticle } from "@/components/public/legal-article";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Cevo handles your account, project, and payment data.",
  alternates: { canonical: "/privacy" },
};

const sections = [
  {
    id: "data-we-collect",
    title: "1. Data we collect",
    body: "Account data (name, email, password hash), academic profile (university, faculty, department), project content you write, research sources you save, credit ledger entries, and payment records needed to allocate credits. Public marketing pages collect no personal data.",
  },
  {
    id: "how-we-use",
    title: "2. How we use it",
    body: "To run your workspace, verify email, guard routes, process mobile money payments, prevent fraud, and keep audit trails for money and access events. We do not sell personal data.",
  },
  {
    id: "storage-sharing",
    title: "3. Storage and sharing",
    body: "Project files live in private storage with short lived signed links. Payment processing goes through Fapshi, which sees the phone number and amount needed to collect. AI providers receive only the text needed for the run you request.",
  },
  {
    id: "your-rights",
    title: "4. Your rights",
    body: "Ask for a copy, correction, or deletion of your account data at support@cevo.example. Financial and audit records stay as long as the law requires for reconciliation, then expire by policy.",
  },
  {
    id: "contact",
    title: "5. Contact",
    body: "Privacy questions: support@cevo.example.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <LegalArticle
          title="Privacy policy"
          updated="November 2026"
          intro="What we keep, why we keep it, and how to ask for a copy or deletion."
          sections={sections}
        />
      </main>
      <PublicFooter />
    </div>
  );
}
