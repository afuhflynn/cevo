"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

type Row = { id: string; action: string; targetType: string; targetId: string; createdAt: string; actor: { id: string; name?: string; email?: string; role?: string } | null };

export default function AdminAuditPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (action.trim()) params.set("action", action.trim());
      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setItems(data.items ?? []);
      setHasMore(Boolean(data.hasMore));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [action, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl">Audit viewer</h1>
      <select aria-label="Action filter" value={action} onChange={(e) => { setPage(1); setAction(e.target.value); }} className="w-fit rounded-md border bg-background px-2 py-1 text-sm">
        <option value="">All actions</option>
        <option value="user.role.change">user.role.change</option>
        <option value="user.status.change">user.status.change</option>
        <option value="payment.recheck">payment.recheck</option>
        <option value="ticket.assign">ticket.assign</option>
        <option value="ticket.close">ticket.close</option>
        <option value="ticket.reopen">ticket.reopen</option>
      </select>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading ? <div role="status" aria-label="Loading audit"><Skeleton className="h-24 w-full" /></div>
        : items.length === 0 ? <Empty><EmptyTitle>No audit rows match</EmptyTitle><EmptyDescription>Every admin write creates one row. Adjust the action filter to search history.</EmptyDescription></Empty>
        : (
          <ul className="flex flex-col gap-2">
            {items.map((a) => (
              <li key={a.id}><Card><CardContent className="flex flex-wrap gap-2 py-3 text-sm">
                <Badge variant="secondary">{a.action}</Badge>
                <span>{a.targetType} {a.targetId}</span>
                <span className="text-muted-foreground">{a.actor?.email ?? "system"} {a.actor?.role ? `(${a.actor.role})` : ""}</span>
                <span className="ml-auto text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
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
