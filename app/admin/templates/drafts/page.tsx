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
import { Skeleton } from "@/components/ui/skeleton";

type DraftItem = {
  id: string;
  templateId: string | null;
  status: string;
  createdAt: string;
};

export default function DraftsPage() {
  const [items, setItems] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/templates/drafts?limit=20");
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      const data = await res.json();
      setItems(data.drafts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <Link
        href="/admin/templates"
        className="inline-flex h-7 items-center justify-center rounded-lg px-2.5 text-sm hover:bg-muted"
      >
        ← Templates
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Extraction drafts
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Review model proposals before they reach a version. Applying runs once.
      </p>

      {loading ? (
        <div className="mt-6 grid gap-3" aria-label="Loading drafts">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : error ? (
        <Card className="mt-6">
          <CardContent className="py-8 text-center">
            <p className="font-medium">Could not load drafts</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <Button className="mt-4" variant="outline" onClick={load}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <div className="mt-6">
          <Empty>
            <EmptyTitle>No drafts</EmptyTitle>
            <EmptyDescription>
              Run an extraction from a template page. Scanned PDFs with no text
              fall back to blank drafts.
            </EmptyDescription>
          </Empty>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {items.map((d) => (
            <Link key={d.id} href={`/admin/templates/drafts/${d.id}`}>
              <Card className="transition hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">
                    Draft {d.id.slice(0, 8)}…
                  </CardTitle>
                  <CardDescription>
                    {new Date(d.createdAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge
                    variant={d.status === "open" ? "secondary" : "outline"}
                  >
                    {d.status}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
