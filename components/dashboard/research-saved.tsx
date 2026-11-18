"use client";

import { BookmarkIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import type { ResearchLibraryGroup } from "@/lib/research-library";
import { cn } from "@/lib/utils";

export function SavedSourcesPanel({
  groups,
  expanded,
  onToggleExpanded,
}: {
  groups: ResearchLibraryGroup[];
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const visible = expanded ? groups : groups.slice(0, 3);
  return (
    <section
      aria-label="Saved Sources"
      className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold">Saved Sources</h2>
        {groups.length > 3 && (
          <button
            type="button"
            onClick={onToggleExpanded}
            aria-expanded={expanded}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
          >
            {expanded ? "Show less" : "View all"}
            <ChevronRightIcon
              className={cn(
                "size-3.5 transition-transform",
                expanded && "rotate-90",
              )}
              aria-hidden="true"
            />
          </button>
        )}
      </div>
      {groups.length === 0 ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Nothing saved yet. Search above, open a result, and save it to a
          project.
        </p>
      ) : (
        <ul className="flex flex-col">
          {visible.map((g) => (
            <li key={g.projectId}>
              <Link
                href={`/dashboard/projects/${g.projectId}/workspace`}
                className="group flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-muted/60"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/50 text-primary"
                  aria-hidden="true"
                >
                  <BookmarkIcon className="size-4" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold group-hover:underline">
                    {g.title}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    ({g.count} source{g.count === 1 ? "" : "s"})
                  </span>
                </span>
                <ChevronRightIcon
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
