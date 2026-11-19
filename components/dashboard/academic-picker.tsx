"use client";

import { SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

export type Item = {
  id: string;
  name: string;
  code?: string | null;
  city?: string | null;
  qualification?: string | null;
};

export type SearchResult = {
  ok: boolean;
  items?: Item[];
  hasMore?: boolean;
  error?: string;
};

function itemSubtitle(item: Item): string | null {
  const parts = [item.code, item.city ?? item.qualification].filter(Boolean);
  return parts.length > 0 ? (parts.join(" · ") as string) : null;
}

function PickerShell({
  label,
  description,
  error,
  children,
}: {
  label: string;
  description: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel>{label}</FieldLabel>
      <FieldDescription>{description}</FieldDescription>
      {children}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

export function AcademicPicker({
  label,
  description,
  placeholder,
  searchPlaceholder,
  parentReady,
  parentHint,
  customParentActive,
  allowCustom = true,
  selected,
  customText,
  onPick,
  onClear,
  onCustomText,
  doSearch,
  error,
}: {
  label: string;
  description: string;
  placeholder: string;
  searchPlaceholder: string;
  parentReady: boolean;
  parentHint: string;
  customParentActive: boolean;
  allowCustom?: boolean;
  selected: Item | null;
  customText: string;
  onPick: (item: Item) => void;
  onClear: () => void;
  onCustomText?: (value: string) => void;
  doSearch: (query: string, page: number) => Promise<SearchResult>;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [typedMode, setTypedMode] = useState(false);
  const [draft, setDraft] = useState(customText);
  const requestId = useRef(0);

  const searchAllowed = parentReady && !customParentActive;
  const answered = !!selected || customText.trim().length > 0;
  const selectedId = selected ? selected.id : null;
  const showTyped = allowCustom && (customParentActive || typedMode);

  async function runQuery(q: string, p: number, append: boolean) {
    if (!searchAllowed) return;
    const id = ++requestId.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const r = await doSearch(q, p);
      if (requestId.current !== id) return;
      if (r.ok) {
        setItems((prev) =>
          append
            ? [...prev, ...((r.items ?? []) as Item[])]
            : ((r.items ?? []) as Item[]),
        );
        setPage(p);
        setHasMore(!!r.hasMore);
        setSearched(true);
      }
    } finally {
      if (requestId.current === id) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: runQuery closes over the fresh doSearch prop each render by design; the debounce plus open/searchAllowed guards make refires harmless, matching onboarding behavior verbatim.
  useEffect(() => {
    if (!searchAllowed || !open) return;
    const t = setTimeout(() => {
      void runQuery(query, 1, false);
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, searchAllowed, open]);

  const subtitle = selected ? itemSubtitle(selected) : null;

  return (
    <PickerShell label={label} description={description} error={error}>
      {answered ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {selected ? selected.name : customText.trim()}
            </p>
            {selected && subtitle ? (
              <p className="truncate text-xs text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
            {!selected && customText.trim() ? (
              <p className="text-xs text-muted-foreground">
                Your name, saved with this step
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onClear();
              onCustomText?.("");
              setTypedMode(false);
              setDraft("");
              setQuery("");
            }}
          >
            Change
          </Button>
        </div>
      ) : null}

      {!answered && !searchAllowed && !customParentActive ? (
        <div className="rounded-lg border border-dashed px-3 py-3">
          <p className="text-sm text-muted-foreground">{parentHint}</p>
        </div>
      ) : null}

      {!answered && showTyped ? (
        <div className="flex flex-col gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Type the exact ${label.toLowerCase()} name`}
            aria-label={`Type the ${label.toLowerCase()} name`}
            maxLength={120}
            className="h-12 rounded-xl"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {draft.trim().length < 2
                ? "Type at least 2 characters, then confirm."
                : "Look right? Confirm it to continue."}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              {searchAllowed ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTypedMode(false);
                    setDraft(customText);
                  }}
                >
                  Search the list instead
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                disabled={draft.trim().length < 2}
                onClick={() => {
                  onCustomText?.(draft.trim());
                }}
              >
                Use this name
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {!answered && customParentActive && !allowCustom ? (
        <div className="rounded-lg border border-dashed px-3 py-3">
          <p className="text-sm text-muted-foreground">{parentHint}</p>
        </div>
      ) : null}

      {!answered && searchAllowed && !showTyped ? (
        <>
          <Combobox
            value={selectedId}
            onValueChange={(id: string | null) => {
              if (!id) return;
              const found = items.find((i) => i.id === id);
              if (found) {
                onPick(found);
                setOpen(false);
                setQuery("");
              }
            }}
            inputValue={query}
            onInputValueChange={(v: string) => setQuery(v)}
            open={open}
            onOpenChange={(o: boolean) => setOpen(o)}
          >
            <ComboboxInput
              placeholder={selected ? searchPlaceholder : placeholder}
              aria-label={label}
              onFocus={() => {
                setOpen(true);
                if (!searched && !loading) void runQuery(query, 1, false);
              }}
            />
            <ComboboxContent>
              {loading ? (
                <div className="flex flex-col gap-2 p-2" aria-live="polite">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : (
                <ComboboxList>
                  {items.map((item) => (
                    <ComboboxItem key={item.id} value={item.id}>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{item.name}</span>
                        {itemSubtitle(item) ? (
                          <span className="truncate text-xs text-muted-foreground">
                            {itemSubtitle(item)}
                          </span>
                        ) : null}
                      </span>
                    </ComboboxItem>
                  ))}
                  <ComboboxEmpty>
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <SearchIcon aria-hidden="true" />
                        </EmptyMedia>
                        <EmptyTitle>No matches found</EmptyTitle>
                        <EmptyDescription>
                          Nothing matches this search. Suggest the name below to
                          continue without waiting.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </ComboboxEmpty>
                </ComboboxList>
              )}
              {!loading && hasMore ? (
                <div className="border-t p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    disabled={loadingMore}
                    onClick={() => void runQuery(query, page + 1, true)}
                  >
                    {loadingMore && <Spinner aria-hidden="true" />}
                    {loadingMore ? "Loading more" : "Show more results"}
                  </Button>
                </div>
              ) : null}
            </ComboboxContent>
          </Combobox>
          {allowCustom ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start px-1 text-muted-foreground"
              onClick={() => setTypedMode(true)}
            >
              Can&apos;t find it? Type the name instead
            </Button>
          ) : null}
        </>
      ) : null}
    </PickerShell>
  );
}
