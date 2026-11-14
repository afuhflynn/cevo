"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminPaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [data, setData] = useState<{ payment: Record<string, unknown>; ledgers: Array<Record<string, unknown>>; webhookEvents: Array<Record<string, unknown>> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void params.then((p) => setId(p.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/${id}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const recheck = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/admin/payments/${id}/recheck`, { method: "POST" });
    if (!res.ok) setError(`Recheck failed (${res.status})`);
    await load();
  }, [id, load]);

  if (loading) return <div role="status" aria-label="Loading payment"><Skeleton className="h-40 w-full" /></div>;
  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Not found.</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-2xl">Payment {String(data.payment["id"]).slice(0, 8)}</h1>
      <Card><CardHeader><CardTitle>Payment</CardTitle></CardHeader>
        <CardContent><pre className="overflow-auto text-xs">{JSON.stringify(data.payment, null, 2)}</pre></CardContent>
      </Card>
      <Button variant="outline" size="sm" className="w-fit" onClick={() => void recheck()}>Recheck via provider</Button>
      <Card><CardHeader><CardTitle>Ledger entries</CardTitle></CardHeader>
        <CardContent>{data.ledgers.length === 0 ? <p className="text-sm text-muted-foreground">No ledger rows linked. For a SUCCESSFUL row this means allocation is missing; check reconcile.</p> : <pre className="overflow-auto text-xs">{JSON.stringify(data.ledgers, null, 2)}</pre>}</CardContent>
      </Card>
      <Card><CardHeader><CardTitle>Webhook events</CardTitle></CardHeader>
        <CardContent><pre className="overflow-auto text-xs">{JSON.stringify(data.webhookEvents, null, 2)}</pre></CardContent>
      </Card>
    </div>
  );
}
