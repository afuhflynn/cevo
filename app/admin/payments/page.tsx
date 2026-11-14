"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type Row = {
  id: string;
  status: string;
  amountXaf: number;
  provider: string;
  userId: string;
  createdAt: string;
  completedAt: string | null;
  ledgerRef: string;
};

export default function AdminPaymentsPage() {
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
      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setItems(data.items ?? []);
      setHasMore(Boolean(data.hasMore));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl">Payments</h1>
        <p className="text-sm text-muted-foreground">Package, XAF, provider, status, ledger link. Revenue never subtracts refunds; refunds are separate ledger lines.</p>
      </div>
      <div className="flex gap-2">
        <select aria-label="Status filter" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="rounded-md border bg-background px-2 py-1 text-sm">
          <option value="">All statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="SUCCESSFUL">SUCCESSFUL</option>
          <option value="FAILED">FAILED</option>
          <option value="EXPIRED">EXPIRED</option>
        </select>
        <Link href="/admin/reconcile" className="rounded-md border px-3 py-1.5 text-sm">Open reconcile</Link>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <div role="status" aria-label="Loading payments" className="flex flex-col gap-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
      ) : items.length === 0 ? (
        <Empty><EmptyTitle>No payments match</EmptyTitle><EmptyDescription>Adjust the status filter, then open a row to see its ledger entries.</EmptyDescription></Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((p) => (
            <li key={p.id}>
              <Card><CardContent className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <Link href={`/admin/payments/${p.id}`} className="font-medium underline">{p.id.slice(0, 8)}</Link>
                <span>{p.amountXaf.toLocaleString("en-US")} XAF</span>
                <span className="text-muted-foreground">{p.provider}</span>
                <Badge>{p.status}</Badge>
                <span className="text-xs text-muted-foreground">{p.ledgerRef}</span>
              </CardContent></Card>
            </li>
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
