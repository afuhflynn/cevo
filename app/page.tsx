import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  GraduationCapIcon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import { CevoLogo } from "@/components/cevo-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToastDemo } from "@/components/toast-demo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <CevoLogo size="sm" href="/" />
            <Badge
              variant="outline"
              className="hidden sm:inline-flex text-[11px] font-mono"
            >
              Foundation v0.1
            </Badge>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="https://github.com/afuhflynn/cevo"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex"
            >
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <ExternalLinkIcon className="mr-1.5 size-3.5" />
                Repository
              </Button>
            </Link>
            <ThemeToggle className="size-8" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12">
        {/* Hero Section */}
        <div className="flex flex-col items-start gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <SparklesIcon className="size-3.5" />
            Stack &amp; Design System Foundation
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Academic Project Development Workspace
          </h1>

          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Guiding university students from initial concept to a structured,
            researched, verified, and exportable academic report following
            institutional guidelines.
          </p>
        </div>

        {/* Global State & Notifications Showcase */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Global State Providers &amp; Toast System
              </h2>
              <p className="text-xs text-muted-foreground">
                Base UI toast notification manager wired into the root layout
                with light and dark theme persistence.
              </p>
            </div>
            <Badge variant="secondary" className="font-mono text-xs">
              Base UI + next-themes
            </Badge>
          </div>

          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Interactive Toast Playground
              </CardTitle>
              <CardDescription className="text-xs">
                Trigger real application notifications across all severity
                levels and promise workflows.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ToastDemo />
            </CardContent>
          </Card>
        </section>

        {/* Color System Tokens */}
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              OKLCH Color Space Palette
            </h2>
            <p className="text-xs text-muted-foreground">
              Tailwind CSS v4 inline OKLCH theme variables mapped cleanly to
              shadcn semantic primitives.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            <div className="flex flex-col gap-2 rounded-xl border border-border p-3 bg-card">
              <div className="h-12 w-full rounded-lg bg-primary shadow-xs" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Primary Blue</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  oklch(0.62 0.19 260)
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-border p-3 bg-card">
              <div className="h-12 w-full rounded-lg bg-secondary border border-border/50" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Secondary</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  var(--secondary)
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-border p-3 bg-card">
              <div className="h-12 w-full rounded-lg bg-accent border border-border/50" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Accent</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  var(--accent)
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-border p-3 bg-card">
              <div className="h-12 w-full rounded-lg bg-muted border border-border/50" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Muted</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  var(--muted)
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-border p-3 bg-card">
              <div className="h-12 w-full rounded-lg bg-destructive" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Destructive</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  var(--destructive)
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-border p-3 bg-card">
              <div className="h-12 w-full rounded-lg bg-card border border-border shadow-xs" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">Card Surface</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  var(--card)
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Typography System */}
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Typography System
            </h2>
            <p className="text-xs text-muted-foreground">
              Google font loaders configured in root layout with non-circular
              CSS fallbacks.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-border/80">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[11px] font-mono">
                    Inter
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    var(--font-sans)
                  </span>
                </div>
                <CardTitle className="font-sans text-base mt-2">
                  Product Interface Font
                </CardTitle>
              </CardHeader>
              <CardContent className="font-sans text-xs leading-relaxed text-muted-foreground">
                Crisp, modern readability across high density data tables,
                sidebars, forms, and dialogs.
              </CardContent>
            </Card>

            <Card className="border-border/80">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[11px] font-mono">
                    Source Serif 4
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    var(--font-serif)
                  </span>
                </div>
                <CardTitle className="font-serif text-base mt-2">
                  Academic Document Body
                </CardTitle>
              </CardHeader>
              <CardContent className="font-serif text-xs leading-relaxed text-muted-foreground">
                Traditional academic elegance for thesis chapters, literature
                reviews, and report abstracts.
              </CardContent>
            </Card>

            <Card className="border-border/80">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[11px] font-mono">
                    JetBrains Mono
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    var(--font-mono)
                  </span>
                </div>
                <CardTitle className="font-mono text-base mt-2">
                  Technical Telemetry &amp; Citations
                </CardTitle>
              </CardHeader>
              <CardContent className="font-mono text-xs leading-relaxed text-muted-foreground">
                Precision alignment for DOIs, mathematical formulas, ledger
                transactions, and audit events.
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Foundation Milestones Card */}
        <section className="flex flex-col gap-4">
          <Card className="border-border/80 bg-muted/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <GraduationCapIcon className="size-4 text-primary" />
                <CardTitle className="text-sm font-semibold">
                  Foundation Status Overview
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Key infrastructural milestones completed for the Cevo academic
                workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-background p-3">
                  <CheckCircle2Icon className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-foreground">
                      Tailwind CSS v4 &amp; OKLCH
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Modern color space and dark mode variants
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-background p-3">
                  <CheckCircle2Icon className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-foreground">
                      Brand Assets &amp; Logo
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Multi-size favicons and CevoLogo component
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-background p-3">
                  <CheckCircle2Icon className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-foreground">
                      Global State &amp; Toast
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Root providers, theme persistence, Base UI toasts
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/60 bg-background/60 py-6 text-center text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Cevo</span>
            <span>
              &copy; 2026 Academic Development Workspace. Cameroon Higher
              Education.
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">University of Buea</span>
            <span className="text-muted-foreground">&bull;</span>
            <span className="text-muted-foreground">
              University of Yaounde I
            </span>
            <span className="text-muted-foreground">&bull;</span>
            <span className="text-muted-foreground">University of Bamenda</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
