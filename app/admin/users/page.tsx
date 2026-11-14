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
  name: string;
  emailMasked: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  balance: number;
};

export default function AdminUsersPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (q.trim()) params.set("q", q.trim());
      if (role) params.set("role", role);
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setItems(data.items ?? []);
      setHasMore(Boolean(data.hasMore));
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, q, role, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl">Users</h1>
        <p className="text-sm text-muted-foreground">Name, masked email, role, status, balance. {total} total.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input aria-label="Search name or email" placeholder="Search name or email" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} className="max-w-64" />
        <select aria-label="Role filter" value={role} onChange={(e) => { setPage(1); setRole(e.target.value); }} className="rounded-md border bg-background px-2 py-1 text-sm">
          <option value="">All roles</option>
          <option value="STUDENT">STUDENT</option>
          <option value="ADMIN">ADMIN</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
        </select>
        <select aria-label="Status filter" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="rounded-md border bg-background px-2 py-1 text-sm">
          <option value="">Active and suspended</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Loading users">
          <Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" />
        </div>
      ) : items.length === 0 ? (
        <Empty>
          <EmptyTitle>No users match</EmptyTitle>
          <EmptyDescription>Clear search or filters to see the full directory, then open a row for detail.</EmptyDescription>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((u) => (
            <li key={u.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/users/${u.id}`} className="font-medium underline">{u.name}</Link>
                    <p className="text-sm text-muted-foreground">{u.emailMasked} · {u.balance} credits</p>
                  </div>
                  <Badge>{u.role}</Badge>
                  <Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "Active" : "Suspended"}</Badge>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
        <span className="text-sm text-muted-foreground">Page {page}</span>
        <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
