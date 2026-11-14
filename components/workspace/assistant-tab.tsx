"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Operation = "tone" | "polish" | "review";

type Suggestion = {
  id: string;
  paragraphIndex: number;
  originalText: string;
  revisedText: string;
  warnings: { issue: string; location?: string; fixDraft?: string }[];
  status: string;
};

type RunItem = {
  id: string;
  operation: string;
  scope: string;
  sectionVersion: number;
  inputHash: string;
  inputChars: number;
  estimateCredits: number;
  actualCredits: number;
  status: string;
  createdAt: string;
  suggestions: Suggestion[];
};

type PanelState =
  | "idle"
  | "estimating"
  | "streaming"
  | "review"
  | "applied"
  | "error";

function wordDiff(original: string, revised: string) {
  const a = original.split(/(\s+)/).filter((t) => t.length > 0);
  const b = revised.split(/(\s+)/).filter((t) => t.length > 0);
  const n = Math.min(a.length, 200);
  const m = Math.min(b.length, 200);
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] =
        a[i] === b[j]
          ? (dp[i + 1]![j + 1] ?? 0) + 1
          : Math.max(dp[i + 1]![j] ?? 0, dp[i]![j + 1] ?? 0);
    }
  }
  const out: { text: string; kind: "same" | "add" | "del" }[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ text: b[j]!, kind: "same" });
      i++;
      j++;
    } else if ((dp[i + 1]![j] ?? 0) >= (dp[i]![j + 1] ?? 0)) {
      out.push({ text: a[i]!, kind: "del" });
      i++;
    } else {
      out.push({ text: b[j]!, kind: "add" });
      j++;
    }
  }
  while (i < n) {
    out.push({ text: a[i]!, kind: "del" });
    i++;
  }
  while (j < m) {
    out.push({ text: b[j]!, kind: "add" });
    j++;
  }
  return out;
}

export function AssistantTab({
  projectId,
  sectionId,
  sectionVersion,
  getScopeText,
  onApplied,
  readOnly,
}: {
  projectId: string;
  sectionId: string | null;
  sectionVersion: number;
  getScopeText: () => { scope: "selection" | "chapter"; text: string };
  onApplied: (content: unknown, version: number, wordCount: number) => void;
  readOnly?: boolean;
}) {
  const [operation, setOperation] = useState<Operation>("polish");
  const [state, setState] = useState<PanelState>("idle");
  const [estimate, setEstimate] = useState<{
    estimateCredits: number;
    inputChars: number;
    allowedOutputChars: number;
    scopeLabel: string;
    balance: number;
  } | null>(null);
  const [paragraphs, setParagraphs] = useState<Suggestion[]>([]);
  const [activeRun, setActiveRun] = useState<RunItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [topUp, setTopUp] = useState<string | null>(null);
  const [history, setHistory] = useState<RunItem[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadHistory = useCallback(
    async (cursor?: string | null) => {
      if (!sectionId) return;
      setLoadingHistory(true);
      try {
        const url = new URL(
          `/api/projects/${projectId}/assistant/runs`,
          window.location.origin,
        );
        url.searchParams.set("sectionId", sectionId);
        if (cursor) url.searchParams.set("cursor", cursor);
        const res = await fetch(url.pathname + url.search, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const runs = (data.runs ?? []) as RunItem[];
        setHistory((prev) => (cursor ? [...prev, ...runs] : runs));
        setHistoryCursor(data.nextCursor ?? null);
      } finally {
        setLoadingHistory(false);
      }
    },
    [projectId, sectionId],
  );

  useEffect(() => {
    setHistory([]);
    setHistoryCursor(null);
    setParagraphs([]);
    setActiveRun(null);
    setEstimate(null);
    setState("idle");
    setNotice(null);
    if (sectionId) void loadHistory(null);
  }, [sectionId, loadHistory]);

  async function handleEstimate() {
    if (!sectionId || readOnly) return;
    setState("estimating");
    setNotice(null);
    setTopUp(null);
    try {
      const { scope, text } = getScopeText();
      const res = await fetch(`/api/projects/${projectId}/assistant/estimate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sectionId,
          operation,
          inputText: text,
          sectionVersion,
          scope,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 402) {
        setTopUp(
          data.topUpPrompt ??
            "Balance is short. Top up credits, then try again.",
        );
        setState("error");
        return;
      }
      if (res.status === 409) {
        setNotice(
          "The chapter changed since you opened it. Reload the latest version, then try again.",
        );
        setState("error");
        return;
      }
      if (!res.ok) {
        setNotice((data.error as string) ?? "Estimate failed. Try again.");
        setState("error");
        return;
      }
      setEstimate({
        estimateCredits: data.estimateCredits,
        inputChars: data.inputChars,
        allowedOutputChars: data.allowedOutputChars,
        scopeLabel: data.scope,
        balance: data.balance,
      });
      setState("idle");
    } catch {
      setNotice("Estimate failed. Check your connection and try again.");
      setState("error");
    }
  }

  async function handleConfirm() {
    if (!sectionId || readOnly) return;
    setState("streaming");
    setNotice(null);
    setTopUp(null);
    setParagraphs([]);
    try {
      const { scope, text } = getScopeText();
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const createRes = await fetch(
        `/api/projects/${projectId}/assistant/runs`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-idempotency-key": idempotencyKey,
          },
          body: JSON.stringify({
            sectionId,
            operation,
            inputText: text,
            sectionVersion,
            scope,
          }),
        },
      );
      const created = await createRes.json().catch(() => ({}));
      if (createRes.status === 402) {
        setTopUp(
          created.topUpPrompt ??
            "Balance is short. Top up credits, then try again.",
        );
        setState("error");
        return;
      }
      if (!createRes.ok) {
        setNotice(
          (created.error as string) ?? "Run failed to start. Try again.",
        );
        setState("error");
        return;
      }
      const runId = created.run.id as string;
      const inputHash = created.run.inputHash as string;
      abortRef.current?.abort();
      const aborter = new AbortController();
      abortRef.current = aborter;
      const streamRes = await fetch(
        `/api/projects/${projectId}/assistant/runs/${runId}/stream`,
        { signal: aborter.signal },
      );
      if (!streamRes.ok || !streamRes.body) {
        setNotice(
          "Streaming failed to start. The hold was released; retry when ready.",
        );
        setState("error");
        return;
      }
      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const streamed: Suggestion[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const event = JSON.parse(trimmed) as Record<string, unknown>;
          if (event["type"] === "paragraph") {
            const s: Suggestion = {
              id: `stream-${event["paragraphIndex"]}`,
              paragraphIndex: Number(
                event["paragraphIndex"] ?? streamed.length,
              ),
              originalText: String(event["originalText"] ?? ""),
              revisedText: String(event["revisedText"] ?? ""),
              warnings: Array.isArray(event["warnings"])
                ? (event["warnings"] as Suggestion["warnings"])
                : [],
              status: "pending",
            };
            streamed.push(s);
            setParagraphs([...streamed]);
          } else if (event["type"] === "done") {
            setActiveRun({
              id: runId,
              operation,
              scope,
              sectionVersion,
              inputHash,
              inputChars: text.length,
              estimateCredits: estimate?.estimateCredits ?? 0,
              actualCredits: Number(event["actualCredits"] ?? 0),
              status: "succeeded",
              createdAt: new Date().toISOString(),
              suggestions: [],
            });
            setState("review");
          } else if (event["type"] === "error") {
            setNotice(
              `${String(event["message"] ?? "Run failed.")} Partial paragraphs were kept.`,
            );
            setState(streamed.length > 0 ? "review" : "error");
          }
        }
      }
      // Refresh ids from history so accept targets real suggestion rows.
      await loadHistory(null);
      const url = new URL(
        `/api/projects/${projectId}/assistant/runs`,
        window.location.origin,
      );
      url.searchParams.set("sectionId", sectionId);
      const res = await fetch(url.pathname + url.search, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const found = ((data.runs ?? []) as RunItem[]).find(
          (r) => r.id === runId,
        );
        if (found) {
          setActiveRun(found);
          setParagraphs(
            found.suggestions.map((s) => ({
              ...s,
              status: s.status ?? "pending",
            })),
          );
          if (found.suggestions.length > 0) setState("review");
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice(
        "The run dropped. Partial paragraphs were kept with the hold released.",
      );
      setState(paragraphs.length > 0 ? "review" : "error");
    }
  }

  async function handleAccept(suggestionIds?: string[], acceptAll = false) {
    if (!sectionId || !activeRun || readOnly) return;
    try {
      const res = await fetch(
        `/api/projects/${projectId}/assistant/runs/${activeRun.id}/accept`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sectionId,
            sectionVersion,
            inputHash: activeRun.inputHash,
            suggestionIds,
            acceptAll,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setNotice(
          "The chapter changed since this run. Rebase: reload the latest text and run the assistant again.",
        );
        return;
      }
      if (!res.ok) {
        setNotice((data.error as string) ?? "Accept failed. Try again.");
        return;
      }
      onApplied(data.content, data.version, data.wordCount);
      const acceptedIds = new Set((data.accepted ?? []) as string[]);
      setParagraphs((prev) =>
        prev.map((p) =>
          acceptedIds.has(p.id) ? { ...p, status: "accepted" } : p,
        ),
      );
      setState("applied");
      setNotice(
        "Applied to the chapter. Review the wording once more before moving on.",
      );
      void loadHistory(null);
    } catch {
      setNotice("Accept failed. Try again.");
    }
  }

  async function handleDiscard() {
    if (!sectionId || !activeRun || readOnly) return;
    try {
      const res = await fetch(
        `/api/projects/${projectId}/assistant/runs/${activeRun.id}/discard`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        },
      );
      if (!res.ok) {
        setNotice("Discard failed. Try again.");
        return;
      }
      setParagraphs((prev) => prev.map((p) => ({ ...p, status: "discarded" })));
      setState("idle");
      setNotice("Suggestions discarded. Nothing was written to the chapter.");
      void loadHistory(null);
    } catch {
      setNotice("Discard failed. Try again.");
    }
  }

  return (
    <div className="cevo-assistant" aria-label="Writing assistant">
      <p className="cevo-assistant-banner" role="note">
        AI draft: review every change. Nothing applies on its own.
      </p>
      <div className="cevo-assistant-controls">
        <label>
          Task
          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value as Operation)}
            disabled={state === "streaming" || readOnly}
          >
            <option value="tone">Tone revision</option>
            <option value="polish">Paragraph polishing</option>
            <option value="review">Consistency review</option>
          </select>
        </label>
        <button
          type="button"
          onClick={handleEstimate}
          disabled={
            !sectionId ||
            readOnly ||
            state === "estimating" ||
            state === "streaming"
          }
        >
          {state === "estimating" ? "Estimating…" : "Estimate cost"}
        </button>
      </div>
      {state === "estimating" && (
        <p className="cevo-muted" aria-busy="true">
          Working out the credit cost…
        </p>
      )}
      {estimate && state !== "streaming" && (
        <div className="cevo-assistant-estimate">
          <p>
            {estimate.scopeLabel} · {estimate.inputChars} chars · about{" "}
            {estimate.estimateCredits} credits (balance {estimate.balance})
          </p>
          <button type="button" onClick={handleConfirm} disabled={readOnly}>
            Confirm and run
          </button>
        </div>
      )}
      {topUp && (
        <p className="cevo-assistant-topup" role="alert">
          {topUp} <a href="/dashboard/billing">Top up credits</a>
        </p>
      )}
      {notice && (
        <p className="cevo-assistant-notice" role="status">
          {notice}
        </p>
      )}
      {state === "streaming" && paragraphs.length === 0 && (
        <p className="cevo-muted" aria-busy="true">
          Streaming suggestions… partial paragraphs appear below.
        </p>
      )}
      {paragraphs.length > 0 && (
        <div className="cevo-assistant-actions">
          <button
            type="button"
            onClick={() => handleAccept(undefined, true)}
            disabled={readOnly}
          >
            Accept all
          </button>
          <button type="button" onClick={handleDiscard} disabled={readOnly}>
            Discard
          </button>
          <span className="cevo-muted">
            Runs cap at 90 seconds; partial paragraphs stay on timeout.
          </span>
        </div>
      )}
      <ol className="cevo-assistant-list">
        {paragraphs.map((p) => (
          <li
            key={`${p.paragraphIndex}-${p.id}`}
            className="cevo-assistant-item"
          >
            <p className="cevo-muted">
              Paragraph {p.paragraphIndex + 1} · {p.status}
            </p>
            <div className="cevo-assistant-diff">
              <div>
                <h4>Original</h4>
                <p>{p.originalText}</p>
              </div>
              <div>
                <h4>Revised</h4>
                <p aria-label={`Revised paragraph ${p.paragraphIndex + 1}`}>
                  {wordDiff(p.originalText, p.revisedText).map((t, i) =>
                    t.kind === "same" ? (
                      <span key={i}>{t.text}</span>
                    ) : t.kind === "add" ? (
                      <mark key={i}>{t.text}</mark>
                    ) : (
                      <del key={i}>{t.text}</del>
                    ),
                  )}
                </p>
              </div>
            </div>
            {p.warnings.length > 0 && (
              <ul className="cevo-assistant-warnings">
                {p.warnings.map((w, i) => (
                  <li key={i}>
                    <a
                      href={`#assistant-paragraph-${p.paragraphIndex}`}
                      onClick={(e) => e.preventDefault()}
                    >
                      Paragraph {p.paragraphIndex + 1}
                    </a>
                    {`: ${w.issue}`}
                    {w.fixDraft ? ` — fix draft: ${w.fixDraft}` : ""}
                  </li>
                ))}
              </ul>
            )}
            <div className="cevo-assistant-item-actions">
              <button
                type="button"
                onClick={() => handleAccept([p.id])}
                disabled={readOnly || p.status !== "pending"}
              >
                Accept paragraph
              </button>
            </div>
          </li>
        ))}
      </ol>
      <div className="cevo-assistant-history">
        <h3>History</h3>
        {history.length === 0 && !loadingHistory ? (
          <p className="cevo-muted">
            No runs yet. Estimates and suggestions will list here.
          </p>
        ) : (
          <ol>
            {history.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveRun(r);
                    setParagraphs(r.suggestions);
                    setState(r.suggestions.length > 0 ? "review" : "idle");
                  }}
                >
                  {r.operation} · {r.status} ·{" "}
                  {new Date(r.createdAt).toLocaleString()} ·{" "}
                  {r.suggestions.length} paragraph
                  {r.suggestions.length === 1 ? "" : "s"}
                </button>
              </li>
            ))}
          </ol>
        )}
        {loadingHistory && (
          <p className="cevo-muted" aria-busy="true">
            Loading history…
          </p>
        )}
        {historyCursor && (
          <button
            type="button"
            onClick={() => loadHistory(historyCursor)}
            disabled={loadingHistory}
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}
