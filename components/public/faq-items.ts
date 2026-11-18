export type FaqItem = { q: string; a: string };

export const faqs: FaqItem[] = [
  {
    q: "Is Cevo free to use?",
    a: "Yes. Creating an account, completing onboarding, and briefing your first project is free. Credits are only used when you run AI assistance or export your report.",
  },
  {
    q: "What payment methods are accepted?",
    a: "MTN Mobile Money and Orange Money in XAF (FCFA) via Fapshi. Credits allocate exactly once when your payment confirms.",
  },
  {
    q: "Can I use Cevo for any institution?",
    a: "Cevo ships with versioned templates for Cameroonian universities, and you can suggest your institution during onboarding. A standard default template covers everyone else.",
  },
  {
    q: "How does the credit system work?",
    a: "Buy prepaid credit packs, then spend credits on AI briefs, assistant runs, review scans, and exports. Your balance is always visible, and failed runs refund automatically.",
  },
  {
    q: "Is my data secure?",
    a: "Your documents are private to your account, files live in private storage with short-lived signed URLs, and every credit movement is recorded in an auditable ledger.",
  },
];
