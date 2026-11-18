"use client";

import {
  BookOpenIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  FileSearchIcon,
  FileTextIcon,
  InboxIcon,
  SearchIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { SavedSourcesPanel } from "@/components/dashboard/research-saved";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { RESEARCH_WORK_TYPE_LABELS } from "@/lib/research";
import type {
  ResearchLibraryProject,
  ResearchLibrarySummary,
} from "@/lib/research-library";
import { cn } from "@/lib/utils";

type WorkType = keyof typeof RESEARCH_WORK_TYPE_LABELS;

type Hit = {
  doi: string | null;
  openAlexId: string | null;
  title: string;
  authors: { family: string; given?: string }[];
  year: number | null;
  venue: string | null;
  abstract: string | null;
  pdfUrl: string | null;
  isOpenAccess: boolean;
  verificationState: string;
  workType: WorkType;
  providerOrigin: string;
  doiState: string;
};

type Notice = { provider: string; code: string; message: string };

const TABS: { value: WorkType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "journal", label: "Journal Articles" },
  { value: "proceedings", label: "Conference Papers" },
  { value: "book", label: "Books" },
];

const MORE_TABS: { value: WorkType; label: string }[] = [
  { value: "dataset", label: "Datasets" },
  { value: "dissertation", label: "Theses" },
  { value: "other", label: "Other types" },
];

function verificationPill(state: string): {
  label: string;
  className: string;
  verified: boolean;
} {
  switch (state) {
    case "DOI_VERIFIED":
    case "FULL_TEXT_AVAILABLE":
    case "METADATA_VERIFIED":
      return {
        label: "Verified",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        verified: true,
      };
    case "REQUIRES_REVIEW":
      return {
        label: "Needs review",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        verified: false,
      };
    default:
      return {
        label: "Incomplete",
        className: "bg-muted text-muted-foreground",
        verified: false,
      };
  }
}

function authorLine(authors: Hit["authors"]): string {
  if (authors.length === 0) return "Unknown authors";
  const names = authors
    .slice(0, 4)
    .map((a) => a.family)
    .join(", ");
  return authors.length > 4 ? `${names} et al.` : names;
}

function ResultRow({
  hit,
  projects,
  targetProjectId,
  onTargetChange,
  onSaved,
}: {
  hit: Hit;
  projects: ResearchLibraryProject[];
  targetProjectId: string | null;
  onTargetChange: (value: string | null) => void;
  onSaved: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const pill = verificationPill(hit.verificationState);
  const typeLabel = RESEARCH_WORK_TYPE_LABELS[hit.workType] ?? hit.workType;
  const projectTitle = (id: string | null) =>
    (id !== null && projects.find((p) => p.id === id)?.title) || undefined;
  const canSave =
    !saving &&
    targetProjectId !== null &&
    (hit.doi !== null || hit.openAlexId !== null);

  async function handleSave() {
    if (!targetProjectId || saving) return;
    if (!hit.doi && !hit.openAlexId) {
      toast.error(
        "This result cannot be saved until it carries a DOI or OpenAlex ID.",
        { timeout: 4000 },
      );
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/projects/${targetProjectId}/research/sources`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ doi: hit.doi, openAlexId: hit.openAlexId }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        toast.error(
          "Save is capped at 60 per minute. Pause briefly, then try again.",
          { timeout: 4000 },
        );
        return;
      }
      if (!res.ok) {
        toast.error(
          (data.message as string) ??
            (data.error as string) ??
            "Save failed. Try again.",
          { timeout: 4000 },
        );
        return;
      }
      toast.success(
        (data.deduped as boolean)
          ? "Already in that project's library."
          : "Saved to the project library.",
        { timeout: 4000 },
      );
      onSaved();
    } catch {
      toast.error("Save failed. Check your connection and try again.", {
        timeout: 4000,
      });
    } finally {
      setSaving(false);
    }
  }

  const key = hit.doi ?? hit.openAlexId ?? hit.title;
  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/50 text-primary"
          aria-hidden="true"
        >
          <FileTextIcon className="size-4" />
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left"
        >
          <span className="w-full truncate text-[15px] font-semibold hover:underline">
            {hit.title}
          </span>
          <span className="w-full truncate text-xs text-muted-foreground">
            {authorLine(hit.authors)}
          </span>
          <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
            {hit.year ?? "n.d."} · {typeLabel}
            {hit.doi ? ` · DOI: ${hit.doi}` : ""}
          </span>
        </button>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
            pill.className,
          )}
        >
          {pill.verified && (
            <CheckCircle2Icon className="size-3.5" aria-hidden="true" />
          )}
          {pill.label}
        </span>
      </div>
      {open && (
        <div className="mt-3 ml-12 flex flex-col gap-3 rounded-xl bg-muted/40 p-3">
          {hit.abstract ? (
            <p className="line-clamp-4 text-[13px] leading-relaxed text-muted-foreground">
              {hit.abstract}
            </p>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              No abstract available for this record.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {projects.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                <Link
                  href="/dashboard/new"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Create a project
                </Link>{" "}
                first to save sources.
              </span>
            ) : (
              <>
                <Select
                  value={targetProjectId ?? ""}
                  itemToStringLabel={(v) =>
                    typeof v === "string" ? (projectTitle(v) ?? v) : ""
                  }
                  onValueChange={onTargetChange}
                >
                  <SelectTrigger
                    className="h-9 min-w-0 flex-1 text-xs sm:max-w-64"
                    aria-label="Save to project"
                  >
                    <SelectValue placeholder="Choose a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!canSave}
                  onClick={() => void handleSave()}
                >
                  {saving && <Spinner aria-hidden="true" />}
                  {saving ? "Saving…" : "Save to project"}
                </Button>
              </>
            )}
            {(hit.pdfUrl || hit.doi) && (
              <a
                href={hit.pdfUrl ?? `https://doi.org/${hit.doi}`}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Open source
              </a>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {hit.providerOrigin}
            {hit.isOpenAccess ? " · Open access" : ""}
            {key === hit.title
              ? " · Title-only record: saving needs a DOI or OpenAlex ID"
              : ""}
          </p>
        </div>
      )}
    </li>
  );
}

export function ResearchBrowser({
  initialSummary,
}: {
  initialSummary: ResearchLibrarySummary;
}) {
  const [input, setInput] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [tab, setTab] = React.useState<WorkType | "all">("all");
  const [hits, setHits] = React.useState<Hit[]>([]);
  const [notices, setNotices] = React.useState<Notice[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [searched, setSearched] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState(initialSummary);
  const [panelExpanded, setPanelExpanded] = React.useState(false);
  const [targetProjectId, setTargetProjectId] = React.useState<string | null>(
    initialSummary.projects[0]?.id ?? null,
  );

  const selectedProjectTitle = (id: string | null) =>
    (id !== null && summary.projects.find((p) => p.id === id)?.title) ||
    undefined;

  async function refreshSummary() {
    try {
      const res = await fetch("/api/dashboard/research/library", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as ResearchLibrarySummary;
      setSummary(data);
      setTargetProjectId((prev) =>
        prev && data.projects.some((p) => p.id === prev)
          ? prev
          : (data.projects[0]?.id ?? null),
      );
    } catch {
      /* panel refresh is best effort */
    }
  }

  async function runSearch(
    q: string,
    t: WorkType | "all",
    next?: string | null,
  ) {
    const trimmed = q.trim();
    if (!trimmed) {
      setHits([]);
      setSearched(false);
      setNotices([]);
      setCursor(null);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: trimmed, type: t });
      if (next) params.set("cursor", next);
      const res = await fetch(
        `/api/dashboard/research/search?${params.toString()}`,
        {
          cache: "no-store",
        },
      );
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setError(
          "Search is capped at 30 per minute. Pause briefly, then try again.",
        );
        return;
      }
      if (!res.ok) {
        setError((data.error as string) ?? "Search failed. Try again.");
        return;
      }
      setHits(
        next
          ? [...hits, ...((data.hits ?? []) as Hit[])]
          : ((data.hits ?? []) as Hit[]),
      );
      setNotices((data.providerNotices ?? []) as Notice[]);
      setCursor((data.nextCursor as string | null) ?? null);
      setSearched(true);
    } catch {
      setError("Search failed. Check your connection and try again.");
    } finally {
      setSearching(false);
    }
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    void runSearch(input, tab, null);
  }

  function pickTab(t: WorkType | "all") {
    setTab(t);
    if (query.trim() || input.trim()) {
      void runSearch(input.trim() ? input : query, t, null);
      setQuery(input.trim() ? input : query);
    }
  }

  const moreActive = MORE_TABS.some((m) => m.value === tab);

  return (
    <div className="flex flex-col gap-5">
      <search aria-label="Search research papers">
        <form onSubmit={submit} className="flex items-center gap-2 sm:gap-3">
          <div className="relative min-w-0 flex-1">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search research papers..."
              aria-label="Search research papers"
              className="h-11 rounded-xl border-border/60 bg-muted/50 pr-9 pl-10"
            />
            {input !== "" && (
              <button
                type="button"
                onClick={() => {
                  setInput("");
                  setHits([]);
                  setSearched(false);
                  setNotices([]);
                  setCursor(null);
                  setError(null);
                  setQuery("");
                }}
                aria-label="Clear search"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
          <Button
            type="submit"
            disabled={searching || input.trim() === ""}
            className="h-11 shrink-0 rounded-xl px-4 sm:px-5"
          >
            {searching ? (
              <Spinner aria-hidden="true" />
            ) : (
              <SearchIcon aria-hidden="true" />
            )}
            <span className="hidden sm:inline">Search</span>
          </Button>
        </form>
      </search>

      <div className="flex flex-col gap-3">
        <Select
          value={targetProjectId ?? ""}
          itemToStringLabel={(v) =>
            typeof v === "string" ? (selectedProjectTitle(v) ?? v) : ""
          }
          onValueChange={setTargetProjectId}
          disabled={summary.projects.length === 0}
        >
          <SelectTrigger
            className="h-10 w-full sm:max-w-xs"
            aria-label="Save to project"
          >
            <SelectValue
              placeholder={
                summary.projects.length === 0
                  ? "No projects yet — create one to save sources"
                  : "Choose a project to save to"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {summary.projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {summary.projects.length === 0 && (
          <p className="text-xs text-muted-foreground">
            <Link
              href="/dashboard/new"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Create a project
            </Link>{" "}
            to start saving sources.
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <div
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
          role="toolbar"
          aria-label="Filter by publication type"
        >
          {TABS.map((t) => {
            const active = tab === t.value;
            return (
              <button
                key={t.value}
                type="button"
                aria-pressed={active}
                onClick={() => pickTab(t.value)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary/10 font-semibold text-primary"
                    : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            );
          })}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-pressed={moreActive}
                  aria-label="More publication types"
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors",
                    moreActive
                      ? "bg-primary/10 font-semibold text-primary"
                      : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  More
                  <ChevronDownIcon className="size-3.5" aria-hidden="true" />
                </button>
              }
            />
            <DropdownMenuContent
              align="start"
              aria-label="More publication types"
            >
              {MORE_TABS.map((m) => (
                <DropdownMenuItem
                  key={m.value}
                  onClick={() => pickTab(m.value)}
                >
                  {tab === m.value ? (
                    <CheckCircle2Icon aria-hidden="true" />
                  ) : (
                    <span className="size-4" aria-hidden="true" />
                  )}
                  {m.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {searching
          ? "Searching verified papers"
          : searched
            ? `${hits.length} result${hits.length === 1 ? "" : "s"}`
            : "Type a query and press Search"}
      </p>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          {searching && hits.length === 0 && (
            <output className="flex flex-col gap-3" aria-label="Searching">
              {["s1", "s2", "s3"].map((id) => (
                <div
                  key={id}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-4 sm:px-5"
                >
                  <Skeleton className="size-9 rounded-lg" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </output>
          )}
          {error && (
            <Alert variant="destructive">
              <TriangleAlertIcon aria-hidden="true" />
              <AlertTitle>Search failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void runSearch(query || input, tab, null)}
                >
                  Retry
                </Button>
              </div>
            </Alert>
          )}
          {notices.map((n) => (
            <output
              key={`${n.provider}-${n.code}`}
              className="block text-xs text-muted-foreground"
            >
              {n.message}
            </output>
          ))}
          {!searching && !error && searched && hits.length === 0 && (
            <Empty className="border border-border/60">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <InboxIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No verified papers matched</EmptyTitle>
                <EmptyDescription>
                  Try fewer keywords, the exact article title, or paste a DOI.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {!searching && !error && !searched && (
            <Empty className="border border-border/60">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileSearchIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Search verified research</EmptyTitle>
                <EmptyDescription>
                  Papers are checked against OpenAlex and Crossref before they
                  reach this list. Save the ones that matter to a project.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {!error && hits.length > 0 && (
            <section
              aria-label="Search results"
              className="overflow-hidden rounded-2xl border border-border/60 bg-card"
            >
              <ul className="divide-y divide-border/40">
                {hits.map((h) => (
                  <ResultRow
                    key={h.doi ?? h.openAlexId ?? h.title}
                    hit={h}
                    projects={summary.projects}
                    targetProjectId={targetProjectId}
                    onTargetChange={setTargetProjectId}
                    onSaved={() => void refreshSummary()}
                  />
                ))}
              </ul>
            </section>
          )}
          {!error && cursor && (
            <div>
              <Button
                variant="outline"
                disabled={searching}
                onClick={() => void runSearch(query || input, tab, cursor)}
              >
                {searching && <Spinner aria-hidden="true" />}
                Load more results
              </Button>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <SavedSourcesPanel
            groups={summary.groups}
            expanded={panelExpanded}
            onToggleExpanded={() => setPanelExpanded((v) => !v)}
          />
          <section
            aria-label="About verification"
            className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 sm:p-5"
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
              aria-hidden="true"
            >
              <BookOpenIcon className="size-4" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-sm font-bold">Verified sources only</span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                Every result is checked against OpenAlex and Crossref. Save a
                source to a project to cite it in your chapters.
              </span>
            </span>
          </section>
        </div>
      </div>
    </div>
  );
}
