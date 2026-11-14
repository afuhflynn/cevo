"use client";

import { useCallback, useEffect, useState } from "react";

type Counts = {
  missing: number;
  uncited: number;
  drift: number;
  formatting: number;
};

type Run = {
  id: string;
  status: string;
  counts: Counts;
  skippedSemantic: boolean;
  skipReason: string | null;
  truncated: boolean;
  templateVersionId: string | null;
  createdAt: string;
};

type Warning = {
  id: string;
  checkType: string;
  severity: string;
  message: string;
  sectionId: string | null;
  sectionTitle: string | null;
  blockIndex: number | null;
  excerpt: string | null;
  sectionVersion: number | null;
};

const GROUP_LABEL: Record<string, string> = {
  missing_section: "Missing sections",
  uncited: "Uncited claims",
  objective_drift: "Objective drift",
  formatting: "Formatting",
};

function newClientKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `run-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function ReviewTab({
  projectId,
  readOnly,
}: {
  projectId: string;
  readOnly?: boolean;
}) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [active, setActive] = useState<{
    run: Run;
    warnings: Warning[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleIds, setStaleIds] = useState<Set<string>>(new Set());

  const loadRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/review/runs?page=1&pageSize=20`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data.error as string) || "Could not load reviews.");
      }
      const data = await res.json();
      setRuns((data.runs ?? []) as Run[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load reviews.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const openRun = useCallback(
    async (id: string) => {
      setError(null);
      try {
        const res = await fetch(
          `/api/projects/${projectId}/review/runs/${id}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("Could not open this review.");
        const data = await res.json();
        setActive({
          run: data.run as Run,
          warnings: (data.warnings ?? []) as Warning[],
        });
        setStaleIds(new Set());
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not open this review.",
        );
      }
    },
    [projectId],
  );

  const startRun = useCallback(async () => {
    if (readOnly || running) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/review/runs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientRunKey: newClientKey() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        const wait = (data.retryAfterSeconds as number) ?? 60;
        setError(
          `Review is capped at 10 runs per hour. Try again in about ${Math.ceil(wait / 60)} min. Structural checks were kept where available.`,
        );
        return;
      }
      if (!res.ok) {
        throw new Error((data.error as string) || "Review failed to start.");
      }
      await loadRuns();
      if (data.run?.id) await openRun(data.run.id as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed to start.");
    } finally {
      setRunning(false);
    }
  }, [projectId, readOnly, running, loadRuns, openRun]);

  const retrySemantic = useCallback(async () => {
    if (!active || readOnly || retrying) return;
    setRetrying(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/review/runs/${active.run.id}/retry`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setError("Retry is capped. Pause briefly, then try again.");
        return;
      }
      if (!res.ok) {
        setError((data.error as string) || "Retry failed.");
        return;
      }
      if ((data.error as string) === "SEMANTIC_STILL_SKIPPED") {
        setError(
          `AI checks are still skipped (${(data.reason as string) ?? "provider busy"}). Structural warnings above are saved; retry when ready.`,
        );
        return;
      }
      await openRun(active.run.id);
      await loadRuns();
    } finally {
      setRetrying(false);
    }
  }, [active, projectId, readOnly, retrying, openRun, loadRuns]);

  const jumpTo = useCallback(
    async (w: Warning) => {
      if (!w.sectionId) return;
      window.dispatchEvent(
        new CustomEvent("cevo:review-jump", {
          detail: { sectionId: w.sectionId, blockIndex: w.blockIndex ?? 0 },
        }),
      );
      // Stale check: compare saved sectionVersion with live version.
      try {
        const res = await fetch(
          `/api/projects/${projectId}/sections/${w.sectionId}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = await res.json();
        const live = Number(data.section?.version);
        if (
          Number.isFinite(live) &&
          w.sectionVersion !== null &&
          live !== w.sectionVersion
        ) {
          setStaleIds((prev) => new Set(prev).add(w.id));
        }
      } catch {
        // stale check is best effort
      }
    },
    [projectId],
  );

  const grouped = (active?.warnings ?? []).reduce<Record<string, Warning[]>>(
    (acc, w) => {
      const list = acc[w.checkType] ?? [];
      list.push(w);
      acc[w.checkType] = list;
      return acc;
    },
    {},
  );

  return (
    <div className="cevo-review" aria-label="Pre-submission review">
      <p className="cevo-muted">
        Scan the draft for missing sections, uncited claims, drift from
        objectives, and formatting gaps. Advisory only, it never blocks export.
      </p>
      {!readOnly && (
        <button type="button" onClick={startRun} disabled={running}>
          {running ? "Scanning…" : "Run consistency review"}
        </button>
      )}
      {error && (
        <p role="alert" className="cevo-assistant-notice">
          {error}
        </p>
      )}
      {loading ? (
        <ol aria-busy="true" aria-label="Loading reviews">
          {[0, 1, 2].map((i) => (
            <li key={i} className="cevo-skeleton">
              Loading review history…
            </li>
          ))}
        </ol>
      ) : runs.length === 0 && !active ? (
        <div className="cevo-empty">
          <h3>No reviews yet</h3>
          <p>
            Run your first consistency review to see what is missing before
            export.
          </p>
        </div>
      ) : (
        <div className="cevo-review-history">
          <h3>Review history · {runs.length}</h3>
          <ol>
            {runs.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => openRun(r.id)}>
                  {new Date(r.createdAt).toLocaleString()} · missing{" "}
                  {r.counts.missing} · uncited {r.counts.uncited} · drift{" "}
                  {r.counts.drift} · formatting {r.counts.formatting}
                  {r.skippedSemantic ? " · AI skipped" : ""}
                  {r.truncated ? " · truncated" : ""}
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
      {active && (
        <div className="cevo-review-detail">
          <h3>Review from {new Date(active.run.createdAt).toLocaleString()}</h3>
          <p className="cevo-muted">
            Missing {active.run.counts.missing} · Uncited{" "}
            {active.run.counts.uncited} · Drift {active.run.counts.drift} ·
            Formatting {active.run.counts.formatting}
            {active.run.truncated
              ? " · Large draft truncated to caps; run per chapter for full coverage."
              : ""}
          </p>
          {active.run.skippedSemantic && (
            <p role="status" className="cevo-assistant-notice">
              AI checks skipped
              {active.run.skipReason ? ` (${active.run.skipReason})` : ""}.
              Structural warnings below are saved.
              {!readOnly && (
                <button
                  type="button"
                  onClick={retrySemantic}
                  disabled={retrying}
                >
                  {retrying ? "Retrying…" : "Retry AI checks"}
                </button>
              )}
            </p>
          )}
          {Object.keys(GROUP_LABEL).map((group) => (
            <section key={group} aria-label={GROUP_LABEL[group]}>
              <h4>
                {GROUP_LABEL[group]} · {(grouped[group] ?? []).length}
              </h4>
              {(grouped[group] ?? []).length === 0 ? (
                <p className="cevo-muted">No warnings in this group.</p>
              ) : (
                <ol>
                  {(grouped[group] ?? []).map((w) => (
                    <li key={w.id} className="cevo-review-warning">
                      <p>{w.message}</p>
                      {w.excerpt && <blockquote>{w.excerpt}</blockquote>}
                      <p className="cevo-muted">
                        {w.sectionTitle ?? "Template level"}
                        {w.blockIndex !== null
                          ? ` · paragraph ${w.blockIndex + 1}`
                          : ""}
                        {w.severity === "info" ? " · guidance" : ""}
                      </p>
                      {staleIds.has(w.id) && (
                        <p role="status" className="cevo-muted">
                          This chapter changed since the review. The excerpt
                          above is from scan time; run a fresh review for exact
                          placement.
                        </p>
                      )}
                      {w.sectionId && (
                        <button type="button" onClick={() => jumpTo(w)}>
                          Jump to paragraph
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
