import {
  BookMarkedIcon,
  FileDownIcon,
  GraduationCapIcon,
  PenLineIcon,
  SearchCheckIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PricingCards } from "@/components/public/pricing-cards";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPublicPackages } from "@/lib/public-pricing";

export const metadata: Metadata = {
  title: "Cevo — From idea to verified academic report",
  description:
    "Turn your project idea into a researched, verified, and exportable academic report. Transparent XAF pricing, mobile money checkout.",
};

const steps = [
  {
    icon: PenLineIcon,
    title: "1. Brief your idea",
    body: "Answer a short guided conversation. Cevo turns it into aims, objectives, research questions, and a chapter plan you approve.",
  },
  {
    icon: SearchCheckIcon,
    title: "2. Research with proof",
    body: "Search verified scholarly papers by DOI or topic, save them to your library, and insert deterministic APA 7 or Harvard citations.",
  },
  {
    icon: FileDownIcon,
    title: "3. Write and export",
    body: "Draft in a calm editor with autosave, pass pre-submission review, then export publication quality PDF and DOCX.",
  },
];

const features = [
  {
    icon: GraduationCapIcon,
    title: "Built for Cameroonian universities",
    body: "Onboarding captures your university, faculty, department, and citation style so templates match your institution.",
  },
  {
    icon: BookMarkedIcon,
    title: "Verified research only",
    body: "OpenAlex and Crossref sources with cached results and clear partial failure states. No invented references.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Pre-submission review",
    body: "Local plus semantic checks flag missing sections, uncited claims, and formatting drift before you submit.",
  },
  {
    icon: PenLineIcon,
    title: "AI assistant with diffs",
    body: "Tone revision and paragraph polish with side by side diffs. You accept or discard. Nothing changes silently.",
  },
  {
    icon: FileDownIcon,
    title: "High fidelity export",
    body: "Background jobs compile margins, headers, and numbering into PDF and DOCX without timing out your browser.",
  },
  {
    icon: SmartphoneIcon,
    title: "Prepaid credits via MoMo",
    body: "Buy credits in XAF with MTN MoMo or Orange Money. Exact allocation on payment confirmation, refunds on failed runs.",
  },
];

export default async function LandingPage() {
  const { packages, stale } = await getPublicPackages();
  const teaser = packages.slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-4 py-10 sm:px-6 sm:py-14">
        {/* Hero */}
        <section aria-labelledby="hero-heading" className="flex flex-col gap-6">
          <Badge variant="secondary" className="w-fit">
            Academic project workspace · Cameroon
          </Badge>
          <h1
            id="hero-heading"
            className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
          >
            From idea to verified exportable report
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Cevo guides you from a rough project idea to a structured,
            researched, verified report that follows your institutional
            guidelines. Research, writing, review, and export in one calm place.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/sign-up">
              <Button size="lg">Start your project</Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline">
                See pricing in XAF
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            No payment to explore. Credits only when you run AI or export.
          </p>
        </section>

        {/* How it works */}
        <section aria-labelledby="how-heading" className="flex flex-col gap-6">
          <div>
            <h2
              id="how-heading"
              className="text-2xl font-semibold tracking-tight"
            >
              How it works
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Three steps from concept to submission ready document.
            </p>
          </div>
          <ol className="grid gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.title}>
                <Card className="h-full">
                  <CardHeader>
                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <s.icon className="size-5" aria-hidden="true" />
                    </span>
                    <CardTitle className="text-base">{s.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {s.body}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section
          aria-labelledby="features-heading"
          className="flex flex-col gap-6"
        >
          <div>
            <h2
              id="features-heading"
              className="text-2xl font-semibold tracking-tight"
            >
              Everything a report needs
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Research, writing, review, files, templates, and export share one
              source of truth.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <li key={f.title}>
                <Card className="h-full">
                  <CardHeader>
                    <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                      <f.icon className="size-4" aria-hidden="true" />
                    </span>
                    <CardTitle className="text-sm">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">
                      {f.body}
                    </CardDescription>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        {/* Pricing teaser */}
        <section
          aria-labelledby="pricing-heading"
          className="flex flex-col gap-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="pricing-heading"
                className="text-2xl font-semibold tracking-tight"
              >
                Transparent pricing in XAF
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Prepaid credit packages. Pay with MTN MoMo or Orange Money.
              </p>
            </div>
            <Link href="/pricing">
              <Button variant="outline" size="sm">
                Full pricing
              </Button>
            </Link>
          </div>
          {stale && (
            <p role="status" className="text-xs text-muted-foreground">
              Showing last known prices while fresh data loads.
            </p>
          )}
          <PricingCards packages={teaser} />
        </section>

        {/* Final call */}
        <section
          aria-labelledby="cta-heading"
          className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-12 text-center"
        >
          <h2
            id="cta-heading"
            className="text-2xl font-semibold tracking-tight"
          >
            Ready when your idea is
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Create an account, complete onboarding, and brief your first
            project. Credits wait until you need AI help or export.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/sign-up">
              <Button size="lg">Get started free</Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="ghost">
                Sign in
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
