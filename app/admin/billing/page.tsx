"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type BillingPackage = {
  id: string;
  name: string;
  priceXaf: number;
  credits: number;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
};

export default function AdminBillingPage() {
  const [items, setItems] = useState<BillingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [priceXaf, setPriceXaf] = useState("");
  const [credits, setCredits] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/billing/packages");
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setItems(data.packages ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load packages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/billing/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          priceXaf: Number(priceXaf),
          credits: Number(credits),
        }),
      });
      if (!res.ok) throw new Error(`Create failed (${res.status})`);
      setName("");
      setPriceXaf("");
      setCredits("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }, [credits, load, name, priceXaf]);

  const patch = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      setSavingId(id);
      setError(null);
      try {
        const res = await fetch(`/api/admin/billing/packages/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Update failed (${res.status})`);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
      } finally {
        setSavingId(null);
      }
    },
    [load],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl">Credit packages</h1>
        <p className="text-sm text-muted-foreground">
          Student checkout shows active packages only. Price and credit edits
          apply to new checkouts; open payments keep their snapshots.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>New package</CardTitle>
          <CardDescription>
            Name, price in XAF (minimum 100), credits (minimum 1).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-40"
            aria-label="Package name"
          />
          <Input
            placeholder="Price XAF"
            value={priceXaf}
            onChange={(e) => setPriceXaf(e.target.value)}
            inputMode="numeric"
            className="max-w-32"
            aria-label="Price in XAF"
          />
          <Input
            placeholder="Credits"
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
            inputMode="numeric"
            className="max-w-32"
            aria-label="Credits"
          />
          <Button
            onClick={() => void create()}
            disabled={creating || !name.trim() || !priceXaf || !credits}
          >
            {creating ? "Creating…" : "Create"}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Loading packages">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : items.length === 0 ? (
        <Empty>
          <EmptyTitle>No packages yet</EmptyTitle>
          <EmptyDescription>
            Create the first package above; students see active packages only.
          </EmptyDescription>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((p) => (
            <li key={p.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.priceXaf.toLocaleString("fr-CM")} XAF · {p.credits}{" "}
                      credits · order {p.sortOrder}
                    </p>
                  </div>
                  {p.isPopular && <Badge>Popular</Badge>}
                  <Badge variant={p.isActive ? "default" : "secondary"}>
                    {p.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={savingId === p.id}
                    onClick={() =>
                      void patch(p.id, { isPopular: !p.isPopular })
                    }
                  >
                    {p.isPopular ? "Unmark popular" : "Mark popular"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={savingId === p.id}
                    onClick={() => void patch(p.id, { isActive: !p.isActive })}
                  >
                    {p.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
