import { FileTextIcon } from "lucide-react";
import Link from "next/link";
import type { VisibleTemplate } from "@/lib/dashboard-templates";
import { cn } from "@/lib/utils";

export function InstitutionTabs({
  tabs,
  active,
  hrefFor,
}: {
  tabs: { value: string; label: string }[];
  active: string;
  hrefFor: (value: string) => string;
}) {
  return (
    <div
      className="flex min-w-0 items-center gap-1 overflow-x-auto"
      role="toolbar"
      aria-label="Filter by institution"
    >
      {tabs.map((t) => {
        const isActive = active === t.value;
        return (
          <Link
            key={t.value}
            href={hrefFor(t.value)}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors",
              isActive
                ? "bg-primary/10 font-semibold text-primary"
                : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

export function TemplateCard({ template }: { template: VisibleTemplate }) {
  return (
    <li className="flex h-full flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card p-6 text-center sm:p-8">
      <span
        className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
        aria-hidden="true"
      >
        <FileTextIcon className="size-8" />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-[15px] font-bold">{template.title}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          v{template.version} · PDF · DOCX
        </span>
      </span>
      <Link
        href={`/dashboard/new?template=${encodeURIComponent(template.versionId)}`}
        aria-label={`Use template ${template.title}`}
        className="mt-auto inline-flex h-11 w-full items-center justify-center rounded-xl border border-primary/40 px-4 text-[15px] font-semibold text-primary transition-colors hover:bg-primary/5"
      >
        Use Template
      </Link>
    </li>
  );
}
