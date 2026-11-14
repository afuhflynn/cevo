"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Job = {
  id: string;
  format: string;
  status: string;
  fileSize: number | null;
  errorMessage: string | null;
  expiresAt: string | null;
  createdAt: string;
  downloadable: boolean;
  expired: boolean;
};

function newClientKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `export-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function ExportTab({ projectId, readOnly }: { projectId: string; readOnly?: boolean }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<"PDF" | "DOCX" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<"PDF" | "DOCX">("PDF");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/exports?page=1&pageSize=20`, { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      setJobs((data.jobs ?? []) as Job[]);
      setError(null);
    } catch {
      setError("Could not load exports.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
    timer.current = setInterval(() => {
      setJobs((prev) => {
        const active = prev.some((j) => j.status === "QUEUED" || j.status === "PROCESSING");
        if (active) load();
        return prev;
      });
    }, 3000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  async function start(pick: "PDF" | "DOCX") {
    if (readOnly) return;
    setStarting(pick);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/exports`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ format: pick, clientKey: newClientKey() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 422 && data.error === "DOCUMENT_OVERSIZE") {
        setError("This document is over the word limit. Trim chapters then try again.");
        return;
      }
      if (res.status === 422 && data.error === "TOO_MANY_ACTIVE_EXPORTS") {
        setError("Three exports are already running. Wait for one to finish.");
        return;
      }
      if (!res.ok && res.status !== 409 && res.status !== 200) {
        throw new Error((data.error as string) || "Start failed.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Start failed.");
    } finally {
      setStarting(null);
    }
  }

  async function retry(job: Job) {
    if (readOnly) return;
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/exports`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ format: job.format, clientKey: (job as unknown as { clientKey?: string }).clientKey ?? newClientKey() }),
      });
      if (!res.ok && res.status !== 409) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data.error as string) || "Retry failed.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Retry failed.");
    }
  }

  async function download(job: Job) {
    try {
      const res = await fetch(`/api/projects/${projectId}/exports/${job.id}/download`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 410) {
        setError("This file expired after 7 days. Start a fresh export.");
        await load();
        return;
      }
      if (!res.ok) throw new Error((data.error as string) || "Download failed.");
      window.open(data.downloadUrl as string, "_blank", "noopener");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    }
  }

  return (
    <section aria-label="Export" className="cevo-export">
      <h2>Export</h2>
      <p className="cevo-muted">Pick a format. Long files run in the background with no timeout cliff.</p>
      {!readOnly && (
        <div className="cevo-export-pick">
          <label htmlFor="cevo-export-format">Format</label>
          <select id="cevo-export-format" value={format} onChange={(e) => setFormat(e.target.value as "PDF" | "DOCX")}>
            <option value="PDF">PDF</option>
            <option value="DOCX">Word</option>
          </select>
          <button type="button" disabled={starting !== null} onClick={() => start(format)}>
            {starting ? "Starting…" : `Export ${format}`}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="cevo-error">
          {error}
        </p>
      )}
      {loading ? (
        <p className="cevo-muted">Loading exports…</p>
      ) : jobs.length === 0 ? (
        <div className="cevo-empty">
          <h3>No exports yet</h3>
          <p>Start your first PDF or Word export. History and downloads live here for 7 days.</p>
        </div>
      ) : (
        <ul className="cevo-export-list">
          {jobs.map((j) => (
            <li key={j.id}>
              <span>
                {j.format} · {j.status}
                {j.fileSize ? ` · ${Math.round(j.fileSize / 1024)} KB` : ""}
              </span>
              {j.status === "FAILED" && j.errorMessage && <span className="cevo-muted"> · {j.errorMessage.slice(0, 120)}</span>}
              {j.status === "FAILED" && !readOnly && (
                <button type="button" onClick={() => retry(j)}>
                  Retry
                </button>
              )}
              {j.downloadable && (
                <button type="button" onClick={() => download(j)}>
                  Download again
                </button>
              )}
              {j.expired && <span className="cevo-muted"> · expired, start fresh</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
