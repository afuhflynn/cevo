"use client";

export type SaveState = "saved" | "saving" | "offline" | "error";

export function SaveStatus({ state, onRetry }: { state: SaveState; onRetry?: () => void }) {
  return (
    <span className={`cevo-save cevo-save-${state}`} role="status" aria-live="polite">
      {state === "saved" && "Saved"}
      {state === "saving" && "Saving…"}
      {state === "offline" && "Offline · queued"}
      {state === "error" && (
        <>
          Save failed{" "}
          {onRetry && (
            <button type="button" onClick={onRetry} className="cevo-save-retry">Retry</button>
          )}
        </>
      )}
    </span>
  );
}

export function ConflictBanner({ onKeepMine, onLoadTheirs }: { onKeepMine: () => void; onLoadTheirs: () => void }) {
  return (
    <div className="cevo-conflict" role="alert">
      <p><strong>Version conflict.</strong> Another tab saved a newer copy. Your draft is safe in this browser.</p>
      <div className="cevo-conflict-actions">
        <button type="button" onClick={onLoadTheirs}>Load theirs</button>
        <button
          type="button"
          onClick={() => { if (window.confirm("Keep your version and overwrite the server copy?")) onKeepMine(); }}
          className="cevo-conflict-keep"
        >
          Keep mine
        </button>
      </div>
    </div>
  );
}

export function InspectorRail({ headings, liveWords, storedWords, saveState, onJump }: {
  headings: { level: number; text: string }[];
  liveWords: number;
  storedWords: number;
  saveState: SaveState;
  onJump: (index: number) => void;
}) {
  return (
    <aside className="cevo-inspector" aria-label="On this chapter">
      <div className="cevo-inspector-block">
        <h3>Save state</h3>
        <p><SaveStatus state={saveState} /></p>
        <p className="cevo-muted">Live {liveWords} words · Saved {storedWords} words</p>
      </div>
      <div className="cevo-inspector-block">
        <h3>On this page</h3>
        {headings.length === 0 ? (
          <p className="cevo-muted">No headings yet. Headings you add will list here for quick jumps.</p>
        ) : (
          <ol>
            {headings.map((h, i) => (
              <li key={i} data-level={h.level}>
                <button type="button" onClick={() => onJump(i)}>{h.text}</button>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="cevo-inspector-block">
        <h3>Comments</h3>
        <p className="cevo-muted">Supervisor notes will dock here once file review lands.</p>
      </div>
      <div className="cevo-inspector-block">
        <h3>Assistant</h3>
        <p className="cevo-muted">Tone and polish live in the Assistant tab, with cost shown before each run.</p>
      </div>
      <div className="cevo-inspector-block">
        <h3>Research</h3>
        <p className="cevo-muted">Verified sources dock here in the next slice.</p>
      </div>
    </aside>
  );
}
