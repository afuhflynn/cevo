"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type TemplateItem = {
  id: string;
  title: string;
  qualification: string;
  isActive: boolean;
  isOfficial: boolean;
  latestVersion: { version: number; isPublished: boolean } | null;
};

export default function AdminTemplatesPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/templates?${params.toString()}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setItems(data.templates ?? []);
      setTotal(data.total ?? 0);
      setHasMore(!!data.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  async function createTemplate() {
    if (title.trim().length < 3) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          qualification: "BACHELORS",
        }),
      });
      if (!res.ok) throw new Error(`Create failed (${res.status})`);
      setTitle("");
      setPage(1);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Admin / Templates</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Institutional templates
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} total · versioned rules locked to projects at approval
          </p>
        </div>
        <Link
          href="/admin/templates/drafts"
          className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
        >
          Review extraction drafts
        </Link>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Create template</CardTitle>
          <CardDescription>
            Opens draft version 1 for manual rules or assisted extraction.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input
            aria-label="New template title"
            placeholder="e.g. University of Buea · Computer Science · Bachelors"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button
            onClick={createTemplate}
            disabled={creating || title.trim().length < 3}
          >
            {creating ? "Creating…" : "Create draft"}
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6 flex gap-3">
        <Input
          aria-label="Search templates"
          placeholder="Search by title…"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />
      </div>

      {loading ? (
        <div className="mt-6 grid gap-3" aria-label="Loading templates">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : error ? (
        <Card className="mt-6">
          <CardContent className="py-8 text-center">
            <p className="text-sm font-medium">Could not load templates</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <Button className="mt-4" variant="outline" onClick={load}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <div className="mt-6">
          <Empty>
            <EmptyTitle>No templates yet</EmptyTitle>
            <EmptyDescription>
              Create your first draft above, then publish a version so matching
              can use it.
            </EmptyDescription>
          </Empty>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {items.map((t) => (
            <Link key={t.id} href={`/admin/templates/${t.id}`}>
              <Card className="transition hover:shadow-md">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium">{t.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {t.qualification} · v{t.latestVersion?.version ?? 1} ·{" "}
                      {t.latestVersion?.isPublished ? "published" : "draft"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {t.isOfficial ? (
                      <Badge>Official</Badge>
                    ) : (
                      <Badge variant="outline">Custom</Badge>
                    )}
                    {t.isActive ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Badge variant="destructive">Archived</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </Button>
        <p className="text-sm text-muted-foreground">Page {page}</p>
        <Button
          variant="outline"
          disabled={!hasMore}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </main>
  );
}
