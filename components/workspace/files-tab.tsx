"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type FileRow = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  extractionStatus: string;
  extractionError: string | null;
  createdAt: string;
};

const CATEGORIES = [
  "GUIDELINE",
  "SUPERVISOR_NOTE",
  "FIGURE",
  "DATASET",
  "LITERATURE",
  "OTHER",
] as const;
const CATEGORY_LABELS: Record<string, string> = {
  GUIDELINE: "Guidelines",
  SUPERVISOR_NOTE: "Supervisor notes",
  FIGURE: "Figures",
  DATASET: "Datasets",
  LITERATURE: "Literature",
  OTHER: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Extracting soon",
  PROCESSING: "Extracting",
  COMPLETED: "Text ready",
  FAILED: "Extraction failed",
  SKIPPED: "Preview only",
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function errorMessage(
  status: number,
  data: { error?: unknown; message?: unknown },
): string {
  if (status === 429)
    return "Uploads are capped at 20 per minute. Pause briefly, then try again.";
  if (status === 409)
    return "Project storage is full (200MB). Delete a file to make room.";
  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string")
    return data.error.replace(/_/g, " ").toLowerCase();
  return "Upload failed. Try again.";
}

export function FilesTab({
  projectId,
  readOnly,
}: {
  projectId: string;
  readOnly?: boolean;
}) {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [category, setCategory] = useState<string>("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [quotaUsedBytes, setQuotaUsedBytes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Record<string, number>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ file: FileRow; url: string } | null>(
    null,
  );
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const loadFiles = useCallback(
    async (next?: string | null) => {
      if (next) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const url = new URL(
          `/api/projects/${projectId}/files`,
          window.location.origin,
        );
        if (category) url.searchParams.set("category", category);
        if (next) url.searchParams.set("cursor", next);
        const res = await fetch(url.pathname + url.search, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError("Could not load files. Try again.");
          return;
        }
        const items = (data.files ?? []) as FileRow[];
        setFiles((prev) => (next ? [...prev, ...items] : items));
        setCursor((data.nextCursor as string | null) ?? null);
        setTotal(Number(data.total ?? 0));
        setQuotaUsedBytes(Number(data.quotaUsedBytes ?? 0));
      } catch {
        setError("Could not load files. Check your connection and try again.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [projectId, category],
  );

  useEffect(() => {
    void loadFiles(null);
  }, [loadFiles]);

  async function handlePick(list: FileList | null) {
    if (!list || list.length === 0 || readOnly) return;
    setUploadError(null);
    for (const picked of Array.from(list)) {
      const clientToken = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      const progressKey = `${picked.name}-${clientToken}`;
      setUploading((prev) => ({ ...prev, [progressKey]: 0 }));
      try {
        const reqRes = await fetch(
          `/api/projects/${projectId}/files/request-upload`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              fileName: picked.name,
              mimeType: picked.type || "application/octet-stream",
              fileSize: picked.size,
              category: "OTHER",
              clientToken,
            }),
          },
        );
        const reqData = await reqRes.json().catch(() => ({}));
        if (reqData.deduplicated && reqData.file) {
          setUploadError(
            `"${picked.name}" is already in this project. Showing the existing file.`,
          );
          await loadFiles(null);
          continue;
        }
        if (!reqRes.ok || !reqData.uploadUrl) {
          setUploadError(errorMessage(reqRes.status, reqData));
          continue;
        }
        if (reqData.quotaWouldExceed) {
          setUploadError(
            `"${picked.name}" fits, but the project is near its 200MB limit.`,
          );
        }
        setUploading((prev) => ({ ...prev, [progressKey]: 25 }));
        const putRes = await fetch(reqData.uploadUrl as string, {
          method: "PUT",
          headers: {
            "content-type": picked.type || "application/octet-stream",
          },
          body: picked,
        });
        if (!putRes.ok) {
          setUploadError(`Upload of "${picked.name}" stalled. Try again.`);
          continue;
        }
        setUploading((prev) => ({ ...prev, [progressKey]: 75 }));
        const doneRes = await fetch(
          `/api/projects/${projectId}/files/complete`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ fileId: reqData.fileId, clientToken }),
          },
        );
        const doneData = await doneRes.json().catch(() => ({}));
        if (!doneRes.ok) {
          setUploadError(errorMessage(doneRes.status, doneData));
          continue;
        }
        setUploading((prev) => ({ ...prev, [progressKey]: 100 }));
        await loadFiles(null);
      } catch {
        setUploadError(
          `Upload of "${picked.name}" failed. Check your connection and try again.`,
        );
      } finally {
        setUploading((prev) => {
          const next = { ...prev };
          delete next[progressKey];
          return next;
        });
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handlePreview(file: FileRow) {
    setPreviewLoading(file.id);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/files/${file.id}/preview`,
        { cache: "no-store" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadError("Preview link failed. Try again.");
        return;
      }
      setPreview({ file, url: data.previewUrl as string });
    } catch {
      setUploadError("Preview link failed. Check your connection.");
    } finally {
      setPreviewLoading(null);
    }
  }

  async function handleDelete(file: FileRow) {
    if (!window.confirm(`Delete "${file.fileName}"? This cannot be undone.`))
      return;
    setBusyId(file.id);
    try {
      const res = await fetch(`/api/projects/${projectId}/files/${file.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setUploadError("Delete failed. Try again.");
        return;
      }
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch {
      setUploadError("Delete failed. Check your connection.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRetry(file: FileRow) {
    setBusyId(file.id);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/files/${file.id}/retry`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadError("Retry failed. Try again.");
        return;
      }
      const updated = data.file as FileRow;
      setFiles((prev) => prev.map((f) => (f.id === file.id ? updated : f)));
    } catch {
      setUploadError("Retry failed. Check your connection.");
    } finally {
      setBusyId(null);
    }
  }

  const quotaPct = Math.min(
    100,
    Math.round((quotaUsedBytes / (200 * 1024 * 1024)) * 100),
  );
  const uploadingKeys = Object.keys(uploading);

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Project files</h3>
          <p className="text-xs text-muted-foreground">
            {total} file{total === 1 ? "" : "s"} · {formatBytes(quotaUsedBytes)}{" "}
            of 200MB ({quotaPct}%)
          </p>
        </div>
        {!readOnly && (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.docx,.csv,.txt"
              onChange={(e) => void handlePick(e.target.files)}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              Upload
            </button>
          </>
        )}
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${quotaPct}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCategory("")}
          className={`rounded-full px-2.5 py-1 text-xs ${category === "" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-full px-2.5 py-1 text-xs ${category === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {uploadError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs">
          {uploadError}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => setUploadError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {uploadingKeys.map((k) => (
        <div key={k} className="rounded-md border px-3 py-2 text-xs">
          Uploading {k.split("-")[0]}… {uploading[k]}%
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${uploading[k]}%` }}
            />
          </div>
        </div>
      ))}

      {loading ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Loading files">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-md border px-3 py-6 text-center text-xs text-muted-foreground">
          {error}
          <div>
            <button
              type="button"
              className="mt-2 underline"
              onClick={() => void loadFiles(null)}
            >
              Retry
            </button>
          </div>
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-md border border-dashed px-3 py-8 text-center">
          <p className="text-sm font-medium">No files yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload supervisor notes, guidelines, figures, or datasets to keep
            every source in one place.
          </p>
          {!readOnly && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              Upload your first file
            </button>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2 overflow-y-auto">
          {files.map((f) => (
            <li key={f.id} className="rounded-md border px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{f.fileName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatBytes(f.fileSize)} ·{" "}
                    {CATEGORY_LABELS[f.category] ?? f.category} ·{" "}
                    {new Date(f.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {STATUS_LABELS[f.extractionStatus] ?? f.extractionStatus}
                    {f.extractionStatus === "FAILED" && f.extractionError
                      ? ` — ${f.extractionError}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={previewLoading === f.id}
                    onClick={() => void handlePreview(f)}
                    className="rounded px-2 py-1 text-xs text-primary hover:bg-muted disabled:opacity-50"
                  >
                    {previewLoading === f.id ? "…" : "Preview"}
                  </button>
                  {f.extractionStatus === "FAILED" && !readOnly && (
                    <button
                      type="button"
                      disabled={busyId === f.id}
                      onClick={() => void handleRetry(f)}
                      className="rounded px-2 py-1 text-xs text-primary hover:bg-muted disabled:opacity-50"
                    >
                      Retry
                    </button>
                  )}
                  {!readOnly && (
                    <button
                      type="button"
                      disabled={busyId === f.id}
                      onClick={() => void handleDelete(f)}
                      className="rounded px-2 py-1 text-xs text-destructive hover:bg-muted disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {cursor && (
        <button
          type="button"
          disabled={loadingMore}
          onClick={() => void loadFiles(cursor)}
          className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-label={`Preview ${preview.file.fileName}`}
        >
          <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-background">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <p className="truncate text-sm font-medium">
                {preview.file.fileName}
              </p>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded px-2 py-1 text-xs hover:bg-muted"
              >
                Close
              </button>
            </div>
            <div className="min-h-64 flex-1 overflow-auto p-2">
              {preview.file.mimeType.startsWith("image/") ? (
                // biome-ignore lint/performance/noImgElement: signed preview URL, next/image cannot optimize remote signed URLs
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.url}
                  alt={preview.file.fileName}
                  className="mx-auto max-h-[70vh] object-contain"
                />
              ) : preview.file.mimeType === "application/pdf" ||
                preview.file.mimeType.startsWith("text/") ? (
                <iframe
                  src={preview.url}
                  title={preview.file.fileName}
                  className="h-[70vh] w-full rounded border"
                />
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Preview is not available for this type.{" "}
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Open in a new tab
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
