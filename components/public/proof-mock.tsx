import {
  FileDownIcon,
  FoldersIcon,
  QuoteIcon,
  SearchCheckIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Honest static previews of real product shapes.
 * No screenshots, no new colors, foundation primitives only.
 * Alt text lives on the wrapping figure in the caller.
 */
export function WorkspaceMock() {
  return (
    <div
      aria-hidden="true"
      className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:p-5"
    >
      <div className="flex flex-col gap-1.5 rounded-xl border border-border/70 bg-muted/40 p-3">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <FoldersIcon className="size-3.5" aria-hidden="true" />
          Chapters
        </p>
        <ul className="flex flex-col gap-1 text-xs">
          <li className="rounded-md bg-primary/10 px-2 py-1.5 font-medium text-foreground">
            1. Introduction
          </li>
          <li className="rounded-md px-2 py-1.5 text-muted-foreground">
            2. Literature review
          </li>
          <li className="rounded-md px-2 py-1.5 text-muted-foreground">
            3. Methodology
          </li>
        </ul>
      </div>
      <div className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-border/70 bg-background p-4">
        <div className="h-3.5 w-2/5 rounded-full bg-foreground/15" />
        <div className="h-2.5 w-full rounded-full bg-foreground/10" />
        <div className="h-2.5 w-11/12 rounded-full bg-foreground/10" />
        <div className="h-2.5 w-3/5 rounded-full bg-foreground/10" />
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="inline-flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 font-medium text-accent-foreground">
            <QuoteIcon className="size-3" aria-hidden="true" />
            (Ngo Bell, 2023)
          </span>
          <span className="text-muted-foreground">APA 7 citation chip</span>
        </p>
        <p className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="gap-1 text-[11px]">
            <FileDownIcon className="size-3" aria-hidden="true" />
            PDF
          </Badge>
          <Badge variant="secondary" className="gap-1 text-[11px]">
            <FileDownIcon className="size-3" aria-hidden="true" />
            DOCX
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            Export keeps margins and numbering
          </span>
        </p>
      </div>
    </div>
  );
}

export function CitationMock() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <SearchCheckIcon className="size-3.5" aria-hidden="true" />
        Verified research result
      </p>
      <div className="rounded-xl border border-border/70 bg-background p-3.5">
        <p className="text-sm font-medium text-foreground">
          Community health workers and antenatal coverage in rural Cameroon
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ngo Bell et al. · 2023 · OpenAlex · DOI 10.1234/example
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium">
            Save to library
          </span>
          <span className="rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground">
            Insert APA 7
          </span>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Real papers only. No invented references.
      </p>
    </div>
  );
}

export function ProofBand() {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <figure className="lg:col-span-3">
        <WorkspaceMock />
        <figcaption className="sr-only">
          Preview of the Cevo workspace with chapters plus citations plus
          export options.
        </figcaption>
      </figure>
      <figure className="lg:col-span-2">
        <CitationMock />
        <figcaption className="sr-only">
          Sample verified research card with save plus insert actions.
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
