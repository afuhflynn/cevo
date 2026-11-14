"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

type Row = { id: string; subject: string; status: string; priority: string; assigneeId: string | null; updatedAt: string };

export default function AdminTicketsPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/tickets?${params.toString()}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setItems(data.items ?? []);
      setHasMore(Boolean(data.hasMore));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl">Support tickets</h1>
      <div className="flex gap-2">
        <select aria-label="Status filter" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="rounded-md border bg-background px-2 py-1 text-sm">
          <option value="">All statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="CLOSED">CLOSED</option>
        </select>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading ? <div role="status" aria-label="Loading tickets" className="flex flex-col gap-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
        : items.length === 0 ? <Empty><EmptyTitle>No tickets in this queue</EmptyTitle><EmptyDescription>New student requests will appear here. Adjust the status filter to check other queues.</EmptyDescription></Empty>
        : (
          <ul className="flex flex-col gap-2">
            {items.map((t) => (
              <li key={t.id}><Card><CardContent className="flex flex-wrap items-center gap-2 py-3 text-sm">
                <Link href={`/admin/tickets/${t.id}`} className="font-medium underline">{t.subject}</Link>
                <Badge>{t.status}</Badge>
                <Badge variant="secondary">{t.priority}</Badge>
                {t.assigneeId && <span className="text-xs text-muted-foreground">assignee {t.assigneeId.slice(0, 8)}</span>}
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
