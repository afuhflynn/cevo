"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type Run = { id: string; feature: string; model: string; tokensIn: number; tokensOut: number; costEst: number; userId: string; project: string; createdAt: string };

export default function AdminAiUsagePage() {
  const [items, setItems] = useState<Run[]>([]);
  const [totals, setTotals] = useState<Record<string, Record<string, { tokensIn: number; tokensOut: number; cost: number; runs: number }>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ai-usage?page=${page}&limit=20`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setItems(data.items ?? []);
      setTotals(data.totals7d ?? null);
      setHasMore(Boolean(data.hasMore));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl">AI usage</h1>
      {totals && (
        <Card><CardHeader><CardTitle>7 day totals</CardTitle></CardHeader>
          <CardContent><pre className="overflow-auto text-xs">{JSON.stringify(totals, null, 2)}</pre></CardContent>
        </Card>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading ? <div role="status" aria-label="Loading AI usage" className="flex flex-col gap-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
        : items.length === 0 ? <Empty><EmptyTitle>No AI runs yet</EmptyTitle><EmptyDescription>Runs from wizard, assistant, and review will appear here with 7 day totals above.</EmptyDescription></Empty>
        : (
          <ul className="flex flex-col gap-2">
            {items.map((r) => (
              <li key={r.id}><Card><CardContent className="py-3 text-sm">
                <p>{r.feature} · {r.model} · in {r.tokensIn} / out {r.tokensOut} · ${r.costEst.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{r.project} · {new Date(r.createdAt).toLocaleString()}</p>
              </CardContent></Card></li>
            ))}
          </ul>
        )}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
        <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
