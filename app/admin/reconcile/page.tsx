"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type Rec = {
  date: string;
  confirmedCredits: number;
  confirmedXaf: number;
  allocatedSum: number;
  diff: number;
  alert: boolean;
  inGrace: boolean;
  paymentIds: string[];
  ledgerRefs: Array<string | null>;
};

export default function AdminReconcilePage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<Rec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reconcile/daily?date=${date}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-2xl">Daily reconcile (UTC, zero tolerance)</h1>
      <Input aria-label="Reconcile date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-48" />
      {loading ? <div role="status" aria-label="Loading reconcile"><Skeleton className="h-32 w-full" /></div>
        : error ? <p role="alert" className="text-sm text-destructive">{error}</p>
        : data ? (
          <Card><CardHeader><CardTitle>{data.date} {data.alert ? "· mismatch" : "· balanced"}</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <p>Confirmed credits: {data.confirmedCredits} · XAF {data.confirmedXaf.toLocaleString("en-US")}</p>
              <p>Allocated ledger: {data.allocatedSum}</p>
              <p>Diff: {data.diff} {data.inGrace ? "(in 15 min grace; alert suppressed)" : ""}</p>
              <p className="mt-2 text-muted-foreground">Payments: {data.paymentIds.join(", ") || "none"}</p>
              <p className="text-muted-foreground">Ledger refs: {data.ledgerRefs.join(", ") || "none"}</p>
            </CardContent>
          </Card>
        ) : null}
    </div>
  );
}
