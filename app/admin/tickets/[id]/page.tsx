"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [data, setData] = useState<{ ticket: { id: string; subject: string; status: string }; thread: Array<{ id: string; message: string; isAdmin: boolean; createdAt: string }> } | null>(null);
  const [assignee, setAssignee] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void params.then((p) => setId(p.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tickets/${id}`);
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

  const post = useCallback(async (path: string, body: Record<string, unknown>) => {
    if (!id) return;
    const res = await fetch(`/api/admin/tickets/${id}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) setError(`${path} failed (${res.status})`);
    await load();
  }, [id, load]);

  if (loading) return <div role="status" aria-label="Loading ticket"><Skeleton className="h-40 w-full" /></div>;
  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Not found.</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-2xl">{data.ticket.subject}</h1>
      <Badge className="w-fit">{data.ticket.status}</Badge>
      <Card><CardHeader><CardTitle>Thread (oldest first, 50)</CardTitle></CardHeader>
        <CardContent>{data.thread.length === 0 ? <p className="text-sm text-muted-foreground">No messages yet.</p> : <ul className="flex flex-col gap-2 text-sm">{data.thread.map((m) => <li key={m.id} className="rounded-md border p-2"><p>{m.message}</p><p className="text-xs text-muted-foreground">{m.isAdmin ? "admin" : "student"} · {new Date(m.createdAt).toLocaleString()}</p></li>)}</ul>}</CardContent>
      </Card>
      <div className="flex flex-wrap items-end gap-2">
        <Input aria-label="Assignee admin user id" placeholder="Assignee admin id (empty to unassign)" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="max-w-64" />
        <Button variant="outline" size="sm" onClick={() => void post("assign", { assigneeId: assignee.trim() || null })}>Assign</Button>
        <Input aria-label="Close reason" placeholder="Close reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} className="max-w-64" />
        <Button variant="outline" size="sm" onClick={() => void post("close", { reason: reason || null })}>Close</Button>
        <Button variant="outline" size="sm" onClick={() => void post("reopen", {})}>Reopen to IN_PROGRESS</Button>
      </div>
    </div>
  );
}
