"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Detail = {
  user: { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string };
  wallet: { balance: number };
  payments: Array<{ id: string; status: string; amountXaf: number }>;
  tickets: Array<{ id: string; subject: string; status: string }>;
};

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void params.then((p) => setId(p.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = useCallback(async (path: string, body: Record<string, unknown>) => {
    if (!id) return;
    setError(null);
    const res = await fetch(`/api/admin/users/${id}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError(`Action failed (${res.status})`);
      return;
    }
    await load();
  }, [id, load]);

  if (loading) return <div role="status" aria-label="Loading user"><Skeleton className="h-40 w-full" /></div>;
  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">No user found.</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-2xl">{data.user.name}</h1>
      <Card><CardHeader><CardTitle>User</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <span>{data.user.email}</span>
          <Badge>{data.user.role}</Badge>
          <Badge variant={data.user.isActive ? "default" : "secondary"}>{data.user.isActive ? "Active" : "Suspended"}</Badge>
          <span className="text-muted-foreground">Balance {data.wallet.balance}</span>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => void act("status", { isActive: !data.user.isActive })}>
          {data.user.isActive ? "Suspend" : "Activate"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => void act("role", { role: "ADMIN" })}>Make ADMIN (SUPER only)</Button>
        <Button variant="outline" size="sm" onClick={() => void act("role", { role: "STUDENT" })}>Make STUDENT (SUPER only)</Button>
      </div>
      <Card><CardHeader><CardTitle>Recent payments (10)</CardTitle></CardHeader>
        <CardContent>{data.payments.length === 0 ? <p className="text-sm text-muted-foreground">No payments yet.</p> : <ul className="text-sm">{data.payments.map((p) => <li key={p.id}>{p.id} · {p.status} · {p.amountXaf.toLocaleString("en-US")} XAF</li>)}</ul>}</CardContent>
      </Card>
      <Card><CardHeader><CardTitle>Recent tickets (10)</CardTitle></CardHeader>
        <CardContent>{data.tickets.length === 0 ? <p className="text-sm text-muted-foreground">No tickets yet.</p> : <ul className="text-sm">{data.tickets.map((t) => <li key={t.id}>{t.subject} · {t.status}</li>)}</ul>}</CardContent>
      </Card>
    </div>
  );
}
