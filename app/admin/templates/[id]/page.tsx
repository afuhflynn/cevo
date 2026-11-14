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
import { Textarea } from "@/components/ui/textarea";

type VersionRow = {
  id: string;
  version: number;
  isPublished: boolean;
  changelog: string | null;
  publishedAt: string | null;
};

export default function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [template, setTemplate] = useState<{
    id: string;
    title: string;
    isActive: boolean;
  } | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [rules, setRules] = useState<Array<Record<string, unknown>>>([]);
  const [sections, setSections] = useState<
    Array<{
      id: string;
      templateVersionId: string;
      orderIndex: number;
      title: string;
      sectionType: string;
    }>
  >([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [sectionsText, setSectionsText] = useState("");
  const [pasted, setPasted] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/templates/${id}`);
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      const data = await res.json();
      setTemplate(data.template);
      setVersions(data.versions ?? []);
      setRules(data.rules ?? []);
      setSections(data.sections ?? []);
      const drafts = (data.versions ?? []).filter(
        (v: VersionRow) => !v.isPublished,
      );
      setSelected(
        drafts.length > 0
          ? drafts[drafts.length - 1].version
          : ((data.versions ?? [])[0]?.version ?? null),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedVersion = versions.find((v) => v.version === selected) ?? null;
  const selectedRules = selectedVersion
    ? rules.find(
        (r) =>
          (r as { templateVersionId: string }).templateVersionId ===
          selectedVersion.id,
      )
    : null;
  const selectedSections = selectedVersion
    ? sections.filter((s) => s.templateVersionId === selectedVersion.id)
    : [];

  async function createVersion() {
    setBusy("create");
    try {
      const res = await fetch(`/api/admin/templates/${id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`Version create failed (${res.status})`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (!selected) return;
    setBusy("publish");
    try {
      const res = await fetch(
        `/api/admin/templates/${id}/versions/${selected}/publish`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          data.message ?? data.error ?? `Publish failed (${res.status})`,
        );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveSections() {
    if (!selected) return;
    const lines = sectionsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setError("Add at least one section title, one per line.");
      return;
    }
    setBusy("sections");
    try {
      const res = await fetch(
        `/api/admin/templates/${id}/versions/${selected}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sections: lines.map((title) => ({ title, sectionType: "CHAPTER" })),
          }),
        },
      );
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setSectionsText("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function runExtraction() {
    if (!pasted.trim() && sectionsText.trim().length === 0 && !pasted) return;
    setBusy("extract");
    try {
      const res = await fetch("/api/admin/templates/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pastedText: pasted.slice(0, 500000),
          templateId: id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.message ?? `Extraction failed (${res.status})`);
      setPasted("");
      window.location.href = "/admin/templates/drafts";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setBusy(null);
    }
  }

  async function toggleArchive() {
    setBusy("archive");
    try {
      const res = await fetch(`/api/admin/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: template?.isActive ? false : true }),
      });
      if (!res.ok) throw new Error(`Update failed (${res.status})`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <main
        className="mx-auto w-full max-w-5xl px-6 py-10"
        aria-label="Loading template"
      >
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="mt-4 h-40 w-full" />
      </main>
    );
  }

  if (error && !template) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="font-medium">Could not load template</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" onClick={load}>
                Retry
              </Button>
              <Link
                href="/admin/templates"
                className="inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm hover:bg-muted"
              >
                Back
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <Link
        href="/admin/templates"
        className="inline-flex h-7 items-center justify-center rounded-lg px-2.5 text-sm hover:bg-muted"
      >
        ← All templates
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {template?.title}
          </h1>
          <div className="mt-2 flex gap-2">
            {template?.isActive ? (
              <Badge variant="secondary">Active</Badge>
            ) : (
              <Badge variant="destructive">Archived</Badge>
            )}
            {selectedVersion?.isPublished ? (
              <Badge>Published</Badge>
            ) : (
              <Badge variant="outline">Draft</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={createVersion}
            disabled={busy !== null}
          >
            New version
          </Button>
          <Button
            variant="outline"
            onClick={toggleArchive}
            disabled={busy !== null}
          >
            {template?.isActive ? "Archive" : "Reactivate"}
          </Button>
        </div>
      </div>
      {error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div
        className="mt-6 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Versions"
      >
        {versions.map((v) => (
          <Button
            key={v.id}
            size="sm"
            variant={selected === v.version ? "default" : "outline"}
            onClick={() => setSelected(v.version)}
          >
            v{v.version} {v.isPublished ? "· live" : "· draft"}
          </Button>
        ))}
      </div>

      {selectedVersion ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Version {selectedVersion.version} rules</CardTitle>
              <CardDescription>
                {selectedRules
                  ? "Stored typed rules for export and review."
                  : "No rules yet. Extract or add sections, then publish."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedRules ? (
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  {(
                    [
                      "pageSize",
                      "fontFamily",
                      "fontSizeBodyPt",
                      "lineSpacing",
                      "marginTopMm",
                      "marginBottomMm",
                      "marginLeftMm",
                      "marginRightMm",
                      "citationStyle",
                    ] as const
                  ).map((k) => (
                    <div key={k} className="rounded border px-2 py-1">
                      <dt className="text-xs text-muted-foreground">{k}</dt>
                      <dd className="font-medium">
                        {String(
                          (selectedRules as Record<string, unknown>)[k] ?? "—",
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ruleless draft. Publish is blocked until rules plus one
                  section exist.
                </p>
              )}
              <Button
                className="mt-4"
                disabled={busy !== null || selectedVersion.isPublished}
                onClick={publish}
              >
                {busy === "publish"
                  ? "Publishing…"
                  : selectedVersion.isPublished
                    ? "Published"
                    : "Publish version"}
              </Button>
              {!selectedVersion.isPublished ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Publish sets publishedAt once. Published versions reject edits
                  with 409.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sections ({selectedSections.length})</CardTitle>
              <CardDescription>
                Full ordered list. Edits replace the whole list.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedSections.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No sections yet.
                </p>
              ) : (
                <ol className="space-y-1 text-sm">
                  {selectedSections.map((s) => (
                    <li
                      key={s.id}
                      className="flex justify-between gap-2 rounded border px-2 py-1"
                    >
                      <span>
                        {s.orderIndex + 1}. {s.title}
                      </span>
                      <Badge variant="outline">{s.sectionType}</Badge>
                    </li>
                  ))}
                </ol>
              )}
              {!selectedVersion.isPublished ? (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="sections">
                    Replace sections (one title per line)
                  </Label>
                  <Textarea
                    id="sections"
                    rows={5}
                    value={sectionsText}
                    onChange={(e) => setSectionsText(e.target.value)}
                    placeholder={"Introduction\nLiterature Review\nMethodology"}
                  />
                  <Button
                    variant="outline"
                    onClick={saveSections}
                    disabled={busy !== null}
                  >
                    Save sections
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Assisted extraction</CardTitle>
          <CardDescription>
            Paste guideline text. A model drafts rules for review. Nothing
            publishes automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="pasted">Guideline text (max 500k chars)</Label>
          <Textarea
            id="pasted"
            rows={5}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="Paste margins, fonts, spacing, required pages…"
          />
          <Button
            onClick={runExtraction}
            disabled={busy !== null || pasted.trim().length === 0}
          >
            {busy === "extract" ? "Extracting…" : "Extract to draft"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
