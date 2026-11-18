import {
  ArrowRightIcon,
  CheckIcon,
  DownloadIcon,
  FileTextIcon,
  LightbulbIcon,
  PenLineIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  TrendingUpIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CevoLogo } from "@/components/cevo-logo";
import { HeroIllustration } from "@/components/public/hero-illustration";
import { PricingCards } from "@/components/public/pricing-cards";
import { ProofBand } from "@/components/public/proof-mock";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { Button } from "@/components/ui/button";
import { faqs } from "@/components/public/faq-items";
import { getPublicPackages } from "@/lib/public-pricing";

export const metadata: Metadata = {
  title: "Your academic project, from idea to final report",
  description:
    "Plan your research, discover academic sources, develop your chapters and format your document according to your school's requirements.",
  alternates: { canonical: "/" },
};

const whyChoose = [
  {
    icon: LightbulbIcon,
    title: "Plan & Organize",
    body: "Structure your ideas with AI-powered guidance.",
  },
  {
    icon: SearchIcon,
    title: "Discover Research",
    body: "Find credible sources from trusted academic databases.",
  },
  {
    icon: PenLineIcon,
    title: "Write with AI",
    body: "Get intelligent assistance throughout your project.",
  },
  {
    icon: FileTextIcon,
    title: "Follow Templates",
    body: "Adhere to institutional formatting requirements.",
  },
  {
    icon: DownloadIcon,
    title: "Export Easily",
    body: "Download your work in PDF or DOCX format.",
  },
  {
    icon: TrendingUpIcon,
    title: "Track Progress",
    body: "Stay on schedule with smart progress tracking.",
  },
];

const howSteps = [
  {
    icon: LightbulbIcon,
    title: "Plan Your Project",
    body: "Share your idea and get personalized guidance.",
  },
  {
    icon: SearchIcon,
    title: "Research & Gather",
    body: "Find reliable sources and build your bibliography.",
  },
  {
    icon: PenLineIcon,
    title: "Develop Your Work",
    body: "Write, refine and improve with AI assistance.",
  },
  {
    icon: null,
    title: "Export & Present",
    body: "Download your project in the perfect format.",
  },
];

const providers = [
  { name: "OpenAlex", src: "/brands/openalex-mark.png" },
  { name: "Crossref", src: "/brands/crossref-icon.svg" },
  { name: "Semantic Scholar", src: "/brands/semantic-scholar-mark.svg" },
];

export default async function LandingPage() {
  const { packages, stale } = await getPublicPackages();
  const teaser = packages.slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-14 px-4 py-10 sm:gap-16 sm:px-6 sm:py-14">
        {/* Hero: headline left, bespoke illustration right */}
        <section
          aria-labelledby="hero-heading"
          className="grid items-center gap-10 py-4 sm:py-8 lg:grid-cols-2 lg:gap-6"
        >
          <div className="flex flex-col gap-5">
            <h1
              id="hero-heading"
              className="text-5xl font-bold tracking-tight text-balance sm:text-6xl lg:text-[4.25rem] lg:leading-[1.04]"
            >
              Your academic project, from{" "}
              <span className="text-primary">idea</span> to{" "}
              <span className="text-primary">final report.</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed break-words text-muted-foreground sm:text-lg">
              Plan your research, discover academic sources, develop your
              chapters and format your document according to your school&rsquo;s
              requirements.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/sign-up">
                <Button size="lg" className="h-12 rounded-xl px-7 text-[15px]">
                  Get started
                </Button>
              </Link>
              <Link href="/#how-it-works">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 gap-2 rounded-xl px-6 text-[15px]"
                >
                  <PlayIcon
                    className="size-4 fill-primary text-primary"
                    aria-hidden="true"
                  />
                  See how it works
                </Button>
              </Link>
            </div>
          </div>
          <HeroIllustration />
        </section>

        {/* Proof: workspace preview straight after the hero */}
        <section aria-label="Workspace preview" className="flex flex-col gap-5">
          <ProofBand />
        </section>

        {/* Why Choose Cevo */}
        <section
          aria-labelledby="why-heading"
          id="features"
          className="grid scroll-mt-20 items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
        >
          <div className="flex flex-col items-start gap-4">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-primary uppercase">
              <span aria-hidden="true" className="h-px w-6 bg-primary" />
              Why Choose Cevo?
            </p>
            <h2
              id="why-heading"
              className="text-3xl font-bold tracking-tight text-balance sm:text-4xl"
            >
              A smarter way to build your academic success.
            </h2>
            <p className="max-w-md text-sm leading-relaxed break-words text-muted-foreground sm:text-base">
              Cevo combines the power of AI with academic expertise to help you
              research, write and perfect your projects with confidence.
            </p>
            <Link href="/#templates">
              <Button className="h-11 gap-2 rounded-xl px-6 text-sm">
                Explore features
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-3">
            {whyChoose.map((f) => (
              <li key={f.title} className="flex flex-col gap-2">
                <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <f.icon className="size-5" aria-hidden="true" />
                </span>
                <p className="text-sm font-bold">{f.title}</p>
                <p className="text-[13px] leading-relaxed break-words text-muted-foreground">
                  {f.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* How It Works */}
        <section
          aria-labelledby="how-heading"
          id="how-it-works"
          className="flex scroll-mt-20 flex-col gap-8"
        >
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-primary uppercase">
              <span aria-hidden="true" className="h-px w-6 bg-primary" />
              How It Works
            </p>
            <h2
              id="how-heading"
              className="text-3xl font-bold tracking-tight text-balance sm:text-4xl"
            >
              From idea to final report in 4 simple steps.
            </h2>
          </div>
          <ol className="relative flex flex-col gap-8 md:flex-row md:items-start md:gap-6">
            <span
              aria-hidden="true"
              className="absolute top-7 right-0 left-0 hidden h-px bg-border md:block"
            />
            {howSteps.map((s) => (
              <li key={s.title} className="relative flex flex-1 flex-col gap-2">
                {s.icon ? (
                  <span className="relative z-10 flex size-14 items-center justify-center rounded-full border border-border/60 bg-card text-foreground shadow-md">
                    <s.icon className="size-5" aria-hidden="true" />
                  </span>
                ) : (
                  <span className="relative z-10 flex size-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                    <CheckIcon className="size-5" aria-hidden="true" />
                  </span>
                )}
                <p className="text-sm font-bold">{s.title}</p>
                <p className="text-[13px] leading-relaxed break-words text-muted-foreground">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Templates & Research */}
        <section
          aria-labelledby="templates-heading"
          id="templates"
          className="grid scroll-mt-20 items-center gap-10 lg:grid-cols-2"
        >
          <div className="flex flex-col items-start gap-4">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-primary uppercase">
              <span aria-hidden="true" className="h-px w-6 bg-primary" />
              Templates & Research
            </p>
            <h2
              id="templates-heading"
              className="text-3xl font-bold tracking-tight text-balance sm:text-4xl"
            >
              Institution-ready templates and verified academic sources.
            </h2>
            <p className="max-w-md text-sm leading-relaxed break-words text-muted-foreground sm:text-base">
              Access official templates from your institution and search through
              trusted academic databases.
            </p>
            <Link href="/sign-up">
              <Button className="h-11 gap-2 rounded-xl px-6 text-sm">
                Browse templates
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>
          <div
            aria-hidden="true"
            className="relative h-[340px] w-full select-none sm:h-[380px]"
          >
            <div className="absolute inset-x-10 top-10 bottom-10 rounded-full bg-primary/[0.07] blur-3xl" />
            <div className="absolute top-24 right-6 h-52 w-52 rounded-[3rem] bg-gradient-to-b from-primary/25 to-primary/10 sm:right-12 sm:h-60 sm:w-60" />
            <div className="absolute top-10 left-2 w-44 rotate-[8deg] rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-[0_32px_60px_-24px_var(--color-primary)] sm:left-6 sm:w-52">
              <div className="h-2.5 w-16 rounded-full bg-primary/30" />
              <div className="mt-3 flex flex-col gap-2">
                <div className="h-2 w-full rounded-full bg-primary/15" />
                <div className="h-2 w-11/12 rounded-full bg-primary/15" />
                <div className="h-2 w-4/5 rounded-full bg-primary/15" />
                <div className="h-2 w-full rounded-full bg-primary/15" />
              </div>
              <div className="mt-4 h-12 rounded-xl bg-primary/10" />
            </div>
            <div className="absolute top-2 right-2 w-44 -rotate-[4deg] rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-[0_32px_60px_-20px_var(--color-primary)] sm:right-8 sm:w-52">
              <div className="h-2 w-full rounded-full bg-primary/15" />
              <div className="mt-2 flex flex-col gap-2">
                <div className="h-2 w-11/12 rounded-full bg-primary/15" />
                <div className="h-2 w-4/5 rounded-full bg-primary/15" />
              </div>
              <div className="mt-3 flex flex-col gap-1 border-t border-border/60 pt-3 text-xs font-semibold">
                <span>APA 7</span>
                <span>Harvard</span>
                <span>IEEE</span>
                <span className="font-normal text-muted-foreground">
                  and more...
                </span>
              </div>
            </div>
            <div className="absolute bottom-2 left-4 w-48 rounded-2xl border border-border/70 bg-card p-3 shadow-[0_24px_50px_-20px_var(--color-primary)] sm:left-10 sm:w-52">
              {providers.map((p, idx) => (
                <div
                  key={p.name}
                  className={`flex items-center gap-2.5 px-1.5 py-2 ${idx > 0 ? "border-t border-border/60" : ""}`}
                >
                  <Image
                    src={p.src}
                    alt=""
                    width={20}
                    height={20}
                    className="size-5 shrink-0 object-contain"
                  />
                  <span className="text-xs font-semibold">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing teaser */}
        <section
          aria-labelledby="pricing-heading"
          className="flex flex-col items-center gap-8 text-center"
        >
          <div className="flex flex-col items-center gap-2">
            <h2
              id="pricing-heading"
              className="text-3xl font-bold tracking-tight text-balance sm:text-4xl"
            >
              Simple, flexible pricing
            </h2>
            <p className="max-w-xl text-sm leading-relaxed break-words text-muted-foreground sm:text-base">
              Get credits and unlock the full power of Cevo.
            </p>
          </div>
          {stale && (
            <p role="status" className="text-xs text-muted-foreground">
              Showing last known prices while fresh data loads.
            </p>
          )}
          <PricingCards packages={teaser} />
        </section>

        {/* FAQ */}
        <section
          aria-labelledby="faq-heading"
          id="faq"
          className="grid scroll-mt-20 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
        >
          <div className="flex flex-col items-start gap-4 lg:sticky lg:top-24">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-primary uppercase">
              <span aria-hidden="true" className="h-px w-6 bg-primary" />
              Got Questions?
            </p>
            <h2
              id="faq-heading"
              className="text-3xl font-bold tracking-tight text-balance sm:text-4xl"
            >
              Find answers to common questions.
            </h2>
            <p className="max-w-md text-sm leading-relaxed break-words text-muted-foreground sm:text-base">
              Can&rsquo;t find what you&rsquo;re looking for? Contact our
              support team.
            </p>
            <a href="mailto:support@cevo.example">
              <Button
                variant="outline"
                className="h-11 gap-2 rounded-xl px-6 text-sm"
              >
                Contact Support
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </Button>
            </a>
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border/70 bg-card">
            {faqs.map((f) => (
              <details key={f.q} name="cevo-faq" className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                  <span className="text-[15px] font-medium">{f.q}</span>
                  <PlusIcon
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  />
                </summary>
                <p className="px-5 pb-4 text-sm leading-relaxed break-words text-muted-foreground">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Final call */}
        <section
          aria-labelledby="cta-heading"
          className="relative flex flex-col gap-6 overflow-hidden rounded-3xl bg-primary px-6 py-10 sm:px-10 sm:py-12 lg:flex-row lg:items-center"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 right-10 size-64 rounded-full bg-white/10 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 left-1/3 size-72 rounded-full bg-white/[0.07] blur-2xl"
          />
          <CevoLogo
            variant="icon"
            size="xl"
            className="relative shrink-0 brightness-0 invert"
          />
          <div className="relative flex flex-col gap-2 lg:flex-1">
            <h2
              id="cta-heading"
              className="text-2xl font-bold tracking-tight text-balance text-white sm:text-3xl"
            >
              Ready to bring your ideas to life?
            </h2>
            <p className="max-w-xl text-sm leading-relaxed break-words text-white/80 sm:text-base">
              Join thousands of students using Cevo to achieve academic
              excellence.
            </p>
          </div>
          <Link href="/sign-up" className="relative shrink-0 lg:ml-auto">
            <Button className="h-11 gap-2 rounded-xl bg-white px-6 text-[15px] font-semibold text-primary hover:bg-white/90">
              Get started
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Button>
          </Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
