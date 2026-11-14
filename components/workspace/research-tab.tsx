"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Hit = {
  doi: string | null;
  openAlexId: string | null;
  title: string;
  authors: { family: string; given?: string }[];
  year: number | null;
  venue: string | null;
  isOpenAccess: boolean;
  pdfUrl: string | null;
  verificationState: string;
  providerOrigin: string;
};

type Notice = { provider: string; code: string; message: string };

type LibraryItem = {
  id: string;
  sourceId: string;
  studentNote: string | null;
  tags: string[];
  isPinned: boolean;
  createdAt: string;
  source: {
    id: string;
    doi: string | null;
    openAlexId: string | null;
    title: string;
    authors: { family: string; given?: string }[];
    year: number | null;
    venue: string | null;
    isOpenAccess: boolean;
    pdfUrl: string | null;
    verificationState: string;
  } | null;
};

type BibItem = {
  id: string;
  sourceId: string;
  inlineText: string;
  formattedText: string | null;
  citationKey: string;
  style: string;
  anchorId: string | null;
  source: { title: string; authors: { family: string }[]; year: number | null };
};

function badge(state: string): string {
  switch (state) {
    case "DOI_VERIFIED":
      return "DOI verified";
    case "FULL_TEXT_AVAILABLE":
      return "Full text available";
    case "REQUIRES_REVIEW":
      return "Needs review";
    case "INCOMPLETE_METADATA":
      return "Incomplete metadata";
    default:
      return "Metadata verified";
  }
}

export function ResearchTab({
  projectId,
  sectionId,
  onInsertCitation,
  readOnly,
}: {
  projectId: string;
  sectionId: string | null;
  onInsertCitation: (sourceId: string, inlineText: string, anchorId: string) => void;
  readOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [libCursor, setLibCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [tag, setTag] = useState("");
  const [bib, setBib] = useState<BibItem[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [detail, setDetail] = useState<Record<string, {
    abstract: string | null; pdfUrl: string | null; providerOrigin: string;
  }>>({});
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (q: string, next?: string | null) => {
      const trimmed = q.trim();
      if (!trimmed) {
        setHits([]);
        setSearched(false);
        return;
      }
      setSearching(true);
      setError(null);
      try {
        const url = new URL(
          `/api/projects/${projectId}/research/search`,
          window.location.origin,
        );
        url.searchParams.set("q", trimmed);
        if (next) url.searchParams.set("cursor", next);
        const res = await fetch(url.pathname + url.search, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setError("Search is capped at 30 per minute. Pause briefly, then try again.");
          return;
        }
        if (!res.ok) {
          setError((data.error as string) ?? "Search failed. Try again.");
          return;
        }
        setHits(next ? [...hits, ...((data.hits ?? []) as Hit[])] : ((data.hits ?? []) as Hit[]));
        setNotices(((data.providerNotices ?? []) as Notice[]));
        setCursor((data.nextCursor as string | null) ?? null);
        setSearched(true);
      } catch {
        setError("Search failed. Check your connection and try again.");
      } finally {
        setSearching(false);
      }
    },
    [projectId, hits],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setHits([]);
      setSearched(false);
      setNotices([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void runSearch(query, null);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadLibrary = useCallback(
    async (next?: string | null) => {
      try {
        const url = new URL(
          `/api/projects/${projectId}/research/sources`,
          window.location.origin,
        );
        if (filter.trim()) url.searchParams.set("filter", filter.trim());
        if (tag.trim()) url.searchParams.set("tag", tag.trim());
        if (next) url.searchParams.set("cursor", next);
        const res = await fetch(url.pathname + url.search, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const items = (data.links ?? []) as LibraryItem[];
        setLibrary((prev) => (next ? [...prev, ...items] : items));
        setLibCursor((data.nextCursor as string | null) ?? null);
        setTotal(Number(data.total ?? 0));
      } catch {
        /* library load is best effort */
      }
    },
    [projectId, filter, tag],
  );

  useEffect(() => {
    void loadLibrary(null);
  }, [loadLibrary]);

  const loadBib = useCallback(async () => {
    if (!sectionId) {
      setBib([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/projects/${projectId}/sections/${sectionId}/citations`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json();
      setBib((data.citations ?? []) as BibItem[]);
    } catch {
      /* best effort */
    }
  }, [projectId, sectionId]);

  useEffect(() => {
    void loadBib();
  }, [loadBib]);

  async function handleSave(hit: Hit) {
    if (readOnly) return;
    const key = hit.doi ?? hit.openAlexId ?? hit.title;
    setSavingId(key);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/research/sources`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          doi: hit.doi,
          openAlexId: hit.openAlexId,
          note: noteFor === key ? note : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setError("Save is capped at 60 per minute. Pause briefly, then try again.");
        return;
      }
      if (res.status === 400) {
        setError(
          (data.message as string) ??
            "This result cannot be saved until it carries a DOI or OpenAlex ID.",
        );
        return;
      }
      if (!res.ok) {
        setError((data.error as string) ?? "Save failed. Try again.");
        return;
      }
      setNote("");
      setNoteFor(null);
      await loadLibrary(null);
    } finally {
      setSavingId(null);
    }
  }

  async function handleDetail(linkId: string) {
    if (detail[linkId]) {
      setDetail((prev) => {
        const next = { ...prev };
        delete next[linkId];
        return next;
      });
      return;
    }
    try {
      const res = await fetch(
        `/api/projects/${projectId}/research/sources/${linkId}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json();
      setDetail((prev) => ({
        ...prev,
        [linkId]: {
          abstract: data.source?.abstract ?? null,
          pdfUrl: data.source?.pdfUrl ?? null,
          providerOrigin: data.providerOrigin ?? "OpenAlex",
        },
      }));
    } catch {
      /* best effort */
    }
  }

  async function handleInsert(sourceId: string) {
    if (!sectionId || readOnly) return;
    setError(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/sections/${sectionId}/citations`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sourceId }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (res.status === 400) {
        setError("Link this source to the project before inserting.");
        return;
      }
      if (!res.ok) {
        setError((data.error as string) ?? "Insert failed. Try again.");
        return;
      }
      onInsertCitation(
        sourceId,
        data.inlineText as string,
        data.anchorId as string,
      );
      await loadBib();
    } catch {
      setError("Insert failed. Try again.");
    }
  }

  async function handleDeleteCitation(citationId: string) {
    if (!sectionId || readOnly) return;
    try {
      const res = await fetch(
        `/api/projects/${projectId}/sections/${sectionId}/citations/${citationId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        setError("Delete failed. Try again.");
        return;
      }
      await loadBib();
    } catch {
      setError("Delete failed. Try again.");
    }
  }

  async function handleUnsave(linkId: string) {
    if (readOnly) return;
    const ok = window.confirm(
      "Remove this source from the library? Existing chapter citations stay frozen.",
    );
    if (!ok) return;
    try {
      const res = await fetch(
        `/api/projects/${projectId}/research/sources/${linkId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        setError("Remove failed. Try again.");
        return;
      }
      await loadLibrary(null);
    } catch {
      setError("Remove failed. Try again.");
    }
  }

  return (
    <div className="cevo-research" aria-label="Verified research">
      <p className="cevo-muted">
        Search verified papers, save them with notes, then insert deterministic
        citations into the open chapter.
      </p>
      <label>
        Search papers
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="DOI, title, or keywords…"
          aria-label="Search verified papers"
        />
      </label>
      {searching && (
        <ol aria-busy="true" aria-label="Searching">
          {[0, 1, 2].map((i) => (
            <li key={i} className="cevo-skeleton">
              Loading verified result…
            </li>
          ))}
        </ol>
      )}
      {error && (
        <p role="alert" className="cevo-assistant-notice">
          {error}
        </p>
      )}
      {notices.map((n) => (
        <p key={`${n.provider}-${n.code}`} role="status" className="cevo-muted">
          {n.message}
        </p>
      ))}
      {!searching && searched && hits.length === 0 && (
        <div className="cevo-empty">
          <h3>No verified papers yet</h3>
          <p>
            Try fewer keywords, the exact article title, or paste a DOI such as
            10.1234/example.
          </p>
        </div>
      )}
      <ol className="cevo-research-hits">
        {hits.map((h) => {
          const key = h.doi ?? h.openAlexId ?? h.title;
          return (
            <li key={key} className="cevo-research-hit">
              <p>
                <strong>{h.title}</strong>
              </p>
              <p className="cevo-muted">
                {h.authors.slice(0, 4).map((a) => a.family).join(", ")}
                {h.authors.length > 4 ? " et al." : ""} · {h.year ?? "n.d."}
                {h.venue ? ` · ${h.venue}` : ""}
              </p>
              <p className="cevo-muted">
                <span>{badge(h.verificationState)}</span>
                {" · "}
                <span>{h.providerOrigin}</span>
                {h.isOpenAccess ? " · Open access" : ""}
                {h.doi ? ` · DOI ${h.doi}` : " · DOI unverified"}
              </p>
              {!readOnly && (
                <div className="cevo-research-actions">
                  <button
                    type="button"
                    onClick={() => handleSave(h)}
                    disabled={savingId === key}
                  >
                    {savingId === key ? "Saving…" : "Save to library"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNoteFor(noteFor === key ? null : key);
                      setNote("");
                    }}
                  >
                    {noteFor === key ? "Hide note" : "Add note"}
                  </button>
                </div>
              )}
              {noteFor === key && (
                <label>
                  Why this source matters
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 2000))}
                    rows={2}
                    placeholder="One line on why you saved this…"
                  />
                </label>
              )}
            </li>
          );
        })}
      </ol>
      {cursor && (
        <button type="button" onClick={() => runSearch(query, cursor)} disabled={searching}>
          Load more results
        </button>
      )}
      <div className="cevo-research-library">
        <h3>Project library · {total}</h3>
        <div className="cevo-research-filters">
          <label>
            Filter
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Title, author, venue, note…"
              aria-label="Filter library"
            />
          </label>
          <label>
            Tag
            <input
              type="search"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="tag…"
              aria-label="Filter by tag"
            />
          </label>
        </div>
        {library.length === 0 ? (
          <p className="cevo-muted">
            Nothing saved yet. Search above, then save the papers you will cite.
          </p>
        ) : (
          <ol>
            {library.map((item) => (
              <li key={item.id} className="cevo-research-saved">
                <p>
                  <strong>{item.source?.title ?? "Unlinked source"}</strong>
                  {item.isPinned ? " 📌" : ""}
                </p>
                <p className="cevo-muted">
                  {item.source?.authors.slice(0, 3).map((a) => a.family).join(", ")} ·{" "}
                  {item.source?.year ?? "n.d."} · {badge(item.source?.verificationState ?? "")}
                </p>
                {item.studentNote && <p>{item.studentNote}</p>}
                {item.tags.length > 0 && (
                  <p className="cevo-muted">{item.tags.join(" · ")}</p>
                )}
                <div className="cevo-research-actions">
                  <button type="button" onClick={() => handleDetail(item.id)}>
                    {detail[item.id] ? "Hide detail" : "Detail"}
                  </button>
                  {!readOnly && sectionId && (
                    <button type="button" onClick={() => handleInsert(item.sourceId)}>
                      Insert citation
                    </button>
                  )}
                  {!readOnly && (
                    <button type="button" onClick={() => handleUnsave(item.id)}>
                      Remove
                    </button>
                  )}
                </div>
                {detail[item.id] && (
                  <div className="cevo-research-detail">
                    <p className="cevo-muted">
                      Origin: {detail[item.id]!.providerOrigin}
                    </p>
                    {detail[item.id]!.abstract && <p>{detail[item.id]!.abstract}</p>}
                    {detail[item.id]!.pdfUrl && (
                      <p>
                        <a href={detail[item.id]!.pdfUrl!} target="_blank" rel="noreferrer">
                          Open PDF
                        </a>
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
        {libCursor && (
          <button type="button" onClick={() => loadLibrary(libCursor)}>
            Load more saved
          </button>
        )}
      </div>
      <div className="cevo-research-bib">
        <h3>Chapter references · {bib.length}</h3>
        {!sectionId ? (
          <p className="cevo-muted">Open a chapter to see its reference list.</p>
        ) : bib.length === 0 ? (
          <p className="cevo-muted">
            No citations in this chapter yet. Insert one from the library above.
          </p>
        ) : (
          <ol>
            {bib.map((c) => (
              <li key={c.id}>
                <p>{c.formattedText ?? c.inlineText}</p>
                <p className="cevo-muted">
                  {c.inlineText} · {c.citationKey}
                </p>
                {!readOnly && (
                  <button type="button" onClick={() => handleDeleteCitation(c.id)}>
                    Remove citation
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
