"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

type Overview = {
  newUsers7d: number;
  revenue7d: number;
  aiTokensIn7d: number;
  aiTokensOut7d: number;
  aiCost7d: number;
  openTickets: number;
  pendingTemplates: { unpublishedVersions: number; openDrafts: number };
  mismatchAlert: boolean;
  mismatchDetail: { confirmedCredits: number; allocatedToday: number; date: string } | null;
  recentAudit: Array<{ id: string; action: string; targetType: string; targetId: string; createdAt: string }>;
  lastComputedAt: string;
  stale?: boolean;
  cached?: boolean;
};

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const started = Date.now();
    setError(null);
    try {
      const res = await fetch("/api/admin/overview");
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = (await res.json()) as Overview;
      // Keep skeletons visible for slow path awareness per AC-9.
      const elapsed = Date.now() - started;
      if (elapsed < 300) await new Promise((r) => setTimeout(r, 300 - elapsed));
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading)
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Loading overview">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className="text-sm text-destructive">{error}</p>
        <button type="button" onClick={() => { setLoading(true); void load(); }} className="w-fit rounded-md border px-3 py-1.5 text-sm">Retry</button>
      </div>
    );

  if (!data)
    return (
      <Empty>
        <EmptyTitle>No overview data</EmptyTitle>
        <EmptyDescription>Overview returned nothing. Retry to recompute KPIs.</EmptyDescription>
      </Empty>
    );

  const cards = [
    { label: "New users (7d)", value: String(data.newUsers7d), href: "/admin/users" },
    { label: "Revenue (7d, XAF)", value: `${data.revenue7d.toLocaleString("en-US")} XAF`, href: "/admin/payments" },
    { label: "AI tokens in / out (7d)", value: `${data.aiTokensIn7d.toLocaleString("en-US")} / ${data.aiTokensOut7d.toLocaleString("en-US")}`, href: "/admin/ai-usage" },
    { label: "AI cost (7d, USD)", value: `$${data.aiCost7d.toFixed(2)}`, href: "/admin/ai-usage" },
    { label: "Open tickets", value: String(data.openTickets), href: "/admin/tickets" },
    { label: "Pending templates", value: `${data.pendingTemplates.unpublishedVersions} unpublished · ${data.pendingTemplates.openDrafts} drafts`, href: "/admin/templates" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Administration</p>
        <h1 className="mt-1 font-serif text-2xl">Platform overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last computed {new Date(data.lastComputedAt).toLocaleString()} (viewer timezone, fallback UTC)
          {data.stale ? " · stale, showing cached values" : ""}
          {data.cached && !data.stale ? " · cached (60s)" : ""}
        </p>
      </div>

      {data.mismatchAlert && data.mismatchDetail && (
        <div role="alert" className="rounded-lg border border-destructive bg-card p-4">
          <p className="font-medium text-destructive">Money mismatch for {data.mismatchDetail.date}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Confirmed {data.mismatchDetail.confirmedCredits} credits vs allocated {data.mismatchDetail.allocatedToday} credits.
            Open <Link className="underline" href="/admin/reconcile">reconcile</Link> for row ids.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <Card className="transition hover:shadow-md">
              <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle></CardHeader>
              <CardContent><p className="text-xl font-semibold">{c.value}</p></CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent audit activity</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentAudit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit rows yet. Admin writes will appear here.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.recentAudit.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary">{a.action}</Badge>
                  <span className="text-muted-foreground">{a.targetType} {a.targetId}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-sm"><Link className="underline" href="/admin/audit">Open audit viewer</Link></p>
        </CardContent>
      </Card>
    </div>
  );
}
