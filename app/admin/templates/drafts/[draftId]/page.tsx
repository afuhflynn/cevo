"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function DraftDetailPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = use(params);
  const [draft, setDraft] = useState<{
    id: string;
    status: string;
    templateId: string | null;
    payload: {
      rules?: Record<string, unknown>;
      sections?: Array<{ title: string; sectionType: string }>;
    } | null;
  } | null>(null);
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/templates/drafts/${draftId}`);
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      const data = await res.json();
      setDraft(data.draft);
      setTarget(data.draft?.templateId ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function apply() {
    if (!target.trim()) {
      setError("Provide a target template id to apply this draft.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/templates/drafts/${draftId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTemplateId: target.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          data.message ?? data.error ?? `Apply failed (${res.status})`,
        );
      window.location.href = `/admin/templates/${target.trim()}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setBusy(false);
    }
  }

  async function discard() {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/templates/drafts/${draftId}/discard`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(`Discard failed (${res.status})`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Discard failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main
        className="mx-auto w-full max-w-5xl px-6 py-10"
        aria-label="Loading draft"
      >
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="mt-4 h-48 w-full" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <Link
        href="/admin/templates/drafts"
        className="inline-flex h-7 items-center justify-center rounded-lg px-2.5 text-sm hover:bg-muted"
      >
        ← Drafts
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Review draft
      </h1>
      {draft ? (
        <Badge
          className="mt-2"
          variant={draft.status === "open" ? "secondary" : "outline"}
        >
          {draft.status}
        </Badge>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Proposed rules</CardTitle>
            <CardDescription>
              Nulls mean the model was unsure. Fill before applying.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-96 overflow-auto rounded border bg-muted p-3 text-xs">
              {JSON.stringify(draft?.payload?.rules ?? {}, null, 2)}
            </pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Proposed sections</CardTitle>
            <CardDescription>
              {draft?.payload?.sections?.length ?? 0} sections proposed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(draft?.payload?.sections ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sections proposed. Add them manually after applying, or
                discard.
              </p>
            ) : (
              <ol className="space-y-1 text-sm">
                {(draft?.payload?.sections ?? []).map((s, i) => (
                  <li
                    key={i}
                    className="flex justify-between gap-2 rounded border px-2 py-1"
                  >
                    <span>
                      {i + 1}. {s.title}
                    </span>
                    <Badge variant="outline">{s.sectionType}</Badge>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-4 space-y-2">
              <Label htmlFor="target">Target template id</Label>
              <Input
                id="target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Template id to receive a new draft version"
              />
              <div className="flex gap-2">
                <Button
                  onClick={apply}
                  disabled={busy || draft?.status !== "open"}
                >
                  Apply to version
                </Button>
                <Button
                  variant="outline"
                  onClick={discard}
                  disabled={busy || draft?.status !== "open"}
                >
                  Discard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
