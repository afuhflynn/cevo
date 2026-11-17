import {
  BoldIcon,
  CircleCheckIcon,
  EyeIcon,
  FileTextIcon,
  HomeIcon,
  ItalicIcon,
  ListIcon,
  QuoteIcon,
  SearchIcon,
  SettingsIcon,
  ShareIcon,
  SparklesIcon,
  UnderlineIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Honest static preview of the real workspace shape.
 * Abstract bars and chips only — no screenshots, no new colors.
 * Mirrors the approved design mock: top bar, app rail, document
 * outline, editor canvas, and assistant panel.
 */
function AppPreview() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_32px_80px_-32px_var(--color-primary)]"
    >
      {/* top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-muted/30 px-4 py-2.5">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          My Projects <span className="mx-1">›</span>
          <span className="font-medium text-foreground">
            Machine Learning for Education
          </span>
        </p>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
            <CircleCheckIcon className="size-3.5" />
            Saved just now
          </span>
          <span className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium">
            <EyeIcon className="size-3.5" />
            Preview
          </span>
          <span className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">
            <ShareIcon className="size-3.5" />
            Export
          </span>
          <span className="size-6 rounded-full bg-primary/20" />
        </div>
      </div>

      <div className="grid gap-0 sm:grid-cols-[160px_minmax(0,1fr)] lg:grid-cols-[170px_minmax(0,1fr)_230px]">
        {/* app rail */}
        <div className="hidden flex-col gap-1 border-r border-border/60 p-3 sm:flex">
          {[
            { icon: HomeIcon, label: "Home", active: true },
            { icon: FileTextIcon, label: "Projects", active: false },
            { icon: SearchIcon, label: "Research", active: false },
            { icon: FileTextIcon, label: "Templates", active: false },
            { icon: SettingsIcon, label: "Settings", active: false },
          ].map((item) => (
            <span
              key={item.label}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                item.active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className="size-3.5" />
              {item.label}
            </span>
          ))}
          <span className="mt-2 rounded-lg bg-muted/60 px-2.5 py-2 text-[11px] font-medium">
            420 Credits
            <span className="block font-normal text-muted-foreground">
              Available
            </span>
          </span>
        </div>

        {/* outline + editor */}
        <div className="grid min-w-0 gap-0 md:grid-cols-[190px_minmax(0,1fr)]">
          <div className="hidden flex-col gap-1 border-r border-border/60 p-3 md:flex">
            <p className="px-1 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Document Outline
            </p>
            <span className="rounded-lg bg-primary/10 px-2 py-1.5 text-[11px] font-semibold text-primary">
              1. Introduction
            </span>
            {["1.1 Background", "1.2 Problem Statement", "1.3 Objectives"].map(
              (s) => (
                <span
                  key={s}
                  className="px-4 py-1 text-[11px] text-muted-foreground"
                >
                  {s}
                </span>
              ),
            )}
            {[
              "2. Literature Review",
              "3. Methodology",
              "4. Results",
              "5. Conclusion",
            ].map((s) => (
              <span
                key={s}
                className="rounded-lg px-2 py-1.5 text-[11px] text-muted-foreground"
              >
                {s}
              </span>
            ))}
            <span className="px-2 py-1 text-[11px] font-medium text-primary">
              + Add Section
            </span>
          </div>

          <div className="flex min-w-0 flex-col gap-3 p-4 sm:p-5">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2 text-muted-foreground">
              <BoldIcon className="size-3.5" />
              <ItalicIcon className="size-3.5" />
              <UnderlineIcon className="size-3.5" />
              <span className="mx-1 h-4 w-px bg-border" />
              <ListIcon className="size-3.5" />
              <QuoteIcon className="size-3.5" />
            </div>
            <p className="text-lg font-bold tracking-tight">1. Introduction</p>
            <div className="flex flex-col gap-2">
              <div className="h-2.5 w-full rounded-full bg-foreground/10" />
              <div className="h-2.5 w-full rounded-full bg-foreground/10" />
              <div className="h-2.5 w-11/12 rounded-full bg-foreground/10" />
              <div className="h-2.5 w-4/5 rounded-full bg-foreground/10" />
            </div>
            <p className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 font-medium text-accent-foreground">
                <QuoteIcon className="size-3" />
                (Ngo Bell, 2023)
              </span>
              <span className="text-muted-foreground">APA 7 citation</span>
            </p>
            <div className="h-24 rounded-xl bg-gradient-to-br from-primary/25 via-primary/10 to-accent" />
          </div>
        </div>

        {/* assistant */}
        <div className="hidden flex-col gap-2 border-l border-border/60 bg-muted/20 p-3.5 lg:flex">
          <p className="text-xs font-semibold">Cevo Assistant</p>
          <span className="mx-auto mt-1 flex size-10 items-center justify-center rounded-2xl bg-primary/10">
            <SparklesIcon className="size-5 text-primary" />
          </span>
          <p className="text-center text-[11px] font-medium">
            How can I help you?
          </p>
          {[
            "Improve this section",
            "Add citations",
            "Summarize this topic",
            "Generate an outline",
          ].map((label) => (
            <span
              key={label}
              className="rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-[11px] font-medium"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProofBand() {
  return (
    <div className="flex flex-col gap-4">
      <figure>
        <AppPreview />
        <figcaption className="sr-only">
          Preview of the Cevo workspace with navigation rail, document outline,
          chapter editor with citations, and AI assistant panel.
        </figcaption>
      </figure>
    </div>
  );
}

export function TrustStats() {
  const stats = [
    { value: "APA 7 + Harvard", label: "Deterministic citations" },
    { value: "XAF via MoMo", label: "MTN + Orange mobile money" },
    { value: "PDF + DOCX", label: "Template matched export" },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stats.map((s) => (
        <Card key={s.label} className="py-4">
          <CardHeader className="pb-1">
            <CardTitle className="text-base font-semibold">{s.value}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
